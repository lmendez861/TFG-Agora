#!/usr/bin/env node
/**
 * Comentario de mantenimiento Agora.
 * Proposito: prueba de humo del instalador de Agora Desktop en Windows.
 * Relaciones: verifica el ejecutable generado por electron-builder antes de usarlo en demo o entrega.
 */

const { spawn } = require('node:child_process');
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const desktopDir = path.resolve(__dirname, '..');
const packageJson = JSON.parse(fs.readFileSync(path.join(desktopDir, 'package.json'), 'utf8'));
const version = packageJson.version;
const installerPath = path.join(desktopDir, 'dist', `Agora Desktop Setup ${version}.exe`);
const installDir = path.join(os.tmpdir(), 'AgoraDesktopInstallerSmoke');
const installedExePath = path.join(installDir, 'Agora Desktop.exe');
const uninstallerPath = path.join(installDir, 'Uninstall Agora Desktop.exe');
const smokePort = Number(process.env.AGORA_INSTALLER_SMOKE_PORT || 8021);

function ensureFile(filePath, label) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`No se encontro ${label} en ${filePath}.`);
  }
}

function runProcess(filePath, args, { cwd, timeoutMs = 600000, env = process.env } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(filePath, args, {
      cwd,
      env,
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: false,
    });

    let stdout = '';
    let stderr = '';
    let finished = false;
    const timer = setTimeout(() => {
      if (finished) {
        return;
      }
      finished = true;
      child.kill();
      reject(new Error(`${path.basename(filePath)} no termino dentro del tiempo esperado.`));
    }, timeoutMs);

    child.stdout?.on('data', (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr?.on('data', (chunk) => {
      stderr += chunk.toString();
    });
    child.on('error', (error) => {
      if (finished) {
        return;
      }
      finished = true;
      clearTimeout(timer);
      reject(error);
    });
    child.on('close', (code) => {
      if (finished) {
        return;
      }
      finished = true;
      clearTimeout(timer);
      if (code === 0) {
        resolve({ stdout, stderr });
        return;
      }
      reject(new Error(`${path.basename(filePath)} devolvio codigo ${code}. ${(stderr || stdout).trim()}`.trim()));
    });
  });
}

async function removeInstallDir() {
  for (let attempt = 1; attempt <= 12; attempt += 1) {
    try {
      await fsp.rm(installDir, { recursive: true, force: true });
      return;
    } catch (error) {
      if (error?.code !== 'EBUSY' && error?.code !== 'ENOTEMPTY' && error?.code !== 'EPERM') {
        throw error;
      }

      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  throw new Error(`No se pudo limpiar ${installDir} tras varios reintentos.`);
}

async function uninstallIfPresent() {
  if (!fs.existsSync(uninstallerPath)) {
    return;
  }

  await runProcess(uninstallerPath, ['/S', `_?=${installDir}`], {
    cwd: installDir,
    timeoutMs: 180000,
  });

  await new Promise((resolve) => setTimeout(resolve, 2000));
}

async function main() {
  ensureFile(installerPath, 'instalador NSIS');
  await removeInstallDir();

  await runProcess(installerPath, ['/S', `/D=${installDir}`], {
    cwd: path.dirname(installerPath),
    timeoutMs: 300000,
  });

  ensureFile(installedExePath, 'ejecutable instalado');

  const smokeEnv = {
    ...process.env,
    AGORA_DESKTOP_WORKFLOW_SMOKE: '1',
    AGORA_DESKTOP_PORT: String(smokePort),
  };

  const smokeResult = await runProcess(installedExePath, [], {
    cwd: installDir,
    env: smokeEnv,
    timeoutMs: 420000,
  });

  const result = {
    ok: true,
    checkedAt: new Date().toISOString(),
    installerPath,
    installDir,
    installedExePath,
    workflowSmokePort: smokePort,
    stdoutPreview: smokeResult.stdout.trim().split(/\r?\n/).slice(-20),
    stderrPreview: smokeResult.stderr.trim().split(/\r?\n/).slice(-20),
  };

  try {
    await uninstallIfPresent();
    await removeInstallDir();
    result.cleanup = 'ok';
  } catch (error) {
    result.cleanup = 'warning';
    result.cleanupWarning = error.message;
  }

  console.log(JSON.stringify(result, null, 2));
}

main().catch(async (error) => {
  console.error(error.message);
  try {
    await uninstallIfPresent();
    await removeInstallDir();
  } catch {}
  process.exit(1);
});
