#Requires -Version 5.1
<#
.SYNOPSIS
    Despliega en localhost el backend (FastAPI) y el frontend (Angular/Ionic) de Urban Alert.

.DESCRIPTION
    - Verifica las herramientas necesarias (python, node, npm).
    - Comprueba la disponibilidad de puertos y aborta con un mensaje claro si alguno está ocupado.
    - Levanta la base de datos PostgreSQL en un contenedor Docker dedicado (urban-alert-db)
      en el puerto $DbPort, con volumen persistente. Reutiliza el contenedor si ya existe.
    - Instala dependencias que falten (venv de Python + node_modules) salvo que se use -SkipInstall.
    - Aplica migraciones (alembic) y arranca uvicorn y ng serve en ventanas separadas.
      Exporta DATABASE_URL apuntando al contenedor para que el backend lo use.

.PARAMETER BackendPort   Puerto del backend FastAPI (por defecto 8000).
.PARAMETER FrontendPort  Puerto del frontend Angular/Ionic (por defecto 4200).
.PARAMETER DbPort        Puerto host de PostgreSQL (por defecto 5433, para no chocar con un Postgres nativo en 5432).
.PARAMETER SkipInstall   Omite la instalación de dependencias.
.PARAMETER SkipDb        No gestiona la base de datos (usa la que indique DATABASE_URL / alembic.ini).

.EXAMPLE
    .\script\deploy.ps1
.EXAMPLE
    .\script\deploy.ps1 -BackendPort 8001 -FrontendPort 4300
#>
[CmdletBinding()]
param(
    [int]$BackendPort = 8000,
    [int]$FrontendPort = 4200,
    [int]$DbPort = 5433,
    [switch]$SkipInstall,
    [switch]$SkipDb
)

$ErrorActionPreference = 'Stop'

# ── Rutas ───────────────────────────────────────────────────────────────────────
$Root     = Split-Path -Parent $PSScriptRoot
$Backend  = Join-Path $Root 'backend'
$Frontend = Join-Path $Root 'frontend'

# ── Configuración de la base de datos (contenedor Docker) ────────────────────────
$DbContainer = 'urban-alert-db'
$DbVolume    = 'urban_alert_pgdata'
$DbImage     = 'postgres:latest'
$DbUser      = 'admin'
$DbPassword  = 'adminpassword'
$DbName      = 'incidencias_db'
$DatabaseUrl = "postgresql+psycopg2://${DbUser}:${DbPassword}@localhost:${DbPort}/${DbName}"

# ── Helpers de salida ────────────────────────────────────────────────────────────
function Write-Step($msg) { Write-Host "`n==> $msg" -ForegroundColor Cyan }
function Write-Ok($msg)   { Write-Host "[OK]  $msg" -ForegroundColor Green }
function Write-Warn2($msg) { Write-Host "[!]   $msg" -ForegroundColor Yellow }
function Write-Err($msg)  { Write-Host "[X]   $msg" -ForegroundColor Red }

# ── Helpers de puertos / herramientas ────────────────────────────────────────────
function Get-PortOwner([int]$Port) {
    $conn = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($conn) {
        $proc = Get-Process -Id $conn.OwningProcess -ErrorAction SilentlyContinue
        $name = if ($proc) { $proc.ProcessName } else { 'desconocido' }
        return "PID $($conn.OwningProcess) ($name)"
    }
    return $null
}

function Test-PortInUse([int]$Port) {
    return [bool](Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue)
}

function Assert-PortFree([int]$Port, [string]$Servicio) {
    $owner = Get-PortOwner $Port
    if ($owner) {
        Write-Err "El puerto $Port (necesario para $Servicio) ya está en uso por: $owner"
        Write-Err "Cierra ese proceso o relanza con otro puerto. Ej.: .\script\deploy.ps1 -${Servicio}Port <otroPuerto>"
        exit 1
    }
    Write-Ok "Puerto $Port libre para $Servicio."
}

function Test-Command([string]$Name) {
    return [bool](Get-Command $Name -ErrorAction SilentlyContinue)
}

