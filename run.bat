@echo off
title Sweet Accessories Server
cd /d "%~dp0"
where node >nul 2>nul
if %errorlevel% neq 0 (
  echo.
  echo   ❌ Node.js مش مثبت!
  echo   حمل من: https://nodejs.org
  pause
  exit /b
)
node server.js
pause
