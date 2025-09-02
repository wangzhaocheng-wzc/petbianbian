@echo off
REM Pet Permissions Test Runner (Windows Batch)
REM Usage: run-tests.bat [command] [options]

setlocal enabledelayedexpansion

REM Check if we're in the correct directory
if not exist "frontend\e2e\run-pet-permissions-tests.cjs" (
    echo ERROR: Please run this script from the project root directory
    echo Current directory: %CD%
    echo Expected to find: frontend\e2e\run-pet-permissions-tests.cjs
    pause
    exit /b 1
)

REM Parse command line arguments
set "COMMAND=%1"
set "SUITE=%2"
set "OPTIONS=%3 %4 %5 %6 %7 %8 %9"

REM Default command is 'run'
if "%COMMAND%"=="" set "COMMAND=run"

echo Pet Permissions Test Runner
echo.

REM Execute based on command
if "%COMMAND%"=="run" (
    echo Running all pet permission tests...
    cd frontend
    node e2e\run-pet-permissions-tests.cjs %OPTIONS%
    cd ..
) else if "%COMMAND%"=="suite" (
    if "%SUITE%"=="" (
        echo ERROR: Please specify test suite name
        echo Available suites: access, sharing, multi-user, privacy, security
        pause
        exit /b 1
    )
    echo Running test suite: %SUITE%
    cd frontend
    node e2e\run-pet-permissions-tests.cjs suite %SUITE% %OPTIONS%
    cd ..
) else if "%COMMAND%"=="performance" (
    echo Running performance tests...
    cd frontend
    node e2e\run-pet-permissions-tests.cjs performance %OPTIONS%
    cd ..
) else if "%COMMAND%"=="cleanup" (
    echo Cleaning up test data...
    cd frontend
    node e2e\utils\cleanup-test-data.cjs %SUITE%
    cd ..
) else if "%COMMAND%"=="help" (
    goto :show_help
) else (
    echo Unknown command: %COMMAND%
    goto :show_help
)

echo.
echo Operation completed!
pause
exit /b 0

:show_help
echo.
echo Pet Permissions Test Runner
echo.
echo Usage:
echo   run-tests.bat [command] [options]
echo.
echo Commands:
echo   run                Run all pet permission tests (default)
echo   suite ^<name^>       Run specific test suite
echo   performance        Run performance tests
echo   cleanup [type]     Clean up test data
echo   help               Show help information
echo.
echo Test Suites:
echo   access             Pet access permission tests
echo   sharing            Pet sharing functionality tests
echo   multi-user         Multi-user pet management tests
echo   privacy            Pet data privacy protection tests
echo   security           Permission boundary tests
echo.
echo Examples:
echo   run-tests.bat
echo   run-tests.bat suite access
echo   run-tests.bat performance --headed
echo   run-tests.bat cleanup quick
echo.
pause
exit /b 0