function Test-DockerRunning() {
    if (-not (Test-Command 'docker')) { return $false }
    try { docker info *> $null; return ($LASTEXITCODE -eq 0) } catch { return $false }
}

function Get-ContainerState([string]$Name) {
    # Devuelve 'running', 'exited', 'created'... o $null si no existe.
    return (docker ps -a --filter "name=^/$Name$" --format '{{.State}}' 2>$null | Select-Object -First 1)
}

# ── 0. Banner ────────────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "  URBAN ALERT  ·  despliegue local" -ForegroundColor Magenta
Write-Host "  backend :$BackendPort   frontend :$FrontendPort   db :$DbPort" -ForegroundColor DarkGray

# ── 1. Prerrequisitos ────────────────────────────────────────────────────────────
Write-Step "Comprobando herramientas"
foreach ($tool in 'python', 'node', 'npm') {
    if (-not (Test-Command $tool)) {
        Write-Err "No se encontró '$tool' en el PATH. Instálalo y vuelve a intentarlo."
        exit 1
    }
}
Write-Ok "python, node y npm disponibles."

# ── 2. Puertos de las apps (estos SÍ deben estar libres) ─────────────────────────
Write-Step "Verificando puertos de las aplicaciones"
Assert-PortFree $BackendPort 'Backend'
Assert-PortFree $FrontendPort 'Frontend'

