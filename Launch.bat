@echo off
title Unified Engineering Workbench Launcher
echo ========================================================
echo   UNIFIED ENGINEERING WORKBENCH (PASS SCIENCE WORKS)
echo ========================================================
echo Starting C++ Backend Server on port 8080...

start /B "" "backend\workbench_server.exe" 8080
timeout /t 1 /nobreak >nul

echo Opening browser at http://127.0.0.1:8080...
start http://127.0.0.1:8080

echo Workbench is running! Press Ctrl+C in this window to stop if desired.
pause
