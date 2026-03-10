@echo off
setlocal

cd /d "%~dp0"

call build-single-url.bat
if errorlevel 1 exit /b %errorlevel%

echo.
echo Lanzando backend en una ventana separada...
start "Agora Backend" cmd /k "cd /d ""%~dp0backend"" && start-server.bat"

echo Esperando a que el backend arranque...
timeout /t 4 /nobreak >nul

call start-public-url.bat
