@echo off
setlocal

if "%APP_SERVER_HOST%"=="" set "APP_SERVER_HOST=0.0.0.0"
if "%APP_SERVER_PORT%"=="" set "APP_SERVER_PORT=8000"

echo ===================================
echo    AGORA - SERVIDOR BACKEND
echo ===================================
echo.
echo Iniciando backend Symfony/PHP...
echo URL local: http://127.0.0.1:%APP_SERVER_PORT%
echo Host de escucha: %APP_SERVER_HOST%
echo.
echo CTRL+C para detener el servidor
echo.

cd /d "%~dp0"

if not exist "public" (
    echo ERROR: No se encontro el directorio public/
    pause
    exit /b 1
)

php -S %APP_SERVER_HOST%:%APP_SERVER_PORT% -t public
