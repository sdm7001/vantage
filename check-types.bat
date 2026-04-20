@echo off
cd /d c:\Users\sdm70\projects\vantage\apps\web
call c:\Users\sdm70\projects\vantage\node_modules\.bin\tsc.cmd --noEmit
if %ERRORLEVEL% equ 0 (
  echo WEB: PASSED
) else (
  echo WEB: FAILED
)
cd /d c:\Users\sdm70\projects\vantage\apps\worker
call c:\Users\sdm70\projects\vantage\node_modules\.bin\tsc.cmd --noEmit
if %ERRORLEVEL% equ 0 (
  echo WORKER: PASSED
) else (
  echo WORKER: FAILED
)
