@echo off
setlocal

cd /d "%~dp0desktop"

set ELECTRON_RUN_AS_NODE=

if not exist "node_modules\electron" (
    echo Instalando dependencias de Agora Desktop...
    call npm.cmd install
    if errorlevel 1 (
        echo.
        echo No se pudieron instalar las dependencias de escritorio.
        pause
        exit /b 1
    )
)

call npm.cmd start
exit /b %ERRORLEVEL%
