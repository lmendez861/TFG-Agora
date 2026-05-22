/**
 * Comentario de mantenimiento Agora.
 * Proposito: Cliente HTTP del frontend: centraliza llamadas a la API Symfony y normaliza errores/respuestas.
 * Relaciones: Conecta con modulos locales: ../types, ../utils/download.ts.
 */
import type {
  ApiCollections,
  AsignacionDetail,
  AsignacionPayload,
  AsignacionSummary,
  ConvenioAlert,
  ConvenioChecklistItemDetail,
  ConvenioDetail,
  ConvenioDocumentRecord,
  ConvenioExtras,
  ConvenioPayload,
  ConvenioSummary,
  ConvenioWorkflow,
  EmpresaDetail,
  EmpresaPayload,
  EmpresaSummary,
  EstudianteDetail,
  EstudiantePayload,
  EstudianteSummary,
  EmpresaInboxThread,
  EmpresaSolicitudSummary,
  TutorAcademicoSummary,
  TutorAcademicoPayload,
  TutorProfesionalSummary,
  TutorProfesionalPayload,
  EmpresaSolicitudMensaje,
  MeResponse,
  MonitorOverview,
  MfaStatus,
  PaginatedResponse,
  PublicAccessSnapshot,
  EmpresaDocument,
  SeguimientoRecord,
  EvaluacionFinalRecord,
} from '../types';
import { downloadBlobFile } from '../utils/download.ts';
import { resolveDocumentUrl } from '../utils/documents.ts';

type EmpresaDocumentApi = {
  id: number;
  nombre: string;
  tipo: string | null;
  url: string | null;
  uploadedAt: string;
  version?: number;
  active?: boolean;
  deletedAt?: string | null;
  originalFilename?: string | null;
  storageProvider?: string;
};

type EmpresaDetailApi = Omit<EmpresaDetail, 'documentos'> & {
  documentos?: EmpresaDocumentApi[];
};

type ImportMetaEnvLike = {
  VITE_API_BASE_URL?: string;
  VITE_API_USERNAME?: string;
  VITE_API_PASSWORD?: string;
};

type CsvExportParamValue = string | number | boolean | null | undefined;

const ENV = ((import.meta as ImportMeta & { env?: ImportMetaEnvLike }).env ?? {});

export const CSV_EXPORT_PATHS = {
  empresas: '/export/empresas.csv',
  convenios: '/export/convenios.csv',
  estudiantes: '/export/estudiantes.csv',
  asignaciones: '/export/asignaciones.csv',
  'tutores-academicos': '/export/tutores-academicos.csv',
  'tutores-profesionales': '/export/tutores-profesionales.csv',
  'solicitudes-empresa': '/export/empresa-solicitudes.csv',
} as const;

export type CsvExportScope = keyof typeof CSV_EXPORT_PATHS;

/**
 * Resume la responsabilidad de resolveDefaultApiBaseUrl dentro de este modulo y facilita seguir el flujo al revisarlo.
 * Si cambia su contrato, revisar los imports locales indicados en la cabecera del archivo.
 */
function resolveDefaultApiBaseUrl(): string {
  if (typeof window === 'undefined') {
    return 'http://127.0.0.1:8000/api';
  }

  if (import.meta.env.DEV) {
    const { protocol, hostname } = window.location;
    return `${protocol}//${hostname}:8000/api`;
  }

  return `${window.location.origin}/api`;
}

const API_BASE_URL = ENV.VITE_API_BASE_URL ?? resolveDefaultApiBaseUrl();
const API_USERNAME = ENV.VITE_API_USERNAME ?? 'admin';
const API_PASSWORD = ENV.VITE_API_PASSWORD ?? 'admin123';
const API_REQUEST_TIMEOUT_MS = 20000;
let activeUsername = '';
let activePassword = '';

export class ApiHttpError extends Error {
  status: number;
  payloadMessage?: string;

  constructor(status: number, message: string, payloadMessage?: string) {
    super(message);
    this.name = 'ApiHttpError';
    this.status = status;
    this.payloadMessage = payloadMessage;
  }
}

