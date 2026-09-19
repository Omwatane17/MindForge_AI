@echo off
setlocal enabledelayedexpansion

title MindForge AI

echo ===================================================
echo              Starting MindForge AI...
echo ===================================================
echo.

:: Automatically detect the project directory
cd /d "%~dp0"

:: If running from root, navigate to frontend folder
if exist "frontend\package.json" (
    cd /d "%~dp0frontend"
) else if exist "MindForge-AI\frontend\package.json" (
    cd /d "%~dp0MindForge-AI\frontend"
)

:: Verify package.json is present in frontend
if not exist "package.json" (
    echo [ERROR] package.json was not found in: %cd%
    echo Please make sure start.bat is in the MindForge-AI project folder.
    echo.
    pause
    exit /b 1
)

:: Check whether Node.js is installed
echo Checking Node.js...
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Node.js is not installed or not added to your system PATH.
    echo Please install Node.js LTS from https://nodejs.org/ and try again.
    echo.
    pause
    exit /b 1
)

:: Check whether node_modules exists
if not exist "node_modules\" (
    echo.
    echo Installing dependencies...
    call npm install
    if %errorlevel% neq 0 (
        echo.
        echo Dependency installation failed. Please check your internet connection and try again.
        echo.
        pause
        exit /b 1
    )
)

:: Start Next.js development server
echo.
echo Starting development server...
echo MindForge AI is running at http://localhost:3000
echo.
call npm run dev

if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Development server encountered an error or stopped unexpectedly.
    pause
    exit /b %errorlevel%
)

endlocal
