$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$docs = Join-Path $root 'docs'
$captures = Join-Path $docs 'capturas'
$outputPptx = Join-Path $docs 'presentacion-defensa-final.pptx'
$outputPdf = Join-Path $docs 'presentacion-defensa-final.pdf'
$notesPath = Join-Path $docs 'guion-presentacion-final.md'

function Color {
    param([int] $Red, [int] $Green, [int] $Blue)
    return [int]($Red + ($Green * 256) + ($Blue * 65536))
}

$colors = @{
    bg = Color 15 18 24
    bg2 = Color 22 28 38
    ink = Color 246 248 252
    muted = Color 194 203 216
    line = Color 66 78 96
    green = Color 65 167 114
    amber = Color 219 161 77
    cyan = Color 73 177 210
    blue = Color 73 117 176
    red = Color 219 96 88
    white = Color 255 255 255
    darkInk = Color 31 41 55
}

function Add-Text {
    param(
        $Slide,
        [double] $Left,
        [double] $Top,
        [double] $Width,
        [double] $Height,
        [string] $Text,
        [int] $Size = 22,
        [int] $Rgb = $colors.ink,
        [bool] $Bold = $false,
        [string] $Font = 'Segoe UI'
    )

    $shape = $Slide.Shapes.AddTextbox(1, $Left, $Top, $Width, $Height)
    $shape.TextFrame.WordWrap = $true
    $shape.TextFrame.AutoSize = 0
    $shape.TextFrame.MarginLeft = 0
    $shape.TextFrame.MarginRight = 0
    $shape.TextFrame.MarginTop = 0
    $shape.TextFrame.MarginBottom = 0
    $shape.TextFrame.TextRange.Text = $Text
    $shape.TextFrame.TextRange.Font.Name = $Font
    $shape.TextFrame.TextRange.Font.Size = $Size
    $shape.TextFrame.TextRange.Font.Bold = [int]$Bold
    $shape.TextFrame.TextRange.Font.Color.RGB = $Rgb
    return $shape
}

function Add-Box {
    param(
        $Slide,
        [double] $Left,
        [double] $Top,
        [double] $Width,
        [double] $Height,
        [int] $Fill = $colors.bg2,
        [int] $Line = $colors.line,
        [double] $Radius = 8
    )

    $shape = $Slide.Shapes.AddShape(5, $Left, $Top, $Width, $Height)
    $shape.Fill.ForeColor.RGB = $Fill
    $shape.Line.ForeColor.RGB = $Line
    $shape.Line.Weight = 1
    return $shape
}

function Add-BulletList {
    param(
        $Slide,
        [double] $Left,
        [double] $Top,
        [double] $Width,
        [double] $Height,
        [string[]] $Items,
        [int] $Size = 19,
        [int] $Rgb = $colors.muted
    )

    $text = [string]::Join("`r", $Items)
    $shape = Add-Text -Slide $Slide -Left $Left -Top $Top -Width $Width -Height $Height -Text $text -Size $Size -Rgb $Rgb
    $shape.TextFrame.TextRange.ParagraphFormat.Bullet.Visible = -1
    $shape.TextFrame.TextRange.ParagraphFormat.Bullet.Character = 8226
    $shape.TextFrame.TextRange.ParagraphFormat.SpaceAfter = 10
    return $shape
}

function Add-Header {
    param($Slide, [string] $Eyebrow, [string] $Title, [string] $Subtitle = '')

    Add-Text -Slide $Slide -Left 44 -Top 26 -Width 820 -Height 22 -Text $Eyebrow.ToUpperInvariant() -Size 12 -Rgb $colors.amber -Bold $true | Out-Null
    Add-Text -Slide $Slide -Left 44 -Top 54 -Width 780 -Height 58 -Text $Title -Size 30 -Rgb $colors.ink -Bold $true | Out-Null
    if ($Subtitle) {
        Add-Text -Slide $Slide -Left 44 -Top 112 -Width 720 -Height 44 -Text $Subtitle -Size 15 -Rgb $colors.muted | Out-Null
    }
}

function Add-Slide {
    param($Presentation)

    $slide = $Presentation.Slides.Add($Presentation.Slides.Count + 1, 12)
    $slide.FollowMasterBackground = $false
    $slide.Background.Fill.ForeColor.RGB = $colors.bg
    $slide.Background.Fill.Solid()
    return $slide
}

