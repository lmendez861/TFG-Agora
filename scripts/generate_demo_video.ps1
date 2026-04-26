$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$captures = Join-Path $root 'docs\capturas'
$outputDir = Join-Path $root 'docs\video'
$pptxPath = Join-Path $outputDir 'demo-portales-interno-externo.pptx'
$mp4Path = Join-Path $outputDir 'demo-portales-interno-externo.mp4'
$csvPath = Join-Path $outputDir 'agora-solicitudes-demo.csv'
$xlsxPath = Join-Path $outputDir 'agora-solicitudes-demo.xlsx'

New-Item -ItemType Directory -Path $outputDir -Force | Out-Null

function Set-ShapeText {
    param(
        $Shape,
        [string] $Text,
        [int] $FontSize = 24,
        [int] $Rgb = 0xF5F7FB,
        [bool] $Bold = $false,
        [string] $FontName = 'Segoe UI'
    )

    $Shape.TextFrame.TextRange.Text = $Text
    $Shape.TextFrame.TextRange.Font.Size = $FontSize
    $Shape.TextFrame.TextRange.Font.Bold = [int]$Bold
    $Shape.TextFrame.TextRange.Font.Name = $FontName
    $Shape.TextFrame.TextRange.Font.Color.RGB = $Rgb
}

function Add-TextBox {
    param(
        $Slide,
        [double] $Left,
        [double] $Top,
        [double] $Width,
        [double] $Height,
        [string] $Text,
        [int] $FontSize = 24,
        [int] $Rgb = 0xF5F7FB,
        [bool] $Bold = $false,
        [string] $FontName = 'Segoe UI'
    )

    $shape = $Slide.Shapes.AddTextbox(1, $Left, $Top, $Width, $Height)
    $shape.TextFrame.WordWrap = $true
    $shape.TextFrame.AutoSize = 0
    Set-ShapeText -Shape $shape -Text $Text -FontSize $FontSize -Rgb $Rgb -Bold $Bold -FontName $FontName
    return $shape
}

function Add-SlideBase {
    param(
        $Presentation,
        [int] $Index,
        [string] $Eyebrow,
        [string] $Title,
        [string] $Body,
        [int] $DurationSeconds = 18
    )

    $slide = $Presentation.Slides.Add($Index, 12)
    $slide.FollowMasterBackground = $false
    $slide.Background.Fill.ForeColor.RGB = 0x101319
    $slide.Background.Fill.Solid()

    $null = Add-TextBox -Slide $slide -Left 42 -Top 32 -Width 500 -Height 24 -Text $Eyebrow -FontSize 14 -Rgb 0xC39A5C
    $null = Add-TextBox -Slide $slide -Left 42 -Top 62 -Width 560 -Height 120 -Text $Title -FontSize 28 -Rgb 0xF7F8FC -Bold $true
    $null = Add-TextBox -Slide $slide -Left 42 -Top 160 -Width 560 -Height 220 -Text $Body -FontSize 16 -Rgb 0xC8D0DC

    $slide.SlideShowTransition.AdvanceOnTime = $true
    $slide.SlideShowTransition.AdvanceTime = $DurationSeconds

    return $slide
}

function Add-CaptureSlide {
    param(
        $Presentation,
        [int] $Index,
        [string] $Eyebrow,
        [string] $Title,
        [string] $Body,
        [string] $CapturePath,
        [int] $DurationSeconds = 20
    )

    $slide = Add-SlideBase -Presentation $Presentation -Index $Index -Eyebrow $Eyebrow -Title $Title -Body $Body -DurationSeconds $DurationSeconds
    $null = $slide.Shapes.AddPicture($CapturePath, $false, $true, 620, 52, 620, 349)
    return $slide
}

function Add-CodePanel {
    param(
        $Slide,
        [double] $Left,
        [double] $Top,
        [double] $Width,
        [double] $Height,
        [string] $Text
    )

    $shape = $Slide.Shapes.AddShape(1, $Left, $Top, $Width, $Height)
    $shape.Fill.ForeColor.RGB = 0x151C27
    $shape.Line.ForeColor.RGB = 0x2B3647
    $shape.Line.Weight = 1.25
    $shape.TextFrame.MarginLeft = 14
    $shape.TextFrame.MarginRight = 14
    $shape.TextFrame.MarginTop = 14
    $shape.TextFrame.MarginBottom = 14
    Set-ShapeText -Shape $shape -Text $Text -FontSize 13 -Rgb 0xE8EDF7 -FontName 'Consolas'
    return $shape
}

