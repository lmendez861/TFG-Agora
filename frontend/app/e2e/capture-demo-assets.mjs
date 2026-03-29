import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendAppDir = path.resolve(__dirname, '..');
const rootDir = path.resolve(frontendAppDir, '..', '..');
const docsCapturasDir = path.join(rootDir, 'docs', 'capturas');
const docsVideoDir = path.join(rootDir, 'docs', 'video');
const baseURL = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:8000';
const mode = process.argv[2] ?? 'all';

const USERNAME = 'admin';
const PASSWORD = 'admin123';

fs.mkdirSync(docsCapturasDir, { recursive: true });
fs.mkdirSync(docsVideoDir, { recursive: true });

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function showCaption(page, title, detail) {
  await page.evaluate(({ title: nextTitle, detail: nextDetail }) => {
    const existing = document.getElementById('codex-demo-caption');
    if (existing) {
      existing.remove();
    }

    const wrapper = document.createElement('div');
    wrapper.id = 'codex-demo-caption';
    wrapper.innerHTML = `
      <div style="font-size:14px;letter-spacing:.18em;text-transform:uppercase;opacity:.8;margin-bottom:8px;">Demo guiada</div>
      <div style="font-size:28px;font-weight:800;margin-bottom:10px;">${nextTitle}</div>
      <div style="font-size:18px;line-height:1.45;max-width:860px;">${nextDetail}</div>
    `;
    Object.assign(wrapper.style, {
      position: 'fixed',
      left: '32px',
      bottom: '32px',
      zIndex: '2147483647',
      width: 'min(920px, calc(100vw - 64px))',
      background: 'rgba(7, 14, 25, 0.86)',
      color: '#f7f7fb',
      border: '1px solid rgba(255,255,255,0.14)',
      borderRadius: '20px',
      boxShadow: '0 20px 60px rgba(0,0,0,.35)',
      padding: '20px 24px',
      backdropFilter: 'blur(12px)',
      fontFamily: '"Segoe UI", Arial, sans-serif',
    });

    document.body.appendChild(wrapper);
  }, { title, detail });
}

async function hideCaption(page) {
  await page.evaluate(() => {
    document.getElementById('codex-demo-caption')?.remove();
  });
}

async function ensureInternalLogin(page) {
  await page.goto(`${baseURL}/app/login`, { waitUntil: 'networkidle' });
  await page.getByLabel(/usuario|email|username/i).fill(USERNAME);
  await page.getByLabel(/contrasena|password/i).fill(PASSWORD);
  await Promise.all([
    page.waitForResponse((response) => response.url().includes('/api/login') && response.status() === 204),
    page.getByRole('button', { name: /entrar|acceder|iniciar/i }).click(),
  ]);
  await page.waitForURL(/\/app(?:\/)?$/);
  await page.getByRole('button', { name: /salir/i }).waitFor({ state: 'visible', timeout: 15000 });
}

async function captureScreenshots(page) {
  console.log('[capture-demo-assets] screenshot dashboard');
  await page.goto(`${baseURL}/app`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: /salir/i }).waitFor({ state: 'visible', timeout: 15000 });
  await page.screenshot({ path: path.join(docsCapturasDir, '03-panel-interno-dashboard.png') });

  console.log('[capture-demo-assets] screenshot bandeja');
  await page.goto(`${baseURL}/app/bandeja`, { waitUntil: 'domcontentloaded' });
  await page.getByText(/Bandeja unificada de empresas/i).waitFor({ state: 'visible', timeout: 15000 });
  await page.screenshot({ path: path.join(docsCapturasDir, '04-panel-interno-bandeja.png') });

  console.log('[capture-demo-assets] screenshot solicitudes csv');
  await page.goto(`${baseURL}/app/solicitudes`, { waitUntil: 'domcontentloaded' });
  await page.getByText(/Solicitudes de empresa/i).waitFor({ state: 'visible', timeout: 15000 });
  await page.screenshot({ path: path.join(docsCapturasDir, '08-solicitudes-exportar-csv.png') });

  console.log('[capture-demo-assets] screenshot documentacion');
  await page.goto(`${baseURL}/documentacion`, { waitUntil: 'domcontentloaded' });
  await sleep(1000);
  await page.screenshot({ path: path.join(docsCapturasDir, '06-documentacion-guia.png') });

  console.log('[capture-demo-assets] screenshot monitor');
  await page.goto(`${baseURL}/monitor/acceso`, { waitUntil: 'domcontentloaded' });
  await page.getByText(/Exposicion publica y URLs/i).waitFor({ state: 'visible', timeout: 15000 });
  await page.screenshot({ path: path.join(docsCapturasDir, '07-monitor-operativo.png') });

  console.log('[capture-demo-assets] screenshot portal externo');
  await page.goto(`${baseURL}/externo`, { waitUntil: 'domcontentloaded' });
  await sleep(1000);
  await page.screenshot({ path: path.join(docsCapturasDir, '05-portal-externo.png') });

  console.log('[capture-demo-assets] screenshot acceso empresa');
  await page.goto(`${baseURL}/externo/acceso`, { waitUntil: 'domcontentloaded' });
  await sleep(800);
  await page.screenshot({ path: path.join(docsCapturasDir, '09-portal-externo-acceso.png') });
}

