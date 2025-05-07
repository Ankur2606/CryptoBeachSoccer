@echo off
echo ===================================================
echo Simple Deployment Test for Crypto Beach Soccer
echo ===================================================
echo.

echo === Building client application ===
cd client
call npm run build
if %ERRORLEVEL% NEQ 0 (
    echo Client build failed! Please check the errors above.
    cd ..
    pause
    exit /b 1
)
echo Client built successfully.
echo.
cd ..

echo === Preparing server for production test ===
echo The server will run in production mode using your development code
echo This will simulate a production environment but skip complex bundling
echo.

echo === Starting production test server ===
echo Once the server starts, visit http://localhost:5000/deployment-check
echo.
set NODE_ENV=production
call npx tsx server/index.ts

echo Test complete
pause