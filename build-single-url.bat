@echo off
setlocal

echo ===================================
echo   AGORA - BUILD URL UNICA
echo ===================================
echo.
echo Generando panel interno en backend/public/app ...
call npm.cmd --prefix frontend\app run build:backend
if errorlevel 1 exit /b %errorlevel%

echo.
echo Generando portal externo en backend/public/externo ...
call npm.cmd --prefix frontend\company-portal run build:backend
if errorlevel 1 exit /b %errorlevel%

echo.
echo Build unificada completada.
echo Panel interno:  http://127.0.0.1:8000/app
echo Portal externo: http://127.0.0.1:8000/externo
