# Restor Scripts

This directory contains utility scripts for managing the Restor application services using Docker Compose.

## Prerequisites

- Docker and Docker Compose must be installed and available in your PATH
- All scripts should be run from the project root directory

## Available Scripts

### Service Management Scripts

#### `start-backend.bat`
Builds and starts the backend service container.
- Checks Docker installation
- Builds and runs the `rector-backend` container
- Displays container status and logs
- Backend runs on port 3000

#### `start-frontend.bat`
Builds and starts the frontend service container.
- Checks Docker installation
- Builds and runs the `rector-frontend` container  
- Displays container status and logs
- Frontend runs on port 3001

#### `start-infrastructure.bat`
Starts the core infrastructure services (PostgreSQL and MinIO).
- Starts both database and object storage services
- Required before starting backend/frontend services

#### `start-postgres.bat`
Starts only the PostgreSQL database service.
- Useful for database-only operations

#### `start-minio.bat`
Starts only the MinIO object storage service.
- Useful for storage-only operations

### Cross-Platform Scripts

#### `start-rector.bat` (Windows)
#### `start-rector.sh` (Linux/macOS)
Comprehensive startup scripts that:
- Start all infrastructure services
- Start backend and frontend services
- Provide detailed status information
- Available for both Windows and Unix-like systems

### Management Scripts

#### `stop-all.bat`
Stops all running Docker Compose services.
- Gracefully shuts down all containers
- Use this to clean up when done development

#### `check-logs.bat`
Displays logs and status for all services.
- Shows container status
- Displays recent logs (last 20 lines) for:
  - PostgreSQL
  - MinIO
  - Backend
  - Frontend

## Usage

1. Navigate to the project root directory
2. Run the desired script:
   ```bash
   # Windows
   scripts\start-backend.bat
   
   # Or for comprehensive startup
   scripts\start-rector.bat
   ```

## Service Ports

- **Backend**: http://localhost:3000
- **Frontend**: http://localhost:3001
- **PostgreSQL**: localhost:5432
- **MinIO**: localhost:9000 (API), localhost:9001 (Console)

## Troubleshooting

- If scripts fail, ensure Docker is running and accessible
- Use `check-logs.bat` to diagnose service issues
- Use `stop-all.bat` to clean up before restarting services