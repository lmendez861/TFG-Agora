/**
 * Comentario de mantenimiento Agora.
 * Proposito: Componente React: renderiza una parte reutilizable de la interfaz y comunica eventos al contenedor superior.
 * Relaciones: Conecta con modulos locales: ../types.
 */
import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from 'react';
import type {
  ConvenioSummary,
  EmpresaSummary,
  EstudianteSummary,
  TutorAcademicoSummary,
  TutorProfesionalSummary,
} from '../types';

const MODALIDAD_OPTIONS = ['presencial', 'remota', 'hibrida'];
const ESTADO_OPTIONS = ['planificada', 'en_curso', 'finalizada', 'cancelada', 'en_revision'];
const MIN_ALLOWED_DATE = '2020-01-01';
const MAX_ALLOWED_HOURS = 2400;
const ELIGIBLE_COMPANY_STATES = ['activa'];
const ELIGIBLE_CONVENIO_STATES = ['firmado', 'vigente', 'renovacion'];

/**
 * Construye una estructura derivada que sera enviada a otra capa del sistema.
 * Si cambia su contrato, revisar los imports locales indicados en la cabecera del archivo.
 */
function buildMaxAllowedDate(): string {
  return `${new Date().getFullYear() + 6}-12-31`;
}

export interface AsignacionFormValues {
  estudianteId: string;
  empresaId: string;
  convenioId: string;
  tutorAcademicoId: string;
  tutorProfesionalId: string;
  fechaInicio: string;
  fechaFin: string;
  modalidad: string;
  horasTotales: string;
  estado: string;
}

interface AsignacionFormProps {
  mode: 'create' | 'edit';
  initialValues: AsignacionFormValues;
  estudiantes: EstudianteSummary[];
  empresas: EmpresaSummary[];
  convenios: ConvenioSummary[];
  tutoresAcademicos: TutorAcademicoSummary[];
  tutoresProfesionales: TutorProfesionalSummary[];
  onSubmit: (values: AsignacionFormValues) => void;
  onCancel: () => void;
  submitting: boolean;
  errorMessage: string | null;
  loadingValues?: boolean;
}

/**
 * Resume la responsabilidad de AsignacionForm dentro de este modulo y facilita seguir el flujo al revisarlo.
 * Si cambia su contrato, revisar los imports locales indicados en la cabecera del archivo.
 */
