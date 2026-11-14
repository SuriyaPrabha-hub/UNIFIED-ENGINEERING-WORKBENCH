@echo off
title Restarting Workbench Server...
echo ========================================================
echo   RESTARTING WORKBENCH SERVER (Latest Build)
echo ========================================================

:: Step 1: Kill old server on port 8080
echo [1/3] Stopping old server on port 8080...
for /f "tokens=5" %%a in ('netstat -aon 2^>nul ^| findstr ":8080 "') do (
    taskkill /PID %%a /F >nul 2>&1
)
timeout /t 1 /nobreak >nul

:: Step 2: Start new server
echo [2/3] Starting workbench_server.exe ...
start /B "" "%~dp0backend\workbench_server.exe" 8080
timeout /t 2 /nobreak >nul

:: Step 3: Open browser
echo [3/3] Opening http://127.0.0.1:8080 ...
start http://127.0.0.1:8080

echo.
echo ========================================================
echo   SERVER RUNNING: http://127.0.0.1:8080
echo   Formula-E Power Unit STL   -> /api/geometry/sample-powerunit-stl
echo   Formula-E Inverter ANSYS   -> /api/geometry/sample-powerunit-ansys-csv
echo   Benchmark Rod STL          -> /api/geometry/sample-stl
echo   Benchmark Rod ANSYS        -> /api/geometry/sample-ansys-csv
echo ========================================================
echo.
echo Press any key to stop server and exit.
pause >nul

:: Cleanup
for /f "tokens=5" %%a in ('netstat -aon 2^>nul ^| findstr ":8080 "') do (
    taskkill /PID %%a /F >nul 2>&1
)
echo Server stopped.
