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
  TutorProfesionalSummary,
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
let activeUsername = '';
let activePassword = '';

function getAuthorizationHeader(): string | null {
  if (!activeUsername || !activePassword) {
    return null;
  }

  return `Basic ${btoa(`${activeUsername}:${activePassword}`)}`;
}

function setActiveCredentials(username: string, password: string): void {
  activeUsername = username;
  activePassword = password;
}

function resetActiveCredentials(): void {
  setActiveCredentials('', '');
}

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

function mapEmpresaDetail(detail: EmpresaDetailApi): EmpresaDetail {
  return {
    ...detail,
    documentos: (detail.documentos ?? []).map(mapEmpresaDocument),
  };
}

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

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers,
    credentials: 'include',
  });

  if (!response.ok) {
    let message = `Error ${response.status}`;

    try {
      const payload = await response.json();
      if (payload?.message) {
        message = `${message}: ${payload.message}`;
      }
    } catch {
      // Ignored: fallback to default message when the body is not JSON.
    }

    throw new Error(message);
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

export function getCsvExportPath(scope: CsvExportScope, params?: Record<string, CsvExportParamValue>): string {
  return `${CSV_EXPORT_PATHS[scope]}${buildQueryString(params)}`;
}

export async function downloadCsvExport(
  scope: CsvExportScope,
  filename: string,
  params?: Record<string, CsvExportParamValue>,
): Promise<void> {
  const authorizationHeader = getAuthorizationHeader();
  const response = await fetch(`${API_BASE_URL}${getCsvExportPath(scope, params)}`, {
    headers: {
      Accept: 'text/csv',
      ...(authorizationHeader ? { Authorization: authorizationHeader } : {}),
    },
    credentials: 'include',
  });

  if (!response.ok) {
    let message = `Error ${response.status}`;

    try {
      const payload = await response.json();
      if (payload?.message) {
        message = `${message}: ${payload.message}`;
      }
    } catch {
      // Ignored: fallback to default message when the body is not JSON.
    }

    throw new Error(message);
  }

  downloadBlobFile(filename, await response.blob());
}

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

export function getApiBaseUrl(): string {
  return API_BASE_URL;
}

export function getConfiguredAuthUsername(): string {
  return API_USERNAME;
}

export function getConfiguredAuthPassword(): string {
  return API_PASSWORD;
}

export async function getEstudianteDetail(id: number): Promise<EstudianteDetail> {
  return apiGet<EstudianteDetail>(`/estudiantes/${id}`);
}

export async function createEstudiante(payload: EstudiantePayload): Promise<EstudianteDetail> {
  return apiPost<EstudianteDetail>('/estudiantes', payload);
}

export async function updateEstudiante(id: number, payload: Partial<EstudiantePayload>): Promise<EstudianteDetail> {
  return apiPut<EstudianteDetail>(`/estudiantes/${id}`, payload);
}

export async function getEmpresaDetail(id: number): Promise<EmpresaDetail> {
  return mapEmpresaDetail(await apiGet<EmpresaDetailApi>(`/empresas/${id}`));
}

export async function createEmpresa(payload: EmpresaPayload): Promise<EmpresaDetail> {
  return apiPost<EmpresaDetail>('/empresas', payload);
}

export async function updateEmpresa(id: number, payload: Partial<EmpresaPayload>): Promise<EmpresaDetail> {
  return apiPut<EmpresaDetail>(`/empresas/${id}`, payload);
}

export async function getConvenioDetail(id: number): Promise<ConvenioDetail> {
  return apiGet<ConvenioDetail>(`/convenios/${id}`);
}

export async function getConvenioExtras(id: number): Promise<ConvenioExtras> {
  return apiGet<ConvenioExtras>(`/convenios/${id}/extras`);
}

export async function createConvenio(payload: ConvenioPayload): Promise<ConvenioDetail> {
  return apiPost<ConvenioDetail>('/convenios', payload);
}

export async function updateConvenio(id: number, payload: Partial<ConvenioPayload>): Promise<ConvenioDetail> {
  return apiPut<ConvenioDetail>(`/convenios/${id}`, payload);
}

export async function advanceConvenioWorkflow(
  id: number,
): Promise<{ estado: string; workflow: ConvenioWorkflow }> {
  return apiRequest<{ estado: string; workflow: ConvenioWorkflow }>(`/convenios/${id}/workflow/advance`, {
    method: 'POST',
  });
}

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
      let message = `Error ${response.status}`;
      try {
        const payload = await response.json();
        if (payload?.message) {
          message = `${message}: ${payload.message}`;
        }
      } catch {
        // ignore
      }
      throw new Error(message);
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

export async function deleteConvenioDocument(convenioId: number, documentId: number): Promise<ConvenioDocumentRecord> {
  return apiDelete<ConvenioDocumentRecord>(`/convenios/${convenioId}/documents/${documentId}`);
}

export async function restoreConvenioDocument(convenioId: number, documentId: number): Promise<ConvenioDocumentRecord> {
  return apiRequest<ConvenioDocumentRecord>(`/convenios/${convenioId}/documents/${documentId}/restore`, {
    method: 'POST',
  });
}

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
      let message = `Error ${response.status}`;
      try {
        const payload = await response.json();
        if (payload?.message) {
          message = `${message}: ${payload.message}`;
        }
      } catch {
        // ignore
      }
      throw new Error(message);
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

export async function deleteEmpresaDocument(empresaId: number, documentId: number): Promise<EmpresaDocument> {
  return mapEmpresaDocument(await apiDelete<EmpresaDocumentApi>(`/empresas/${empresaId}/documentos/${documentId}`));
}

export async function restoreEmpresaDocument(empresaId: number, documentId: number): Promise<EmpresaDocument> {
  return mapEmpresaDocument(await apiRequest<EmpresaDocumentApi>(`/empresas/${empresaId}/documentos/${documentId}/restore`, {
    method: 'POST',
  }));
}

export async function dismissConvenioAlert(convenioId: number, alertId: number): Promise<ConvenioAlert> {
  return apiRequest<ConvenioAlert>(`/convenios/${convenioId}/alerts/${alertId}`, {
    method: 'PATCH',
  });
}

export async function getAsignacionDetail(id: number): Promise<AsignacionDetail> {
  return apiGet<AsignacionDetail>(`/asignaciones/${id}`);
}

export async function createAsignacion(payload: AsignacionPayload): Promise<AsignacionDetail> {
  return apiPost<AsignacionDetail>('/asignaciones', payload);
}

export async function updateAsignacion(id: number, payload: Partial<AsignacionPayload>): Promise<AsignacionDetail> {
  return apiPut<AsignacionDetail>(`/asignaciones/${id}`, payload);
}

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
    let message = `Error ${response.status}`;
    try {
      const apiPayload = await response.json();
      if (apiPayload?.message) {
        message = `${message}: ${apiPayload.message}`;
      }
    } catch {
      // ignored
    }
    throw new Error(message);
  }

  return (await response.json()) as SeguimientoRecord;
}

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
    let message = `Error ${response.status}`;
    try {
      const apiPayload = await response.json();
      if (apiPayload?.message) {
        message = `${message}: ${apiPayload.message}`;
      }
    } catch {
      // ignored
    }
    throw new Error(message);
  }

  return (await response.json()) as SeguimientoRecord;
}

