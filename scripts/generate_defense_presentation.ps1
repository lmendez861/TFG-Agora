<#
 Comentario de mantenimiento Agora.
 Proposito: Script auxiliar de documentacion/demo: automatiza generacion de entregables del TFG.
 Relaciones: script auxiliar invocado manualmente durante documentacion, capturas o defensa.
#>
$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$docs = Join-Path $root 'docs'
$captures = Join-Path $docs 'capturas'
$outputPptx = Join-Path $docs 'presentacion-defensa-final.pptx'
$outputPdf = Join-Path $docs 'presentacion-defensa-final.pdf'
$notesPath = Join-Path $docs 'guion-presentacion-final.md'
$publicBaseUrl = 'https://agora.34.175.161.212.nip.io'

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

function Set-SlideNotes {
    param(
        $Slide,
        [string] $Text
    )

    try {
        $placeholder = $Slide.NotesPage.Shapes.Placeholders.Item(2)
        $placeholder.TextFrame.TextRange.Text = $Text
    }
    catch {
        try {
            $shape = $Slide.NotesPage.Shapes.AddTextbox(1, 36, 100, 640, 300)
            $shape.TextFrame.WordWrap = $true
            $shape.TextFrame.TextRange.Text = $Text
            $shape.TextFrame.TextRange.Font.Name = 'Segoe UI'
            $shape.TextFrame.TextRange.Font.Size = 14
        }
        catch {
        }
    }
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
    Set-SlideNotes $slide @'
En esta portada tengo que abrir con el problema, no con tecnologia.

La idea principal es que he construido una plataforma para gestionar empresas colaboradoras y practicas de FP Dual.
La solucion final tiene dos portales, una API central, documentacion publica y una app de escritorio tecnica.
Durante la defensa voy a enseñar el flujo funcional y despues la parte de operacion y validacion.
'@

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
    Set-SlideNotes $slide @'
Aqui tengo que explicar el contexto inicial.

Antes la informacion estaba repartida entre correos, hojas de calculo y documentos en carpetas distintas.
Eso hacia dificil saber en que estado estaba cada empresa, cada convenio o cada practica.
Por eso el problema no era solo guardar datos, sino dar continuidad, trazabilidad y una vista unica al centro.
'@

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
    Set-SlideNotes $slide @'
Aqui resumo el alcance en cuatro objetivos claros.

Primero, centralizar la operativa del centro.
Segundo, abrir un canal externo para empresas sin mezclarlo con el panel interno.
Tercero, dejar trazabilidad documental y de mensajes.
Cuarto, cerrar una solucion defendible tecnicamente con pruebas, despliegue y documentacion.
'@

    # 4. Arquitectura
    $slide = Add-Slide $presentation
    Add-Header $slide '03 / Arquitectura' 'Topologia operativa y de despliegue' 'La URL publica termina en una VM con HTTPS, persistencia real y una consola tecnica de escritorio separada del flujo funcional.'
    Add-FittedImage -Slide $slide -Path (Join-Path $captures '10-arquitectura-detallada.png') -Left 24 -Top 146 -MaxWidth 600 -MaxHeight 330 | Out-Null
    Add-BulletList $slide 625 174 260 205 @(
        'Caddy expone HTTPS y enruta a la aplicacion.',
        'Symfony concentra seguridad, negocio y APIs.',
        'PostgreSQL y documentos persisten fuera del contenedor.',
        'Agora Desktop trabaja en local o en cloud.',
        'La operacion tecnica queda fuera del flujo web principal.'
    ) 18 | Out-Null
    Set-SlideNotes $slide @'
Esta diapositiva me sirve para defender la separacion de responsabilidades.

Symfony concentra negocio, seguridad y persistencia.
React se divide en portal interno y portal externo.
La documentacion publica queda separada del flujo operativo.
Agora Desktop no es una tercera interfaz de negocio, sino una consola tecnica para soporte local y cloud.
'@

    # 5. Modelo y flujo
    $slide = Add-Slide $presentation
    Add-Header $slide '04 / Modelo de datos' 'De la cuenta de empresa a la asignacion'
    Add-FittedImage -Slide $slide -Path (Join-Path $captures '02-esquema-relacional.png') -Left 46 -Top 140 -MaxWidth 470 -MaxHeight 330 | Out-Null
    Add-Text -Slide $slide -Left 570 -Top 158 -Width 310 -Height 34 -Text 'Regla de negocio defendible' -Size 20 -Rgb $colors.amber -Bold $true | Out-Null
    Add-BulletList $slide 590 210 285 190 @(
        'La cuenta portal sobrevive al preregistro inicial.',
        'La solicitud concentra verificacion, estado y mensajes.',
        'La empresa aprobada hereda convenios, documentos y tutores.',
        'Asignacion, seguimiento y evaluacion cierran el ciclo.'
    ) 19 | Out-Null
    Set-SlideNotes $slide @'
Flujo que debo explicar en esta diapositiva:

1. La empresa entra primero por solicitud externa.
2. Cuando el centro aprueba, esa solicitud pasa al catalogo interno de empresas activas.
3. Despues completo la ficha de empresa con contactos, documentos y tutor profesional.
4. Luego formalizo el convenio entre centro y empresa.
5. La asignacion es donde vinculo estudiante, convenio, tutor academico, tutor profesional, horas, fechas y modalidad.
6. Sobre esa asignacion registro seguimientos, reuniones, evidencias y la evaluacion final.
7. La evaluacion final se guarda sobre la asignacion, no como un seguimiento suelto ni como una nota general del estudiante.
'@

    # 6. Panel interno
    $slide = Add-Slide $presentation
    Add-Header $slide '05 / Panel interno' 'Gestion diaria del centro' 'Dashboard, CRUD operativo, solicitudes, bandeja, documentos, seguimientos y exportacion.'
    Add-FittedImage -Slide $slide -Path (Join-Path $captures '03-panel-interno-dashboard.png') -Left 52 -Top 150 -MaxWidth 560 -MaxHeight 315 | Out-Null
    Add-Metric $slide 662 165 '3' 'empresas demo' $colors.green
    Add-Metric $slide 662 278 '3' 'convenios demo' $colors.amber
    Add-Metric $slide 662 391 'CSV' 'exportacion operativa' $colors.cyan
    Set-SlideNotes $slide @'
Aqui explico que el portal interno es la herramienta de trabajo diaria del centro.

Desde este panel se revisan KPI, solicitudes, empresas, convenios, tutores, estudiantes y asignaciones.
La idea es que no sea solo un CRUD, sino un shell operativo con accesos rapidos, bandeja y exportacion CSV.
Las fichas 360 de empresa y convenio ayudan a no perder contexto.
'@

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
    Set-SlideNotes $slide @'
Aqui tengo que conectar claramente portal externo y portal interno.

La empresa no entra directamente al dominio interno.
Primero crea su acceso, envia la solicitud y verifica el correo.
Despues el centro revisa, aprueba o rechaza.
La mensajeria queda ligada a la solicitud y, cuando se aprueba, continua sobre la empresa ya activada.
'@

    # 8. Portal externo
    $slide = Add-Slide $presentation
    Add-Header $slide '07 / Portal externo' 'Experiencia de la empresa' 'Alta, seguimiento de estado, activacion de cuenta, recuperacion de contrasena y area privada.'
    Add-FittedImage -Slide $slide -Path (Join-Path $captures '05-portal-externo.png') -Left 58 -Top 146 -MaxWidth 580 -MaxHeight 320 | Out-Null
    Add-Box -Slide $slide -Left 690 -Top 164 -Width 180 -Height 72 -Fill (Color 247 250 252) -Line (Color 221 229 238) | Out-Null
    Add-Text -Slide $slide -Left 712 -Top 184 -Width 140 -Height 32 -Text 'Sin acceso interno' -Size 18 -Rgb $colors.blue -Bold $true | Out-Null
    Add-Text -Slide $slide -Left 690 -Top 258 -Width 190 -Height 86 -Text 'El portal externo tiene su propio recorrido y no mezcla credenciales de empresa con el panel del centro.' -Size 15 -Rgb $colors.muted | Out-Null
    Set-SlideNotes $slide @'
En esta slide explico que el portal externo no es una copia reducida del interno.

Tiene su propio recorrido: alta de cuenta, solicitud, verificacion, estado, acceso persistente y chat.
La empresa nunca necesita credenciales del centro.
Cuando la empresa se aprueba, la misma cuenta sigue sirviendo para ver sus convenios, asignaciones y documentos.
'@

    # 9. Como lo he desarrollado
    $slide = Add-Slide $presentation
    Add-Header $slide '08 / Desarrollo' 'Como lo he desarrollado y que partes tiene' 'La presentacion se apoya en bloques funcionales y decisiones de arquitectura, no en fragmentos de codigo.'
    $developmentBlocks = @(
        @('Analisis del problema', 'Necesidad real del centro y alcance viable para el TFG.'),
        @('Modelo y reglas', 'Empresa, convenio, asignacion, seguimiento y evaluacion.'),
        @('Backend Symfony', 'API, seguridad, correo, tokens, auditoria y persistencia.'),
        @('Portal interno', 'Gestion academica, bandeja, documentos y exportacion CSV.'),
        @('Portal externo', 'Registro, verificacion, estado, acceso empresa y chat.'),
        @('Operacion final', 'App de escritorio, pruebas, logs, backups y empaquetado.')
    )
    for ($i = 0; $i -lt $developmentBlocks.Count; $i++) {
        $x = 60 + (($i % 2) * 420)
        $y = 154 + ([Math]::Floor($i / 2) * 104)
        Add-Box -Slide $slide -Left $x -Top $y -Width 360 -Height 82 -Fill (Color 247 250 252) -Line (Color 221 229 238) | Out-Null
        Add-Text -Slide $slide -Left ($x + 18) -Top ($y + 14) -Width 300 -Height 24 -Text $developmentBlocks[$i][0] -Size 18 -Rgb $colors.blue -Bold $true | Out-Null
        Add-Text -Slide $slide -Left ($x + 18) -Top ($y + 42) -Width 320 -Height 28 -Text $developmentBlocks[$i][1] -Size 13 -Rgb $colors.darkInk | Out-Null
    }
    Set-SlideNotes $slide @'
Aqui cuento el proyecto por bloques de construccion, no por commits.

Primero modele el problema y el dominio.
Despues levante backend y reglas de negocio.
Luego hice el portal interno, el portal externo y el soporte documental.
La ultima capa fue la operacion tecnica: cloud, escritorio, pruebas y empaquetado.
'@

    # 10. Correo, verificacion y rechazo
    $slide = Add-Slide $presentation
    Add-Header $slide '09 / Correo y rechazo' 'Gestor de correos y comunicaciones transaccionales' 'El proveedor configurado es Brevo y cubre tanto correo funcional como operaciones sensibles.'
    Add-Box -Slide $slide -Left 58 -Top 160 -Width 250 -Height 226 -Fill (Color 29 36 48) -Line $colors.line | Out-Null
    Add-Text -Slide $slide -Left 92 -Top 192 -Width 182 -Height 36 -Text 'Brevo' -Size 28 -Rgb $colors.amber -Bold $true | Out-Null
    Add-BulletList $slide 86 246 190 120 @(
        'Verificacion de solicitud',
        'Activacion de cuenta',
        'Recuperacion de contrasena',
        'MFA tecnico',
        'Aviso de rechazo'
    ) 16 $colors.ink | Out-Null
    $mailFlow = @(
        @('1. Registro', 'La empresa envia la solicitud.'),
        @('2. Verificacion', 'Recibe enlace y confirma correo.'),
        @('3. Revision', 'El centro aprueba o rechaza.'),
        @('4. Resultado', 'Si se rechaza llega correo y el estado sigue visible en el portal.')
    )
    for ($i = 0; $i -lt $mailFlow.Count; $i++) {
        $y = 160 + ($i * 68)
        Add-Box -Slide $slide -Left 362 -Top $y -Width 510 -Height 54 -Fill (Color 247 250 252) -Line (Color 221 229 238) | Out-Null
        Add-Text -Slide $slide -Left 384 -Top ($y + 10) -Width 132 -Height 22 -Text $mailFlow[$i][0] -Size 16 -Rgb $colors.blue -Bold $true | Out-Null
        Add-Text -Slide $slide -Left 520 -Top ($y + 10) -Width 320 -Height 26 -Text $mailFlow[$i][1] -Size 14 -Rgb $colors.darkInk | Out-Null
    }
    Set-SlideNotes $slide @'
Aqui debo dejar claro que el correo no es decorativo.

Uso Brevo para verificacion de empresa, activacion de cuenta, recuperacion de contrasena y avisos de rechazo.
Eso permite que la profesora pruebe un flujo real desde fuera, no una simulacion local.
Tambien me sirve para justificar por que necesitaba una URL publica correcta en cloud.
'@

    # 11. Dominio externo y enlaces publicos
    $slide = Add-Slide $presentation
    Add-Header $slide '10 / Dominio externo' 'Como resuelvo el acceso publico y los enlaces de correo' 'El problema ya no es una IP local incrustada: la plataforma publica una URL HTTPS estable sobre la VM cloud.'
    Add-Box -Slide $slide -Left 72 -Top 194 -Width 190 -Height 92 -Fill (Color 247 250 252) -Line (Color 221 229 238) | Out-Null
    Add-Text -Slide $slide -Left 96 -Top 214 -Width 150 -Height 22 -Text 'Infraestructura' -Size 18 -Rgb $colors.blue -Bold $true | Out-Null
    Add-Text -Slide $slide -Left 96 -Top 246 -Width 150 -Height 24 -Text 'GCP + Docker Compose' -Size 12 -Rgb $colors.darkInk -Font 'Consolas' | Out-Null
    Add-Box -Slide $slide -Left 376 -Top 194 -Width 190 -Height 92 -Fill (Color 247 250 252) -Line (Color 221 229 238) | Out-Null
    Add-Text -Slide $slide -Left 404 -Top 214 -Width 150 -Height 22 -Text 'Borde HTTPS' -Size 18 -Rgb $colors.blue -Bold $true | Out-Null
    Add-Text -Slide $slide -Left 426 -Top 246 -Width 90 -Height 24 -Text 'Caddy' -Size 14 -Rgb $colors.darkInk -Font 'Consolas' | Out-Null
    Add-Box -Slide $slide -Left 650 -Top 194 -Width 242 -Height 92 -Fill (Color 29 36 48) -Line $colors.line | Out-Null
    Add-Text -Slide $slide -Left 674 -Top 214 -Width 180 -Height 22 -Text 'URL publica' -Size 18 -Rgb $colors.amber -Bold $true | Out-Null
    Add-Text -Slide $slide -Left 668 -Top 246 -Width 208 -Height 24 -Text 'https://agora.34.175.161.212...' -Size 9 -Rgb $colors.ink -Font 'Consolas' | Out-Null
    Add-BulletList $slide 92 332 760 104 @(
        'El portal externo y los correos usan ya el origen publico correcto de la VM.',
        'APP_EXTERNAL_BASE_URL fija la URL canonica para enlaces y notificaciones.',
        'El siguiente paso natural seria cambiar nip.io por dominio institucional propio.'
    ) 17 | Out-Null
    Set-SlideNotes $slide @'
Aqui explico un problema real que tuve que resolver.

Una URL local dentro de un correo no sirve para una empresa externa.
Por eso el despliegue cloud publica una URL HTTPS y el backend genera enlaces con ese origen.
Con nip.io resuelvo la demo, aunque a futuro lo correcto seria un dominio institucional o una IP estatica.
'@

    # 12. Mensajeria y refresco automatico
    $slide = Add-Slide $presentation
    Add-Header $slide '11 / Mensajeria' 'Bandeja y chat con actualizacion automatica' 'La comunicacion entre centro y empresa no depende ya de recargar la pagina a mano.'
    Add-FittedImage -Slide $slide -Path (Join-Path $captures '04-panel-interno-bandeja.png') -Left 50 -Top 150 -MaxWidth 520 -MaxHeight 312 | Out-Null
    Add-Box -Slide $slide -Left 620 -Top 164 -Width 250 -Height 84 -Fill (Color 29 36 48) -Line $colors.line | Out-Null
    Add-Text -Slide $slide -Left 650 -Top 184 -Width 190 -Height 24 -Text 'Actualizacion automatica' -Size 20 -Rgb $colors.amber -Bold $true | Out-Null
    Add-Text -Slide $slide -Left 694 -Top 214 -Width 104 -Height 22 -Text '5 s' -Size 26 -Rgb $colors.ink -Bold $true | Out-Null
    Add-BulletList $slide 624 274 250 158 @(
        'Refresco periodico del chat y de la bandeja.',
        'Nueva carga cuando la ventana recupera el foco.',
        'La empresa tambien ve cambios en su panel externo.',
        'El rechazo queda comunicado por correo y visible en estado.'
    ) 16 | Out-Null
    Set-SlideNotes $slide @'
Esta diapositiva me sirve para justificar que la aplicacion no da sensacion de maqueta estatica.

La bandeja interna y el chat externo se refrescan solos en segundo plano y tambien al recuperar el foco del navegador.
Eso evita tener que recargar manualmente durante la demo.
Ademas, el estado de rechazo no solo llega por correo: tambien queda visible dentro del portal externo.
'@

    # 13. Operacion local y app de escritorio
    $slide = Add-Slide $presentation
    Add-Header $slide '12 / Agora Desktop' 'Consola tecnica local y cloud' 'La parte tecnica ya no depende de varios terminales sueltos ni de una pagina web separada: queda centralizada en una sola app.'
    Add-FittedImage -Slide $slide -Path (Join-Path $captures '07-agora-desktop-operativo.png') -Left 42 -Top 148 -MaxWidth 448 -MaxHeight 318 | Out-Null
    Add-BulletList $slide 540 162 320 210 @(
        'Modo local para backend, SQLite y demo offline.',
        'Modo cloud para estado, smoke, logs y reinicios remotos.',
        'MFA en operaciones sensibles del flujo local.',
        'Diagnostico, logs y backups desde una sola interfaz.',
        'Empaquetado Windows listo para la defensa.'
    ) 17 | Out-Null
    Set-SlideNotes $slide @'
Aqui explico por que hice Agora Desktop.

No queria depender de varios terminales ni de una pagina tecnica aparte.
La app me concentra modo local, modo cloud, logs, reinicios, smoke y contingencia.
Si la VM cambia de IP o falla el servicio, desde aqui veo la URL efectiva y el estado de agora.service.
'@

    # 14. Autoarranque y roles
    $slide = Add-Slide $presentation
    Add-Header $slide '13 / Operacion y seguridad' 'Autoarranque en VM y roles internos' 'El despliegue cloud no depende de arrancarlo a mano y la base de seguridad ya separa perfiles tecnicos, funcionales y externos.'
    Add-Box -Slide $slide -Left 58 -Top 156 -Width 390 -Height 238 -Fill (Color 29 36 48) -Line $colors.line | Out-Null
    Add-Text -Slide $slide -Left 86 -Top 182 -Width 300 -Height 24 -Text 'Arranque automatico' -Size 20 -Rgb $colors.amber -Bold $true | Out-Null
    Add-Text -Slide $slide -Left 86 -Top 222 -Width 320 -Height 92 -Text "VM -> systemd -> agora.service`rdeploy/gcp/startup.sh`rdocker compose up -d" -Size 17 -Rgb $colors.ink -Font 'Consolas' | Out-Null
    Add-BulletList $slide 88 326 300 48 @(
        'Recalcula la URL nip.io si cambia la IP.',
        'Levanta proxy, app y PostgreSQL.'
    ) 14 $colors.muted | Out-Null

    Add-Box -Slide $slide -Left 510 -Top 156 -Width 372 -Height 238 -Fill (Color 247 250 252) -Line (Color 221 229 238) | Out-Null
    Add-Text -Slide $slide -Left 538 -Top 182 -Width 270 -Height 24 -Text 'Roles definidos' -Size 20 -Rgb $colors.blue -Bold $true | Out-Null
    Add-BulletList $slide 542 224 286 106 @(
        'ADMIN: control total y borrado controlado.',
        'PROFESOR/COORDINATOR: gestion diaria sin eliminar.',
        'DOCUMENT_MANAGER: documentos.',
        'MONITOR: logs y consola tecnica.',
        'COMPANY_PORTAL: empresa externa.'
    ) 13 $colors.darkInk | Out-Null
    Add-Text -Slide $slide -Left 540 -Top 358 -Width 300 -Height 24 -Text 'Futuro: matriz fina de permisos y perfiles de solo lectura.' -Size 12 -Rgb $colors.muted | Out-Null
    Add-Text -Slide $slide -Left 74 -Top 430 -Width 780 -Height 42 -Text 'Justificacion: cierro el despliegue cloud con arranque reproducible y dejo preparada la separacion de permisos para evolucionar de demo funcional a entorno multiusuario real.' -Size 15 -Rgb $colors.muted | Out-Null
    Set-SlideNotes $slide @'
Aqui explico dos decisiones tecnicas que pueden preguntar.

Primero, el arranque de la VM:
Docker por si solo reinicia contenedores, pero yo queria asegurar el arranque completo del stack.
Por eso instalo agora.service con systemd. Ese servicio ejecuta deploy/gcp/startup.sh.
startup.sh comprueba .env.gcp, recalcula la URL nip.io si cambia la IP publica y ejecuta docker compose up -d --remove-orphans.
El compose levanta proxy, app y base de datos.

Segundo, roles:
El proyecto ya separa permisos reales por rol.
ROLE_ADMIN tiene control completo y es el unico que puede eliminar datos de prueba desde el portal interno: asignaciones, convenios sin asignaciones y empresas sin convenios ni asignaciones. Esto me permite limpiar datos para pruebas sin tocar directamente la base de datos.
ROLE_COORDINATOR, que es el perfil que usan profesor o profesora en la demo, puede crear, editar y consultar empresas, convenios, asignaciones y mensajes, pero no ve ni puede ejecutar acciones de borrado.
ROLE_DOCUMENT_MANAGER queda pensado para gestion documental, ROLE_MONITOR para logs y consola tecnica, y ROLE_COMPANY_PORTAL para empresas externas.
Como evolucion futura, esta base se puede ampliar a una matriz de permisos mas fina: perfiles de solo lectura, responsables por departamento, auditoria visible por rol y restricciones por centro o familia profesional.
'@

    # 15. Validacion
    $slide = Add-Slide $presentation
    Add-Header $slide '14 / Validacion' 'Comprobaciones ejecutadas antes de la revision final'
    Add-Metric $slide 70 162 '110' 'tests backend' $colors.green
    Add-Metric $slide 292 162 '628' 'aserciones' $colors.cyan
    Add-Metric $slide 514 162 '14/14' 'tests frontend' $colors.green
    Add-Metric $slide 736 162 '6/6' 'E2E Playwright' $colors.green
    Add-BulletList $slide 94 314 740 110 @(
        'Build integrada de /app y /externo publicada en Symfony.',
        'Verificados correo, rechazo, URLs publicas, chat y consola tecnica de escritorio.',
        'Tambien se ha validado el empaquetado Windows con PHP embebido y SQLite.'
    ) 18 | Out-Null
    Add-Text -Slide $slide -Left 94 -Top 438 -Width 730 -Height 32 -Text 'Queda una deprecacion tecnica de PHPUnit, no bloqueante para la demo ni para la funcionalidad.' -Size 14 -Rgb $colors.muted | Out-Null
    Set-SlideNotes $slide @'
Aqui no me interesa presumir de numeros sin contexto.

Lo importante es explicar que he validado backend, frontend, E2E, correo, mensajeria, documentos, cloud y escritorio.
Las cifras sirven como apoyo para demostrar que no me he quedado en una prueba manual superficial.
La deprecacion de PHPUnit existe, pero no afecta a la funcionalidad ni a la defensa.
'@

    # 16. Acceso de evaluacion
    $slide = Add-Slide $presentation
    Add-Header $slide '15 / Acceso de evaluacion' 'Como puede probarla la profesora desde fuera' 'Con la VM levantada no necesita instalar dependencias en su equipo.'
    Add-Box -Slide $slide -Left 68 -Top 158 -Width 824 -Height 92 -Fill (Color 247 250 252) -Line (Color 221 229 238) | Out-Null
    Add-Text -Slide $slide -Left 98 -Top 186 -Width 760 -Height 28 -Text \"$publicBaseUrl/app   |   $publicBaseUrl/externo\" -Size 13 -Rgb $colors.blue -Bold $true -Font 'Consolas' | Out-Null
    Add-Text -Slide $slide -Left 102 -Top 220 -Width 760 -Height 22 -Text 'La misma base sirve panel interno, portal externo y documentacion; la operacion tecnica se hace desde Agora Desktop.' -Size 14 -Rgb $colors.darkInk | Out-Null
    Add-Box -Slide $slide -Left 86 -Top 302 -Width 320 -Height 118 -Fill (Color 29 36 48) -Line $colors.line | Out-Null
    Add-Text -Slide $slide -Left 118 -Top 328 -Width 250 -Height 22 -Text 'Usuario de prueba' -Size 20 -Rgb $colors.amber -Bold $true | Out-Null
    Add-Text -Slide $slide -Left 118 -Top 362 -Width 250 -Height 22 -Text 'profesora / Abrete01' -Size 18 -Rgb $colors.ink -Bold $true -Font 'Consolas' | Out-Null
    Add-Text -Slide $slide -Left 118 -Top 392 -Width 220 -Height 20 -Text 'Rol: coordinacion' -Size 14 -Rgb $colors.muted | Out-Null
    Add-BulletList $slide 470 306 360 110 @(
        'Puede revisar solicitudes, convenios, asignaciones y mensajes.',
        'La empresa prueba el recorrido por /externo.',
        'El acceso remoto depende de que la VM siga activa.'
    ) 17 | Out-Null
    Set-SlideNotes $slide @'
Esta slide es muy practica: explica como se puede probar el sistema desde fuera.

Debo remarcar que la referencia buena es la URL cloud efectiva.
Si cambia la IP publica, Agora Desktop me dice la nueva URL.
Con la cuenta profesora se puede revisar el flujo interno sin usar la cuenta de administrador principal.
'@

    # 17. Alcance cerrado y mejoras futuras
    $slide = Add-Slide $presentation
    Add-Header $slide '16 / Alcance y futuro' 'Que queda cerrado y que se deja para despues' 'El nucleo funcional y tecnico ya esta entregado; las mejoras futuras endurecen o amplian, pero no bloquean la defensa.'
    Add-Box -Slide $slide -Left 56 -Top 170 -Width 270 -Height 214 -Fill (Color 29 36 48) -Line $colors.line | Out-Null
    Add-Text -Slide $slide -Left 80 -Top 192 -Width 210 -Height 28 -Text 'Cerrado en esta entrega' -Size 20 -Rgb $colors.amber -Bold $true | Out-Null
    Add-BulletList $slide 82 232 212 132 @(
        'Portales /app y /externo bajo HTTPS.',
        'Correo real, documentos, chat y exportacion.',
        'Agora Desktop local/cloud como consola tecnica.',
        'VM publica con arranque automatico y URL efectiva visible.'
    ) 14 $colors.ink | Out-Null
    $deployOptions = @(
        @('Dominio propio', 'Sustituir nip.io por dominio institucional y reforzar TLS.', $colors.green),
        @('Servicios gestionados', 'Migrar documentos, backups y observabilidad a servicios gestionados fuera de la VM.', $colors.cyan),
        @('Cliente tecnico', 'Ampliar Agora Desktop sin mezclar soporte con negocio.', $colors.amber)
    )
    for ($i = 0; $i -lt $deployOptions.Count; $i++) {
        $x = 356 + (($i % 2) * 272)
        $y = 176 + ([Math]::Floor($i / 2) * 118)
        Add-Box -Slide $slide -Left $x -Top $y -Width 244 -Height 96 -Fill (Color 247 250 252) -Line (Color 221 229 238) | Out-Null
        Add-Text -Slide $slide -Left ($x + 18) -Top ($y + 14) -Width 188 -Height 22 -Text $deployOptions[$i][0] -Size 18 -Rgb $deployOptions[$i][2] -Bold $true | Out-Null
        Add-Text -Slide $slide -Left ($x + 18) -Top ($y + 42) -Width 200 -Height 42 -Text $deployOptions[$i][1] -Size 13 -Rgb $colors.darkInk | Out-Null
    }
    Add-BulletList $slide 80 414 760 60 @(
        'La prioridad futura no es anadir modulos sin control, sino endurecer despliegue, seguridad y soporte.',
        'Las funciones secundarias quedan identificadas para justificar con claridad el recorte de alcance.'
    ) 18 | Out-Null
    Set-SlideNotes $slide @'
Aqui tengo que defender bien el alcance.

Lo principal ya esta cerrado: portales, documentos, mensajeria, correo, cloud y escritorio.
Lo que dejo para despues no son huecos del nucleo, sino mejoras de endurecimiento y evolucion.
Eso demuestra criterio: he preferido cerrar bien el producto base antes que abarcar mas cosas a medias.
'@

    # 18. Limitaciones
    $slide = Add-Slide $presentation
    Add-Header $slide '17 / Limitaciones' 'Que queda fuera de esta entrega'
    Add-BulletList $slide 78 160 360 230 @(
        'Infraestructura mas gestionada y endurecida que la VM actual.',
        'Integracion con SSO o identidad corporativa.',
        'Firma electronica avanzada.',
        'Migracion del almacenamiento documental a un servicio gestionado independiente.',
        'Perfilado profundo de rendimiento en produccion.'
    ) 19 | Out-Null
    Add-Box -Slide $slide -Left 536 -Top 162 -Width 320 -Height 210 -Fill (Color 29 36 48) -Line $colors.line | Out-Null
    Add-Text -Slide $slide -Left 568 -Top 192 -Width 260 -Height 32 -Text 'Siguiente iteracion' -Size 20 -Rgb $colors.amber -Bold $true | Out-Null
    Add-Text -Slide $slide -Left 568 -Top 244 -Width 245 -Height 82 -Text 'Despliegue estable, dominio propio, base de datos de servidor y seguridad endurecida.' -Size 23 -Rgb $colors.ink -Bold $true | Out-Null
    Set-SlideNotes $slide @'
No debo esconder las limitaciones.

Lo que falta no invalida el TFG, pero si marca una hoja de ruta realista:
SSO, firma avanzada, dominio propio, observabilidad y servicios gestionados.
Tambien puedo mencionar que Symfony sigue una version que convendria actualizar tras la entrega para mantenimiento a medio plazo.
'@

    # 19. Cierre
    $slide = Add-Slide $presentation
    Add-Header $slide '18 / Cierre' 'Resultado defendible'
    Add-Text -Slide $slide -Left 92 -Top 158 -Width 760 -Height 118 -Text 'El proyecto transforma una gestion dispersa en una plataforma web funcional, trazable y documentada para empresas colaboradoras y practicas de FP Dual.' -Size 30 -Rgb $colors.ink -Bold $true | Out-Null
    Add-BulletList $slide 128 322 690 90 @(
        'Problema real del centro.',
        'Arquitectura completa con backend, dos frontends y operacion local.',
        'Validacion tecnica, empaquetado y demo preparados.'
    ) 19 | Out-Null
    Add-Text -Slide $slide -Left 330 -Top 468 -Width 300 -Height 32 -Text 'Demo y preguntas' -Size 22 -Rgb $colors.amber -Bold $true | Out-Null
    Set-SlideNotes $slide @'
Aqui cierro con una idea simple.

El valor del proyecto no esta en una tecnologia concreta, sino en haber convertido una necesidad real del centro en una solucion completa, funcional y defendible.
Despues de esta slide paso a demo o a preguntas, segun el tiempo.
'@

    if (Test-Path $outputPptx) { Remove-Item $outputPptx -Force }
    if (Test-Path $outputPdf) { Remove-Item $outputPdf -Force }
    $presentation.SaveAs($outputPptx, 24)
    $presentation.SaveAs($outputPdf, 32)
}
finally {
    if ($null -ne $presentation) {
        try { $presentation.Close() } catch { }
    }
    if ($null -ne $powerPoint) {
        try { $powerPoint.Quit() } catch { }
    }
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
Defiende la separacion: Symfony concentra negocio y seguridad; React se divide en panel interno y portal externo; documentacion y Agora Desktop no contaminan el flujo operativo.

## 5. Modelo y flujo
Insiste en el orden de negocio: empresa activa, convenio operativo, asignacion, seguimiento y evaluacion. Esto demuestra que no son CRUD aislados.

Si me piden concretarlo, lo explico asi:

1. la empresa entra por solicitud externa y el centro la aprueba;
2. al aprobarla, pasa al catalogo interno de empresas activas;
3. despues se completa la ficha de empresa y se puede registrar el tutor profesional;
4. luego se formaliza el convenio entre centro y empresa;
5. la asignacion es donde se vinculan estudiante, convenio, tutores, horas, fechas y modalidad;
6. sobre esa asignacion se registran seguimientos, reuniones, evidencias y la evaluacion final;
7. la evaluacion final queda ligada a la asignacion, no a un seguimiento suelto.

## 6. Panel interno
Muestra dashboard, KPI, modulos y exportacion CSV. Di que es la herramienta de trabajo diaria para coordinacion.

## 7. Flujo empresa-centro
Explica solicitudes, verificacion por correo, aprobacion interna y bandeja. Este punto conecta el centro con empresas reales.

## 8. Portal externo
Explica que la empresa puede registrarse, consultar estado, activar cuenta, recuperar contrasena y comunicarse sin acceder al panel interno.

## 9. Como lo he desarrollado
Explica por fases: problema real, modelo de datos, backend, portal interno, portal externo y operacion final con escritorio, pruebas y empaquetado.

## 10. Gestor de correos
Aclara que el proveedor configurado es Brevo. Se usa para verificacion, activacion de cuenta, recuperacion de contrasena, MFA tecnico local y avisos de rechazo.

## 11. Dominio externo
Explica el problema que habia: una URL local en el correo no sirve fuera. Ahora los enlaces publicos salen con el origen correcto de la VM cloud y quedan bajo HTTPS.

## 12. Mensajeria
Senala que la bandeja y el chat ya se refrescan solos. Esto mejora la demo y evita dar una imagen de aplicacion estatica.

## 13. Agora Desktop
Muestra que ya no dependes de varios terminales: la app de escritorio centraliza modo local, modo cloud, logs, smoke, reinicios y backups.

## 14. Validacion
Da cifras exactas solo si las acabas de regenerar. Lo importante es remarcar que se han validado flujos criticos, despliegue cloud, correo, mensajeria y escritorio.

## Roles y permisos
Explica que ya no es solo una idea futura: el backend aplica permisos reales.

`admin` tiene control completo y puede eliminar datos de prueba desde el portal interno. El borrado esta protegido para no romper relaciones: primero se eliminan asignaciones, despues convenios sin asignaciones y finalmente empresas sin convenios ni asignaciones.

`profesor` / `profesora` / coordinacion pueden crear, editar, consultar y trabajar el flujo diario, pero no ven ni pueden ejecutar acciones de eliminacion. Esto sirve para que la tutora pruebe la aplicacion sin riesgo de borrar datos.

Como mejora futura, la misma base de roles se puede ampliar a una matriz mas fina: perfiles de solo lectura, permisos por departamento, auditoria visible por rol y restricciones por centro o familia profesional.

## 15. Acceso de evaluacion
Indica la URL cloud efectiva y el usuario de prueba `profesora / Abrete01`. Si hace falta, comenta que tambien existe `profesor / Abrete01`. Aclara que sirven para que la tutora o profesorado testeen desde fuera mientras la VM este activa y que, si la IP cambia, la referencia buena es la URL mostrada por Agora Desktop.

## 16. Alcance cerrado
Deja explicitamente que el nucleo ya esta terminado: portales `/app` y `/externo`, correo real, documentos, mensajeria, despliegue cloud por HTTPS y Agora Desktop como consola tecnica local/cloud.

## 17. Mejoras futuras
Explica que el siguiente paso ya no es "hacer que funcione", sino endurecer dominio, observabilidad, servicios gestionados y ampliar el cliente tecnico sin mezclarlo con negocio.

## 18. Limitaciones
No las escondas: SSO, firma avanzada, migracion documental a un servicio gestionado independiente, dominio propio y perfilado productivo quedan como lineas futuras. Aclara que el despliegue cloud funcional si esta hecho; lo que no esta cerrado es una infraestructura mas endurecida y gestionada.

## 19. Cierre
Cierra con una frase directa: el valor del TFG esta en convertir una necesidad real en una solucion completa, funcional, trazable y defendible.

## Orden rapido de demo
1. Abrir `URL cloud efectiva/app/`.
2. Login con `profesora / Abrete01`.
3. Dashboard y exportacion CSV.
4. Solicitudes, bandeja y refresco de mensajes.
5. Convenios/asignaciones.
6. Portal externo en `URL cloud efectiva/externo/`.
7. Agora Desktop en modo cloud si queda tiempo.
'@

Set-Content -Path $notesPath -Value $notes -Encoding UTF8

Write-Host "Presentacion generada: $outputPptx"
Write-Host "PDF generado: $outputPdf"
Write-Host "Guion generado: $notesPath"
