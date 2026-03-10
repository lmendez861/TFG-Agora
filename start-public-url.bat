@echo off
setlocal

cd /d "%~dp0"

if not exist "tools\cloudflared.exe" (
    echo Descargando cloudflared por primera vez...
    if not exist "tools" mkdir "tools"
    powershell -NoProfile -ExecutionPolicy Bypass -Command "Invoke-WebRequest -Uri 'https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe' -OutFile 'tools\\cloudflared.exe'"
    if errorlevel 1 (
        echo ERROR: No se pudo descargar tools\cloudflared.exe
        exit /b 1
    )
)

if "%APP_PUBLIC_URL_TARGET%"=="" set "APP_PUBLIC_URL_TARGET=http://127.0.0.1:8000"

echo ===================================
echo   AGORA - URL PUBLICA TEMPORAL
echo ===================================
echo.
echo Publicando: %APP_PUBLIC_URL_TARGET%
echo Cuando cloudflared muestre la URL https://...trycloudflare.com
echo podras abrir /app o /externo sobre esa misma URL.
echo.
echo Ejemplos:
echo   URL/app
echo   URL/externo
echo.
echo CTRL+C para cerrar el tunel
echo.

"%~dp0tools\cloudflared.exe" tunnel --url "%APP_PUBLIC_URL_TARGET%"
