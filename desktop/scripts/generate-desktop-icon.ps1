param(
    [string]$OutputDir = (Join-Path (Split-Path -Parent $PSScriptRoot) 'build')
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

Add-Type -AssemblyName System.Drawing
Add-Type @"
using System;
using System.Runtime.InteropServices;

public static class AgoraIconNative
{
    [DllImport("user32.dll", CharSet = CharSet.Auto)]
    public static extern bool DestroyIcon(IntPtr handle);
}
"@

function New-RoundedRectanglePath {
    param(
        [System.Drawing.RectangleF]$Rectangle,
        [float]$Radius
    )

    $diameter = [Math]::Max(1, $Radius * 2)
    $path = New-Object System.Drawing.Drawing2D.GraphicsPath
    $path.AddArc($Rectangle.X, $Rectangle.Y, $diameter, $diameter, 180, 90)
    $path.AddArc($Rectangle.Right - $diameter, $Rectangle.Y, $diameter, $diameter, 270, 90)
    $path.AddArc($Rectangle.Right - $diameter, $Rectangle.Bottom - $diameter, $diameter, $diameter, 0, 90)
    $path.AddArc($Rectangle.X, $Rectangle.Bottom - $diameter, $diameter, $diameter, 90, 90)
    $path.CloseFigure()
    return $path
}

function New-AgoraBitmap {
    param(
        [int]$Size
    )

    $bitmap = New-Object System.Drawing.Bitmap $Size, $Size, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    try {
        $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
        $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
        $graphics.Clear([System.Drawing.Color]::Transparent)

        $backgroundRect = [System.Drawing.RectangleF]::new(4 * $Size / 256, 4 * $Size / 256, $Size - (8 * $Size / 256), $Size - (8 * $Size / 256))
        $backgroundPath = New-RoundedRectanglePath -Rectangle $backgroundRect -Radius (56 * $Size / 256)
        try {
            $gradient = [System.Drawing.Drawing2D.LinearGradientBrush]::new(
                [System.Drawing.PointF]::new(0, 0),
                [System.Drawing.PointF]::new($Size, $Size),
                [System.Drawing.ColorTranslator]::FromHtml('#0E1828'),
                [System.Drawing.ColorTranslator]::FromHtml('#172A45')
            )
            try {
                $graphics.FillPath($gradient, $backgroundPath)
            } finally {
                $gradient.Dispose()
            }

            $glowBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(36, 124, 203, 255))
            try {
                $graphics.FillEllipse($glowBrush, 28 * $Size / 256, 18 * $Size / 256, 200 * $Size / 256, 200 * $Size / 256)
            } finally {
                $glowBrush.Dispose()
            }
        } finally {
            $backgroundPath.Dispose()
        }

        $strokeWidth = [Math]::Max(4, [Math]::Round(28 * $Size / 256))
        $leftPen = New-Object System.Drawing.Pen ([System.Drawing.ColorTranslator]::FromHtml('#8EC5FF'), $strokeWidth)
        $rightPen = New-Object System.Drawing.Pen ([System.Drawing.ColorTranslator]::FromHtml('#D7B27C'), $strokeWidth)
        $leftPen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
        $leftPen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
        $rightPen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
        $rightPen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
        try {
            $graphics.DrawLine($leftPen, 72 * $Size / 256, 196 * $Size / 256, 128 * $Size / 256, 58 * $Size / 256)
            $graphics.DrawLine($rightPen, 128 * $Size / 256, 58 * $Size / 256, 184 * $Size / 256, 196 * $Size / 256)
        } finally {
            $leftPen.Dispose()
            $rightPen.Dispose()
        }

        $crossbarBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.ColorTranslator]::FromHtml('#F3F7FF'))
        try {
            $crossbarPath = New-RoundedRectanglePath -Rectangle ([System.Drawing.RectangleF]::new(
                94 * $Size / 256,
                124 * $Size / 256,
                68 * $Size / 256,
                24 * $Size / 256
            )) -Radius (10 * $Size / 256)
            try {
                $graphics.FillPath($crossbarBrush, $crossbarPath)
            } finally {
                $crossbarPath.Dispose()
            }
        } finally {
            $crossbarBrush.Dispose()
        }

        $dotBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(225, 243, 247, 255))
        try {
            $graphics.FillEllipse($dotBrush, 186 * $Size / 256, 50 * $Size / 256, 22 * $Size / 256, 22 * $Size / 256)
        } finally {
            $dotBrush.Dispose()
        }

        return $bitmap
    } catch {
        $bitmap.Dispose()
        throw
    } finally {
        $graphics.Dispose()
    }
}

function Save-BitmapAsIcon {
    param(
        [System.Drawing.Bitmap]$Bitmap,
        [string]$DestinationPath
    )

    $iconHandle = $Bitmap.GetHicon()
    $icon = [System.Drawing.Icon]::FromHandle($iconHandle)
    try {
        $stream = [System.IO.File]::Open($DestinationPath, [System.IO.FileMode]::Create, [System.IO.FileAccess]::Write)
        try {
            $icon.Save($stream)
        } finally {
            $stream.Dispose()
        }
    } finally {
        $icon.Dispose()
        [AgoraIconNative]::DestroyIcon($iconHandle) | Out-Null
    }
}

$resolvedOutputDir = [System.IO.Path]::GetFullPath($OutputDir)
[System.IO.Directory]::CreateDirectory($resolvedOutputDir) | Out-Null

$iconBitmap = New-AgoraBitmap -Size 256
try {
    $iconPath = Join-Path $resolvedOutputDir 'icon.ico'
    Save-BitmapAsIcon -Bitmap $iconBitmap -DestinationPath $iconPath

    $preview = New-AgoraBitmap -Size 512
    try {
        $previewPath = Join-Path $resolvedOutputDir 'icon.png'
        $preview.Save($previewPath, [System.Drawing.Imaging.ImageFormat]::Png)
    } finally {
        $preview.Dispose()
    }

    Write-Output "Icono generado en $iconPath"
} finally {
    $iconBitmap.Dispose()
}
