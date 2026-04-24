# FedCare AI Architecture

## Overview
FedCare AI uses a Hub-and-Spoke architecture for Federated Learning.

- **Hub**: The Central Server (FastAPI) which manages training rounds, aggregates weights, and provides the global model.
- **Spokes**: Hospital Nodes (Clients) which hold private data and perform local training.

## Data Flow
1. **Model Initialization**: Central server initializes global model weights.
2. **Distribution**: Global weights are sent to participating hospital nodes.
3. **Local Training**: Each hospital trains the model on its private dataset (CSV/TXT).
4. **Aggregation**: Hospitals send only the trained weights back to the central server.
5. **Update**: Central server aggregates weights (FedAvg) to produce a new global model.
6. **Iteration**: Steps 2-5 are repeated for multiple rounds.

## Security & Privacy
- **No Data Sharing**: Raw patient records never leave the hospital's local environment.
- **JWT Auth**: All API requests are secured with JSON Web Tokens.
- **Isolation**: Multi-tenant isolation ensures hospitals only see their own local data.

## XAI Integration
The platform uses:
- **SHAP**: For feature importance and local decision explanation in tabular data.
- **Grad-CAM**: For visual heatmaps in medical imaging (CNN models).
