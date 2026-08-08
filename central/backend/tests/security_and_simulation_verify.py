"""
FedCare AI - E2E Security, Isolation, & Genuine Multi-Hospital Federated Simulation Test Suite
Covers Phase 15 and Phase 16.
"""
import os
import sys
import time
import shutil
import json
import sqlite3
import subprocess
import requests
import hashlib

# ─── CONFIGURATION ──────────────────────────────────────────────────────────
PORT_CENTRAL = 8000
PORT_HOSP_A = 8001
PORT_HOSP_B = 8002

URL_CENTRAL = f"http://127.0.0.1:{PORT_CENTRAL}"
URL_HOSP_A = f"http://127.0.0.1:{PORT_HOSP_A}"
URL_HOSP_B = f"http://127.0.0.1:{PORT_HOSP_B}"

TESTS_EXECUTED = 0
TESTS_PASSED = 0
TESTS_FAILED = []

def log_section(title: str):
    print("\n" + "=" * 80)
    print(f"  {title}")
    print("=" * 80)

def register_test(name: str, passed: bool, error_msg: str = ""):
    global TESTS_EXECUTED, TESTS_PASSED, TESTS_FAILED
    TESTS_EXECUTED += 1
    if passed:
        TESTS_PASSED += 1
        print(f"[PASS] {name}")
    else:
        TESTS_FAILED.append(name)
        print(f"[FAIL] {name} - {error_msg}")

def calculate_sha256(file_path: str) -> str:
    sha = hashlib.sha256()
    with open(file_path, "rb") as f:
        while chunk := f.read(8192):
            sha.update(chunk)
    return sha.hexdigest()

# ─── DATASETS CONSTRUCTION ──────────────────────────────────────────────────
# Hospital A: 10 sample patient rows
CSV_HOSP_A = (
    "Pregnancies,Glucose,BloodPressure,SkinThickness,Insulin,BMI,DiabetesPedigreeFunction,Age,Outcome\n"
    "6,148,72,35,0,33.6,0.627,50,1\n"
    "1,85,66,29,0,26.6,0.351,31,0\n"
    "8,183,64,0,0,23.3,0.672,32,1\n"
    "1,89,66,23,94,28.1,0.167,21,0\n"
    "0,137,40,35,168,43.1,2.288,33,1\n"
    "5,116,74,0,0,25.6,0.201,30,0\n"
    "3,78,50,32,88,31.0,0.248,26,1\n"
    "10,115,0,0,0,35.3,0.134,29,0\n"
    "2,197,70,45,543,30.5,0.158,53,1\n"
    "8,125,96,0,0,0.0,0.232,54,1\n"
)

# Hospital B: 12 sample patient rows (slightly different features & weights distribution)
CSV_HOSP_B = (
    "Pregnancies,Glucose,BloodPressure,SkinThickness,Insulin,BMI,DiabetesPedigreeFunction,Age,Outcome\n"
    "4,110,92,0,0,37.6,0.191,30,0\n"
    "10,168,74,0,0,38.0,0.537,34,1\n"
    "10,139,80,0,0,27.1,1.441,57,0\n"
    "1,189,60,23,846,30.1,0.398,59,1\n"
    "5,166,72,19,175,25.8,0.587,51,1\n"
    "7,100,0,0,0,30.0,0.484,32,1\n"
    "0,118,84,47,230,45.8,0.551,31,1\n"
    "7,107,74,0,0,29.6,0.254,31,1\n"
    "1,103,30,38,83,43.3,0.183,30,0\n"
    "1,115,70,30,96,34.6,0.529,32,1\n"
    "3,126,88,41,235,39.3,0.704,27,0\n"
    "8,99,84,0,0,35.4,0.388,50,0\n"
)

