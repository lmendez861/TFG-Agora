import fs from 'node:fs';
import path from 'node:path';
import { chromium } from '@playwright/test';

const rootDir = path.resolve(import.meta.dirname, '../../..');
const videoOutputDir = path.join(rootDir, 'docs', 'video');
const rawVideoDir = path.join(videoOutputDir, '.raw');
const finalVideoPath = path.join(videoOutputDir, 'demo-portales-directo-5min.webm');
const baseUrl = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:8000';
const desktopScreenshotPath = path.join(rootDir, 'docs', 'capturas', '07-agora-desktop-operativo.png');
const desktopScreenshotDataUrl = `data:image/png;base64,${fs.readFileSync(desktopScreenshotPath).toString('base64')}`;

const INTERNAL_USER = process.env.DEMO_INTERNAL_USER ?? 'profesora';
const INTERNAL_PASSWORD = process.env.DEMO_INTERNAL_PASSWORD ?? 'Abrete01';
const EXTERNAL_EMAIL = process.env.DEMO_EXTERNAL_EMAIL ?? 'laura.marquez@novaform.example.org';
const EXTERNAL_PASSWORD = process.env.DEMO_EXTERNAL_PASSWORD ?? 'EmpresaDemo01!';

function ensureDir(targetPath) {
  fs.mkdirSync(targetPath, { recursive: true });
}

async function hold(page, milliseconds) {
  await page.waitForTimeout(milliseconds);
}

async function smoothScroll(page, deltaY, steps = 8, pauseMs = 350) {
  const chunk = Math.trunc(deltaY / steps);
  for (let index = 0; index < steps; index += 1) {
    await page.mouse.wheel(0, chunk);
    await page.waitForTimeout(pauseMs);
  }
}

function buildSlideHtml({ eyebrow, title, body, extra = '', compact = false }) {
  return `<!doctype html>
  <html lang="es">
    <head>
      <meta charset="utf-8" />
      <style>
        :root {
          color-scheme: dark;
          font-family: Inter, "Segoe UI", sans-serif;
        }
        * {
          box-sizing: border-box;
        }
        body {
          margin: 0;
          min-height: 100vh;
          display: grid;
          place-items: center;
          background:
            radial-gradient(circle at top left, rgba(255, 177, 82, 0.18), transparent 28%),
            radial-gradient(circle at top right, rgba(0, 51, 102, 0.28), transparent 35%),
            #020712;
          color: #f4f2ff;
        }
        main {
          width: min(1180px, calc(100vw - 96px));
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 28px;
          padding: ${compact ? '36px 40px' : '48px 56px'};
          background: linear-gradient(145deg, rgba(7, 18, 40, 0.95), rgba(3, 8, 20, 0.96));
          box-shadow: 0 24px 80px rgba(0, 0, 0, 0.45);
        }
        .eyebrow {
          margin: 0 0 14px;
          color: #ffb152;
          font-size: 15px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0;
        }
        h1 {
          margin: 0;
          font-size: ${compact ? '36px' : '46px'};
          line-height: 1.08;
        }
        p {
          margin: 20px 0 0;
          max-width: 820px;
          color: #c7d2e5;
          font-size: ${compact ? '20px' : '24px'};
          line-height: 1.55;
        }
        .extra {
          margin-top: 28px;
        }
        .badge-row {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin-top: 26px;
        }
        .badge {
          padding: 10px 14px;
          border-radius: 999px;
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.1);
          color: #ecf1fb;
          font-size: 16px;
          font-weight: 700;
        }
      </style>
    </head>
    <body>
      <main>
        <p class="eyebrow">${eyebrow}</p>
        <h1>${title}</h1>
        <p>${body}</p>
        ${extra ? `<div class="extra">${extra}</div>` : ''}
      </main>
    </body>
  </html>`;
}

async function showSlide(page, content, durationMs) {
  await page.setContent(content, { waitUntil: 'load' });
  await hold(page, durationMs);
}

