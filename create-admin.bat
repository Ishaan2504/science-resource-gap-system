@echo off
echo Creating Admin User...
echo.
cd backend
set ADMIN_EMAIL=admin@example.com
set ADMIN_PASSWORD=Admin123456
set ADMIN_NAME=System Administrator
npm run seed:admin
echo.
echo Admin account created!
echo Email: admin@example.com
echo Password: Admin123456
echo.
pause
