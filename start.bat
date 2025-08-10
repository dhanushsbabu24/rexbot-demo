@echo off
echo ========================================
echo    Alexa AI Receptionist Chatbot
echo ========================================
echo.
echo Starting the chatbot server...
echo.
echo Make sure you have:
echo 1. Node.js installed
echo 2. Dependencies installed (npm install)
echo 3. .env file configured with OpenAI API key
echo.
echo ========================================
echo.

REM Check if node_modules exists
if not exist "node_modules" (
    echo Installing dependencies...
    npm install
    if errorlevel 1 (
        echo Failed to install dependencies!
        pause
        exit /b 1
    )
    echo.
)

REM Check if .env exists
if not exist ".env" (
    echo Warning: .env file not found!
    echo Please copy env.example to .env and add your OpenAI API key
    echo.
    pause
)

echo Starting server on http://localhost:3000
echo Press Ctrl+C to stop the server
echo.
npm start

pause