async function loginInternal(page) {
  await page.goto(`${baseUrl}/app`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('heading', { name: /Entrar al panel/i }).waitFor({ state: 'visible' });
  await hold(page, 5000);
  await page.getByLabel(/^Usuario$/i).fill(INTERNAL_USER);
  await page.getByLabel(/^Contrasena$/i).fill(INTERNAL_PASSWORD);
  await hold(page, 1500);
  await Promise.all([
    page.waitForResponse((response) => response.url().includes('/api/login') && response.status() === 204),
    page.getByRole('button', { name: /Entrar al portal interno/i }).click(),
  ]);
  await page.getByText(/Panel de practicas/i).waitFor({ state: 'visible' });
  await hold(page, 9000);
  await smoothScroll(page, 700, 8, 400);
  await hold(page, 3000);
}

async function showInternalSections(page) {
  await showSlide(
    page,
    buildSlideHtml({
      eyebrow: 'Portal interno',
      title: 'Panel operativo del centro',
      body: 'En este bloque enseño el trabajo diario del centro: dashboard, revisión de solicitudes, ficha de empresa, convenios, asignaciones, seguimientos y mensajería unificada.',
      extra: `
        <div class="badge-row">
          <span class="badge">dashboard</span>
          <span class="badge">solicitudes</span>
          <span class="badge">empresas</span>
          <span class="badge">convenios</span>
          <span class="badge">asignaciones</span>
          <span class="badge">bandeja</span>
        </div>`,
      compact: true,
    }),
    6000,
  );

  await page.goto(`${baseUrl}/app/solicitudes`, { waitUntil: 'networkidle' });
  await page.getByRole('heading', { name: /Solicitudes de registro/i }).waitFor({ state: 'visible' });
  await hold(page, 9000);
  await smoothScroll(page, 620, 7, 350);
  await hold(page, 2500);

  await page.goto(`${baseUrl}/app/empresas/1`, { waitUntil: 'networkidle' });
  await page.getByText(/Espacio privado  Empresas/i).waitFor({ state: 'visible' });
  await hold(page, 9000);
  await smoothScroll(page, 950, 9, 350);
  await hold(page, 3000);

  await page.goto(`${baseUrl}/app/convenios`, { waitUntil: 'networkidle' });
  await page.getByRole('heading', { name: /Convenios y acuerdos/i }).waitFor({ state: 'visible' });
  await hold(page, 9000);
  await smoothScroll(page, 980, 9, 350);
  await hold(page, 3000);

  await page.goto(`${baseUrl}/app/asignaciones/2`, { waitUntil: 'networkidle' });
  await page.getByText(/Detalle de asignacion/i).waitFor({ state: 'visible' });
  await hold(page, 9000);
  const seguimientoTitle = page.getByText(/Seguimientos operativos/i);
  if (await seguimientoTitle.isVisible().catch(() => false)) {
    await seguimientoTitle.scrollIntoViewIfNeeded();
    await hold(page, 8000);
  } else {
    await smoothScroll(page, 1100, 10, 350);
    await hold(page, 5000);
  }

  await page.goto(`${baseUrl}/app/bandeja`, { waitUntil: 'networkidle' });
  await page.getByText(/Bandeja unificada de empresas/i).waitFor({ state: 'visible' });
  await hold(page, 8000);
  const firstThread = page.locator('.inbox-thread').first();
  if (await firstThread.isVisible().catch(() => false)) {
    await firstThread.click();
    await hold(page, 9000);
  }

  await page.goto(`${baseUrl}/documentacion/flujo`, { waitUntil: 'networkidle' });
  await page.getByText(/Flujo de trabajo recomendado/i).waitFor({ state: 'visible' });
  await hold(page, 7000);
  await smoothScroll(page, 650, 7, 350);
  await hold(page, 2500);
}

async function loginExternal(page) {
  await showSlide(
    page,
    buildSlideHtml({
      eyebrow: 'Portal externo',
      title: 'Alta y seguimiento para empresas',
      body: 'Ahora enseño el portal que utiliza la empresa. La cuenta se crea antes, luego se completa la solicitud, se sigue el estado y se mantiene el canal de mensajes con el centro.',
      extra: `
        <div class="badge-row">
          <span class="badge">cuenta previa</span>
          <span class="badge">solicitud</span>
          <span class="badge">estado</span>
          <span class="badge">mensajería</span>
          <span class="badge">documentos</span>
        </div>`,
      compact: true,
    }),
    6000,
  );

  await page.goto(`${baseUrl}/externo`, { waitUntil: 'networkidle' });
  await hold(page, 8000);
  await smoothScroll(page, 850, 8, 350);
  await hold(page, 2500);

  await page.goto(`${baseUrl}/externo/acceso`, { waitUntil: 'networkidle' });
  await page.getByRole('heading', { name: /Acceso persistente/i }).waitFor({ state: 'visible' });
  await hold(page, 5000);
  await page.getByLabel(/Email corporativo/i).fill(EXTERNAL_EMAIL);
  await page.getByLabel(/^Contrasena$/i).fill(EXTERNAL_PASSWORD);
  await hold(page, 1500);
  await Promise.all([
    page.waitForURL(/\/externo\/panel/),
    page.getByRole('button', { name: /Entrar al portal/i }).click(),
  ]);
  await hold(page, 9000);
}

async function showExternalSections(page) {
  await page.getByText(/Area privada empresa/i).waitFor({ state: 'visible' });
  await smoothScroll(page, 1000, 10, 350);
  await hold(page, 4000);

  await page.goto(`${baseUrl}/externo/estado`, { waitUntil: 'networkidle' });
  await page.getByRole('heading', { name: /Estado de la solicitud/i }).waitFor({ state: 'visible' });
  await hold(page, 8000);
  await smoothScroll(page, 1100, 10, 350);
  await hold(page, 3000);

  await page.goto(`${baseUrl}/externo/panel`, { waitUntil: 'networkidle' });
  await page.getByText(/Area privada empresa/i).waitFor({ state: 'visible' });
  const messagesTitle = page.getByRole('heading', { name: /Canal con el centro/i });
  if (await messagesTitle.isVisible().catch(() => false)) {
    await messagesTitle.scrollIntoViewIfNeeded();
    await hold(page, 9000);
  } else {
    await smoothScroll(page, 1300, 12, 350);
    await hold(page, 5000);
  }
}

async function showDesktopSection(page) {
  const desktopHtml = buildSlideHtml({
    eyebrow: 'Agora Desktop',
    title: 'Consola técnica para cloud y respaldo local',
    body: 'La aplicación de escritorio concentra la operación técnica: conexión cloud, lectura de la URL actual, estado del servicio, acceso a logs, smoke técnico y modo local como contingencia si el despliegue público falla.',
    extra: `
        <div style="display:grid;grid-template-columns:minmax(0,1.2fr) minmax(300px,0.8fr);gap:28px;align-items:start;">
          <div style="border:1px solid rgba(255,255,255,0.08);border-radius:20px;overflow:hidden;background:#0b1624;">
          <img src="${desktopScreenshotDataUrl}" alt="Agora Desktop" style="display:block;width:100%;height:auto;" />
          </div>
        <div style="display:flex;flex-direction:column;gap:16px;">
          <div class="badge-row" style="margin-top:0;">
            <span class="badge">modo cloud</span>
            <span class="badge">URL efectiva</span>
            <span class="badge">agora.service</span>
            <span class="badge">logs</span>
            <span class="badge">smoke</span>
            <span class="badge">backup</span>
          </div>
          <p style="margin-top:0;font-size:20px;line-height:1.55;">
            En defensa me permite comprobar rápidamente si la VM responde, ver la URL vigente cuando cambia la IP pública y relanzar validaciones sin depender del navegador.
          </p>
          <p style="margin-top:0;font-size:20px;line-height:1.55;">
            Si el cloud falla, el mismo escritorio sigue sirviendo para levantar el entorno local y continuar la demostración con el mismo backend integrado.
          </p>
        </div>
      </div>`,
  });
  await showSlide(page, desktopHtml, 22000);
}

async function showClosingSection(page) {
  await showSlide(
    page,
    buildSlideHtml({
      eyebrow: 'Cierre',
      title: 'Recorrido de defensa preparado',
      body: 'El vídeo deja cubiertos los puntos principales del TFG: operación interna del centro, flujo de empresa desde el portal externo y supervisión técnica con Agora Desktop.',
      extra: `
        <div class="badge-row">
          <span class="badge">portal interno</span>
          <span class="badge">portal externo</span>
          <span class="badge">documentación</span>
          <span class="badge">desktop</span>
        </div>`,
      compact: true,
    }),
    9000,
  );
}

async function main() {
  ensureDir(videoOutputDir);
  fs.rmSync(rawVideoDir, { recursive: true, force: true });
  ensureDir(rawVideoDir);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    recordVideo: {
      dir: rawVideoDir,
      size: { width: 1440, height: 900 },
    },
  });

  const page = await context.newPage();
  const video = page.video();

  try {
    await showSlide(
      page,
      buildSlideHtml({
        eyebrow: 'TFG Agora',
        title: 'Demostración guiada de portales y operación técnica',
        body: 'Este recorrido enseña el flujo funcional principal del proyecto con un ritmo más lento: portal interno, portal externo, documentación y Agora Desktop.',
        extra: `
          <div class="badge-row">
            <span class="badge">coordinación académica</span>
            <span class="badge">empresa colaboradora</span>
            <span class="badge">mensajería</span>
            <span class="badge">documentos</span>
            <span class="badge">despliegue cloud</span>
          </div>`,
      }),
      8000,
    );

    await loginInternal(page);
    await showInternalSections(page);
    await loginExternal(page);
    await showExternalSections(page);
    await showDesktopSection(page);
    await showClosingSection(page);
  } finally {
    await page.close();
    await context.close();
    await browser.close();
  }

  if (!video) {
    throw new Error('No se ha generado el objeto de video de Playwright.');
  }

  const rawPath = await video.path();
  if (fs.existsSync(finalVideoPath)) {
    fs.rmSync(finalVideoPath, { force: true });
  }

  fs.copyFileSync(rawPath, finalVideoPath);
  console.log(finalVideoPath);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
