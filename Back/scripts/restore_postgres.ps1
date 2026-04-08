param(
    [Parameter(Mandatory = $true)]
    [string]$BackupFile
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

if (-not (Test-Path $BackupFile)) {
    throw "Arquivo de backup não encontrado: $BackupFile"
}

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

$databaseUrlPsql = $rawDatabaseUrl -replace "^postgresql\+psycopg2:", "postgresql:"

$psqlExe = Resolve-PgCommand -CommandName "psql"

& $psqlExe $databaseUrlPsql -f $BackupFile
if ($LASTEXITCODE -ne 0) {
    throw "restore falhou com código $LASTEXITCODE"
}

Write-Output "Restore finished"
