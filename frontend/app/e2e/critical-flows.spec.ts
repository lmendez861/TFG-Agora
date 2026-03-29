import { expect, test, type Locator, type Page } from '@playwright/test';

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
  await page.goto('/monitor');
  await ensureInternalLogin(page, readyLocator);
  await page.waitForURL(/\/monitor(\/sistemas)?/);

  await expect(page.getByText(/Supervision operativa separada del portal funcional/i)).toBeVisible();
  await expect(page.getByText(/Estado de componentes/i)).toBeVisible();
  await expect(page.getByText(/Respuesta y datos cargados/i)).toBeVisible();
});

test('external registration flow reaches mail step', async ({ page }) => {
  await page.goto('/externo');
  const unique = Date.now();

  await page.getByLabel(/Nombre de la empresa/i).fill(`Empresa E2E ${unique}`);
  await page.getByLabel(/^Sector$/i).fill('Tecnologia');
  await page.getByLabel(/^Ciudad$/i).fill('Madrid');
  await page.getByLabel(/Nombre completo/i).fill('Contacto E2E');
  await page.getByLabel(/Email corporativo/i).fill(`e2e-${unique}@example.com`);
  await page.getByRole('button', { name: /Enviar solicitud/i }).click();

  await expect(page).toHaveURL(/\/externo\/correo/);
  await expect(page.locator('text=Verificacion por correo')).toBeVisible();
});
