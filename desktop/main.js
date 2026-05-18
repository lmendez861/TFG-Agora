const { app, BrowserWindow, dialog, ipcMain, safeStorage, shell } = require('electron');
const { spawn, spawnSync } = require('node:child_process');
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const http = require('node:http');
const https = require('node:https');
const os = require('node:os');
const path = require('node:path');

const PORT = Number(process.env.AGORA_DESKTOP_PORT || 8000);
const ROOT_DIR = app.isPackaged ? process.resourcesPath : path.resolve(__dirname, '..');
const DESKTOP_DIR = __dirname;
const BACKEND_DIR = path.join(ROOT_DIR, 'backend');
const INTERNAL_DIR = path.join(ROOT_DIR, 'frontend', 'app');
const EXTERNAL_DIR = path.join(ROOT_DIR, 'frontend', 'company-portal');
const TOOLS_DIR = path.join(ROOT_DIR, 'tools');
const BUNDLED_PHP_DIR = path.join(ROOT_DIR, 'php');
const PUBLIC_ACCESS_DIR = path.join(BACKEND_DIR, 'var', 'public-access');
const DB_BACKUP_DIR = path.join(BACKEND_DIR, 'var', 'backups');
const PUBLIC_ACCESS_STATE = path.join(PUBLIC_ACCESS_DIR, 'state.json');
const PUBLIC_OUT_LOG = path.join(PUBLIC_ACCESS_DIR, 'cloudflared.out.log');
const PUBLIC_ERR_LOG = path.join(PUBLIC_ACCESS_DIR, 'cloudflared.err.log');
const BACKEND_PID_FILE = path.join(BACKEND_DIR, 'var', 'agora-desktop-backend.pid');
const LAUNCHER_BACKEND_PID_FILE = path.join(BACKEND_DIR, 'var', 'agora-launcher-backend.pid');
const LAUNCHER_PUBLIC_PID_FILE = path.join(TOOLS_DIR, 'agora-launcher-cloudflared.pid');
const BACKEND_OUT_LOG = path.join(ROOT_DIR, 'backend-server.out.log');
const BACKEND_ERR_LOG = path.join(ROOT_DIR, 'backend-server.err.log');
const ROOT_PUBLIC_OUT_LOG = path.join(ROOT_DIR, 'cloudflared.out.log');
const ROOT_PUBLIC_ERR_LOG = path.join(ROOT_DIR, 'cloudflared.err.log');
const INTERNAL_URL = `http://127.0.0.1:${PORT}/app`;
const EXTERNAL_URL = `http://127.0.0.1:${PORT}/externo`;
const MONITOR_URL = `http://127.0.0.1:${PORT}/legacy/monitor`;
const API_HEALTH_URL = `http://127.0.0.1:${PORT}/api/empresas`;
const PUBLIC_TARGET_URL = `http://127.0.0.1:${PORT}`;
const CLOUDFLARED_URL = 'https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe';
const DESKTOP_CONFIG_FILENAME = 'agora-desktop.config.json';

let desktopConfigCache = null;

let mainWindow = null;
let backendProcess = null;
let publicProcess = null;
let activeTask = null;
let apiCookieJar = null;
const CLI_WORKFLOW_SMOKE = process.argv.includes('--workflow-smoke') || process.env.AGORA_DESKTOP_WORKFLOW_SMOKE === '1';

function getDesktopConfigPath() {
  return path.join(app.getPath('userData'), DESKTOP_CONFIG_FILENAME);
}

function normalizeBaseUrl(value) {
  return String(value || '').trim().replace(/\/+$/, '');
}

function isLoopbackHost(hostname) {
  const normalized = String(hostname || '').trim().toLowerCase();
  return normalized === 'localhost'
    || normalized === '127.0.0.1'
    || normalized === '::1'
    || normalized === '[::1]';
}

function validateCloudBaseUrl(baseUrl) {
  const normalized = normalizeBaseUrl(baseUrl);
  if (!normalized) {
    return 'Configura la URL base del despliegue cloud antes de usar el modo remoto.';
  }

  let parsed;
  try {
    parsed = new URL(normalized);
  } catch {
    return 'La URL base cloud no es valida.';
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    return 'La URL base cloud debe usar HTTP o HTTPS.';
  }

  if (parsed.protocol !== 'https:' && !isLoopbackHost(parsed.hostname)) {
    return 'La URL base cloud debe usar HTTPS salvo que apunte a localhost o 127.0.0.1.';
  }

  return null;
}

function assertSecureCloudBaseUrl(config = getDesktopConfig()) {
  const error = validateCloudBaseUrl(config.remote?.baseUrl);
  if (error) {
    throw new Error(error);
  }

  return normalizeBaseUrl(config.remote.baseUrl);
}

function getDefaultDesktopConfig() {
  return {
    mode: 'local',
    remote: {
      baseUrl: '',
      apiUsername: '',
      apiPassword: '',
      apiPasswordStored: false,
      sshTarget: '',
      sshKeyPath: path.join(os.homedir(), '.ssh', 'id_rsa'),
      appContainer: 'agora-app-1',
      dbContainer: 'agora-db-1',
    },
  };
}

function normalizeDesktopConfig(raw = {}, overrides = {}) {
  const defaults = getDefaultDesktopConfig();
  const remote = raw.remote && typeof raw.remote === 'object' ? raw.remote : {};
  const apiPassword = Object.prototype.hasOwnProperty.call(overrides, 'apiPassword')
    ? String(overrides.apiPassword || '')
    : String(remote.apiPassword ?? defaults.remote.apiPassword);
  const apiPasswordStored = Object.prototype.hasOwnProperty.call(overrides, 'apiPasswordStored')
    ? Boolean(overrides.apiPasswordStored)
    : Boolean(remote.apiPasswordStored || remote.apiPasswordEncrypted || apiPassword);

  return {
    mode: raw.mode === 'cloud' ? 'cloud' : 'local',
    remote: {
      baseUrl: normalizeBaseUrl(remote.baseUrl ?? defaults.remote.baseUrl),
      apiUsername: String(remote.apiUsername ?? defaults.remote.apiUsername).trim(),
      apiPassword,
      apiPasswordStored,
      sshTarget: String(remote.sshTarget ?? defaults.remote.sshTarget).trim(),
      sshKeyPath: String(remote.sshKeyPath ?? defaults.remote.sshKeyPath).trim(),
      appContainer: String(remote.appContainer ?? defaults.remote.appContainer).trim() || defaults.remote.appContainer,
      dbContainer: String(remote.dbContainer ?? defaults.remote.dbContainer).trim() || defaults.remote.dbContainer,
    },
  };
}

function readDesktopConfigFile() {
  try {
    const filePath = getDesktopConfigPath();
    if (!fs.existsSync(filePath)) {
      return {};
    }

    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return {};
  }
}

function decryptDesktopSecret(encodedSecret) {
  if (!encodedSecret) {
    return '';
  }

  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error('El sistema no ofrece cifrado seguro para recuperar la clave API almacenada.');
  }

  return safeStorage.decryptString(Buffer.from(String(encodedSecret), 'base64'));
}

function encryptDesktopSecret(secret) {
  if (!secret) {
    return '';
  }

  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error('El sistema no ofrece cifrado seguro para guardar la clave API remota.');
  }

  return safeStorage.encryptString(secret).toString('base64');
}

function buildRuntimeDesktopConfig(raw = {}) {
  const remote = raw.remote && typeof raw.remote === 'object' ? raw.remote : {};
  let apiPassword = '';
  let apiPasswordStored = false;

  if (remote.apiPasswordEncrypted) {
    apiPasswordStored = true;
    try {
      apiPassword = decryptDesktopSecret(remote.apiPasswordEncrypted);
    } catch {
      apiPassword = '';
    }
  } else if (remote.apiPassword) {
    apiPassword = String(remote.apiPassword);
    apiPasswordStored = apiPassword !== '';
  }

  return normalizeDesktopConfig(raw, {
    apiPassword,
    apiPasswordStored,
  });
}

function sanitizeDesktopConfig(config = getDesktopConfig()) {
  return normalizeDesktopConfig({
    mode: config.mode,
    remote: {
      ...config.remote,
      apiPassword: '',
    },
  }, {
    apiPassword: '',
    apiPasswordStored: Boolean(config.remote?.apiPasswordStored),
  });
}

function buildPersistedDesktopConfig(config) {
  const persisted = {
    mode: config.mode,
    remote: {
      baseUrl: config.remote.baseUrl,
      apiUsername: config.remote.apiUsername,
      sshTarget: config.remote.sshTarget,
      sshKeyPath: config.remote.sshKeyPath,
      appContainer: config.remote.appContainer,
      dbContainer: config.remote.dbContainer,
    },
  };

  if (config.remote.apiPassword) {
    persisted.remote.apiPasswordEncrypted = encryptDesktopSecret(config.remote.apiPassword);
  }

  return persisted;
}

