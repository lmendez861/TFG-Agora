@echo off
echo ========================================
echo    AGORA - LocalAI Installation Script
echo ========================================
echo.

:: Verificar si Docker está instalado
docker --version >nul 2>&1
if errorlevel 1 (
    echo ❌ ERROR: Docker no está instalado
    echo 📥 Descarga Docker Desktop desde: https://docker.com/products/docker-desktop
    pause
    exit /b 1
)

echo ✅ Docker detectado

:: Crear directorio para modelos de LocalAI
if not exist "localai-models" (
    mkdir localai-models
    echo 📁 Directorio localai-models creado
)

echo.
echo 🧠 INICIANDO LOCALAI CON LLAMA 2...
echo 📊 Esto descargará ~4GB la primera vez
echo ⏱️  Puede tomar 10-15 minutos
echo.

:: Ejecutar LocalAI con Docker
docker run -d ^
  --name agora-localai ^
  -p 8080:8080 ^
  -v "%cd%\localai-models:/models" ^
  -e MODELS_PATH=/models ^
  -e THREADS=4 ^
  -e DEBUG=true ^
  localai/localai:latest

if errorlevel 0 (
    echo.
    echo ✅ LocalAI iniciado correctamente
    echo 🌐 Accesible en: http://localhost:8080
    echo 📊 Panel de control: http://localhost:8080/browse
    echo.
    echo 🔄 Descargando modelo Llama-2-7b-chat...
    
    :: Descargar modelo Llama 2 optimizado
    curl -L "https://huggingface.co/TheBloke/Llama-2-7B-Chat-GGML/resolve/main/llama-2-7b-chat.q4_0.bin" -o "localai-models/llama-2-7b-chat.q4_0.bin"
    
    if errorlevel 0 (
        echo ✅ Modelo Llama-2 descargado
        echo 🎯 LocalAI listo para usar
    ) else (
        echo ⚠️  Error descargando modelo, pero LocalAI funciona
        echo 📝 Puedes descargar modelos desde el panel web
    )
    
    echo.
    echo 🔥 LOCALAI CONFIGURADO COMPLETAMENTE
    echo 📋 Próximo paso: Conectar con Symfony backend
    pause
) else (
    echo ❌ Error iniciando LocalAI
    echo 💡 Verifica que Docker esté ejecutándose
    pause
    exit /b 1
)