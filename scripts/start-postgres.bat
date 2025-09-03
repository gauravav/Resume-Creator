@echo off
echo ========================================
echo Starting PostgreSQL Database
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
echo Starting PostgreSQL container...
docker-compose up -d postgres

echo.
echo Checking container status...
docker-compose ps postgres

echo.
echo PostgreSQL should be running on port 5432
echo Press any key to continue . . .
pause >nul