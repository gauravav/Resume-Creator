@echo off
echo ========================================
echo Stopping All Services
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
echo Stopping all containers...
docker-compose down

echo.
echo All services stopped!
echo Press any key to continue . . .
pause >nul