function Add-FittedImage {
    param(
        $Slide,
        [string] $Path,
        [double] $Left,
        [double] $Top,
        [double] $MaxWidth,
        [double] $MaxHeight
    )

    $pic = $Slide.Shapes.AddPicture($Path, $false, $true, $Left, $Top)
    $pic.LockAspectRatio = -1
    $pic.Width = $MaxWidth
    if ($pic.Height -gt $MaxHeight) {
        $pic.Height = $MaxHeight
    }
    $pic.Left = $Left + (($MaxWidth - $pic.Width) / 2)
    $pic.Top = $Top + (($MaxHeight - $pic.Height) / 2)
    $pic.Line.ForeColor.RGB = $colors.line
    $pic.Line.Weight = 1
    return $pic
}

function Add-Metric {
    param($Slide, [double] $Left, [double] $Top, [string] $Value, [string] $Label, [int] $Accent)
    Add-Box -Slide $Slide -Left $Left -Top $Top -Width 190 -Height 94 -Fill (Color 247 250 252) -Line (Color 220 226 235) | Out-Null
    Add-Text -Slide $Slide -Left ($Left + 18) -Top ($Top + 13) -Width 150 -Height 34 -Text $Value -Size 26 -Rgb $Accent -Bold $true | Out-Null
    Add-Text -Slide $Slide -Left ($Left + 18) -Top ($Top + 52) -Width 150 -Height 30 -Text $Label -Size 13 -Rgb $colors.darkInk | Out-Null
}

function Add-CodePanel {
    param(
        $Slide,
        [double] $Left,
        [double] $Top,
        [double] $Width,
        [double] $Height,
        [string] $Code,
        [string] $Caption
    )

    $panel = Add-Box -Slide $Slide -Left $Left -Top $Top -Width $Width -Height $Height -Fill (Color 8 12 18) -Line (Color 55 73 92)
    $panel.Shadow.Visible = -1
    $panel.Shadow.ForeColor.RGB = (Color 0 0 0)
    $panel.Shadow.Transparency = 0.62
    $panel.Shadow.Blur = 10
    $panel.Shadow.OffsetX = 2
    $panel.Shadow.OffsetY = 4

    Add-Text -Slide $Slide -Left ($Left + 18) -Top ($Top + 15) -Width ($Width - 36) -Height ($Height - 54) -Text $Code -Size 13 -Rgb (Color 226 232 240) -Font 'Consolas' | Out-Null
    Add-Text -Slide $Slide -Left ($Left + 18) -Top ($Top + $Height - 31) -Width ($Width - 36) -Height 20 -Text $Caption -Size 10 -Rgb (Color 148 163 184) -Font 'Consolas' | Out-Null
}

$codeRegistro = @'
$constraints = new Assert\Collection([
  'nombreEmpresa' => [new Assert\NotBlank()],
  'contactoEmail' => [new Assert\NotBlank(), new Assert\Email()],
]);

$solicitud = (new EmpresaSolicitud())
  ->setNombreEmpresa($payload['nombreEmpresa'])
  ->setContactoEmail($payload['contactoEmail']);

$verificationUrl = $this->urlGenerator->generate(
  'registro_empresa_confirm',
  ['token' => $solicitud->getToken()],
  UrlGeneratorInterface::ABSOLUTE_URL
);
'@

$codeAsignacion = @'
private const ELIGIBLE_COMPANY_STATES = ['activa'];
private const ELIGIBLE_CONVENIO_STATES = ['firmado', 'vigente', 'renovacion'];

if ($empresa && $convenio->getEmpresa()->getId() !== $empresa->getId()) {
  return $this->json([
    'message' => 'El convenio no pertenece a la empresa indicada.'
  ], Response::HTTP_BAD_REQUEST);
}

$this->validateCompanyForAssignment($empresa);
$this->validateConvenioForAssignment($convenio);
'@

$codeFrontendApi = @'
async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  const authorizationHeader = getAuthorizationHeader();
  if (authorizationHeader) headers.set('Authorization', authorizationHeader);

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers,
    credentials: 'include',
  });

  if (!response.ok) throw new Error(`Error ${response.status}`);
  return response.status === 204 ? undefined as T : await response.json();
}
'@

