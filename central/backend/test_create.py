import urllib.request
import urllib.parse
import json
import time

base_url = "http://localhost:8000/api/v1"

# Register an admin
unique_email = f"admin_test_{int(time.time())}@fedcare.ai"
register_data = json.dumps({
    "name": "Test Admin",
    "email": unique_email,
    "password": "password",
    "role": "ADMIN"
}).encode("utf-8")

req = urllib.request.Request(f"{base_url}/auth/register", data=register_data, headers={'Content-Type': 'application/json'})

try:
    with urllib.request.urlopen(req) as response:
        print("Register successful")
except urllib.error.HTTPError as e:
    print("Register failed:", e.code, e.read().decode())

# Login
login_data = json.dumps({"email": unique_email, "password": "password"}).encode("utf-8")
req = urllib.request.Request(f"{base_url}/auth/login", data=login_data, headers={'Content-Type': 'application/json'})

try:
    with urllib.request.urlopen(req) as response:
        res = json.loads(response.read().decode())
        token = res["access_token"]
        
        # Create server
        payload = json.dumps({
          "name": "Diabetes Prediction System (XGBoost)",
          "disease_type": "Diabetes Risk",
          "description": "Active Federated Learning pipeline for Type 2 Diabetes prediction using Pima Indians dataset. Supports XGBoost (Voting Ensemble Aggregation) on tabular data.",
          "input_type": "tabular",
          "model_type": "xgboost",
          "fl_algorithm": "FedAvg",
          "num_rounds": 5,
          "target_column": "Outcome"
        }).encode("utf-8")
        
        req2 = urllib.request.Request(f"{base_url}/servers/", data=payload, headers={'Content-Type': 'application/json', 'Authorization': f'Bearer {token}'})
        try:
            with urllib.request.urlopen(req2) as r2:
                print("Create server response:", r2.status)
                print("Response body:", r2.read().decode())
        except urllib.error.HTTPError as e:
            print("Create server failed:", e.code)
            print("Error body:", e.read().decode())
except urllib.error.HTTPError as e:
    print("Login failed:", e.code)
    print("Error body:", e.read().decode())
