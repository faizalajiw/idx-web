@echo off
rem Auto-start idx-web dev server (Next.js :3000) - hidden background (task)
cd /d D:\Project\market-labs\idx-web
rem Jangan start instance kedua kalau :3000 sudah dipakai: `next dev` bisa pindah
rem ke port berikutnya dan melahirkan dev server kedua yang membakar CPU.
powershell -NoProfile -ExecutionPolicy Bypass -File "D:\Project\market-labs\idx-scraper\scripts\guard-port.ps1" 3000
if errorlevel 1 (
  echo [%date% %time%] web :3000 sudah jalan - peluncuran dilewati >> D:\Project\market-labs\idx-web\logs\_launcher.log
  exit /b 0
)
set NEXT_TELEMETRY_DISABLED=1
call npm.cmd run dev >> D:\Project\market-labs\idx-web\logs\_web.log 2>&1
