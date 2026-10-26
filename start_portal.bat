@echo off
title Srikakulam District Police - SP Crime Review Portal
echo =========================================================================
echo   ANDHRA PRADESH POLICE - SRIKAKULAM DISTRICT CRIME REVIEW PORTAL
echo   Superintendent of Police Monthly Crime Review Dashboard
echo =========================================================================
echo.
echo Starting local web server on port 8080...
echo Opening browser to http://localhost:8080/index.html
echo.
echo [Login Credentials]
echo Officer ID: admin
echo Passcode:   sp@sklm
echo.
start http://localhost:8080/index.html
python -m http.server 8080
pause
