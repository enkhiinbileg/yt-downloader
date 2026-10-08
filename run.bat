@echo off
cd /d "%~dp0"
if not exist ".venv\Scripts\python.exe" (
    echo Anh udaa: orchin beltgej baina...
    python -m venv .venv
    .venv\Scripts\pip.exe install -r requirements.txt
)
start "" ".venv\Scripts\pythonw.exe" main.py
