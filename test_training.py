import urllib.request
import urllib.error
import json
import random

def main():
    hospital_url = "http://127.0.0.1:8001"
    
    email = f"testhosp{random.randint(1,10000)}@example.com"
    # Register via hospital API
    req = urllib.request.Request(
        f"{hospital_url}/api/v1/auth/register",
        data=json.dumps({
            "name": "Test Hospital",
            "email": email,
            "password": "password123",
            "role": "HOSPITAL",
            "hospital_name": "Test Hospital",
            "location": "NY"
        }).encode("utf-8"),
        headers={"Content-Type": "application/json"}
    )
    try:
        urllib.request.urlopen(req)
    except urllib.error.HTTPError as e:
        pass
        
    # Login via hospital API
    req = urllib.request.Request(
        f"{hospital_url}/api/v1/auth/login",
        data=json.dumps({"email": email, "password": "password123"}).encode("utf-8"),
        headers={"Content-Type": "application/json"}
    )
    
    try:
        with urllib.request.urlopen(req) as response:
            res_data = json.loads(response.read().decode("utf-8"))
            token = res_data["access_token"]
    except urllib.error.HTTPError as e:
        print("Login failed", e.read().decode("utf-8"))
        return

    # Trigger local training
    req = urllib.request.Request(
        f"{hospital_url}/api/v1/training/local-start",
        data=json.dumps({"server_id": 1, "epochs": 10}).encode("utf-8"),
        headers={"Content-Type": "application/json", "Authorization": f"Bearer {token}"}
    )
    
    try:
        with urllib.request.urlopen(req) as response:
            print("Status:", response.status)
            print("Body:", response.read().decode("utf-8")[:200])
    except urllib.error.HTTPError as e:
        print("Training failed. Status:", e.code)
        print("Body:", e.read().decode("utf-8"))

main()