export async function closeSeguimiento(
  asignacionId: number,
  seguimientoId: number,
  comentario?: string,
): Promise<SeguimientoRecord> {
  return apiPatch<SeguimientoRecord>(`/asignaciones/${asignacionId}/seguimientos/${seguimientoId}/close`, { comentario });
}

export async function reopenSeguimiento(asignacionId: number, seguimientoId: number): Promise<SeguimientoRecord> {
  return apiPatch<SeguimientoRecord>(`/asignaciones/${asignacionId}/seguimientos/${seguimientoId}/reopen`);
}

export async function upsertEvaluacionFinal(
  asignacionId: number,
  payload: Partial<EvaluacionFinalRecord>,
): Promise<EvaluacionFinalRecord> {
  return apiRequest<EvaluacionFinalRecord>(`/asignaciones/${asignacionId}/evaluacion-final`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

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

export async function fetchEmpresaInboxThreads(): Promise<EmpresaInboxThread[]> {
  return apiGet<EmpresaInboxThread[]>('/empresa-solicitudes/bandeja');
}

export async function approveEmpresaSolicitud(id: number): Promise<void> {
  await apiPost(`/empresa-solicitudes/${id}/aprobar`, {});
}

export async function rejectEmpresaSolicitud(id: number, motivo: string): Promise<void> {
  await apiPost(`/empresa-solicitudes/${id}/rechazar`, { motivo });
}

export async function fetchEmpresaMensajes(solicitudId: number): Promise<EmpresaSolicitudMensaje[]> {
  return apiGet<EmpresaSolicitudMensaje[]>(`/empresa-solicitudes/${solicitudId}/mensajes`);
}

export async function postEmpresaMensaje(
  solicitudId: number,
  autor: 'empresa' | 'centro',
  texto: string,
): Promise<EmpresaSolicitudMensaje> {
  return apiPost<EmpresaSolicitudMensaje>(`/empresa-solicitudes/${solicitudId}/mensajes`, { autor, texto });
}

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
    let message = `Error ${response.status}`;

    try {
      const payload = await response.json();
      if (payload?.message) {
        message = `${message}: ${payload.message}`;
      }
    } catch {
      // Ignored: fallback to default message when the body is not JSON.
    }

    throw new Error(message);
  }

  setActiveCredentials(username, password);
}

export async function logout(): Promise<void> {
  try {
    await apiRequest('/logout', { method: 'POST' });
  } finally {
    resetActiveCredentials();
  }
}

export async function fetchMe(): Promise<MeResponse> {
  return apiGet<MeResponse>('/me');
}

export async function fetchMonitorOverview(): Promise<MonitorOverview> {
  return apiGet<MonitorOverview>('/monitor');
}

export async function fetchPublicAccessSnapshot(): Promise<PublicAccessSnapshot> {
  return apiGet<PublicAccessSnapshot>('/public-access');
}

export async function fetchMfaStatus(): Promise<MfaStatus> {
  return apiGet<MfaStatus>('/mfa/status');
}

export async function requestMfaChallenge(): Promise<{ status: string; message?: string; detail?: string; expiresAt?: string }> {
  return apiRequest<{ status: string; message?: string; detail?: string; expiresAt?: string }>('/mfa/challenge', {
    method: 'POST',
  });
}

export async function verifyMfaCode(code: string): Promise<{ message: string; status: MfaStatus }> {
  return apiRequest<{ message: string; status: MfaStatus }>('/mfa/verify', {
    method: 'POST',
    body: JSON.stringify({ code }),
  });
}

export async function startPublicAccess(): Promise<PublicAccessSnapshot> {
  return apiRequest<PublicAccessSnapshot>('/public-access/start', {
    method: 'POST',
  });
}

export async function stopPublicAccess(): Promise<PublicAccessSnapshot> {
  return apiRequest<PublicAccessSnapshot>('/public-access/stop', {
    method: 'POST',
  });
}
