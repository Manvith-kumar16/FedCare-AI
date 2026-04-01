<div align="center">
  <h1>🏥 FedCare AI</h1>
  <h3>A Multi-Tenant Federated Learning Platform for Privacy-Preserving Healthcare AI</h3>
  
  <p>
    <a href="#introduction">Introduction</a> •
    <a href="#-key-features">Key Features</a> •
    <a href="#%EF%B8%8F-system-architecture">Architecture</a> •
    <a href="#-development-roadmap">Roadmap</a> •
    <a href="#-security--privacy">Security & Privacy</a> •
    <a href="#-deployment--real-world-usage">Deployment</a>
  </p>

  <p>
    <img src="https://img.shields.io/badge/Python-3.10%2B-blue?style=for-the-badge&logo=python" alt="Python Version">
    <img src="https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi" alt="FastAPI">
    <img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React">
    <img src="https://img.shields.io/badge/PyTorch-EE4C2C?style=for-the-badge&logo=pytorch&logoColor=white" alt="PyTorch">
    <img src="https://img.shields.io/badge/Flower-FF6B6B?style=for-the-badge&logo=ai&logoColor=white" alt="Flower FL">
    <img src="https://img.shields.io/badge/Docker-2CA5E0?style=for-the-badge&logo=docker&logoColor=white" alt="Docker">
    <img src="https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL">
  </p>
</div>

---

## 📖 Introduction

**FedCare AI** is an enterprise-grade, multi-tenant federated learning platform engineered specifically for the healthcare sector. It empowers multiple hospitals and medical research facilities to collaboratively train robust AI models for disease prediction *without ever sharing sensitive patient data*. 

By leveraging the **Flower (flwr)** framework and localized microservices, raw medical data (X-rays, CSVs, audio recordings) remains strictly within the hospital's local infrastructure. Only the trained model weights are securely transmitted to the central server for aggregation. 

Coupled with **Explainable AI (XAI)**, FedCare AI provides not only highly accurate predictions but also transparent, trustworthy diagnostic insights (via Grad-CAM and SHAP), empowering clinicians in their decision-making process.

---

## ✨ Key Features

* **🛡️ Privacy-Preserving Federated Learning**: Train global AI models across multiple hospitals; raw patient data never leaves the local node.
* **🏢 Multi-Tenant AI Platform**: Dedicated "Disease Servers" allowing distinct AI pipelines (e.g., Lung Disease, Brain Tumor) to run in parallel.
* **📊 Multi-Modal Data Support**: Seamlessly ingest and process Images (CNNs), Tabular Data (XGBoost), and Audio (Spectrograms).
* **🔍 Explainable AI (XAI) for Trust**: Integrated Grad-CAM for image heatmaps and SHAP for tabular feature importance to validate AI decisions.
* **🔐 Enterprise Security & RBAC**: Secure JWT-based authentication with strict Role-Based Access Control distinguishing between ADMINs and HOSPITAL users.
* **🚀 Scalable Microservices Architecture**: Built on a decoupled API Gateway, lightweight AI workers, and scalable frontend dashboards.

---

## 🏛️ System Architecture

FedCare AI employs a decoupled, highly secure design intended for strict HIPAA/GDPR compliance.

```mermaid
graph TD
    A[Admin Dashboard] -->|Manage| B(FastAPI Gateway)
    C[Hospital Dashboard] -->|Join/Upload| B
    
    B --> D[(PostgreSQL DB)]
    
    subgraph Hospital 1 Environment 🏥
        H1_Data[(Local Patient Data)]
        H1_Node[Local FL Client Node]
        H1_Data --> H1_Node
    end
    
    subgraph Hospital 2 Environment 🏥
        H2_Data[(Local Patient Data)]
        H2_Node[Local FL Client Node]
        H2_Data --> H2_Node
    end
    
    B -->|Trigger Round| E((Flower FL Server))
    
    H1_Node <-->|Send Weights Only| E
    H2_Node <-->|Send Weights Only| E
    
    E -->|Aggregate Model| F(Global Model Registry)
```

> **🔒 Privacy Guarantee:** Under no circumstances does the system design permit raw images, audio, or text to traverse the network boundary of the Hospital Client Node.

---

## 🔄 System Workflow

The lifecycle of creating, joining, and training within a FedCare AI pipeline follows a strict operational flow.

### 1. Admin Workflow (Platform Management)
* **Create Disease Server**: The central Admin provisions a new AI pipeline specifying the disease target, data type, model structure, and FL algorithm.
* **Manage Hospitals**: Admin reviews credentials and approves registered hospitals.
* **Oversee Integrations**: Admin ties approved hospitals to specific Disease Servers.

