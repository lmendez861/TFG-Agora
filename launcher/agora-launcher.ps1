param(
    [int]$Port = 8000,
    [switch]$Build,
    [switch]$PublicTunnel,
    [switch]$NoOpen,
    [switch]$SkipInstall,
    [switch]$SkipDbSetup
)

$ErrorActionPreference = 'Stop'

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RootDir = (Resolve-Path (Join-Path $ScriptDir '..')).Path
$BackendDir = Join-Path $RootDir 'backend'
$InternalAppDir = Join-Path $RootDir 'frontend\app'
$ExternalAppDir = Join-Path $RootDir 'frontend\company-portal'
$ToolsDir = Join-Path $RootDir 'tools'

function Write-Step {
    param([string]$Message)
    Write-Host "[Agora] $Message"
}

function Get-ExistingCommand {
    param(
        [string[]]$KnownPaths,
        [string[]]$Names,
        [string]$MissingMessage
    )

    foreach ($Path in $KnownPaths) {
        if ($Path -and (Test-Path $Path)) {
            return $Path
        }
    }

    foreach ($Name in $Names) {
        $Command = Get-Command $Name -ErrorAction SilentlyContinue
        if ($Command) {
            return $Command.Source
        }
    }

    throw $MissingMessage
}

function Get-PhpPath {
    Get-ExistingCommand `
        -KnownPaths @('C:\xampp\php\php.exe') `
        -Names @('php.exe', 'php') `
        -MissingMessage 'No se encontro PHP. Instala PHP 8.2+ o XAMPP con PHP en C:\xampp\php\php.exe.'
}

function Get-NpmPath {
    Get-ExistingCommand `
        -KnownPaths @('C:\Program Files\nodejs\npm.cmd') `
        -Names @('npm.cmd', 'npm') `
        -MissingMessage 'No se encontro npm. Instala Node.js antes de generar la build o instalar dependencias.'
}

