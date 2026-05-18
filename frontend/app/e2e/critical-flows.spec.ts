/**
 * Comentario de mantenimiento Agora.
 * Proposito: Prueba end-to-end: recorre flujos reales del navegador contra la aplicacion levantada.
 * Relaciones: Conexiones principales indicadas por imports, inyeccion de dependencias o rutas del propio archivo.
 */
import { expect, test, type Locator, type Page } from '@playwright/test';

/**
 * Resume la responsabilidad de ensureInternalLogin dentro de este modulo y facilita seguir el flujo al revisarlo.
 * Si cambia su contrato, revisar los imports locales indicados en la cabecera del archivo.
 */
async function ensureInternalLogin(page: Page, readyLocator: Locator): Promise<void> {
  const loginHeading = page.getByRole('heading', { name: /Iniciar sesion|Entrar al panel/i });
  const loginButton = page.getByRole('button', { name: /entrar|acceder|iniciar/i });
  const usernameInput = page.getByLabel(/usuario|email|username/i);

  await Promise.race([
    loginHeading.waitFor({ state: 'visible', timeout: 15000 }).catch(() => null),
    loginButton.waitFor({ state: 'visible', timeout: 15000 }).catch(() => null),
    usernameInput.waitFor({ state: 'visible', timeout: 15000 }).catch(() => null),
    readyLocator.waitFor({ state: 'visible', timeout: 15000 }).catch(() => null),
  ]);

  if (!(await usernameInput.isVisible().catch(() => false))) {
    return;
  }

  await usernameInput.fill('admin');
  await page.getByLabel(/contrasena|password/i).fill('admin123');

  await Promise.all([
    page.waitForResponse((response) => response.url().includes('/api/login') && response.status() === 204),
    loginButton.click(),
  ]);

  await expect(readyLocator).toBeVisible({ timeout: 15000 });
}

test('internal portal login and dashboard load', async ({ page }) => {
  const readyLocator = page.getByRole('button', { name: /salir/i });
  await page.goto('/app');
  await ensureInternalLogin(page, readyLocator);

  await expect(page.getByText('Empresas').first()).toBeVisible();
  await expect(page.getByText('Convenios').first()).toBeVisible();
});

test('private monitor shell renders sections', async ({ page }) => {
  const readyLocator = page.getByText(/Supervision operativa separada del portal funcional/i);
  await page.goto('/legacy/monitor');
  await ensureInternalLogin(page, readyLocator);
  await page.waitForURL(/\/legacy\/monitor(\/sistemas)?/);

  await expect(page.getByText(/Supervision operativa separada del portal funcional/i)).toBeVisible();
  await expect(page.getByText(/Estado de componentes/i)).toBeVisible();
  await expect(page.getByText(/Respuesta y datos cargados/i)).toBeVisible();
});

test('external account-first flow reaches mail step', async ({ page }) => {
  await page.goto('/externo');
  const unique = Date.now();
  const password = `AgoraE2E${String(unique).slice(-6)}Aa1`;

  await page.getByLabel(/Persona responsable/i).fill('Contacto E2E');
  await page.getByLabel(/Email corporativo/i).fill(`e2e-${unique}@example.com`);
  await page.getByLabel(/^Contrasena/i).fill(password);
  await page.getByLabel(/Confirmar contrasena/i).fill(password);
  await page.getByRole('button', { name: /Crear cuenta y entrar/i }).click();

  await expect(page).toHaveURL(/\/externo\/panel/);
  await expect(page.getByText(/Completar solicitud/i)).toBeVisible();

  await page.getByLabel(/Nombre de la empresa/i).fill(`Empresa E2E ${unique}`);
  await page.getByLabel(/^Sector$/i).fill('Tecnologia');
  await page.getByLabel(/^Ciudad$/i).fill('Madrid');
  await page.getByLabel(/Persona responsable/i).fill('Contacto E2E');
  await page.getByRole('button', { name: /Enviar solicitud/i }).click();

  await expect(page).toHaveURL(/\/externo\/correo/);
  await expect(page.locator('text=Verificacion por correo')).toBeVisible();
});

test('csv export endpoints respond across operational scopes', async ({ request }) => {
  const loginResponse = await request.post('/api/login', {
    data: {
      username: 'admin',
      password: 'admin123',
    },
  });
  expect(loginResponse.status()).toBe(204);

  const exportPaths = [
    '/api/export/empresas.csv',
    '/api/export/convenios.csv',
    '/api/export/estudiantes.csv',
    '/api/export/asignaciones.csv',
    '/api/export/tutores-academicos.csv',
    '/api/export/tutores-profesionales.csv',
    '/api/export/empresa-solicitudes.csv',
  ];

  for (const path of exportPaths) {
    const response = await request.get(path, {
      headers: {
        Accept: 'text/csv',
      },
    });

    expect(response.ok(), `${path} should return 200`).toBeTruthy();
    expect(response.headers()['content-type'] ?? '').toContain('text/csv');
  }
});

test('convenio and assignment detail pages resolve without persistent loading', async ({ page }) => {
  const readyLocator = page.getByRole('button', { name: /salir/i });
  await page.goto('/app');
  await ensureInternalLogin(page, readyLocator);

  await page.goto('/app/convenios/1');
  await expect(page.getByText(/Detalle de convenio/i)).toBeVisible();
  await expect(page.getByText('Cargando datos del convenio...')).toBeHidden({ timeout: 15000 });
  await expect(page.getByText(/Convenio IA Educativa 2024\/2025/i)).toBeVisible();
  await expect(page.getByRole('button', { name: /Planificar asignacion/i })).toBeVisible();

  await page.goto('/app/asignaciones/2');
  await expect(page.getByText(/Detalle de asignacion/i)).toBeVisible();
  await expect(page.getByText('Cargando detalle actualizado...')).toBeHidden({ timeout: 15000 });
  const tutorCard = page.locator('.asignacion-card').filter({ hasText: /Tutores asignados/i });
  await expect(tutorCard.getByText(/Miguel Garrido/i).first()).toBeVisible();
  await expect(tutorCard.getByText(/Elena Ruiz/i).first()).toBeVisible();
  await expect(page.getByText(/Convenio Integraciones Clinicas 2024|Convenio Integraciones Clínicas 2024/i).first()).toBeVisible();
});

test('message inbox keeps thread metadata within the layout', async ({ page }) => {
  const readyLocator = page.getByRole('button', { name: /salir/i });
  await page.goto('/app/bandeja');
  await ensureInternalLogin(page, readyLocator);
  await page.goto('/app/bandeja');

  await expect(page.getByText(/Bandeja unificada de empresas/i)).toBeVisible();

  const hasOverflow = await page.locator('.inbox-layout').evaluate((root) => {
    const candidates = root.querySelectorAll('.inbox-thread, .inbox-thread__content, .inbox-thread__meta, .inbox-panel__identity');
    return Array.from(candidates).some((element) => {
      const current = element;
      return current.scrollWidth - current.clientWidth > 2;
    });
  });

  expect(hasOverflow).toBeFalsy();
});
