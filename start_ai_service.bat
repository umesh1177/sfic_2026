@echo off
title Swachh Setu - Python AI/ML Service (Port 8008)
echo ======================================================================
echo   Launching Python PyTorch FastAPI Service for Swachh Setu
echo   Port: 8008
echo ======================================================================
cd /d "%~dp0ml-service"
.\venv\Scripts\python.exe -m uvicorn main:app --host 127.0.0.1 --port 8008 --reload
pause

