
import json
import urllib.request

if __name__ == "__main__":
    url = "http://localhost:8000/api/v1/training/start"
    data = json.dumps({
        "server_id": 1,
        "num_rounds": 1,
        "local_epochs": 5
    }).encode('utf-8')
    
    req = urllib.request.Request(url, data=data, method='POST')
    req.add_header('Content-Type', 'application/json')
    req.add_header('X-User-Role', 'ADMIN')
    
    try:
        with urllib.request.urlopen(req) as response:
            print(f"Status: {response.getcode()}")
            print(f"Response: {response.read().decode('utf-8')}")
    except Exception as e:
        print(f"Request failed: {e}")
