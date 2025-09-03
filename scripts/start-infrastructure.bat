@echo off
echo ========================================
echo Starting Infrastructure Services
echo (PostgreSQL + MinIO)
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
echo Starting infrastructure containers...
docker-compose up -d postgres minio mc

echo.
echo Checking container status...
docker-compose ps postgres minio mc

echo.
echo Infrastructure services should be running:
echo - PostgreSQL: port 5432
echo - MinIO API: http://localhost:9000
echo - MinIO Console: http://localhost:9001
echo - Default MinIO credentials: minioadmin / minioadmin
echo Press any key to continue . . .
pause >nul