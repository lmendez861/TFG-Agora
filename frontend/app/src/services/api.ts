import type { ApiCollections, AsignacionSummary, ConvenioSummary, EmpresaSummary, EstudianteSummary } from '../types';

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

async function apiGet<T>(path: string): Promise<T> {
  const headers = new Headers();

  if (authorizationHeader) {
    headers.set('Authorization', authorizationHeader);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
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

  return (await response.json()) as T;
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
