$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$BackDir = Split-Path -Parent $ScriptDir
$LogDir = Join-Path $BackDir "logs"
$TaskName = "GrupoFenix-DB-Backup-00h"

if (-not (Test-Path $LogDir)) {
    New-Item -ItemType Directory -Path $LogDir -Force | Out-Null
}

$backupScript = Join-Path $ScriptDir "backup_and_upload.ps1"
$logFile = Join-Path $LogDir "backup_task.log"

$escapedBackupScript = $backupScript.Replace("'", "''")
$escapedLogFile = $logFile.Replace("'", "''")

$taskCommand = "powershell.exe -NoProfile -ExecutionPolicy Bypass -File '$escapedBackupScript' *> '$escapedLogFile'"

schtasks /Delete /TN $TaskName /F 2>$null | Out-Null
schtasks /Create /SC DAILY /ST 00:00 /TN $TaskName /TR $taskCommand /F | Out-Null

Write-Output "Tarefa agendada criada: $TaskName"
Write-Output "Execução diária às 00:00"
Write-Output "Log: $logFile"
