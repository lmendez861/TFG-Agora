#!/usr/bin/env node

const { execSync, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const desktopDir = path.resolve(__dirname, '..');
const distDir = path.join(desktopDir, 'dist');
const stagingDir = path.join(desktopDir, '.packaging');
const stagingPhpDir = path.join(stagingDir, 'php');
const unpackedDir = path.join(distDir, 'win-unpacked');
const unpackedExePath = path.join(unpackedDir, 'Agora Desktop.exe');
const iconGeneratorScript = path.join(desktopDir, 'scripts', 'generate-desktop-icon.ps1');

function rmIfExists(targetPath) {
  if (fs.existsSync(targetPath)) {
    fs.rmSync(targetPath, { recursive: true, force: true });
  }
}

function findPhpDir() {
  const envCandidate = process.env.AGORA_PHP_DIR ? path.resolve(process.env.AGORA_PHP_DIR) : null;
  if (envCandidate && fs.existsSync(path.join(envCandidate, 'php.exe'))) {
    return envCandidate;
  }

  const xamppCandidate = path.join('C:\\', 'xampp', 'php');
  if (fs.existsSync(path.join(xamppCandidate, 'php.exe'))) {
    return xamppCandidate;
  }

  const whereResult = spawnSync('where.exe', ['php.exe'], {
    encoding: 'utf8',
    timeout: 4000,
    windowsHide: true,
  });

  if (whereResult.status === 0 && whereResult.stdout.trim()) {
    return path.dirname(whereResult.stdout.trim().split(/\r?\n/)[0]);
  }

  throw new Error('No se encontro PHP para empaquetar. Define AGORA_PHP_DIR o instala PHP/XAMPP en este equipo.');
}

function stagePhpRuntime() {
  const phpDir = findPhpDir();
  rmIfExists(stagingPhpDir);
  fs.mkdirSync(stagingDir, { recursive: true });
  fs.cpSync(phpDir, stagingPhpDir, {
    recursive: true,
    force: true,
    filter: (source) => {
      const baseName = path.basename(source).toLowerCase();
      return !['dev', 'extras', 'pear', 'tests', 'tmp'].includes(baseName)
        && baseName !== 'readme-windows.txt';
    },
  });

  const phpExe = path.join(stagingPhpDir, 'php.exe');
  if (!fs.existsSync(phpExe)) {
    throw new Error(`No se pudo preparar php.exe en ${phpExe}.`);
  }

  const versionResult = spawnSync(phpExe, ['--version'], {
    encoding: 'utf8',
    timeout: 7000,
    windowsHide: true,
  });
  const versionLine = (versionResult.stdout || versionResult.stderr || '').trim().split(/\r?\n/)[0] || 'version no detectada';
  console.log(`PHP portable preparado desde ${phpDir}`);
  console.log(`  ${versionLine}`);
}

function generateDesktopIcon() {
  if (!fs.existsSync(iconGeneratorScript)) {
    throw new Error(`No se encontro el generador de icono en ${iconGeneratorScript}.`);
  }

  const result = spawnSync('powershell.exe', [
    '-NoProfile',
    '-ExecutionPolicy',
    'Bypass',
    '-File',
    iconGeneratorScript,
  ], {
    cwd: desktopDir,
    encoding: 'utf8',
    timeout: 60000,
    windowsHide: true,
  });

  if (result.status !== 0) {
    throw new Error(`No se pudo generar el icono. ${(result.stderr || result.stdout).trim()}`.trim());
  }

  const output = (result.stdout || result.stderr || '').trim();
  if (output) {
    console.log(output);
  }
}

function runBuilder() {
  const env = {
    ...process.env,
    CSC_IDENTITY_AUTO_DISCOVERY: 'false',
    WIN_CSC_KEY_PASSWORD: '',
  };
  const builderPath = path.join(
    desktopDir,
    'node_modules',
    '.bin',
    process.platform === 'win32' ? 'electron-builder.cmd' : 'electron-builder',
  );

  const command = process.platform === 'win32'
    ? `"${builderPath}" --publish=never`
    : `${builderPath} --publish=never`;

  execSync(command, {
    cwd: desktopDir,
    stdio: 'inherit',
    env,
  });
}

try {
  rmIfExists(distDir);
  console.log('Directorio dist/ limpiado');
  generateDesktopIcon();
  stagePhpRuntime();
  console.log('Generando instalador y carpeta ejecutable de Agora Desktop...');
  runBuilder();

  if (!fs.existsSync(unpackedExePath)) {
    throw new Error('No se encontro la app desempaquetada en dist/win-unpacked/Agora Desktop.exe.');
  }

  console.log('');
  console.log(`App desempaquetada lista: ${unpackedExePath}`);
  console.log(`Instalador generado en: ${distDir}`);
} catch (error) {
  console.error('');
  console.error(`Error generando Agora Desktop: ${error.message}`);
  process.exit(1);
}
