const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const outputDir = path.join(rootDir, 'docs', 'capturas');

const API_BASE = process.env.MEMORY_API_BASE || 'http://127.0.0.1:8000/api';
const API_USER = process.env.MEMORY_API_USER || 'admin';
const API_PASS = process.env.MEMORY_API_PASS || 'admin123';
const authHeader = `Basic ${Buffer.from(`${API_USER}:${API_PASS}`).toString('base64')}`;

async function apiGet(endpoint) {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    headers: {
      Authorization: authHeader,
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`GET ${endpoint} -> ${response.status}`);
  }

  return response.json();
}

function baseTemplate(title, body) {
  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title}</title>
  <style>
    :root {
      --bg: #eef3f8;
      --panel: #ffffff;
      --panel-soft: #f5f8fc;
      --line: #d8e2ee;
      --text: #18222f;
      --muted: #5d6e82;
      --accent: #1d4f8c;
      --ok: #2d8f63;
      --warn: #b27b17;
    }
    body {
      margin: 0;
      font-family: Arial, sans-serif;
      background: var(--bg);
      color: var(--text);
    }
    .frame {
      width: 1440px;
      min-height: 1024px;
      margin: 0 auto;
      padding: 32px;
    }
    .clearfix:after {
      content: "";
      display: table;
      clear: both;
    }
    .topbar {
      background: #11243c;
      border: 1px solid var(--line);
      border-radius: 18px;
      padding: 18px 24px;
    }
    .brand {
      float: left;
    }
    .brand strong {
      font-size: 26px;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: #ffffff;
    }
    .brand .badge {
      display: inline-block;
      margin-left: 14px;
      border-radius: 999px;
      padding: 7px 12px;
      font-size: 13px;
      font-weight: 600;
      background: #e6eff9;
      color: var(--accent);
      vertical-align: top;
      margin-top: 3px;
    }
    .topbar__meta {
      float: right;
      color: var(--muted);
      font-size: 15px;
    }
    .topbar__meta span {
      display: inline-block;
      margin-left: 14px;
      color: #d7e4f5;
    }
    .pill {
      display: inline-block;
      border-radius: 999px;
      padding: 7px 12px;
      font-size: 13px;
      font-weight: 700;
      background: #e8f4ee;
      color: var(--ok);
    }
    .page {
      margin-top: 28px;
    }
    .hero, .section, .table-card {
      background: var(--panel);
      border: 1px solid var(--line);
      border-radius: 22px;
      padding: 26px 28px;
      margin-bottom: 22px;
    }
    .hero h1 {
      margin: 0 0 10px;
      font-size: 50px;
      line-height: 1.06;
    }
    .hero p {
      margin: 0;
      color: var(--muted);
      font-size: 22px;
      line-height: 1.5;
    }
    .hero__eyebrow, .section__eyebrow {
      margin: 0 0 12px;
      text-transform: uppercase;
      letter-spacing: 0.16em;
      color: var(--accent);
      font-size: 14px;
      font-weight: 700;
    }
    .cta-row {
      margin-top: 26px;
    }
    .cta {
      display: inline-block;
      margin-right: 12px;
      padding: 12px 18px;
      border-radius: 14px;
      font-weight: 700;
      font-size: 16px;
      border: 1px solid transparent;
    }
    .cta--primary {
      background: #1c4b82;
      color: white;
    }
    .cta--secondary {
      background: #f4f7fb;
      color: var(--accent);
      border-color: var(--line);
    }
    .grid {
      width: 100%;
      border-collapse: separate;
      border-spacing: 18px 0;
      table-layout: fixed;
    }
    .stat {
      background: var(--panel-soft);
      border: 1px solid var(--line);
      border-radius: 20px;
      padding: 18px;
    }
    .stat__label { color: var(--muted); font-size: 14px; }
    .stat__value { font-size: 34px; font-weight: 800; margin-top: 8px; }
    .section h2, .table-card h2 {
      margin: 0 0 14px;
      font-size: 30px;
    }
    .muted {
      color: var(--muted);
    }
    .meta-grid {
      width: 100%;
      border-collapse: separate;
      border-spacing: 18px 18px;
      table-layout: fixed;
    }
    .meta-card {
      background: var(--panel-soft);
      border: 1px solid var(--line);
      border-radius: 20px;
      padding: 18px;
      vertical-align: top;
    }
    .meta-card h3 {
      margin: 0 0 12px;
      font-size: 22px;
    }
    .meta-card p {
      margin: 0 0 10px;
      line-height: 1.45;
    }
    .note-list {
      margin: 0;
      padding-left: 22px;
      line-height: 1.6;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 16px;
      background: #ffffff;
    }
    th, td {
      padding: 14px 12px;
      border-bottom: 1px solid var(--line);
      text-align: left;
    }
    th { color: var(--muted); font-size: 14px; text-transform: uppercase; letter-spacing: 0.08em; }
    .pill { background: rgba(111,211,167,0.14); color: var(--ok); }
    .pill--pending { background: rgba(255,209,102,0.14); color: var(--warn); }
  </style>
