@echo off
echo =========================================
echo   Starting FedCare AI Hospital Node...
echo =========================================

echo.
echo [1/2] Setting up Python Backend...
cd backend
IF NOT EXIST .venv (
    python -m venv .venv
)
call .venv\Scripts\activate.bat
pip install -r requirements.txt

echo.
echo Starting FastAPI Backend in a new window...
start "FedCare Hospital Backend" cmd /c "call .venv\Scripts\activate.bat && uvicorn app.main:app --port 8001"

echo.
echo [2/2] Setting up React Frontend...
cd ../portal
call npm install

echo.
echo Starting React Frontend in a new window...
start "FedCare Hospital Portal" cmd /c "npm run dev"

echo.
echo =========================================
echo   ✅ Servers are starting!
echo   Backend will run on http://localhost:8001
echo   Frontend will open in your browser shortly.
echo.
echo   Close the two new terminal windows to stop the servers.
echo =========================================
pause
