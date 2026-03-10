import fs from 'node:fs';
import path from 'node:path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

function resolveHttpsConfig(rootDir: string, env: Record<string, string>) {
  if (env.VITE_DEV_HTTPS !== 'true') {
    return undefined;
  }

  const keyFile = env.VITE_DEV_HTTPS_KEY;
  const certFile = env.VITE_DEV_HTTPS_CERT;
  if (!keyFile || !certFile) {
    return undefined;
  }

  return {
    key: fs.readFileSync(path.resolve(rootDir, keyFile)),
    cert: fs.readFileSync(path.resolve(rootDir, certFile)),
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, '');
  const https = resolveHttpsConfig(__dirname, env);
  const host = env.VITE_DEV_HOST || '0.0.0.0';

  return {
    plugins: [react()],
    server: {
      host,
      port: 5173,
      https,
    },
    preview: {
      host,
      port: 4173,
      https,
    },
  };
});
