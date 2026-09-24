import urllib.request
import json
import jwt
from datetime import datetime, timedelta

# Create token using central secret key
SECRET_KEY = "fedcare-ai-central-coordinator-super-secret-key-2026"
payload = {
    "sub": "aj@gmail.com",
    "role": "hospital",
    "hospital_id": 1,
    "exp": datetime.utcnow() + timedelta(minutes=10)
}
token = jwt.encode(payload, SECRET_KEY, algorithm="HS256")

url = "https://fedcare-ai.onrender.com/api/v1/federated/rounds/active"
req = urllib.request.Request(url, method="GET")
req.add_header("Authorization", f"Bearer {token}")
try:
    with urllib.request.urlopen(req) as response:
        print("Active rounds:", response.read().decode())
except Exception as e:
    print("Error:", e)