async function fetchWithTimeout(input: string, init: RequestInit = {}, timeoutMs = API_REQUEST_TIMEOUT_MS): Promise<Response> {
  const timeoutController = new AbortController();
  const timeoutId = setTimeout(() => timeoutController.abort(), timeoutMs);

  const mergedSignal = init.signal ?? timeoutController.signal;

  try {
    return await fetch(input, {
      ...init,
      signal: mergedSignal,
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

function buildFriendlyHttpMessage(status: number, payloadMessage?: string, contextPath?: string): string {
  if (status === 401) {
    if (contextPath === '/login') {
      return 'No se ha podido iniciar sesion con esas credenciales. Revisa el usuario y la contrasena.';
    }

    return 'Debes iniciar sesion para continuar.';
  }

  if (status === 403) {
    return 'No tienes permisos suficientes para realizar esta operacion.';
  }

  if (status === 404) {
    return payloadMessage || 'No se ha encontrado el recurso solicitado.';
  }

  if (status === 408) {
    return 'La solicitud ha tardado demasiado en responder. Intentalo de nuevo.';
  }

  if (status === 409 || status === 422) {
    return payloadMessage || 'Los datos enviados no son validos o entran en conflicto con el estado actual.';
  }

  if (status === 429) {
    return 'Se han realizado demasiadas solicitudes en poco tiempo. Espera unos minutos antes de reintentar.';
  }

  if (status >= 500) {
    return 'El servidor no ha podido completar la operacion. Intentalo de nuevo en unos minutos.';
  }

  return payloadMessage || 'No se ha podido completar la operacion solicitada.';
}

async function extractPayloadMessage(response: Response): Promise<string | undefined> {
  try {
    const payload = await response.json();
    return typeof payload?.message === 'string' && payload.message.trim() !== '' ? payload.message.trim() : undefined;
  } catch {
    return undefined;
  }
}

function buildApiHttpError(status: number, payloadMessage?: string, contextPath?: string): ApiHttpError {
  return new ApiHttpError(status, buildFriendlyHttpMessage(status, payloadMessage, contextPath), payloadMessage);
}

export function isApiHttpError(error: unknown, status?: number): error is ApiHttpError {
  if (!(error instanceof ApiHttpError)) {
    return false;
  }

  return typeof status === 'number' ? error.status === status : true;
}

/**
 * Devuelve AuthorizationHeader sin duplicar logica de acceso en los consumidores.
 * Si cambia su contrato, revisar los imports locales indicados en la cabecera del archivo.
 */
function getAuthorizationHeader(): string | null {
  if (!activeUsername || !activePassword) {
    return null;
  }

  return `Basic ${btoa(`${activeUsername}:${activePassword}`)}`;
}

/**
 * Actualiza ActiveCredentials y mantiene estable el contrato que usan los consumidores de este modulo.
 * Si cambia su contrato, revisar los imports locales indicados en la cabecera del archivo.
 */
function setActiveCredentials(username: string, password: string): void {
  activeUsername = username;
  activePassword = password;
}

/**
 * Resume la responsabilidad de resetActiveCredentials dentro de este modulo y facilita seguir el flujo al revisarlo.
 * Si cambia su contrato, revisar los imports locales indicados en la cabecera del archivo.
 */
function resetActiveCredentials(): void {
  setActiveCredentials('', '');
}

/**
 * Transforma datos entre la forma de API, formulario o dominio que usa este modulo.
 * Si cambia su contrato, revisar los imports locales indicados en la cabecera del archivo.
 */
function mapEmpresaDocument(document: EmpresaDocument | EmpresaDocumentApi): EmpresaDocument {
  if ('name' in document) {
    return document;
  }

  return {
    id: document.id,
    name: document.nombre,
    type: document.tipo,
    url: document.url,
    uploadedAt: document.uploadedAt,
    version: document.version,
    active: document.active,
    deletedAt: document.deletedAt,
    originalFilename: document.originalFilename,
    storageProvider: document.storageProvider,
  };
}

/**
 * Transforma datos entre la forma de API, formulario o dominio que usa este modulo.
 * Si cambia su contrato, revisar los imports locales indicados en la cabecera del archivo.
 */
function mapEmpresaDetail(detail: EmpresaDetailApi): EmpresaDetail {
  return {
    ...detail,
    documentos: (detail.documentos ?? []).map(mapEmpresaDocument),
  };
}

/**
 * Construye una estructura derivada que sera enviada a otra capa del sistema.
 * Si cambia su contrato, revisar los imports locales indicados en la cabecera del archivo.
 */
function buildQueryString(params?: Record<string, CsvExportParamValue>): string {
  if (!params) {
    return '';
  }

  const search = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === null || typeof value === 'undefined' || value === '') {
      return;
    }

    search.set(key, typeof value === 'boolean' ? (value ? 'true' : 'false') : String(value));
  });

  const query = search.toString();

  return query ? `?${query}` : '';
}

function resolveAbsoluteDocumentUrl(documentUrl: string): string {
  const resolved = resolveDocumentUrl(documentUrl, API_BASE_URL);
  if (!resolved) {
    throw new Error('El documento no dispone de una URL valida.');
  }

  return resolved;
}

function isCrossOriginDocumentUrl(absoluteUrl: string): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  try {
    return new URL(absoluteUrl, window.location.origin).origin !== window.location.origin;
  } catch {
    return false;
  }
}

function extractFilenameFromContentDisposition(headerValue: string | null, fallbackFilename: string): string {
  if (!headerValue) {
    return fallbackFilename;
  }

  const utf8Match = headerValue.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) {
    try {
      return decodeURIComponent(utf8Match[1]);
    } catch {
      return utf8Match[1];
    }
  }

  const quotedMatch = headerValue.match(/filename=\"([^\"]+)\"/i);
  if (quotedMatch?.[1]) {
    return quotedMatch[1];
  }

  const simpleMatch = headerValue.match(/filename=([^;]+)/i);
  if (simpleMatch?.[1]) {
    return simpleMatch[1].trim();
  }

  return fallbackFilename;
}

function inferFallbackFilename(documentUrl: string, explicitFilename?: string): string {
  if (explicitFilename && explicitFilename.trim() !== '') {
    return explicitFilename.trim();
  }

  try {
    const url = new URL(documentUrl, typeof window !== 'undefined' ? window.location.origin : 'http://localhost');
    const lastSegment = url.pathname.split('/').filter(Boolean).pop();
    if (lastSegment) {
      return decodeURIComponent(lastSegment);
    }
  } catch {
    // ignored
  }

  return 'documento';
}

