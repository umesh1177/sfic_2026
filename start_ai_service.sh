#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/ml-service"

echo "======================================================================"
echo "  Launching Python PyTorch FastAPI Service for Swachh Setu"
echo "  Port: 8008"
echo "======================================================================"

if [ -f "$SCRIPT_DIR/ml-service/venv/bin/uvicorn" ]; then
  PYTHON_BIN="$SCRIPT_DIR/ml-service/venv/bin/python"
else
  PYTHON_BIN="python3"
fi

exec "$PYTHON_BIN" -m uvicorn main:app --host 127.0.0.1 --port 8008 --reload