function Get-ComposerPath {
    Get-ExistingCommand `
        -KnownPaths @('C:\ProgramData\ComposerSetup\bin\composer.bat') `
        -Names @('composer.bat', 'composer') `
        -MissingMessage 'No se encontro Composer. Instalalo para preparar el backend por primera vez.'
}

function Copy-EnvIfMissing {
    param(
        [string]$ExamplePath,
        [string]$TargetPath
    )

    if ((Test-Path $TargetPath) -or !(Test-Path $ExamplePath)) {
        return
    }

    Copy-Item -LiteralPath $ExamplePath -Destination $TargetPath
    $RelativeTarget = Resolve-Path -LiteralPath $TargetPath -Relative
    Write-Step "Creado $RelativeTarget desde el ejemplo."
}

function Invoke-Checked {
    param(
        [string]$FilePath,
        [string[]]$Arguments,
        [string]$WorkingDirectory,
        [string]$Label
    )

    Write-Step $Label
    Push-Location $WorkingDirectory
    try {
        & $FilePath @Arguments
        if ($LASTEXITCODE -ne 0) {
            throw "Fallo el comando: $FilePath $($Arguments -join ' ')"
        }
    }
    finally {
        Pop-Location
    }
}

function Test-UrlResponsive {
    param([string]$Url)

    try {
        Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 3 -MaximumRedirection 0 | Out-Null
        return $true
    }
    catch {
        if ($_.Exception.Response) {
            return $true
        }
        return $false
    }
}

function Wait-ForUrl {
    param(
        [string]$Url,
        [int]$TimeoutSeconds = 25
    )

    $Deadline = (Get-Date).AddSeconds($TimeoutSeconds)
    while ((Get-Date) -lt $Deadline) {
        if (Test-UrlResponsive $Url) {
            return
        }
        Start-Sleep -Seconds 1
    }

    throw "El servidor no respondio a tiempo en $Url."
}

function Ensure-ProjectPrepared {
    param(
        [string]$PhpPath,
        [string]$NpmPath
    )

    Copy-EnvIfMissing `
        -ExamplePath (Join-Path $BackendDir '.env.local.example') `
        -TargetPath (Join-Path $BackendDir '.env.local')
    Copy-EnvIfMissing `
        -ExamplePath (Join-Path $InternalAppDir '.env.example') `
        -TargetPath (Join-Path $InternalAppDir '.env.local')
    Copy-EnvIfMissing `
        -ExamplePath (Join-Path $ExternalAppDir '.env.example') `
        -TargetPath (Join-Path $ExternalAppDir '.env.local')

    if (!$SkipInstall) {
        if (!(Test-Path (Join-Path $BackendDir 'vendor\autoload.php'))) {
            $ComposerPath = Get-ComposerPath
            Invoke-Checked `
                -FilePath $ComposerPath `
                -Arguments @('install') `
                -WorkingDirectory $BackendDir `
                -Label 'Instalando dependencias PHP del backend...'
        }

        if (!(Test-Path (Join-Path $InternalAppDir 'node_modules'))) {
            Invoke-Checked `
                -FilePath $NpmPath `
                -Arguments @('install') `
                -WorkingDirectory $InternalAppDir `
                -Label 'Instalando dependencias del portal interno...'
        }

        if (!(Test-Path (Join-Path $ExternalAppDir 'node_modules'))) {
            Invoke-Checked `
                -FilePath $NpmPath `
                -Arguments @('install') `
                -WorkingDirectory $ExternalAppDir `
                -Label 'Instalando dependencias del portal externo...'
        }
    }

    if (!$SkipDbSetup) {
        $DefaultSqliteDb = Join-Path $BackendDir 'var\data_dev.sqlite'
        $DbWasMissing = !(Test-Path $DefaultSqliteDb)

        Invoke-Checked `
            -FilePath $PhpPath `
            -Arguments @('bin/console', 'doctrine:migrations:migrate', '--no-interaction') `
            -WorkingDirectory $BackendDir `
            -Label 'Comprobando migraciones de base de datos...'

        if ($DbWasMissing) {
            Invoke-Checked `
                -FilePath $PhpPath `
                -Arguments @('bin/console', 'doctrine:fixtures:load', '--no-interaction') `
                -WorkingDirectory $BackendDir `
                -Label 'Cargando datos iniciales de demo...'
        }
    }

    $InternalBuild = Join-Path $BackendDir 'public\app\index.html'
    $ExternalBuild = Join-Path $BackendDir 'public\externo\index.html'
    if ($Build -or !(Test-Path $InternalBuild) -or !(Test-Path $ExternalBuild)) {
        Invoke-Checked `
            -FilePath $NpmPath `
            -Arguments @('--prefix', $InternalAppDir, 'run', 'build:backend') `
            -WorkingDirectory $RootDir `
            -Label 'Generando build integrada del portal interno...'

        Invoke-Checked `
            -FilePath $NpmPath `
            -Arguments @('--prefix', $ExternalAppDir, 'run', 'build:backend') `
            -WorkingDirectory $RootDir `
            -Label 'Generando build integrada del portal externo...'
    }
}

function Start-Backend {
    param(
        [string]$PhpPath,
        [int]$Port
    )

    $InternalUrl = "http://127.0.0.1:$Port/app"
    if (Test-UrlResponsive $InternalUrl) {
        Write-Step "El backend ya esta levantado en $InternalUrl."
        return
    }

    $OutLog = Join-Path $RootDir 'backend-server.out.log'
    $ErrLog = Join-Path $RootDir 'backend-server.err.log'
    $PidFile = Join-Path $BackendDir 'var\agora-launcher-backend.pid'

    Write-Step "Levantando backend local en http://127.0.0.1:$Port ..."
    $Process = Start-Process `
        -FilePath $PhpPath `
        -ArgumentList @('-S', "0.0.0.0:$Port", '-t', 'public', 'public/router.php') `
        -WorkingDirectory $BackendDir `
        -RedirectStandardOutput $OutLog `
        -RedirectStandardError $ErrLog `
        -WindowStyle Hidden `
        -PassThru

    Set-Content -LiteralPath $PidFile -Value $Process.Id
    Wait-ForUrl -Url $InternalUrl -TimeoutSeconds 25
}

