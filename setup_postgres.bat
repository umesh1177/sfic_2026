@echo off
title Swachh Setu - PostgreSQL Database Setup
setlocal enabledelayedexpansion

echo ======================================================================
echo   SWACHH SETU - POSTGRESQL DATABASE SETUP (SIH PS000089)
echo ======================================================================
echo.

set "PG_BIN=C:\Program Files\PostgreSQL\18\bin"
if not exist "%PG_BIN%\psql.exe" (
    echo [ERROR] PostgreSQL 18 was not found at: %PG_BIN%
    echo Please make sure PostgreSQL is installed.
    pause
    exit /b 1
)

echo PostgreSQL binary detected at: %PG_BIN%
echo.
set /p PGPASS="Enter your PostgreSQL 'postgres' superuser password: "
set "PGPASSWORD=%PGPASS%"

echo.
echo [1/3] Creating database 'my_clean_navsari'...
"%PG_BIN%\psql.exe" -U postgres -h localhost -p 5432 -c "CREATE DATABASE my_clean_navsari;" 2>nul
if %ERRORLEVEL% EQU 0 (
    echo    Database 'my_clean_navsari' created successfully!
) else (
    echo    Database 'my_clean_navsari' already exists or connected.
)

echo.
echo [2/3] Executing schema.sql (Tables, PostGIS Wards, RLS, Indexes)...
"%PG_BIN%\psql.exe" -U postgres -h localhost -p 5432 -d my_clean_navsari -f "%~dp0database\schema.sql"

echo.
echo [3/3] Executing seed.sql (13 Official Wards, Categories, Initial Seed)...
"%PG_BIN%\psql.exe" -U postgres -h localhost -p 5432 -d my_clean_navsari -f "%~dp0database\seed.sql"

echo.
echo [4/4] Updating backend\.env with your database credentials...
(
    echo PORT=5000
    echo NODE_ENV=development
    echo JWT_SECRET=clean_navsari_jwt_super_secret_key_2026
    echo ML_SERVICE_URL=http://localhost:8000
    echo DATABASE_URL=postgresql://postgres:%PGPASS%@localhost:5432/my_clean_navsari
) > "%~dp0backend\.env"

echo.
echo ======================================================================
echo   SETUP COMPLETE!
echo   Your PostgreSQL database 'my_clean_navsari' is now fully configured!
echo   The backend is configured to use live PostgreSQL.
echo ======================================================================
echo.
pause