function openDirectDownload(documentUrl: string): void {
  const link = document.createElement('a');
  link.href = documentUrl;
  link.target = '_blank';
  link.rel = 'noopener';
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

async function fetchDocumentBlob(
  documentUrl: string,
  fallbackFilename?: string,
): Promise<{ blob: Blob; filename: string }> {
  const authorizationHeader = getAuthorizationHeader();
  const response = await fetchWithTimeout(documentUrl, {
    headers: {
      ...(authorizationHeader ? { Authorization: authorizationHeader } : {}),
    },
    credentials: 'include',
  });

  if (!response.ok) {
    throw buildApiHttpError(response.status, await extractPayloadMessage(response));
  }

  const filename = extractFilenameFromContentDisposition(
    response.headers.get('content-disposition'),
    inferFallbackFilename(documentUrl, fallbackFilename),
  );

  return {
    blob: await response.blob(),
    filename,
  };
}

async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);

  const hasJsonBody = typeof init.body !== 'undefined';
  if (hasJsonBody && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  if (!headers.has('Authorization')) {
    const authorizationHeader = getAuthorizationHeader();
    if (authorizationHeader) {
      headers.set('Authorization', authorizationHeader);
    }
  }

  const response = await fetchWithTimeout(`${API_BASE_URL}${path}`, {
    ...init,
    headers,
    credentials: 'include',
  });

  if (!response.ok) {
    throw buildApiHttpError(response.status, await extractPayloadMessage(response), path);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

async function apiGet<T>(path: string): Promise<T> {
  return apiRequest<T>(path);
}

async function apiPost<T>(path: string, body: unknown): Promise<T> {
  return apiRequest<T>(path, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

async function apiPut<T>(path: string, body: unknown): Promise<T> {
  return apiRequest<T>(path, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
}

async function apiPatch<T>(path: string, body?: unknown): Promise<T> {
  return apiRequest<T>(path, {
    method: 'PATCH',
    body: typeof body === 'undefined' ? undefined : JSON.stringify(body),
  });
}

async function apiDelete<T>(path: string): Promise<T> {
  return apiRequest<T>(path, {
    method: 'DELETE',
  });
}

/**
 * Devuelve CsvExportPath sin duplicar logica de acceso en los consumidores.
 * Si cambia su contrato, revisar los imports locales indicados en la cabecera del archivo.
 */
export function getCsvExportPath(scope: CsvExportScope, params?: Record<string, CsvExportParamValue>): string {
  return `${CSV_EXPORT_PATHS[scope]}${buildQueryString(params)}`;
}

/**
 * Resume la responsabilidad de downloadCsvExport dentro de este modulo y facilita seguir el flujo al revisarlo.
 * Si cambia su contrato, revisar los imports locales indicados en la cabecera del archivo.
 */
export async function downloadCsvExport(
  scope: CsvExportScope,
  filename: string,
  params?: Record<string, CsvExportParamValue>,
): Promise<void> {
  const authorizationHeader = getAuthorizationHeader();
  const preferredPath = getCsvExportPath(scope, params);
  let response = await fetchWithTimeout(`${API_BASE_URL}${preferredPath}`, {
    headers: {
      Accept: 'text/csv',
      ...(authorizationHeader ? { Authorization: authorizationHeader } : {}),
    },
    credentials: 'include',
  });

  // Compatibilidad con rutas antiguas/sin sufijo .csv para evitar 404 en entornos mixtos.
  if (!response.ok && response.status === 404 && preferredPath.endsWith('.csv')) {
    const fallbackPath = preferredPath.slice(0, -4);
    response = await fetchWithTimeout(`${API_BASE_URL}${fallbackPath}`, {
      headers: {
        Accept: 'text/csv',
        ...(authorizationHeader ? { Authorization: authorizationHeader } : {}),
      },
      credentials: 'include',
    });
  }

  if (!response.ok) {
    throw buildApiHttpError(response.status, await extractPayloadMessage(response), preferredPath);
  }

  downloadBlobFile(filename, await response.blob());
}

export async function downloadAuthenticatedDocument(
  documentUrl: string,
  options?: { fallbackFilename?: string; storageProvider?: string },
): Promise<void> {
  const resolvedUrl = resolveAbsoluteDocumentUrl(documentUrl);
  if (options?.storageProvider === 'remote_url' || isCrossOriginDocumentUrl(resolvedUrl)) {
    openDirectDownload(resolvedUrl);
    return;
  }

  const { blob, filename } = await fetchDocumentBlob(resolvedUrl, options?.fallbackFilename);
  downloadBlobFile(filename, blob);
}

export async function prepareAuthenticatedDocumentPreview(
  documentUrl: string,
  options?: { fallbackFilename?: string; storageProvider?: string },
): Promise<{ url: string; revokeOnClose: boolean }> {
  const resolvedUrl = resolveAbsoluteDocumentUrl(documentUrl);
  if (options?.storageProvider === 'remote_url' || isCrossOriginDocumentUrl(resolvedUrl)) {
    return { url: resolvedUrl, revokeOnClose: false };
  }

  const { blob } = await fetchDocumentBlob(resolvedUrl, options?.fallbackFilename);
  return {
    url: URL.createObjectURL(blob),
    revokeOnClose: true,
  };
}

/**
 * Recupera datos remotos o persistidos y los deja listos para la vista o servicio que lo invoca.
 * Si cambia su contrato, revisar los imports locales indicados en la cabecera del archivo.
 */
export async function fetchCollections(): Promise<ApiCollections> {
  try {
    return await apiGet<ApiCollections>('/bootstrap');
  } catch {
    const [empresas, estudiantes, convenios, asignaciones] = await Promise.all([
      apiGet<EmpresaSummary[]>('/empresas'),
      apiGet<EstudianteSummary[]>('/estudiantes'),
      apiGet<ConvenioSummary[]>('/convenios'),
      apiGet<AsignacionSummary[]>('/asignaciones'),
    ]);

    return {
      empresas,
      estudiantes,
      convenios,
      asignaciones,
    };
  }
}

/**
 * Devuelve ApiBaseUrl sin duplicar logica de acceso en los consumidores.
 * Si cambia su contrato, revisar los imports locales indicados en la cabecera del archivo.
 */
export function getApiBaseUrl(): string {
  return API_BASE_URL;
}

/**
 * Devuelve ConfiguredAuthUsername sin duplicar logica de acceso en los consumidores.
 * Si cambia su contrato, revisar los imports locales indicados en la cabecera del archivo.
 */
export function getConfiguredAuthUsername(): string {
  return API_USERNAME;
}

/**
 * Devuelve ConfiguredAuthPassword sin duplicar logica de acceso en los consumidores.
 * Si cambia su contrato, revisar los imports locales indicados en la cabecera del archivo.
 */
export function getConfiguredAuthPassword(): string {
  return API_PASSWORD;
}

/**
 * Devuelve EstudianteDetail sin duplicar logica de acceso en los consumidores.
 * Si cambia su contrato, revisar los imports locales indicados en la cabecera del archivo.
 */
export async function getEstudianteDetail(id: number): Promise<EstudianteDetail> {
  return apiGet<EstudianteDetail>(`/estudiantes/${id}`);
}

/**
 * Crea un recurso nuevo a partir de datos ya validados por la capa superior.
 * Si cambia su contrato, revisar los imports locales indicados en la cabecera del archivo.
 */
export async function createEstudiante(payload: EstudiantePayload): Promise<EstudianteDetail> {
  return apiPost<EstudianteDetail>('/estudiantes', payload);
}

/**
 * Aplica cambios sobre un recurso existente manteniendo el contrato usado por frontend/backend.
 * Si cambia su contrato, revisar los imports locales indicados en la cabecera del archivo.
 */
export async function updateEstudiante(id: number, payload: Partial<EstudiantePayload>): Promise<EstudianteDetail> {
  return apiPut<EstudianteDetail>(`/estudiantes/${id}`, payload);
}

/**
 * Devuelve EmpresaDetail sin duplicar logica de acceso en los consumidores.
 * Si cambia su contrato, revisar los imports locales indicados en la cabecera del archivo.
 */
export async function getEmpresaDetail(id: number): Promise<EmpresaDetail> {
  return mapEmpresaDetail(await apiGet<EmpresaDetailApi>(`/empresas/${id}`));
}

/**
 * Crea un recurso nuevo a partir de datos ya validados por la capa superior.
 * Si cambia su contrato, revisar los imports locales indicados en la cabecera del archivo.
 */
export async function createEmpresa(payload: EmpresaPayload): Promise<EmpresaDetail> {
  return apiPost<EmpresaDetail>('/empresas', payload);
}

/**
 * Aplica cambios sobre un recurso existente manteniendo el contrato usado por frontend/backend.
 * Si cambia su contrato, revisar los imports locales indicados en la cabecera del archivo.
 */
export async function updateEmpresa(id: number, payload: Partial<EmpresaPayload>): Promise<EmpresaDetail> {
  return apiPut<EmpresaDetail>(`/empresas/${id}`, payload);
}

/**
 * Devuelve ConvenioDetail sin duplicar logica de acceso en los consumidores.
 * Si cambia su contrato, revisar los imports locales indicados en la cabecera del archivo.
 */
export async function getConvenioDetail(id: number): Promise<ConvenioDetail> {
  return apiGet<ConvenioDetail>(`/convenios/${id}`);
}

/**
 * Devuelve ConvenioExtras sin duplicar logica de acceso en los consumidores.
 * Si cambia su contrato, revisar los imports locales indicados en la cabecera del archivo.
 */
export async function getConvenioExtras(id: number): Promise<ConvenioExtras> {
  return apiGet<ConvenioExtras>(`/convenios/${id}/extras`);
}

/**
 * Crea un recurso nuevo a partir de datos ya validados por la capa superior.
 * Si cambia su contrato, revisar los imports locales indicados en la cabecera del archivo.
 */
export async function createConvenio(payload: ConvenioPayload): Promise<ConvenioDetail> {
  return apiPost<ConvenioDetail>('/convenios', payload);
}

/**
 * Aplica cambios sobre un recurso existente manteniendo el contrato usado por frontend/backend.
 * Si cambia su contrato, revisar los imports locales indicados en la cabecera del archivo.
 */
export async function updateConvenio(id: number, payload: Partial<ConvenioPayload>): Promise<ConvenioDetail> {
  return apiPut<ConvenioDetail>(`/convenios/${id}`, payload);
}

/**
 * Resume la responsabilidad de advanceConvenioWorkflow dentro de este modulo y facilita seguir el flujo al revisarlo.
 * Si cambia su contrato, revisar los imports locales indicados en la cabecera del archivo.
 */
export async function advanceConvenioWorkflow(
  id: number,
): Promise<{ estado: string; workflow: ConvenioWorkflow }> {
  return apiRequest<{ estado: string; workflow: ConvenioWorkflow }>(`/convenios/${id}/workflow/advance`, {
    method: 'POST',
  });
}

/**
 * Resume la responsabilidad de toggleConvenioChecklist dentro de este modulo y facilita seguir el flujo al revisarlo.
 * Si cambia su contrato, revisar los imports locales indicados en la cabecera del archivo.
 */
export async function toggleConvenioChecklist(
  convenioId: number,
  itemId: number,
  completed?: boolean,
): Promise<ConvenioChecklistItemDetail> {
  const init: RequestInit = { method: 'PATCH' };
  if (typeof completed !== 'undefined') {
    init.body = JSON.stringify({ completed });
  }

  return apiRequest<ConvenioChecklistItemDetail>(`/convenios/${convenioId}/checklist/${itemId}`, init);
}

/**
 * Resume la responsabilidad de addConvenioDocument dentro de este modulo y facilita seguir el flujo al revisarlo.
 * Si cambia su contrato, revisar los imports locales indicados en la cabecera del archivo.
 */
export async function addConvenioDocument(
  convenioId: number,
  nombre: string,
  tipo?: string,
  urlOrFile?: string | File,
  maybeFile?: File,
): Promise<ConvenioDocumentRecord> {
  const file = urlOrFile instanceof File ? urlOrFile : maybeFile;
  const url = urlOrFile instanceof File ? undefined : urlOrFile;

  if (file) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('nombre', nombre);
    if (tipo) formData.append('tipo', tipo);
    if (url) formData.append('url', url);

    const authorizationHeader = getAuthorizationHeader();
    const response = await fetch(`${API_BASE_URL}/convenios/${convenioId}/documents`, {
      method: 'POST',
      body: formData,
      headers: authorizationHeader ? { Authorization: authorizationHeader } : undefined,
      credentials: 'include',
    });

    if (!response.ok) {
      throw buildApiHttpError(response.status, await extractPayloadMessage(response), `/convenios/${convenioId}/documents`);
    }

    return (await response.json()) as ConvenioDocumentRecord;
  }

  return apiRequest<ConvenioDocumentRecord>(`/convenios/${convenioId}/documents`, {
    method: 'POST',
    body: JSON.stringify({
      nombre,
      tipo,
      url: urlOrFile,
    }),
  });
}

/**
 * Elimina o desactiva el recurso indicado respetando el endpoint/servicio asociado.
 * Si cambia su contrato, revisar los imports locales indicados en la cabecera del archivo.
 */
export async function deleteConvenioDocument(convenioId: number, documentId: number): Promise<ConvenioDocumentRecord> {
  return apiDelete<ConvenioDocumentRecord>(`/convenios/${convenioId}/documents/${documentId}`);
}

/**
 * Resume la responsabilidad de restoreConvenioDocument dentro de este modulo y facilita seguir el flujo al revisarlo.
 * Si cambia su contrato, revisar los imports locales indicados en la cabecera del archivo.
 */
export async function restoreConvenioDocument(convenioId: number, documentId: number): Promise<ConvenioDocumentRecord> {
  return apiRequest<ConvenioDocumentRecord>(`/convenios/${convenioId}/documents/${documentId}/restore`, {
    method: 'POST',
  });
}

/**
 * Resume la responsabilidad de addEmpresaDocument dentro de este modulo y facilita seguir el flujo al revisarlo.
 * Si cambia su contrato, revisar los imports locales indicados en la cabecera del archivo.
 */
export async function addEmpresaDocument(
  empresaId: number,
  nombre: string,
  tipo?: string,
  urlOrFile?: string | File,
  maybeFile?: File,
): Promise<EmpresaDocument> {
  const file = urlOrFile instanceof File ? urlOrFile : maybeFile;
  const url = urlOrFile instanceof File ? undefined : urlOrFile;
  if (file) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('nombre', nombre);
    if (tipo) formData.append('tipo', tipo);
    if (url) formData.append('url', url);

    const authorizationHeader = getAuthorizationHeader();
    const response = await fetch(`${API_BASE_URL}/empresas/${empresaId}/documentos`, {
      method: 'POST',
      body: formData,
      headers: authorizationHeader ? { Authorization: authorizationHeader } : undefined,
      credentials: 'include',
    });
    if (!response.ok) {
      throw buildApiHttpError(response.status, await extractPayloadMessage(response), `/empresas/${empresaId}/documentos`);
    }
    return mapEmpresaDocument((await response.json()) as EmpresaDocumentApi);
  }

  return mapEmpresaDocument(await apiRequest<EmpresaDocumentApi>(`/empresas/${empresaId}/documentos`, {
    method: 'POST',
    body: JSON.stringify({
      nombre,
      tipo,
      url,
    }),
  }));
}

/**
 * Elimina o desactiva el recurso indicado respetando el endpoint/servicio asociado.
 * Si cambia su contrato, revisar los imports locales indicados en la cabecera del archivo.
 */
export async function deleteEmpresaDocument(empresaId: number, documentId: number): Promise<EmpresaDocument> {
  return mapEmpresaDocument(await apiDelete<EmpresaDocumentApi>(`/empresas/${empresaId}/documentos/${documentId}`));
}

/**
 * Resume la responsabilidad de restoreEmpresaDocument dentro de este modulo y facilita seguir el flujo al revisarlo.
 * Si cambia su contrato, revisar los imports locales indicados en la cabecera del archivo.
 */
export async function restoreEmpresaDocument(empresaId: number, documentId: number): Promise<EmpresaDocument> {
  return mapEmpresaDocument(await apiRequest<EmpresaDocumentApi>(`/empresas/${empresaId}/documentos/${documentId}/restore`, {
    method: 'POST',
  }));
}

/**
 * Resume la responsabilidad de dismissConvenioAlert dentro de este modulo y facilita seguir el flujo al revisarlo.
 * Si cambia su contrato, revisar los imports locales indicados en la cabecera del archivo.
 */
export async function dismissConvenioAlert(convenioId: number, alertId: number): Promise<ConvenioAlert> {
  return apiRequest<ConvenioAlert>(`/convenios/${convenioId}/alerts/${alertId}`, {
    method: 'PATCH',
  });
}

/**
 * Devuelve AsignacionDetail sin duplicar logica de acceso en los consumidores.
 * Si cambia su contrato, revisar los imports locales indicados en la cabecera del archivo.
 */
export async function getAsignacionDetail(id: number): Promise<AsignacionDetail> {
  return apiGet<AsignacionDetail>(`/asignaciones/${id}`);
}

/**
 * Crea un recurso nuevo a partir de datos ya validados por la capa superior.
 * Si cambia su contrato, revisar los imports locales indicados en la cabecera del archivo.
 */
export async function createAsignacion(payload: AsignacionPayload): Promise<AsignacionDetail> {
  return apiPost<AsignacionDetail>('/asignaciones', payload);
}

/**
 * Aplica cambios sobre un recurso existente manteniendo el contrato usado por frontend/backend.
 * Si cambia su contrato, revisar los imports locales indicados en la cabecera del archivo.
 */
export async function updateAsignacion(id: number, payload: Partial<AsignacionPayload>): Promise<AsignacionDetail> {
  return apiPut<AsignacionDetail>(`/asignaciones/${id}`, payload);
}

/**
 * Crea un recurso nuevo a partir de datos ya validados por la capa superior.
 * Si cambia su contrato, revisar los imports locales indicados en la cabecera del archivo.
 */
export async function createSeguimiento(
  asignacionId: number,
  payload: {
    fecha: string;
    tipo: string;
    descripcion?: string;
    accionRequerida?: string;
    estado?: string;
    evidenciaFile?: File | null;
    evidenciaTipo?: string;
  },
): Promise<SeguimientoRecord> {
  const formData = new FormData();
  formData.append('fecha', payload.fecha);
  formData.append('tipo', payload.tipo);
  if (payload.descripcion) formData.append('descripcion', payload.descripcion);
  if (payload.accionRequerida) formData.append('accionRequerida', payload.accionRequerida);
  if (payload.estado) formData.append('estado', payload.estado);
  if (payload.evidenciaTipo) formData.append('evidenciaTipo', payload.evidenciaTipo);
  if (payload.evidenciaFile) formData.append('evidencia', payload.evidenciaFile);

  const authorizationHeader = getAuthorizationHeader();
  const response = await fetch(`${API_BASE_URL}/asignaciones/${asignacionId}/seguimientos`, {
    method: 'POST',
    body: formData,
    headers: authorizationHeader ? { Authorization: authorizationHeader } : undefined,
    credentials: 'include',
  });

  if (!response.ok) {
    throw buildApiHttpError(response.status, await extractPayloadMessage(response), `/asignaciones/${asignacionId}/seguimientos`);
  }

  return (await response.json()) as SeguimientoRecord;
}

/**
 * Aplica cambios sobre un recurso existente manteniendo el contrato usado por frontend/backend.
 * Si cambia su contrato, revisar los imports locales indicados en la cabecera del archivo.
 */
export async function updateSeguimiento(
  asignacionId: number,
  seguimientoId: number,
  payload: {
    fecha?: string;
    tipo?: string;
    descripcion?: string;
    accionRequerida?: string;
    estado?: string;
    evidenciaFile?: File | null;
    evidenciaTipo?: string;
  },
): Promise<SeguimientoRecord> {
  const formData = new FormData();
  if (payload.fecha) formData.append('fecha', payload.fecha);
  if (payload.tipo) formData.append('tipo', payload.tipo);
  if (typeof payload.descripcion !== 'undefined') formData.append('descripcion', payload.descripcion);
  if (typeof payload.accionRequerida !== 'undefined') formData.append('accionRequerida', payload.accionRequerida);
  if (payload.estado) formData.append('estado', payload.estado);
  if (payload.evidenciaTipo) formData.append('evidenciaTipo', payload.evidenciaTipo);
  if (payload.evidenciaFile) formData.append('evidencia', payload.evidenciaFile);

  const authorizationHeader = getAuthorizationHeader();
  const response = await fetch(`${API_BASE_URL}/asignaciones/${asignacionId}/seguimientos/${seguimientoId}`, {
    method: 'PUT',
    body: formData,
    headers: authorizationHeader ? { Authorization: authorizationHeader } : undefined,
    credentials: 'include',
  });

  if (!response.ok) {
    throw buildApiHttpError(response.status, await extractPayloadMessage(response), `/asignaciones/${asignacionId}/seguimientos/${seguimientoId}`);
  }

  return (await response.json()) as SeguimientoRecord;
}

/**
 * Resume la responsabilidad de closeSeguimiento dentro de este modulo y facilita seguir el flujo al revisarlo.
 * Si cambia su contrato, revisar los imports locales indicados en la cabecera del archivo.
 */
export async function closeSeguimiento(
  asignacionId: number,
  seguimientoId: number,
  comentario?: string,
): Promise<SeguimientoRecord> {
  return apiPatch<SeguimientoRecord>(`/asignaciones/${asignacionId}/seguimientos/${seguimientoId}/close`, { comentario });
}

/**
 * Resume la responsabilidad de reopenSeguimiento dentro de este modulo y facilita seguir el flujo al revisarlo.
 * Si cambia su contrato, revisar los imports locales indicados en la cabecera del archivo.
 */
export async function reopenSeguimiento(asignacionId: number, seguimientoId: number): Promise<SeguimientoRecord> {
  return apiPatch<SeguimientoRecord>(`/asignaciones/${asignacionId}/seguimientos/${seguimientoId}/reopen`);
}

/**
 * Resume la responsabilidad de upsertEvaluacionFinal dentro de este modulo y facilita seguir el flujo al revisarlo.
 * Si cambia su contrato, revisar los imports locales indicados en la cabecera del archivo.
 */
export async function upsertEvaluacionFinal(
  asignacionId: number,
  payload: Partial<EvaluacionFinalRecord>,
): Promise<EvaluacionFinalRecord> {
  return apiRequest<EvaluacionFinalRecord>(`/asignaciones/${asignacionId}/evaluacion-final`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/**
 * Resume la responsabilidad de closeEvaluacionFinal dentro de este modulo y facilita seguir el flujo al revisarlo.
 * Si cambia su contrato, revisar los imports locales indicados en la cabecera del archivo.
 */
export async function closeEvaluacionFinal(asignacionId: number): Promise<EvaluacionFinalRecord> {
  return apiPatch<EvaluacionFinalRecord>(`/asignaciones/${asignacionId}/evaluacion-final/cerrar`);
}

interface TutorAcademicoParams {
  page?: number;
  perPage?: number;
  activo?: boolean;
}

interface TutorProfesionalParams extends TutorAcademicoParams {
  empresaId?: number;
}

/**
 * Recupera datos remotos o persistidos y los deja listos para la vista o servicio que lo invoca.
 * Si cambia su contrato, revisar los imports locales indicados en la cabecera del archivo.
 */
export async function fetchTutorAcademicos(
  params?: TutorAcademicoParams,
): Promise<TutorAcademicoSummary[] | PaginatedResponse<TutorAcademicoSummary>> {
  const search = new URLSearchParams();
  if (typeof params?.page === 'number') search.set('page', String(params.page));
  if (typeof params?.perPage === 'number') search.set('perPage', String(params.perPage));
  if (typeof params?.activo === 'boolean') search.set('activo', params.activo ? 'true' : 'false');
  const qs = search.toString() ? `?${search.toString()}` : '';
  return apiGet<TutorAcademicoSummary[] | PaginatedResponse<TutorAcademicoSummary>>(`/tutores-academicos${qs}`);
}

export async function createTutorAcademico(payload: TutorAcademicoPayload): Promise<TutorAcademicoSummary> {
  return apiPost<TutorAcademicoSummary>('/tutores-academicos', payload);
}

export async function updateTutorAcademico(id: number, payload: TutorAcademicoPayload): Promise<TutorAcademicoSummary> {
  return apiPut<TutorAcademicoSummary>(`/tutores-academicos/${id}`, payload);
}

/**
 * Recupera datos remotos o persistidos y los deja listos para la vista o servicio que lo invoca.
 * Si cambia su contrato, revisar los imports locales indicados en la cabecera del archivo.
 */
export async function fetchTutorProfesionales(
  params?: TutorProfesionalParams | number,
): Promise<TutorProfesionalSummary[] | PaginatedResponse<TutorProfesionalSummary>> {
  const opts: TutorProfesionalParams = typeof params === 'number' ? { empresaId: params } : (params ?? {});
  const search = new URLSearchParams();
  if (typeof opts.empresaId === 'number') search.set('empresaId', String(opts.empresaId));
  if (typeof opts.page === 'number') search.set('page', String(opts.page));
  if (typeof opts.perPage === 'number') search.set('perPage', String(opts.perPage));
  if (typeof opts.activo === 'boolean') search.set('activo', opts.activo ? 'true' : 'false');
  const qs = search.toString() ? `?${search.toString()}` : '';
  return apiGet<TutorProfesionalSummary[] | PaginatedResponse<TutorProfesionalSummary>>(`/tutores-profesionales${qs}`);
}

export async function createTutorProfesional(payload: TutorProfesionalPayload): Promise<TutorProfesionalSummary> {
  return apiPost<TutorProfesionalSummary>('/tutores-profesionales', payload);
}

export async function updateTutorProfesional(id: number, payload: TutorProfesionalPayload): Promise<TutorProfesionalSummary> {
  return apiPut<TutorProfesionalSummary>(`/tutores-profesionales/${id}`, payload);
}

/**
 * Recupera datos remotos o persistidos y los deja listos para la vista o servicio que lo invoca.
 * Si cambia su contrato, revisar los imports locales indicados en la cabecera del archivo.
 */
export async function fetchEmpresaSolicitudes(
  page?: number,
  perPage?: number,
): Promise<{ items: EmpresaSolicitudSummary[]; page: number; perPage: number }> {
  const params = new URLSearchParams();
  if (page) params.set('page', String(page));
  if (perPage) params.set('perPage', String(perPage));
  const qs = params.toString() ? `?${params.toString()}` : '';
  return apiGet<{ items: EmpresaSolicitudSummary[]; page: number; perPage: number }>(`/empresa-solicitudes${qs}`);
}

/**
 * Recupera datos remotos o persistidos y los deja listos para la vista o servicio que lo invoca.
 * Si cambia su contrato, revisar los imports locales indicados en la cabecera del archivo.
 */
export async function fetchEmpresaInboxThreads(): Promise<EmpresaInboxThread[]> {
  return apiGet<EmpresaInboxThread[]>('/empresa-solicitudes/bandeja');
}

/**
 * Resume la responsabilidad de approveEmpresaSolicitud dentro de este modulo y facilita seguir el flujo al revisarlo.
 * Si cambia su contrato, revisar los imports locales indicados en la cabecera del archivo.
 */
export async function approveEmpresaSolicitud(id: number): Promise<void> {
  await apiPost(`/empresa-solicitudes/${id}/aprobar`, {});
}

/**
 * Resume la responsabilidad de rejectEmpresaSolicitud dentro de este modulo y facilita seguir el flujo al revisarlo.
 * Si cambia su contrato, revisar los imports locales indicados en la cabecera del archivo.
 */
export async function rejectEmpresaSolicitud(id: number, motivo: string): Promise<void> {
  await apiPost(`/empresa-solicitudes/${id}/rechazar`, { motivo });
}

/**
 * Recupera datos remotos o persistidos y los deja listos para la vista o servicio que lo invoca.
 * Si cambia su contrato, revisar los imports locales indicados en la cabecera del archivo.
 */
export async function fetchEmpresaMensajes(solicitudId: number): Promise<EmpresaSolicitudMensaje[]> {
  return apiGet<EmpresaSolicitudMensaje[]>(`/empresa-solicitudes/${solicitudId}/mensajes`);
}

/**
 * Resume la responsabilidad de postEmpresaMensaje dentro de este modulo y facilita seguir el flujo al revisarlo.
 * Si cambia su contrato, revisar los imports locales indicados en la cabecera del archivo.
 */
export async function postEmpresaMensaje(
  solicitudId: number,
  autor: 'empresa' | 'centro',
  texto: string,
): Promise<EmpresaSolicitudMensaje> {
  return apiPost<EmpresaSolicitudMensaje>(`/empresa-solicitudes/${solicitudId}/mensajes`, { autor, texto });
}

/**
 * Resume la responsabilidad de login dentro de este modulo y facilita seguir el flujo al revisarlo.
 * Si cambia su contrato, revisar los imports locales indicados en la cabecera del archivo.
 */
export async function login(username: string, password: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ username, password }),
    credentials: 'include',
  });

  if (!response.ok) {
    throw buildApiHttpError(response.status, await extractPayloadMessage(response), '/login');
  }

  setActiveCredentials(username, password);
}

/**
 * Resume la responsabilidad de logout dentro de este modulo y facilita seguir el flujo al revisarlo.
 * Si cambia su contrato, revisar los imports locales indicados en la cabecera del archivo.
 */
export async function logout(): Promise<void> {
  try {
    await apiRequest('/logout', { method: 'POST' });
  } finally {
    resetActiveCredentials();
  }
}

/**
 * Recupera datos remotos o persistidos y los deja listos para la vista o servicio que lo invoca.
 * Si cambia su contrato, revisar los imports locales indicados en la cabecera del archivo.
 */
export async function fetchMe(): Promise<MeResponse> {
  return apiGet<MeResponse>('/me');
}

/**
 * Recupera datos remotos o persistidos y los deja listos para la vista o servicio que lo invoca.
 * Si cambia su contrato, revisar los imports locales indicados en la cabecera del archivo.
 */
export async function fetchMonitorOverview(): Promise<MonitorOverview> {
  return apiGet<MonitorOverview>('/monitor');
}

/**
 * Recupera datos remotos o persistidos y los deja listos para la vista o servicio que lo invoca.
 * Si cambia su contrato, revisar los imports locales indicados en la cabecera del archivo.
 */
export async function fetchPublicAccessSnapshot(): Promise<PublicAccessSnapshot> {
  return apiGet<PublicAccessSnapshot>('/public-access');
}

/**
 * Recupera datos remotos o persistidos y los deja listos para la vista o servicio que lo invoca.
 * Si cambia su contrato, revisar los imports locales indicados en la cabecera del archivo.
 */
export async function fetchMfaStatus(): Promise<MfaStatus> {
  return apiGet<MfaStatus>('/mfa/status');
}

/**
 * Resume la responsabilidad de requestMfaChallenge dentro de este modulo y facilita seguir el flujo al revisarlo.
 * Si cambia su contrato, revisar los imports locales indicados en la cabecera del archivo.
 */
export async function requestMfaChallenge(): Promise<{ status: string; message?: string; detail?: string; expiresAt?: string }> {
  return apiRequest<{ status: string; message?: string; detail?: string; expiresAt?: string }>('/mfa/challenge', {
    method: 'POST',
  });
}

/**
 * Resume la responsabilidad de verifyMfaCode dentro de este modulo y facilita seguir el flujo al revisarlo.
 * Si cambia su contrato, revisar los imports locales indicados en la cabecera del archivo.
 */
export async function verifyMfaCode(code: string): Promise<{ message: string; status: MfaStatus }> {
  return apiRequest<{ message: string; status: MfaStatus }>('/mfa/verify', {
    method: 'POST',
    body: JSON.stringify({ code }),
  });
}

/**
 * Resume la responsabilidad de startPublicAccess dentro de este modulo y facilita seguir el flujo al revisarlo.
 * Si cambia su contrato, revisar los imports locales indicados en la cabecera del archivo.
 */
export async function startPublicAccess(): Promise<PublicAccessSnapshot> {
  return apiRequest<PublicAccessSnapshot>('/public-access/start', {
    method: 'POST',
  });
}

/**
 * Resume la responsabilidad de stopPublicAccess dentro de este modulo y facilita seguir el flujo al revisarlo.
 * Si cambia su contrato, revisar los imports locales indicados en la cabecera del archivo.
 */
export async function stopPublicAccess(): Promise<PublicAccessSnapshot> {
  return apiRequest<PublicAccessSnapshot>('/public-access/stop', {
    method: 'POST',
  });
}
