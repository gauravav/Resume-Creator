@echo off
echo ========================================
echo Checking Service Logs
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
echo Container Status:
echo ========================================
docker-compose ps

echo.
echo PostgreSQL Logs:
echo ========================================
docker-compose logs --tail=20 postgres

echo.
echo MinIO Logs:
echo ========================================
docker-compose logs --tail=20 minio

echo.
echo Backend Logs:
echo ========================================
docker-compose logs --tail=20 rector-backend

echo.
echo Frontend Logs:
echo ========================================
docker-compose logs --tail=20 rector-frontend

echo.
echo Press any key to continue . . .
pause >nul