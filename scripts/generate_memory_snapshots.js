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
      --bg: #041225;
      --panel: #0b1b31;
      --panel-soft: #102443;
      --line: rgba(255,255,255,0.08);
      --text: #e9f1fb;
      --muted: #9fb4cd;
      --accent: #ffb152;
      --ok: #6fd3a7;
      --warn: #ffd166;
      --radius: 20px;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: 'Segoe UI', Arial, sans-serif;
      background:
        radial-gradient(circle at top left, rgba(11,60,110,0.45), transparent 32%),
        radial-gradient(circle at top right, rgba(255,177,82,0.12), transparent 18%),
        var(--bg);
      color: var(--text);
    }
    .frame {
      width: 1440px;
      min-height: 1024px;
      margin: 0 auto;
      padding: 32px;
    }
    .topbar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: rgba(7, 24, 48, 0.94);
      border: 1px solid var(--line);
      border-radius: 26px;
      padding: 18px 24px;
      box-shadow: 0 18px 50px rgba(0,0,0,0.2);
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 14px;
    }
    .brand strong {
      font-size: 28px;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }
    .badge, .pill {
      border-radius: 999px;
      padding: 7px 12px;
      font-size: 14px;
      font-weight: 600;
    }
    .badge {
      background: rgba(255,177,82,0.14);
      color: var(--accent);
    }
    .topbar__meta {
      display: flex;
      gap: 12px;
      align-items: center;
      color: var(--muted);
    }
    .page {
      display: grid;
      gap: 24px;
      margin-top: 28px;
    }
    .hero, .section, .table-card {
      background: linear-gradient(180deg, rgba(10,27,49,0.96), rgba(7,20,37,0.96));
      border: 1px solid var(--line);
      border-radius: 28px;
      padding: 26px 28px;
      box-shadow: 0 18px 50px rgba(0,0,0,0.16);
    }
    .hero h1 {
      margin: 0 0 10px;
      font-size: 52px;
      line-height: 1.06;
      max-width: 980px;
    }
    .hero p {
      margin: 0;
      color: var(--muted);
      font-size: 22px;
      line-height: 1.5;
      max-width: 920px;
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
      display: flex;
      gap: 12px;
      margin-top: 26px;
    }
    .cta {
      padding: 12px 18px;
      border-radius: 14px;
      font-weight: 700;
      font-size: 16px;
    }
    .cta--primary {
      background: linear-gradient(135deg, #1c4b82, #16365c);
      color: white;
    }
    .cta--secondary {
      background: rgba(255,177,82,0.16);
      color: var(--accent);
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 18px;
    }
    .stat {
      background: rgba(255,255,255,0.03);
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
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 16px;
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
    <div class="topbar">
      <div class="brand">
        <strong>Agora</strong>
        <span class="badge">Panel interno</span>
      </div>
      <div class="topbar__meta">
        <span>API ${API_BASE}</span>
        <span class="pill">Sesion: admin</span>
      </div>
    </div>
    <div class="page">
      <section class="hero">
        <p class="hero__eyebrow">Dashboard principal</p>
        <h1>Gestion integral de practicas, empresas y convenios</h1>
        <p>Vista general del panel interno con KPI, accesos rapidos y exportacion CSV del resumen operativo.</p>
        <div class="cta-row">
          <div class="cta cta--primary">Exportar CSV</div>
          <div class="cta cta--secondary">Sincronizar datos</div>
        </div>
      </section>
      <section class="section">
        <p class="section__eyebrow">Indicadores</p>
        <div class="grid">
          <article class="stat"><div class="stat__label">Empresas</div><div class="stat__value">${empresas.length}</div></article>
          <article class="stat"><div class="stat__label">Convenios</div><div class="stat__value">${convenios.length}</div></article>
          <article class="stat"><div class="stat__label">Estudiantes</div><div class="stat__value">${estudiantes.length}</div></article>
          <article class="stat"><div class="stat__label">Asignaciones</div><div class="stat__value">${asignaciones.length}</div></article>
        </div>
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
    <div class="topbar">
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

async function main() {
  fs.mkdirSync(outputDir, { recursive: true });
  await buildDashboardSnapshot();
  await buildSolicitudesSnapshot();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
