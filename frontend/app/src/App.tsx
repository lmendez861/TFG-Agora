import { useCallback, useEffect, useMemo, useState } from 'react';
import { DataTable, type TableColumn } from './components/DataTable';
import { fetchCollections, getApiBaseUrl } from './services/api';
import type {
  ApiCollections,
  AsignacionSummary,
  ConvenioSummary,
  EmpresaSummary,
  EstudianteSummary,
} from './types';
import './App.css';

const dateFormatter = new Intl.DateTimeFormat('es-ES', { dateStyle: 'medium' });

function formatDate(value: string | null): string {
  if (!value) {
    return '—';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return dateFormatter.format(date);
}

const EMPRESA_COLUMNS: Array<TableColumn<EmpresaSummary>> = [
  { key: 'nombre', header: 'Empresa', render: (empresa) => empresa.nombre },
  { key: 'sector', header: 'Sector', render: (empresa) => empresa.sector ?? '—' },
  { key: 'ciudad', header: 'Ciudad', render: (empresa) => empresa.ciudad ?? '—' },
  { key: 'estado', header: 'Estado', render: (empresa) => empresa.estadoColaboracion, align: 'center' },
  {
    key: 'conveniosActivos',
    header: 'Convenios',
    render: (empresa) => empresa.conveniosActivos,
    align: 'center',
  },
  {
    key: 'asignaciones',
    header: 'Asignaciones (total / en curso)',
    render: (empresa) => `${empresa.asignaciones.total} / ${empresa.asignaciones.enCurso}`,
    align: 'center',
  },
];

const ESTUDIANTE_COLUMNS: Array<TableColumn<EstudianteSummary>> = [
  {
    key: 'nombre',
    header: 'Estudiante',
    render: (estudiante) => `${estudiante.nombre} ${estudiante.apellido}`,
  },
  { key: 'dni', header: 'DNI', render: (estudiante) => estudiante.dni },
  { key: 'email', header: 'Email', render: (estudiante) => estudiante.email },
  { key: 'grado', header: 'Grado', render: (estudiante) => estudiante.grado ?? '—' },
  { key: 'estado', header: 'Estado', render: (estudiante) => estudiante.estado, align: 'center' },
  {
    key: 'asignaciones',
    header: 'Asignaciones (total / en curso)',
    render: (estudiante) => `${estudiante.asignaciones.total} / ${estudiante.asignaciones.enCurso}`,
    align: 'center',
  },
];

const CONVENIO_COLUMNS: Array<TableColumn<ConvenioSummary>> = [
  { key: 'titulo', header: 'Convenio', render: (convenio) => convenio.titulo },
  {
    key: 'empresa',
    header: 'Empresa',
    render: (convenio) => convenio.empresa.nombre,
  },
  { key: 'tipo', header: 'Tipo', render: (convenio) => convenio.tipo },
  { key: 'estado', header: 'Estado', render: (convenio) => convenio.estado, align: 'center' },
  {
    key: 'fechaInicio',
    header: 'Inicio',
    render: (convenio) => formatDate(convenio.fechaInicio),
  },
  {
    key: 'fechaFin',
    header: 'Fin',
    render: (convenio) => formatDate(convenio.fechaFin),
  },
  {
    key: 'asignaciones',
    header: 'Asignaciones',
    render: (convenio) => convenio.asignacionesAsociadas,
    align: 'center',
  },
];

const ASIGNACION_COLUMNS: Array<TableColumn<AsignacionSummary>> = [
  {
    key: 'empresa',
    header: 'Empresa',
    render: (asignacion) => asignacion.empresa.nombre,
  },
  {
    key: 'estudiante',
    header: 'Estudiante',
    render: (asignacion) => `${asignacion.estudiante.nombre} ${asignacion.estudiante.apellido}`,
  },
  {
    key: 'modalidad',
    header: 'Modalidad',
    render: (asignacion) => asignacion.modalidad,
  },
  { key: 'estado', header: 'Estado', render: (asignacion) => asignacion.estado, align: 'center' },
  {
    key: 'inicio',
    header: 'Inicio',
    render: (asignacion) => formatDate(asignacion.fechaInicio),
  },
  {
    key: 'fin',
    header: 'Fin',
    render: (asignacion) => formatDate(asignacion.fechaFin),
  },
  {
    key: 'horas',
    header: 'Horas',
    render: (asignacion) => asignacion.horasTotales ?? '—',
    align: 'center',
  },
];

const API_BASE_URL = getApiBaseUrl();

export default function App() {
  const [collections, setCollections] = useState<ApiCollections | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await fetchCollections();
      setCollections(data);
      setLastUpdated(new Date());
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Error desconocido al cargar los datos.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData().catch(() => {
      // El error ya se captura en loadData, evitamos advertencias de promesas sin tratar.
    });
  }, [loadData]);

  const stats = useMemo(() => {
    if (!collections) {
      return [];
    }

    const conveniosVigentes = collections.convenios.filter((convenio) =>
      convenio.estado.toLowerCase().includes('vig'),
    ).length;
    const asignacionesEnCurso = collections.asignaciones.filter((asignacion) =>
      asignacion.estado.toLowerCase() === 'en_curso',
    ).length;
    const horasPlanificadas = collections.asignaciones.reduce((total, asignacion) => {
      return total + (asignacion.horasTotales ?? 0);
    }, 0);

    return [
      { label: 'Empresas registradas', value: collections.empresas.length },
      { label: 'Estudiantes registrados', value: collections.estudiantes.length },
      { label: 'Convenios vigentes', value: conveniosVigentes },
      { label: 'Asignaciones en curso', value: asignacionesEnCurso },
      { label: 'Horas totales planificadas', value: horasPlanificadas.toLocaleString('es-ES') },
    ];
  }, [collections]);

  return (
    <div className="app">
      <header className="app__header">
        <div>
          <h1>Agora Practicas</h1>
          <p>Panel de apoyo para coordinar empresas colaboradoras, convenios y estudiantes.</p>
        </div>
        <div className="app__header-actions">
          <button type="button" onClick={loadData} disabled={loading}>
            {loading ? 'Actualizando…' : 'Actualizar datos'}
          </button>
          <span className="app__meta">API base: <code>{API_BASE_URL}</code></span>
          {lastUpdated && (
            <span className="app__meta">Actualizado: {lastUpdated.toLocaleTimeString('es-ES')}</span>
          )}
        </div>
      </header>

      {error && <div className="app__alert app__alert--error">{error}</div>}
      {loading && <div className="app__alert app__alert--info">Cargando datos…</div>}

      {collections && (
        <main className="app__content">
          <section className="stats-grid">
            {stats.map((stat) => (
              <article className="stat-card" key={stat.label}>
                <span className="stat-card__label">{stat.label}</span>
                <strong className="stat-card__value">{stat.value}</strong>
              </article>
            ))}
          </section>

          <section className="tables-grid">
            <DataTable caption="Empresas colaboradoras" data={collections.empresas} columns={EMPRESA_COLUMNS} />
            <DataTable caption="Convenios" data={collections.convenios} columns={CONVENIO_COLUMNS} />
            <DataTable caption="Estudiantes" data={collections.estudiantes} columns={ESTUDIANTE_COLUMNS} />
            <DataTable caption="Asignaciones" data={collections.asignaciones} columns={ASIGNACION_COLUMNS} />
          </section>
        </main>
      )}
    </div>
  );
}
