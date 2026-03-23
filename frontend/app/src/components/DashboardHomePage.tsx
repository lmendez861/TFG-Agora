import { Link } from 'react-router-dom';
import type { AsignacionSummary, EstudianteSummary } from '../types';
import type { DashboardMetric, DashboardStat } from '../utils/dashboard';

interface DashboardHeroMetric {
  label: string;
  value: number;
  detail: string;
}

interface DashboardUpdateItem {
  title: string;
  detail: string;
}

interface DashboardModuleCard {
  id: string;
  label: string;
  total: number;
  description: string;
  detail: string;
  accent: string;
}

interface DashboardQuickLink {
  id: string;
  label: string;
  total: number;
  description: string;
  path: string;
}

interface DashboardHomePageProps {
  authError: string | null;
  heroMetrics: DashboardHeroMetric[];
  heroUpdates: DashboardUpdateItem[];
  moduleCards: DashboardModuleCard[];
  stats: DashboardStat[];
  analytics: DashboardMetric[];
  analyticsMax: number;
  dashboardBaseRecordCount: number;
  moduleQuickLinks: DashboardQuickLink[];
  studentPreview: EstudianteSummary[];
  selectedStudent: EstudianteSummary | null;
  selectedStudentAssignments: AsignacionSummary[];
  lastUpdated: Date | null;
  loadingReferenceData: boolean;
  onCreateAsignacion: () => void;
  onExportDashboard: () => void;
  onToggleStudent: (student: EstudianteSummary) => void;
  onEditStudent: (student: EstudianteSummary) => void;
}

