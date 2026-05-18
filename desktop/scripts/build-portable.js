#!/usr/bin/env node

/**
 * Script auxiliar para generar ejecutable portable de Agora Desktop sin firma de código.
 * El ejecutable se genera en dist/win-unpacked/ durante el build.
 * Si electron-builder falla en la firma/empaquetado, aún tenemos el ejecutable funcional.
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const desktopDir = path.resolve(__dirname, '..');
const distDir = path.join(desktopDir, 'dist');
const unpackedDir = path.join(distDir, 'win-unpacked');
const exePath = path.join(unpackedDir, 'Agora Desktop.exe');
const outputExePath = path.join(distDir, 'Agora-Desktop-Setup.exe');

try {
  // Limpiar dist anterior
  if (fs.existsSync(distDir)) {
    fs.rmSync(distDir, { recursive: true, force: true });
    console.log('✓ Directorio dist/ limpiado');
  }

  // Ejecutar electron-builder solo con target portable, sin intentar firmar
  console.log('Generando Agora Desktop portable...');
  const env = { ...process.env, CSC_IDENTITY_AUTO_DISCOVERY: 'false', WIN_CSC_KEY_PASSWORD: '' };
  
  try {
    execSync('npx electron-builder --win portable --publish=never', {
      cwd: desktopDir,
      stdio: 'inherit',
      env,
    });
  } catch (err) {
    // Si electron-builder falla en firma, verificamos si al menos se generó el unpacked
    if (!fs.existsSync(exePath)) {
      throw err;
    }
    console.log('⚠ Advertencia: electron-builder falló en firma, pero el ejecutable unpacked está disponible');
  }

  // Verificar archivo generado
  if (fs.existsSync(exePath)) {
    const sizeKB = Math.round(fs.statSync(exePath).size / 1024);
    console.log(`\n✓ Ejecutable portable generado en: ${unpackedDir}`);
    console.log(`  Archivo: Agora Desktop.exe`);
    console.log(`  Tamaño: ${sizeKB} KB`);
    console.log('\nℹ La app está lista para ejecutarse directamente');
    console.log(`  Comando: "${exePath}"`);
  } else {
    throw new Error('No se encontró el ejecutable portable después del build');
  }

  process.exit(0);
} catch (error) {
  console.error('\n✗ Error generando portable:', error.message);
  process.exit(1);
}