$codeTests = @'
test('external registration flow reaches mail step', async ({ page }) => {
  await page.goto('/externo');
  await page.getByLabel(/Nombre de la empresa/i).fill('Empresa E2E');
  await page.getByLabel(/Email corporativo/i).fill('e2e@example.com');
  await page.getByRole('button', { name: /Enviar solicitud/i }).click();

  await expect(page).toHaveURL(/\/externo\/correo/);
  await expect(page.locator('text=Verificacion por correo')).toBeVisible();
});
'@

$powerPoint = New-Object -ComObject PowerPoint.Application
$powerPoint.Visible = 1
$presentation = $powerPoint.Presentations.Add()
$presentation.PageSetup.SlideWidth = 960
$presentation.PageSetup.SlideHeight = 540

try {
    # 1. Portada
    $slide = Add-Slide $presentation
    Add-Box -Slide $slide -Left 0 -Top 0 -Width 960 -Height 540 -Fill (Color 11 14 20) -Line (Color 11 14 20) | Out-Null
    Add-Text -Slide $slide -Left 58 -Top 54 -Width 720 -Height 28 -Text 'Trabajo Final de Grado' -Size 16 -Rgb $colors.amber -Bold $true | Out-Null
    Add-Text -Slide $slide -Left 58 -Top 104 -Width 760 -Height 118 -Text 'Gestion de Empresas Colaboradoras para FP Dual' -Size 42 -Rgb $colors.ink -Bold $true | Out-Null
    Add-Text -Slide $slide -Left 62 -Top 246 -Width 635 -Height 64 -Text 'Plataforma web para centralizar empresas, convenios, practicas, solicitudes externas, seguimiento documental y comunicacion empresa-centro.' -Size 18 -Rgb $colors.muted | Out-Null
    Add-Text -Slide $slide -Left 62 -Top 412 -Width 440 -Height 52 -Text "Autor: Luis Angel`rTutora: Elena" -Size 16 -Rgb $colors.muted | Out-Null
    Add-FittedImage -Slide $slide -Path (Join-Path $captures '03-panel-interno-dashboard.png') -Left 590 -Top 126 -MaxWidth 320 -MaxHeight 238 | Out-Null

    # 2. Problema
    $slide = Add-Slide $presentation
    Add-Header $slide '01 / Problema' 'Punto de partida' 'La gestion anterior estaba repartida entre hojas de calculo, correos y documentos sin una vista unificada.'
    Add-BulletList $slide 70 185 410 180 @(
        'Informacion dispersa entre varias fuentes.',
        'Dificultad para conocer el estado real de convenios, solicitudes y asignaciones.',
        'Dependencia del conocimiento manual de la persona que coordina las practicas.',
        'Poca trazabilidad sobre mensajes, documentos y cambios.'
    ) 20 | Out-Null
    Add-Box -Slide $slide -Left 560 -Top 172 -Width 310 -Height 190 -Fill (Color 29 36 48) -Line $colors.line | Out-Null
    Add-Text -Slide $slide -Left 590 -Top 200 -Width 250 -Height 44 -Text 'Necesidad principal' -Size 17 -Rgb $colors.amber -Bold $true | Out-Null
    Add-Text -Slide $slide -Left 590 -Top 248 -Width 246 -Height 74 -Text 'Pasar de una gestion dispersa a una plataforma unica, trazable y defendible.' -Size 23 -Rgb $colors.ink -Bold $true | Out-Null

    # 3. Objetivos
    $slide = Add-Slide $presentation
    Add-Header $slide '02 / Objetivos' 'Que tenia que resolver la aplicacion'
    $objectives = @(
        @('Centralizar', 'Empresas, convenios, estudiantes, tutores y asignaciones.'),
        @('Abrir canal externo', 'Registro de empresas, verificacion, estado y cuenta persistente.'),
        @('Trazabilidad', 'Mensajeria, documentos versionados, evidencias y evaluacion final.'),
        @('Defensa tecnica', 'Arquitectura separada, pruebas, demo y documentacion final.')
    )
    for ($i = 0; $i -lt $objectives.Count; $i++) {
        $x = 58 + (($i % 2) * 425)
        $y = 154 + ([Math]::Floor($i / 2) * 142)
        Add-Box -Slide $slide -Left $x -Top $y -Width 365 -Height 102 -Fill (Color 247 250 252) -Line (Color 221 229 238) | Out-Null
        Add-Text -Slide $slide -Left ($x + 22) -Top ($y + 18) -Width 300 -Height 28 -Text $objectives[$i][0] -Size 21 -Rgb $colors.blue -Bold $true | Out-Null
        Add-Text -Slide $slide -Left ($x + 22) -Top ($y + 52) -Width 310 -Height 36 -Text $objectives[$i][1] -Size 14 -Rgb $colors.darkInk | Out-Null
    }

    # 4. Arquitectura
    $slide = Add-Slide $presentation
    Add-Header $slide '03 / Arquitectura' 'Separacion por responsabilidades' 'Un unico nucleo de datos y negocio, con interfaces distintas para cada tipo de usuario.'
    Add-FittedImage -Slide $slide -Path (Join-Path $captures '01-bloques-funcionalidad.png') -Left 62 -Top 158 -MaxWidth 510 -MaxHeight 310 | Out-Null
    Add-BulletList $slide 625 174 260 205 @(
        'API REST Symfony como centro de negocio.',
        'Panel interno React para coordinacion.',
        'Portal externo React para empresas.',
        'Documentacion y monitor separados del flujo operativo.',
        'Modo integrado bajo una unica URL.'
    ) 18 | Out-Null

    # 5. Modelo y flujo
    $slide = Add-Slide $presentation
    Add-Header $slide '04 / Modelo de datos' 'Del alta de empresa a la asignacion'
    Add-FittedImage -Slide $slide -Path (Join-Path $captures '02-esquema-relacional.png') -Left 46 -Top 140 -MaxWidth 470 -MaxHeight 330 | Out-Null
    Add-Text -Slide $slide -Left 570 -Top 158 -Width 310 -Height 34 -Text 'Regla de negocio defendible' -Size 20 -Rgb $colors.amber -Bold $true | Out-Null
    Add-BulletList $slide 590 210 285 190 @(
        'Primero se revisa o activa la empresa.',
        'Despues se formaliza el convenio.',
        'Solo con convenio operativo se planifica la asignacion.',
        'Seguimientos, evidencias y evaluacion cierran el ciclo.'
    ) 19 | Out-Null

    # 6. Panel interno
    $slide = Add-Slide $presentation
    Add-Header $slide '05 / Panel interno' 'Gestion diaria del centro' 'Dashboard, CRUD operativo, solicitudes, bandeja, documentos, seguimientos y exportacion.'
    Add-FittedImage -Slide $slide -Path (Join-Path $captures '03-panel-interno-dashboard.png') -Left 52 -Top 150 -MaxWidth 560 -MaxHeight 315 | Out-Null
    Add-Metric $slide 662 165 '20' 'empresas demo' $colors.green
    Add-Metric $slide 662 278 '4' 'convenios demo' $colors.amber
    Add-Metric $slide 662 391 'CSV' 'exportacion operativa' $colors.cyan

    # 7. Solicitudes y comunicacion
    $slide = Add-Slide $presentation
    Add-Header $slide '06 / Flujo empresa-centro' 'Solicitudes, aprobacion y bandeja unificada'
    Add-FittedImage -Slide $slide -Path (Join-Path $captures '04-panel-interno-bandeja.png') -Left 48 -Top 140 -MaxWidth 535 -MaxHeight 322 | Out-Null
    Add-BulletList $slide 625 166 270 205 @(
        'La empresa solicita colaborar desde el portal externo.',
        'El correo queda verificado antes de la revision.',
        'El centro aprueba o rechaza desde el panel interno.',
        'La conversacion queda ligada a la solicitud y a la empresa.'
    ) 18 | Out-Null

    # 8. Portal externo
    $slide = Add-Slide $presentation
    Add-Header $slide '07 / Portal externo' 'Experiencia de la empresa' 'Alta, seguimiento de estado, activacion de cuenta, recuperacion de contrasena y area privada.'
    Add-FittedImage -Slide $slide -Path (Join-Path $captures '05-portal-externo.png') -Left 58 -Top 146 -MaxWidth 580 -MaxHeight 320 | Out-Null
    Add-Box -Slide $slide -Left 690 -Top 164 -Width 180 -Height 72 -Fill (Color 247 250 252) -Line (Color 221 229 238) | Out-Null
    Add-Text -Slide $slide -Left 712 -Top 184 -Width 140 -Height 32 -Text 'Sin acceso interno' -Size 18 -Rgb $colors.blue -Bold $true | Out-Null
    Add-Text -Slide $slide -Left 690 -Top 258 -Width 190 -Height 86 -Text 'El portal externo tiene su propio recorrido y no mezcla credenciales de empresa con el panel del centro.' -Size 15 -Rgb $colors.muted | Out-Null

    # 9. Documentacion y monitor
    $slide = Add-Slide $presentation
    Add-Header $slide '08 / Operacion y documentacion' 'No solo es una app: tambien se puede mantener y explicar'
    Add-FittedImage -Slide $slide -Path (Join-Path $captures '06-documentacion-guia.png') -Left 48 -Top 145 -MaxWidth 390 -MaxHeight 300 | Out-Null
    Add-FittedImage -Slide $slide -Path (Join-Path $captures '07-monitor-operativo.png') -Left 500 -Top 145 -MaxWidth 390 -MaxHeight 300 | Out-Null
    Add-Text -Slide $slide -Left 72 -Top 462 -Width 340 -Height 28 -Text 'Guia funcional publica' -Size 15 -Rgb $colors.muted | Out-Null
    Add-Text -Slide $slide -Left 522 -Top 462 -Width 340 -Height 28 -Text 'Monitor privado con MFA y estado tecnico' -Size 15 -Rgb $colors.muted | Out-Null

    # 10. Codigo: registro externo
    $slide = Add-Slide $presentation
    Add-Header $slide '09 / Codigo clave' 'Registro externo con validacion y correo' 'Este fragmento une formulario publico, validacion backend, token y enlace de verificacion.'
    Add-CodePanel -Slide $slide -Left 56 -Top 152 -Width 538 -Height 305 -Code $codeRegistro -Caption 'backend/src/Controller/RegistroEmpresaController.php'
    Add-BulletList $slide 640 174 250 185 @(
        'Valida datos obligatorios antes de persistir.',
        'Genera una solicitud con token propio.',
        'Crea una URL absoluta para confirmar el correo.',
        'Permite explicar por que la empresa no entra directamente al panel interno.'
    ) 17 | Out-Null

    # 11. Codigo: reglas de asignacion
    $slide = Add-Slide $presentation
    Add-Header $slide '10 / Codigo clave' 'Reglas de negocio en asignaciones' 'La aplicacion impide asignaciones incoherentes aunque alguien intente saltarse el formulario.'
    Add-CodePanel -Slide $slide -Left 56 -Top 152 -Width 548 -Height 305 -Code $codeAsignacion -Caption 'backend/src/Controller/Api/AsignacionController.php'
    Add-BulletList $slide 646 174 245 185 @(
        'Solo empresas activas.',
        'Solo convenios firmados, vigentes o en renovacion.',
        'El convenio debe pertenecer a la empresa elegida.',
        'La regla vive en backend y no depende solo de la UI.'
    ) 17 | Out-Null

    # 12. Codigo: cliente API
    $slide = Add-Slide $presentation
    Add-Header $slide '11 / Codigo clave' 'Cliente API compartido por el panel interno' 'Centraliza credenciales, sesion, errores y llamadas al backend.'
    Add-CodePanel -Slide $slide -Left 56 -Top 152 -Width 548 -Height 305 -Code $codeFrontendApi -Caption 'frontend/app/src/services/api.ts'
    Add-BulletList $slide 646 174 245 185 @(
        'Todas las llamadas pasan por un unico punto.',
        'Usa sesion de navegador y cabecera Authorization cuando procede.',
        'Normaliza errores para mostrarlos en la interfaz.',
        'Facilita mantener el frontend sin duplicar fetch en cada pantalla.'
    ) 17 | Out-Null

    # 13. Codigo: pruebas E2E
    $slide = Add-Slide $presentation
    Add-Header $slide '12 / Codigo clave' 'Pruebas E2E sobre flujos reales' 'La defensa no se apoya solo en capturas: hay pruebas que navegan por la app.'
    Add-CodePanel -Slide $slide -Left 56 -Top 152 -Width 548 -Height 305 -Code $codeTests -Caption 'frontend/app/e2e/critical-flows.spec.ts'
    Add-BulletList $slide 646 174 245 185 @(
        'Abre el portal externo como usuario real.',
        'Rellena el formulario de empresa.',
        'Comprueba que llega al paso de correo.',
        'Complementa los tests backend y unitarios.'
    ) 17 | Out-Null

    # 14. Validacion
    $slide = Add-Slide $presentation
    Add-Header $slide '13 / Validacion' 'Comprobaciones realizadas antes de la defensa'
    Add-Metric $slide 70 162 '90' 'tests backend' $colors.green
    Add-Metric $slide 292 162 '522' 'aserciones' $colors.cyan
    Add-Metric $slide 514 162 '14/14' 'tests frontend' $colors.green
    Add-Metric $slide 736 162 '3/3' 'E2E Playwright' $colors.green
    Add-BulletList $slide 94 314 740 95 @(
        'Build integrada de los dos frontends publicada en Symfony.',
        'Rutas /app, /externo, /documentacion y /monitor comprobadas con HTTP 200.',
        'Flujos criticos: login interno, monitor privado y registro externo hasta correo.'
    ) 18 | Out-Null
    Add-Text -Slide $slide -Left 94 -Top 440 -Width 730 -Height 32 -Text 'Queda una deprecacion tecnica de Doctrine/PHPUnit, no bloqueante para la demo ni para la funcionalidad.' -Size 14 -Rgb $colors.muted | Out-Null

    # 15. Como probarla
    $slide = Add-Slide $presentation
    Add-Header $slide '14 / Acceso de evaluacion' 'Como puede probarla la profesora' 'No necesita instalar dependencias si el entorno de demostracion esta levantado.'
    Add-Box -Slide $slide -Left 70 -Top 160 -Width 820 -Height 130 -Fill (Color 247 250 252) -Line (Color 221 229 238) | Out-Null
    Add-Text -Slide $slide -Left 98 -Top 184 -Width 760 -Height 32 -Text 'https://...trycloudflare.com' -Size 30 -Rgb $colors.blue -Bold $true -Font 'Consolas' | Out-Null
    Add-Text -Slide $slide -Left 100 -Top 230 -Width 760 -Height 26 -Text 'URL temporal generada con cloudflared mientras el equipo local y el backend estan activos.' -Size 15 -Rgb $colors.darkInk | Out-Null
    Add-BulletList $slide 104 330 740 95 @(
        'URL/app: panel interno.',
        'URL/externo: portal de empresa.',
        'URL/documentacion: guia funcional.',
        'URL/monitor: supervision tecnica protegida.'
    ) 18 | Out-Null

    # 16. Limitaciones y futuro
    $slide = Add-Slide $presentation
    Add-Header $slide '15 / Limitaciones' 'Que queda fuera de esta entrega'
    Add-BulletList $slide 78 160 360 230 @(
        'Despliegue permanente en infraestructura dedicada.',
        'Integracion con SSO o identidad corporativa.',
        'Firma electronica avanzada.',
        'Almacenamiento documental en nube gestionada.',
        'Perfilado profundo de rendimiento en produccion.'
    ) 19 | Out-Null
    Add-Box -Slide $slide -Left 536 -Top 162 -Width 320 -Height 210 -Fill (Color 29 36 48) -Line $colors.line | Out-Null
    Add-Text -Slide $slide -Left 568 -Top 192 -Width 260 -Height 32 -Text 'Siguiente iteracion' -Size 20 -Rgb $colors.amber -Bold $true | Out-Null
    Add-Text -Slide $slide -Left 568 -Top 244 -Width 245 -Height 82 -Text 'Endurecer seguridad, desplegar en infraestructura estable y ampliar automatizacion E2E.' -Size 23 -Rgb $colors.ink -Bold $true | Out-Null

    # 17. Cierre
    $slide = Add-Slide $presentation
    Add-Header $slide '16 / Cierre' 'Resultado defendible'
    Add-Text -Slide $slide -Left 92 -Top 158 -Width 760 -Height 118 -Text 'El proyecto transforma una gestion dispersa en una plataforma web funcional, trazable y documentada para empresas colaboradoras y practicas de FP Dual.' -Size 30 -Rgb $colors.ink -Bold $true | Out-Null
    Add-BulletList $slide 128 322 690 90 @(
        'Problema real del centro.',
        'Arquitectura completa con backend, dos frontends, documentacion y monitor.',
        'Validacion tecnica y material de demo preparados.'
    ) 19 | Out-Null
    Add-Text -Slide $slide -Left 330 -Top 468 -Width 300 -Height 32 -Text 'Demo y preguntas' -Size 22 -Rgb $colors.amber -Bold $true | Out-Null

    if (Test-Path $outputPptx) { Remove-Item $outputPptx -Force }
    if (Test-Path $outputPdf) { Remove-Item $outputPdf -Force }
    $presentation.SaveAs($outputPptx, 24)
    $presentation.SaveAs($outputPdf, 32)
}
finally {
    $presentation.Close()
    $powerPoint.Quit()
}

