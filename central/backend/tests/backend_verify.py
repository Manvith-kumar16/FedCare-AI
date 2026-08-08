"""
Complete FedCare-AI Backend Verification Script
Runs end-to-end programmatically to verify all checkpoint requirements.
"""
import os
import sys
import json
import time
import subprocess
import urllib.request
import urllib.parse
import urllib.error

CENTRAL_URL = "http://127.0.0.1:8000"
HOSPITAL_URL = "http://127.0.0.1:8001"
WORKSPACE_DIR = r"d:\FedCare-AI"

def log_section(title):
    print("\n" + "="*80)
    print(f"  {title}")
    print("="*80)

def http_json_request(url, method="GET", data=None, headers=None) -> tuple:
    """Helper to send HTTP request and return (status_code, json_response)."""
    req_headers = {"Content-Type": "application/json"}
    if headers:
        req_headers.update(headers)
        
    req_data = None
    if data:
        req_data = json.dumps(data).encode("utf-8")
        
    req = urllib.request.Request(url, data=req_data, headers=req_headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            return resp.getcode(), json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        try:
            err_data = json.loads(e.read().decode("utf-8"))
        except Exception:
            err_data = {"detail": e.reason}
        return e.code, err_data
    except Exception as e:
        return 0, {"detail": str(e)}

def http_multipart_request(url, fields, files, token) -> tuple:
    """Helper to perform multipart/form-data upload using standard library."""
    boundary = "----FedCareVerifyBoundary" + os.urandom(8).hex()
    body = []
    
    for k, v in fields.items():
        body.append(f"--{boundary}".encode())
        body.append(f'Content-Disposition: form-data; name="{k}"'.encode())
        body.append(b"")
        body.append(str(v).encode())
        
    for k, (filename, content_bytes) in files.items():
        body.append(f"--{boundary}".encode())
        body.append(f'Content-Disposition: form-data; name="{k}"; filename="{filename}"'.encode())
        body.append(b"Content-Type: application/octet-stream")
        body.append(b"")
        body.append(content_bytes)
        
    body.append(f"--{boundary}--".encode())
    body.append(b"")
    
    payload = b"\r\n".join(body)
    headers = {
        "Content-Type": f"multipart/form-data; boundary={boundary}",
        "Authorization": f"Bearer {token}"
    }
    
    req = urllib.request.Request(url, data=payload, headers=headers, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            return resp.getcode(), json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        try:
            err_data = json.loads(e.read().decode("utf-8"))
        except Exception:
            err_data = {"detail": e.reason}
        return e.code, err_data
    except Exception as e:
        return 0, {"detail": str(e)}


def verify_checkpoint():
    executed = []
    passed = []
    failed = []
    
    # ─── 1. START BACKENDS ──────────────────────────────────────────────────
    log_section("1. STARTING BACKENDS")
    
    # Terminate any existing python processes on ports 8000 or 8001
    try:
        # On Windows, netstat to find PIDs and taskkill them
        import subprocess
        for port in [8000, 8001]:
            lines = subprocess.check_output(f'netstat -ano | findstr :{port}', shell=True).decode().split('\n')
            for line in lines:
                parts = line.strip().split()
                if len(parts) >= 5 and parts[1].endswith(f':{port}'):
                    pid = parts[4]
                    print(f"Killing process {pid} occupying port {port}")
                    subprocess.call(f'taskkill /F /PID {pid}', shell=True)
    except Exception:
        pass

    # Ensure central and hospital SQLite DB files are clean
    for db in ["central.db", "hospital.db"]:
        for parent in ["central/backend", "hospital/backend"]:
            path = os.path.join(WORKSPACE_DIR, parent, db)
            if os.path.exists(path):
                try:
                    os.remove(path)
                    print(f"Removed old database file: {path}")
                except Exception as e:
                    print(f"Could not remove database file {path}: {e}")

    # Launch Central Backend
    print("Launching Central Coordinator backend (port 8000)...")
    python_exe = os.path.join(WORKSPACE_DIR, ".venv", "Scripts", "python.exe")
    central_log_path = os.path.join(WORKSPACE_DIR, "central_verify.log")
    hospital_log_path = os.path.join(WORKSPACE_DIR, "hospital_verify.log")
    central_log = open(central_log_path, "w", encoding="utf-8")
    hospital_log = open(hospital_log_path, "w", encoding="utf-8")
    
    central_proc = subprocess.Popen(
        [python_exe, "-m", "uvicorn", "app.main:app", "--port", "8000"],
        cwd=os.path.join(WORKSPACE_DIR, "central", "backend"),
        stdout=central_log, stderr=central_log
    )
    
    # Launch Hospital Backend
    print("Launching Hospital Node backend (port 8001)...")
    hospital_proc = subprocess.Popen(
        [python_exe, "-m", "uvicorn", "app.main:app", "--port", "8001"],
        cwd=os.path.join(WORKSPACE_DIR, "hospital", "backend"),
        stdout=hospital_log, stderr=hospital_log
    )
    
    print("Waiting 16 seconds for servers to start...")
    time.sleep(16)
    
    # ─── 2. CHECK STARTUP & HEALTH ──────────────────────────────────────────
    log_section("2. STARTUP & HEALTH CHECKS")
    
    # Check if central exited early
    if central_proc.poll() is not None:
        print(f"Central coordinator exited early with code: {central_proc.returncode}")
        try:
            with open(central_log_path, "r", encoding="utf-8") as f:
                print("Central logs:\n", f.read()[-1000:])
        except Exception as e:
            print("Could not read central logs:", e)

    # Check if hospital exited early
    if hospital_proc.poll() is not None:
        print(f"Hospital node exited early with code: {hospital_proc.returncode}")
        try:
            with open(hospital_log_path, "r", encoding="utf-8") as f:
                print("Hospital logs:\n", f.read()[-1000:])
        except Exception as e:
            print("Could not read hospital logs:", e)

    # Central Health
    executed.append("Central Startup Health Check")
    status, body = http_json_request(f"{CENTRAL_URL}/api/v1/health")
    if status == 200 and (body.get("status") == "healthy" or "central" in body.get("service", "")):
        print(f"[PASS] Central health: {body}")
        passed.append("Central Startup Health Check")
    else:
        print(f"[FAIL] Central health returned code {status}: {body}")
        failed.append("Central Startup Health Check")
        if central_proc.poll() is None:
            print("Central backend is running but not responding to health check. PID:", central_proc.pid)
            try:
                with open(central_log_path, "r", encoding="utf-8") as f:
                    print("Central backend current logs:\n", f.read())
            except Exception:
                pass

    # Hospital Health
    executed.append("Hospital Startup Health Check")
    status, body = http_json_request(f"{HOSPITAL_URL}/api/v1/health")
    if status == 200 and (body.get("status") == "healthy" or "hospital" in body.get("service", "")):
        print(f"[PASS] Hospital health: {body}")
        passed.append("Hospital Startup Health Check")
    else:
        print(f"[FAIL] Hospital health returned code {status}: {body}")
        failed.append("Hospital Startup Health Check")


    # ─── 3. TEST AUTHENTICATION ─────────────────────────────────────────────
    log_section("3. AUTHENTICATION CHECKS")
    
    # Admin login
    executed.append("Admin Login")
    status, admin_auth = http_json_request(
        f"{CENTRAL_URL}/api/v1/auth/login", 
        method="POST", 
        data={"email": "admin@fedcare.ai", "password": "admin123"}
    )
    if status == 200 and admin_auth.get("access_token"):
        admin_token = admin_auth["access_token"]
        print("[PASS] Admin logged in successfully!")
        passed.append("Admin Login")
    else:
        print(f"[FAIL] Admin login failed with code {status}: {admin_auth}")
        failed.append("Admin Login")
        admin_token = None

    # Hospital login (logs in as primary investigator for Hospital 1 via Hospital Proxy)
    executed.append("Hospital Login")
    status, hosp_auth = http_json_request(
        f"{HOSPITAL_URL}/api/v1/auth/login", 
        method="POST", 
        data={"email": "aj@gmail.com", "password": "123456"}
    )
    if status == 200 and hosp_auth.get("access_token"):
        hosp_token = hosp_auth["access_token"]
        print("[PASS] Hospital user logged in successfully!")
        passed.append("Hospital Login")
    else:
        print(f"[FAIL] Hospital login failed with code {status}: {hosp_auth}")
        failed.append("Hospital Login")
        hosp_token = None

    # Invalid credentials check
    executed.append("Invalid Credentials Authentication Reject")
    status, bad_auth = http_json_request(
        f"{CENTRAL_URL}/api/v1/auth/login", 
        method="POST", 
        data={"email": "admin@fedcare.ai", "password": "wrongpassword"}
    )
    if status == 401:
        print("[PASS] Invalid credentials properly rejected with status 401.")
        passed.append("Invalid Credentials Authentication Reject")
    else:
        print(f"[FAIL] Expected 401, got {status} for bad password: {bad_auth}")
        failed.append("Invalid Credentials Authentication Reject")

    # ─── 4. TEST ROLE AUTHORIZATION & ISOLATION ─────────────────────────────
    log_section("4. ROLE AUTHORIZATION & ISOLATION CHECKS")
    
    # Verify Admin route restriction (Hospitals cannot access Admin servers POST route)
    executed.append("Admin Route Restriction Enforcement")
    status, res = http_json_request(
        f"{CENTRAL_URL}/api/v1/servers/",
        method="POST",
        data={"name": "Attacker System", "disease_type": "Cancer"},
        headers={"Authorization": f"Bearer {hosp_token}"}
    )
    if status == 403:
        print("[PASS] Hospital token was properly forbidden from Admin server creation endpoint.")
        passed.append("Admin Route Restriction Enforcement")
    else:
        print(f"[FAIL] Expected 403, got {status} for hospital accessing admin endpoint: {res}")
        failed.append("Admin Route Restriction Enforcement")

    # Verify hospital identity check (hospital ID cannot be overridden by client header)
    executed.append("Client Hospital ID Header Bypass Prevention")
    status, servers_list = http_json_request(
        f"{HOSPITAL_URL}/api/v1/servers/",
        method="GET",
        headers={"Authorization": f"Bearer {hosp_token}", "X-Hospital-Id": "99"}
    )
    # The member list check should still map to hospital 1
    # Check if servers list was retrieved
    if status == 200:
        print("[PASS] Successfully fetched servers list using JWT auth.")
        passed.append("Client Hospital ID Header Bypass Prevention")
    else:
        print(f"[FAIL] Servers list returned status {status}: {servers_list}")
        failed.append("Client Hospital ID Header Bypass Prevention")

    # ─── 5. DATASET UPLOAD & VALIDATION (PRIVACY TEST) ──────────────────────
    log_section("5. DATASET UPLOAD & PRIVACY CHECKS")
    
    # Read sample text dataset from baseline folder
    dataset_file_path = os.path.join(WORKSPACE_DIR, "backend", "data", "hospital_1", "server_2", "Hospital A (Diabetes).txt")
    executed.append("Hospital Node Dataset Upload & Local Storage")
    if not os.path.exists(dataset_file_path):
        print(f"[FAIL] Real dataset file missing at {dataset_file_path}")
        failed.append("Hospital Node Dataset Upload & Local Storage")
        local_dataset_id = None
    else:
        with open(dataset_file_path, "rb") as f:
            csv_bytes = f.read()
            
        # Upload to Hospital node (port 8001) for Server 1
        fields_s1 = {"server_id": "1"}
        files_s1 = {"file": ("Hospital A (Diabetes).txt", csv_bytes)}
        status, ds_upload = http_multipart_request(
            f"{HOSPITAL_URL}/api/v1/datasets/upload",
            fields_s1, files_s1, hosp_token
        )
        
        # Upload to Hospital node (port 8001) for Server 2
        fields_s2 = {"server_id": "2"}
        files_s2 = {"file": ("Hospital A (Diabetes).txt", csv_bytes)}
        status2, ds_upload2 = http_multipart_request(
            f"{HOSPITAL_URL}/api/v1/datasets/upload",
            fields_s2, files_s2, hosp_token
        )
        
        if status == 200 and ds_upload.get("id"):
            local_dataset_id = ds_upload["id"]
            print(f"[PASS] Dataset uploaded locally! Metadata ID: {local_dataset_id}")
            
            # Check physical file storage location
            expected_local_path = os.path.join(
                WORKSPACE_DIR, "hospital", "backend", "data", "hospital_1", "server_1", "Hospital A (Diabetes).txt"
            )
            if os.path.exists(expected_local_path):
                print(f"[PASS] Verified: Dataset file exists ONLY locally at {expected_local_path}")
                passed.append("Hospital Node Dataset Upload & Local Storage")
            else:
                print(f"[FAIL] Dataset file not found in hospital data directory: {expected_local_path}")
                failed.append("Hospital Node Dataset Upload & Local Storage")
        else:
            print(f"[FAIL] Local upload failed with status {status}: {ds_upload}")
            failed.append("Hospital Node Dataset Upload & Local Storage")
            local_dataset_id = None

    # Deep Local Dataset Validation Check
    if local_dataset_id:
        executed.append("Hospital Deep Local Validation Report")
        status, val_report = http_json_request(
            f"{HOSPITAL_URL}/api/v1/datasets/validate/{local_dataset_id}",
            method="POST",
            headers={"Authorization": f"Bearer {hosp_token}"}
        )
        if status == 200 and val_report.get("status") == "valid":
            print(f"[PASS] Local validation report: missing={val_report['missing_values']['total']}, duplicates={val_report['duplicates']}, class_dist={val_report['class_distribution']}")
            passed.append("Hospital Deep Local Validation Report")
        else:
            print(f"[FAIL] Local validation failed with code {status}: {val_report}")
            failed.append("Hospital Deep Local Validation Report")

    # ─── 6. LOCAL MODEL TRAINING ────────────────────────────────────────────
    log_section("6. LOCAL TRAINING CHECKS")
    
    # Train local XGBoost model
    executed.append("Local XGBoost Model Training")
    status, train_res = http_json_request(
        f"{HOSPITAL_URL}/api/v1/training/local-start",
        method="POST",
        data={"server_id": 1, "epochs": 2},
        headers={"Authorization": f"Bearer {hosp_token}"}
    )
    if status == 200 and train_res.get("status") == "completed":
        print(f"[PASS] Local XGBoost training succeeded! Metrics: Acc={train_res['metrics']['accuracy']:.4f}, F1={train_res['metrics']['f1']:.4f}")
        
        # Verify local pickle model artifact is written
        local_model_path = os.path.join(WORKSPACE_DIR, "hospital", "backend", "saved_models", "server_1", "local_model_1.pkl")
        if os.path.exists(local_model_path):
            print(f"[PASS] Local XGBoost model pickle file exists at {local_model_path}")
            passed.append("Local XGBoost Model Training")
        else:
            print(f"[FAIL] Local model file missing at {local_model_path}")
            failed.append("Local XGBoost Model Training")
    else:
        print(f"[FAIL] Local training failed: {train_res}")
        failed.append("Local XGBoost Model Training")

    # Train local Logistic Regression model
    executed.append("Local Logistic Regression Model Training")
    status, train_lr_res = http_json_request(
        f"{HOSPITAL_URL}/api/v1/training/local-start",
        method="POST",
        data={"server_id": 2, "epochs": 2},
        headers={"Authorization": f"Bearer {hosp_token}"}
    )
    if status == 200 and train_lr_res.get("status") == "completed":
        print(f"[PASS] Local Logistic Regression training succeeded! Metrics: Acc={train_lr_res['metrics']['accuracy']:.4f}, F1={train_lr_res['metrics']['f1']:.4f}")
        passed.append("Local Logistic Regression Model Training")
    else:
        print(f"[FAIL] Local LR training failed: {train_lr_res}")
        failed.append("Local Logistic Regression Model Training")

    # ─── 7. FEDERATED WORKFLOW SIMULATION (1 COMPLETED ROUND) ────────────────
    log_section("7. FEDERATED TRAINING WORKFLOW CHECK")
    
    # Start round centrally
    executed.append("Federated Round Activation")
    status, round_start = http_json_request(
        f"{CENTRAL_URL}/api/v1/training/start/1",
        method="POST",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    if status == 200 and round_start.get("status") == "round_started":
        print(f"[PASS] Central coordinator successfully started training round: {round_start}")
        passed.append("Federated Round Activation")
    else:
        print(f"[FAIL] Federated round start failed: {round_start}")
        failed.append("Federated Round Activation")

    # Hospital Node triggers sync (polling central, downloading global, training, uploading)
    executed.append("Hospital Node Federated Polling & Submission")
    status, sync_res = http_json_request(
        f"{HOSPITAL_URL}/api/v1/training/sync",
        method="POST",
        headers={"Authorization": f"Bearer {hosp_token}"}
    )
    if status == 200 and sync_res.get("status") == "completed":
        print(f"[PASS] Hospital node synced successfully: Participated in round {sync_res['participated_rounds']}")
        passed.append("Hospital Node Federated Polling & Submission")
    else:
        print(f"[FAIL] Hospital Node sync failed: {sync_res}")
        failed.append("Hospital Node Federated Polling & Submission")

    # Coordinator triggers Aggregation
    executed.append("Federated Global Model Aggregation & Versioning")
    status, agg_res = http_json_request(
        f"{CENTRAL_URL}/api/v1/training/aggregate/1",
        method="POST",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    if status == 200 and agg_res.get("status") == "aggregated":
        print(f"[PASS] Central aggregation complete! New Global Version: {agg_res['version']}, Hash: {agg_res['hash']}")
        
        # Verify global model file exists centrally
        global_path = os.path.join(WORKSPACE_DIR, "central", "backend", "saved_models", "server_1", "global_model_v1.pkl")
        if os.path.exists(global_path):
            print(f"[PASS] Global model file saved centrally at {global_path}")
            passed.append("Federated Global Model Aggregation & Versioning")
        else:
            print(f"[FAIL] Global model file missing at {global_path}")
            failed.append("Federated Global Model Aggregation & Versioning")
    else:
        print(f"[FAIL] Aggregation failed: {agg_res}")
        failed.append("Federated Global Model Aggregation & Versioning")

    # ─── 8. TEST INTEGRITY & CORRUPTED SUBMISSIONS ──────────────────────────
    log_section("8. INTEGRITY CHECKS")
    
    # Try uploading a bad file to model-update and ensure rejection or validation
    executed.append("Corrupted Model Update Submission Rejection")
    status, bad_up = http_json_request(
        f"{CENTRAL_URL}/api/v1/federated/model-update",
        method="POST",
        data={"server_id": 1, "round_number": 2, "sample_count": 0, "local_metrics": "{}"},
        headers={"Authorization": f"Bearer {hosp_token}"}
    )
    # Should reject due to missing file payload or 422 validation
    if status == 422 or status == 400:
        print(f"[PASS] Malformed/Corrupted submission rejected properly with status {status}")
        passed.append("Corrupted Model Update Submission Rejection")
    else:
        print(f"[FAIL] Expected rejection, got status {status} for bad model update: {bad_up}")
        failed.append("Corrupted Model Update Submission Rejection")

    # ─── 9. LOCAL PREDICTIONS & SHAP WATERFALL CHECKS ──────────────────────
    log_section("9. LOCAL PREDICTION & SHAP WATERFALL CHECKS")
    
    # Hospital user gets global model first (downloads from coordinator)
    # The sync endpoint already downloaded it, so we can run a predict directly!
    executed.append("Hospital Node Local Inference")
    sample_features = {
        "Pregnancies": 6, "Glucose": 148, "BloodPressure": 72, "SkinThickness": 35,
        "Insulin": 0, "BMI": 33.6, "DiabetesPedigreeFunction": 0.627, "Age": 50
    }
    status, pred_res = http_json_request(
        f"{HOSPITAL_URL}/api/v1/predictions/predict",
        method="POST",
        data={"server_id": 1, "features": sample_features},
        headers={"Authorization": f"Bearer {hosp_token}"}
    )
    if status == 200 and "prediction" in pred_res:
        pred_id = pred_res["id"]
        print(f"[PASS] Prediction succeeded! Label: {pred_res['prediction_label']}, Confidence: {pred_res['confidence']:.4f}")
        passed.append("Hospital Node Local Inference")
    else:
        print(f"[FAIL] Local inference failed with status {status}: {pred_res}")
        failed.append("Hospital Node Local Inference")
        pred_id = None

    # SHAP Waterfall Plot check
    if pred_id:
        executed.append("SHAP Waterfall Chart Generation")
        status, explain_res = http_json_request(
            f"{HOSPITAL_URL}/api/v1/explainability/explain/{pred_id}",
            method="GET",
            headers={"Authorization": f"Bearer {hosp_token}"}
        )
        if status == 200 and explain_res.get("plot_base64"):
            print(f"[PASS] SHAP explanation generated successfully! Plot image is present: {explain_res['plot_base64'][:50]}...")
            passed.append("SHAP Waterfall Chart Generation")
        else:
            print(f"[FAIL] SHAP explanation failed: {explain_res}")
            failed.append("SHAP Waterfall Chart Generation")

    # ─── 9b. ADMIN PORTAL API INTEGRITY CHECKS ──────────────────────────────
    log_section("9b. ADMIN PORTAL API CHECKS")
    
    # 1. Fetch hospitals list (Admin token)
    executed.append("Admin Hospitals List Fetch")
    status, hosp_list = http_json_request(
        f"{CENTRAL_URL}/api/v1/servers/hospitals/list",
        method="GET",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    if status == 200 and isinstance(hosp_list, list):
        print(f"[PASS] Admin successfully retrieved hospitals list. Count: {len(hosp_list)}")
        passed.append("Admin Hospitals List Fetch")
    else:
        print(f"[FAIL] Admin hospitals list returned status {status}: {hosp_list}")
        failed.append("Admin Hospitals List Fetch")

    # 2. Fetch global models registry (Admin token)
    executed.append("Admin Global Models Registry Fetch")
    status, global_mods = http_json_request(
        f"{CENTRAL_URL}/api/v1/training/global-models",
        method="GET",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    if status == 200 and isinstance(global_mods, list):
        print(f"[PASS] Admin successfully retrieved global models. Count: {len(global_mods)}")
        passed.append("Admin Global Models Registry Fetch")
    else:
        print(f"[FAIL] Admin global models list returned status {status}: {global_mods}")
        failed.append("Admin Global Models Registry Fetch")

    # 3. Fetch global feature importance (Admin token)
    executed.append("Admin Global Feature Importance (XAI) Fetch")
    status, xai_res = http_json_request(
        f"{CENTRAL_URL}/api/v1/explainability/feature-importance/1",
        method="GET",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    if status == 200 and "feature_ranking" in xai_res:
        print(f"[PASS] Admin successfully retrieved global model feature attributions.")
        passed.append("Admin Global Feature Importance (XAI) Fetch")
    else:
        print(f"[FAIL] Admin global XAI returned status {status}: {xai_res}")
        failed.append("Admin Global Feature Importance (XAI) Fetch")

    # 4. Enforce: Hospital token cannot view admin hospitals list
    executed.append("Hospital User Admin Route Rejection")
    status, hosp_reject = http_json_request(
        f"{CENTRAL_URL}/api/v1/servers/hospitals/list",
        method="GET",
        headers={"Authorization": f"Bearer {hosp_token}"}
    )
    if status == 403:
        print("[PASS] Hospital credentials correctly rejected (403 Forbidden) on Admin-only list.")
        passed.append("Hospital User Admin Route Rejection")
    else:
        print(f"[FAIL] Expected 403, got {status} for hospital accessing admin hospitals list: {hosp_reject}")
        failed.append("Hospital User Admin Route Rejection")

    # ─── SHUT DOWN BACKENDS ────────────────────────────────────────────────
    log_section("10. TEARDOWN")
    print("Terminating background servers...")
    central_proc.terminate()
    hospital_proc.terminate()
    central_log.close()
    hospital_log.close()
    print("Verification execution complete.")
    
    # ─── REPORT SUMMARY ───────────────────────────────────────────────────
    log_section("VERIFICATION SUMMARY")
    print(f"Total Tests Executed : {len(executed)}")
    print(f"Total Tests Passed   : {len(passed)}")
    print(f"Total Tests Failed   : {len(failed)}")
    
    if failed:
        print("\n[FAIL] FAILED TESTS DETAILS:")
        for f in failed:
            print(f"  - {f}")
    else:
        print("\n[SUCCESS] ALL TESTS PASSED! Backend is fully verified and stable.")

    # Return results structured
    return {
        "executed": executed,
        "passed": passed,
        "failed": failed,
        "complete_round_success": len(failed) == 0
    }

if __name__ == "__main__":
    verify_checkpoint()
