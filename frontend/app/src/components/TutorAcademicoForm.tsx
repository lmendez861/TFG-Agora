/**
 * Comentario de mantenimiento Agora.
 * Proposito: formulario del portal interno para mantener tutores academicos del centro educativo.
 * Relaciones: lo invoca App.tsx desde el modulo de tutores y se reutiliza al planificar asignaciones.
 */
import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react';

export interface TutorAcademicoFormValues {
  nombre: string;
  apellido: string;
  email: string;
  telefono: string;
  departamento: string;
  especialidad: string;
  activo: boolean;
}

interface TutorAcademicoFormProps {
  mode: 'create' | 'edit';
  initialValues: TutorAcademicoFormValues;
  onSubmit: (values: TutorAcademicoFormValues) => void;
  onCancel: () => void;
  submitting: boolean;
  errorMessage: string | null;
  loadingValues?: boolean;
}

export function TutorAcademicoForm({
  mode,
  initialValues,
  onSubmit,
  onCancel,
  submitting,
  errorMessage,
  loadingValues = false,
}: TutorAcademicoFormProps) {
  const [values, setValues] = useState<TutorAcademicoFormValues>(initialValues);

  useEffect(() => {
    setValues(initialValues);
  }, [initialValues]);

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = event.target;
    setValues((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit(values);
  };

  if (loadingValues) {
    return <p className="form__loading">Cargando datos del tutor academico...</p>;
  }

  return (
    <form className="form" onSubmit={handleSubmit}>
      <div className="form__grid">
        <label className="form__field">
          <span>Nombre*</span>
          <input name="nombre" value={values.nombre} onChange={handleChange} required />
        </label>
        <label className="form__field">
          <span>Apellido*</span>
          <input name="apellido" value={values.apellido} onChange={handleChange} required />
        </label>
        <label className="form__field">
          <span>Email*</span>
          <input name="email" type="email" value={values.email} onChange={handleChange} required />
        </label>
        <label className="form__field">
          <span>Telefono</span>
          <input name="telefono" value={values.telefono} onChange={handleChange} />
        </label>
        <label className="form__field">
          <span>Departamento</span>
          <input name="departamento" value={values.departamento} onChange={handleChange} />
        </label>
        <label className="form__field">
          <span>Especialidad</span>
          <input name="especialidad" value={values.especialidad} onChange={handleChange} />
        </label>
        <label className="form__field form__field--checkbox">
          <span>Activo</span>
          <input name="activo" type="checkbox" checked={values.activo} onChange={handleChange} />
        </label>
      </div>

      {errorMessage && <p className="form__error">{errorMessage}</p>}

      <div className="form__actions">
        <button type="button" className="button button--ghost" onClick={onCancel} disabled={submitting}>
          Cancelar
        </button>
        <button type="submit" className="button button--primary" disabled={submitting}>
          {submitting ? 'Guardando...' : mode === 'create' ? 'Crear tutor' : 'Guardar cambios'}
        </button>
      </div>
    </form>
  );
}
