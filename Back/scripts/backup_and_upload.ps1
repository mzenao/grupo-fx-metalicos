$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$BackDir = Split-Path -Parent $ScriptDir
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backupPath = Join-Path $BackDir "backups/backup_$timestamp.sql"

Write-Output "[backup] Starting database dump"
& (Join-Path $ScriptDir "dump_postgres.ps1") -OutputPath $backupPath

Write-Output "[backup] Uploading dump to S3 backup bucket"
Push-Location $BackDir
try {
    & python "scripts/upload_backup_s3.py" $backupPath
    if ($LASTEXITCODE -ne 0) {
        throw "Falha ao executar upload_backup_s3.py"
    }
}
finally {
    Pop-Location
}

Write-Output "[backup] Finished successfully: $backupPath"
