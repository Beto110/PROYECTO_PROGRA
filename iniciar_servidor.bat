@echo off
echo ===================================================
echo      Iniciando Servidor de InvenWeb...
echo ===================================================
echo.
echo Deteniendo procesos antiguos de PHP por si acaso...
taskkill /F /IM php.exe >nul 2>&1

echo Abriendo el navegador...
start http://localhost:8080/

echo.
echo Servidor corriendo en el puerto 8080.
echo Por favor, NO cierres esta ventana negra mientras uses el sistema.
echo Para apagar el servidor, simplemente cierra esta ventana.
echo.

cd /d "%~dp0invenweb"
php -S localhost:8080
pause
