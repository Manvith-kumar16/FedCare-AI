import requests
import sys

def check_health():
    try:
        r = requests.get("http://localhost:8000/api/v1/health/", timeout=5)
        print(f"Health: {r.status_code} - {r.json()}")
        
        r = requests.get("http://localhost:8000/api/v1/servers/", timeout=5)
        print(f"Servers: {r.status_code} - {len(r.json())} servers found")
        
        r = requests.get("http://localhost:8000/api/v1/datasets/stats?server_id=1", timeout=5)
        print(f"Stats (Server 1): {r.status_code} - {r.json()}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    check_health()
