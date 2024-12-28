@echo off

python -m venv .venv
mkdir manga-image-translator
curl -o "manga-image-translator/init.py" "https://odfmimo.github.io/MIT/init.py"
.venv\Scripts\python "manga-image-translator/init.py"
start .venv\Scripts\python "manga-image-translator/run.py"

:loop
netstat -ano | find "LISTENING" | find ":5000 " > NUL
if %errorlevel% neq 0 (
    timeout /t 1 /nobreak > NUL
    goto :loop
)

start http://localhost:5000