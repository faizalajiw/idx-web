@echo off
rem Auto-start idx-web (:3000) - hidden background (task IDX-Web).
rem
rem Yang disajikan: web\build (SvelteKit 3 + adapter-static). Tidak ada dev
rem server Node di :3000 - prosesnya hanya web\deploy\serve.mjs yang membaca
rem build dari disk pada setiap permintaan, jadi build ulang tidak perlu
rem mematikan server (kecuali mau dijamin tidak ada permintaan yang membaca
rem build setengah jadi: pakai _stop-web.flag untuk itu).
cd /d D:\Project\market-labs\idx-web
set "LOG=D:\Project\market-labs\idx-web\logs\_launcher.log"
if not exist "D:\Project\market-labs\idx-web\logs" mkdir "D:\Project\market-labs\idx-web\logs"

rem Hentikan proses lama dulu kalau diminta lewat flag (pola restart-api.ps1).
rem Proses dilepas run-hidden.vbs, jadi hanya instance task ini yang bisa
rem menghentikannya; lihat scripts\restart-web.ps1.
powershell -NoProfile -ExecutionPolicy Bypass -File "scripts\restart-web.ps1"
if errorlevel 2 (
  echo [%date% %time%] port 3000 masih terpakai - web TIDAK dinyalakan >> "%LOG%"
  exit /b 1
)
rem _stop-web.flag = sengaja berhenti (mis. build sedang ditimpa): jangan
rem nyalakan lagi. Flag-nya dihapus pemilik setelah pekerjaan selesai.
if exist "_stop-web.flag" (
  echo [%date% %time%] _stop-web.flag ada - web dihentikan, tidak dinyalakan >> "%LOG%"
  exit /b 0
)
rem Jangan start instance kedua kalau :3000 sudah dipakai.
powershell -NoProfile -ExecutionPolicy Bypass -File "D:\Project\market-labs\idx-scraper\scripts\guard-port.ps1" 3000
if errorlevel 1 (
  echo [%date% %time%] web :3000 sudah jalan - peluncuran dilewati >> "%LOG%"
  exit /b 0
)
if not exist "web\build\index.html" (
  echo [%date% %time%] web\build\index.html tidak ada - jalankan "npm run build" di web lebih dulu >> "%LOG%"
  exit /b 1
)
rem nvm baru (Author Software) hanya menyediakan shim di .nodejs, dan PATH task
rem bisa tidak memuat node. Pakai node dari PATH, shim nvm sebagai cadangan.
set "NODE_CMD=node"
where node >nul 2>nul
if errorlevel 1 set "NODE_CMD=C:\Users\faiza\AppData\Local\Author Software\nvm\.nodejs\node.exe"
if not exist "%NODE_CMD%" if /i not "%NODE_CMD%"=="node" (
  echo [%date% %time%] node tidak ditemukan - %NODE_CMD% - web TIDAK dinyalakan >> "%LOG%"
  exit /b 1
)
echo [%date% %time%] node: %NODE_CMD% >> "%LOG%"
cd /d D:\Project\market-labs\idx-web\web
"%NODE_CMD%" deploy\serve.mjs 3000 build >> "D:\Project\market-labs\idx-web\logs\_web.log" 2>&1
