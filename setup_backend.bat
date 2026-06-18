@echo off
REM ================================
REM Setup and launch the UPSC Clipper backend
REM ================================
cd /d "%~dp0backend"

REM Create virtual environment
python -m venv venv

REM Activate venv
call venv\Scripts\activate

REM Install dependencies
pip install --upgrade pip
pip install -r requirements.txt

REM Copy .env.example to .env (edit as needed)
if not exist ".env" (
    copy .env.example .env
    echo .env created. Please edit it with your configuration.
)

REM Launch the FastAPI server
uvicorn main:app --reload --port 8000