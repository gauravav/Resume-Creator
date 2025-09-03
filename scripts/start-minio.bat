@echo off
echo ========================================
echo Starting MinIO Object Storage
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
echo Starting MinIO containers...
docker-compose up -d minio mc

echo.
echo Checking container status...
docker-compose ps minio mc

echo.
echo MinIO should be running on:
echo - API: http://localhost:9000
echo - Console: http://localhost:9001
echo - Default credentials: minioadmin / minioadmin
echo Press any key to continue . . .
pause >nul