export function DashboardHomePage({
  authError,
  heroMetrics,
  heroUpdates,
  moduleCards,
  stats,
  analytics,
  analyticsMax,
  dashboardBaseRecordCount,
  moduleQuickLinks,
  studentPreview,
  selectedStudent,
  selectedStudentAssignments,
  lastUpdated,
  loadingReferenceData,
  onCreateAsignacion,
  onExportDashboard,
  onToggleStudent,
  onEditStudent,
}: DashboardHomePageProps) {
  if (authError) {
    return <div className="app__alert app__alert--error">{authError}</div>;
  }

  return (
    <>
      <section className="hero">
        <div className="hero__content">
          <p className="hero__eyebrow">Operacion centralizada para practicas</p>
          <h1>
            Gestion integral de practicas
            <span className="hero__highlight hero__highlight--amber"> con control </span>
            y
            <span className="hero__highlight hero__highlight--cyan"> visibilidad real</span>.
          </h1>
          <p className="hero__description">
            Coordina empresas, convenios, estudiantes y solicitudes desde un panel operativo pensado para revision
            diaria. El arranque recupera un snapshot inmediato y sincroniza el dato real en segundo plano.
          </p>
          <div className="hero__actions">
            <button
              type="button"
              className="button button--primary button--lg"
              onClick={onCreateAsignacion}
              disabled={loadingReferenceData}
            >
              Planificar nueva asignacion
            </button>
            <a className="button button--ghost button--lg hero__link" href="/documentacion">
              Explorar documentacion
            </a>
          </div>
          <div className="hero__chips">
            <span className="chip chip--ghost">Carga inicial optimizada</span>
            <span className="chip chip--ghost">Exportacion CSV</span>
            <span className="chip chip--ghost">Monitor independiente</span>
          </div>
        </div>

        <aside className="hero__panel">
          <div className="hero__panel-header">
            <div>
              <p className="hero__panel-eyebrow">Pulso operativo</p>
              <h3>Resumen ejecutivo del dia</h3>
            </div>
            <span className="chip chip--ghost">
              {lastUpdated
                ? `Sync ${lastUpdated.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`
                : 'Sync pendiente'}
            </span>
          </div>

          <div className="hero__stat-grid">
            {heroMetrics.map((item) => (
              <article key={item.label} className="hero__stat-card">
                <span>{item.label}</span>
                <strong>{item.value}</strong>
                <small>{item.detail}</small>
              </article>
            ))}
          </div>

          <div className="hero__update-list">
            {heroUpdates.map((item) => (
              <article key={item.title} className="hero__update-item">
                <strong>{item.title}</strong>
                <p>{item.detail}</p>
              </article>
            ))}
          </div>
        </aside>

        <div className="hero__scribble hero__scribble--violet" />
      </section>

      <section className="modules-grid">
        {moduleCards.map((module) => (
          <article key={module.id} className={`module-card module-card--${module.accent}`}>
            <div className="module-card__meta">
              <span className="module-card__label">{module.label}</span>
              <strong className="module-card__total">{module.total}</strong>
            </div>
            <p className="module-card__description">{module.description}</p>
            <p className="module-card__detail">{module.detail}</p>
          </article>
        ))}
      </section>

      <section className="stats-grid">
        {stats.map((stat) => (
          <article className="stat-card" key={stat.label}>
            <span className="stat-card__label">{stat.label}</span>
            <strong className="stat-card__value">{stat.value}</strong>
          </article>
        ))}
      </section>

      <section className="analytics-card">
        <header className="analytics-card__header">
          <div>
            <p className="module-page__eyebrow">Dashboard analitico</p>
            <h3>Distribucion de asignaciones y actividad</h3>
          </div>
          <div className="module-page__actions">
            <span className="chip chip--ghost">Registros base: {dashboardBaseRecordCount}</span>
            <button type="button" className="button button--ghost button--sm" onClick={onExportDashboard}>
              Exportar resumen CSV
            </button>
          </div>
        </header>
        <div className="analytics-bars analytics-bars--vertical">
          {analytics.map((item, index) => {
            const height = Math.max((item.value / analyticsMax) * 100, 5);
            return (
              <div key={item.label} className="analytics-column">
                <div
                  className="analytics-column__fill"
                  style={{
                    height: `${height}%`,
                    animationDelay: `${index * 0.35}s`,
                    animationDuration: `${3 + (index % 3)}s`,
                  }}
                >
                  <span className="analytics-column__value">{item.value}</span>
                </div>
                <span className="analytics-column__label">{item.label}</span>
              </div>
            );
          })}
        </div>
      </section>

      <section className="module-links">
        {moduleQuickLinks.map((module) => (
          <article key={module.id} className="module-link-card">
            <p className="module-link-card__label">{module.label}</p>
            <strong className="module-link-card__value">{module.total}</strong>
            <p className="module-link-card__description">{module.description}</p>
            <Link className="button button--ghost button--sm module-link-card__cta" to={module.path}>
              Abrir modulo
            </Link>
          </article>
        ))}
      </section>

      <section className="student-cards">
        <div className="student-cards__header">
          <div>
            <h3>Perfiles de estudiantes</h3>
            <p>Resumen rapido del estado academico y de las asignaciones activas.</p>
          </div>
          <Link className="button button--ghost button--sm" to="/estudiantes">
            Ver modulo completo
          </Link>
        </div>

        {studentPreview.length > 0 ? (
          <div className="student-cards__grid">
            {studentPreview.map((student) => {
              const isActive = selectedStudent?.id === student.id;

              return (
                <button
                  type="button"
                  key={student.id}
                  className={`student-card ${isActive ? 'active' : ''}`}
                  onClick={() => onToggleStudent(student)}
                  aria-pressed={isActive}
                >
                  <div className="student-card__avatar">
                    {student.nombre.charAt(0)}
                    {student.apellido.charAt(0)}
                  </div>
                  <div className="student-card__body">
                    <h4>{student.nombre} {student.apellido}</h4>
                    <p>{student.grado ?? 'Grado no especificado'}</p>
                    <div className="student-card__chips">
                      <span className="chip chip--ghost">{student.estado}</span>
                      <span className="chip chip--ghost">
                        {student.asignaciones.enCurso} en curso / {student.asignaciones.total} total
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <p className="detail-placeholder">Aun no hay estudiantes registrados.</p>
        )}

        {selectedStudent && (
          <div className="student-detail">
            <div className="student-detail__header">
              <div>
                <h4>{selectedStudent.nombre} {selectedStudent.apellido}</h4>
                <p className="student-detail__subtitle">{selectedStudent.email}</p>
              </div>
              <div className="student-detail__header-actions">
                <span className="chip chip--ghost">{selectedStudent.estado}</span>
                <div className="student-detail__header-buttons">
                  <button type="button" className="button button--ghost button--sm" onClick={() => onEditStudent(selectedStudent)}>
                    Editar ficha
                  </button>
                  <a className="button button--link button--sm" href={`mailto:${selectedStudent.email}`}>
                    Contactar
                  </a>
                </div>
              </div>
            </div>

            <div className="student-detail__grid">
              <article>
                <span className="student-detail__label">DNI</span>
                <strong>{selectedStudent.dni}</strong>
              </article>
              <article>
                <span className="student-detail__label">Grado</span>
                <strong>{selectedStudent.grado ?? 'No especificado'}</strong>
              </article>
              <article>
                <span className="student-detail__label">Curso</span>
                <strong>{selectedStudent.curso ?? 'No indicado'}</strong>
              </article>
              <article>
                <span className="student-detail__label">Asignaciones</span>
                <strong>{selectedStudent.asignaciones.enCurso} en curso / {selectedStudent.asignaciones.total} total</strong>
              </article>
            </div>

            <div className="student-detail__content">
              {selectedStudentAssignments.length > 0 ? (
                <div className="student-detail__cards">
                  {selectedStudentAssignments.map((asignacion) => (
                    <article className="student-detail__card" key={asignacion.id}>
                      <header>
                        <h5>{asignacion.empresa.nombre}</h5>
                        <span className="chip chip--ghost">{asignacion.estado}</span>
                      </header>
                      <p>{asignacion.modalidad}</p>
                      <p>{asignacion.fechaInicio} - {asignacion.fechaFin ?? 'Sin fecha de cierre'}</p>
                      <Link to={`/empresas/${asignacion.empresa.id}`} className="link">
                        Gestionar empresa
                      </Link>
                    </article>
                  ))}
                </div>
              ) : (
                <p className="student-detail__placeholder">Todavia no tiene asignaciones registradas.</p>
              )}
            </div>
          </div>
        )}
      </section>
    </>
  );
}
