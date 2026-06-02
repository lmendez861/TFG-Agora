/**
 * Comentario de mantenimiento Agora.
 * Proposito: lanzador local de Electron evitando que ELECTRON_RUN_AS_NODE bloquee la app.
 * Relaciones: se usa desde npm scripts para abrir Agora Desktop durante desarrollo.
 */
const { spawn } = require('node:child_process');
const path = require('node:path');

const electronBinary = require('electron');
const appDir = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const env = { ...process.env };

delete env.ELECTRON_RUN_AS_NODE;

const child = spawn(electronBinary, [appDir, ...args], {
  cwd: appDir,
  env,
  stdio: 'inherit',
});

child.on('error', (error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});

child.on('exit', (code) => {
  process.exit(code ?? 0);
});