function Add-CsvTable {
    param(
        $Slide,
        [array] $Rows,
        [double] $Left,
        [double] $Top,
        [double] $Width,
        [double] $Height
    )

    $headers = @('ID', 'Empresa', 'Correo', 'Estado', 'Alta', 'Aprobada')
    $tableShape = $Slide.Shapes.AddTable($Rows.Count + 1, $headers.Count, $Left, $Top, $Width, $Height)
    $table = $tableShape.Table
    $columnWidths = @(42, 170, 175, 75, 88, 88)

    for ($columnIndex = 1; $columnIndex -le $headers.Count; $columnIndex++) {
        $table.Columns.Item($columnIndex).Width = $columnWidths[$columnIndex - 1]
        $headerCell = $table.Cell(1, $columnIndex).Shape
        $headerCell.Fill.ForeColor.RGB = 0x217346
        $headerCell.TextFrame.MarginLeft = 6
        $headerCell.TextFrame.MarginRight = 6
        $headerCell.TextFrame.TextRange.Text = $headers[$columnIndex - 1]
        $headerCell.TextFrame.TextRange.Font.Name = 'Calibri'
        $headerCell.TextFrame.TextRange.Font.Size = 12
        $headerCell.TextFrame.TextRange.Font.Bold = -1
        $headerCell.TextFrame.TextRange.Font.Color.RGB = 0xFFFFFF
    }

    for ($rowIndex = 0; $rowIndex -lt $Rows.Count; $rowIndex++) {
        $rowData = $Rows[$rowIndex]
        $values = @(
            $rowData.ID,
            $rowData.Empresa,
            $rowData.Correo,
            $rowData.Estado,
            $rowData.Alta,
            $rowData.Aprobada
        )

        for ($columnIndex = 1; $columnIndex -le $headers.Count; $columnIndex++) {
            $cellShape = $table.Cell($rowIndex + 2, $columnIndex).Shape
            $cellShape.Fill.ForeColor.RGB = $(if (($rowIndex % 2) -eq 0) { 0xF7FAFD } else { 0xEDF3F9 })
            $cellShape.TextFrame.MarginLeft = 6
            $cellShape.TextFrame.MarginRight = 6
            $cellShape.TextFrame.TextRange.Text = [string]$values[$columnIndex - 1]
            $cellShape.TextFrame.TextRange.Font.Name = 'Calibri'
            $cellShape.TextFrame.TextRange.Font.Size = 10
            $cellShape.TextFrame.TextRange.Font.Color.RGB = 0x1F2937
        }
    }

    return $tableShape
}

function Get-OleColor {
    param(
        [int] $Red,
        [int] $Green,
        [int] $Blue
    )

    return [int]($Red + ($Green * 256) + ($Blue * 65536))
}

function Export-DemoCsv {
    $pair = 'admin:admin123'
    $token = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes($pair))
    $headers = @{ Authorization = "Basic $token"; Accept = 'text/csv' }
    Invoke-WebRequest -Uri 'http://127.0.0.1:8000/api/export/empresa-solicitudes.csv' -Headers $headers -OutFile $csvPath | Out-Null
}

function Convert-DemoCsvField {
    param(
        [AllowNull()]
        [string] $Value
    )

    if ($null -eq $Value) {
        return ''
    }

    $requiresQuotes = $Value.Contains(';') -or $Value.Contains('"') -or $Value.Contains("`n") -or $Value.Contains("`r")
    $escapedValue = $Value.Replace('"', '""')
    if ($requiresQuotes) {
        return '"' + $escapedValue + '"'
    }

    return $escapedValue
}

function Sanitize-DemoCsv {
    param(
        [string] $SourceCsvPath
    )

    if (-not (Test-Path $SourceCsvPath)) {
        throw 'No se encontro el CSV exportado para anonimizar la demo.'
    }

    $rows = Import-Csv -Path $SourceCsvPath -Delimiter ';'
    if (-not $rows -or $rows.Count -eq 0) {
        throw 'El CSV exportado esta vacio y no se puede preparar para la demo.'
    }

    for ($index = 0; $index -lt $rows.Count; $index++) {
        $itemNumber = $index + 1
        $label = $itemNumber.ToString('00')
        $row = $rows[$index]
        $row.nombre_empresa = "Empresa demo $label"
        $row.contacto_nombre = "Contacto demo $label"
        $row.contacto_email = "empresa$label@demo.local"
        if ($row.PSObject.Properties.Match('contacto_telefono').Count -gt 0) {
            $row.contacto_telefono = ('600000000' + $itemNumber).Substring(('600000000' + $itemNumber).Length - 9)
        }
        if ($row.PSObject.Properties.Match('web').Count -gt 0) {
            $row.web = "https://empresa-demo-$label.example"
        }
        if ($row.PSObject.Properties.Match('cif').Count -gt 0 -and [string]::IsNullOrWhiteSpace($row.cif)) {
            $row.cif = "DEMO$label"
        }
    }

    $headerNames = $rows[0].PSObject.Properties.Name
    $lines = @()
    $lines += ($headerNames -join ';')
    foreach ($row in $rows) {
        $fields = foreach ($headerName in $headerNames) {
            Convert-DemoCsvField -Value ([string]$row.$headerName)
        }
        $lines += ($fields -join ';')
    }

    Set-Content -Path $SourceCsvPath -Value $lines -Encoding UTF8
}

