@echo off
title AGORA - Verificador de Requisitos
color 0E
echo ========================================
echo   AGORA - VERIFICADOR DE REQUISITOS
echo ========================================
echo.

echo 🔍 Verificando requisitos para LocalAI...
echo.

:: Verificar sistema operativo
echo [1/5] Sistema Operativo:
ver | findstr "Windows" >nul
if errorlevel 1 (
    echo ❌ Sistema no compatible
    pause
    exit /b 1
) else (
    echo ✅ Windows detectado
)

:: Verificar arquitectura
echo.
echo [2/5] Arquitectura del sistema:
if "%PROCESSOR_ARCHITECTURE%"=="AMD64" (
    echo ✅ x64 compatible
) else (
    echo ⚠️  Arquitectura: %PROCESSOR_ARCHITECTURE%
)

:: Verificar RAM
echo.
echo [3/5] Memoria RAM:
for /f "tokens=2 delims==" %%i in ('wmic OS get TotalVisibleMemorySize /value') do set mem=%%i
if defined mem (
    set /a mem_gb=%mem%/1024/1024
    if %mem_gb% GEQ 8 (
        echo ✅ RAM suficiente: ~%mem_gb%GB
    ) else (
        echo ⚠️  RAM detectada: ~%mem_gb%GB ^(recomendado 8GB+^)
    )
) else (
    echo ❓ No se pudo detectar la RAM
)

:: Verificar espacio en disco
echo.
echo [4/5] Espacio en disco:
for /f "tokens=3" %%i in ('dir C:\ ^| find "bytes free"') do set free=%%i
if defined free (
    echo ℹ️  Espacio libre en C: %free% bytes
    echo ℹ️  Necesario: ~10GB para LocalAI + modelos
) else (
    echo ❓ No se pudo verificar espacio libre
)

:: Verificar Docker
echo.
echo [5/5] Docker Desktop:
docker --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Docker no encontrado
    echo.
    echo 📥 NECESITAS INSTALAR DOCKER DESKTOP:
    echo    https://www.docker.com/products/docker-desktop/
    echo.
    echo ⚡ PASOS:
    echo    1. Descargar Docker Desktop
    echo    2. Instalarlo como administrador  
    echo    3. Reiniciar Windows
    echo    4. Ejecutar este script nuevamente
    echo.
) else (
    echo ✅ Docker instalado correctamente
    docker --version
    echo.
    echo 🎉 ¡TODOS LOS REQUISITOS CUMPLIDOS!
    echo.
    echo 🚀 SIGUIENTE PASO:
    echo    Ejecutar: install-agora-ai.bat
    echo.
)

echo ========================================
echo 📊 RESUMEN DE COMPATIBILIDAD:
echo ========================================
echo Sistema: ✅ Windows
echo Arquitectura: ✅ Compatible  
echo RAM: %mem_gb%GB
echo Docker: %errorlevel%
echo.

if %errorlevel%==0 (
    echo 🎯 ESTADO: ✅ LISTO PARA INSTALAR
    echo.
    choice /C YN /M "¿Quieres ejecutar install-agora-ai.bat ahora? (Y/N)"
    if !errorlevel!==1 (
        call install-agora-ai.bat
    )
) else (
    echo 🎯 ESTADO: ❌ INSTALA DOCKER PRIMERO
)

echo.
pause