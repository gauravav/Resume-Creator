#!/bin/bash

echo "========================================"
echo "Starting Rector Application Suite"
echo "========================================"

echo ""
echo "Checking Docker installation..."
if ! command -v docker &> /dev/null; then
    echo "ERROR: Docker is not installed or not in PATH!"
    echo "Please install Docker and ensure it's running."
    exit 1
fi

if ! docker info &> /dev/null; then
    echo "ERROR: Docker is not running!"
    echo "Please start Docker Desktop or Docker daemon."
    exit 1
fi

echo "Docker is available!"
echo ""

echo "Stopping any existing containers..."
docker-compose down --remove-orphans

echo ""
echo "Building and starting all services..."
echo "This may take a few minutes on first run..."
echo ""

if docker-compose up -d --build; then
    echo ""
    echo "========================================"
    echo "Rector Application Started Successfully!"
    echo "========================================"
    echo ""
    echo "Services Available:"
    echo "  Frontend:      http://localhost:3001"
    echo "  Backend API:   http://localhost:3000"
    echo "  MinIO Console: http://localhost:9001"
    echo "  PostgreSQL:    localhost:5432"
    echo ""
    echo "MinIO Credentials:"
    echo "  Username: minioadmin"
    echo "  Password: minioadmin123"
    echo ""
    echo "Database Credentials:"
    echo "  Host:     localhost:5432"
    echo "  Database: resume_db"
    echo "  Username: postgres"
    echo "  Password: password"
    echo ""
    echo "To view logs: docker-compose logs -f"
    echo "To stop:      docker-compose down"
    echo "========================================"
    echo ""
    
    # Try to open browser (works on most Linux distributions)
    if command -v xdg-open &> /dev/null; then
        xdg-open http://localhost:3001
    elif command -v open &> /dev/null; then
        open http://localhost:3001
    else
        echo "Please open http://localhost:3001 in your browser"
    fi
else
    echo ""
    echo "ERROR: Failed to start services!"
    echo "Check the Docker logs for more information."
    exit 1
fi