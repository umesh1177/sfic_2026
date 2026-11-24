#!/bin/bash
echo "======================================================================"
echo "  Launching Python EfficientNet AI/ML Microservice for Swachh Setu"
echo "  Port: 8008"
echo "======================================================================"
cd "$(dirname "$0")/ml-service"
./venv/bin/python -m uvicorn main:app --host 127.0.0.1 --port 8008 --reload
