import os, sys
import subprocess
from urllib.request import urlretrieve
import zipfile

os.chdir(os.path.dirname(os.path.realpath(__file__)))

if not os.path.exists('manga-image-translator-main'):
    urlretrieve('https://github.com/zyddnys/manga-image-translator/archive/refs/heads/main.zip', 'manga-image-translator-main.zip')
    with zipfile.ZipFile('manga-image-translator-main.zip', 'r') as file:
        file.extractall('.')
    subprocess.run(["pip", "install", *(r'torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121'.split(' '))])
    subprocess.run(["pip", "install", *(r'-r manga-image-translator-main/requirements.txt'.split(' '))])
    subprocess.run(["pip", "install", *(r'flask[async]'.split(' '))])
    urlretrieve('https://odfmimo.github.io/MIT/index.html', 'index.html')
    urlretrieve('https://odfmimo.github.io/MIT/run.py', 'run.py')