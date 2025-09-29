@echo off
echo Stopping any existing servers...
taskkill /f /im node.exe 2>nul
taskkill /f /im wrangler.exe 2>nul

echo Starting backend server...
start cmd /k "cd c:\Users\srab1.SAMEH-NVME\Downloads\source_code\backend && npx wrangler dev"

timeout /t 5

echo Starting frontend server...
start cmd /k "cd c:\Users\srab1.SAMEH-NVME\Downloads\source_code && npm run dev"

echo Servers started. Please wait a moment for them to initialize.
echo Frontend will be available at http://127.0.0.1:5180
echo Backend will be available at http://127.0.0.1:8787
pause