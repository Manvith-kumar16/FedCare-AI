# FedCare AI: Federated Learning Healthcare Platform

## 1. Project Overview & Privacy First

FedCare AI is a cutting-edge digital healthcare platform that uses **Federated Learning** to train global, highly accurate medical AI models (e.g., disease prediction) across multiple hospitals **without ever exposing patient data**.

In traditional AI, hospitals must send their sensitive patient data to a central cloud server, which poses massive privacy risks and violates strict healthcare compliance laws (like HIPAA and GDPR). 

FedCare AI solves this by bringing the AI to the data, rather than bringing the data to the AI.

### The Ephemeral In-Memory Training Method
To guarantee maximum privacy, the system utilizes **Ephemeral In-Memory Processing**:
1. When a doctor uploads a patient dataset (CSV), the file is **never saved to the hard drive** and **never logged in a database**.
2. The data is streamed directly into the computer's volatile RAM (using Pandas).
3. The Machine Learning model (XGBoost/Scikit-Learn) trains instantly on this RAM dataset using native C++ processing speeds.
4. Once training finishes, the data is permanently wiped from memory. **Only the mathematical model weights are sent to the cloud.**

---

## 2. System Architecture

The platform is split into two entirely separate software stacks:

### A. The Central Coordinator (Cloud)
* **Frontend**: `central/admin-portal` (React/Vite)
* **Backend**: `central/backend` (Python/FastAPI)
* **Purpose**: This is the "brain" hosted on the public internet. It authenticates hospitals, coordinates training rounds, and mathematically averages the weights it receives from different hospitals to create the ultimate Global AI Model. It **never** receives raw patient data.

### B. The Hospital Node (Local Desktop App)
* **Frontend/Wrapper**: `hospital/portal` (React/Vite wrapped in Electron)
* **Backend**: `hospital/backend` (Python/FastAPI wrapped in PyInstaller)
* **Purpose**: This is the software that runs physically inside the hospital. It handles the ephemeral training securely behind the hospital's own firewall.

---

## 3. How Hospitals Use It (Simple Workflow)

Because hospital staff are not software engineers, the Hospital Node is packaged to be as simple as possible.

1. **Install**: The doctor double-clicks the `FedCare-Hospital-Node.exe` (or `.AppImage`) Desktop Application. No IT teams or terminal commands are required.
2. **Connect**: The app automatically launches the local Python backend invisibly in the background and opens the UI.
3. **Upload**: The doctor selects a CSV dataset from their computer.
4. **Train**: The app trains the local AI model ephemerally in RAM.
5. **Synchronize**: The app sends only the resulting mathematical numbers (weights) over the internet to the Central Coordinator.

---

## 4. Production Deployment Strategy

To deploy this project to the real world, you distribute the two components differently:

### Deploying the Central Coordinator (Cloud Hosted)
* **Frontend (Admin Portal)**: 
  * **Best Choice: Vercel** or **Firebase Hosting**. They are free, incredibly fast, and optimized for React/Vite applications.
* **Backend (FastAPI)**:
  * **Best Choice: Render** or **Railway**. They easily host Python applications and automatically provide PostgreSQL databases which are far more robust for production than SQLite.

### Deploying the Hospital Node (Client Installed)
* **You do not deploy this to a cloud server!**
* Instead, you run `npm run electron:build` to generate an installer (`.exe` for Windows or `.AppImage` for Linux).
* You email this installer to the participating hospitals, and they install it on their local private computers.
* Before launching, they configure their settings to point to your live Vercel/Render Cloud URL.

---

## 5. Developer Guide: Running Locally

If you are developing or testing the application on your own machine, you must run all four components simultaneously.

### Prerequisites
1. Python 3.12+ and `pip`
2. Node.js v18+ and `npm`
3. A Python virtual environment (`.venv`) initialized at the project root.

### 🐧 Commands for Linux (Ubuntu/Bash)

**Terminal 1: Central Backend**
```bash
cd central/backend
source ../../.venv/bin/activate
uvicorn app.main:app --port 8000
```

**Terminal 2: Central Admin Portal**
```bash
cd central/admin-portal
npm run dev
```

**Terminal 3: Hospital Backend**
```bash
cd hospital/backend
source ../../.venv/bin/activate
uvicorn app.main:app --port 8001
```

**Terminal 4: Hospital Portal (Electron App)**
```bash
cd hospital/portal
npm run electron:start
```

---

### 🪟 Commands for Windows (PowerShell)

**Terminal 1: Central Backend**
```powershell
cd central\backend
..\..\.venv\Scripts\Activate.ps1
uvicorn app.main:app --port 8000
```

**Terminal 2: Central Admin Portal**
```powershell
cd central\admin-portal
npm run dev
```

**Terminal 3: Hospital Backend**
```powershell
cd hospital\backend
..\..\.venv\Scripts\Activate.ps1
uvicorn app.main:app --port 8001
```

**Terminal 4: Hospital Portal (Electron App)**
```powershell
cd hospital\portal
npm run electron:start
```
