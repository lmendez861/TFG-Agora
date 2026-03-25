import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from 'react';
import type { EmpresaSummary } from '../types';

const CONVENIO_TYPE_OPTIONS = [
  'Prácticas curriculares',
  'Prácticas extracurriculares',
  'FP dual',
  'Colaboración institucional',
  'Proyecto aplicado',
];

const CONVENIO_STATUS_OPTIONS = [
  'borrador',
  'revisado',
  'firmado',
  'vigente',
  'renovacion',
  'finalizado',
  'rescindido',
  'en_negociacion',
];

const MIN_ALLOWED_DATE = '2020-01-01';

function buildMaxAllowedDate(): string {
  return `${new Date().getFullYear() + 6}-12-31`;
}

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
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    setValues(initialValues);
    setLocalError(null);
  }, [initialValues]);

  const empresasOrdenadas = useMemo(
    () => [...empresas].sort((a, b) => a.nombre.localeCompare(b.nombre)),
    [empresas],
  );

  const tipoOptions = useMemo(() => {
    if (values.tipo && !CONVENIO_TYPE_OPTIONS.includes(values.tipo)) {
      return [values.tipo, ...CONVENIO_TYPE_OPTIONS];
    }

    return CONVENIO_TYPE_OPTIONS;
  }, [values.tipo]);

  const estadoOptions = useMemo(() => {
    if (values.estado && !CONVENIO_STATUS_OPTIONS.includes(values.estado)) {
      return [values.estado, ...CONVENIO_STATUS_OPTIONS];
    }

    return CONVENIO_STATUS_OPTIONS;
  }, [values.estado]);

  const handleChange = (event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = event.target;
    setLocalError(null);
    setValues((prev) => ({
      ...prev,
      [name]: value,
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

    return null;
  };

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
          <span>Titulo*</span>
          <input name="titulo" value={values.titulo} onChange={handleChange} required />
        </label>
        <label className="form__field">
          <span>Tipo*</span>
          <select name="tipo" value={values.tipo} onChange={handleChange} required>
            <option value="">Selecciona un tipo</option>
            {tipoOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <label className="form__field">
          <span>Estado</span>
          <select name="estado" value={values.estado} onChange={handleChange}>
            <option value="">Sin definir</option>
            {estadoOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <label className="form__field">
          <span>Fecha inicio*</span>
          <input
            name="fechaInicio"
            type="date"
            value={values.fechaInicio}
            min={MIN_ALLOWED_DATE}
            max={buildMaxAllowedDate()}
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
            min={values.fechaInicio || MIN_ALLOWED_DATE}
            max={buildMaxAllowedDate()}
            onChange={handleChange}
          />
        </label>
        <label className="form__field">
          <span>Documento URL</span>
          <input name="documentoUrl" value={values.documentoUrl} onChange={handleChange} />
        </label>
      </div>

      <label className="form__field">
        <span>Descripcion</span>
        <textarea name="descripcion" rows={3} value={values.descripcion} onChange={handleChange} />
      </label>

      <label className="form__field">
        <span>Observaciones</span>
        <textarea name="observaciones" rows={3} value={values.observaciones} onChange={handleChange} />
      </label>

      {(localError || errorMessage) && <p className="form__error">{localError ?? errorMessage}</p>}

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