function writeDesktopConfigFile(config) {
  const filePath = getDesktopConfigPath();
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(buildPersistedDesktopConfig(config), null, 2)}\n`, 'utf8');
}

function getDesktopConfig() {
  if (desktopConfigCache) {
    return desktopConfigCache;
  }

  const raw = readDesktopConfigFile();
  desktopConfigCache = buildRuntimeDesktopConfig(raw);

  if (raw?.remote?.apiPassword && !raw?.remote?.apiPasswordEncrypted && desktopConfigCache.remote.apiPassword) {
    try {
      writeDesktopConfigFile(desktopConfigCache);
    } catch {
      // Si el sistema no ofrece cifrado o la escritura falla, conservamos el runtime en memoria.
    }
  }

  return desktopConfigCache;
}

function saveDesktopConfig(partial = {}) {
  const current = getDesktopConfig();
  const requestedRemote = partial.remote && typeof partial.remote === 'object' ? partial.remote : {};
  const nextPassword = Object.prototype.hasOwnProperty.call(requestedRemote, 'apiPassword')
    ? String(requestedRemote.apiPassword || '')
    : current.remote.apiPassword;
  const effectivePassword = nextPassword !== '' ? nextPassword : current.remote.apiPassword;
  const next = normalizeDesktopConfig({
    ...current,
    ...partial,
    remote: {
      ...current.remote,
      ...requestedRemote,
    },
  }, {
    apiPassword: effectivePassword,
    apiPasswordStored: effectivePassword !== '',
  });
  if (next.mode === 'cloud') {
    assertSecureCloudBaseUrl(next);
  }

  writeDesktopConfigFile(next);
  desktopConfigCache = next;

  return sanitizeDesktopConfig(next);
}

function isCloudMode(config = getDesktopConfig()) {
  return config.mode === 'cloud';
}

function sendEvent(channel, payload) {
  if (!mainWindow || mainWindow.isDestroyed()) {
    return;
  }

  mainWindow.webContents.send(channel, payload);
}

function sendLog(message) {
  if (CLI_WORKFLOW_SMOKE) {
    console.error(message);
  }

  sendEvent('desktop:log', {
    message,
    at: new Date().toISOString(),
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1180,
    height: 760,
    minWidth: 980,
    minHeight: 660,
    backgroundColor: '#f4f6f8',
    title: 'Agora Desktop',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));
}

app.whenReady().then(() => {
  if (CLI_WORKFLOW_SMOKE) {
    runTask('workflow-smoke', runWorkflowSmokeTest)
      .then((payload) => {
        console.log(JSON.stringify(payload.result || payload, null, 2));
        app.exit(payload.ok ? 0 : 1);
      })
      .catch((error) => {
        console.error(error);
        app.exit(1);
      });
    return;
  }

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

function knownPath(...parts) {
  const candidate = path.join(...parts);
  return fs.existsSync(candidate) ? candidate : null;
}

function findCommand(knownPaths, names) {
  for (const candidate of knownPaths) {
    if (candidate && fs.existsSync(candidate)) {
      return candidate;
    }
  }

  const lookupCommand = process.platform === 'win32' ? 'where.exe' : 'which';
  for (const name of names) {
    const result = spawnSync(lookupCommand, [name], {
      encoding: 'utf8',
      timeout: 2500,
      windowsHide: true,
    });

    if (result.status === 0 && result.stdout.trim()) {
      return result.stdout.trim().split(/\r?\n/)[0];
    }
  }

  return null;
}

function getPhpPath() {
  return findCommand(
    [
      knownPath(BUNDLED_PHP_DIR, 'php.exe'),
      knownPath('C:\\', 'xampp', 'php', 'php.exe'),
    ],
    process.platform === 'win32' ? ['php.exe', 'php'] : ['php'],
  );
}

function getNpmPath() {
  return findCommand(
    [knownPath('C:\\', 'Program Files', 'nodejs', 'npm.cmd')],
    process.platform === 'win32' ? ['npm.cmd', 'npm'] : ['npm'],
  );
}

function getNodePath() {
  return findCommand(
    [knownPath('C:\\', 'Program Files', 'nodejs', 'node.exe')],
    process.platform === 'win32' ? ['node.exe', 'node'] : ['node'],
  );
}

function getComposerPath() {
  return findCommand(
    [knownPath('C:\\', 'ProgramData', 'ComposerSetup', 'bin', 'composer.bat')],
    process.platform === 'win32' ? ['composer.bat', 'composer'] : ['composer'],
  );
}

function getSshPath() {
  return findCommand([], process.platform === 'win32' ? ['ssh.exe', 'ssh'] : ['ssh']);
}

function processExists(pid) {
  if (!pid || Number.isNaN(Number(pid))) {
    return false;
  }

  try {
    process.kill(Number(pid), 0);
    return true;
  } catch {
    return false;
  }
}

async function stopPid(pid) {
  if (!processExists(pid)) {
    return;
  }

  if (process.platform === 'win32') {
    await runProcess('taskkill.exe', ['/PID', String(pid), '/T', '/F'], ROOT_DIR, 'Deteniendo proceso');
    return;
  }

  process.kill(Number(pid), 'SIGTERM');
}

function findBackendPids() {
  if (process.platform !== 'win32') {
    return [];
  }

  const command = [
    "Get-CimInstance Win32_Process",
    `| Where-Object { $_.Name -eq 'php.exe' -and $_.CommandLine -like '*-S 0.0.0.0:${PORT} -t public*' }`,
    '| Select-Object -ExpandProperty ProcessId',
  ].join(' ');
  const result = spawnSync('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', command], {
    encoding: 'utf8',
    timeout: 5000,
    windowsHide: true,
  });

  if (result.status !== 0 || !result.stdout.trim()) {
    return [];
  }

  return result.stdout
    .trim()
    .split(/\r?\n/)
    .map((line) => Number(line.trim()))
    .filter((pid) => Number.isFinite(pid) && pid > 0);
}

async function readJson(filePath) {
  try {
    return JSON.parse(await fsp.readFile(filePath, 'utf8'));
  } catch {
    return null;
  }
}

async function writeJson(filePath, value) {
  await fsp.mkdir(path.dirname(filePath), { recursive: true });
  await fsp.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

async function readText(filePath) {
  try {
    return await fsp.readFile(filePath, 'utf8');
  } catch {
    return '';
  }
}

async function readPid(filePath) {
  const raw = await readText(filePath);
  const pid = Number(raw.trim());
  return Number.isFinite(pid) && pid > 0 ? pid : null;
}

async function copyIfMissing(source, target) {
  if (fs.existsSync(target) || !fs.existsSync(source)) {
    return false;
  }

  await fsp.copyFile(source, target);
  sendLog(`Creado ${path.relative(ROOT_DIR, target)} desde el ejemplo.`);
  return true;
}

function requestUrl(url, method = 'HEAD', headers = {}) {
  return new Promise((resolve) => {
    const client = url.startsWith('https:') ? https : http;
    const request = client.request(url, { method, headers, timeout: 3500 }, (response) => {
      response.resume();
      response.on('end', () => {
        resolve({ ok: response.statusCode >= 200 && response.statusCode < 500, statusCode: response.statusCode });
      });
    });

    request.on('timeout', () => {
      request.destroy();
      resolve({ ok: false, statusCode: null });
    });
    request.on('error', () => resolve({ ok: false, statusCode: null }));
    request.end();
  });
}

function isSuccessfulHttpStatus(statusCode) {
  return typeof statusCode === 'number' && statusCode >= 200 && statusCode < 300;
}

function basicAuthHeader(username = 'admin', password = 'admin123') {
  return `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;
}

function getConfiguredCredentials(config = getDesktopConfig()) {
  if (isCloudMode(config)) {
    return {
      username: config.remote.apiUsername,
      password: config.remote.apiPassword,
    };
  }

  return {
    username: 'admin',
    password: 'admin123',
  };
}

function buildRuntimeUrls(config = getDesktopConfig()) {
  if (!isCloudMode(config)) {
    return {
      internal: INTERNAL_URL,
      externalLocal: EXTERNAL_URL,
      monitor: MONITOR_URL,
      publicExternal: null,
      publicInternal: null,
    };
  }

  let baseUrl = null;
  try {
    baseUrl = assertSecureCloudBaseUrl(config);
  } catch {
    baseUrl = null;
  }

  return {
    internal: baseUrl ? `${baseUrl}/app/` : null,
    externalLocal: baseUrl ? `${baseUrl}/externo/` : null,
    monitor: null,
    publicExternal: baseUrl ? `${baseUrl}/externo/` : null,
    publicInternal: baseUrl ? `${baseUrl}/app/` : null,
  };
}


function createCookieJar() {
  const cookies = new Map();

  return {
    header() {
      return [...cookies.entries()].map(([name, value]) => `${name}=${value}`).join('; ');
    },
    store(setCookieHeaders) {
      const headers = Array.isArray(setCookieHeaders)
        ? setCookieHeaders
        : setCookieHeaders
          ? [setCookieHeaders]
          : [];

      for (const header of headers) {
        const [cookiePair] = String(header).split(';');
        const separator = cookiePair.indexOf('=');
        if (separator <= 0) {
          continue;
        }
        cookies.set(cookiePair.slice(0, separator).trim(), cookiePair.slice(separator + 1));
      }
    },
  };
}

function getApiCookieJar() {
  apiCookieJar ??= createCookieJar();
  return apiCookieJar;
}

function getApiTargetBase(config = getDesktopConfig()) {
  if (!isCloudMode(config)) {
    return PUBLIC_TARGET_URL;
  }

  return assertSecureCloudBaseUrl(config);
}

function requestJson(url, { method = 'GET', headers = {}, body = null, cookieJar = null, timeoutMs = 30000 } = {}) {
  return new Promise((resolve, reject) => {
    const target = new URL(url);
    const client = target.protocol === 'https:' ? https : http;
    const serializedBody = body === null || body === undefined ? null : JSON.stringify(body);
    const requestHeaders = { Accept: 'application/json', ...headers };
    const hasContentType = Object.keys(requestHeaders).some((name) => name.toLowerCase() === 'content-type');

    if (serializedBody !== null) {
      if (!hasContentType) {
        requestHeaders['Content-Type'] = 'application/json';
      }
      requestHeaders['Content-Length'] = Buffer.byteLength(serializedBody);
    }

    if (cookieJar) {
      const cookieHeader = cookieJar.header();
      if (cookieHeader) {
        requestHeaders.Cookie = cookieHeader;
      }
    }

    const request = client.request(target, { method, headers: requestHeaders, timeout: timeoutMs }, (response) => {
      let rawBody = '';
      response.setEncoding('utf8');
      response.on('data', (chunk) => {
        rawBody += chunk;
      });
      response.on('end', () => {
        cookieJar?.store(response.headers['set-cookie']);
        let parsedBody = null;
        if (rawBody.trim() !== '') {
          try {
            parsedBody = JSON.parse(rawBody);
          } catch {
            parsedBody = rawBody;
          }
        }

        resolve({
          ok: response.statusCode >= 200 && response.statusCode < 300,
          statusCode: response.statusCode,
          headers: response.headers,
          body: parsedBody,
        });
      });
    });

    request.on('timeout', () => {
      request.destroy(new Error(`Tiempo agotado llamando a ${url}.`));
    });
    request.on('error', reject);
    if (serializedBody !== null) {
      request.write(serializedBody);
    }
    request.end();
  });
}

