@echo off
title Unified Engineering Workbench Launcher
echo ========================================================
echo   UNIFIED ENGINEERING WORKBENCH (PASS SCIENCE WORKS)
echo   C++17 Backend ^| Formula-E EV Power Unit ^| ANSYS Viz ^| FEA
echo ========================================================

:: Kill any stale server on port 8080
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":8080 "') do (
    taskkill /PID %%a /F >nul 2>&1
)
timeout /t 1 /nobreak >nul

echo Starting C++ Backend Server (latest build) on port 8080...
start /B "" "%~dp0backend\workbench_server.exe" 8080
timeout /t 2 /nobreak >nul

echo Opening browser at http://127.0.0.1:8080...
start http://127.0.0.1:8080

echo.
echo [OK] Workbench is running!
echo [OK] Formula-E Power Unit STL + ANSYS Heat Cloud endpoints: ACTIVE
echo [OK] Benchmark Rod endpoints: ACTIVE
echo.
echo Press any key to stop the server and exit.
pause >nul

:: Cleanup on exit
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":8080 "') do (
    taskkill /PID %%a /F >nul 2>&1
)
