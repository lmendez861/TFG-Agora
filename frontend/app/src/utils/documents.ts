/**
 * Comentario de mantenimiento Agora.
 * Proposito: Utilidad de frontend: contiene transformaciones puras compartidas por componentes y tests.
 * Relaciones: Conexiones principales indicadas por imports, inyeccion de dependencias o rutas del propio archivo.
 */
export interface PreviewableDocument {
  url: string | null | undefined;
  type?: string | null | undefined;
}

export const UPLOAD_DOCUMENT_TYPE_OPTIONS = [
  { value: 'PDF', label: 'PDF' },
  { value: 'WORD', label: 'Word' },
  { value: 'EXCEL', label: 'Excel' },
] as const;

export const UPLOAD_DOCUMENT_ACCEPT = '.pdf,.doc,.docx,.xls,.xlsx';

/**
 * Resume la responsabilidad de normalizeUrl dentro de este modulo y facilita seguir el flujo al revisarlo.
 * Si cambia su contrato, revisar los imports locales indicados en la cabecera del archivo.
 */
function normalizeUrl(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

/**
 * Resume la responsabilidad de inferUploadDocumentType dentro de este modulo y facilita seguir el flujo al revisarlo.
 * Si cambia su contrato, revisar los imports locales indicados en la cabecera del archivo.
 */
export function inferUploadDocumentType(file: File | null | undefined): string {
  const fileName = file?.name?.trim().toLowerCase() ?? '';
  const extension = fileName.includes('.') ? fileName.split('.').pop() ?? '' : '';

  switch (extension) {
    case 'pdf':
      return 'PDF';
    case 'doc':
    case 'docx':
      return 'WORD';
    case 'xls':
    case 'xlsx':
      return 'EXCEL';
    default:
      return '';
  }
}

/**
 * Resume la responsabilidad de resolveDocumentUrl dentro de este modulo y facilita seguir el flujo al revisarlo.
 * Si cambia su contrato, revisar los imports locales indicados en la cabecera del archivo.
 */
export function resolveDocumentUrl(
  url: string | null | undefined,
  apiBaseUrl: string,
): string | null {
  const normalized = normalizeUrl(url);
  if (!normalized) {
    return null;
  }

  if (/^https?:\/\//i.test(normalized)) {
    return normalized;
  }

  if (normalized.startsWith('//')) {
    return `https:${normalized}`;
  }

  if (normalized.startsWith('/')) {
    const origin = apiBaseUrl.replace(/\/api\/?$/, '');
    return `${origin}${normalized}`;
  }

  return normalized;
}

/**
 * Resume la responsabilidad de isPdfDocument dentro de este modulo y facilita seguir el flujo al revisarlo.
 * Si cambia su contrato, revisar los imports locales indicados en la cabecera del archivo.
 */
export function isPdfDocument(document: PreviewableDocument): boolean {
  const normalizedType = document.type?.trim().toLowerCase() ?? '';
  if (normalizedType.includes('pdf') || normalizedType === 'application/pdf') {
    return true;
  }

  const normalizedUrl = normalizeUrl(document.url);
  if (!normalizedUrl) {
    return false;
  }

  return normalizedUrl.split(/[?#]/, 1)[0].toLowerCase().endsWith('.pdf');
}

/**
 * Resume la responsabilidad de canPreviewDocument dentro de este modulo y facilita seguir el flujo al revisarlo.
 * Si cambia su contrato, revisar los imports locales indicados en la cabecera del archivo.
 */
export function canPreviewDocument(document: PreviewableDocument, apiBaseUrl: string): boolean {
  return isPdfDocument(document) && resolveDocumentUrl(document.url, apiBaseUrl) !== null;
}
