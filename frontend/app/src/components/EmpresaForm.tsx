import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react';

export interface EmpresaFormValues {
  nombre: string;
  sector: string;
  direccion: string;
  ciudad: string;
  provincia: string;
  pais: string;
  telefono: string;
  email: string;
  web: string;
  estadoColaboracion: string;
  fechaAlta: string;
  observaciones: string;
}

interface EmpresaFormProps {
  mode: 'create' | 'edit';
  initialValues: EmpresaFormValues;
  onSubmit: (values: EmpresaFormValues) => void;
  onCancel: () => void;
  submitting: boolean;
  errorMessage: string | null;
  loadingValues?: boolean;
}

export function EmpresaForm({
  mode,
  initialValues,
  onSubmit,
  onCancel,
  submitting,
  errorMessage,
  loadingValues = false,
}: EmpresaFormProps) {
  const [values, setValues] = useState<EmpresaFormValues>(initialValues);

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
    return <p className="form__loading">Cargando datos de la empresa...</p>;
  }

  return (
    <form className="form" onSubmit={handleSubmit}>
      <div className="form__grid">
        <label className="form__field">
          <span>Nombre*</span>
          <input name="nombre" value={values.nombre} onChange={handleChange} required />
        </label>
        <label className="form__field">
          <span>Sector</span>
          <input name="sector" value={values.sector} onChange={handleChange} />
        </label>
        <label className="form__field">
          <span>Ciudad</span>
          <input name="ciudad" value={values.ciudad} onChange={handleChange} />
        </label>
        <label className="form__field">
          <span>Provincia</span>
          <input name="provincia" value={values.provincia} onChange={handleChange} />
        </label>
        <label className="form__field">
          <span>País</span>
          <input name="pais" value={values.pais} onChange={handleChange} />
        </label>
        <label className="form__field">
          <span>Dirección</span>
          <input name="direccion" value={values.direccion} onChange={handleChange} />
        </label>
        <label className="form__field">
          <span>Teléfono</span>
          <input name="telefono" value={values.telefono} onChange={handleChange} />
        </label>
        <label className="form__field">
          <span>Email</span>
          <input name="email" type="email" value={values.email} onChange={handleChange} />
        </label>
        <label className="form__field">
          <span>Web</span>
          <input name="web" value={values.web} onChange={handleChange} />
        </label>
        <label className="form__field">
          <span>Estado colaboración</span>
          <input name="estadoColaboracion" value={values.estadoColaboracion} onChange={handleChange} />
        </label>
        <label className="form__field">
          <span>Fecha de alta</span>
          <input name="fechaAlta" type="date" value={values.fechaAlta} onChange={handleChange} />
        </label>
      </div>

      <label className="form__field">
        <span>Observaciones</span>
        <textarea name="observaciones" rows={3} value={values.observaciones} onChange={handleChange} />
      </label>

      {errorMessage && <p className="form__error">{errorMessage}</p>}

      <div className="form__actions">
        <button type="button" className="button button--ghost" onClick={onCancel} disabled={submitting}>
          Cancelar
        </button>
        <button type="submit" className="button button--primary" disabled={submitting}>
          {submitting ? 'Guardando...' : mode === 'create' ? 'Registrar empresa' : 'Guardar cambios'}
        </button>
      </div>
    </form>
  );
}
