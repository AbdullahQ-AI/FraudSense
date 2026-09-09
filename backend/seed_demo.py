import requests
import random
import time
import json
import os

BASE_URL = "http://127.0.0.1:8000"
API_KEY = "fraudsense-secure-v2-8821"  # apni asal key yahan daalo agar alag hai
headers = {"X-API-Key": API_KEY}

# Load the same template-based defaults the frontend uses, so missing fields
# get realistic values instead of being left blank (which confuses the model).
DEFAULTS_PATH = os.path.join(
    os.path.dirname(__file__), "..", "frontend", "src", "data", "defaultValues.json"
)
with open(DEFAULTS_PATH, "r") as f:
    DEFAULTS = json.load(f)

amounts = [20, 45, 60, 85, 100, 120, 150, 200, 250, 300, 450, 600, 750, 900, 1200]
cards4 = ["visa", "mastercard", "discover", "american express"]
cards6 = ["debit", "credit"]
devices = ["desktop", "mobile"]
emails = ["gmail.com", "yahoo.com", "hotmail.com", "outlook.com", "icloud.com"]

safe_templates = []
for amt in amounts:
    safe_templates.append({
        "TransactionAmt": amt,
        "ProductCD": "W",
        "card4": random.choice(cards4),
        "card6": random.choice(cards6),
        "DeviceType": random.choice(devices),
        "P_emaildomain_clean": random.choice(emails),
        "dist1": random.randint(2, 60),
        "addr1": random.randint(150, 320),
        "addr2": random.randint(50, 95),
    })

risky_templates = [
    {"TransactionAmt": 15, "ProductCD": "C", "card4": "Missing", "card6": "Missing",
     "DeviceType": "Missing", "P_emaildomain_clean": "Missing", "dist1": 900, "addr1": 50, "addr2": 20},
    {"TransactionAmt": 8, "ProductCD": "H", "card4": "Missing", "card6": "charge card",
     "DeviceType": "Missing", "P_emaildomain_clean": "anonymous.com", "dist1": 1200, "addr1": 30, "addr2": 10},
    {"TransactionAmt": 5, "ProductCD": "R", "card4": "discover", "card6": "Missing",
     "DeviceType": "Missing", "P_emaildomain_clean": "Missing", "dist1": 700, "addr1": 10, "addr2": 5},
    {"TransactionAmt": 12, "ProductCD": "S", "card4": "Missing", "card6": "Missing",
     "DeviceType": "mobile", "P_emaildomain_clean": "Missing", "dist1": 850, "addr1": 5, "addr2": 8},
    {"TransactionAmt": 3, "ProductCD": "C", "card4": "Missing", "card6": "credit",
     "DeviceType": "Missing", "P_emaildomain_clean": "anonymous.com", "dist1": 1500, "addr1": 15, "addr2": 3},
]

all_transactions = safe_templates + risky_templates
random.shuffle(all_transactions)

success, failed = 0, 0
for i, tx in enumerate(all_transactions):
    payload = {**DEFAULTS, **tx}  # merge with realistic template, same as the frontend does
    try:
        r = requests.post(f"{BASE_URL}/predict", json=payload, headers=headers)
        if r.status_code == 200:
            data = r.json()
            print(f"[{i+1}/{len(all_transactions)}] ${tx['TransactionAmt']} -> "
                  f"{data['fraud_probability']*100:.1f}% "
                  f"({'FRAUD' if data['is_fraud'] else 'safe'})")
            success += 1
        else:
            print(f"[{i+1}] Failed: {r.status_code} {r.text}")
            failed += 1
    except Exception as e:
        print(f"[{i+1}] Error: {e}")
        failed += 1
    time.sleep(0.1)

print(f"\nDone. {success} succeeded, {failed} failed.")