@echo off
rem Auto-start idx-web dev server (Next.js :3000) - hidden background (task)
cd /d D:\Project\market-labs\idx-web
rem Hentikan dev server lama dulu kalau diminta lewat flag (pola restart-api.ps1).
rem Proses dev dilepas run-hidden.vbs, jadi hanya instance task ini yang bisa
rem menghentikannya; lihat scripts\restart-web.ps1.
powershell -NoProfile -ExecutionPolicy Bypass -File "scripts\restart-web.ps1"
if errorlevel 2 (
  echo [%date% %time%] port 3000 masih terpakai - web TIDAK dinyalakan >> D:\Project\market-labs\idx-web\logs\_launcher.log
  exit /b 1
)
rem _stop-web.flag = sengaja berhenti (mis. next build): jangan nyalakan lagi.
rem Flag-nya dihapus pemilik setelah build selesai, bukan di sini.
if exist "_stop-web.flag" (
  echo [%date% %time%] _stop-web.flag ada - web dihentikan, tidak dinyalakan >> D:\Project\market-labs\idx-web\logs\_launcher.log
  exit /b 0
)
rem Jangan start instance kedua kalau :3000 sudah dipakai: `next dev` bisa pindah
rem ke port berikutnya dan melahirkan dev server kedua yang membakar CPU.
powershell -NoProfile -ExecutionPolicy Bypass -File "D:\Project\market-labs\idx-scraper\scripts\guard-port.ps1" 3000
if errorlevel 1 (
  echo [%date% %time%] web :3000 sudah jalan - peluncuran dilewati >> D:\Project\market-labs\idx-web\logs\_launcher.log
  exit /b 0
)
set NEXT_TELEMETRY_DISABLED=1
rem nvm baru (Author Software) hanya menyediakan shim npm.exe, bukan npm.cmd;
rem `call npm.cmd` gagal walau node ada di PATH. Pakai `npm`, dengan shim nvm
rem sebagai cadangan kalau PATH task tidak memuat node.
set "NPM_CMD=npm"
where npm >nul 2>nul
if errorlevel 1 set "NPM_CMD=C:\Users\faiza\AppData\Local\Author Software\nvm\.nodejs\npm.exe"
echo [%date% %time%] npm: %NPM_CMD% >> D:\Project\market-labs\idx-web\logs\_launcher.log
for /f "delims=" %%v in ('node --version 2^>nul') do echo [%date% %time%] node: %%v >> D:\Project\market-labs\idx-web\logs\_launcher.log
if not exist "%NPM_CMD%" if /i not "%NPM_CMD%"=="npm" (
  echo [%date% %time%] npm tidak ditemukan - %NPM_CMD% - web TIDAK dinyalakan >> D:\Project\market-labs\idx-web\logs\_launcher.log
  exit /b 1
)
call "%NPM_CMD%" run dev >> D:\Project\market-labs\idx-web\logs\_web.log 2>&1
