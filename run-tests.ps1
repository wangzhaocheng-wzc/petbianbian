# Pet Permissions Test Runner (PowerShell)
# Usage: .\run-tests.ps1 [command] [options]

param(
    [string]$Command = "run",
    [string]$Suite = "",
    [switch]$Headed,
    [switch]$Debug,
    [string]$Env = "development",
    [switch]$Help
)

function Show-Help {
    Write-Host @"

Pet Permissions Test Runner

Usage:
  .\run-tests.ps1 [command] [options]

Commands:
  run                Run all pet permission tests (default)
  suite <name>       Run specific test suite
  performance        Run performance tests
  cleanup [type]     Clean up test data
  help               Show help information

Test Suites:
  access             Pet access permission tests
  sharing            Pet sharing functionality tests
  multi-user         Multi-user pet management tests
  privacy            Pet data privacy protection tests
  security           Permission boundary tests

Options:
  -Headed            Run tests in headed mode
  -Debug             Enable debug mode
  -Env <env>         Set test environment (development|staging)
  -Help              Show help information

Examples:
  .\run-tests.ps1
  .\run-tests.ps1 suite access
  .\run-tests.ps1 performance -Headed
  .\run-tests.ps1 cleanup quick

"@ -ForegroundColor Cyan
}

function Test-ProjectDirectory {
    if (-not (Test-Path "frontend\e2e\run-pet-permissions-tests.cjs")) {
        Write-Host "ERROR: Please run this script from the project root directory" -ForegroundColor Red
        Write-Host "Current directory: $(Get-Location)" -ForegroundColor Yellow
        Write-Host "Expected to find: frontend\e2e\run-pet-permissions-tests.cjs" -ForegroundColor Yellow
        exit 1
    }
}

function Build-Options {
    $options = @()
    
    if ($Headed) { $options += "--headed" }
    if ($Debug) { $options += "--debug" }
    if ($Env -ne "development") { $options += "--env", $Env }
    
    return $options -join " "
}

function Invoke-TestCommand {
    param(
        [string]$TestCommand,
        [string]$Options
    )
    
    try {
        Push-Location "frontend"
        
        $fullCommand = "node e2e\run-pet-permissions-tests.cjs $TestCommand $Options"
        Write-Host "Executing: $fullCommand" -ForegroundColor Gray
        
        Invoke-Expression $fullCommand
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "`nOperation completed successfully!" -ForegroundColor Green
        } else {
            Write-Host "`nOperation failed!" -ForegroundColor Red
            exit $LASTEXITCODE
        }
    }
    catch {
        Write-Host "Execution failed: $($_.Exception.Message)" -ForegroundColor Red
        exit 1
    }
    finally {
        Pop-Location
    }
}

function Main {
    Write-Host "Pet Permissions Test Runner`n" -ForegroundColor Cyan
    
    if ($Help) {
        Show-Help
        return
    }
    
    Test-ProjectDirectory
    
    $options = Build-Options
    
    switch ($Command.ToLower()) {
        "run" {
            Write-Host "Running all pet permission tests..." -ForegroundColor Yellow
            Invoke-TestCommand "run" $options
        }
        "suite" {
            if ([string]::IsNullOrEmpty($Suite)) {
                Write-Host "ERROR: Please specify test suite name" -ForegroundColor Red
                Write-Host "Available suites: access, sharing, multi-user, privacy, security" -ForegroundColor Yellow
                exit 1
            }
            Write-Host "Running test suite: $Suite" -ForegroundColor Yellow
            Invoke-TestCommand "suite $Suite" $options
        }
        "performance" {
            Write-Host "Running performance tests..." -ForegroundColor Yellow
            Invoke-TestCommand "performance" $options
        }
        "cleanup" {
            Write-Host "Cleaning up test data..." -ForegroundColor Yellow
            $cleanupType = if ($Suite) { $Suite } else { "full" }
            
            try {
                Push-Location "frontend"
                $cleanupCommand = "node e2e\utils\cleanup-test-data.cjs $cleanupType"
                Write-Host "Executing: $cleanupCommand" -ForegroundColor Gray
                Invoke-Expression $cleanupCommand
            }
            finally {
                Pop-Location
            }
        }
        "help" {
            Show-Help
        }
        default {
            Write-Host "Unknown command: $Command" -ForegroundColor Red
            Show-Help
            exit 1
        }
    }
}

trap {
    Write-Host "Unhandled error occurred: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Main