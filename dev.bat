@echo off
cd /d "%~dp0"
echo Instalando dependencias...
call npm install
if errorlevel 1 (
  echo.
  echo ERROR en npm install
  pause
  exit /b 1
)
echo.
echo Iniciando servidor...
call npm run dev -- --host
pause
