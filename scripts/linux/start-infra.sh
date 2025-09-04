#!/bin/bash

echo "========================================"
echo "Starting Infrastructure Services"
echo "(PostgreSQL + MinIO)"
echo "========================================"

echo "Checking Docker installation..."
if ! command -v docker &> /dev/null; then
    echo "ERROR: Docker is not installed or not in PATH"
    exit 1
fi

echo "Docker is available!"

echo
echo "Starting infrastructure containers..."
docker compose up -d postgres minio mc

echo
echo "Checking container status..."
docker compose ps postgres minio mc

echo
echo "Infrastructure services should be running:"
echo "- PostgreSQL: port 5432"
echo "- MinIO API: http://localhost:9000"
echo "- MinIO Console: http://localhost:9001"
echo "- Default MinIO credentials: minioadmin / minioadmin"
read -p "Press Enter to continue..."
