/**
 * Comentario de mantenimiento Agora.
 * Proposito: Utilidad de frontend: contiene transformaciones puras compartidas por componentes y tests.
 * Relaciones: Conexiones principales indicadas por imports, inyeccion de dependencias o rutas del propio archivo.
 */
export function downloadBlobFile(filename: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = filename;
  link.style.display = 'none';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
