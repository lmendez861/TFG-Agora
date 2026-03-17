@echo off
setlocal

cd /d "%~dp0"

call "%~dp0duckdns-config.local.bat"
if errorlevel 1 exit /b %errorlevel%

set "DUCKDNS_HOST=%DUCKDNS_DOMAIN:.duckdns.org=%"
set "PUBLIC_HOST=%DUCKDNS_HOST%.duckdns.org"

call build-single-url.bat
if errorlevel 1 exit /b %errorlevel%

call duckdns-update.bat
if errorlevel 1 exit /b %errorlevel%

set "APP_SERVER_HOST=0.0.0.0"
set "APP_SERVER_PORT=80"
set "DEFAULT_URI=http://%PUBLIC_HOST%"

echo.
echo Iniciando Agora en URL fija:
echo   http://%PUBLIC_HOST%/app
echo   http://%PUBLIC_HOST%/externo
echo.
echo Recuerda abrir en el router el puerto 80 hacia este equipo.
echo.

cd /d "%~dp0backend"
call start-server.bat
