import os, sys
import subprocess
from urllib.request import urlretrieve
import zipfile

os.chdir(os.path.dirname(os.path.realpath(__file__)))

if not os.path.exists('manga-image-translator-main'):
    urlretrieve('https://github.com/zyddnys/manga-image-translator/archive/refs/heads/main.zip', 'manga-image-translator-main.zip')
    with zipfile.ZipFile('manga-image-translator-main.zip', 'r') as file:
        file.extractall('.')
try:
    import torch
except:
    subprocess.run([sys.executable, "-m", "pip", "install", *(r'torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121'.split(' '))], check=True)

subprocess.run([sys.executable, "-m", "pip", "install", *(r'-r manga-image-translator-main/requirements.txt'.split(' '))], check=True)
subprocess.run([sys.executable, "-m", "pip", "install", *(r'flask[async]'.split(' '))], check=True)
urlretrieve('https://odfmimo.github.io/MIT/index.html', 'index.html')
urlretrieve('https://odfmimo.github.io/MIT/run.py', 'run.py')
