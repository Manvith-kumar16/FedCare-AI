#!/bin/bash

echo "📦 Packaging Hospital Node into hospital_node_dist.zip..."

# Make sure run scripts are executable
chmod +x hospital/run_hospital.sh

# Zip the hospital directory, excluding heavy dependency folders and cache
zip -r hospital_node_dist.zip hospital \
    -x "hospital/backend/.venv/*" \
    -x "hospital/backend/__pycache__/*" \
    -x "hospital/backend/.pytest_cache/*" \
    -x "hospital/portal/node_modules/*" \
    -x "hospital/portal/dist/*" \
    -x "hospital/backend/hospital.db" \
    -x "*/.DS_Store"

echo "✅ Packaging complete! You can now share 'hospital_node_dist.zip' with other hospitals."
