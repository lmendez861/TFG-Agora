const STORAGE_KEY = 'companyPortalApiBase';
const defaultApiBase = localStorage.getItem(STORAGE_KEY) || 'http://127.0.0.1:8000/api';
let apiBase = defaultApiBase;

const apiBaseLabel = document.getElementById('apiBaseLabel');
const apiBaseInput = document.getElementById('apiBaseInput');
const saveApiBase = document.getElementById('saveApiBase');
const requestForm = document.getElementById('requestForm');
const submitRequest = document.getElementById('submitRequest');
const resetForm = document.getElementById('resetForm');
const formStatus = document.getElementById('formStatus');
const toast = document.getElementById('toast');

const verificationCard = document.getElementById('verificationCard');
const verificationMessage = document.getElementById('verificationMessage');
const verificationStatus = document.getElementById('verificationStatus');

function setApiBase(value) {
  apiBase = value;
  apiBaseLabel.textContent = apiBase;
  apiBaseInput.value = apiBase;
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3200);
}

function setStatus(el, message, type = 'info') {
  el.textContent = message;
  el.className = 'status';
  if (type === 'success') el.classList.add('success');
  if (type === 'error') el.classList.add('error');
  el.style.display = 'flex';
}

async function createSolicitud(payload) {
  const res = await fetch(`${apiBase}/empresa-solicitudes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Error ${res.status}`);
  }
  return res.json();
}

async function verifyToken(token) {
  const endpoint = `${apiBase}/empresa-solicitudes/verificar/${encodeURIComponent(token)}`;
  const res = await fetch(endpoint, { method: 'GET' });
  if (!res.ok) {
    let detail = 'No se pudo verificar el token.';
    try {
      const payload = await res.json();
      if (payload?.message) detail = payload.message;
    } catch (_) {}
    throw new Error(detail);
  }
  return res.json();
}

function parseForm() {
  const data = new FormData(requestForm);
  return {
    nombreEmpresa: data.get('nombreEmpresa')?.toString().trim(),
    ciudad: data.get('ciudad')?.toString().trim() || null,
    sector: data.get('sector')?.toString().trim() || null,
    web: data.get('web')?.toString().trim() || null,
    descripcion: data.get('mensaje')?.toString().trim() || null,
    contactoNombre: data.get('contactoNombre')?.toString().trim(),
    contactoEmail: data.get('contactoEmail')?.toString().trim(),
    contactoTelefono: data.get('contactoTelefono')?.toString().trim() || null,
  };
}

async function handleSubmit() {
  const payload = parseForm();
  if (!payload.nombreEmpresa || !payload.contactoNombre || !payload.contactoEmail) {
    setStatus(formStatus, 'Completa los campos obligatorios (empresa, contacto, email).', 'error');
    return;
  }
  submitRequest.disabled = true;
  setStatus(formStatus, 'Enviando solicitud...', 'info');
  try {
    const result = await createSolicitud(payload);
    if (result?.verificationUrl) {
      const link = `<a href="${result.verificationUrl}" target="_blank" rel="noreferrer">${result.verificationUrl}</a>`;
      formStatus.innerHTML = `Solicitud enviada. Puedes verificar ahora: ${link}`;
      formStatus.className = 'status success';
      formStatus.style.display = 'flex';
    } else {
      setStatus(formStatus, 'Solicitud enviada. Revisa tu correo y haz clic en el enlace de verificación.', 'success');
    }
    showToast('Solicitud enviada');
  } catch (err) {
    setStatus(formStatus, err.message || 'No se pudo enviar la solicitud.', 'error');
  } finally {
    submitRequest.disabled = false;
  }
}

function handleReset() {
  requestForm.reset();
  formStatus.style.display = 'none';
}

async function handleVerificationFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const token = params.get('token');
  if (!token) return;

  verificationCard.style.display = 'block';
  verificationMessage.textContent = 'Procesando tu verificación...';
  setStatus(verificationStatus, 'Comprobando token...', 'info');

  try {
    await verifyToken(token);
    verificationMessage.textContent = '¡Correo verificado correctamente!';
    setStatus(verificationStatus, 'Tu solicitud ha quedado marcada como verificada. El centro la podrá aprobar ahora.', 'success');
    showToast('Verificación correcta');
  } catch (err) {
    verificationMessage.textContent = 'No se pudo verificar el enlace';
    setStatus(verificationStatus, err.message || 'Token inválido o caducado.', 'error');
  }
}

function init() {
  setApiBase(apiBase);
  apiBaseInput.value = apiBase;
  saveApiBase.addEventListener('click', () => {
    const value = apiBaseInput.value.trim();
    if (!value) return;
    localStorage.setItem(STORAGE_KEY, value);
    setApiBase(value);
    showToast('API guardada');
  });
  submitRequest.addEventListener('click', (e) => {
    e.preventDefault();
    handleSubmit();
  });
  resetForm.addEventListener('click', (e) => {
    e.preventDefault();
    handleReset();
  });

  handleVerificationFromUrl();
}

document.addEventListener('DOMContentLoaded', init);
