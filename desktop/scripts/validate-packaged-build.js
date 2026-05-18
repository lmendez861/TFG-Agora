#!/usr/bin/env node

const { spawn, spawnSync } = require('child_process');
const fs = require('fs');
const fsp = require('fs/promises');
const http = require('http');
const path = require('path');

const desktopDir = path.resolve(__dirname, '..');
const resourcesDir = path.join(desktopDir, 'dist', 'win-unpacked', 'resources');
const backendDir = path.join(resourcesDir, 'backend');
const phpPath = path.join(resourcesDir, 'php', 'php.exe');
const port = Number(process.env.AGORA_PACKAGED_SMOKE_PORT || 8010);
const baseUrl = `http://127.0.0.1:${port}`;
const envLocalPath = path.join(backendDir, '.env.local');
const envExamplePath = path.join(backendDir, '.env.local.example');
const dbPath = path.join(backendDir, 'var', 'data_dev.sqlite');

function ensureFile(filePath, label) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`No se encontro ${label} en ${filePath}.`);
  }
}

async function copyIfMissing(source, target) {
  if (fs.existsSync(target) || !fs.existsSync(source)) {
    return;
  }

  await fsp.mkdir(path.dirname(target), { recursive: true });
  await fsp.copyFile(source, target);
}

function runProcess(filePath, args, cwd, label) {
  return new Promise((resolve, reject) => {
    const child = spawn(filePath, args, {
      cwd,
      windowsHide: true,
      shell: false,
      env: { ...process.env },
    });

    let stdout = '';
    let stderr = '';
    child.stdout?.on('data', (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr?.on('data', (chunk) => {
      stderr += chunk.toString();
    });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
        return;
      }

      reject(new Error(`${label} termino con codigo ${code}. ${(stderr || stdout).trim()}`.trim()));
    });
  });
}

function request(url, { method = 'GET', headers = {} } = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request(url, { method, headers, timeout: 15000 }, (res) => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body,
        });
      });
    });

    req.on('timeout', () => req.destroy(new Error(`Timeout en ${url}`)));
    req.on('error', reject);
    req.end();
  });
}

async function waitFor(url, expectedStatuses = [200], timeoutMs = 30000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const response = await request(url);
      if (expectedStatuses.includes(response.statusCode)) {
        return response;
      }
    } catch {}

    await new Promise((resolve) => setTimeout(resolve, 750));
  }

  throw new Error(`El recurso ${url} no respondio a tiempo.`);
}

async function main() {
  ensureFile(phpPath, 'php.exe empaquetado');
  ensureFile(path.join(backendDir, 'router.php'), 'router.php empaquetado');
  ensureFile(path.join(backendDir, 'vendor', 'autoload.php'), 'vendor/autoload.php empaquetado');
  ensureFile(path.join(backendDir, 'public', 'app', 'index.html'), 'build interna empaquetada');
  ensureFile(path.join(backendDir, 'public', 'externo', 'index.html'), 'build externa empaquetada');

  await copyIfMissing(envExamplePath, envLocalPath);
  const dbWasMissing = !fs.existsSync(dbPath);

  await runProcess(phpPath, ['bin/console', 'doctrine:migrations:migrate', '--no-interaction'], backendDir, 'Migraciones empaquetadas');
  if (dbWasMissing) {
    await runProcess(phpPath, ['bin/console', 'doctrine:fixtures:load', '--no-interaction'], backendDir, 'Fixtures empaquetadas');
  }

  const server = spawn(phpPath, ['-S', `127.0.0.1:${port}`, '-t', 'public', 'router.php'], {
    cwd: backendDir,
    windowsHide: true,
    shell: false,
    env: { ...process.env },
  });

  let stderr = '';
  server.stderr?.on('data', (chunk) => {
    stderr += chunk.toString();
  });

  try {
    const appResponse = await waitFor(`${baseUrl}/app`);
    const externoResponse = await waitFor(`${baseUrl}/externo`);
    const apiResponse = await request(`${baseUrl}/api/monitor`, {
      headers: {
        Authorization: `Basic ${Buffer.from('admin:admin123').toString('base64')}`,
      },
    });
    const csvResponse = await request(`${baseUrl}/api/export/empresas.csv`, {
      headers: {
        Authorization: `Basic ${Buffer.from('admin:admin123').toString('base64')}`,
      },
    });

    if (apiResponse.statusCode !== 200) {
      throw new Error(`Monitor empaquetado devolvio HTTP ${apiResponse.statusCode}. ${apiResponse.body.slice(0, 300)}`);
    }
    if (csvResponse.statusCode !== 200) {
      throw new Error(`CSV empaquetado devolvio HTTP ${csvResponse.statusCode}. ${csvResponse.body.slice(0, 300)}`);
    }

    const result = {
      ok: true,
      checkedAt: new Date().toISOString(),
      port,
      phpPath,
      backendDir,
      databasePath: dbPath,
      databaseCreated: fs.existsSync(dbPath),
      appStatus: appResponse.statusCode,
      externoStatus: externoResponse.statusCode,
      monitorStatus: apiResponse.statusCode,
      csvStatus: csvResponse.statusCode,
    };

    console.log(JSON.stringify(result, null, 2));
  } finally {
    if (!server.killed) {
      if (process.platform === 'win32') {
        spawnSync('taskkill.exe', ['/PID', String(server.pid), '/T', '/F'], {
          windowsHide: true,
          stdio: 'ignore',
        });
      } else {
        server.kill('SIGTERM');
      }
    }
  }

  if (stderr.trim()) {
    console.error(stderr.trim());
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