$notes = @'
# Guion para la presentacion final

Duracion recomendada: 8-10 minutos, dejando 2-3 minutos para preguntas.

## 1. Portada
Presenta el proyecto como una plataforma para gestionar empresas colaboradoras, convenios y practicas de FP Dual. No empieces por tecnologia: empieza por el problema real.

## 2. Problema
Explica que antes habia informacion dispersa, poca trazabilidad y dependencia de correos/hojas de calculo. La idea clave es que el centro necesitaba una vista unica.

## 3. Objetivos
Resume cuatro objetivos: centralizar datos, abrir canal externo, dejar trazabilidad documental y construir algo defendible tecnicamente.

## 4. Arquitectura
Defiende la separacion: Symfony concentra negocio y seguridad; React se divide en panel interno y portal externo; documentacion y monitor no contaminan el flujo operativo.

## 5. Modelo y flujo
Insiste en el orden de negocio: empresa activa, convenio operativo, asignacion, seguimiento y evaluacion. Esto demuestra que no son CRUD aislados.

## 6. Panel interno
Muestra dashboard, KPI, modulos y exportacion CSV. Di que es la herramienta de trabajo diaria para coordinacion.

## 7. Flujo empresa-centro
Explica solicitudes, verificacion por correo, aprobacion interna y bandeja. Este punto conecta el centro con empresas reales.

