@echo off
title Swachh Setu - Full Stack Launcher
echo ======================================================================
echo   SWACHH SETU - STARTING ALL SERVICES
echo   Navsari Municipal Corporation Cleanliness Monitoring Platform
echo   1. PostgreSQL Database Server (Port 5433)
echo   2. Python PyTorch AI ML Service (Port 8008)
echo   3. Express Node.js Backend API (Port 5000)
echo   4. React TypeScript Vite Frontend (Port 5173)
echo ======================================================================

echo [1/4] Starting PostgreSQL Database...
if exist "%~dp0database\pgdata\postmaster.pid" (
    del /f /q "%~dp0database\pgdata\postmaster.pid" 2>nul
)
"C:\Program Files\PostgreSQL\18\bin\pg_ctl.exe" -D "%~dp0database\pgdata" -l "%~dp0database\pgdata\server.log" -o "-p 5433" start

echo [2/4] Starting Python PyTorch ML Service...
start "2. Python AI/ML (Port 8008)" cmd /k "cd /d %~dp0ml-service && .\venv\Scripts\python.exe -m uvicorn main:app --host 127.0.0.1 --port 8008"

echo [3/4] Starting Express Backend API...
start "3. Backend API (Port 5000)" cmd /k "cd /d %~dp0backend && npm run dev"

echo [4/4] Starting Frontend Web App...
start "4. Frontend UI (Port 5173)" cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo All 4 services are launching!
echo Open your browser at: http://localhost:5173
echo.
pause 

