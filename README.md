<div align="center">

<br/>

```
███████╗███████╗██████╗  ██████╗ █████╗ ██████╗ ███████╗     █████╗ ██╗
██╔════╝██╔════╝██╔══██╗██╔════╝██╔══██╗██╔══██╗██╔════╝    ██╔══██╗██║
█████╗  █████╗  ██║  ██║██║     ███████║██████╔╝█████╗      ███████║██║
██╔══╝  ██╔══╝  ██║  ██║██║     ██╔══██║██╔══██╗██╔══╝      ██╔══██║██║
██║     ███████╗██████╔╝╚██████╗██║  ██║██║  ██║███████╗    ██║  ██║██║
╚═╝     ╚══════╝╚═════╝  ╚═════╝╚═╝  ╚═╝╚═╝  ╚═╝╚══════╝    ╚═╝  ╚═╝╚═╝
```

### 🏥 **Privacy-First Federated Learning Platform for Healthcare**

<br/>

[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://reactjs.org/)
[![XGBoost](https://img.shields.io/badge/XGBoost-2.1-FF6600?style=for-the-badge&logo=python&logoColor=white)](https://xgboost.readthedocs.io/)
[![Python](https://img.shields.io/badge/Python-3.10+-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://python.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Production-336791?style=for-the-badge&logo=postgresql&logoColor=white)](https://postgresql.org/)
[![SHAP](https://img.shields.io/badge/SHAP-XAI-purple?style=for-the-badge&logo=python&logoColor=white)](https://shap.readthedocs.io/)
[![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-Welcome-brightgreen?style=for-the-badge)](https://github.com/Manvith-kumar16/FedCare-AI/pulls)

<br/>

> **Train together. Share nothing. Heal everyone.**
>
> *FedCare AI enables multiple hospitals to collaboratively build powerful AI models without ever sharing a single patient record.*

<br/>

---

</div>

## 🌐 What is FedCare AI?

**FedCare AI** is a full-stack, production-grade **Federated Learning (FL)** platform purpose-built for the healthcare ecosystem. In traditional machine learning, you must centralize all data — an impossible ask for hospitals bound by HIPAA, GDPR, and patient confidentiality laws.

FedCare AI flips this model on its head:

```
Traditional ML:       Hospital A ──┐
                      Hospital B ──┼──► Central Server (has ALL patient data) ► Model
                      Hospital C ──┘

FedCare AI:           Hospital A ──► Trains locally ──┐
                      Hospital B ──► Trains locally ──┼──► Aggregates only WEIGHTS ► Global Model
                      Hospital C ──► Trains locally ──┘
                                           ↑
                                  No patient data ever leaves
```

Each hospital trains **XGBoost models** on its own premises. Only **model weight updates** are sent to the central server for **FedAvg aggregation** — patient records stay private, forever.

<br/>

---

## ✨ Feature Showcase

<div align="center">

| 🔒 Privacy Layer | 🤖 ML Engine | 📊 Visualization | 🏗️ Architecture |
|:---:|:---:|:---:|:---:|
| Zero raw data sharing | XGBoost with 200 boost rounds | Real-time loss curves | Multi-tenant role system |
| Local-only training | FedAvg aggregation | Dual-axis accuracy charts | Admin & Hospital roles |
| Weight-only federation | Stratified train/val splits | SHAP explainability heatmaps | Async FastAPI backend |
| Hospital data isolation | Class imbalance handling | Per-round metric tables | React glassmorphism UI |

</div>

<br/>

### 🔑 Core Capabilities

<details>
<summary><b>🏥 Federated Training Pipeline</b></summary>
<br/>

- **Multi-hospital coordination** — Hospitals join disease-specific servers and train on their own local CSV/TXT datasets
- **FedAvg aggregation** — Server aggregates local model weights into a single global model each round
- **Resilient training** — Handles class-imbalanced datasets, single-class splits, and tiny datasets gracefully with automatic fallback injection
- **Real-time progress** — Live training logs streamed to the dashboard with polling-based status updates
- **Full metric suite** — Accuracy, F1, Precision, Recall, AUC-ROC, and log-loss captured every round

</details>

<details>
<summary><b>📈 Live Training Curve Visualization</b></summary>
<br/>

- **Dual-axis Chart.js plots** — Accuracy (blue, left axis) vs Loss (red, right axis) rendered per boosting round
- **100-round granularity** — Full XGBoost internal history (`logloss` + `error`) captured via `evals_result()` and embedded in the training log
- **Auto-extraction** — Frontend parses embedded `__HISTORY_JSON__` from DB logs to populate charts post-training
- **Live shimmer bar** — Indeterminate animated progress bar during active training

</details>

<details>
<summary><b>🧠 Explainable AI (XAI)</b></summary>
<br/>

- **SHAP integration** — Generates feature importance scores for every prediction
- **Waterfall plots** — Visual per-patient SHAP breakdown showing which features drove the diagnosis
- **Global feature ranking** — Bar chart of mean SHAP values across the dataset
- **Grad-CAM** — Gradient-weighted class activation mapping (for imaging-based models)

</details>

<details>
<summary><b>🔮 Real-Time Prediction Engine</b></summary>
<br/>

- **Dynamic input forms** — Auto-generated from the server's feature schema
- **Probability output** — Confidence score and positive/negative probability shown alongside prediction
- **XGBoost inference** — Loads the latest saved global model and runs `predict_proba` in real-time
- **Feature validation** — Validates inputs against the exact trained feature columns

</details>

<details>
<summary><b>🎨 Premium Glassmorphism Dashboard</b></summary>
<br/>

- **Dark mode by default** — Deep navy/indigo color palette with luminous accents
- **Glassmorphism panels** — Frosted-glass cards with backdrop-filter blur effects
- **Animated topology** — Visual federated network graph showing server ↔ hospital connections
- **Micro-animations** — Pulse effects, hover transitions, shimmer loaders throughout
- **Responsive layout** — Works across desktop and laptop resolutions

</details>

<br/>

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        FedCare AI Platform                          │
│                                                                     │
│  ┌────────────────────────────┐    ┌──────────────────────────────┐ │
│  │      React Frontend        │    │      FastAPI Backend          │ │
│  │  (Vite + Chart.js + SHAP)  │◄──►│  (SQLAlchemy + XGBoost)      │ │
│  │                            │    │                              │ │
│  │  ┌─────────────────────┐   │    │  ┌────────────────────────┐ │ │
│  │  │  Pages              │   │    │  │  API Routes (v1)        │ │ │
│  │  │  ├─ Dashboard       │   │    │  │  ├─ /auth               │ │ │
│  │  │  ├─ Servers         │   │    │  │  ├─ /servers            │ │ │
│  │  │  ├─ ServerDetail ◄──┼───┼────┼──┤  ├─ /training          │ │ │
│  │  │  ├─ Training        │   │    │  │  ├─ /datasets           │ │ │
│  │  │  ├─ Predictions     │   │    │  │  ├─ /predictions        │ │ │
│  │  │  ├─ Explainability  │   │    │  │  └─ /explainability     │ │ │
│  │  │  ├─ Datasets        │   │    │  └────────────────────────┘ │ │
│  │  │  └─ Profile         │   │    │                              │ │
│  │  └─────────────────────┘   │    │  ┌────────────────────────┐ │ │
│  │                            │    │  │  Services               │ │ │
│  └────────────────────────────┘    │  │  ├─ ai_service.py       │ │ │
│                                    │  │  ├─ fl_service.py       │ │ │
│  ┌────────────────────────────┐    │  │  └─ xai_service.py      │ │ │
│  │     Hospital Nodes         │    │  └────────────────────────┘ │ │
│  │                            │    │                              │ │
│  │  ┌──────┐  ┌──────┐        │    │  ┌────────────────────────┐ │ │
│  │  │Hosp A│  │Hosp B│  ...   │    │  │  Database (SQLite/PG)   │ │ │
│  │  │ CSV  │  │ CSV  │        │    │  │  ├─ disease_servers     │ │ │
│  │  └──────┘  └──────┘        │    │  │  ├─ server_members      │ │ │
│  │  Local XGBoost Training ───┼────┼──►  ├─ datasets            │ │ │
│  │  Weights Only → Server     │    │  │  ├─ training_logs       │ │ │
│  └────────────────────────────┘    │  │  └─ predictions         │ │ │
│                                    │  └────────────────────────┘ │ │
│                                    └──────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

<br/>

---

## 🛠️ Technology Stack

<div align="center">

### Backend
| Technology | Version | Role |
|:---|:---:|:---|
| **FastAPI** | 0.115 | Async REST API framework with OpenAPI docs |
| **SQLAlchemy** | 2.0 | Async ORM for database models & queries |
| **XGBoost** | 2.1 | Gradient boosting ML engine |
| **Scikit-learn** | 1.5 | Metrics, preprocessing, train/test splits |
| **SHAP** | 0.46 | Explainable AI / feature attribution |
| **Flower (flwr)** | 1.12 | Federated Learning framework |
| **Pandas / NumPy** | Latest | Data manipulation and numerical ops |
| **PostgreSQL** | 14+ | Production database (asyncpg driver) |
| **Uvicorn** | 0.30 | ASGI server with hot-reload |

### Frontend
| Technology | Version | Role |
|:---|:---:|:---|
| **React** | 18 | UI component framework |
| **Vite** | 5 | Lightning-fast build tool & dev server |
| **Chart.js + react-chartjs-2** | Latest | Training curve & metric visualizations |
| **React Icons (Heroicons)** | Latest | Premium icon set throughout UI |
| **Vanilla CSS** | — | Custom glassmorphism design system |

</div>

<br/>

---

## 📁 Project Structure

```
FedCare-AI/
│
├── 📂 backend/
│   ├── 📂 app/
│   │   ├── 📂 api/v1/endpoints/    # Route handlers
│   │   │   ├── auth.py             # JWT authentication
│   │   │   ├── servers.py          # Disease server management
│   │   │   ├── training.py         # FL training orchestration ⭐
│   │   │   ├── datasets.py         # Hospital dataset upload/preview
│   │   │   ├── predictions.py      # Real-time inference
│   │   │   └── explainability.py   # SHAP/XAI endpoint
│   │   ├── 📂 services/
│   │   │   ├── ai_service.py       # XGBoost training + evaluation ⭐
│   │   │   ├── fl_service.py       # FedAvg aggregation logic ⭐
│   │   │   └── xai_service.py      # SHAP computations
│   │   ├── 📂 models/              # SQLAlchemy DB models
│   │   ├── 📂 schemas/             # Pydantic request/response models
│   │   ├── 📂 db/                  # DB session, migrations
│   │   └── main.py                 # FastAPI app entrypoint
│   ├── 📂 saved_models/            # Persisted XGBoost .pkl artifacts
│   ├── 📂 data/                    # Hospital local datasets
│   ├── requirements.txt
│   └── .env                        # Database URL config
│
├── 📂 frontend/
│   └── 📂 src/
│       ├── 📂 pages/
│       │   ├── Dashboard.jsx       # Overview & stats
│       │   ├── Servers.jsx         # Disease server browser
│       │   ├── ServerDetail.jsx    # Training hub + charts ⭐
│       │   ├── Training.jsx        # Training history
│       │   ├── Predictions.jsx     # Patient inference page
│       │   ├── Explainability.jsx  # SHAP visualizations
│       │   ├── Datasets.jsx        # Dataset management
│       │   └── Login.jsx           # Auth (Hospital / Admin)
│       ├── 📂 components/          # Reusable UI components
│       ├── 📂 api/                 # Axios API client modules
│       ├── 📂 contexts/            # Auth & global state
│       └── index.css               # Design system & tokens
│
└── 📂 docs/
    └── architecture.md
```

<br/>

---

## 🚀 Getting Started

### Prerequisites

Before you begin, ensure you have the following installed:

```
✅ Python 3.10+
✅ Node.js 18+
✅ npm or yarn
✅ PostgreSQL 14+ (for production) OR SQLite (auto-created for dev)
✅ Git
```

---

### 1️⃣ Clone the Repository

```bash
git clone https://github.com/Manvith-kumar16/FedCare-AI.git
cd FedCare-AI
```

---

### 2️⃣ Backend Setup

```bash
cd backend

# Create & activate virtual environment
python -m venv .venv

# Windows
.venv\Scripts\activate

# macOS / Linux
source .venv/bin/activate

# Install all dependencies
pip install -r requirements.txt
```

---

### 3️⃣ Configure Environment

Create `backend/.env`:

```env
# SQLite (quick local dev — no setup needed)
DATABASE_URL=sqlite+aiosqlite:///./fedcare.db

# PostgreSQL (production)
# DATABASE_URL=postgresql+asyncpg://postgres:yourpassword@localhost:5432/fedcare_ai
```

> ⚠️ **Note:** If your PostgreSQL password contains special characters, URL-encode them:
> `@` → `%40` | `:` → `%3A`

---

### 4️⃣ Initialize the Database

```bash
# Inside backend/ with venv active
python reset_db.py
```

---

### 5️⃣ Frontend Setup

```bash
cd ../frontend
npm install
```

---

### 6️⃣ Launch the Application

Open **two terminals** and run simultaneously:

```bash
# Terminal 1 — Backend API server
cd backend
.venv\Scripts\activate        # Windows
# source .venv/bin/activate   # macOS/Linux
python -m uvicorn app.main:app --reload --port 8000
```

```bash
# Terminal 2 — Frontend dev server
cd frontend
npm run dev
```

Then open **[http://localhost:5173](http://localhost:5173)** 🎉

<br/>

---

## 🗺️ Platform Walkthrough

### Step 1: Login

| Role | What They Can Do |
|:---|:---|
| **Admin** | Create disease servers, approve hospitals, trigger training, view all metrics |
| **Hospital** | Upload datasets, join servers, view own training results, run predictions |

> 💡 For demo purposes, any hospital name + any password works via the universal demo login.

---

### Step 2: Create a Disease Server (Admin)

Go to **Servers → Create New Server** and configure:
- Disease type (e.g. Diabetes, Heart Disease)
- Target column name (e.g. `Outcome`)
- Number of federated rounds

---

### Step 3: Hospitals Join & Upload Data

Hospitals navigate to the server, click **Join**, and upload their local CSV/TXT dataset. The system auto-detects feature columns and the target variable.

---

### Step 4: Train the Model

The admin clicks **⚡ Train XGBoost Model**. The platform:

1. Loads all hospital datasets
2. Runs local XGBoost training (200 estimators, stratified splits)
3. Aggregates weights via **FedAvg**
4. Saves the global model to `saved_models/`
5. Logs accuracy, F1, AUC-ROC, and full loss/accuracy curves per boosting round

---

### Step 5: Visualize Results

After training, the **Training Curve** section renders:

- 📘 **Blue line** — Validation accuracy (%) rising per boosting round
- 📕 **Red dashed line** — Log-loss decreasing per boosting round
- 📋 **Summary table** — Round-by-round metric breakdown

---

### Step 6: Run Predictions & Explain

Navigate to **Predictions** → enter patient data → get real-time diagnosis with confidence score.

Go to **Explainability** → view SHAP waterfall charts showing exactly *which* features drove the model's decision for each patient.

<br/>

---

## 🐘 PostgreSQL Setup (Production)

<details>
<summary>Click to expand full PostgreSQL setup guide</summary>

### Install PostgreSQL

Download from: 👉 [https://www.postgresql.org/download/](https://www.postgresql.org/download/)

### Create Database

```sql
-- In psql or pgAdmin
CREATE DATABASE fedcare_ai;
```

### Configure `.env`

```env
DATABASE_URL=postgresql+asyncpg://postgres:yourpassword@localhost:5432/fedcare_ai
```

### Initialize Schema

```bash
cd backend
python reset_db.py
```

### Verify Connection

```bash
python -c "import asyncio; from app.db.session import AsyncSessionLocal; asyncio.run(AsyncSessionLocal().__aenter__())" && echo "Connection OK"
```

</details>

<br/>

---

## 🔬 How Federated Learning Works in FedCare AI

```
Round 1:
  ┌─────────────────────────────────────────────┐
  │  Server broadcasts initial model weights     │
  └────────────────┬────────────────────────────┘
                   │
       ┌───────────┼───────────┐
       ▼           ▼           ▼
  [Hospital A]  [Hospital B]  [Hospital C]
  Trains on     Trains on     Trains on
  local data    local data    local data
  (private)     (private)     (private)
       │           │           │
       └───────────┼───────────┘
                   │  (weights only, no data)
                   ▼
  ┌─────────────────────────────────────────────┐
  │  Server runs FedAvg: w_global = Σ(nᵢ/N)wᵢ  │
  │  Updated global model → next round          │
  └─────────────────────────────────────────────┘

Repeat for N rounds → converged global model
```

**Key Privacy Guarantee:** Raw patient records **never** leave the hospital. Only floating-point weight arrays are transmitted.

<br/>

---

## 📊 Model Performance

Typical results on the Pima Indians Diabetes dataset (combined across hospitals):

| Metric | Value |
|:---|:---:|
| **Accuracy** | ~84–88% |
| **F1 Score** | ~0.82–0.84 |
| **AUC-ROC** | ~0.88–0.92 |
| **Precision** | ~89–95% |
| **Recall** | ~75–92% |
| **Training Speed** | < 5 seconds (100 rounds) |

<br/>

---

## 🤝 Contributing

Contributions are warmly welcome! Here's how to get started:

```bash
# Fork the repo, then:
git checkout -b feature/your-amazing-feature
git commit -m "feat: add your amazing feature"
git push origin feature/your-amazing-feature
# Open a Pull Request 🚀
```

### Contribution Ideas

- 🔐 Add differential privacy (DP-SGD) to the weight aggregation
- 🏥 Support DICOM medical imaging datasets
- 📡 Migrate polling to WebSocket for real-time log streaming  
- 🧪 Add more unit tests for the FL aggregation logic
- 🌍 Add multi-language support to the dashboard

<br/>

---

## 🛡️ Security & Compliance

| Feature | Status |
|:---|:---:|
| No raw patient data transmission | ✅ |
| JWT-based authentication | ✅ |
| Role-based access control (Admin / Hospital) | ✅ |
| Hospital data isolation (each hospital sees only their data) | ✅ |
| Secure model storage (server-side only) | ✅ |
| HIPAA-aligned architecture | ✅ |

<br/>

---

## 📜 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

```
MIT License — Free to use, modify, and distribute with attribution.
```