## 8. Portal externo
Explica que la empresa puede registrarse, consultar estado, activar cuenta, recuperar contrasena y comunicarse sin acceder al panel interno.

## 9. Documentacion y monitor
Justifica madurez del proyecto: hay guia funcional, monitor privado, MFA y supervision de rutas/servicios.

## 10. Codigo: registro externo
Explica que el formulario publico no inserta datos sin control: el backend valida los campos, crea una solicitud y genera un token de verificacion por correo.

## 11. Codigo: reglas de asignacion
Usa esta diapositiva para defender que hay reglas de negocio reales en backend: una asignacion solo se permite si la empresa esta activa y el convenio esta en un estado operativo.

## 12. Codigo: cliente API
Explica que el frontend no hace llamadas sueltas: centraliza credenciales, sesion, errores y llamadas HTTP en un cliente API comun.

## 13. Codigo: pruebas E2E
Muestra que se prueba un flujo de usuario real: entrar al portal externo, rellenar el formulario y llegar al paso de correo.

## 14. Validacion
Da cifras exactas: 90 tests backend, 522 aserciones, 14 tests frontend, 3 E2E. Si preguntan por la deprecacion, di que es aviso de libreria, no fallo funcional.

## 15. Acceso de evaluacion
Aclara que la profesora no necesita instalar nada si tu equipo esta levantado: recibe URL temporal de cloudflared y entra a /app, /externo, /documentacion o /monitor.

## 16. Limitaciones
No las escondas: despliegue permanente, SSO, firma avanzada, nube documental y perfilado productivo quedan como lineas futuras.

## 17. Cierre
Cierra con una frase directa: el valor del TFG esta en convertir una necesidad real en una solucion completa, funcional, trazable y defendible.

## Orden rapido de demo
1. Abrir `http://127.0.0.1:8000/app`.
2. Login con `admin / admin123`.
3. Dashboard y exportacion CSV.
4. Solicitudes y bandeja.
5. Convenios/asignaciones.
6. Portal externo en `http://127.0.0.1:8000/externo`.
7. Documentacion y monitor si queda tiempo.
'@

Set-Content -Path $notesPath -Value $notes -Encoding UTF8

Write-Host "Presentacion generada: $outputPptx"
Write-Host "PDF generado: $outputPdf"
Write-Host "Guion generado: $notesPath"