function responseMessage(response) {
  if (!response) {
    return 'Sin respuesta.';
  }
  if (response.body && typeof response.body === 'object' && response.body.message) {
    return response.body.message;
  }
  if (typeof response.body === 'string' && response.body.trim() !== '') {
    return response.body.trim().slice(0, 240);
  }
  if (response.body !== null && response.body !== undefined) {
    return JSON.stringify(response.body).slice(0, 240);
  }

  return `HTTP ${response.statusCode}`;
}

function ensureStatus(response, expected, label) {
  const expectedStatuses = Array.isArray(expected) ? expected : [expected];
  if (!expectedStatuses.includes(response.statusCode)) {
    throw new Error(`${label}: HTTP ${response.statusCode}. ${responseMessage(response)}`);
  }

  return response;
}

function requestInternalApi(pathname, options = {}, config = getDesktopConfig()) {
  const targetBase = getApiTargetBase(config);
  if (!targetBase) {
    throw new Error('Configura la URL base del despliegue cloud antes de usar el modo remoto.');
  }

  const credentials = getConfiguredCredentials(config);
  const authorizationHeader = credentials.username && credentials.password
    ? basicAuthHeader(credentials.username, credentials.password)
    : null;

  return requestJson(`${targetBase}${pathname}`, {
    ...options,
    headers: {
      ...(authorizationHeader ? { Authorization: authorizationHeader } : {}),
      ...(options.headers || {}),
    },
    cookieJar: isCloudMode(config) ? null : getApiCookieJar(),
  });
}

function assertLocalMode(actionLabel, config = getDesktopConfig()) {
  if (isCloudMode(config)) {
    throw new Error(`${actionLabel} solo esta disponible en modo local.`);
  }
}

function shellQuote(value) {
  return `'${String(value).replace(/'/g, `'\"'\"'`)}'`;
}

async function runSshCommand(command, config = getDesktopConfig(), label = 'Operacion SSH remota') {
  const sshPath = getSshPath();
  if (!sshPath) {
    throw new Error('No se encontro el cliente SSH en este equipo.');
  }

  const sshTarget = config.remote.sshTarget;
  const sshKeyPath = config.remote.sshKeyPath;
  if (!sshTarget || !sshKeyPath) {
    throw new Error('Configura SSH target y la ruta de la clave privada para operar contra la VM.');
  }
  if (!fs.existsSync(sshKeyPath)) {
    throw new Error(`No se encontro la clave SSH en ${sshKeyPath}.`);
  }

  return runProcess(
    sshPath,
    ['-i', sshKeyPath, '-o', 'StrictHostKeyChecking=no', sshTarget, `sh -lc ${shellQuote(command)}`],
    ROOT_DIR,
    label,
  );
}

async function waitForUrl(url, timeoutMs = 60000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const response = await requestUrl(url, 'GET');
    if (response.ok) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 750));
  }

  throw new Error(`El servidor no respondio a tiempo en ${url}.`);
}

async function waitForRemoteApplicationReady(config = getDesktopConfig(), timeoutMs = 90000) {
  const baseUrl = assertSecureCloudBaseUrl(config);
  const credentials = getConfiguredCredentials(config);
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const portalResponse = await requestUrl(`${baseUrl}/app/`, 'GET');
    if (portalResponse.ok) {
      if (!credentials.username || !credentials.password) {
        return;
      }

      const apiResponse = await requestUrl(`${baseUrl}/api/me`, 'GET', {
        Authorization: basicAuthHeader(credentials.username, credentials.password),
      });
      if (apiResponse.ok) {
        return;
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 1500));
  }

  throw new Error(`El despliegue cloud no recupero disponibilidad a tiempo en ${baseUrl}.`);
}

function runProcess(filePath, args, cwd, label) {
  sendLog(label);
  const needsShell = process.platform === 'win32' && /\.(cmd|bat)$/i.test(filePath);

  return new Promise((resolve, reject) => {
    const child = spawn(filePath, args, {
      cwd,
      windowsHide: true,
      shell: needsShell,
      env: { ...process.env },
    });

    let stdout = '';
    let stderr = '';

    child.stdout?.on('data', (chunk) => {
      const text = chunk.toString();
      stdout += text;
      text.trim().split(/\r?\n/).filter(Boolean).forEach((line) => sendLog(line));
    });
    child.stderr?.on('data', (chunk) => {
      const text = chunk.toString();
      stderr += text;
      text.trim().split(/\r?\n/).filter(Boolean).forEach((line) => sendLog(line));
    });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
        return;
      }

      reject(new Error(`${label} termino con codigo ${code}. ${stderr || stdout}`.trim()));
    });
  });
}

function spawnLongRunning(filePath, args, cwd, outLog, errLog) {
  fs.mkdirSync(path.dirname(outLog), { recursive: true });
  fs.mkdirSync(path.dirname(errLog), { recursive: true });
  const stdout = fs.openSync(outLog, 'a');
  const stderr = fs.openSync(errLog, 'a');

  let child;
  try {
    child = spawn(filePath, args, {
      cwd,
      detached: false,
      windowsHide: true,
      stdio: ['ignore', stdout, stderr],
      shell: false,
    });
  } finally {
    fs.closeSync(stdout);
    fs.closeSync(stderr);
  }

  child.unref();
  return child;
}