### 2. Hospital Workflow (Client Participation)
* **Register & Onboard**: Hospital creates a local account and authenticates via the Frontend Dashboard.
* **Join Server**: Hospital requests access to a specific Disease Server.
* **Upload Dataset**: Once approved, the hospital securely uploads local datasets to their isolated node. Data is locally preprocessed.

### 3. Core Federated Learning Workflow (The Engine)
* **Global Initialization**: The FL Server spins up and initializes a blank baseline model.
* **Local Training**: The FL Server pings the hospital nodes. Each hospital utilizes its localized AI engine to train the model on its private dataset.
* **Weight Aggregation**: Hospital nodes transmit only the differential model weights back to the central server. 
* **Global Update**: The central server aggregates the weights using FedAvg/FedProx, updates the master model, and pushes it back for the next round.
* **XAI Output Generation**: During inference, predictions are funneled through the XAI layer to generate explanatory heatmap outputs.

---

## 🚀 Development Roadmap

The platform structure is being executed across a massively expanded 12-phase pipeline for maximum scalability:

# 🧱 PHASE 1 — PROJECT FOUNDATION (VERY IMPORTANT)

## 🎯 Goal:

Create a **scalable, production-grade backend system** with clean architecture, authentication, and database integration, ready for microservices expansion.

---

## ✅ PROMPT 1 (Paste in Antigravity)

Create a **production-grade backend system** using FastAPI for a healthcare AI SaaS platform named **FedCare AI**.

### Core Requirements:

* Python 3.10+
* FastAPI (async support)
* Clean Architecture:

  * Controllers (API routes)
  * Services (business logic)
  * Repositories (DB layer)
* PostgreSQL database
* SQLAlchemy ORM (async preferred)
* Alembic for migrations
* JWT Authentication:

  * Access token
  * Refresh token
* Role-Based Access Control:

  * ADMIN
  * HOSPITAL

---

### Project Structure:

```
app/
  api/
  core/
  models/
  schemas/
  services/
  db/
  utils/
  middleware/
```

---

### Core Features:

#### 1. Authentication System

* Register (Admin & Hospital)
* Login
* Password hashing (bcrypt)
* Token generation (JWT)
* Refresh token system

#### 2. Authorization

* Middleware for RBAC
* Route protection

---

### Database Tables:

* users (id, name, email, password, role, created_at)
* hospitals (id, name, admin_id)
* audit_logs (id, action, user_id, timestamp)

---

### Additional Requirements:

* .env configuration
* Logging system (info, error)
* Global exception handler
* CORS setup
* API versioning (/api/v1)

---

### Output:

* Complete backend code
* Folder structure
* Setup instructions
* Run commands

---

# 🧱 PHASE 2 — DISEASE SERVER SYSTEM (CORE FEATURE)

## 🎯 Goal:

Enable **multi-tenant AI system** where admin creates disease-specific AI servers.

---

## ✅ PROMPT 2

Extend the existing backend to implement a **Disease Server System**.

### Concept:

Each server = one AI pipeline (e.g., Lung AI, Brain Tumor AI)

---

### Features:

#### Admin Capabilities:

* Create server
* Configure:

  * name
  * disease_type
  * input_type (image, tabular, audio)
  * model_type
  * federated_algorithm (FedAvg, FedProx)
* Activate / deactivate server

---

### Database:

* disease_servers
* server_members

---

### APIs:

* POST /servers/create
* GET /servers
* GET /servers/{id}
* PATCH /servers/{id}/status

---

### Rules:

* Only ADMIN can create
* Hospitals can view

---

### Output:

* Full backend code
* Swagger API docs

---

# 🧱 PHASE 3 — HOSPITAL JOIN + DATA PIPELINE

## 🎯 Goal:

Hospitals join servers and upload data securely.

---

## ✅ PROMPT 3

Extend backend with:

### Features:

* Join request system
* Admin approval
* Dataset upload (image/csv/audio)

---

### APIs:

* POST /servers/{id}/join
* POST /servers/{id}/approve
* POST /datasets/upload

---

### Preprocessing:

* Image → resize, normalize
* Tabular → clean, encode
* Audio → spectrogram

---

### Security:

* Data isolation per hospital
* No cross-access

---

### Output:

* Upload system
* Preprocessing module

---

# 🧱 PHASE 4 — AI MODEL SERVICE

## 🎯 Goal:

Add training + prediction capabilities.

---

## ✅ PROMPT 4

