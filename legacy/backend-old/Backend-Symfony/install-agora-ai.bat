@echo off
title AGORA - LocalAI Setup FIXED
color 0A
echo ========================================
echo     AGORA - LOCALAI SETUP FIXED
echo ========================================
echo.

:: Verificar Docker
echo [1/4] Verificando Docker...
docker --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Docker no encontrado
    pause
    exit /b 1
)
echo ✅ Docker OK

:: Limpiar contenedores anteriores
echo [2/4] Limpiando instalacion anterior...
docker stop agora-localai >nul 2>&1
docker rm agora-localai >nul 2>&1
echo ✅ Limpieza completa

:: Crear directorios
echo [3/4] Creando directorios...
if not exist "localai-models" mkdir localai-models
echo ✅ Directorios OK

:: Iniciar LocalAI con comando simplificado
echo [4/4] Iniciando LocalAI Server...
echo ⏱️  Descargando imagen (~500MB)...

docker run -d --name agora-localai --restart unless-stopped -p 8080:8080 -v "%cd%\localai-models:/models" -e MODELS_PATH=/models -e THREADS=4 localai/localai:latest

if errorlevel 1 (
    echo ❌ Error iniciando LocalAI
    echo.
    echo 🔧 INTENTA ESTOS PASOS:
    echo 1. Verificar que Docker Desktop este ejecutandose
    echo 2. Ejecutar: docker run hello-world
    echo 3. Si falla, reiniciar Docker Desktop
    pause
    exit /b 1
)

echo ✅ LocalAI iniciado correctamente!
echo.
echo ⏳ Esperando 30 segundos a que inicie...
timeout /t 30 /nobreak > nul

echo.
echo ========================================
echo        🎉 INSTALACION COMPLETA 
echo ========================================
echo.
echo ✅ LocalAI Server: http://localhost:8080
echo 📊 Estado: Verificar con 'docker ps'
echo.
echo 🎯 PROBAR AHORA:
echo   1. Abrir: http://localhost:8080
echo   2. Si responde, ¡funciona!
echo   3. Abrir: agora-platform-demo.html
echo   4. Buscar indicador "IA" debe estar verde
echo.
echo 💡 COMANDOS UTILES:
echo   docker ps                    - Ver si esta ejecutandose
echo   docker logs agora-localai    - Ver logs si hay problemas
echo   docker restart agora-localai - Reiniciar si es necesario
echo.
pause