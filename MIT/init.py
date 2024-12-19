import os, sys
import subprocess
from urllib.request import urlretrieve
import zipfile

os.chdir(os.path.dirname(os.path.realpath(__file__)))

if not os.path.exists('manga-image-translator'):
    # urlretrieve('https://github.com/zyddnys/manga-image-translator/archive/refs/heads/main.zip', 'manga-image-translator.zip')
    if not os.path.exists('manga-image-translator.zip'):
        urlretrieve('https://github.com/zyddnys/manga-image-translator/archive/e88115a302e69b6a1692b01a8f8d5dd9f2f00da8.zip', 'manga-image-translator.zip')
    with zipfile.ZipFile('manga-image-translator.zip', 'r') as file:
        with zipfile.ZipFile('manga-image-translator.zip', 'r') as file:
            for info in file.infolist():
                target_name = 'manga-image-translator/' + '/'.join(info.filename.split('/')[1:])
                os.makedirs(os.path.dirname(target_name), exist_ok=True)
                if not info.is_dir():
                    with file.open(info, 'r') as source:
                        with open(target_name, 'wb') as target:
                            while chunk := source.read(1024):
                                target.write(chunk)
    
try:
    import torch
except:
    subprocess.run([sys.executable, "-m", "pip", "install", *(r'torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121'.split(' '))], check=True)

subprocess.run([sys.executable, "-m", "pip", "install", *(r'-r manga-image-translator/requirements.txt'.split(' '))], check=True)
subprocess.run([sys.executable, "-m", "pip", "install", *(r'flask[async]'.split(' '))], check=True)
urlretrieve('https://odfmimo.github.io/MIT/index.html', 'index.html')
urlretrieve('https://odfmimo.github.io/MIT/run.py', 'run.py')
