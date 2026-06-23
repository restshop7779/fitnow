@echo off
cd /d "%~dp0"
call "C:\Program Files\nodejs\npm.cmd" run build:local
if errorlevel 1 pause & exit /b %errorlevel%
"C:\Program Files\nodejs\node.exe" "%~dp0scripts\serve-dist.js"
pause