export function AsignacionForm({
  mode,
  initialValues,
  estudiantes,
  empresas,
  convenios,
  tutoresAcademicos,
  tutoresProfesionales,
  onSubmit,
  onCancel,
  submitting,
  errorMessage,
  loadingValues = false,
}: AsignacionFormProps) {
  const [values, setValues] = useState<AsignacionFormValues>(initialValues);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    setValues(initialValues);
    setLocalError(null);
  }, [initialValues]);

  const empresasDisponibles = useMemo(() => {
    const activeEmpresas = empresas.filter((empresa) => ELIGIBLE_COMPANY_STATES.includes(empresa.estadoColaboracion));
    const selectedEmpresa =
      values.empresaId && !activeEmpresas.some((empresa) => String(empresa.id) === values.empresaId)
        ? empresas.find((empresa) => String(empresa.id) === values.empresaId) ?? null
        : null;

    return [...activeEmpresas, ...(selectedEmpresa ? [selectedEmpresa] : [])].sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [empresas, values.empresaId]);

  const conveniosDisponibles = useMemo(() => {
    const eligibleConvenios = convenios.filter(
      (convenio) =>
        String(convenio.empresa.id) === values.empresaId &&
        ELIGIBLE_CONVENIO_STATES.includes(convenio.estado),
    );
    const selectedConvenio =
      values.convenioId && !eligibleConvenios.some((convenio) => String(convenio.id) === values.convenioId)
        ? convenios.find((convenio) => String(convenio.id) === values.convenioId) ?? null
        : null;

    return [...eligibleConvenios, ...(selectedConvenio ? [selectedConvenio] : [])];
  }, [convenios, values.convenioId, values.empresaId]);

  const tutoresProfesionalesDisponibles = useMemo(() => {
    const activeTutores = tutoresProfesionales.filter(
      (tutor) => tutor.activo && String(tutor.empresa.id) === values.empresaId,
    );
    const selectedTutor =
      values.tutorProfesionalId && !activeTutores.some((tutor) => String(tutor.id) === values.tutorProfesionalId)
        ? tutoresProfesionales.find((tutor) => String(tutor.id) === values.tutorProfesionalId) ?? null
        : null;

    return [...activeTutores, ...(selectedTutor ? [selectedTutor] : [])].sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [tutoresProfesionales, values.empresaId, values.tutorProfesionalId]);

  const convenioSeleccionado = useMemo(
    () => convenios.find((convenio) => String(convenio.id) === values.convenioId) ?? null,
    [convenios, values.convenioId],
  );
  const estudianteSeleccionado = useMemo(
    () => estudiantes.find((estudiante) => String(estudiante.id) === values.estudianteId) ?? null,
    [estudiantes, values.estudianteId],
  );
  const estudiantePracticasHint =
    mode === 'create' && (estudianteSeleccionado?.asignaciones.enCurso ?? 0) > 0
      ? 'Este estudiante ya figura con prácticas en curso. Si intentas solapar otra asignación activa, el sistema la bloqueará.'
      : null;
  const tutorProfesionalHint = useMemo(() => {
    if (!values.empresaId) {
      return 'Selecciona antes una empresa para cargar sus tutores profesionales.';
    }

    if (tutoresProfesionalesDisponibles.length === 0) {
      return 'No hay tutores profesionales activos dados de alta para esta empresa.';
    }

    return 'Se muestran solo los tutores profesionales activos vinculados a la empresa seleccionada.';
  }, [tutoresProfesionalesDisponibles.length, values.empresaId]);

  useEffect(() => {
    setValues((prev) => {
      let updated = prev;

      if (prev.convenioId && !conveniosDisponibles.some((convenio) => String(convenio.id) === prev.convenioId)) {
        updated = { ...updated, convenioId: '' };
      }

      if (
        prev.tutorProfesionalId &&
        !tutoresProfesionalesDisponibles.some((tutor) => String(tutor.id) === prev.tutorProfesionalId)
      ) {
        updated = { ...updated, tutorProfesionalId: '' };
      }

      return updated;
    });
  }, [conveniosDisponibles, tutoresProfesionalesDisponibles]);

  /**
   * Gestiona un evento de interfaz y lo enlaza con estado local, API o navegacion.
   * Si cambia su contrato, revisar los imports locales indicados en la cabecera del archivo.
   */
  const handleChange = (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = event.target;
    setLocalError(null);
    const nextValue = name === 'horasTotales' ? value.replace(/\D/g, '') : value;
    setValues((prev) => ({
      ...prev,
      [name]: nextValue,
    }));
  };

  const validateValues = (): string | null => {
    const maxAllowedDate = buildMaxAllowedDate();

    if (values.fechaInicio < MIN_ALLOWED_DATE || values.fechaInicio > maxAllowedDate) {
      return `La fecha de inicio debe estar entre ${MIN_ALLOWED_DATE} y ${maxAllowedDate}.`;
    }

    if (values.fechaFin) {
      if (values.fechaFin < MIN_ALLOWED_DATE || values.fechaFin > maxAllowedDate) {
        return `La fecha de fin debe estar entre ${MIN_ALLOWED_DATE} y ${maxAllowedDate}.`;
      }

      if (values.fechaFin < values.fechaInicio) {
        return 'La fecha de fin no puede ser anterior a la fecha de inicio.';
      }
    }

    if (values.horasTotales) {
      const parsedHours = Number(values.horasTotales);
      if (!Number.isInteger(parsedHours) || parsedHours < 0 || parsedHours > MAX_ALLOWED_HOURS) {
        return `Las horas totales deben ser un entero entre 0 y ${MAX_ALLOWED_HOURS}.`;
      }
    }

    if (convenioSeleccionado) {
      if (values.fechaInicio < convenioSeleccionado.fechaInicio) {
        return 'La fecha de inicio de la asignacion no puede ser anterior al inicio del convenio.';
      }

      if (convenioSeleccionado.fechaFin) {
        if (values.fechaInicio > convenioSeleccionado.fechaFin) {
          return 'La fecha de inicio de la asignacion no puede quedar fuera del periodo del convenio.';
        }

        if (values.fechaFin && values.fechaFin > convenioSeleccionado.fechaFin) {
          return 'La fecha de fin de la asignacion no puede superar la fecha de fin del convenio.';
        }
      }
    }

    return null;
  };

  /**
   * Gestiona un evento de interfaz y lo enlaza con estado local, API o navegacion.
   * Si cambia su contrato, revisar los imports locales indicados en la cabecera del archivo.
   */
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const validationError = validateValues();
    if (validationError) {
      setLocalError(validationError);
      return;
    }

    onSubmit(values);
  };

  if (loadingValues) {
    return <p className="form__loading">Cargando datos de la asignacion...</p>;
  }

  return (
    <form className="form" onSubmit={handleSubmit}>
      <div className="form__grid">
        <label className="form__field">
          <span>Estudiante*</span>
          <select name="estudianteId" value={values.estudianteId} onChange={handleChange} required>
            <option value="">Selecciona un estudiante</option>
            {estudiantes.map((estudiante) => (
              <option key={estudiante.id} value={estudiante.id}>
                {estudiante.nombre} {estudiante.apellido}
              </option>
            ))}
          </select>
          {estudiantePracticasHint ? <small className="form__hint">{estudiantePracticasHint}</small> : null}
        </label>

        <label className="form__field">
          <span>Empresa*</span>
          <select
            name="empresaId"
            value={values.empresaId}
            onChange={handleChange}
            required
            disabled={empresasDisponibles.length === 0}
          >
            <option value="">Selecciona una empresa</option>
            {empresasDisponibles.map((empresa) => (
              <option key={empresa.id} value={empresa.id}>
                {empresa.nombre} {empresa.estadoColaboracion !== 'activa' ? `(${empresa.estadoColaboracion})` : ''}
              </option>
            ))}
          </select>
          <small className="form__hint">Solo se muestran empresas activas para no asignar prácticas sobre datos pendientes de validar.</small>
        </label>

        <label className="form__field">
          <span>Convenio*</span>
          <select
            name="convenioId"
            value={values.convenioId}
            onChange={handleChange}
            required
            disabled={!values.empresaId || conveniosDisponibles.length === 0}
          >
            <option value="">Selecciona un convenio</option>
            {conveniosDisponibles.map((convenio) => (
              <option key={convenio.id} value={convenio.id}>
                {convenio.titulo} ({convenio.estado})
              </option>
            ))}
          </select>
          <small className="form__hint">Solo se listan convenios firmados, vigentes o en renovación para respetar el flujo de negocio.</small>
        </label>

        <label className="form__field">
          <span>Tutor académico*</span>
          <select name="tutorAcademicoId" value={values.tutorAcademicoId} onChange={handleChange} required>
            <option value="">Selecciona un tutor académico</option>
            {tutoresAcademicos.map((tutor) => (
              <option key={tutor.id} value={tutor.id}>
                {tutor.nombre} {tutor.apellido}
              </option>
            ))}
          </select>
        </label>

        <label className="form__field">
          <span>Tutor profesional</span>
          <select
            name="tutorProfesionalId"
            value={values.tutorProfesionalId}
            onChange={handleChange}
            disabled={!values.empresaId || tutoresProfesionalesDisponibles.length === 0}
          >
            <option value="">Sin asignar</option>
            {tutoresProfesionalesDisponibles.map((tutor) => (
              <option key={tutor.id} value={tutor.id}>
                {tutor.nombre} {tutor.activo ? '' : '(inactivo)'}
              </option>
            ))}
          </select>
          <small className="form__hint">{tutorProfesionalHint}</small>
        </label>

        <label className="form__field">
          <span>Modalidad*</span>
          <select name="modalidad" value={values.modalidad} onChange={handleChange} required>
            <option value="">Selecciona una modalidad</option>
            {MODALIDAD_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <label className="form__field">
          <span>Estado*</span>
          <select name="estado" value={values.estado} onChange={handleChange} required>
            <option value="">Selecciona un estado</option>
            {ESTADO_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <label className="form__field">
          <span>Horas totales</span>
          <input
            name="horasTotales"
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            placeholder="Ej. 370"
            value={values.horasTotales}
            onChange={handleChange}
          />
        </label>

        <label className="form__field">
          <span>Fecha inicio*</span>
          <input
            name="fechaInicio"
            type="date"
            value={values.fechaInicio}
            min={convenioSeleccionado?.fechaInicio ?? MIN_ALLOWED_DATE}
            max={convenioSeleccionado?.fechaFin ?? buildMaxAllowedDate()}
            onChange={handleChange}
            required
          />
        </label>

        <label className="form__field">
          <span>Fecha fin</span>
          <input
            name="fechaFin"
            type="date"
            value={values.fechaFin}
            min={values.fechaInicio || convenioSeleccionado?.fechaInicio || MIN_ALLOWED_DATE}
            max={convenioSeleccionado?.fechaFin ?? buildMaxAllowedDate()}
            onChange={handleChange}
          />
        </label>
      </div>

      {(localError || errorMessage) && <p className="form__error">{localError ?? errorMessage}</p>}

      <div className="form__actions">
        <button type="button" className="button button--ghost" onClick={onCancel} disabled={submitting}>
          Cancelar
        </button>
        <button type="submit" className="button button--primary" disabled={submitting}>
          {submitting ? 'Guardando...' : mode === 'create' ? 'Crear asignación' : 'Guardar cambios'}
        </button>
      </div>
    </form>
  );
}
