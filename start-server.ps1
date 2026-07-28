$port = 3000
$dir = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host ""
Write-Host "  ╔══════════════════════════════════════╗" -ForegroundColor Magenta
Write-Host "  ║   Sweet Accessories - Local Server   ║" -ForegroundColor Magenta
Write-Host "  ╚══════════════════════════════════════╝" -ForegroundColor Magenta
Write-Host ""
Write-Host "  📂 Directory: $dir" -ForegroundColor Cyan
Write-Host "  🌐 URL:       http://localhost:$port" -ForegroundColor Green
Write-Host "  🛑 Ctrl+C to stop" -ForegroundColor Yellow
Write-Host ""

python -m http.server $port --directory "$dir"
