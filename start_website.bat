@echo off
echo ========================================================
echo   Launching RareDx AI Web Application ^& Showcase
echo   ATME College of Engineering ^| Dept of CSE-Data Science
echo ========================================================
echo.
cd /d "%~dp0"
echo Starting local web server on http://localhost:8080 ...
start "" "http://localhost:8080"
python -m http.server 8080
pause
