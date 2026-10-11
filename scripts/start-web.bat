@echo off
rem Auto-start idx-web dev server (Next.js :3000) - background at logon
cd /d D:\Project\market-labs\idx-web
set NEXT_TELEMETRY_DISABLED=1
call npm.cmd run dev >> D:\Project\market-labs\idx-web\logs\_web.log 2>&1
