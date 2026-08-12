import os
import tempfile
import pandas as pd
import pytest
from app.services.ai_service import train_local_model, train_local_cnn, load_dataframe

def test_load_dataframe():
    """Test that the load_dataframe function can parse a CSV and handle missing values."""
    with tempfile.NamedTemporaryFile(mode='w', suffix='.csv', delete=False) as f:
        f.write("Age,BMI,Outcome\n")
        f.write("25,22.5,0\n")
        f.write("45,,1\n") # Missing BMI
        f.write("35,26.1,0\n")
        f_name = f.name
        
    try:
        df = load_dataframe(f_name, "Outcome")
        assert len(df) == 3
        assert "Age" in df.columns
        assert "BMI" in df.columns
        # Check if missing BMI was imputed
        assert not df["BMI"].isnull().any()
    finally:
        os.remove(f_name)

def test_train_local_model():
    """Test training an XGBoost model on a tiny dummy dataset."""
    # Create a simple synthetic dataset
    data = {
        "Feature1": [1, 2, 1, 2, 5, 6, 5, 6],
        "Feature2": [1, 1, 2, 2, 5, 5, 6, 6],
        "Outcome":  [0, 0, 0, 0, 1, 1, 1, 1]
    }
    df = pd.DataFrame(data)
    
    with tempfile.NamedTemporaryFile(mode='w', suffix='.csv', delete=False) as f:
        df.to_csv(f, index=False)
        f_name = f.name

    try:
        # Train model
        model, metrics = train_local_model(
            file_path=f_name,
            target_column="Outcome",
            hospital_id=1,
            server_id=1,
            model_type="xgboost",
            epochs=10
        )
        
        # Verify metrics exist and are somewhat reasonable
        assert "accuracy" in metrics
        assert "loss" in metrics
        assert "precision" in metrics
        assert "recall" in metrics
        
        # We expect accuracy to be decent on such an easy linearly separable dataset
        assert metrics["accuracy"] >= 0.5
        
        # Verify model object is returned
        assert model is not None
    finally:
        os.remove(f_name)

def test_train_local_cnn():
    """Test training a PyTorch CNN on a tiny dummy image dataset."""
    import zipfile
    import shutil
    
    # We will use the pre-generated dummy_dataset.zip path which extract to dummy_images
    dataset_zip = "/home/manvith/Desktop/Projects/FedCare-AI/dummy_dataset.zip"
    extract_dir = "/home/manvith/Desktop/Projects/FedCare-AI/dummy_dataset"
    if not os.path.exists(dataset_zip):
        pytest.skip("dummy_dataset.zip not found, skipping CNN test.")
        
    try:
        os.makedirs(extract_dir, exist_ok=True)
        with zipfile.ZipFile(dataset_zip, 'r') as zip_ref:
            # We need to flatten it since our script zipped the "dummy_images" folder
            # but datasets.py usually expects images directly or in class folders
            # Let's just use the default extraction and train_local_cnn will use ImageFolder
            zip_ref.extractall(extract_dir)
            
        state_dict, metrics = train_local_cnn(
            file_path=dataset_zip,
            hospital_id=1,
            server_id=1,
            epochs=2
        )
        
        assert "accuracy" in metrics
        assert "loss" in metrics
        assert state_dict is not None
        # Should have layer keys in state_dict
        assert len(state_dict.keys()) > 0
    except Exception as e:
        pytest.fail(f"CNN training failed with exception: {e}")
    finally:
        if os.path.exists(extract_dir):
            shutil.rmtree(extract_dir)