</head>
<body>
  ${body}
</body>
</html>`;
}

function writeFile(name, html) {
  fs.writeFileSync(path.join(outputDir, name), html, 'utf8');
}

async function buildDashboardSnapshot() {
  const [empresas, convenios, estudiantes, asignaciones] = await Promise.all([
    apiGet('/empresas'),
    apiGet('/convenios'),
    apiGet('/estudiantes'),
    apiGet('/asignaciones'),
  ]);

  const body = `
  <div class="frame">
    <div class="topbar clearfix">
      <div class="brand">
        <strong>Agora</strong>
        <span class="badge">Panel interno</span>
      </div>
      <div class="topbar__meta">
        <span>Panel de practicas</span>
        <span class="pill">Sesion admin</span>
      </div>
    </div>
    <div class="page">
      <section class="hero">
        <p class="hero__eyebrow">Dashboard principal</p>
        <h1>Gestion integral de practicas, empresas y convenios</h1>
        <p>Vista general del panel interno con KPI, accesos rapidos y exportacion CSV del resumen operativo.</p>
        <div class="cta-row">
          <div class="cta cta--primary">Exportar CSV</div>
          <div class="cta cta--secondary">Actualizacion automatica</div>
        </div>
      </section>
      <section class="section">
        <p class="section__eyebrow">Indicadores</p>
        <table class="grid">
          <tr>
            <td><article class="stat"><div class="stat__label">Empresas</div><div class="stat__value">${empresas.length}</div></article></td>
            <td><article class="stat"><div class="stat__label">Convenios</div><div class="stat__value">${convenios.length}</div></article></td>
            <td><article class="stat"><div class="stat__label">Estudiantes</div><div class="stat__value">${estudiantes.length}</div></article></td>
            <td><article class="stat"><div class="stat__label">Asignaciones</div><div class="stat__value">${asignaciones.length}</div></article></td>
          </tr>
        </table>
      </section>
    </div>
  </div>`;

  writeFile('03-panel-interno-dashboard.html', baseTemplate('Panel interno - dashboard', body));
}

async function buildSolicitudesSnapshot() {
  const response = await apiGet('/empresa-solicitudes?page=1&perPage=10');
  const rows = response.items
    .map((item) => `
      <tr>
        <td>${item.id}</td>
        <td>${item.nombreEmpresa}</td>
        <td>${item.contactoNombre ?? 'Contacto'}</td>
        <td>${item.contactoEmail ?? 'sin-email'}</td>
        <td><span class="pill ${item.estado === 'pendiente' ? 'pill--pending' : ''}">${item.estado}</span></td>
      </tr>`)
    .join('');

  const body = `
  <div class="frame">
    <div class="topbar clearfix">
      <div class="brand">
        <strong>Agora</strong>
        <span class="badge">Panel interno</span>
      </div>
      <div class="topbar__meta">
        <span>Modulo de solicitudes</span>
        <span class="pill">Revision interna</span>
      </div>
    </div>
    <div class="page">
      <section class="table-card">
        <p class="section__eyebrow">Flujo implementado</p>
        <h2>Solicitudes recibidas desde el portal externo</h2>
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Empresa</th>
              <th>Contacto</th>
              <th>Email</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </section>
    </div>
  </div>`;

  writeFile('04-panel-interno-solicitudes.html', baseTemplate('Panel interno - solicitudes', body));
}

async function buildDocumentationGuideSnapshot() {
  const body = `
  <div class="frame">
    <div class="topbar clearfix">
      <div class="brand">
        <strong>Agora</strong>
        <span class="badge">Documentacion</span>
      </div>
      <div class="topbar__meta">
        <span>Guia funcional</span>
        <span class="pill">Lista para defensa</span>
      </div>
    </div>
    <div class="page">
      <section class="hero">
        <p class="hero__eyebrow">Recorrido recomendado</p>
        <h1>Guia de la plataforma para la memoria y la defensa</h1>
        <p>Vista publica de documentacion con resumen funcional, rutas clave y orden sugerido para la demostracion.</p>
      </section>
      <section class="section">
        <p class="section__eyebrow">Bloques principales</p>
        <table class="meta-grid">
          <tr>
            <td class="meta-card">
              <h3>Portal interno</h3>
              <p>Gestion de empresas, convenios, estudiantes, asignaciones, tutores y solicitudes.</p>
              <p class="muted">Ruta integrada: /app</p>
            </td>
            <td class="meta-card">
              <h3>Portal externo</h3>
              <p>Alta de empresa, verificacion por token y seguimiento de la solicitud.</p>
              <p class="muted">Ruta integrada: /externo</p>
            </td>
            <td class="meta-card">
              <h3>Monitor privado</h3>
              <p>Supervision de servicios, pruebas y estado del acceso externo temporal.</p>
              <p class="muted">Ruta integrada: /monitor</p>
            </td>
          </tr>
        </table>
      </section>
      <section class="section">
        <p class="section__eyebrow">Orden de demostracion</p>
        <ol class="note-list">
          <li>Abrir el dashboard del portal interno y mostrar los KPI principales.</li>
          <li>Entrar en solicitudes y ensenar el flujo de revision del portal externo.</li>
          <li>Ejecutar la exportacion CSV desde dashboard o desde un listado operativo.</li>
          <li>Pasar al portal externo para ensenar alta y seguimiento.</li>
          <li>Cerrar con monitor y documentacion como apoyo tecnico.</li>
        </ol>
      </section>
    </div>
  </div>`;

  writeFile('06-documentacion-guia.html', baseTemplate('Documentacion - guia', body));
}

async function buildMonitorSnapshot() {
  const [monitor, publicAccess] = await Promise.all([apiGet('/monitor'), apiGet('/public-access')]);

  const serviceRows = monitor.services
    .map(
      (service) => `
      <tr>
        <td>${service.name}</td>
        <td>${service.status}</td>
        <td>${service.detail}</td>
      </tr>`
    )
    .join('');

  const metricRows = monitor.metrics
    .slice(0, 6)
    .map(
      (metric) => `
      <tr>
        <td>${metric.label}</td>
        <td>${metric.value}</td>
        <td>${metric.hint}</td>
      </tr>`
    )
    .join('');

  const testRows = monitor.tests
    .map(
      (test) => `
      <tr>
        <td>${test.name}</td>
        <td>${test.status}</td>
        <td>${test.command}</td>
      </tr>`
    )
    .join('');

  const body = `
  <div class="frame">
    <div class="topbar clearfix">
      <div class="brand">
        <strong>Agora</strong>
        <span class="badge">Monitor privado</span>
      </div>
      <div class="topbar__meta">
        <span>Supervision tecnica</span>
        <span class="pill">${publicAccess.status === 'active' ? 'Acceso externo activo' : 'Acceso externo detenido'}</span>
      </div>
    </div>
    <div class="page">
      <section class="hero">
        <p class="hero__eyebrow">Estado operativo</p>
        <h1>Control de servicios, metricas y pruebas</h1>
        <p>Centro tecnico para comprobar salud de la API, paneles, acceso externo y resultados de validacion.</p>
      </section>
      <section class="section">
        <p class="section__eyebrow">Resumen</p>
        <table class="meta-grid">
          <tr>
            <td class="meta-card">
              <h3>Entorno</h3>
              <p>APP_ENV: ${monitor.environment.appEnv}</p>
              <p>API interna: ${API_BASE}</p>
              <p>PHP: ${monitor.environment.phpVersion}</p>
              <p>Zona horaria: ${monitor.environment.timezone}</p>
            </td>
            <td class="meta-card">
              <h3>Acceso externo</h3>
              <p>${publicAccess.detail}</p>
              <p class="muted">Objetivo local: ${publicAccess.targetUrl ?? 'n/d'}</p>
            </td>
            <td class="meta-card">
              <h3>Generado</h3>
              <p>${monitor.generatedAt}</p>
              <p class="muted">Snapshot tecnico para la memoria y la defensa.</p>
            </td>
          </tr>
        </table>
      </section>
      <section class="table-card">
        <p class="section__eyebrow">Servicios</p>
        <h2>Componentes supervisados</h2>
        <table>
          <thead><tr><th>Servicio</th><th>Estado</th><th>Detalle</th></tr></thead>
          <tbody>${serviceRows}</tbody>
        </table>
      </section>
      <section class="table-card">
        <p class="section__eyebrow">Metricas y pruebas</p>
        <h2>Indicadores operativos</h2>
        <table>
          <thead><tr><th>Metrica</th><th>Valor</th><th>Detalle</th></tr></thead>
          <tbody>${metricRows}</tbody>
        </table>
        <table style="margin-top:20px">
          <thead><tr><th>Suite</th><th>Estado</th><th>Comando</th></tr></thead>
          <tbody>${testRows}</tbody>
        </table>
      </section>
    </div>
  </div>`;

  writeFile('07-monitor-operativo.html', baseTemplate('Monitor privado', body));
}

async function main() {
  fs.mkdirSync(outputDir, { recursive: true });
  await buildDashboardSnapshot();
  await buildSolicitudesSnapshot();
  await buildDocumentationGuideSnapshot();
  await buildMonitorSnapshot();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
