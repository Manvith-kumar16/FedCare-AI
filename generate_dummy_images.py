import os
from PIL import Image
import zipfile

def create_image(color, path):
    img = Image.new('RGB', (224, 224), color=color)
    img.save(path)

def generate_dataset():
    os.makedirs('dummy_images/class_a', exist_ok=True)
    os.makedirs('dummy_images/class_b', exist_ok=True)

    # Class A: Red images
    for i in range(10):
        create_image((255, 0, 0), f'dummy_images/class_a/img_{i}.png')
        
    # Class B: Blue images
    for i in range(10):
        create_image((0, 0, 255), f'dummy_images/class_b/img_{i}.png')

    with zipfile.ZipFile('dummy_dataset.zip', 'w') as zipf:
        for root, _, files in os.walk('dummy_images'):
            for file in files:
                file_path = os.path.join(root, file)
                arcname = os.path.relpath(file_path, 'dummy_images')
                zipf.write(file_path, arcname)
                
    print("Created dummy_dataset.zip successfully.")

if __name__ == "__main__":
    generate_dataset()
