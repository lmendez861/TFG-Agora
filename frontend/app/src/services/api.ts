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
} from '../types';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? 'http://127.0.0.1:8000/api';
const API_USERNAME = import.meta.env.VITE_API_USERNAME as string | undefined;
const API_PASSWORD = import.meta.env.VITE_API_PASSWORD as string | undefined;

const authorizationHeader = (() => {
  if (!API_USERNAME || !API_PASSWORD) {
    return undefined;
  }

  const credentials = `${API_USERNAME}:${API_PASSWORD}`;
  return `Basic ${btoa(credentials)}`;
})();

async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);

  if (authorizationHeader) {
    headers.set('Authorization', authorizationHeader);
  }

  const hasJsonBody = typeof init.body !== 'undefined';
  if (hasJsonBody && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers,
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

export async function fetchTutorAcademicos(): Promise<TutorAcademicoSummary[]> {
  return apiGet<TutorAcademicoSummary[]>('/tutores-academicos');
}

export async function fetchTutorProfesionales(empresaId?: number): Promise<TutorProfesionalSummary[]> {
  const query = typeof empresaId === 'number' ? `?empresaId=${empresaId}` : '';
  return apiGet<TutorProfesionalSummary[]>(`/tutores-profesionales${query}`);
}

export async function fetchEmpresaSolicitudes(): Promise<EmpresaSolicitudSummary[]> {
  return apiGet<EmpresaSolicitudSummary[]>('/empresa-solicitudes');
}

export async function approveEmpresaSolicitud(id: number): Promise<void> {
  await apiPost(`/empresa-solicitudes/${id}/aprobar`, {});
}

export async function rejectEmpresaSolicitud(id: number, motivo: string): Promise<void> {
  await apiPost(`/empresa-solicitudes/${id}/rechazar`, { motivo });
}
