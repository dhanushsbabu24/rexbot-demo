@echo off
echo ========================================
echo   RexBot AI Reception System
echo ========================================
echo.
echo Starting the server...
echo.

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

REM Check if dependencies are installed
if not exist "node_modules" (
    echo Installing dependencies...
    npm install
    if %errorlevel% neq 0 (
        echo ERROR: Failed to install dependencies
        pause
        exit /b 1
    )
)

REM Create .env file if it doesn't exist
if not exist ".env" (
    echo Creating .env file from template...
    copy env.example .env >nul
    echo.
    echo IMPORTANT: Please edit .env file and add your Gemini API key
    echo.
)

echo Starting server on http://localhost:3000
echo Press Ctrl+C to stop the server
echo.
npm start
