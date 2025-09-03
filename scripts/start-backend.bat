@echo off
echo ========================================
echo Starting Backend Service
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
echo Building and starting backend container...
echo This may take a few minutes on first run...
docker-compose up -d --build rector-backend

echo.
echo Checking container status...
docker-compose ps rector-backend

echo.
echo Checking backend logs...
echo ========================================
docker-compose logs rector-backend

echo.
echo Backend should be running on port 3000
echo Press any key to continue . . .
pause >nul