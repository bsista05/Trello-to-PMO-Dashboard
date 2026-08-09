@echo off
setlocal EnableExtensions

cd /d "%~dp0"

echo.
echo  Trello - Project Management Dashboard
echo  =====================================
echo.

where python >nul 2>&1
if errorlevel 1 (
  echo Python was not found. Install Python 3 and try again.
  pause
  exit /b 1
)

echo Fetching latest board data from Trello...
python scripts/fetch-trello.py
if errorlevel 1 (
  echo.
  echo  Warning: Could not refresh Trello data.
  echo  The dashboard will use existing data in data\board.json if available.
  echo.
)

set PORT=3456
set URL=http://127.0.0.1:%PORT%/

echo Stopping any previous server on port %PORT%...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":%PORT% " ^| findstr "LISTENING"') do (
  taskkill /F /PID %%a >nul 2>&1
)

echo Starting website at %URL%
echo Press Ctrl+C to stop the server.
echo.

REM Wait for the server to start, then open the browser
start /b cmd /c "ping 127.0.0.1 -n 3 >nul && start "" "%URL%""

python -m http.server %PORT% --bind 127.0.0.1

endlocal
