from fastapi.middleware.cors import CORSMiddleware
from fastapi import FastAPI, Depends, HTTPException, Security
from fastapi.security import APIKeyHeader
from pydantic import create_model
from typing import Optional
import onnxruntime as ort
import xgboost as xgb
import shap
import torch
import torch.nn as nn
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
MIN_LOGS_FOR_DRIFT = 30
TOP_N_SHAP_FEATURES = 5

AUTOENCODER_ANOMALY_THRESHOLD = 0.15

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

NUMERIC_COLS = [c for c in _schema_feature_cols if c not in CATEGORICAL_COLS]

app = FastAPI(title="FraudSense API", version="1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class Autoencoder(nn.Module):
    """Matches the exact layer structure of the trained autoencoder_v2 state_dict
    (verified against saved weight shapes: 420->256->128->64->32->64->128->256->420)."""

    def __init__(self, input_dim=420):
        super().__init__()
        self.encoder = nn.Sequential(
            nn.Linear(input_dim, 256),
            nn.BatchNorm1d(256),
            nn.ReLU(),
            nn.Dropout(0.2),
            nn.Linear(256, 128),
            nn.BatchNorm1d(128),
            nn.ReLU(),
            nn.Dropout(0.2),
            nn.Linear(128, 64),
            nn.BatchNorm1d(64),
            nn.ReLU(),
            nn.Linear(64, 32),
        )
        self.decoder = nn.Sequential(
            nn.Linear(32, 64),
            nn.BatchNorm1d(64),
            nn.ReLU(),
            nn.Linear(64, 128),
            nn.BatchNorm1d(128),
            nn.ReLU(),
            nn.Dropout(0.2),
            nn.Linear(128, 256),
            nn.BatchNorm1d(256),
            nn.ReLU(),
            nn.Dropout(0.2),
            nn.Linear(256, input_dim),
        )

    def forward(self, x):
        return self.decoder(self.encoder(x))


onnx_session = None
label_encoders = None
feature_cols = None
model_metadata = None
reference_data = None
shap_explainer = None
optimization_summary = None
robust_scaler = None
autoencoder_model = None


@app.on_event("startup")
def load_models():
    global onnx_session, label_encoders, feature_cols, model_metadata, reference_data
    global shap_explainer, optimization_summary, robust_scaler, autoencoder_model

    onnx_path = os.path.join(MODELS_DIR, "xgb_fraud_model.onnx")
    onnx_session = ort.InferenceSession(onnx_path)

    with open(os.path.join(MODELS_DIR, "label_encoders.pkl"), "rb") as f:
        label_encoders = pickle.load(f)

    with open(os.path.join(MODELS_DIR, "feature_cols.json"), "r") as f:
        feature_cols = json.load(f)

    with open(os.path.join(MODELS_DIR, "model_metadata.json"), "r") as f:
        model_metadata = json.load(f)

    with open(os.path.join(MODELS_DIR, "optimization_summary.json"), "r") as f:
        optimization_summary = json.load(f)

    with open(os.path.join(MODELS_DIR, "robust_scaler.pkl"), "rb") as f:
        robust_scaler = pickle.load(f)

    reference_data = pd.read_csv(REFERENCE_FILE)

    xgb_booster = xgb.Booster()
    xgb_booster.load_model(os.path.join(MODELS_DIR, "xgb_fraud_model.json"))
    shap_explainer = shap.TreeExplainer(xgb_booster)

    autoencoder_model = Autoencoder(input_dim=len(feature_cols))
    ae_state_dict = torch.load(os.path.join(MODELS_DIR, "autoencoder_v2.pth"), map_location="cpu")
    autoencoder_model.load_state_dict(ae_state_dict)
    autoencoder_model.eval()

    os.makedirs(LOGS_DIR, exist_ok=True)

    print("Models loaded successfully.")
    print(f"   Features expected: {len(feature_cols)}")
    print(f"   Fraud threshold: {model_metadata['threshold']}")
    print(f"   Reference sample loaded: {reference_data.shape[0]} rows")
    print("   SHAP explainer ready.")
    print("   Autoencoder (anomaly detector) ready.")


def log_prediction(input_dict, fraud_probability, is_fraud):
    row = dict(input_dict)
    row["timestamp"] = datetime.utcnow().isoformat()
    row["fraud_probability"] = fraud_probability
    row["is_fraud"] = is_fraud

    file_exists = os.path.isfile(LOG_FILE)
    with open(LOG_FILE, "a", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=row.keys())
        if not file_exists:
            writer.writeheader()
        writer.writerow(row)


def explain_prediction(row_df):
    shap_values = shap_explainer.shap_values(row_df)
    contributions = shap_values[0]

    feature_impacts = []
    for feature_name, impact in zip(feature_cols, contributions):
        raw_val = row_df.iloc[0][feature_name]
        clean_val = None if pd.isna(raw_val) else float(raw_val)
        feature_impacts.append({
            "feature": feature_name,
            "value": clean_val,
            "impact": round(float(impact), 5),
            "direction": "increases_risk" if impact > 0 else "decreases_risk"
        })

    feature_impacts.sort(key=lambda x: abs(x["impact"]), reverse=True)
    return feature_impacts[:TOP_N_SHAP_FEATURES]


def compute_anomaly_score(row_df):
    """Runs the transaction through the autoencoder and returns its reconstruction error.
    A high error means this transaction's overall pattern looks statistically unusual
    compared to what the autoencoder learned from typical transactions - a complementary
    signal to XGBoost's direct fraud classification, useful for catching novel patterns
    XGBoost was never trained to recognize as fraud."""
    ae_input = row_df.fillna(-999)
    ae_scaled = robust_scaler.transform(ae_input)
    ae_scaled = np.clip(ae_scaled, -10, 10).astype(np.float32)

    with torch.no_grad():
        input_tensor = torch.tensor(ae_scaled, dtype=torch.float32)
        reconstruction = autoencoder_model(input_tensor)
        recon_error = torch.mean((input_tensor - reconstruction) ** 2).item()

    return {
        "anomaly_score": round(recon_error, 4),
        "anomaly_flag": "unusual_pattern" if recon_error > AUTOENCODER_ANOMALY_THRESHOLD else "typical_pattern",
        "note": "Interim heuristic threshold (0.15) based on training-time median separation; not yet formally validated."
    }


@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "model_loaded": onnx_session is not None,
        "num_features": len(feature_cols) if feature_cols else 0,
        "threshold": model_metadata["threshold"] if model_metadata else None
    }


