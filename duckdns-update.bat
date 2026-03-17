@echo off
setlocal

cd /d "%~dp0"

if not exist "duckdns-config.local.bat" (
    echo ERROR: Falta duckdns-config.local.bat
    echo Copia duckdns-config.local.example.bat y rellena tu subdominio y token.
    exit /b 1
)

call "%~dp0duckdns-config.local.bat"

if "%DUCKDNS_DOMAIN%"=="" (
    echo ERROR: DUCKDNS_DOMAIN no esta definido.
    exit /b 1
)

if "%DUCKDNS_TOKEN%"=="" (
    echo ERROR: DUCKDNS_TOKEN no esta definido.
    exit /b 1
)

if "%DUCKDNS_BASE_DOMAIN%"=="" set "DUCKDNS_BASE_DOMAIN=duckdns.org"

set "DUCKDNS_HOST=%DUCKDNS_DOMAIN%"
set "DUCKDNS_HOST=%DUCKDNS_HOST:.duckdns.org=%"

echo Actualizando DuckDNS para %DUCKDNS_HOST%.%DUCKDNS_BASE_DOMAIN% ...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$domain = '%DUCKDNS_HOST%'; $token = '%DUCKDNS_TOKEN%'; $url = 'https://www.duckdns.org/update?domains=' + $domain + '&token=' + $token + '&verbose=true'; $response = Invoke-WebRequest -Uri $url -UseBasicParsing; if ($response.Content -is [byte[]]) { [Text.Encoding]::UTF8.GetString($response.Content) } else { $response.Content }"
if errorlevel 1 exit /b %errorlevel%
