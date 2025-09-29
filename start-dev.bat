@echo off
echo Starting Turkish Lexicon Development Environment
echo =================================================

echo Starting backend server...
start "Backend Server" /D "backend" npm run dev

timeout /t 5 /nobreak >nul

echo Starting frontend server...
npm run dev

echo.
echo Development servers are now running:
echo - Backend:  http://127.0.0.1:8787
echo - Frontend: http://127.0.0.1:5173
echo.
echo Press any key to exit...
pause >nul