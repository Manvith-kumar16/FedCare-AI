import os
import shutil
import urllib.request
import numpy as np
from PIL import Image

def create_non_iid_datasets():
    url = "https://zenodo.org/records/10519652/files/pneumoniamnist.npz"
    npz_path = "pneumoniamnist.npz"
    
    if not os.path.exists(npz_path):
        print("Downloading pneumoniamnist.npz from Zenodo...")
        urllib.request.urlretrieve(url, npz_path)
    else:
        print("Dataset already downloaded.")
        
    print("Loading dataset...")
    data = np.load(npz_path)
    images = data['train_images']
    labels = data['train_labels'].squeeze()
    
    normal_indices = np.where(labels == 0)[0]
    pneumonia_indices = np.where(labels == 1)[0]
    
    # Shuffle
    np.random.shuffle(normal_indices)
    np.random.shuffle(pneumonia_indices)
    
    # Subset to 100 each for a fast demo
    normal_indices = normal_indices[:100]
    pneumonia_indices = pneumonia_indices[:100]
    
    print(f"Total Normal: {len(normal_indices)}, Total Pneumonia: {len(pneumonia_indices)}")
    
    n_normal = len(normal_indices)
    n_pneumonia = len(pneumonia_indices)
    
    splits = {
        'client1': {
            'normal': normal_indices[:int(0.8 * n_normal)],
            'pneumonia': pneumonia_indices[:int(0.1 * n_pneumonia)]
        },
        'client2': {
            'normal': normal_indices[int(0.8 * n_normal):int(0.9 * n_normal)],
            'pneumonia': pneumonia_indices[int(0.1 * n_pneumonia):int(0.9 * n_pneumonia)]
        },
        'client3': {
            'normal': normal_indices[int(0.9 * n_normal):],
            'pneumonia': pneumonia_indices[int(0.9 * n_pneumonia):]
        }
    }
    
    output_dir = 'pneumonia_datasets'
    os.makedirs(output_dir, exist_ok=True)
    
    label_names = {0: 'NORMAL', 1: 'PNEUMONIA'}
    
    for client_name, indices_dict in splits.items():
        client_dir = os.path.join(output_dir, client_name)
        
        for cls_name in label_names.values():
            os.makedirs(os.path.join(client_dir, cls_name), exist_ok=True)
            
        print(f"Generating {client_name}...")
        
        for cls_idx, (cls_key, indices) in enumerate([('normal', indices_dict['normal']), ('pneumonia', indices_dict['pneumonia'])]):
            cls_name = label_names[cls_idx]
            for idx in indices:
                img_arr = images[idx]
                img = Image.fromarray(img_arr)
                img.save(os.path.join(client_dir, cls_name, f"img_{idx}.jpg"))
                
        shutil.make_archive(client_dir, 'zip', client_dir)
        print(f"Created {client_dir}.zip")

    print("All done!")

if __name__ == "__main__":
    create_non_iid_datasets()
