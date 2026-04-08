param(
    [string]$OutputPath = ""
)

$ErrorActionPreference = "Stop"

function Resolve-PgCommand {
    param(
        [Parameter(Mandatory = $true)]
        [string]$CommandName
    )

    $cmd = Get-Command $CommandName -ErrorAction SilentlyContinue
    if ($cmd) {
        return $cmd.Source
    }

    $exeName = "$CommandName.exe"
    $searchRoots = @()
    if ($env:PG_BIN) {
        $searchRoots += $env:PG_BIN
    }
    $searchRoots += "C:\Program Files\PostgreSQL"
    $searchRoots += "C:\Program Files (x86)\PostgreSQL"

    foreach ($root in $searchRoots) {
        if (-not (Test-Path $root)) { continue }

        if ((Split-Path $root -Leaf) -ieq "bin") {
            $candidate = Join-Path $root $exeName
            if (Test-Path $candidate) { return $candidate }
            continue
        }

        $bins = Get-ChildItem -Path $root -Directory -ErrorAction SilentlyContinue |
            Sort-Object Name -Descending |
            ForEach-Object { Join-Path $_.FullName "bin\$exeName" }
        foreach ($candidate in $bins) {
            if (Test-Path $candidate) { return $candidate }
        }
    }

    throw "Não foi possível localizar '$CommandName'. Instale PostgreSQL Client Tools ou adicione a pasta bin do PostgreSQL ao PATH. Exemplo: C:\Program Files\PostgreSQL\16\bin"
}

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$BackDir = Split-Path -Parent $ScriptDir
$EnvFile = Join-Path $BackDir ".env"

if (Test-Path $EnvFile) {
    Get-Content $EnvFile | ForEach-Object {
        if (-not $_) { return }
        $line = $_.Trim()
        if (-not $line -or $line.StartsWith("#")) { return }
        $parts = $line -split "=", 2
        if ($parts.Count -eq 2) {
            [Environment]::SetEnvironmentVariable($parts[0].Trim(), $parts[1].Trim())
        }
    }
}

$rawDatabaseUrl = $env:DATABASE_URL
if ([string]::IsNullOrWhiteSpace($rawDatabaseUrl)) {
    $rawDatabaseUrl = $env:SQLALCHEMY_DATABASE_URI
}

if ([string]::IsNullOrWhiteSpace($rawDatabaseUrl)) {
    throw "DATABASE_URL/SQLALCHEMY_DATABASE_URI não configurada no .env"
}

$databaseUrlPgDump = $rawDatabaseUrl -replace "^postgresql\+psycopg2:", "postgresql:"

if ([string]::IsNullOrWhiteSpace($OutputPath)) {
    $timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
    $OutputPath = Join-Path $BackDir "backups/backup_$timestamp.sql"
}

$outputDir = Split-Path -Parent $OutputPath
if (-not (Test-Path $outputDir)) {
    New-Item -ItemType Directory -Path $outputDir -Force | Out-Null
}

$pgDumpExe = Resolve-PgCommand -CommandName "pg_dump"

& $pgDumpExe $databaseUrlPgDump -f $OutputPath
if ($LASTEXITCODE -ne 0) {
    throw "pg_dump falhou com código $LASTEXITCODE"
}

Write-Output "Backup generated at $OutputPath"