function Export-CsvWorkbook {
    param(
        [string] $SourceCsvPath,
        [string] $WorkbookPath
    )

    if (-not (Test-Path $SourceCsvPath)) {
        throw 'No se encontro el CSV de ejemplo para generar la vista ordenada.'
    }

    $rows = Import-Csv -Path $SourceCsvPath -Delimiter ';' | Select-Object -First 8
    if (-not $rows -or $rows.Count -eq 0) {
        throw 'El CSV de ejemplo no contiene datos para la vista previa.'
    }

    $columns = @(
        @{ Key = 'id'; Header = 'ID'; Width = 8 },
        @{ Key = 'nombre_empresa'; Header = 'Empresa'; Width = 28 },
        @{ Key = 'contacto_email'; Header = 'Correo'; Width = 30 },
        @{ Key = 'estado'; Header = 'Estado'; Width = 14 },
        @{ Key = 'creada_en'; Header = 'Alta'; Width = 19 },
        @{ Key = 'aprobado_en'; Header = 'Aprobada'; Width = 19 }
    )

    $excel = $null
    $workbook = $null

    try {
        $excel = New-Object -ComObject Excel.Application
        $excel.Visible = $false
        $excel.DisplayAlerts = $false

        $workbook = $excel.Workbooks.Add()
        $sheet = $workbook.Worksheets.Item(1)
        $sheet.Name = 'Solicitudes CSV'

        for ($index = 0; $index -lt $columns.Count; $index++) {
            $columnIndex = $index + 1
            $definition = $columns[$index]
            $sheet.Cells.Item(1, $columnIndex).Value2 = $definition.Header
            $sheet.Columns.Item($columnIndex).ColumnWidth = $definition.Width
        }

        $sheet.Rows.Item(1).RowHeight = 24

        for ($rowIndex = 0; $rowIndex -lt $rows.Count; $rowIndex++) {
            $targetRow = $rowIndex + 2
            $row = $rows[$rowIndex]
            for ($columnIndex = 0; $columnIndex -lt $columns.Count; $columnIndex++) {
                $definition = $columns[$columnIndex]
                $value = $row.($definition.Key)
                if ([string]::IsNullOrWhiteSpace($value)) {
                    $value = '-'
                }
                $sheet.Cells.Item($targetRow, $columnIndex + 1).Value2 = $value
            }
            $sheet.Rows.Item($targetRow).RowHeight = 22
        }

        $lastRow = $rows.Count + 1
        $lastColumn = $columns.Count
        $range = $sheet.Range($sheet.Cells.Item(1, 1), $sheet.Cells.Item($lastRow, $lastColumn))

        $range.Font.Name = 'Calibri'
        $range.Font.Size = 11
        $range.VerticalAlignment = -4108
        $range.HorizontalAlignment = -4131
        $range.Borders.LineStyle = 1
        $range.Borders.Weight = 2

        $headerRange = $sheet.Range($sheet.Cells.Item(1, 1), $sheet.Cells.Item(1, $lastColumn))
        $headerRange.Font.Bold = $true
        $headerRange.Font.Color = (Get-OleColor -Red 255 -Green 255 -Blue 255)
        $headerRange.Interior.Color = (Get-OleColor -Red 33 -Green 115 -Blue 70)

        for ($rowNumber = 2; $rowNumber -le $lastRow; $rowNumber++) {
            $rowRange = $sheet.Range($sheet.Cells.Item($rowNumber, 1), $sheet.Cells.Item($rowNumber, $lastColumn))
            if ($rowNumber % 2 -eq 0) {
                $rowRange.Interior.Color = (Get-OleColor -Red 244 -Green 247 -Blue 252)
            } else {
                $rowRange.Interior.Color = (Get-OleColor -Red 255 -Green 255 -Blue 255)
            }
        }

        $sheet.Cells.Item($lastRow + 2, 1).Value2 = 'Vista ordenada para la defensa: exportacion CSV abierta como hoja de calculo.'
        $sheet.Range($sheet.Cells.Item($lastRow + 2, 1), $sheet.Cells.Item($lastRow + 2, $lastColumn)).Merge()
        $sheet.Cells.Item($lastRow + 2, 1).Font.Italic = $true
        $sheet.Cells.Item($lastRow + 2, 1).Font.Size = 10
        $sheet.Cells.Item($lastRow + 2, 1).Font.Color = (Get-OleColor -Red 99 -Green 107 -Blue 120)

        $sheet.Activate() | Out-Null
        $excel.ActiveWindow.DisplayGridlines = $false
        $excel.ActiveWindow.Zoom = 85

        if (Test-Path $WorkbookPath) {
            Remove-Item $WorkbookPath -Force
        }

        $workbook.SaveAs($WorkbookPath, 51)
    }
    finally {
        if ($workbook) {
            $workbook.Close($false)
        }
        if ($excel) {
            $excel.Quit()
        }
    }
}

