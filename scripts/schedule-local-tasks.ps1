Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Require-Command([string] $name) {
  $cmd = Get-Command $name -ErrorAction SilentlyContinue
  if (!$cmd) { throw "Missing command: $name" }
}

Require-Command "schtasks.exe"
Require-Command "node.exe"

$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Resolve-Path (Join-Path $projectRoot "..")

$taskWeekly = "Afiliaciones - Reporte semanal"
$taskDaily = "Afiliaciones - Recordatorio diario"
$taskSync = "Afiliaciones - Sync matriz"
$taskBackup = "Afiliaciones - Backup"

$cmdWeekly = "powershell.exe -NoProfile -ExecutionPolicy Bypass -Command \"cd '$projectRoot'; npm run -s cron:weekly\""
$cmdDaily = "powershell.exe -NoProfile -ExecutionPolicy Bypass -Command \"cd '$projectRoot'; npm run -s cron:daily\""
$cmdSync = "powershell.exe -NoProfile -ExecutionPolicy Bypass -Command \"cd '$projectRoot'; npm run -s cron:sync\""
$cmdBackup = "powershell.exe -NoProfile -ExecutionPolicy Bypass -Command \"cd '$projectRoot'; npm run -s backup\""

Write-Host "Creating/Updating scheduled tasks..."

# Daily matrix sync (07:40 local)
schtasks.exe /Create /F /SC DAILY /ST 07:40 /TN $taskSync /TR $cmdSync | Out-Null

# Weekly backup (Sunday 06:30 local)
schtasks.exe /Create /F /SC WEEKLY /D SUN /ST 06:30 /TN $taskBackup /TR $cmdBackup | Out-Null

# Weekly: Monday 08:10 local
schtasks.exe /Create /F /SC WEEKLY /D MON /ST 08:10 /TN $taskWeekly /TR $cmdWeekly | Out-Null

# Daily: 08:00 local
schtasks.exe /Create /F /SC DAILY /ST 08:00 /TN $taskDaily /TR $cmdDaily | Out-Null

Write-Host "OK"
Write-Host "- $taskSync"
Write-Host "- $taskBackup"
Write-Host "- $taskWeekly"
Write-Host "- $taskDaily"
