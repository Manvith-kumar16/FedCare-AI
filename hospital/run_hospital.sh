#!/bin/bash
# Change to the directory where the script is located
cd "$(dirname "$0")" || exit

echo "🚀 Starting FedCare AI Hospital Node..."

# Check if Python is installed
if ! command -v python3 &> /dev/null
then
    echo "❌ Python3 could not be found. Please install Python 3.10+."
    exit 1
fi

# Check if Node is installed
if ! command -v npm &> /dev/null
then
    echo "❌ npm could not be found. Please install Node.js."
    exit 1
fi

echo "📦 Setting up Python Backend..."
cd backend || exit
if [ ! -d ".venv" ]; then
    python3 -m venv .venv
fi
source .venv/bin/activate
pip install -r requirements.txt

# Start backend in the background
echo "🟢 Starting FastAPI Backend on port 8001..."
uvicorn app.main:app --port 8001 &
BACKEND_PID=$!

echo "📦 Setting up React Frontend..."
cd ../portal || exit
npm install

# Start frontend
echo "🟢 Starting React Frontend..."
npm run dev &
FRONTEND_PID=$!

echo "========================================="
echo "✅ FedCare AI Hospital Node is running!"
echo "   Backend: http://localhost:8001"
echo "   Frontend: (Check terminal for Vite port, usually http://localhost:5174)"
echo "========================================="
echo "Press CTRL+C to stop both servers."

# Wait for user interrupt
trap "echo '🛑 Stopping servers...'; kill $BACKEND_PID; kill $FRONTEND_PID; exit" INT
wait
