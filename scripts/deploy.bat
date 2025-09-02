@echo off
REM Pet Health Platform Deployment Script for Windows

setlocal enabledelayedexpansion

set ENVIRONMENT=%1
if "%ENVIRONMENT%"=="" set ENVIRONMENT=development

echo 🚀 Starting deployment for %ENVIRONMENT% environment

REM Check if Docker is installed
docker --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Docker is not installed
    exit /b 1
)

REM Check if Docker Compose is installed
docker-compose --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Docker Compose is not installed
    exit /b 1
)

echo ✅ All requirements satisfied

REM Setup environment
echo 🔧 Setting up environment...

if not exist .env (
    echo 📝 Creating .env file from template...
    copy .env.example .env
    echo ⚠️  Please update .env file with your configuration
)

REM Create necessary directories
if not exist backend\uploads mkdir backend\uploads
if not exist backend\logs mkdir backend\logs
if not exist docker\ssl mkdir docker\ssl

echo ✅ Environment setup complete

REM Set compose file based on environment
set COMPOSE_FILE=docker-compose.yml
if "%ENVIRONMENT%"=="development" set COMPOSE_FILE=docker-compose.dev.yml
if "%ENVIRONMENT%"=="production" set COMPOSE_FILE=docker-compose.yml -f docker-compose.prod.yml

REM Build images
echo 🏗️  Building Docker images...
docker-compose -f %COMPOSE_FILE% build --no-cache
if errorlevel 1 (
    echo ❌ Failed to build images
    exit /b 1
)
echo ✅ Images built successfully

REM Start services
echo 🚀 Starting services...
docker-compose -f %COMPOSE_FILE% up -d
if errorlevel 1 (
    echo ❌ Failed to start services
    exit /b 1
)

echo ⏳ Waiting for services to be ready...
timeout /t 30 /nobreak >nul

REM Health check
curl -f http://localhost/health >nul 2>&1
if errorlevel 1 (
    echo ❌ Health check failed
    docker-compose -f %COMPOSE_FILE% logs
    exit /b 1
)

echo ✅ Services are running and healthy

REM Show deployment info
echo 🎉 Deployment completed successfully!
echo 📊 Service Information:
echo Frontend: http://localhost:3000
echo Backend API: http://localhost:5000/api
echo MongoDB: localhost:27017
echo Redis: localhost:6379
echo.
echo 📝 Useful commands:
echo View logs: docker-compose -f %COMPOSE_FILE% logs -f
echo Stop services: docker-compose -f %COMPOSE_FILE% down
echo Restart services: docker-compose -f %COMPOSE_FILE% restart

goto :eof

:stop
echo 🛑 Stopping services...
docker-compose down
echo ✅ Services stopped
goto :eof

:clean
echo 🧹 Cleaning up...
docker-compose down -v --remove-orphans
docker system prune -f
echo ✅ Cleanup complete
goto :eof

:logs
docker-compose logs -f
goto :eof

:help
echo Usage: %0 {development^|production^|stop^|clean^|logs}
echo.
echo Commands:
echo   development  - Deploy in development mode
echo   production   - Deploy in production mode
echo   stop         - Stop all services
echo   clean        - Stop services and clean up
echo   logs         - Show service logs
goto :eof