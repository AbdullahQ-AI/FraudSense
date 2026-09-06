from fastapi import FastAPI, Depends, HTTPException, Security
from fastapi.security import APIKeyHeader
from pydantic import create_model
from typing import Optional
import onnxruntime as ort
import pickle
import json
import os
import csv
import numpy as np
import pandas as pd
from datetime import datetime
from scipy.stats import ks_2samp
from dotenv import load_dotenv

load_dotenv()
API_KEY = os.getenv("API_KEY")

api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)


def verify_api_key(key: str = Security(api_key_header)):
    if key is None or key != API_KEY:
        raise HTTPException(status_code=401, detail="Invalid or missing API key")
    return key

MODELS_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "models")
LOGS_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "logs")
LOG_FILE = os.path.join(LOGS_DIR, "predictions_log.csv")
REFERENCE_FILE = os.path.join(MODELS_DIR, "reference_sample.csv")
MIN_LOGS_FOR_DRIFT = 30  # need at least this many live predictions before drift check is meaningful

# --- Dynamic schema construction (module load time, lightweight files only) ---
with open(os.path.join(MODELS_DIR, "feature_cols.json"), "r") as f:
    _schema_feature_cols = json.load(f)

CATEGORICAL_COLS = [
    'ProductCD', 'card4', 'card6', 'M1', 'M2', 'M3', 'M4', 'M5', 'M6', 'M7',
    'M8', 'M9', 'id_12', 'id_15', 'id_16', 'id_28', 'id_29', 'id_34', 'id_35',
    'id_36', 'id_37', 'id_38', 'DeviceType', 'DeviceInfo_clean', 'id_31_clean',
    'id_30_clean', 'P_emaildomain_clean', 'R_emaildomain_clean'
]

_schema_fields = {}
for col in _schema_feature_cols:
    if col in CATEGORICAL_COLS:
        _schema_fields[col] = (Optional[str], None)
    else:
        _schema_fields[col] = (Optional[float], None)

TransactionInput = create_model("TransactionInput", **_schema_fields)
# --- end dynamic schema construction ---

# Numeric columns are everything that isn't categorical - KS-test only applies to numeric distributions
NUMERIC_COLS = [c for c in _schema_feature_cols if c not in CATEGORICAL_COLS]

app = FastAPI(title="FraudSense API", version="1.0")

onnx_session = None
label_encoders = None
feature_cols = None
model_metadata = None
reference_data = None


@app.on_event("startup")
def load_models():
    global onnx_session, label_encoders, feature_cols, model_metadata, reference_data

    onnx_path = os.path.join(MODELS_DIR, "xgb_fraud_model.onnx")
    onnx_session = ort.InferenceSession(onnx_path)

    with open(os.path.join(MODELS_DIR, "label_encoders.pkl"), "rb") as f:
        label_encoders = pickle.load(f)

    with open(os.path.join(MODELS_DIR, "feature_cols.json"), "r") as f:
        feature_cols = json.load(f)

    with open(os.path.join(MODELS_DIR, "model_metadata.json"), "r") as f:
        model_metadata = json.load(f)

    reference_data = pd.read_csv(REFERENCE_FILE)

    os.makedirs(LOGS_DIR, exist_ok=True)

    print("Models loaded successfully.")
    print(f"   Features expected: {len(feature_cols)}")
    print(f"   Fraud threshold: {model_metadata['threshold']}")
    print(f"   Reference sample loaded: {reference_data.shape[0]} rows")


def log_prediction(input_dict, fraud_probability, is_fraud):
    row = dict(input_dict)  # copy so we don't mutate the original
    row["timestamp"] = datetime.utcnow().isoformat()
    row["fraud_probability"] = fraud_probability
    row["is_fraud"] = is_fraud

    file_exists = os.path.isfile(LOG_FILE)
    with open(LOG_FILE, "a", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=row.keys())
        if not file_exists:
            writer.writeheader()
        writer.writerow(row)


@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "model_loaded": onnx_session is not None,
        "num_features": len(feature_cols) if feature_cols else 0,
        "threshold": model_metadata["threshold"] if model_metadata else None
    }


@app.post("/predict", dependencies=[Depends(verify_api_key)])
def predict(transaction: TransactionInput):
    # Convert incoming request into a single-row DataFrame, in the exact column order the model expects
    input_dict = transaction.dict()
    row = pd.DataFrame([input_dict])[feature_cols]

    # Encode categorical columns using the saved LabelEncoders
    for col in CATEGORICAL_COLS:
        val = row.at[0, col]
        encoder = label_encoders[col]
        if val is None:
            row.at[0, col] = -1  # missing category
        else:
            try:
                row.at[0, col] = encoder.transform([val])[0]
            except ValueError:
                row.at[0, col] = -1  # unseen category, not in training data

    # Ensure all columns are numeric now (categoricals are encoded, rest are float/NaN)
    row = row.astype(np.float32)

    # Run ONNX inference
    input_name = onnx_session.get_inputs()[0].name
    outputs = onnx_session.run(None, {input_name: row.values})

    # outputs[1] is typically the probability array for XGBoost ONNX classifiers: [P(class 0), P(class 1)]
    fraud_probability = float(outputs[1][0][1])
    threshold = model_metadata["threshold"]
    is_fraud = fraud_probability >= threshold

    log_prediction(input_dict, fraud_probability, is_fraud)

    return {
        "fraud_probability": round(fraud_probability, 4),
        "is_fraud": is_fraud,
        "threshold_used": threshold
    }


@app.get("/drift-status", dependencies=[Depends(verify_api_key)])
def drift_status():
    if not os.path.isfile(LOG_FILE):
        return {
            "status": "no_data",
            "message": "No predictions logged yet. Call /predict a few times first."
        }

    live_data = pd.read_csv(LOG_FILE)

    if len(live_data) < MIN_LOGS_FOR_DRIFT:
        return {
            "status": "not_enough_data",
            "message": f"Only {len(live_data)} predictions logged. Need at least {MIN_LOGS_FOR_DRIFT} for a meaningful drift check.",
            "logged_count": len(live_data)
        }

    drifted_features = []
    checked_count = 0

    for col in NUMERIC_COLS:
        if col not in live_data.columns:
            continue

        ref_values = reference_data[col].dropna()
        live_values = live_data[col].dropna()

        if len(ref_values) < 5 or len(live_values) < 5:
            continue  # not enough points on either side to run a meaningful test

        checked_count += 1
        stat, p_value = ks_2samp(ref_values, live_values)

        if p_value < 0.05:
            drifted_features.append({
                "feature": col,
                "p_value": round(float(p_value), 5)
            })

    drift_ratio = len(drifted_features) / checked_count if checked_count > 0 else 0
    overall_status = "drift_detected" if drift_ratio > 0.3 else "stable"

    # Show the most significant drifted features first (lowest p-value = strongest evidence of drift)
    drifted_features.sort(key=lambda x: x["p_value"])

    return {
        "status": overall_status,
        "logged_count": len(live_data),
        "features_checked": checked_count,
        "features_drifted": len(drifted_features),
        "drift_ratio": round(drift_ratio, 3),
        "top_drifted_features": drifted_features[:10]
    }