function Get-CsvPreviewRows {
    param(
        [string] $SourceCsvPath
    )

    $rawRows = Import-Csv -Path $SourceCsvPath -Delimiter ';' | Select-Object -First 6
    return $rawRows | ForEach-Object {
        [pscustomobject]@{
            ID = $_.id
            Empresa = $_.nombre_empresa
            Correo = $_.contacto_email
            Estado = $_.estado
            Alta = $_.creada_en
            Aprobada = if ([string]::IsNullOrWhiteSpace($_.aprobado_en)) { '-' } else { $_.aprobado_en }
        }
    }
}

Export-DemoCsv
Sanitize-DemoCsv -SourceCsvPath $csvPath
Export-CsvWorkbook -SourceCsvPath $csvPath -WorkbookPath $xlsxPath
$csvRows = Get-CsvPreviewRows -SourceCsvPath $csvPath

$powerPoint = $null
$presentation = $null

try {
    $powerPoint = New-Object -ComObject PowerPoint.Application
    $powerPoint.Visible = 1
    $presentation = $powerPoint.Presentations.Add()
    $presentation.PageSetup.SlideWidth = 1280
    $presentation.PageSetup.SlideHeight = 720

    Add-SlideBase -Presentation $presentation -Index 1 -Eyebrow 'TFG AGORA' -Title 'Demo guiada del portal interno y externo' -Body "En este video voy a ensenar el resultado final del proyecto de forma breve y ordenada.`n`nVoy a recorrer el acceso interno, una exportacion CSV real, la bandeja de mensajes, el portal externo, la documentacion y el monitor privado." -DurationSeconds 12 | Out-Null

    Add-CaptureSlide -Presentation $presentation -Index 2 -Eyebrow 'PORTAL INTERNO' -Title 'Dashboard operativo' -Body 'Aqui estoy mostrando el panel interno. He colocado un dashboard con KPI para que el centro vea de un vistazo cuantas empresas, convenios, estudiantes y asignaciones tiene activas, y desde ahi pueda entrar rapido al modulo que necesite.' -CapturePath (Join-Path $captures '03-panel-interno-dashboard.png') -DurationSeconds 20 | Out-Null

    Add-SlideBase -Presentation $presentation -Index 3 -Eyebrow 'FUNCION REAL' -Title 'Exportacion CSV en la operativa diaria' -Body "Una de las funciones que queria ensenar es la exportacion CSV.`n`nLa he dejado disponible en dashboard y en los modulos principales porque permite sacar informacion real del sistema y revisarla fuera de la aplicacion, por ejemplo en Excel o para adjuntarla como evidencia." -DurationSeconds 16 | Out-Null

    $slideCsv = Add-SlideBase -Presentation $presentation -Index 4 -Eyebrow 'EVIDENCIA CSV' -Title 'Archivo real generado por el backend' -Body "Aqui se ve un CSV real descargado desde la propia aplicacion.`n`nHe anonimizado la muestra para la entrega, pero el archivo sigue saliendo del endpoint real y se puede abrir como hoja de calculo para trabajar fuera del sistema." -DurationSeconds 24
    $frame = $slideCsv.Shapes.AddShape(1, 610, 62, 628, 368)
    $frame.Fill.ForeColor.RGB = 0xEEF3F8
    $frame.Line.ForeColor.RGB = 0xD2DCE8
    $frame.Line.Weight = 1
    $null = Add-CsvTable -Slide $slideCsv -Rows $csvRows -Left 620 -Top 72 -Width 608 -Height 334
    $null = Add-TextBox -Slide $slideCsv -Left 620 -Top 436 -Width 610 -Height 108 -Text "En este caso estoy ensenando la exportacion de solicitudes de empresa.`n`nLa muestra esta anonimizada para la entrega, pero el archivo sale del endpoint real del backend y tambien lo he dejado guardado en formato Excel para verlo mejor." -FontSize 15 -Rgb 0xC8D0DC

    Add-CaptureSlide -Presentation $presentation -Index 5 -Eyebrow 'MENSAJERIA' -Title 'Bandeja unificada de empresas' -Body 'Otra mejora importante es la bandeja unificada. En vez de obligar a entrar solicitud por solicitud, aqui puedo ver todas las conversaciones con las empresas en una vista tipo inbox y responder desde el propio portal interno.' -CapturePath (Join-Path $captures '04-panel-interno-bandeja.png') -DurationSeconds 20 | Out-Null

    Add-SlideBase -Presentation $presentation -Index 6 -Eyebrow 'ASIGNACIONES' -Title 'Seguimientos, evidencias y cierre' -Body "En las asignaciones no me he quedado solo en el alta basica. He anadido seguimientos, evidencias y una evaluacion final para que el ciclo de practicas quede mas completo y tenga trazabilidad real." -DurationSeconds 16 | Out-Null

    Add-CaptureSlide -Presentation $presentation -Index 7 -Eyebrow 'PORTAL EXTERNO' -Title 'Registro y seguimiento de la empresa' -Body 'Este es el portal externo. Aqui la empresa puede registrarse, verificar su correo, consultar el estado de la solicitud y, cuando ya esta aprobada, pasar a su acceso privado sin mezclarse con el panel interno del centro.' -CapturePath (Join-Path $captures '05-portal-externo.png') -DurationSeconds 22 | Out-Null

    Add-SlideBase -Presentation $presentation -Index 8 -Eyebrow 'CUENTA EMPRESA' -Title 'Acceso persistente y recuperacion de contrasena' -Body "Despues de la aprobacion, la empresa ya no depende solo del correo inicial. He dejado cuenta persistente, inicio de sesion y recuperacion de contrasena para que el flujo sea mas parecido al de una aplicacion real." -DurationSeconds 16 | Out-Null

    Add-CaptureSlide -Presentation $presentation -Index 9 -Eyebrow 'DOCUMENTACION' -Title 'Guia y memoria separadas del portal' -Body 'La documentacion la he dejado separada del uso operativo. Asi puedo ensenar la memoria, las capturas y la guia del proyecto sin entrar en menus internos ni mezclar la defensa con el trabajo diario de la aplicacion.' -CapturePath (Join-Path $captures '06-documentacion-guia.png') -DurationSeconds 16 | Out-Null

    Add-CaptureSlide -Presentation $presentation -Index 10 -Eyebrow 'MONITOR PRIVADO' -Title 'Supervision tecnica y acceso publico' -Body 'Por ultimo, he separado un monitor privado para la parte tecnica. Desde aqui reviso servicios, logs, documentos y el acceso publico temporal, y las acciones sensibles quedan protegidas con MFA para no mezclarlas con el portal funcional.' -CapturePath (Join-Path $captures '07-monitor-operativo.png') -DurationSeconds 20 | Out-Null

    Add-SlideBase -Presentation $presentation -Index 11 -Eyebrow 'CIERRE' -Title 'Estado de la entrega final' -Body "Con esto cierro la demostracion. La aplicacion queda organizada en portal interno, portal externo, documentacion y monitor, y tanto la memoria como el video se han preparado sobre el estado real del sistema." -DurationSeconds 12 | Out-Null

    if (Test-Path $pptxPath) {
        Remove-Item $pptxPath -Force
    }
    if (Test-Path $mp4Path) {
        Remove-Item $mp4Path -Force
    }

    $presentation.SaveAs($pptxPath)
    $presentation.CreateVideo($mp4Path, $false, 20, 720, 24, 85)

    $deadline = (Get-Date).AddMinutes(20)
    do {
        Start-Sleep -Seconds 5
        $status = $presentation.CreateVideoStatus
        Write-Output ("CreateVideoStatus={0}" -f $status)
        if ((Get-Date) -gt $deadline) {
            throw 'Timeout exportando el video de PowerPoint.'
        }
    } while ($status -ne 3)
}
finally {
    if ($presentation) {
        $presentation.Close()
    }
    if ($powerPoint) {
        $powerPoint.Quit()
    }
}