Create AI module:

### Models:

* CNN (images)
* XGBoost (tabular)
* Audio CNN

---

### APIs:

* POST /train/{server_id}
* POST /predict/{server_id}

---

### Features:

* Model selection based on server config
* Save checkpoints
* Return prediction + confidence

---

### Output:

* Training pipeline
* Prediction pipeline

---

# 🧱 PHASE 5 — FEDERATED LEARNING SYSTEM 🔥

## 🎯 Goal:

Enable multi-hospital collaborative training.

---

## ✅ PROMPT 5

Integrate Flower framework:

### Components:

* FL Server
* Hospital Clients

---

### Workflow:

* Initialize global model
* Local training
* Weight aggregation
* Global update

---

### Features:

* FedAvg
* FedProx
* Configurable rounds

---

### Output:

* FL server
* Client code
* Integration

---

# 🧱 PHASE 6 — EXPLAINABLE AI 🔍

## 🎯 Goal:

Add explainability to predictions.

---

## ✅ PROMPT 6

### Implement:

* Grad-CAM (image)
* SHAP (tabular)

---

### API:

* GET /explain/{prediction_id}

---

### Output:

* Heatmaps
* Feature importance

---

# 🧱 PHASE 7 — FRONTEND DASHBOARD (ADVANCED 🔥)

## 🎯 Goal:

Build a **professional SaaS dashboard**

---


# 🧩 PHASE 7A — FRONTEND SETUP (ENTERPRISE LEVEL)

### 🎯 Goal:

Create a **scalable, production-grade frontend architecture** using React.

---

### ✅ PROMPT 7A

Create a production-grade frontend application for **FedCare AI** using:

### Tech Stack:

* React (Vite)
* TypeScript
* Bootstrap (primary UI)
* Axios (API communication)
* React Router (routing)
* Context API (global state)

---

### Project Structure:

```id="fe1"
src/
  api/
  assets/
  components/
  contexts/
  hooks/
  layouts/
  pages/
  routes/
  services/
  utils/
```

---

### Core Setup:

#### 1. Routing System

* Public routes (login/register)
* Protected routes (dashboard)
* Role-based routing (ADMIN / HOSPITAL)

#### 2. Axios Setup

* Base URL config
* Request interceptor (attach JWT)
* Response interceptor (handle 401 → logout)

#### 3. Auth Context

* Store user + token
* Login/logout functions
* Auto token persistence (localStorage)

#### 4. UI Base

* Responsive layout
* Sidebar + Topbar layout

---

### Additional Requirements:

* Environment variables (.env)
* Error boundary component
* Loading spinner component
* Toast notifications

---

### Output:

* Full React setup
* Folder structure
* Config files

---

# 🧩 PHASE 7B — AUTH UI (SECURE SYSTEM)

### 🎯 Goal:

Build secure authentication system with proper UX

---

### ✅ PROMPT 7B

Create authentication module:

---

### Pages:

* Login Page
* Register Page

---

### Features:

#### 1. Login

* Email + password
* API integration
* Store JWT
* Redirect to dashboard

#### 2. Register

* Hospital/Admin registration
* Form validation

---

### Security:

* JWT storage (secure)
* Auto logout on token expiry
* Protected route wrapper

---

### UX Enhancements:

* Error messages
* Loading states
* Success alerts

---

### Output:

* Auth pages
* Auth context integration
* Route protection

---

# 🧩 PHASE 7C — ADMIN DASHBOARD (CORE CONTROL PANEL)

### 🎯 Goal:

Build powerful admin control panel

---

### ✅ PROMPT 7C

Create Admin Dashboard:

---

### Features:

#### 1. Server Management

* Create disease server form
* Edit/delete server
* Toggle active/inactive

---

#### 2. Hospital Management

* View hospitals
* Approve/reject requests

---

#### 3. Analytics Dashboard

* Active servers count
* Participating hospitals
* Training progress charts

---

### UI:

* Sidebar navigation
* Cards (metrics)
* Tables (data)
* Charts (Chart.js)

---

### API Integration:

* Fetch servers
* Create server API
* Approve hospital API

---

### Output:

* Fully functional admin panel

---

# 🧩 PHASE 7D — HOSPITAL DASHBOARD (CLIENT PANEL)

### 🎯 Goal:

Enable hospitals to interact with system

---

### ✅ PROMPT 7D

Create Hospital Dashboard:

---

### Features:

#### 1. Server Discovery

* View available servers
* Request to join

---

#### 2. Dataset Upload

* Upload images / CSV / audio
* Show upload progress
* Validate file types