# ── 3. Base de datos (contenedor Docker dedicado) ────────────────────────────────
if ($SkipDb) {
    Write-Warn2 "-SkipDb activo: no se gestiona la base de datos (se usará DATABASE_URL/alembic.ini)."
}
else {
    Write-Step "Base de datos PostgreSQL (contenedor '$DbContainer' :$DbPort)"
    if (-not (Test-DockerRunning)) {
        Write-Err "Docker no está disponible/arrancado. Abre Docker Desktop y reintenta,"
        Write-Err "o relanza con -SkipDb si la BD ya está accesible por otra vía."
        exit 1
    }

    # El backend (y alembic) usarán esta URL.
    $env:DATABASE_URL = $DatabaseUrl

    $state = Get-ContainerState $DbContainer
    if ($state -eq 'running') {
        Write-Ok "El contenedor '$DbContainer' ya está en marcha."
    }
    elseif ($state) {
        Write-Host "Arrancando el contenedor existente '$DbContainer'..."
        docker start $DbContainer *> $null
        if ($LASTEXITCODE -ne 0) { Write-Err "No se pudo arrancar '$DbContainer'."; exit 1 }
        Write-Ok "Contenedor arrancado."
    }
    else {
        # No existe: hay que crearlo, así que el puerto host debe estar libre.
        if (Test-PortInUse $DbPort) {
            Write-Err "El puerto $DbPort (BD) está ocupado por $(Get-PortOwner $DbPort) y no existe el contenedor '$DbContainer'."
            Write-Err "Relanza con otro puerto: .\script\deploy.ps1 -DbPort <otroPuerto>"
            exit 1
        }
        Write-Host "Creando contenedor '$DbContainer' (imagen $DbImage) en :$DbPort..."
        docker run -d --name $DbContainer `
            -e POSTGRES_USER=$DbUser -e POSTGRES_PASSWORD=$DbPassword -e POSTGRES_DB=$DbName `
            -p "${DbPort}:5432" -v "${DbVolume}:/var/lib/postgresql" `
            --restart unless-stopped $DbImage *> $null
        if ($LASTEXITCODE -ne 0) { Write-Err "No se pudo crear el contenedor de la BD."; exit 1 }
        Write-Ok "Contenedor creado."
    }

    Write-Host "Esperando a que PostgreSQL acepte conexiones..."
    $ready = $false
    for ($i = 0; $i -lt 30; $i++) {
        docker exec $DbContainer pg_isready -U $DbUser -d $DbName *> $null
        if ($LASTEXITCODE -eq 0) { $ready = $true; break }
        Start-Sleep -Seconds 1
    }
    if (-not $ready) {
        Write-Err "PostgreSQL no respondió a tiempo. Últimos logs del contenedor:"
        docker logs --tail 20 $DbContainer
        exit 1
    }
    Write-Ok "PostgreSQL listo en localhost:$DbPort (BD '$DbName')."
}

# ── 4. Backend: dependencias + migraciones ───────────────────────────────────────
Write-Step "Configurando backend (FastAPI)"
$venv       = Join-Path $Backend 'venv'
$venvPython = Join-Path $venv 'Scripts\python.exe'
$uvicorn    = Join-Path $venv 'Scripts\uvicorn.exe'
$alembic    = Join-Path $venv 'Scripts\alembic.exe'

if (-not (Test-Path $venvPython)) {
    Write-Host "Creando entorno virtual..."
    python -m venv $venv
}
if (-not $SkipInstall) {
    Write-Host "Instalando dependencias del backend..."
    & $venvPython -m pip install --upgrade pip --quiet
    & $venvPython -m pip install -r (Join-Path $Backend 'requirements.txt') --quiet
    Write-Ok "Dependencias del backend listas."
}

if (-not $SkipDb) {
    Write-Host "Aplicando migraciones (alembic upgrade head)..."
    Push-Location $Backend
    try {
        & $alembic upgrade head
        if ($LASTEXITCODE -eq 0) { Write-Ok "Migraciones aplicadas." }
        else { Write-Warn2 "Las migraciones no se aplicaron (¿BD no accesible?). El backend arrancará igualmente." }
    }
    catch { Write-Warn2 "No se pudieron aplicar migraciones: $($_.Exception.Message)" }
    finally { Pop-Location }
}

# ── 5. Frontend: dependencias ────────────────────────────────────────────────────
Write-Step "Configurando frontend (Angular/Ionic)"
if (-not $SkipInstall -and -not (Test-Path (Join-Path $Frontend 'node_modules'))) {
    Write-Host "Instalando dependencias del frontend (npm install)..."
    Push-Location $Frontend
    try { npm install } finally { Pop-Location }
    if ($LASTEXITCODE -ne 0) { Write-Err "Falló 'npm install'."; exit 1 }
    Write-Ok "Dependencias del frontend listas."
}
else {
    Write-Ok "node_modules presente (o -SkipInstall)."
}

# ── 6. Arranque (cada servicio en su propia ventana) ─────────────────────────────
Write-Step "Arrancando servicios"

# Reverificación por si algo ocupó los puertos durante la instalación.
Assert-PortFree $BackendPort 'Backend'
Assert-PortFree $FrontendPort 'Frontend'

Write-Host "Lanzando backend (uvicorn) en :$BackendPort ..."
Start-Process -FilePath $uvicorn `
    -ArgumentList 'main:app', '--reload', '--host', '127.0.0.1', '--port', "$BackendPort" `
    -WorkingDirectory $Backend
Write-Ok "Backend lanzado -> http://localhost:$BackendPort/docs"

Write-Host "Lanzando frontend (ng serve) en :$FrontendPort ..."
Start-Process -FilePath 'npx.cmd' `
    -ArgumentList 'ng', 'serve', '--host', 'localhost', '--port', "$FrontendPort" `
    -WorkingDirectory $Frontend
Write-Ok "Frontend lanzado -> http://localhost:$FrontendPort"

# ── 7. Resumen ───────────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "──────────────────────────────────────────────" -ForegroundColor DarkGray
Write-Ok "Despliegue iniciado. Cada servicio corre en su propia ventana."
if (-not $SkipDb) {
    Write-Host "  • Base de datos : PostgreSQL (contenedor '$DbContainer') en localhost:$DbPort" -ForegroundColor White
}
Write-Host "  • API / Swagger : http://localhost:$BackendPort/docs" -ForegroundColor White
Write-Host "  • Frontend      : http://localhost:$FrontendPort" -ForegroundColor White
Write-Host "  (el frontend tarda unos segundos en compilar la primera vez)" -ForegroundColor DarkGray
Write-Host "  Para detener: cierra las ventanas abiertas (Ctrl+C en cada una)." -ForegroundColor DarkGray
Write-Host "──────────────────────────────────────────────" -ForegroundColor DarkGray
