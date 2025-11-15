import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react';

export interface EstudianteFormValues {
  nombre: string;
  apellido: string;
  dni: string;
  email: string;
  telefono: string;
  grado: string;
  curso: string;
  expediente: string;
  estado: string;
}

const ESTADO_OPTIONS = ['disponible', 'en_practicas', 'finalizado'];

interface EstudianteFormProps {
  mode: 'create' | 'edit';
  initialValues: EstudianteFormValues;
  onSubmit: (values: EstudianteFormValues) => void;
  onCancel: () => void;
  submitting: boolean;
  errorMessage: string | null;
  loadingValues?: boolean;
}

export function EstudianteForm({
  mode,
  initialValues,
  onSubmit,
  onCancel,
  submitting,
  errorMessage,
  loadingValues = false,
}: EstudianteFormProps) {
  const [values, setValues] = useState<EstudianteFormValues>(initialValues);

  useEffect(() => {
    setValues(initialValues);
  }, [initialValues]);

  const handleChange = (event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
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
    return <p className="form__loading">Cargando datos del estudiante...</p>;
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
          <span>DNI*</span>
          <input name="dni" value={values.dni} onChange={handleChange} required />
        </label>

        <label className="form__field">
          <span>Email*</span>
          <input name="email" type="email" value={values.email} onChange={handleChange} required />
        </label>

        <label className="form__field">
          <span>Teléfono</span>
          <input name="telefono" value={values.telefono} onChange={handleChange} />
        </label>

        <label className="form__field">
          <span>Grado</span>
          <input name="grado" value={values.grado} onChange={handleChange} />
        </label>

        <label className="form__field">
          <span>Curso</span>
          <input name="curso" value={values.curso} onChange={handleChange} />
        </label>

        <label className="form__field">
          <span>Estado</span>
          <select name="estado" value={values.estado} onChange={handleChange}>
            {ESTADO_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="form__field">
        <span>Expediente</span>
        <textarea name="expediente" value={values.expediente} onChange={handleChange} rows={2} />
      </label>

      {errorMessage && <p className="form__error">{errorMessage}</p>}

      <div className="form__actions">
        <button type="button" className="button button--ghost" onClick={onCancel} disabled={submitting}>
          Cancelar
        </button>
        <button type="submit" className="button button--primary" disabled={submitting}>
          {submitting ? 'Guardando...' : mode === 'create' ? 'Crear estudiante' : 'Guardar cambios'}
        </button>
      </div>
    </form>
  );
}
