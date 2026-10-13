$ErrorActionPreference = 'SilentlyContinue'
$workspace = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$processes = Get-CimInstance Win32_Process -Filter "Name='node.exe'" | Where-Object {
  $_.CommandLine -like "*$workspace*" -and (
    $_.CommandLine -like '*src/server.js*' -or $_.CommandLine -like '*vite*'
  )
}
foreach ($process in $processes) {
  Stop-Process -Id $process.ProcessId -Force
}
docker compose -f (Join-Path $workspace 'compose.local.yml') down
Write-Output 'GADIMAT local arrêté.'
