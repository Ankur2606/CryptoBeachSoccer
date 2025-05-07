@echo off
echo ===================================================
echo Cleaning up Crypto Beach Soccer project
echo ===================================================
echo.

echo === Removing client build files ===
if exist client\dist rmdir /s /q client\dist
if exist client\.vite rmdir /s /q client\.vite
if exist client\node_modules\.vite rmdir /s /q client\node_modules\.vite
echo Client build files removed.
echo.

echo === Removing server build files ===
if exist dist rmdir /s /q dist
echo Server build files removed.
echo.

echo === Cleaning npm cache ===
call npm cache clean --force
echo NPM cache cleaned.
echo.

echo === Cleaning node_modules (optional) ===
echo Do you want to remove node_modules folders and reinstall? This will take longer. (Y/N)
set /p clean_modules=
if /i "%clean_modules%"=="Y" (
    echo Removing root node_modules...
    if exist node_modules rmdir /s /q node_modules
    
    echo Removing client node_modules...
    if exist client\node_modules rmdir /s /q client\node_modules
    
    echo Reinstalling packages...
    call npm install
    cd client
    call npm install
    cd ..
    echo Packages reinstalled.
) else (
    echo Skipping node_modules cleanup.
)
echo.

echo === Cleaning browser cache instructions ===
echo Remember to also clear your browser cache:
echo 1. Chrome: Press Ctrl+Shift+Del, check "Cached images and files", click "Clear data"
echo 2. Firefox: Press Ctrl+Shift+Del, check "Cache", click "Clear Now"
echo 3. Edge: Press Ctrl+Shift+Del, check "Cached images and files", click "Clear Now"
echo.

echo Cleanup complete! Now you can run test-deployment.bat for a fresh test.
pause