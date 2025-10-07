@echo off
title AGORA - LocalAI Setup (non-interactive)
color 0A
echo [1/4] Verificando Docker...
docker --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Docker no encontrado
    exit /b 1
)
echo ✅ Docker OK

echo [2/4] Limpiando instalacion anterior...
docker stop agora-localai >nul 2>&1
docker rm agora-localai >nul 2>&1
echo ✅ Limpieza completa

echo [3/4] Creando directorios...
if not exist "localai-models" mkdir localai-models
echo ✅ Directorios OK

echo [4/4] Iniciando LocalAI Server (no-interactive)...
echo ⏱️  Descargando imagen si hace falta...

docker run -d --name agora-localai --restart unless-stopped -p 8080:8080 -v "%cd%\localai-models:/models" -e MODELS_PATH=/models -e THREADS=4 localai/localai:latest

if errorlevel 1 (
    echo ❌ Error iniciando LocalAI
    exit /b 1
)

echo ✅ LocalAI iniciado correctamente!
echo Esperando 20 segundos a que el servicio esté listo...
timeout /t 20 /nobreak > nul

echo ✅ Listo. LocalAI debería estar disponible en http://localhost:8080 (si el contenedor arrancó correctamente)
echo Para logs: docker logs agora-localai

exit /b 0