async function recordDemoVideo(page) {
  await showCaption(page, 'Portal interno', 'Pantalla de acceso profesional y arranque del entorno interno.');
  await page.goto(`${baseURL}/app/login`, { waitUntil: 'networkidle' });
  await sleep(1800);

  await page.getByLabel(/usuario|email|username/i).fill(USERNAME);
  await page.getByLabel(/contrasena|password/i).fill(PASSWORD);
  await Promise.all([
    page.waitForResponse((response) => response.url().includes('/api/login') && response.status() === 204),
    page.getByRole('button', { name: /entrar|acceder|iniciar/i }).click(),
  ]);
  await page.waitForURL(/\/app(?:\/)?$/);
  await sleep(1500);

  await showCaption(page, 'Dashboard y exportacion', 'El panel interno centraliza KPI, accesos rapidos y la exportacion CSV del resumen operativo.');
  await sleep(2200);

  await page.goto(`${baseURL}/app/bandeja`, { waitUntil: 'networkidle' });
  await showCaption(page, 'Bandeja unificada', 'La comunicacion con empresas se concentra en una vista tipo inbox enlazada con las solicitudes.');
  await sleep(2200);

  await page.goto(`${baseURL}/monitor/acceso`, { waitUntil: 'networkidle' });
  await showCaption(page, 'Monitor privado', 'El monitor muestra servicios, logs y el control del acceso publico con MFA por correo.');
  await sleep(2400);

  await page.goto(`${baseURL}/externo`, { waitUntil: 'networkidle' });
  await showCaption(page, 'Portal externo', 'La empresa puede registrarse, verificar su correo, consultar estado y continuar el flujo desde una interfaz dedicada.');
  await sleep(2400);

  await page.goto(`${baseURL}/externo/acceso`, { waitUntil: 'networkidle' });
  await showCaption(page, 'Acceso persistente de empresa', 'Tras la aprobacion, la empresa activa su cuenta, inicia sesion y puede recuperar su contrasena.');
  await sleep(2400);

  await page.goto(`${baseURL}/documentacion`, { waitUntil: 'networkidle' });
  await showCaption(page, 'Documentacion separada', 'La memoria, la guia y los anexos quedan fuera del flujo operativo para una defensa mas clara.');
  await sleep(2200);
  await hideCaption(page);
}

async function main() {
  console.log(`[capture-demo-assets] mode=${mode}`);
  const browser = await chromium.launch({ headless: true });
  const contextOptions = {
    viewport: { width: 1600, height: 900 },
  };

  if (mode === 'video' || mode === 'all') {
    contextOptions.recordVideo = {
      dir: docsVideoDir,
      size: { width: 1600, height: 900 },
    };
  }

  const context = await browser.newContext(contextOptions);

  const page = await context.newPage();
  const video = page.video();

  console.log('[capture-demo-assets] login interno');
  await ensureInternalLogin(page);

  if (mode === 'screenshots' || mode === 'all') {
    console.log('[capture-demo-assets] generando capturas');
    await captureScreenshots(page);
  }

  if (mode === 'video' || mode === 'all') {
    console.log('[capture-demo-assets] grabando video');
    await recordDemoVideo(page);
  }

  await context.close();

  if ((mode === 'video' || mode === 'all') && video) {
    const finalPath = path.join(docsVideoDir, 'demo-portales-interno-externo.webm');
    const sourcePath = await video.path();
    if (fs.existsSync(finalPath)) {
      fs.rmSync(finalPath, { force: true });
    }
    fs.copyFileSync(sourcePath, finalPath);
    console.log(`[capture-demo-assets] video guardado en ${finalPath}`);
  }

  await browser.close();
  console.log('[capture-demo-assets] fin');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
