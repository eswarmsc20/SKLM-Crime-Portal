Write-Host "=========================================================================" -ForegroundColor Gold
Write-Host "  ANDHRA PRADESH POLICE - SRIKAKULAM DISTRICT CRIME REVIEW PORTAL" -ForegroundColor Cyan
Write-Host "  Superintendent of Police Crime Review Meeting Dashboard" -ForegroundColor White
Write-Host "=========================================================================" -ForegroundColor Gold
Write-Host ""
Write-Host "Starting local web server on port 8080..." -ForegroundColor Green
Write-Host "Default Officer ID: admin" -ForegroundColor Yellow
Write-Host "Default Passcode:   sp@sklm" -ForegroundColor Yellow
Write-Host ""
Start-Process "http://localhost:8080/index.html"
python -m http.server 8080
