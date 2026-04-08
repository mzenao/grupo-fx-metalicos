$ErrorActionPreference = "Stop"

function Resolve-PgCommand {
    param(
        [Parameter(Mandatory = $true)]
        [string]$CommandName,
        [bool]$Required = $true
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

    if ($Required) {
        throw "Não foi possível localizar '$CommandName'. Instale PostgreSQL Client Tools ou adicione a pasta bin do PostgreSQL ao PATH. Exemplo: C:\Program Files\PostgreSQL\16\bin"
    }

    return $null
}

function Test-CommandAvailable {
    param([string]$Name)
    return $null -ne (Resolve-PgCommand -CommandName $Name -Required $false)
}

function Invoke-CreateDatabase {
    param(
        [string]$HostName,
        [int]$Port,
        [string]$Username,
        [string]$DbName,
        [string]$AdminDb
    )

    if ($script:createdbExe) {
        & $script:createdbExe -h $HostName -p $Port -U $Username $DbName
        if ($LASTEXITCODE -ne 0) {
            throw "Falha ao criar banco temporário com createdb"
        }
        return
    }

    $sql = "CREATE DATABASE `"$DbName`";"
    & $script:psqlExe -h $HostName -p $Port -U $Username -d $AdminDb -v ON_ERROR_STOP=1 -c $sql
    if ($LASTEXITCODE -ne 0) {
        throw "Falha ao criar banco temporário com psql"
    }
}

function Invoke-DropDatabaseIfExists {
    param(
        [string]$HostName,
        [int]$Port,
        [string]$Username,
        [string]$DbName,
        [string]$AdminDb
    )

    if ($script:dropdbExe) {
        & $script:dropdbExe -h $HostName -p $Port -U $Username --if-exists $DbName | Out-Null
        return
    }

    $terminateSql = "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '$DbName' AND pid <> pg_backend_pid();"
    & $script:psqlExe -h $HostName -p $Port -U $Username -d $AdminDb -v ON_ERROR_STOP=1 -c $terminateSql | Out-Null
    $dropSql = "DROP DATABASE IF EXISTS `"$DbName`";"
    & $script:psqlExe -h $HostName -p $Port -U $Username -d $AdminDb -v ON_ERROR_STOP=1 -c $dropSql | Out-Null
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

$databaseUrl = $rawDatabaseUrl -replace "^postgresql\+psycopg2:", "postgresql:"
$uri = [Uri]$databaseUrl

$dbName = $uri.AbsolutePath.TrimStart('/')
if ([string]::IsNullOrWhiteSpace($dbName)) {
    throw "Não foi possível identificar o nome do banco na URL"
}

$hostName = $uri.Host
$port = if ($uri.Port -gt 0) { $uri.Port } else { 5432 }
$username = $uri.UserInfo
$password = ""
if ($username -like "*:*") {
    $parts = $username -split ":", 2
    $username = $parts[0]
    $password = $parts[1]
}

if ([string]::IsNullOrWhiteSpace($username)) {
    throw "Não foi possível identificar o usuário na URL"
}

$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backupFile = Join-Path $BackDir "backups/smoke_backup_$timestamp.sql"
$tempDb = "${dbName}_restore_test_$timestamp"
$adminDb = "postgres"
$script:psqlExe = Resolve-PgCommand -CommandName "psql" -Required $true
$script:createdbExe = Resolve-PgCommand -CommandName "createdb" -Required $false
$script:dropdbExe = Resolve-PgCommand -CommandName "dropdb" -Required $false

if (-not [string]::IsNullOrWhiteSpace($password)) {
    $env:PGPASSWORD = $password
}

try {
    Write-Output "[1/5] Gerando dump"
    & (Join-Path $ScriptDir "dump_postgres.ps1") -OutputPath $backupFile

    Write-Output "[2/5] Criando banco temporário: $tempDb"
    Invoke-CreateDatabase -HostName $hostName -Port $port -Username $username -DbName $tempDb -AdminDb $adminDb

    Write-Output "[3/5] Restaurando dump no banco temporário"
    & $script:psqlExe -h $hostName -p $port -U $username -d $tempDb -f $backupFile
    if ($LASTEXITCODE -ne 0) {
        throw "Falha ao restaurar dump no banco temporário"
    }

    Write-Output "[4/5] Validando objetos restaurados"
    $tableCount = & $script:psqlExe -h $hostName -p $port -U $username -d $tempDb -t -A -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public';"
    if ($LASTEXITCODE -ne 0) {
        throw "Falha ao validar tabelas no banco temporário"
    }

    Write-Output "[OK] Teste concluído com sucesso. Tabelas públicas restauradas: $tableCount"
    Write-Output "Backup de teste: $backupFile"
}
finally {
    Write-Output "[5/5] Limpando banco temporário"
    try {
        Invoke-DropDatabaseIfExists -HostName $hostName -Port $port -Username $username -DbName $tempDb -AdminDb $adminDb
    }
    catch {
        Write-Warning "Não foi possível remover banco temporário automaticamente: $($_.Exception.Message)"
    }
    if ($env:PGPASSWORD) {
        Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
    }
}