@app.get("/model-info", dependencies=[Depends(verify_api_key)])
def model_info():
    return {
        "xgboost": {
            "roc_auc": model_metadata.get("roc_auc"),
            "precision": model_metadata.get("precision"),
            "recall": model_metadata.get("recall"),
            "f1_score": model_metadata.get("f1_score"),
            "num_features": model_metadata.get("num_features"),
            "model_size_kb": optimization_summary["xgboost"]["onnx_size_kb"],
            "size_reduction_pct": optimization_summary["xgboost"]["size_reduction_pct"]
        },
        "autoencoder": {
            "original_auc": optimization_summary["autoencoder"]["original_auc"],
            "quantized_auc": optimization_summary["autoencoder"]["quantized_auc"],
            "original_size_kb": optimization_summary["autoencoder"]["original_size_kb"],
            "quantized_size_kb": optimization_summary["autoencoder"]["quantized_size_kb"],
            "size_reduction_pct": optimization_summary["autoencoder"]["size_reduction_pct"],
            "role": "Unsupervised anomaly detector - flags statistically unusual transactions that the supervised XGBoost model might not directly classify as fraud."
        }
    }


@app.post("/predict", dependencies=[Depends(verify_api_key)])
def predict(transaction: TransactionInput):
    input_dict = transaction.dict()
    row = pd.DataFrame([input_dict])[feature_cols]

    for col in CATEGORICAL_COLS:
        val = row.at[0, col]
        encoder = label_encoders[col]
        if val is None:
            row.at[0, col] = -1
        else:
            try:
                row.at[0, col] = encoder.transform([val])[0]
            except ValueError:
                row.at[0, col] = -1

    row = row.astype(np.float32)

    input_name = onnx_session.get_inputs()[0].name
    outputs = onnx_session.run(None, {input_name: row.values})

    fraud_probability = float(outputs[1][0][1])
    threshold = model_metadata["threshold"]
    is_fraud = fraud_probability >= threshold

    top_factors = explain_prediction(row)
    anomaly_result = compute_anomaly_score(row)

    log_prediction(input_dict, fraud_probability, is_fraud)

    return {
        "fraud_probability": round(fraud_probability, 4),
        "is_fraud": is_fraud,
        "threshold_used": threshold,
        "top_factors": top_factors,
        "anomaly_detection": anomaly_result
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
            continue

        checked_count += 1
        stat, p_value = ks_2samp(ref_values, live_values)

        if p_value < 0.05:
            drifted_features.append({
                "feature": col,
                "p_value": round(float(p_value), 5)
            })

    drift_ratio = len(drifted_features) / checked_count if checked_count > 0 else 0
    overall_status = "drift_detected" if drift_ratio > 0.3 else "stable"

    drifted_features.sort(key=lambda x: x["p_value"])

    return {
        "status": overall_status,
        "logged_count": len(live_data),
        "features_checked": checked_count,
        "features_drifted": len(drifted_features),
        "drift_ratio": round(drift_ratio, 3),
        "top_drifted_features": drifted_features[:10]
    }


@app.get("/transactions", dependencies=[Depends(verify_api_key)])
def get_transactions(limit: int = 50):
    if not os.path.isfile(LOG_FILE):
        return {"transactions": []}

    df = pd.read_csv(LOG_FILE)
    df = df.sort_values("timestamp", ascending=False).head(limit)

    display_cols = ["timestamp", "TransactionAmt", "ProductCD", "card4", "card6",
                     "DeviceType", "fraud_probability", "is_fraud"]
    display_cols = [c for c in display_cols if c in df.columns]

    records = df[display_cols].to_dict(orient="records")
    for row in records:
        for key, value in row.items():
            if isinstance(value, float) and np.isnan(value):
                row[key] = None

    return {"transactions": records}


@app.get("/stats", dependencies=[Depends(verify_api_key)])
def get_stats():
    if not os.path.isfile(LOG_FILE):
        return {"total_transactions": 0, "total_flagged": 0, "fraud_rate": 0, "daily_trend": []}

    df = pd.read_csv(LOG_FILE)
    total = len(df)

    is_fraud_bool = df["is_fraud"].astype(str).str.strip().str.lower() == "true"
    flagged = int(is_fraud_bool.sum())
    fraud_rate = round(flagged / total, 4) if total > 0 else 0

    df["date"] = pd.to_datetime(df["timestamp"]).dt.date.astype(str)
    df["is_fraud_bool"] = is_fraud_bool
    daily = df.groupby("date").agg(
        count=("timestamp", "count"),
        flagged=("is_fraud_bool", "sum")
    ).reset_index()
    daily["flagged"] = daily["flagged"].astype(int)

    return {
        "total_transactions": total,
        "total_flagged": flagged,
        "fraud_rate": fraud_rate,
        "daily_trend": daily.to_dict(orient="records")
    }