const API_URL = (window.env && window.env.API_URL) || 'http://127.0.0.1:8000/registro-empresa';

const form = document.getElementById('company-form');
const statusBox = document.getElementById('form-status');
const submitButton = document.getElementById('submit-button');
const scrollButton = document.getElementById('scroll-to-form');

const setStatus = (message, kind) => {
  statusBox.hidden = false;
  statusBox.textContent = message;
  statusBox.className = `form-status form-status--${kind}`;
};

const resetStatus = () => {
  statusBox.hidden = true;
  statusBox.textContent = '';
  statusBox.className = 'form-status';
};

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  resetStatus();
  submitButton.disabled = true;
  submitButton.textContent = 'Enviando...';

  const payload = Object.fromEntries(new FormData(form).entries());

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nombreEmpresa: payload.nombreEmpresa,
        sector: payload.sector || undefined,
        ciudad: payload.ciudad || undefined,
        web: payload.web || undefined,
        descripcion: payload.descripcion || undefined,
        contactoNombre: payload.contactoNombre,
        contactoEmail: payload.contactoEmail,
        contactoTelefono: payload.contactoTelefono || undefined,
      }),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => undefined);
      const message = data?.message || `Error ${response.status}`;
      throw new Error(message);
    }

    setStatus(
      'Solicitud enviada. Revisa tu correo para confirmar la direccion y espera la aprobacion del centro.',
      'success',
    );
    form.reset();
  } catch (err) {
    setStatus(err instanceof Error ? err.message : 'No se pudo enviar la solicitud.', 'error');
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = 'Enviar solicitud';
  }
});

scrollButton?.addEventListener('click', () => {
  document.getElementById('registro')?.scrollIntoView({ behavior: 'smooth' });
});
