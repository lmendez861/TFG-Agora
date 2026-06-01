param(
    [switch]$AllProjectServices
)

$ErrorActionPreference = 'Stop'

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RootDir = (Resolve-Path (Join-Path $ScriptDir '..')).Path
$PidFiles = @(
    (Join-Path $RootDir 'backend\var\agora-launcher-backend.pid'),
    (Join-Path $RootDir 'tools\agora-launcher-cloudflared.pid')
)

function Stop-FromPidFile {
    param([string]$PidFile)

    if (!(Test-Path $PidFile)) {
        return
    }

    $RawPid = (Get-Content -LiteralPath $PidFile -ErrorAction SilentlyContinue | Select-Object -First 1)
    if (!$RawPid) {
        Remove-Item -LiteralPath $PidFile -Force -ErrorAction SilentlyContinue
        return
    }

    $ProcessId = [int]$RawPid
    $Process = Get-Process -Id $ProcessId -ErrorAction SilentlyContinue
    if ($Process) {
        Write-Host "[Agora] Deteniendo proceso $ProcessId ($($Process.ProcessName))..."
        Stop-Process -Id $ProcessId -Force
    }

    Remove-Item -LiteralPath $PidFile -Force -ErrorAction SilentlyContinue
}

foreach ($PidFile in $PidFiles) {
    Stop-FromPidFile -PidFile $PidFile
}

if ($AllProjectServices) {
    $Processes = Get-CimInstance Win32_Process | Where-Object {
        $_.CommandLine -and
        $_.CommandLine -match [regex]::Escape($RootDir) -and
        ($_.Name -in @('php.exe', 'node.exe', 'cmd.exe', 'cloudflared.exe'))
    }

    foreach ($Process in $Processes) {
        Write-Host "[Agora] Deteniendo proceso del proyecto $($Process.ProcessId) ($($Process.Name))..."
        Stop-Process -Id $Process.ProcessId -Force -ErrorAction SilentlyContinue
    }
}

Write-Host '[Agora] Stop completado.'
