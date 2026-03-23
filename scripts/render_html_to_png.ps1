param(
    [Parameter(Mandatory = $true)]
    [string]$InputPath,

    [Parameter(Mandatory = $true)]
    [string]$OutputPath,

    [int]$Width = 1440,
    [int]$Height = 1024,
    [int]$DelayMs = 1200
)

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

$target = if ($InputPath -match '^[a-zA-Z][a-zA-Z0-9+.-]*://') {
    $InputPath
} else {
    'file:///' + ((Resolve-Path $InputPath).Path -replace '\\', '/')
}
$resolvedOutput = [System.IO.Path]::GetFullPath($OutputPath)
[System.IO.Directory]::CreateDirectory([System.IO.Path]::GetDirectoryName($resolvedOutput)) | Out-Null

$form = New-Object System.Windows.Forms.Form
$form.Width = $Width
$form.Height = $Height
$form.ShowInTaskbar = $false
$form.StartPosition = 'Manual'
$form.Location = New-Object System.Drawing.Point(-32000, -32000)

$browser = New-Object System.Windows.Forms.WebBrowser
$browser.ScriptErrorsSuppressed = $true
$browser.ScrollBarsEnabled = $false
$browser.Dock = 'Fill'
$form.Controls.Add($browser)

$script:documentLoaded = $false
$browser.add_DocumentCompleted({
    $script:documentLoaded = $true
})

try {
    $form.Show()
    $browser.Navigate($target)

    $stopwatch = [System.Diagnostics.Stopwatch]::StartNew()
    while (-not $script:documentLoaded -and $stopwatch.Elapsed.TotalSeconds -lt 20) {
        [System.Windows.Forms.Application]::DoEvents()
        Start-Sleep -Milliseconds 100
    }

    Start-Sleep -Milliseconds $DelayMs
    [System.Windows.Forms.Application]::DoEvents()

    $bitmap = New-Object System.Drawing.Bitmap $browser.Width, $browser.Height
    $browser.DrawToBitmap($bitmap, (New-Object System.Drawing.Rectangle 0, 0, $browser.Width, $browser.Height))
    $bitmap.Save($resolvedOutput, [System.Drawing.Imaging.ImageFormat]::Png)
    $bitmap.Dispose()
    Write-Output $resolvedOutput
}
finally {
    $browser.Dispose()
    $form.Close()
    $form.Dispose()
}