def run_tests():
    log_section("1. ENVIRONMENT SETUP & DEPLOYMENT")
    
    workspace_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
    print(f"Detected Workspace: {workspace_dir}")
    
    # Files & directory cleanups
    central_db = os.path.join(workspace_dir, "central", "backend", "central.db")
    hosp_a_db = os.path.join(workspace_dir, "hospital", "backend", "hospital_a.db")
    hosp_b_db = os.path.join(workspace_dir, "hospital", "backend", "hospital_b.db")
    
    for db in [central_db, hosp_a_db, hosp_b_db]:
        if os.path.exists(db):
            os.remove(db)
            print(f"Removed database: {db}")
            
    dir_data_a = os.path.join(workspace_dir, "hospital", "backend", "data_a")
    dir_data_b = os.path.join(workspace_dir, "hospital", "backend", "data_b")
    dir_models_a = os.path.join(workspace_dir, "hospital", "backend", "saved_models_a")
    dir_models_b = os.path.join(workspace_dir, "hospital", "backend", "saved_models_b")
    
    for d in [dir_data_a, dir_data_b, dir_models_a, dir_models_b]:
        if os.path.exists(d):
            shutil.rmtree(d)
        os.makedirs(d, exist_ok=True)
        print(f"Cleared & initialized directory: {d}")
        
    python_exe = sys.executable
    
    # 1. Start Central Coordinator
    print(f"Launching Central Coordinator on port {PORT_CENTRAL}...")
    log_c = open("central_sim.log", "w", encoding="utf-8")
    proc_central = subprocess.Popen(
        [python_exe, "-m", "uvicorn", "app.main:app", "--port", str(PORT_CENTRAL), "--host", "127.0.0.1"],
        cwd=os.path.join(workspace_dir, "central", "backend"),
        stdout=log_c, stderr=log_c
    )
    
    # 2. Start Hospital Node A
    print(f"Launching Hospital Node A on port {PORT_HOSP_A}...")
    log_ha = open("hospital_a_sim.log", "w", encoding="utf-8")
    env_a = os.environ.copy()
    env_a.update({
        "DATABASE_URL": f"sqlite+aiosqlite:///{hosp_a_db}",
        "DATA_DIR": dir_data_a,
        "MODELS_DIR": dir_models_a,
        "HOSPITAL_ID": "1",
        "CENTRAL_API_URL": URL_CENTRAL
    })
    proc_hosp_a = subprocess.Popen(
        [python_exe, "-m", "uvicorn", "app.main:app", "--port", str(PORT_HOSP_A), "--host", "127.0.0.1"],
        cwd=os.path.join(workspace_dir, "hospital", "backend"),
        stdout=log_ha, stderr=log_ha,
        env=env_a
    )
    
    # 3. Start Hospital Node B
    print(f"Launching Hospital Node B on port {PORT_HOSP_B}...")
    log_hb = open("hospital_b_sim.log", "w", encoding="utf-8")
    env_b = os.environ.copy()
    env_b.update({
        "DATABASE_URL": f"sqlite+aiosqlite:///{hosp_b_db}",
        "DATA_DIR": dir_data_b,
        "MODELS_DIR": dir_models_b,
        "HOSPITAL_ID": "2",
        "CENTRAL_API_URL": URL_CENTRAL
    })
    proc_hosp_b = subprocess.Popen(
        [python_exe, "-m", "uvicorn", "app.main:app", "--port", str(PORT_HOSP_B), "--host", "127.0.0.1"],
        cwd=os.path.join(workspace_dir, "hospital", "backend"),
        stdout=log_hb, stderr=log_hb,
        env=env_b
    )
    
    print("Waiting 24 seconds for database schemas initialization...")
    time.sleep(24)
    
    # Verify Startup health
    try:
        r = requests.get(f"{URL_CENTRAL}/api/v1/health")
        register_test("Central Startup Health", r.status_code == 200)
    except Exception as e:
        register_test("Central Startup Health", False, str(e))
        
    try:
        r = requests.get(f"{URL_HOSP_A}/api/v1/health")
        register_test("Hospital A Startup Health", r.status_code == 200)
    except Exception as e:
        register_test("Hospital A Startup Health", False, str(e))
        
    try:
        r = requests.get(f"{URL_HOSP_B}/api/v1/health")
        register_test("Hospital B Startup Health", r.status_code == 200)
    except Exception as e:
        register_test("Hospital B Startup Health", False, str(e))

    # Authenticate Users
    admin_token, hosp_a_token, hosp_b_token = None, None, None
    try:
        # Admin Login
        r = requests.post(f"{URL_CENTRAL}/api/v1/auth/login", json={"email": "admin@fedcare.ai", "password": "admin123"})
        if r.status_code == 200:
            admin_token = r.json()["access_token"]
            register_test("Admin Credentials Authentication", True)
        else:
            register_test("Admin Credentials Authentication", False, f"Status: {r.status_code}")
            
        # Hospital A Login
        r = requests.post(f"{URL_CENTRAL}/api/v1/auth/login", json={"email": "aj@gmail.com", "password": "123456"})
        if r.status_code == 200:
            hosp_a_token = r.json()["access_token"]
            register_test("Hospital A Credentials Authentication", True)
        else:
            register_test("Hospital A Credentials Authentication", False, f"Status: {r.status_code}")
            
        # Hospital B Login
        r = requests.post(f"{URL_CENTRAL}/api/v1/auth/login", json={"email": "hospital1@fedcare.ai", "password": "hospital1"})
        if r.status_code == 200:
            hosp_b_token = r.json()["access_token"]
            register_test("Hospital B Credentials Authentication", True)
        else:
            register_test("Hospital B Credentials Authentication", False, f"Status: {r.status_code}")
    except Exception as e:
        print(f"Auth Setup aborted: {e}")
        
    if not (admin_token and hosp_a_token and hosp_b_token):
        print("Required tokens missing. Stopping tests.")
        proc_central.terminate()
        proc_hosp_a.terminate()
        proc_hosp_b.terminate()
        return

    # ─── PHASE 15: SECURITY, PRIVACY & ISOLATION VERIFICATION ──────────────────
    log_section("2. PHASE 15: PRIVACY & DATA ISOLATION VERIFICATION")
    
    # 2.1 Dataset custody separation tests
    # Upload Hospital A dataset to Hospital A
    h_a = {"Authorization": f"Bearer {hosp_a_token}"}
    r = requests.post(
        f"{URL_HOSP_A}/api/v1/datasets/upload",
        files={"file": ("Hospital A.csv", CSV_HOSP_A.encode("utf-8"))},
        data={"server_id": 1},
        headers=h_a
    )
    register_test("Hospital A Dataset Upload", r.status_code == 200)
    
    # Upload Hospital B dataset to Hospital B
    h_b = {"Authorization": f"Bearer {hosp_b_token}"}
    r = requests.post(
        f"{URL_HOSP_B}/api/v1/datasets/upload",
        files={"file": ("Hospital B.csv", CSV_HOSP_B.encode("utf-8"))},
        data={"server_id": 1},
        headers=h_b
    )
    register_test("Hospital B Dataset Upload", r.status_code == 200)
    
    # Verify file system isolation
    path_a = os.path.join(dir_data_a, "hospital_1", "server_1", "Hospital A.csv")
    path_b = os.path.join(dir_data_b, "hospital_2", "server_1", "Hospital B.csv")
    
    file_a_isolated = os.path.exists(path_a) and not os.path.exists(path_b.replace("data_b", "data_a"))
    register_test("Dataset File Custody Isolation", file_a_isolated)
    
    # Verify Central Database contains NO raw patient values
    try:
        conn = sqlite3.connect(central_db)
        cursor = conn.cursor()
        # Query list of tables in central
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
        tables = [t[0] for t in cursor.fetchall()]
        
        # Central should not have datasets or patient values tables
        has_no_patient_table = "datasets" not in tables and "patient_records" not in tables
        # Check training logs values
        cursor.execute("SELECT * FROM sqlite_master WHERE name='training_logs'")
        has_training_logs = cursor.fetchone() is not None
        
        has_no_raw_data = True
        if has_training_logs:
            cursor.execute("SELECT details FROM training_logs")
            for row in cursor.fetchall():
                if "Pregnancies" in str(row[0]) or "Glucose" in str(row[0]):
                    has_no_raw_data = False
                    
        conn.close()
        register_test("Central DB Patient Privacy Validation", has_no_patient_table and has_no_raw_data)
    except Exception as e:
        register_test("Central DB Patient Privacy Validation", False, str(e))
        
    # 2.2 Hospital isolation tests
    # Hospital A trying to read Hospital B resources directly on Hospital B backend
    try:
        r = requests.get(f"{URL_HOSP_B}/api/v1/datasets/", headers=h_a)
        register_test("Cross-Hospital Dataset Access Rejection (A on B)", r.status_code == 403)
    except Exception as e:
        register_test("Cross-Hospital Dataset Access Rejection (A on B)", False, str(e))
        
    try:
        r = requests.get(f"{URL_HOSP_A}/api/v1/datasets/", headers=h_b)
        register_test("Cross-Hospital Dataset Access Rejection (B on A)", r.status_code == 403)
    except Exception as e:
        register_test("Cross-Hospital Dataset Access Rejection (B on A)", False, str(e))
        
    # Attempting parameter override (Hospital A tries to query Central using Hospital B identity parameters)
    # The submit endpoint does not accept hospital_id in form, it extracts it from the JWT.
    # Let's verify that submitting from A yields hospital_id = 1 on central db
    # We will verify this during the federated training round.
    
    # 2.3 Role isolation tests
    # Hospital investigator trying to access central admin endpoints
    try:
        r = requests.post(
            f"{URL_CENTRAL}/api/v1/servers/",
            json={"name": "Attacker Server", "disease_type": "Flu", "model_type": "xgboost"},
            headers=h_a
        )
        register_test("Hospital Investigator Access Admin Endpoint Rejection", r.status_code == 403)
    except Exception as e:
        register_test("Hospital Investigator Access Admin Endpoint Rejection", False, str(e))
        
    # Admin attempting to download raw files from hospital backend
    # Verify that central server endpoints have no routes to pull CSV files from hospitals
    try:
        r = requests.get(f"{URL_HOSP_A}/api/v1/datasets/", headers={"Authorization": f"Bearer {admin_token}"})
        register_test("Admin Direct Hospital Raw Data Rejection", r.status_code in (401, 403))
    except Exception as e:
        register_test("Admin Direct Hospital Raw Data Rejection", False, str(e))

    # 2.4 Integrity checks
    # Submit a fake/bad payload to central updates and verify rejection
    try:
        bad_payload = {"server_id": 1, "round_number": 1, "sample_count": 5, "local_metrics": "{}"}
        r = requests.post(f"{URL_CENTRAL}/api/v1/federated/model-update", data=bad_payload, headers=h_a)
        # Should reject because "file" parameter is missing
        register_test("Missing Model File Submission Rejection", r.status_code == 422)
    except Exception as e:
        register_test("Missing Model File Submission Rejection", False, str(e))

    # ─── PHASE 16: GENUINE MULTI-HOSPITAL FEDERATED SIMULATION ────────────────
    log_section("3. PHASE 16: MULTI-HOSPITAL FEDERATED RUN (XGBOOST)")
    
    # Ensure datasets uploaded for Server 2 (Logistic Regression) too!
    requests.post(
        f"{URL_HOSP_A}/api/v1/datasets/upload",
        files={"file": ("Hospital A.csv", CSV_HOSP_A.encode("utf-8"))},
        data={"server_id": 2},
        headers=h_a
    )
    requests.post(
        f"{URL_HOSP_B}/api/v1/datasets/upload",
        files={"file": ("Hospital B.csv", CSV_HOSP_B.encode("utf-8"))},
        data={"server_id": 2},
        headers=h_b
    )
    
    # ─── XGBoost Ensemble Pipeline ───
    server_id = 1
    
    # Step 1: Start training round 1 on Central Coordinator (Server 1)
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    r = requests.post(f"{URL_CENTRAL}/api/v1/training/start/{server_id}", headers=admin_headers)
    register_test("Start Coordinator Round 1 (XGBoost)", r.status_code == 200)
    round_details = r.json()
    print(f"Round Details: {round_details}")
    
    # Step 2: Trigger synchronization/local training on Hospital A
    print("Syncing Hospital Node A (Training local XGBoost trees)...")
    r = requests.post(f"{URL_HOSP_A}/api/v1/training/sync", headers=h_a)
    register_test("Hospital A Local Model Training & Sync", r.status_code == 200)
    hosp_a_res = r.json()
    print(f"Hospital A Results: {hosp_a_res}")
    
    # Step 3: Trigger synchronization/local training on Hospital B
    print("Syncing Hospital Node B (Training local XGBoost trees)...")
    r = requests.post(f"{URL_HOSP_B}/api/v1/training/sync", headers=h_b)
    register_test("Hospital B Local Model Training & Sync", r.status_code == 200)
    hosp_b_res = r.json()
    print(f"Hospital B Results: {hosp_b_res}")
    
    # Step 4: Aggregate updates centrally
    print("Coordinating Central Aggregation (XGBoost Voting Ensemble)...")
    r = requests.post(f"{URL_CENTRAL}/api/v1/training/aggregate/{server_id}", headers=admin_headers)
    register_test("Central Coordinator Aggregation (XGBoost)", r.status_code == 200)
    agg_res = r.json()
    print(f"Aggregation Results: {agg_res}")
    
    # Verify Global model versioning (v0.1.0)
    global_model_v1_path = os.path.join(workspace_dir, "central", "backend", "saved_models", "server_1", "global_model_v1.pkl")
    global_v1_exists = os.path.exists(global_model_v1_path)
    register_test("Global Model v0.1.0 Artifact Generation", global_v1_exists)
    
    # Run predictions on the new global model on both hospitals
    sample_patient = {
        "Pregnancies": 6, "Glucose": 148, "BloodPressure": 72, "SkinThickness": 35,
        "Insulin": 0, "BMI": 33.6, "DiabetesPedigreeFunction": 0.627, "Age": 50
    }
    
    # Re-sync both hospitals to get the new global model
    requests.post(f"{URL_HOSP_A}/api/v1/training/sync", headers=h_a)
    requests.post(f"{URL_HOSP_B}/api/v1/training/sync", headers=h_b)
    
    r_a = requests.post(f"{URL_HOSP_A}/api/v1/predictions/predict", json={"server_id": 1, "features": sample_patient}, headers=h_a)
    r_b = requests.post(f"{URL_HOSP_B}/api/v1/predictions/predict", json={"server_id": 1, "features": sample_patient}, headers=h_b)
    register_test("Hospital A Global Model v0.1.0 Inference Query", r_a.status_code == 200 and "prediction" in r_a.json())
    register_test("Hospital B Global Model v0.1.0 Inference Query", r_b.status_code == 200 and "prediction" in r_b.json())
    
    # Check predictions SHAP explanation base64 plot exists on local hospital node
    pred_id = r_a.json()["id"]
    r_shap = requests.get(f"{URL_HOSP_A}/api/v1/explainability/explain/{pred_id}", headers=h_a)
    register_test("Hospital Local SHAP Base64 Waterfall Extraction", r_shap.status_code == 200 and r_shap.json().get("plot_base64") is not None)

    # Start and run Round 2 to verify model progression (v0.2.0)
    print("\nStarting round 2 on XGBoost server pipeline...")
    r = requests.post(f"{URL_CENTRAL}/api/v1/training/start/{server_id}", headers=admin_headers)
    requests.post(f"{URL_HOSP_A}/api/v1/training/sync", headers=h_a)
    requests.post(f"{URL_HOSP_B}/api/v1/training/sync", headers=h_b)
    r = requests.post(f"{URL_CENTRAL}/api/v1/training/aggregate/{server_id}", headers=admin_headers)
    
    global_model_v2_path = os.path.join(workspace_dir, "central", "backend", "saved_models", "server_1", "global_model_v2.pkl")
    global_v2_exists = os.path.exists(global_model_v2_path)
    register_test("Model Versioning Progression to v0.2.0 Check", global_v2_exists)

    # ─── PHASE 16: MULTI-HOSPITAL FEDERATED RUN (LOGISTIC REGRESSION) ─────────
    log_section("4. PHASE 16: MULTI-HOSPITAL FEDERATED RUN (LOGISTIC REGRESSION)")
    
    server_id = 2
    
    # Round 1
    r = requests.post(f"{URL_CENTRAL}/api/v1/training/start/{server_id}", headers=admin_headers)
    register_test("Start Coordinator Round 1 (Logistic Regression)", r.status_code == 200)
    
    print("Syncing Hospital Node A (Training local Linear coefficients)...")
    r = requests.post(f"{URL_HOSP_A}/api/v1/training/sync", headers=h_a)
    register_test("Hospital A Local LR Model Training & Sync", r.status_code == 200)
    
    print("Syncing Hospital Node B (Training local Linear coefficients)...")
    r = requests.post(f"{URL_HOSP_B}/api/v1/training/sync", headers=h_b)
    register_test("Hospital B Local LR Model Training & Sync", r.status_code == 200)
    
    print("Coordinating Central Aggregation (Logistic Regression FedAvg)...")
    r = requests.post(f"{URL_CENTRAL}/api/v1/training/aggregate/{server_id}", headers=admin_headers)
    register_test("Central Coordinator Aggregation (Logistic Regression)", r.status_code == 200)
    agg_res_lr = r.json()
    print(f"Logistic Regression Aggregation results: {agg_res_lr}")
    
    global_model_v1_path_lr = os.path.join(workspace_dir, "central", "backend", "saved_models", "server_2", "global_model_v1.pkl")
    global_v1_exists_lr = os.path.exists(global_model_v1_path_lr)
    register_test("Global LR Model v0.1.0 Artifact Generation", global_v1_exists_lr)
    
    # ─── REPORT SUMMARY ──────────────────────────────────────────────────────────
    log_section("5. TEST VERIFICATION SUMMARY REPORT")
    print(f"Total Tests Executed : {TESTS_EXECUTED}")
    print(f"Total Tests Passed   : {TESTS_PASSED}")
    print(f"Total Tests Failed   : {len(TESTS_FAILED)}")
    
    if TESTS_FAILED:
        print("\nFailed Tests:")
        for ft in TESTS_FAILED:
            print(f"  - {ft}")
    else:
        print("\n[SUCCESS] ALL SECURITY, PRIVACY, ISOLATION & FEDERATED SIMULATION TESTS PASSED!")
        
    # Terminate background servers
    print("\nTerminating background node servers...")
    proc_central.terminate()
    proc_hosp_a.terminate()
    proc_hosp_b.terminate()
    log_c.close()
    log_ha.close()
    log_hb.close()
    print("Verification execution complete.")

if __name__ == "__main__":
    run_tests()
