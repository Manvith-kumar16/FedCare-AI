# FedCare AI - Federated Learning for Healthcare

FedCare AI is a state-of-the-art Federated Learning (FL) platform designed specifically for the healthcare industry. It enables collaborative machine learning training across multiple hospitals without sharing sensitive patient data, ensuring privacy and compliance with regulations like HIPAA.

## 🚀 Key Features

- **Privacy-Preserving Training**: Train models on local datasets and only share encrypted weight updates.
- **Explainable AI (XAI)**: Visualize model decisions using SHAP and Grad-CAM heatmaps.
- **Multi-Tenant Architecture**: Securely manage multiple hospitals and disease-specific training servers.
- **Real-time Monitoring**: Track federated training progress and accuracy metrics across all nodes.
- **Modern UI**: A premium, high-density dashboard built with React and glassmorphism design.

## 🛠️ Technology Stack

- **Frontend**: React 18, Vite, Chart.js, React Icons.
- **Backend**: FastAPI (Python 3.10+), SQLAlchemy, Uvicorn.
- **Database**: SQLite (Development) / PostgreSQL (Production).
- **ML/FL**: XGBoost, Scikit-learn, Custom Federated Aggregation.

## 📁 Project Structure

```text
FedCare-AI/
├── backend/            # FastAPI Backend
│   ├── app/            # Main application logic
│   ├── data/           # Local datasets and SQLite DB
│   ├── scripts/        # Utility and maintenance scripts
│   ├── tests/          # Unit and integration tests
│   └── saved_models/   # Persistent model storage
├── frontend/           # React Frontend
│   ├── src/
│   │   ├── api/        # Modular API client
│   │   ├── components/ # Reusable UI components
│   │   ├── pages/      # View components
│   │   └── contexts/   # Global state management
├── docs/               # Technical documentation
└── scripts/            # Project-wide automation scripts
```

## 🚦 Getting Started

### Prerequisites
- Python 3.10+
- Node.js 18+
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Manvith-kumar16/FedCare-AI.git
   cd FedCare-AI
   ```

2. **Setup Backend**
   ```bash
   cd backend
   python -m venv .venv
   source .venv/bin/activate  # On Windows: .venv\Scripts\activate
   pip install -r requirements.txt
   ```

3. **Setup Frontend**
   ```bash
   cd ../frontend
   npm install
   ```

### Running the App

1. **Start Backend**
   ```bash
   cd backend
   uvicorn app.main:app --reload
   ```

2. **Start Frontend**
   ```bash
   cd frontend
   npm run dev

# 🐘 PostgreSQL Setup (IMPORTANT)
### Step 1: Install PostgreSQL

Download and install from:
👉 https://www.postgresql.org/download/

### Step 2: Create Database

Open PostgreSQL terminal or pgAdmin:

CREATE DATABASE fedcare_ai;

### Step 3: Configure Connection

Create .env file inside backend:

backend/.env

Add:

DATABASE_URL=postgresql+asyncpg://postgres:yourpassword@localhost:5432/fedcare_ai

⚠️ If password has special characters:

@ → %40
: → %3A

Example:

postgresql+asyncpg://postgres:Manvith%401132@localhost:5432/fedcare_ai

### Step 4: Run Migrations / Initialize DB
python reset_db.py

   ```

## 📜 License
This project is licensed under the MIT License.
