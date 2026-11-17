#!/usr/bin/env bash
set -e

# ==============================================================================
# SWACHH SETU - FULL STACK LAUNCHER (macOS / Linux)
# Navsari Municipal Corporation Cleanliness Monitoring Platform
# Smart India Hackathon: PS000089
# ==============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "======================================================================"
echo "  🌿 SWACHH SETU - STARTING SERVICES ON MACOS"
echo "  Navsari Municipal Corporation Cleanliness Monitoring Platform"
echo "  1. Python PyTorch AI/ML Service  -> http://127.0.0.1:8008"
echo "  2. Node.js Express Backend API   -> http://localhost:5001"
echo "  3. React Vite Frontend           -> http://localhost:5173"
echo "======================================================================"

# Function to clean up background processes on exit
cleanup() {
  echo ""
  echo "Shutting down Swachh Setu services..."
  if [ -n "$ML_PID" ] && kill -0 "$ML_PID" 2>/dev/null; then
    kill "$ML_PID" 2>/dev/null || true
  fi
  if [ -n "$BACKEND_PID" ] && kill -0 "$BACKEND_PID" 2>/dev/null; then
    kill "$BACKEND_PID" 2>/dev/null || true
  fi
  if [ -n "$FRONTEND_PID" ] && kill -0 "$FRONTEND_PID" 2>/dev/null; then
    kill "$FRONTEND_PID" 2>/dev/null || true
  fi
  echo "All services stopped."
  exit 0
}

trap cleanup INT TERM EXIT

# Helper to kill any process currently hogging our target ports
kill_port() {
  local port=$1
  local pids
  pids=$(lsof -ti :"$port" 2>/dev/null || true)
  if [ -n "$pids" ]; then
    echo "  [INFO] Clearing existing process on port $port (PID: $pids)..."
    kill -9 $pids 2>/dev/null || true
  fi
}

kill_port 8008
kill_port 5001
kill_port 5173

# 1. Start Python AI / ML Service (Port 8008)
echo ""
echo "[1/3] Starting Python PyTorch AI/ML Microservice..."
if [ -f "$SCRIPT_DIR/ml-service/venv/bin/uvicorn" ]; then
  PYTHON_BIN="$SCRIPT_DIR/ml-service/venv/bin/python"
else
  PYTHON_BIN="python3"
fi

(cd "$SCRIPT_DIR/ml-service" && "$PYTHON_BIN" -m uvicorn main:app --host 127.0.0.1 --port 8008) &
ML_PID=$!

# 2. Start Express Backend API (Port 5001)
echo "[2/3] Starting Express Backend API (Port 5001)..."
(cd "$SCRIPT_DIR/backend" && npm run dev) &
BACKEND_PID=$!

# 3. Start React Frontend (Port 5173)
echo "[3/3] Starting React Vite Frontend (Port 5173)..."
(cd "$SCRIPT_DIR/frontend" && npm run dev) &
FRONTEND_PID=$!

echo ""
echo "======================================================================"
echo "  🎉 ALL SERVICES ARE RUNNING!"
echo "======================================================================"
echo "  🖥️  Frontend Web App:   http://localhost:5173"
echo "  ⚙️  Backend API:        http://localhost:5001/api"
echo "  🩺 Healthcheck:         http://localhost:5001/api/health"
echo "  🧠 AI/ML Engine:        http://127.0.0.1:8008"
echo "======================================================================"
echo "  Demo Credentials:"
echo "    - Citizen:          +919876543210 (Password: Admin@123)"
echo "    - Municipal Admin:  +919825199999 (Password: Admin@123)"
echo "    - Ward Officer:     +919825130001 (Password: Admin@123)"
echo "    - Worker:           +919825120001 (Password: Worker@123)"
echo "======================================================================"
echo "  Press Ctrl+C to stop all services."
echo ""

# Wait on all child processes
wait

