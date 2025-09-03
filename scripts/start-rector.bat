@echo off
echo ========================================
echo Starting Rector Application Suite
echo ========================================

echo.
echo Checking Docker installation...
docker --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Docker is not installed or not running!
    echo Please install Docker Desktop and ensure it's running.
    pause
    exit /b 1
)

echo Docker is available!
echo.

echo Stopping any existing containers...
docker-compose down --remove-orphans

echo.
echo Building and starting all services...
echo This may take a few minutes on first run...
echo.

docker-compose up -d --build

if %errorlevel% neq 0 (
    echo.
    echo ERROR: Failed to start services!
    echo Check the Docker logs for more information.
    pause
    exit /b 1
)

echo.
echo ========================================
echo Rector Application Started Successfully!
echo ========================================
echo.
echo Services Available:
echo   Frontend:      http://localhost:3001
echo   Backend API:   http://localhost:3000
echo   MinIO Console: http://localhost:9001
echo   PostgreSQL:    localhost:5432
echo.
echo MinIO Credentials:
echo   Username: minioadmin
echo   Password: minioadmin123
echo.
echo Database Credentials:
echo   Host:     localhost:5432
echo   Database: resume_db
echo   Username: postgres
echo   Password: password
echo.
echo To view logs: docker-compose logs -f
echo To stop:      docker-compose down
echo ========================================
echo.

timeout /t 3 >nul
start http://localhost:3001

pause