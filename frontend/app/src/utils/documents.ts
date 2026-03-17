export interface PreviewableDocument {
  url: string | null | undefined;
  type?: string | null | undefined;
}

function normalizeUrl(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

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

export function canPreviewDocument(document: PreviewableDocument, apiBaseUrl: string): boolean {
  return isPdfDocument(document) && resolveDocumentUrl(document.url, apiBaseUrl) !== null;
}
