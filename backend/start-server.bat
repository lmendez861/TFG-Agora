@echo off
setlocal

if "%APP_SERVER_HOST%"=="" set "APP_SERVER_HOST=0.0.0.0"
if "%APP_SERVER_PORT%"=="" set "APP_SERVER_PORT=8000"
if "%PHP_BIN%"=="" set "PHP_BIN=php"
set "APP_SERVER_BIND_HOST=%APP_SERVER_HOST%"

if /I "%APP_SERVER_BIND_HOST%"=="0.0.0.0" (
    for /f %%i in ('powershell -NoProfile -Command "$route = Get-NetRoute -DestinationPrefix ''0.0.0.0/0'' -ErrorAction SilentlyContinue | Sort-Object RouteMetric,InterfaceMetric | Select-Object -First 1; if ($route) { Get-NetIPAddress -InterfaceIndex $route.InterfaceIndex -AddressFamily IPv4 -ErrorAction SilentlyContinue | Where-Object { $_.IPAddress -notlike ''169.254*'' } | Select-Object -First 1 -ExpandProperty IPAddress }"') do set "APP_SERVER_BIND_HOST=%%i"
    if "%APP_SERVER_BIND_HOST%"=="" set "APP_SERVER_BIND_HOST=127.0.0.1"
)

where "%PHP_BIN%" >nul 2>nul
if errorlevel 1 (
    if exist "C:\xampp\php\php.exe" (
        set "PHP_BIN=C:\xampp\php\php.exe"
    ) else (
        echo ERROR: No se encontro PHP en PATH ni en C:\xampp\php\php.exe
        pause
        exit /b 1
    )
)

echo ===================================
echo    AGORA - SERVIDOR BACKEND
echo ===================================
echo.
echo Iniciando backend Symfony/PHP...
echo URL local: http://127.0.0.1:%APP_SERVER_PORT%
echo Host de escucha: %APP_SERVER_BIND_HOST%
if /I not "%APP_SERVER_BIND_HOST%"=="127.0.0.1" echo URL LAN: http://%APP_SERVER_BIND_HOST%:%APP_SERVER_PORT%
echo.
echo CTRL+C para detener el servidor
echo.

cd /d "%~dp0"

if not exist "public" (
    echo ERROR: No se encontro el directorio public/
    pause
    exit /b 1
)

"%PHP_BIN%" -S %APP_SERVER_BIND_HOST%:%APP_SERVER_PORT% -t public
