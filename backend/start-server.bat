@echo off
echo ===================================
echo    AGORA - SERVIDOR BACKEND
echo ===================================
echo.
echo Iniciando servidor Symfony en modo desarrollo...
echo URL: http://127.0.0.1:8000
echo.
echo CTRL+C para detener el servidor
echo.

cd /d "C:\Users\lourd\Desktop\TFG - Agora\Backend-Symfony"

:: Verificar si existe el directorio
if not exist "public" (
    echo ERROR: No se encontro el directorio public/
    echo Asegurate de estar en la carpeta correcta del proyecto Symfony
    pause
    exit /b 1
)

:: Iniciar el servidor
echo Servidor iniciando...
php -S 127.0.0.1:8000 -t public

:: Si llegamos aquí, el servidor se detuvo
echo.
echo Servidor detenido.
pause