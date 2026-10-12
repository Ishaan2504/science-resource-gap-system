@echo off
echo Setting up database...
cd backend
npm run migrate
echo.
echo Database migrations complete!
echo.
pause
