/**
 * Comentario de mantenimiento Agora.
 * Proposito: formulario del portal interno para mantener tutores profesionales vinculados a empresas.
 * Relaciones: lo invoca App.tsx desde el modulo de tutores y alimenta las asignaciones de practicas.
 */
import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import type { EmpresaSummary } from '../types';

export interface TutorProfesionalFormValues {
  empresaId: string;
  nombre: string;
  email: string;
  telefono: string;
  cargo: string;
  certificaciones: string;
  activo: boolean;
}

interface TutorProfesionalFormProps {
  mode: 'create' | 'edit';
  initialValues: TutorProfesionalFormValues;
  empresas: EmpresaSummary[];
  onSubmit: (values: TutorProfesionalFormValues) => void;
  onCancel: () => void;
  submitting: boolean;
  errorMessage: string | null;
  loadingValues?: boolean;
}

export function TutorProfesionalForm({
  mode,
  initialValues,
  empresas,
  onSubmit,
  onCancel,
  submitting,
  errorMessage,
  loadingValues = false,
}: TutorProfesionalFormProps) {
  const [values, setValues] = useState<TutorProfesionalFormValues>(initialValues);

  useEffect(() => {
    setValues(initialValues);
  }, [initialValues]);

  const handleChange = (event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = event.target;
    const checked = 'checked' in event.target ? event.target.checked : false;
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
    return <p className="form__loading">Cargando datos del tutor profesional...</p>;
  }

  return (
    <form className="form" onSubmit={handleSubmit}>
      <div className="form__grid">
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
          <span>Nombre*</span>
          <input name="nombre" value={values.nombre} onChange={handleChange} required />
        </label>
        <label className="form__field">
          <span>Email</span>
          <input name="email" type="email" value={values.email} onChange={handleChange} />
        </label>
        <label className="form__field">
          <span>Telefono</span>
          <input name="telefono" value={values.telefono} onChange={handleChange} />
        </label>
        <label className="form__field">
          <span>Cargo</span>
          <input name="cargo" value={values.cargo} onChange={handleChange} />
        </label>
        <label className="form__field full-row">
          <span>Certificaciones</span>
          <textarea name="certificaciones" rows={3} value={values.certificaciones} onChange={handleChange} />
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