---

#### 3. Training Panel

* Start training button
* Show training logs
* Training status

---

#### 4. Prediction Panel

* Upload sample data
* Show predictions + confidence

---

### UI:

* Cards + tables
* Progress bars
* File upload UI

---

### Output:

* Full hospital panel

---

# 🧩 PHASE 7E — REUSABLE UI COMPONENTS (DESIGN SYSTEM)

### 🎯 Goal:

Create reusable UI system

---

### ✅ PROMPT 7E

Build reusable components:

---

### Components:

* Navbar (user info, logout)
* Sidebar (role-based menu)
* Card component
* Table component
* Modal component
* Form components
* Loader
* Notification (toast)

---

### Charts:

* Bar chart
* Line chart
* Pie chart

---

### Design:

* Clean SaaS UI
* Responsive
* Consistent styling

---

### Output:

* Component library

---

# 🧩 PHASE 7F — XAI VISUALIZATION (ADVANCED UI)

### 🎯 Goal:

Display AI explanations clearly

---

### ✅ PROMPT 7F

Create XAI visualization module:

---

### Features:

#### 1. Heatmap Viewer

* Overlay Grad-CAM on image
* Toggle original vs heatmap

---

#### 2. Prediction Panel

* Disease name
* Confidence score
* Probability chart

---

#### 3. Tabular Explanation

* SHAP graph
* Feature importance list

---

### UI:

* Side-by-side comparison
* Interactive charts

---

### Output:

* XAI UI module

---

# 🧩 PHASE 7G — ADVANCED FRONTEND FEATURES (PRO LEVEL 🔥)

### 🎯 Goal:

Make frontend industry-ready

---

### ✅ PROMPT 7G

Add advanced features:

---

### Features:

* Role-based dashboards
* Dark/light mode toggle
* Real-time updates (polling)
* Pagination + search
* Form validation
* Error handling UI
* API retry mechanism

---

### Output:

* Enhanced UX system

---

# 🧱 PHASE 8 — DEPLOYMENT (PRODUCTION READY)

### 🎯 Goal:

Deploy full system for real-world use

---

## ✅ PROMPT 8

Create production deployment setup:

---

### Docker Setup:

* Backend container
* Frontend container
* PostgreSQL container

---

### Nginx:

* Reverse proxy
* Route frontend/backend

---

### CI/CD:

* GitHub Actions
* Auto build & deploy

---

### Security:

* Environment configs
* HTTPS ready
* Secret management

---

### Output:

* docker-compose.yml
* Dockerfiles
* Deployment guide

---

# 🏁 FINAL RESULT

After completing:

✔ Enterprise UI
✔ Full SaaS dashboard
✔ Real hospital-ready system
✔ Production deployment

---



---

## 🌍 Deployment & Real-World Usage

### The Real-World Use Case
*Scenario: Three separate medical institutions (Hospital Alpha, Beta, and Gamma) wish to train an advanced Pneumonia detection AI on Chest X-Rays. However, strict HIPAA regulations prohibit them from sharing patient scans with each other or a central authority.*

1. **Deployment**: FedCare AI Admin hosts the FastAPI Backend and FL Server on AWS. 
2. **Onboarding**: Hospitals deploy the generic FedCare Client Docker container locally behind their own firewalls.
3. **Execution**: The local clients download the current state of the global model from the cloud. They train the PyTorch model entirely on their local network data.
4. **Aggregation**: The cloud server aggregates the weights. The collective Pneumonia model becomes incredibly robust, having learned from varying demographics across all three hospitals, yet patient data stayed 100% physically secure.

### Quick Start Setup
```bash
# Clone the repository
git clone https://github.com/Manvith-kumar16/FedCare-AI.git

# Navigate and build services
cd FedCare-AI
docker-compose up --build -d
```
*(Detailed `Installation` and `Usage` guidelines will be populated upon completion of Phase 12).*

---

## 🧰 Tech Stack

* **Backend:** Python 3.10+, FastAPI, SQLAlchemy (Async), Alembic, Pydantic, PassLib.
* **Frontend:** React 18, Vite, TypeScript, Axios, TailwindCSS.
* **Machine Learning & FL:** PyTorch, XGBoost, Flower (`flwr`), NumPy.
* **Explainability:** captum (Grad-CAM), SHAP.
* **Infrastructure:** Docker, Docker Compose, Nginx, PostgreSQL.

---

<br/>
<div align="center">
  <i>Developed by the Deepmind Advanced Agentic Coding Architecture | Designed for the Future of Healthcare</i>
</div>