function Ensure-Cloudflared {
    if (!(Test-Path $ToolsDir)) {
        New-Item -ItemType Directory -Path $ToolsDir | Out-Null
    }

    $Cloudflared = Join-Path $ToolsDir 'cloudflared.exe'
    if (Test-Path $Cloudflared) {
        return $Cloudflared
    }

    Write-Step 'Descargando cloudflared para crear la URL externa temporal...'
    Invoke-WebRequest `
        -Uri 'https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe' `
        -OutFile $Cloudflared

    return $Cloudflared
}

function Start-PublicTunnel {
    param([int]$Port)

    $Cloudflared = Ensure-Cloudflared
    $OutLog = Join-Path $RootDir 'cloudflared.out.log'
    $ErrLog = Join-Path $RootDir 'cloudflared.err.log'
    $PidFile = Join-Path $ToolsDir 'agora-launcher-cloudflared.pid'

    Remove-Item -LiteralPath $OutLog, $ErrLog -Force -ErrorAction SilentlyContinue

    Write-Step 'Abriendo tunel publico temporal con Cloudflare...'
    $Process = Start-Process `
        -FilePath $Cloudflared `
        -ArgumentList @('tunnel', '--no-autoupdate', '--url', "http://127.0.0.1:$Port") `
        -WorkingDirectory $RootDir `
        -RedirectStandardOutput $OutLog `
        -RedirectStandardError $ErrLog `
        -WindowStyle Hidden `
        -PassThru

    Set-Content -LiteralPath $PidFile -Value $Process.Id

    $Deadline = (Get-Date).AddSeconds(45)
    while ((Get-Date) -lt $Deadline) {
        $CombinedLog = ''
        if (Test-Path $OutLog) {
            $CombinedLog += Get-Content $OutLog -Raw -ErrorAction SilentlyContinue
        }
        if (Test-Path $ErrLog) {
            $CombinedLog += Get-Content $ErrLog -Raw -ErrorAction SilentlyContinue
        }

        $Match = [regex]::Match($CombinedLog, 'https://[-a-zA-Z0-9.]+\.trycloudflare\.com')
        if ($Match.Success) {
            return $Match.Value
        }

        Start-Sleep -Seconds 1
    }

    throw "No se pudo detectar la URL externa. Revisa $ErrLog."
}

Write-Host ''
Write-Host '==================================='
Write-Host '  AGORA - LAUNCHER LOCAL'
Write-Host '==================================='
Write-Host ''

$PhpPath = Get-PhpPath
$NpmPath = Get-NpmPath

Ensure-ProjectPrepared -PhpPath $PhpPath -NpmPath $NpmPath
Start-Backend -PhpPath $PhpPath -Port $Port

$InternalUrl = "http://127.0.0.1:$Port/app"
$PublicUrl = $null
if ($PublicTunnel) {
    $PublicUrl = Start-PublicTunnel -Port $Port
}

Write-Host ''
Write-Host 'Servicios listos:'
Write-Host "  Portal interno local: $InternalUrl"
Write-Host "  Portal externo local: http://127.0.0.1:$Port/externo"
if ($PublicUrl) {
    Write-Host "  Portal externo publico: $PublicUrl/externo"
    Write-Host "  Portal interno publico: $PublicUrl/app"
}
Write-Host ''

if (!$NoOpen) {
    Start-Process $InternalUrl
    if ($PublicUrl) {
        Start-Process "$PublicUrl/externo"
    }
}
