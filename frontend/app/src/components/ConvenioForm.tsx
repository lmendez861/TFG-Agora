import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from 'react';
import type { EmpresaSummary } from '../types';

export interface ConvenioFormValues {
  empresaId: string;
  titulo: string;
  tipo: string;
  descripcion: string;
  estado: string;
  fechaInicio: string;
  fechaFin: string;
  documentoUrl: string;
  observaciones: string;
}

interface ConvenioFormProps {
  mode: 'create' | 'edit';
  initialValues: ConvenioFormValues;
  empresas: EmpresaSummary[];
  onSubmit: (values: ConvenioFormValues) => void;
  onCancel: () => void;
  submitting: boolean;
  errorMessage: string | null;
  loadingValues?: boolean;
}

export function ConvenioForm({
  mode,
  initialValues,
  empresas,
  onSubmit,
  onCancel,
  submitting,
  errorMessage,
  loadingValues = false,
}: ConvenioFormProps) {
  const [values, setValues] = useState<ConvenioFormValues>(initialValues);

  useEffect(() => {
    setValues(initialValues);
  }, [initialValues]);

  const empresasOrdenadas = useMemo(
    () => [...empresas].sort((a, b) => a.nombre.localeCompare(b.nombre)),
    [empresas],
  );

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
    return <p className="form__loading">Cargando datos del convenio...</p>;
  }

  return (
    <form className="form" onSubmit={handleSubmit}>
      <div className="form__grid">
        <label className="form__field">
          <span>Empresa*</span>
          <select name="empresaId" value={values.empresaId} onChange={handleChange} required>
            <option value="">Selecciona una empresa</option>
            {empresasOrdenadas.map((empresa) => (
              <option key={empresa.id} value={empresa.id}>
                {empresa.nombre}
              </option>
            ))}
          </select>
        </label>
        <label className="form__field">
          <span>Título*</span>
          <input name="titulo" value={values.titulo} onChange={handleChange} required />
        </label>
        <label className="form__field">
          <span>Tipo*</span>
          <input name="tipo" value={values.tipo} onChange={handleChange} required />
        </label>
        <label className="form__field">
          <span>Estado</span>
          <input name="estado" value={values.estado} onChange={handleChange} />
        </label>
        <label className="form__field">
          <span>Fecha inicio*</span>
          <input name="fechaInicio" type="date" value={values.fechaInicio} onChange={handleChange} required />
        </label>
        <label className="form__field">
          <span>Fecha fin</span>
          <input name="fechaFin" type="date" value={values.fechaFin} onChange={handleChange} />
        </label>
        <label className="form__field">
          <span>Documento URL</span>
          <input name="documentoUrl" value={values.documentoUrl} onChange={handleChange} />
        </label>
      </div>

      <label className="form__field">
        <span>Descripción</span>
        <textarea name="descripcion" rows={3} value={values.descripcion} onChange={handleChange} />
      </label>

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
          {submitting ? 'Guardando...' : mode === 'create' ? 'Registrar convenio' : 'Guardar cambios'}
        </button>
      </div>
    </form>
  );
}
