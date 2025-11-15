import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from 'react';
import type {
  ConvenioSummary,
  EmpresaSummary,
  EstudianteSummary,
  TutorAcademicoSummary,
  TutorProfesionalSummary,
} from '../types';

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

  useEffect(() => {
    setValues(initialValues);
  }, [initialValues]);

  const conveniosDisponibles = useMemo(
    () => convenios.filter((convenio) => String(convenio.empresa.id) === values.empresaId),
    [convenios, values.empresaId],
  );

  const tutoresProfesionalesDisponibles = useMemo(
    () => tutoresProfesionales.filter((tutor) => String(tutor.empresa.id) === values.empresaId),
    [tutoresProfesionales, values.empresaId],
  );

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

  const handleChange = (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = event.target;
    setValues((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit(values);
  };

  if (loadingValues) {
    return <p className="form__loading">Cargando datos de la asignación...</p>;
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
        </label>

        <label className="form__field">
          <span>Empresa*</span>
          <select name="empresaId" value={values.empresaId} onChange={handleChange} required>
            <option value="">Selecciona una empresa</option>
            {empresas.map((empresa) => (
              <option key={empresa.id} value={empresa.id}>
                {empresa.nombre}
              </option>
            ))}
          </select>
        </label>

        <label className="form__field">
          <span>Convenio*</span>
          <select name="convenioId" value={values.convenioId} onChange={handleChange} required>
            <option value="">Selecciona un convenio</option>
            {conveniosDisponibles.map((convenio) => (
              <option key={convenio.id} value={convenio.id}>
                {convenio.titulo}
              </option>
            ))}
          </select>
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
          <select name="tutorProfesionalId" value={values.tutorProfesionalId} onChange={handleChange}>
            <option value="">Sin asignar</option>
            {tutoresProfesionalesDisponibles.map((tutor) => (
              <option key={tutor.id} value={tutor.id}>
                {tutor.nombre}
              </option>
            ))}
          </select>
        </label>

        <label className="form__field">
          <span>Modalidad*</span>
          <input name="modalidad" value={values.modalidad} onChange={handleChange} required />
        </label>

        <label className="form__field">
          <span>Estado*</span>
          <input name="estado" value={values.estado} onChange={handleChange} required />
        </label>

        <label className="form__field">
          <span>Horas totales</span>
          <input name="horasTotales" type="number" min="0" value={values.horasTotales} onChange={handleChange} />
        </label>

        <label className="form__field">
          <span>Fecha inicio*</span>
          <input name="fechaInicio" type="date" value={values.fechaInicio} onChange={handleChange} required />
        </label>

        <label className="form__field">
          <span>Fecha fin</span>
          <input name="fechaFin" type="date" value={values.fechaFin} onChange={handleChange} />
        </label>
      </div>

      {errorMessage && <p className="form__error">{errorMessage}</p>}

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
