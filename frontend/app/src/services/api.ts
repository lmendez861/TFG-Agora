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
  EmpresaSolicitudSummary,
  TutorAcademicoSummary,
  TutorProfesionalSummary,
  EmpresaSolicitudMensaje,
  MeResponse,
  PaginatedResponse,
  EmpresaDocument,
} from '../types';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? 'http://127.0.0.1:8000/api';
async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);

  const hasJsonBody = typeof init.body !== 'undefined';
  if (hasJsonBody && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  if (!headers.has('Authorization')) {
    const user = (import.meta.env.VITE_API_USERNAME as string | undefined) ?? 'admin';
    const pass = (import.meta.env.VITE_API_PASSWORD as string | undefined) ?? 'admin123';
    headers.set('Authorization', `Basic ${btoa(`${user}:${pass}`)}`);
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

export async function fetchCollections(): Promise<ApiCollections> {
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

export function getApiBaseUrl(): string {
  return API_BASE_URL;
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
  return apiGet<EmpresaDetail>(`/empresas/${id}`);
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
  url?: string,
): Promise<ConvenioDocumentRecord> {
  return apiRequest<ConvenioDocumentRecord>(`/convenios/${convenioId}/documents`, {
    method: 'POST',
    body: JSON.stringify({
      nombre,
      tipo,
      url,
    }),
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

    const response = await fetch(`${API_BASE_URL}/empresas/${empresaId}/documentos`, {
      method: 'POST',
      body: formData,
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
    return (await response.json()) as EmpresaDocument;
  }

  return apiRequest<EmpresaDocument>(`/empresas/${empresaId}/documentos`, {
    method: 'POST',
    body: JSON.stringify({
      nombre,
      tipo,
      url,
    }),
  });
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
  await apiRequest('/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function logout(): Promise<void> {
  await apiRequest('/logout', { method: 'POST' });
}

export async function fetchMe(): Promise<MeResponse> {
  return apiGet<MeResponse>('/me');
}
