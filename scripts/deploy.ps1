# Pet Health Platform Deployment Script for PowerShell

param(
    [Parameter(Position=0)]
    [ValidateSet("development", "production", "stop", "clean", "logs", "help")]
    [string]$Command = "development"
)

# Colors for output
$Red = [System.ConsoleColor]::Red
$Green = [System.ConsoleColor]::Green
$Yellow = [System.ConsoleColor]::Yellow
$White = [System.ConsoleColor]::White

function Write-ColorOutput {
    param(
        [string]$Message,
        [System.ConsoleColor]$Color = $White
    )
    Write-Host $Message -ForegroundColor $Color
}

function Test-Requirements {
    Write-ColorOutput "📋 Checking requirements..." $Yellow
    
    try {
        docker --version | Out-Null
    }
    catch {
        Write-ColorOutput "❌ Docker is not installed" $Red
        exit 1
    }
    
    try {
        docker-compose --version | Out-Null
    }
    catch {
        Write-ColorOutput "❌ Docker Compose is not installed" $Red
        exit 1
    }
    
    Write-ColorOutput "✅ All requirements satisfied" $Green
}

function Initialize-Environment {
    Write-ColorOutput "🔧 Setting up environment..." $Yellow
    
    # Create .env file if it doesn't exist
    if (-not (Test-Path ".env")) {
        Write-ColorOutput "📝 Creating .env file from template..." $Yellow
        Copy-Item ".env.example" ".env"
        Write-ColorOutput "⚠️  Please update .env file with your configuration" $Yellow
    }
    
    # Create necessary directories
    $directories = @("backend\uploads", "backend\logs", "docker\ssl")
    foreach ($dir in $directories) {
        if (-not (Test-Path $dir)) {
            New-Item -ItemType Directory -Path $dir -Force | Out-Null
        }
    }
    
    Write-ColorOutput "✅ Environment setup complete" $Green
}

function Build-Images {
    param([string]$Environment)
    
    Write-ColorOutput "🏗️  Building Docker images..." $Yellow
    
    $composeFile = switch ($Environment) {
        "development" { "docker-compose.dev.yml" }
        "production" { "docker-compose.yml", "docker-compose.prod.yml" }
        default { "docker-compose.yml" }
    }
    
    $composeArgs = @("-f") + $composeFile + @("build", "--no-cache")
    
    try {
        & docker-compose @composeArgs
        Write-ColorOutput "✅ Images built successfully" $Green
    }
    catch {
        Write-ColorOutput "❌ Failed to build images" $Red
        exit 1
    }
}

function Start-Services {
    param([string]$Environment)
    
    Write-ColorOutput "🚀 Starting services..." $Yellow
    
    $composeFile = switch ($Environment) {
        "development" { "docker-compose.dev.yml" }
        "production" { "docker-compose.yml", "docker-compose.prod.yml" }
        default { "docker-compose.yml" }
    }
    
    $composeArgs = @("-f") + $composeFile + @("up", "-d")
    
    try {
        & docker-compose @composeArgs
    }
    catch {
        Write-ColorOutput "❌ Failed to start services" $Red
        exit 1
    }
    
    Write-ColorOutput "⏳ Waiting for services to be ready..." $Yellow
    Start-Sleep -Seconds 30
    
    # Health check
    try {
        $response = Invoke-WebRequest -Uri "http://localhost/health" -UseBasicParsing -TimeoutSec 10
        if ($response.StatusCode -eq 200) {
            Write-ColorOutput "✅ Services are running and healthy" $Green
        }
        else {
            throw "Health check failed"
        }
    }
    catch {
        Write-ColorOutput "❌ Health check failed" $Red
        & docker-compose -f $composeFile logs
        exit 1
    }
}

function Show-DeploymentInfo {
    param([string]$Environment)
    
    Write-ColorOutput "🎉 Deployment completed successfully!" $Green
    Write-ColorOutput "📊 Service Information:" $Yellow
    Write-Host "Frontend: http://localhost:3000"
    Write-Host "Backend API: http://localhost:5000/api"
    Write-Host "MongoDB: localhost:27017"
    Write-Host "Redis: localhost:6379"
    Write-Host ""
    Write-ColorOutput "📝 Useful commands:" $Yellow
    
    $composeFile = switch ($Environment) {
        "development" { "docker-compose.dev.yml" }
        "production" { "docker-compose.yml -f docker-compose.prod.yml" }
        default { "docker-compose.yml" }
    }
    
    Write-Host "View logs: docker-compose -f $composeFile logs -f"
    Write-Host "Stop services: docker-compose -f $composeFile down"
    Write-Host "Restart services: docker-compose -f $composeFile restart"
}

function Stop-Services {
    Write-ColorOutput "🛑 Stopping services..." $Yellow
    & docker-compose down
    Write-ColorOutput "✅ Services stopped" $Green
}

function Clean-Environment {
    Write-ColorOutput "🧹 Cleaning up..." $Yellow
    & docker-compose down -v --remove-orphans
    & docker system prune -f
    Write-ColorOutput "✅ Cleanup complete" $Green
}

function Show-Logs {
    & docker-compose logs -f
}

function Show-Help {
    Write-Host "Pet Health Platform Deployment Script"
    Write-Host ""
    Write-Host "Usage: .\deploy.ps1 [command]"
    Write-Host ""
    Write-Host "Commands:"
    Write-Host "  development  - Deploy in development mode"
    Write-Host "  production   - Deploy in production mode"
    Write-Host "  stop         - Stop all services"
    Write-Host "  clean        - Stop services and clean up"
    Write-Host "  logs         - Show service logs"
    Write-Host "  help         - Show this help message"
}

# Main execution
switch ($Command) {
    "development" {
        Write-ColorOutput "🐾 Pet Health Platform Deployment" $Green
        Write-Host "Environment: Development"
        Write-Host ""
        
        Test-Requirements
        Initialize-Environment
        Build-Images -Environment "development"
        Start-Services -Environment "development"
        Show-DeploymentInfo -Environment "development"
    }
    "production" {
        Write-ColorOutput "🐾 Pet Health Platform Deployment" $Green
        Write-Host "Environment: Production"
        Write-Host ""
        
        Test-Requirements
        Initialize-Environment
        Build-Images -Environment "production"
        Start-Services -Environment "production"
        Show-DeploymentInfo -Environment "production"
    }
    "stop" {
        Stop-Services
    }
    "clean" {
        Clean-Environment
    }
    "logs" {
        Show-Logs
    }
    "help" {
        Show-Help
    }
}