function parseSqlitePath() {
  const envPath = path.join(BACKEND_DIR, '.env.local');
  if (!fs.existsSync(envPath)) {
    return path.join(BACKEND_DIR, 'var', 'data_dev.sqlite');
  }

  const contents = fs.readFileSync(envPath, 'utf8');
  const match = contents.match(/^DATABASE_URL=["']?sqlite:\/\/\/(.+?)["']?$/m);
  if (!match) {
    return path.join(BACKEND_DIR, 'var', 'data_dev.sqlite');
  }

  return match[1].replace('%kernel.project_dir%', BACKEND_DIR).replace(/\//g, path.sep);
}

function querySqliteRow(sql, params = []) {
  const phpPath = getPhpPath();
  if (!phpPath) {
    throw new Error('No se encontro PHP para consultar la base de datos local.');
  }

  const dbPath = parseSqlitePath();
  if (!fs.existsSync(dbPath)) {
    throw new Error(`No se encontro la base de datos SQLite en ${dbPath}.`);
  }

  const code = `
$db = new PDO('sqlite:' . $argv[1]);
$stmt = $db->prepare($argv[2]);
$params = json_decode($argv[3] ?? '[]', true);
if (!is_array($params)) {
    $params = [];
}
$index = 1;
foreach ($params as $value) {
    $stmt->bindValue($index, $value);
    $index++;
}
$stmt->execute();
$row = $stmt->fetch(PDO::FETCH_ASSOC);
echo json_encode($row ?: null);
`;

  const result = spawnSync(phpPath, ['-r', code, dbPath, sql, JSON.stringify(params)], {
    cwd: BACKEND_DIR,
    encoding: 'utf8',
    timeout: 5000,
    windowsHide: true,
  });

  if (result.status !== 0) {
    throw new Error(`No se pudo consultar SQLite. ${result.stderr || result.stdout}`.trim());
  }

  return result.stdout.trim() ? JSON.parse(result.stdout) : null;
}

function isoDateOffset(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function generateDni(seed) {
  const number = String(Math.abs(seed) % 100000000).padStart(8, '0');
  const letters = 'TRWAGMYFPDXBNJZSQVHLCKE';
  return `${number}${letters[Number(number) % letters.length]}`;
}

function timestampForFile(date = new Date()) {
  return date.toISOString().replace(/[-:]/g, '').replace(/\..+$/, '').replace('T', '-');
}

function commandVersion(filePath, args = ['--version']) {
  if (!filePath) {
    return null;
  }

  const needsShell = process.platform === 'win32' && /\.(cmd|bat)$/i.test(filePath);
  const result = spawnSync(filePath, args, {
    cwd: ROOT_DIR,
    encoding: 'utf8',
    timeout: 7000,
    windowsHide: true,
    shell: needsShell,
  });

  if (result.status !== 0) {
    return null;
  }

  return (result.stdout || result.stderr || '').trim().split(/\r?\n/)[0] || null;
}

async function ensureCloudflared() {
  const cloudflaredPath = path.join(TOOLS_DIR, 'cloudflared.exe');
  if (fs.existsSync(cloudflaredPath)) {
    return cloudflaredPath;
  }

  await fsp.mkdir(TOOLS_DIR, { recursive: true });
  sendLog('Descargando cloudflared...');

  await new Promise((resolve, reject) => {
    const file = fs.createWriteStream(cloudflaredPath);
    https.get(CLOUDFLARED_URL, (response) => {
      if (response.statusCode < 200 || response.statusCode >= 300) {
        reject(new Error(`No se pudo descargar cloudflared: HTTP ${response.statusCode}`));
        return;
      }

      response.pipe(file);
      file.on('finish', () => {
        file.close(resolve);
      });
    }).on('error', reject);
  });

  return cloudflaredPath;
}

async function prepareProject({ forceBuild = false, skipInstall = false } = {}) {
  assertLocalMode('Preparar proyecto');
  const phpPath = getPhpPath();
  if (!phpPath) {
    throw new Error('No se encontro PHP. Instala PHP 8.2+ o XAMPP con PHP en C:\\xampp\\php\\php.exe.');
  }

  await copyIfMissing(path.join(BACKEND_DIR, '.env.local.example'), path.join(BACKEND_DIR, '.env.local'));
  await copyIfMissing(path.join(INTERNAL_DIR, '.env.example'), path.join(INTERNAL_DIR, '.env.local'));
  await copyIfMissing(path.join(EXTERNAL_DIR, '.env.example'), path.join(EXTERNAL_DIR, '.env.local'));

  const frontendSourceAvailable = fs.existsSync(path.join(INTERNAL_DIR, 'package.json'))
    && fs.existsSync(path.join(EXTERNAL_DIR, 'package.json'));
  const internalBuild = path.join(BACKEND_DIR, 'public', 'app', 'index.html');
  const externalBuild = path.join(BACKEND_DIR, 'public', 'externo', 'index.html');
  const needsNode = frontendSourceAvailable
    && (
      forceBuild
      || !fs.existsSync(internalBuild)
      || !fs.existsSync(externalBuild)
      || (!skipInstall && (!fs.existsSync(path.join(INTERNAL_DIR, 'node_modules')) || !fs.existsSync(path.join(EXTERNAL_DIR, 'node_modules'))))
    );
  const npmPath = needsNode ? getNpmPath() : null;
  if (needsNode && !npmPath) {
    throw new Error('No se encontro npm. Instala Node.js para preparar la build.');
  }

  if (!skipInstall) {
    if (!fs.existsSync(path.join(BACKEND_DIR, 'vendor', 'autoload.php'))) {
      const composerPath = getComposerPath();
      if (!composerPath) {
        throw new Error('No se encontro Composer. Instalalo para preparar el backend por primera vez.');
      }
      await runProcess(composerPath, ['install'], BACKEND_DIR, 'Instalando dependencias PHP...');
    }

    if (frontendSourceAvailable && !fs.existsSync(path.join(INTERNAL_DIR, 'node_modules'))) {
      await runProcess(npmPath, ['install'], INTERNAL_DIR, 'Instalando dependencias del portal interno...');
    }

    if (frontendSourceAvailable && !fs.existsSync(path.join(EXTERNAL_DIR, 'node_modules'))) {
      await runProcess(npmPath, ['install'], EXTERNAL_DIR, 'Instalando dependencias del portal externo...');
    }
  }

  const dbPath = parseSqlitePath();
  const dbWasMissing = !fs.existsSync(dbPath);
  await runProcess(phpPath, ['bin/console', 'doctrine:migrations:migrate', '--no-interaction'], BACKEND_DIR, 'Comprobando migraciones...');

  if (dbWasMissing) {
    await runProcess(phpPath, ['bin/console', 'doctrine:fixtures:load', '--no-interaction'], BACKEND_DIR, 'Cargando datos iniciales...');
  }

  for (const envName of ['dev', 'prod']) {
    const cacheDir = path.join(BACKEND_DIR, 'var', 'cache', envName);
    await fsp.rm(cacheDir, { recursive: true, force: true });
    sendLog(`Cache Symfony limpiada: var/cache/${envName}`);
  }

  if (!frontendSourceAvailable && (!fs.existsSync(internalBuild) || !fs.existsSync(externalBuild))) {
    throw new Error('La app empaquetada no incluye fuentes frontend y falta alguna build integrada.');
  }

  if (forceBuild || !fs.existsSync(internalBuild)) {
    await runProcess(npmPath, ['--prefix', INTERNAL_DIR, 'run', 'build:backend'], ROOT_DIR, 'Generando build del portal interno...');
  }
  if (forceBuild || !fs.existsSync(externalBuild)) {
    await runProcess(npmPath, ['--prefix', EXTERNAL_DIR, 'run', 'build:backend'], ROOT_DIR, 'Generando build del portal externo...');
  }
}

async function startBackend() {
  assertLocalMode('Levantar backend local');
  const response = await requestUrl(INTERNAL_URL, 'GET');
  if (response.ok) {
    sendLog('Backend local ya operativo.');
    return;
  }

  const phpPath = getPhpPath();
  if (!phpPath) {
    throw new Error('No se encontro PHP.');
  }

  sendLog(`Levantando backend en ${PUBLIC_TARGET_URL}...`);
  backendProcess = spawnLongRunning(
    phpPath,
    ['-S', `0.0.0.0:${PORT}`, '-t', 'public', 'router.php'],
    BACKEND_DIR,
    BACKEND_OUT_LOG,
    BACKEND_ERR_LOG,
  );
  await fsp.mkdir(path.dirname(BACKEND_PID_FILE), { recursive: true });
  await fsp.writeFile(BACKEND_PID_FILE, String(backendProcess.pid), 'utf8');
  await waitForUrl(INTERNAL_URL);
}

async function stopBackend() {
  assertLocalMode('Parar backend local');
  const pidCandidates = [
    backendProcess?.pid,
    await readPid(BACKEND_PID_FILE),
    await readPid(LAUNCHER_BACKEND_PID_FILE),
    ...findBackendPids(),
  ].filter(Boolean);
  const uniquePids = [...new Set(pidCandidates.map(Number))];

  for (const pid of uniquePids) {
    if (!processExists(pid)) {
      continue;
    }
    await stopPid(pid);
  }

  if (uniquePids.length > 0) {
    sendLog('Backend local detenido.');
  }
  backendProcess = null;
  await fsp.rm(BACKEND_PID_FILE, { force: true });
  await fsp.rm(LAUNCHER_BACKEND_PID_FILE, { force: true });
}

async function extractPublicUrl() {
  const contents = [
    await readText(PUBLIC_ERR_LOG),
    await readText(PUBLIC_OUT_LOG),
    await readText(ROOT_PUBLIC_ERR_LOG),
    await readText(ROOT_PUBLIC_OUT_LOG),
  ].join('\n');
  const match = contents.match(/https:\/\/[-a-zA-Z0-9.]+\.trycloudflare\.com/);
  return match ? match[0] : null;
}

async function getPublicState() {
  const state = await readJson(PUBLIC_ACCESS_STATE);
  const launcherProcessId = await readPid(LAUNCHER_PUBLIC_PID_FILE);
  const processId = Number(state?.processId) || launcherProcessId;
  const isRunning = processExists(processId);
  const publicUrl = isRunning ? await extractPublicUrl() : null;

  if (isRunning && publicUrl) {
    return {
      status: 'active',
      detail: 'Tunel publico operativo.',
      publicUrl,
      targetUrl: state?.targetUrl || PUBLIC_TARGET_URL,
      startedAt: state?.startedAt || null,
      processId,
    };
  }

  if (isRunning) {
    return {
      status: 'starting',
      detail: 'El acceso externo se esta inicializando.',
      publicUrl: null,
      targetUrl: state?.targetUrl || PUBLIC_TARGET_URL,
      startedAt: state?.startedAt || null,
      processId,
    };
  }

  if (state?.status === 'error') {
    return {
      status: 'error',
      detail: state.detail || 'No se pudo iniciar el acceso externo.',
      publicUrl: null,
      targetUrl: state.targetUrl || PUBLIC_TARGET_URL,
      startedAt: null,
      processId: null,
    };
  }

  return {
    status: 'inactive',
    detail: 'El acceso externo esta detenido.',
    publicUrl: null,
    targetUrl: state?.targetUrl || PUBLIC_TARGET_URL,
    startedAt: null,
    processId: null,
  };
}

async function waitForPublicUrl(processId) {
  const deadline = Date.now() + 45000;
  while (Date.now() < deadline) {
    if (!processExists(processId)) {
      break;
    }

    const publicUrl = await extractPublicUrl();
    if (publicUrl) {
      return publicUrl;
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  return null;
}

async function startPublicTunnel() {
  assertLocalMode('Activar acceso externo temporal');
  await startBackend();
  await ensureCloudflared();

  sendLog('Solicitando activacion de URL externa con MFA...');
  const response = ensureStatus(await requestInternalApi('/api/public-access/start', {
    method: 'POST',
    timeoutMs: 60000,
  }), 200, 'Activar acceso externo');

  return response.body;
}

async function stopPublicTunnel() {
  assertLocalMode('Desactivar acceso externo temporal');
  await startBackend();
  sendLog('Solicitando parada de URL externa con MFA...');
  const response = ensureStatus(await requestInternalApi('/api/public-access/stop', {
    method: 'POST',
    timeoutMs: 30000,
  }), 200, 'Detener acceso externo');
  publicProcess = null;
  await fsp.rm(LAUNCHER_PUBLIC_PID_FILE, { force: true });

  return response.body;
}

function buildWorkflowFailure(message, result) {
  const error = new Error(message);
  error.workflowResult = {
    ...result,
    ok: false,
    finishedAt: new Date().toISOString(),
  };
  return error;
}

function extractVerificationToken(registrationBody, solicitudId) {
  if (registrationBody?.verificationUrl) {
    return new URL(registrationBody.verificationUrl).searchParams.get('token');
  }

  const row = querySqliteRow('SELECT token FROM empresa_solicitud WHERE id = ? LIMIT 1', [solicitudId]);
  return row?.token || null;
}

function extractSetupToken(portalAccountId) {
  const row = querySqliteRow('SELECT setup_token FROM empresa_portal_cuenta WHERE id = ? LIMIT 1', [portalAccountId]);
  return row?.setup_token || null;
}

async function runWorkflowSmokeTest() {
  const config = getDesktopConfig();
  if (isCloudMode(config)) {
    return runCloudWorkflowSmokeTest(config);
  }

  const result = {
    ok: false,
    startedAt: new Date().toISOString(),
    finishedAt: null,
    steps: [],
    artifacts: {},
  };
  const baseUrl = `http://127.0.0.1:${PORT}`;
  const adminHeaders = { Authorization: basicAuthHeader() };
  const cookieJar = createCookieJar();
  const seed = Date.now();
  const suffix = seed.toString(36);
  const password = `AgoraSmoke${String(seed).slice(-6)}Aa1`;
  const companyName = `Desktop Smoke ${suffix}`;
  const companyEmail = `agora.desktop.${suffix}@example.com`;

  const publish = () => sendEvent('desktop:workflow', result);
  const runStep = async (id, label, runner) => {
    const step = { id, label, status: 'running', detail: 'En curso' };
    result.steps.push(step);
    sendLog(`Prueba de flujo: ${label}`);
    publish();

    try {
      const value = await runner();
      step.status = 'ok';
      step.detail = value?.detail || 'OK';
      if (value?.artifacts) {
        Object.assign(result.artifacts, value.artifacts);
      }
      publish();
      return value?.value ?? value;
    } catch (error) {
      step.status = 'error';
      step.detail = error.message;
      publish();
      throw buildWorkflowFailure(`${label}: ${error.message}`, result);
    }
  };

  await runStep('backend', 'Preparar y levantar backend local', async () => {
    await prepareProject();
    await startBackend();
    await waitForUrl(`${baseUrl}/api/empresas`, 30000);
    return { detail: `Backend disponible en ${baseUrl}` };
  });

  const registration = await runStep('registro', 'Registrar solicitud desde portal externo', async () => {
    ensureStatus(await requestJson(`${baseUrl}/portal-auth/register`, {
      method: 'POST',
      body: {
        displayName: 'Responsable Smoke',
        email: companyEmail,
        password,
      },
    }), 201, 'Registro de cuenta de empresa');

    ensureStatus(await requestJson(`${baseUrl}/portal-auth/login`, {
      method: 'POST',
      body: {
        email: companyEmail,
        password,
      },
      cookieJar,
    }), 204, 'Login de empresa preregistrada');

    const response = ensureStatus(await requestJson(`${baseUrl}/api/portal-company/request`, {
      method: 'POST',
      cookieJar,
      body: {
        nombreEmpresa: companyName,
        cif: `SMK${String(seed).slice(-8)}`,
        sector: 'Validacion desktop',
        ciudad: 'Madrid',
        web: 'https://example.com',
        descripcion: 'Solicitud generada por el diagnostico de Agora Desktop.',
        contactoNombre: 'Responsable Smoke',
        contactoTelefono: '600000000',
      },
    }), 201, 'Registro de solicitud desde portal externo');

    return {
      detail: `Solicitud #${response.body.id}; correo ${response.body.emailDelivery || 'sin estado'}`,
      value: response.body,
      artifacts: {
        solicitudId: response.body.id,
        companyEmail,
        companyName,
      },
    };
  });

  const verificationToken = await runStep('verificacion', 'Confirmar email de la empresa', async () => {
    const token = extractVerificationToken(registration, registration.id);
    if (!token) {
      throw new Error('No se encontro token de verificacion en respuesta ni en SQLite.');
    }

    ensureStatus(await requestJson(`${baseUrl}/registro-empresa/confirmar?token=${encodeURIComponent(token)}`, {
      method: 'GET',
    }), 200, 'Confirmacion de correo');

    return { detail: `Email verificado para solicitud #${registration.id}`, value: token };
  });

  void verificationToken;

  const approval = await runStep('aprobacion', 'Aprobar solicitud desde portal interno', async () => {
    const response = ensureStatus(await requestJson(`${baseUrl}/api/empresa-solicitudes/${registration.id}/aprobar`, {
      method: 'POST',
      headers: adminHeaders,
      timeoutMs: 60000,
    }), 201, 'Aprobacion interna');

    return {
      detail: `Empresa #${response.body.empresa.id}; cuenta portal #${response.body.portalAccount.id}`,
      value: response.body,
      artifacts: {
        empresaId: response.body.empresa.id,
        portalAccountId: response.body.portalAccount.id,
      },
    };
  });

  const convenio = await runStep('convenio', 'Crear convenio firmado', async () => {
    const response = ensureStatus(await requestJson(`${baseUrl}/api/convenios`, {
      method: 'POST',
      headers: adminHeaders,
      body: {
        empresaId: approval.empresa.id,
        titulo: `Convenio smoke ${suffix}`,
        descripcion: 'Convenio creado por diagnostico de escritorio.',
        tipo: 'FP Dual',
        estado: 'firmado',
        fechaInicio: isoDateOffset(1),
        fechaFin: isoDateOffset(180),
        observaciones: 'Smoke test desktop.',
      },
    }), 201, 'Alta de convenio');

    return {
      detail: `Convenio #${response.body.id} firmado`,
      value: response.body,
      artifacts: {
        convenioId: response.body.id,
      },
    };
  });

  const estudiante = await runStep('estudiante', 'Crear estudiante disponible', async () => {
    const response = ensureStatus(await requestJson(`${baseUrl}/api/estudiantes`, {
      method: 'POST',
      headers: adminHeaders,
      body: {
        nombre: 'Alumno',
        apellido: `Smoke ${suffix}`,
        dni: generateDni(seed),
        email: `alumno.desktop.${suffix}@example.com`,
        telefono: '611000000',
        grado: 'Desarrollo de Aplicaciones Web',
        curso: '2',
        expediente: `SMK-${suffix}`,
        estado: 'disponible',
      },
    }), 201, 'Alta de estudiante');

    return {
      detail: `Estudiante #${response.body.id}`,
      value: response.body,
      artifacts: {
        estudianteId: response.body.id,
      },
    };
  });

  const tutor = await runStep('tutor', 'Seleccionar tutor academico activo', async () => {
    const response = ensureStatus(await requestJson(`${baseUrl}/api/tutores-academicos?activo=true`, {
      headers: adminHeaders,
    }), 200, 'Consulta de tutores');
    const tutors = Array.isArray(response.body) ? response.body : response.body?.items || [];
    if (tutors.length === 0) {
      throw new Error('No hay tutores academicos activos para completar la asignacion.');
    }

    return {
      detail: `${tutors[0].nombre} ${tutors[0].apellido}`,
      value: tutors[0],
      artifacts: {
        tutorAcademicoId: tutors[0].id,
      },
    };
  });

  const asignacion = await runStep('asignacion', 'Crear asignacion de practicas', async () => {
    const response = ensureStatus(await requestJson(`${baseUrl}/api/asignaciones`, {
      method: 'POST',
      headers: adminHeaders,
      body: {
        estudianteId: estudiante.id,
        empresaId: approval.empresa.id,
        convenioId: convenio.id,
        tutorAcademicoId: tutor.id,
        fechaInicio: isoDateOffset(7),
        fechaFin: isoDateOffset(120),
        modalidad: 'presencial',
        horasTotales: 400,
        estado: 'planificada',
      },
    }), 201, 'Alta de asignacion');

    return {
      detail: `Asignacion #${response.body.id} planificada`,
      value: response.body,
      artifacts: {
        asignacionId: response.body.id,
      },
    };
  });

  await runStep('login', 'Entrar como empresa en portal externo', async () => {
    ensureStatus(await requestJson(`${baseUrl}/portal-auth/login`, {
      method: 'POST',
      body: {
        email: companyEmail,
        password,
      },
      cookieJar,
    }), 204, 'Login de empresa');

    const me = ensureStatus(await requestJson(`${baseUrl}/portal-auth/me`, {
      cookieJar,
    }), 200, 'Sesion de empresa');

    return { detail: `Sesion iniciada como ${me.body.email}` };
  });

  await runStep('overview', 'Comprobar datos visibles para empresa', async () => {
    const response = ensureStatus(await requestJson(`${baseUrl}/api/portal-company/overview`, {
      cookieJar,
    }), 200, 'Vista de empresa');

    if (response.body.company?.id !== approval.empresa.id) {
      throw new Error('La empresa autenticada no coincide con la aprobada.');
    }
    if (!response.body.convenios?.some((item) => item.id === convenio.id)) {
      throw new Error('El convenio creado no aparece en el portal externo.');
    }
    if (!response.body.asignaciones?.some((item) => item.id === asignacion.id)) {
      throw new Error('La asignacion creada no aparece en el portal externo.');
    }

    return { detail: 'Empresa, convenio y asignacion visibles' };
  });

  await runStep('mensaje', 'Enviar mensaje desde portal externo', async () => {
    const response = ensureStatus(await requestJson(`${baseUrl}/api/portal-company/messages`, {
      method: 'POST',
      cookieJar,
      body: {
        texto: `Mensaje smoke desktop ${suffix}`,
      },
    }), 201, 'Mensaje de empresa');

    return {
      detail: `Mensaje #${response.body.id} registrado`,
      artifacts: {
        mensajeId: response.body.id,
      },
    };
  });

  result.ok = true;
  result.finishedAt = new Date().toISOString();
  publish();
  return result;
}

async function getMfaStatus() {
  if (isCloudMode()) {
    return {
      verified: false,
      mailReady: false,
      canSend: false,
      notApplicable: true,
      detail: 'No aplica en modo cloud: el MFA actual solo protege el antiguo tunel local.',
    };
  }

  try {
    const response = await requestInternalApi('/api/mfa/status', { timeoutMs: 6000 });
    if (response.ok) {
      return response.body;
    }

    return {
      verified: false,
      mailReady: false,
      canSend: false,
      detail: responseMessage(response),
    };
  } catch (error) {
    return {
      verified: false,
      mailReady: false,
      canSend: false,
      detail: error.message,
    };
  }
}

async function requestMfaChallenge() {
  assertLocalMode('Solicitar MFA');
  await startBackend();
  const response = ensureStatus(await requestInternalApi('/api/mfa/challenge', {
    method: 'POST',
    timeoutMs: 45000,
  }), 200, 'Enviar codigo MFA');

  return response.body;
}

async function verifyMfaCode(code) {
  assertLocalMode('Verificar MFA');
  const normalizedCode = String(code || '').trim();
  if (normalizedCode === '') {
    throw new Error('Introduce el codigo MFA.');
  }

  await startBackend();
  const response = ensureStatus(await requestInternalApi('/api/mfa/verify', {
    method: 'POST',
    body: { code: normalizedCode },
    timeoutMs: 15000,
  }), 200, 'Verificar codigo MFA');

  return response.body;
}

async function getMonitorOverview() {
  const config = getDesktopConfig();
  if (!isCloudMode(config)) {
    const backendResponse = await requestUrl(INTERNAL_URL, 'GET');
    if (!backendResponse.ok) {
      return null;
    }
  }

  const response = ensureStatus(await requestInternalApi('/api/monitor', {
    timeoutMs: 15000,
  }, config), 200, 'Monitor operativo');

  return response.body;
}

async function runCloudWorkflowSmokeTest(config) {
  const baseUrl = assertSecureCloudBaseUrl(config);
  const provisionalResult = {
    ok: false,
    startedAt: new Date().toISOString(),
    finishedAt: null,
    steps: [
      {
        id: 'cloud-smoke',
        label: 'Smoke remoto',
        status: 'running',
        detail: 'Validando el despliegue cloud desde la app de escritorio.',
      },
    ],
    artifacts: {},
  };
  sendEvent('desktop:workflow', provisionalResult);

  const nodePath = getNodePath();
  if (!nodePath) {
    throw new Error('No se encontro node para ejecutar el smoke remoto.');
  }

  if (!config.remote.apiUsername || !config.remote.apiPassword) {
    throw new Error('Configura usuario y clave API remotos antes de lanzar la prueba remota.');
  }
  if (!config.remote.sshTarget) {
    throw new Error('Configura el SSH target para recuperar tokens y validar el flujo remoto.');
  }

  const scriptPath = path.join(ROOT_DIR, 'scripts', 'smoke-public-workflow.mjs');
  const args = [
    scriptPath,
    '--base-url', baseUrl,
    '--admin-user', config.remote.apiUsername,
    '--admin-password', config.remote.apiPassword,
    '--ssh-target', config.remote.sshTarget,
    '--db-container', config.remote.dbContainer,
  ];

  if (config.remote.sshKeyPath) {
    args.push('--ssh-key', config.remote.sshKeyPath);
  }

  const output = await runProcess(nodePath, args, ROOT_DIR, 'Ejecutando smoke remoto sobre despliegue cloud...');
  try {
    const parsed = JSON.parse(output.stdout);
    sendEvent('desktop:workflow', parsed);
    return parsed;
  } catch {
    throw new Error(`La prueba remota no devolvio un JSON interpretable. ${output.stderr || output.stdout}`.trim());
  }
}

async function runTestSuite(suite) {
  const config = getDesktopConfig();
  const cloudMode = isCloudMode(config);
  const phpPath = getPhpPath();
  const npmPath = getNpmPath();
  const startedAt = new Date().toISOString();
  let output;
  let label;

  switch (suite) {
    case 'desktop-check':
      if (!npmPath) {
        throw new Error('No se encontro npm para ejecutar los checks de escritorio.');
      }
      label = 'Check Agora Desktop';
      output = await runProcess(npmPath, ['run', 'check'], DESKTOP_DIR, 'Ejecutando check de Agora Desktop...');
      break;
    case 'cloud-health': {
      if (!cloudMode) {
        throw new Error('La validacion de salud cloud solo esta disponible en modo cloud.');
      }
      label = 'Salud del despliegue cloud';
      const status = await getStatus();
      let monitor = null;
      try {
        monitor = await getMonitorOverview();
      } catch {
        monitor = null;
      }

      output = {
        stdout: JSON.stringify({
          checkedAt: new Date().toISOString(),
          baseUrl: config.remote.baseUrl,
          status,
          monitorAvailable: Boolean(monitor),
          monitorGeneratedAt: monitor?.generatedAt ?? null,
        }, null, 2),
        stderr: '',
      };
      break;
    }
    case 'backend-flow':
      assertLocalMode('Ejecutar esta suite de pruebas', config);
      if (!phpPath) {
        throw new Error('No se encontro PHP para ejecutar PHPUnit.');
      }
      label = 'PHPUnit flujos backend';
      output = await runProcess(phpPath, [
        'bin/phpunit',
        'tests/Controller/RegistroEmpresaControllerTest.php',
        'tests/Controller/PortalAuthControllerTest.php',
        'tests/Controller/Api/EmpresaSolicitudFlowTest.php',
        'tests/Controller/Api/PortalCompanyControllerTest.php',
        'tests/Controller/Api/PublicAccessControllerTest.php',
        'tests/Controller/Api/MonitorControllerTest.php',
      ], BACKEND_DIR, 'Ejecutando PHPUnit de flujos backend...');
      break;
    case 'frontend-unit':
      assertLocalMode('Ejecutar esta suite de pruebas', config);
      if (!npmPath) {
        throw new Error('No se encontro npm para ejecutar tests frontend.');
      }
      label = 'Frontend unit tests';
      output = await runProcess(npmPath, ['test'], INTERNAL_DIR, 'Ejecutando tests unitarios frontend...');
      break;
    case 'frontend-e2e':
      assertLocalMode('Ejecutar esta suite de pruebas', config);
      if (!npmPath) {
        throw new Error('No se encontro npm para ejecutar Playwright.');
      }
      label = 'Frontend E2E Playwright';
      output = await runProcess(npmPath, ['run', 'test:e2e'], INTERNAL_DIR, 'Ejecutando Playwright E2E...');
      break;
    default:
      throw new Error('Suite de pruebas no reconocida.');
  }

  return {
    suite,
    label,
    startedAt,
    finishedAt: new Date().toISOString(),
    stdout: output.stdout.slice(-6000),
    stderr: output.stderr.slice(-2000),
  };
}

function resolveOperationalPath(target) {
  const map = {
    backendOut: BACKEND_OUT_LOG,
    backendErr: BACKEND_ERR_LOG,
    symfonyLogs: path.join(BACKEND_DIR, 'var', 'log'),
    publicAccessLogs: PUBLIC_ACCESS_DIR,
    rootPublicOut: ROOT_PUBLIC_OUT_LOG,
    rootPublicErr: ROOT_PUBLIC_ERR_LOG,
    backups: DB_BACKUP_DIR,
    database: parseSqlitePath(),
  };

  const resolved = map[target];
  if (!resolved) {
    throw new Error('Ruta operativa no reconocida.');
  }

  return resolved;
}

async function openLogTarget(target) {
  const config = getDesktopConfig();
  if (isCloudMode(config)) {
    const commandMap = {
      backendOut: `docker logs --tail=250 ${config.remote.appContainer} 2>&1`,
      backendErr: `docker logs --tail=250 ${config.remote.appContainer} 2>&1`,
      symfonyLogs: `docker logs --tail=250 ${config.remote.appContainer} 2>&1`,
      database: `docker logs --tail=200 ${config.remote.dbContainer} 2>&1`,
    };

    const command = commandMap[target];
    if (!command) {
      throw new Error('Ese tipo de log no esta disponible en modo cloud.');
    }

    const output = await runSshCommand(command, config, `Recuperando ${target} desde la VM...`);
    const remoteLogsDir = path.join(app.getPath('userData'), 'remote-logs');
    await fsp.mkdir(remoteLogsDir, { recursive: true });
    const filePath = path.join(remoteLogsDir, `${target}.log`);
    await fsp.writeFile(filePath, `${output.stdout}${output.stderr ? `\n${output.stderr}` : ''}`.trim(), 'utf8');
    const error = await shell.openPath(filePath);
    if (error) {
      shell.showItemInFolder(filePath);
    }

    return { target, path: filePath };
  }

  const filePath = resolveOperationalPath(target);
  if (target === 'database') {
    if (!fs.existsSync(filePath)) {
      throw new Error(`No se encontro la base de datos SQLite en ${filePath}.`);
    }
    shell.showItemInFolder(filePath);

    return { target, path: filePath };
  }

  await fsp.mkdir(path.extname(filePath) ? path.dirname(filePath) : filePath, { recursive: true });

  if (path.extname(filePath) && !fs.existsSync(filePath)) {
    await fsp.writeFile(filePath, '', 'utf8');
  }

  const error = await shell.openPath(filePath);
  if (error) {
    shell.showItemInFolder(filePath);
  }

  return { target, path: filePath };
}

async function controlRemoteContainer(kind, operation = 'restart') {
  const config = getDesktopConfig();
  if (!isCloudMode(config)) {
    throw new Error('La operacion remota solo esta disponible en modo cloud.');
  }
  assertSecureCloudBaseUrl(config);

  const container = kind === 'db' ? config.remote.dbContainer : config.remote.appContainer;
  const label = kind === 'db' ? 'base de datos' : 'aplicacion';
  if (!container) {
    throw new Error(`No se ha configurado el contenedor de ${label}.`);
  }

  const normalizedOperation = operation === 'start' || operation === 'stop' ? operation : 'restart';
  const output = await runSshCommand(
    `docker ${normalizedOperation} ${container}`,
    config,
    `Ejecutando ${normalizedOperation} remoto sobre ${container}...`,
  );

  if (normalizedOperation !== 'stop') {
    await waitForRemoteApplicationReady(config);
  }

  sendLog(`Operacion remota completada sobre ${container}.`);

  return {
    kind,
    operation: normalizedOperation,
    container,
    stdout: output.stdout.trim(),
    stderr: output.stderr.trim(),
    executedAt: new Date().toISOString(),
  };
}

async function backupDatabase() {
  const config = getDesktopConfig();
  if (isCloudMode(config)) {
    const dbContainer = config.remote.dbContainer;
    if (!dbContainer) {
      throw new Error('Configura el contenedor PostgreSQL para crear backups remotos.');
    }

    const backupsDir = path.join(app.getPath('userData'), 'remote-backups');
    await fsp.mkdir(backupsDir, { recursive: true });
    const backupPath = path.join(backupsDir, `agora-postgres-${timestampForFile()}.sql`);
    const dumpCommand = `docker exec ${dbContainer} sh -lc "pg_dump -U \\\"\\$POSTGRES_USER\\\" -d \\\"\\$POSTGRES_DB\\\" --no-owner --no-privileges"`;
    const output = await runSshCommand(dumpCommand, config, 'Creando backup PostgreSQL remoto...');
    if (!output.stdout.trim()) {
      throw new Error(output.stderr.trim() || 'El backup remoto no devolvio contenido SQL.');
    }

    await fsp.writeFile(backupPath, output.stdout, 'utf8');
    sendLog(`Backup PostgreSQL guardado en ${backupPath}.`);

    return {
      mode: 'cloud',
      path: backupPath,
      sizeBytes: (await fsp.stat(backupPath)).size,
      createdAt: new Date().toISOString(),
      container: dbContainer,
    };
  }

  assertLocalMode('Crear backup SQLite');
  const dbPath = parseSqlitePath();
  if (!fs.existsSync(dbPath)) {
    throw new Error(`No se encontro la base de datos SQLite en ${dbPath}.`);
  }

  await fsp.mkdir(DB_BACKUP_DIR, { recursive: true });
  const backupPath = path.join(DB_BACKUP_DIR, `agora-data-${timestampForFile()}.sqlite`);
  await fsp.copyFile(dbPath, backupPath);
  sendLog(`Backup SQLite creado en ${path.relative(ROOT_DIR, backupPath)}.`);

  return {
    path: backupPath,
    sizeBytes: (await fsp.stat(backupPath)).size,
    createdAt: new Date().toISOString(),
  };
}

async function restoreDatabaseBackup() {
  assertLocalMode('Restaurar backup SQLite');
  await fsp.mkdir(DB_BACKUP_DIR, { recursive: true });
  const selection = await dialog.showOpenDialog(mainWindow, {
    title: 'Selecciona backup SQLite',
    defaultPath: DB_BACKUP_DIR,
    properties: ['openFile'],
    filters: [
      { name: 'SQLite', extensions: ['sqlite', 'db'] },
      { name: 'Todos los archivos', extensions: ['*'] },
    ],
  });

  if (selection.canceled || selection.filePaths.length === 0) {
    return { canceled: true };
  }

  const backupPath = selection.filePaths[0];
  if (!fs.existsSync(backupPath)) {
    throw new Error('El backup seleccionado no existe.');
  }

  const wasRunning = (await requestUrl(INTERNAL_URL, 'GET')).ok;
  if (wasRunning) {
    await stopBackend();
  }

  const dbPath = parseSqlitePath();
  await fsp.mkdir(path.dirname(dbPath), { recursive: true });
  let safetyBackup = null;
  if (fs.existsSync(dbPath)) {
    safetyBackup = path.join(DB_BACKUP_DIR, `before-restore-${timestampForFile()}.sqlite`);
    await fsp.copyFile(dbPath, safetyBackup);
  }

  await fsp.copyFile(backupPath, dbPath);
  sendLog(`Base SQLite restaurada desde ${backupPath}.`);

  if (wasRunning) {
    await startBackend();
  }

  return {
    restoredFrom: backupPath,
    safetyBackup,
    restartedBackend: wasRunning,
    restoredAt: new Date().toISOString(),
  };
}

async function diagnoseDependencies() {
  const config = getDesktopConfig();
  if (isCloudMode(config)) {
    const baseUrl = normalizeBaseUrl(config.remote.baseUrl);
    const cloudUrlError = validateCloudBaseUrl(baseUrl);
    const sshPath = getSshPath();
    const portalResponse = !cloudUrlError && baseUrl ? await requestUrl(`${baseUrl}/app/`, 'GET') : { ok: false, statusCode: null };
    const credentials = getConfiguredCredentials(config);
    const apiResponse = (!cloudUrlError && baseUrl && credentials.username && credentials.password)
      ? await requestUrl(`${baseUrl}/api/me`, 'GET', { Authorization: basicAuthHeader(credentials.username, credentials.password) })
      : { ok: false, statusCode: null };
    const monitorResponse = (!cloudUrlError && baseUrl && credentials.username && credentials.password)
      ? await requestUrl(`${baseUrl}/api/monitor`, 'GET', { Authorization: basicAuthHeader(credentials.username, credentials.password) })
      : { ok: false, statusCode: null };
    let sshProbe = null;
    if (sshPath && config.remote.sshTarget && config.remote.sshKeyPath && fs.existsSync(config.remote.sshKeyPath)) {
      try {
        sshProbe = await runSshCommand('echo cloud-ok', config, 'Validando acceso SSH a la VM...');
      } catch (error) {
        sshProbe = { error: error instanceof Error ? error.message : String(error) };
      }
    }

    return {
      checkedAt: new Date().toISOString(),
      items: [
        {
          id: 'cloud-url',
          label: 'URL cloud',
          status: cloudUrlError ? 'error' : baseUrl ? 'ok' : 'error',
          detail: cloudUrlError || baseUrl || 'Configura la URL base del despliegue cloud.',
        },
        {
          id: 'cloud-portal',
          label: 'Portal interno remoto',
          status: portalResponse.ok ? 'ok' : 'warning',
          detail: portalResponse.ok ? `${baseUrl}/app/ responde` : 'No se ha podido validar la URL remota.',
        },
        {
          id: 'cloud-api',
          label: 'Credenciales API',
          status: credentials.username && credentials.password
            ? (apiResponse.ok ? 'ok' : apiResponse.statusCode === 401 ? 'error' : 'warning')
            : 'warning',
          detail: credentials.username && credentials.password
            ? (apiResponse.ok ? `Acceso HTTP Basic correcto para ${credentials.username}.` : `La API devolvio ${apiResponse.statusCode ?? 'sin respuesta'}.`)
            : 'Faltan usuario y/o clave para la API remota.',
        },
        {
          id: 'cloud-monitor',
          label: 'Monitor remoto',
          status: credentials.username && credentials.password
            ? (monitorResponse.ok ? 'ok' : monitorResponse.statusCode === 403 ? 'error' : 'warning')
            : 'warning',
          detail: credentials.username && credentials.password
            ? (monitorResponse.ok
              ? 'El usuario puede leer /api/monitor.'
              : monitorResponse.statusCode === 403
                ? 'El usuario autentica, pero no tiene ROLE_MONITOR/ROLE_ADMIN.'
                : `El monitor devolvio ${monitorResponse.statusCode ?? 'sin respuesta'}.`)
            : 'Faltan credenciales para validar el monitor.',
        },
        {
          id: 'cloud-ssh-client',
          label: 'Cliente SSH local',
          status: sshPath ? 'ok' : 'warning',
          detail: sshPath || 'No se encontro el ejecutable ssh en este equipo.',
        },
        {
          id: 'cloud-ssh-target',
          label: 'Destino SSH',
          status: config.remote.sshTarget ? 'ok' : 'warning',
          detail: config.remote.sshTarget || 'Configura usuario@host para operaciones remotas.',
        },
        {
          id: 'cloud-ssh-key',
          label: 'Clave SSH',
          status: config.remote.sshKeyPath && fs.existsSync(config.remote.sshKeyPath) ? 'ok' : 'warning',
          detail: config.remote.sshKeyPath && fs.existsSync(config.remote.sshKeyPath)
            ? config.remote.sshKeyPath
            : `No se encontro la clave en ${config.remote.sshKeyPath || 'ruta vacia'}.`,
        },
        {
          id: 'cloud-ssh-probe',
          label: 'Conexion SSH',
          status: sshProbe
            ? (sshProbe.error ? 'error' : sshProbe.stdout.includes('cloud-ok') ? 'ok' : 'warning')
            : 'warning',
          detail: sshProbe
            ? (sshProbe.error || sshProbe.stdout.trim() || 'Conexion SSH establecida.')
            : 'Completa la configuracion SSH para validar acceso real a la VM.',
        },
        {
          id: 'cloud-app-container',
          label: 'Contenedor app',
          status: config.remote.appContainer ? 'ok' : 'warning',
          detail: config.remote.appContainer || 'Configura el nombre del contenedor de la aplicacion.',
        },
        {
          id: 'cloud-db-container',
          label: 'Contenedor DB',
          status: config.remote.dbContainer ? 'ok' : 'warning',
          detail: config.remote.dbContainer || 'Configura el nombre del contenedor PostgreSQL.',
        },
      ],
    };
  }

  const phpPath = getPhpPath();
  const npmPath = getNpmPath();
  const composerPath = getComposerPath();
  const cloudflaredPath = path.join(TOOLS_DIR, 'cloudflared.exe');
  const dbPath = parseSqlitePath();
  const items = [
    {
      id: 'php',
      label: 'PHP',
      status: phpPath ? 'ok' : 'error',
      detail: phpPath ? `${phpPath} | ${commandVersion(phpPath, ['--version']) || 'version no disponible'}` : 'No encontrado.',
    },
    {
      id: 'npm',
      label: 'Node/npm',
      status: npmPath ? 'ok' : 'error',
      detail: npmPath ? `${npmPath} | ${commandVersion(npmPath, ['--version']) || 'version no disponible'}` : 'No encontrado.',
    },
    {
      id: 'composer',
      label: 'Composer',
      status: composerPath ? 'ok' : 'warning',
      detail: composerPath ? `${composerPath} | ${commandVersion(composerPath, ['--version']) || 'version no disponible'}` : 'No encontrado. Solo hace falta para preparar dependencias PHP desde cero.',
    },
    {
      id: 'cloudflared',
      label: 'Cloudflared',
      status: fs.existsSync(cloudflaredPath) ? 'ok' : 'warning',
      detail: fs.existsSync(cloudflaredPath) ? cloudflaredPath : 'No descargado todavia. Se descarga/prepara al activar acceso externo.',
    },
    {
      id: 'backend-vendor',
      label: 'Dependencias PHP',
      status: fs.existsSync(path.join(BACKEND_DIR, 'vendor', 'autoload.php')) ? 'ok' : 'error',
      detail: path.join(BACKEND_DIR, 'vendor', 'autoload.php'),
    },
    {
      id: 'frontend-node',
      label: 'Dependencias frontend interno',
      status: fs.existsSync(path.join(INTERNAL_DIR, 'node_modules')) ? 'ok' : 'warning',
      detail: path.join(INTERNAL_DIR, 'node_modules'),
    },
    {
      id: 'portal-node',
      label: 'Dependencias portal externo',
      status: fs.existsSync(path.join(EXTERNAL_DIR, 'node_modules')) ? 'ok' : 'warning',
      detail: path.join(EXTERNAL_DIR, 'node_modules'),
    },
    {
      id: 'builds',
      label: 'Builds integradas',
      status: fs.existsSync(path.join(BACKEND_DIR, 'public', 'app', 'index.html'))
        && fs.existsSync(path.join(BACKEND_DIR, 'public', 'externo', 'index.html')) ? 'ok' : 'warning',
      detail: 'backend/public/app + backend/public/externo',
    },
    {
      id: 'sqlite',
      label: 'SQLite local',
      status: fs.existsSync(dbPath) ? 'ok' : 'warning',
      detail: dbPath,
    },
  ];

  return {
    checkedAt: new Date().toISOString(),
    items,
  };
}

async function getStatus() {
  const config = getDesktopConfig();
  const urls = buildRuntimeUrls(config);

  if (isCloudMode(config)) {
    const credentials = getConfiguredCredentials(config);
    const baseUrl = normalizeBaseUrl(config.remote.baseUrl);
    const cloudUrlError = validateCloudBaseUrl(baseUrl);
    const backendResponse = !cloudUrlError && urls.internal ? await requestUrl(urls.internal, 'GET') : { ok: false, statusCode: null };
    const externalResponse = !cloudUrlError && urls.externalLocal ? await requestUrl(urls.externalLocal, 'GET') : { ok: false, statusCode: null };
    const apiResponse = (!cloudUrlError && baseUrl && credentials.username && credentials.password)
      ? await requestUrl(`${baseUrl}/api/me`, 'GET', { Authorization: basicAuthHeader(credentials.username, credentials.password) })
      : { ok: false, statusCode: null };
    const monitorResponse = (!cloudUrlError && baseUrl && credentials.username && credentials.password)
      ? await requestUrl(`${baseUrl}/api/monitor`, 'GET', { Authorization: basicAuthHeader(credentials.username, credentials.password) })
      : { ok: false, statusCode: null };
    const portalReachable = isSuccessfulHttpStatus(backendResponse.statusCode);
    const externalReachable = isSuccessfulHttpStatus(externalResponse.statusCode);
    const apiReachable = isSuccessfulHttpStatus(apiResponse.statusCode);
    const monitorReachable = isSuccessfulHttpStatus(monitorResponse.statusCode);

    return {
      mode: 'cloud',
      port: PORT,
      urls,
      services: {
        backend: {
          status: portalReachable ? 'running' : 'stopped',
          label: cloudUrlError ? 'URL insegura' : portalReachable ? 'Publicado' : 'Sin respuesta',
        },
        database: {
          status: config.remote.sshTarget ? 'ready' : 'missing',
          label: 'PostgreSQL remoto',
          path: config.remote.sshTarget || 'Configura SSH para operar contra la VM.',
        },
        builds: {
          status: portalReachable && externalReachable ? 'ready' : 'missing',
        },
        api: {
          status: apiReachable ? 'running' : 'stopped',
          label: cloudUrlError
            ? 'URL insegura'
            : !credentials.username || !credentials.password
            ? 'Credenciales pendientes'
            : apiResponse.statusCode === 401
              ? 'Credenciales invalidas'
              : apiReachable
                ? 'Activa'
                : 'Sin respuesta',
        },
        monitor: {
          status: monitorReachable ? 'running' : 'stopped',
          label: cloudUrlError
            ? 'URL insegura'
            : monitorReachable
            ? 'Disponible'
            : monitorResponse.statusCode === 403
              ? 'Sin permisos'
              : !credentials.username || !credentials.password
                ? 'Credenciales pendientes'
                : monitorResponse.statusCode === 401
                  ? 'Credenciales invalidas'
                  : 'Sin respuesta',
        },
        publicAccess: {
          status: cloudUrlError ? 'error' : baseUrl ? 'active' : 'inactive',
          detail: cloudUrlError || (baseUrl ? `Despliegue publico gestionado desde ${baseUrl}.` : 'Configura la URL base del despliegue cloud.'),
          publicUrl: cloudUrlError ? null : baseUrl || null,
          targetUrl: cloudUrlError ? null : baseUrl || null,
          startedAt: null,
          processId: null,
        },
        mfa: await getMfaStatus(),
      },
      platform: {
        os: 'Cliente remoto',
        php: false,
        npm: false,
        composer: false,
        ssh: Boolean(getSshPath()),
      },
    };
  }

  const backendResponse = await requestUrl(INTERNAL_URL, 'GET');
  const apiResponse = await requestUrl(API_HEALTH_URL, 'GET', {
    Authorization: `Basic ${Buffer.from('admin:admin123').toString('base64')}`,
  });
  const dbPath = parseSqlitePath();
  const publicState = await getPublicState();
  const monitorResponse = await requestUrl(MONITOR_URL, 'GET');
  const mfaStatus = backendResponse.ok ? await getMfaStatus() : null;
  const localUrls = {
    ...urls,
    publicExternal: publicState.publicUrl ? `${publicState.publicUrl}/externo` : null,
    publicInternal: publicState.publicUrl ? `${publicState.publicUrl}/app` : null,
  };

  return {
    mode: 'local',
    port: PORT,
    urls: localUrls,
    services: {
      backend: {
        status: backendResponse.ok ? 'running' : 'stopped',
        label: backendResponse.ok ? 'Activo' : 'Detenido',
      },
      database: {
        status: fs.existsSync(dbPath) ? 'ready' : 'missing',
        label: fs.existsSync(dbPath) ? 'Preparada' : 'Pendiente',
        path: dbPath,
      },
      builds: {
        status: fs.existsSync(path.join(BACKEND_DIR, 'public', 'app', 'index.html'))
          && fs.existsSync(path.join(BACKEND_DIR, 'public', 'externo', 'index.html'))
          ? 'ready'
          : 'missing',
      },
      api: {
        status: apiResponse.ok ? 'running' : 'stopped',
        label: apiResponse.statusCode === 401 ? 'Protegida' : apiResponse.ok ? 'Activa' : 'Sin respuesta',
      },
      monitor: {
        status: monitorResponse.ok ? 'running' : 'stopped',
      },
      publicAccess: publicState,
      mfa: mfaStatus,
    },
    platform: {
      os: `${os.type()} ${os.release()}`,
      php: Boolean(getPhpPath()),
      npm: Boolean(getNpmPath()),
      composer: Boolean(getComposerPath()),
    },
  };
}

async function runTask(name, task) {
  if (activeTask) {
    throw new Error(`Ya hay una tarea en curso: ${activeTask}.`);
  }

  activeTask = name;
  sendEvent('desktop:task', { name, running: true });
  try {
    const result = await task();
    const status = await getStatus();
    sendEvent('desktop:status', status);
    return { ok: true, result, status };
  } catch (error) {
    sendLog(error.message);
    const status = await getStatus();
    sendEvent('desktop:status', status);
    return { ok: false, error: error.message, result: error.workflowResult || null, status };
  } finally {
    sendEvent('desktop:task', { name, running: false });
    activeTask = null;
  }
}

function openPortalWindow(title, url) {
  const win = new BrowserWindow({
    width: 1320,
    height: 860,
    minWidth: 1000,
    minHeight: 700,
    title,
    backgroundColor: '#ffffff',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  win.loadURL(url);
}

ipcMain.handle('desktop:get-status', async () => getStatus());
ipcMain.handle('desktop:get-config', async () => sanitizeDesktopConfig());
ipcMain.handle('desktop:save-config', async (_, config) => saveDesktopConfig(config));
ipcMain.handle('desktop:get-monitor-overview', async () => getMonitorOverview());
ipcMain.handle('desktop:prepare', async (_, options = {}) => runTask('prepare', () => prepareProject(options)));
ipcMain.handle('desktop:start-local', async () => runTask('start-local', async () => {
  await prepareProject();
  await startBackend();
}));
ipcMain.handle('desktop:stop-local', async () => runTask('stop-local', stopBackend));
ipcMain.handle('desktop:restart-remote-app', async () => runTask('restart-remote-app', () => controlRemoteContainer('app', 'restart')));
ipcMain.handle('desktop:restart-remote-db', async () => runTask('restart-remote-db', () => controlRemoteContainer('db', 'restart')));
ipcMain.handle('desktop:rebuild', async () => runTask('rebuild', () => prepareProject({ forceBuild: true })));
ipcMain.handle('desktop:start-public', async () => runTask('start-public', startPublicTunnel));
ipcMain.handle('desktop:stop-public', async () => runTask('stop-public', stopPublicTunnel));
ipcMain.handle('desktop:mfa-challenge', async () => runTask('mfa-challenge', requestMfaChallenge));
ipcMain.handle('desktop:mfa-verify', async (_, code) => runTask('mfa-verify', () => verifyMfaCode(code)));
ipcMain.handle('desktop:run-workflow-smoke', async () => runTask('workflow-smoke', runWorkflowSmokeTest));
ipcMain.handle('desktop:run-test-suite', async (_, suite) => runTask(`test-${suite}`, () => runTestSuite(suite)));
ipcMain.handle('desktop:open-log-target', async (_, target) => openLogTarget(target));
ipcMain.handle('desktop:backup-database', async () => runTask('backup-database', backupDatabase));
ipcMain.handle('desktop:restore-database', async () => runTask('restore-database', restoreDatabaseBackup));
ipcMain.handle('desktop:diagnose-dependencies', async () => runTask('diagnose-dependencies', diagnoseDependencies));
ipcMain.handle('desktop:open', async (_, target, mode = 'window') => {
  const status = await getStatus();
  const urls = status.urls;
  const url = urls[target];
  if (!url) {
    throw new Error('No hay URL disponible para abrir.');
  }

  if (mode === 'browser') {
    await shell.openExternal(url);
  } else {
    openPortalWindow(target, url);
  }

  return true;
});
ipcMain.handle('desktop:open-path', async (_, filePath) => {
  await shell.openPath(filePath);
  return true;
});
