@echo off
echo ========================================
echo Starting Frontend Service
echo ========================================

echo Checking Docker installation...
docker --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Docker is not installed or not in PATH
    pause
    exit /b 1
)
echo Docker is available!

echo.
echo Building and starting frontend container...
echo This may take a few minutes on first run...
docker-compose up -d --build rector-frontend

echo.
echo Checking container status...
docker-compose ps rector-frontend

echo.
echo Checking frontend logs...
echo ========================================
docker-compose logs rector-frontend

echo.
echo Frontend should be running on port 3001
echo Press any key to continue . . .
pause >nul