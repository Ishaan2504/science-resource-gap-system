@echo off
echo Starting Science Resource Gap System...
echo.
cd /d "%~dp0"
echo Starting Backend Server...
start "Backend Server" cmd /k "cd /d \"%~dp0backend\" && npm run dev"
timeout /t 2 /nobreak >nul
echo Starting Frontend Server...
start "Frontend Server" cmd /k "cd /d \"%~dp0frontend\" && npm run dev"
echo.
echo Both servers are starting in separate windows!
echo Backend:  http://localhost:3000
echo Frontend: http://localhost:5173
echo.
echo To run both together in a single terminal instead, run: npm run dev
echo.
pause
