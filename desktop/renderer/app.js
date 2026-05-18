const api = window.agoraDesktop;
const bridgeReady = Boolean(
  api
  && typeof api.getConfig === 'function'
  && typeof api.saveConfig === 'function'
  && typeof api.getStatus === 'function'
  && typeof api.onStatus === 'function'
);

const state = {
  status: null,
  config: null,
  taskRunning: false,
  logs: [],
  workflowResult: null,
  monitorOverview: null,
};

const selectors = {
  sideStatusDot: document.querySelector('#sideStatusDot'),
  sideStatusTitle: document.querySelector('#sideStatusTitle'),
  sideStatusDetail: document.querySelector('#sideStatusDetail'),
  brandContext: document.querySelector('#brandContext'),
  topbarEyebrow: document.querySelector('#topbarEyebrow'),
  taskPill: document.querySelector('#taskPill'),
  modePill: document.querySelector('#modePill'),
  metricBackend: document.querySelector('#metricBackend'),
  metricDatabase: document.querySelector('#metricDatabase'),
  metricBuilds: document.querySelector('#metricBuilds'),
  metricPublic: document.querySelector('#metricPublic'),
  backendStatus: document.querySelector('#backendStatus'),
  backendDetail: document.querySelector('#backendDetail'),
  databaseStatus: document.querySelector('#databaseStatus'),
  databaseDetail: document.querySelector('#databaseDetail'),
  publicStatus: document.querySelector('#publicStatus'),
  publicDetail: document.querySelector('#publicDetail'),
  mfaStatus: document.querySelector('#mfaStatus'),
  mfaCodeInput: document.querySelector('#mfaCodeInput'),
  operationUpdated: document.querySelector('#operationUpdated'),
  monitorServices: document.querySelector('#monitorServices'),
  monitorMetrics: document.querySelector('#monitorMetrics'),
  incidentCount: document.querySelector('#incidentCount'),
  monitorIncidents: document.querySelector('#monitorIncidents'),
  monitorActivity: document.querySelector('#monitorActivity'),
  monitorTests: document.querySelector('#monitorTests'),
  testResult: document.querySelector('#testResult'),
  backupResult: document.querySelector('#backupResult'),
  dependencyDiagnostics: document.querySelector('#dependencyDiagnostics'),
  internalUrl: document.querySelector('#internalUrl'),
  monitorUrl: document.querySelector('#monitorUrl'),
  externalLocalUrl: document.querySelector('#externalLocalUrl'),
  publicExternalUrl: document.querySelector('#publicExternalUrl'),
  modeInput: document.querySelector('#modeInput'),
  remoteBaseUrlInput: document.querySelector('#remoteBaseUrlInput'),
  remoteApiUsernameInput: document.querySelector('#remoteApiUsernameInput'),
  remoteApiPasswordInput: document.querySelector('#remoteApiPasswordInput'),
  remoteApiPasswordHint: document.querySelector('#remoteApiPasswordHint'),
  remoteSshTargetInput: document.querySelector('#remoteSshTargetInput'),
  remoteSshKeyPathInput: document.querySelector('#remoteSshKeyPathInput'),
  remoteAppContainerInput: document.querySelector('#remoteAppContainerInput'),
  remoteDbContainerInput: document.querySelector('#remoteDbContainerInput'),
  connectionFeedback: document.querySelector('#connectionFeedback'),
  connectionSummary: document.querySelector('#connectionSummary'),
  workflowStatus: document.querySelector('#workflowStatus'),
  workflowStatusDetail: document.querySelector('#workflowStatusDetail'),
  workflowSteps: document.querySelector('#workflowSteps'),
  workflowArtifacts: document.querySelector('#workflowArtifacts'),
  logList: document.querySelector('#logList'),
};

function isCloudMode() {
  return state.status?.mode === 'cloud' || state.config?.mode === 'cloud';
}

function setConnectionFeedback(kind, message) {
  if (!selectors.connectionFeedback) {
    return;
  }

  selectors.connectionFeedback.classList.remove('is-success', 'is-error');
  if (kind) {
    selectors.connectionFeedback.classList.add(kind === 'success' ? 'is-success' : 'is-error');
  }
  selectors.connectionFeedback.textContent = message;
}

function updateModeVisibility() {
  const mode = isCloudMode() ? 'cloud' : 'local';
  document.querySelectorAll('[data-mode-visible]').forEach((element) => {
    const targetMode = element.dataset.modeVisible || 'both';
    const visible = targetMode === 'both' || targetMode === mode;
    element.classList.toggle('is-hidden-mode', !visible);
  });
}

function renderRemotePasswordHint(remote) {
  if (!selectors.remoteApiPasswordHint || !selectors.remoteApiPasswordInput) {
    return;
  }

  const hasStoredSecret = Boolean(remote?.apiPasswordStored);
  selectors.remoteApiPasswordInput.placeholder = hasStoredSecret
    ? 'Dejala vacia para conservar la credencial guardada'
    : 'Credencial remota';
  selectors.remoteApiPasswordHint.textContent = hasStoredSecret
    ? 'Hay una credencial cifrada guardada. Deja el campo vacio para conservarla o escribe una nueva para sustituirla.'
    : 'La credencial se guarda cifrada en este equipo.';
}

function setText(selector, value) {
  if (selector) {
    selector.textContent = value || '-';
  }
}

function serviceClass(status) {
  if (['running', 'ready', 'active'].includes(status)) {
    return 'is-running';
  }
  if (['starting', 'missing', 'error'].includes(status)) {
    return 'is-warning';
  }
  return 'is-stopped';
}

function updateServiceCard(name, status) {
  const card = document.querySelector(`[data-service-card="${name}"]`);
  if (!card) {
    return;
  }

  card.classList.remove('is-running', 'is-warning', 'is-stopped');
  card.classList.add(serviceClass(status));
}

function renderConfig(config) {
  state.config = config;
  if (!config) {
    return;
  }

  const remote = config.remote || {};
  if (selectors.modeInput) selectors.modeInput.value = config.mode || 'local';
  if (selectors.remoteBaseUrlInput) selectors.remoteBaseUrlInput.value = remote.baseUrl || '';
  if (selectors.remoteApiUsernameInput) selectors.remoteApiUsernameInput.value = remote.apiUsername || '';
  if (selectors.remoteApiPasswordInput) selectors.remoteApiPasswordInput.value = '';
  if (selectors.remoteSshTargetInput) selectors.remoteSshTargetInput.value = remote.sshTarget || '';
  if (selectors.remoteSshKeyPathInput) selectors.remoteSshKeyPathInput.value = remote.sshKeyPath || '';
  if (selectors.remoteAppContainerInput) selectors.remoteAppContainerInput.value = remote.appContainer || '';
  if (selectors.remoteDbContainerInput) selectors.remoteDbContainerInput.value = remote.dbContainer || '';
  renderRemotePasswordHint(remote);

  const cloud = config.mode === 'cloud';
  setText(selectors.modePill, cloud ? 'Modo cloud' : 'Modo local');
  setText(selectors.brandContext, cloud ? 'Control cloud' : 'Control local');
  setText(selectors.topbarEyebrow, cloud ? 'Entorno cloud' : 'Entorno local');
  setText(
    selectors.connectionSummary,
    cloud
      ? `El escritorio usara ${remote.baseUrl || 'la URL cloud configurada'} y desactivara las operaciones que solo tienen sentido en local.`
      : 'El escritorio levantara y supervisara el entorno local integrado.',
  );
  updateModeVisibility();
  syncButtons();
}

function renderStatus(status) {
  state.status = status;
  const cloud = status.mode === 'cloud';

  const backendRunning = status.services.backend.status === 'running';
  selectors.sideStatusDot.classList.toggle('is-active', backendRunning);
  setText(selectors.sideStatusTitle, backendRunning ? (cloud ? 'Cloud activo' : 'Local activo') : (cloud ? 'Cloud no disponible' : 'Local detenido'));
  setText(selectors.sideStatusDetail, cloud ? (status.urls.internal || 'Sin URL') : `Puerto ${status.port}`);
  setText(selectors.brandContext, cloud ? 'Control cloud' : 'Control local');
  setText(selectors.topbarEyebrow, cloud ? 'Entorno cloud' : 'Entorno local');
  setText(selectors.modePill, cloud ? 'Modo cloud' : 'Modo local');

  setText(selectors.metricBackend, status.services.backend.label);
  setText(selectors.metricDatabase, status.services.database.label);
  setText(selectors.metricBuilds, status.services.builds.status === 'ready' ? 'Listas' : 'Pendientes');
  setText(selectors.metricPublic, publicStatusLabel(status.services.publicAccess.status));

  setText(selectors.backendStatus, status.services.backend.label);
  setText(selectors.backendDetail, status.urls.internal ? status.urls.internal.replace(/\/app\/?$/, '') : 'Sin URL');
  setText(selectors.databaseStatus, status.services.database.label);
  setText(selectors.databaseDetail, status.services.database.path);
  setText(selectors.publicStatus, publicStatusLabel(status.services.publicAccess.status));
  setText(selectors.publicDetail, status.services.publicAccess.publicUrl || status.services.publicAccess.detail);
  renderMfaStatus(status.services.mfa);

  setText(selectors.internalUrl, status.urls.internal || 'No disponible');
  setText(selectors.monitorUrl, status.urls.monitor || 'Integrado en la app');
  setText(selectors.externalLocalUrl, status.urls.externalLocal || 'No disponible');
  setText(selectors.publicExternalUrl, status.urls.publicExternal || 'Pendiente');

  updateServiceCard('backend', status.services.backend.status);
  updateServiceCard('database', status.services.database.status);
  updateServiceCard('publicAccess', status.services.publicAccess.status);
  updateModeVisibility();
  syncButtons();
}

function publicStatusLabel(status) {
  switch (status) {
    case 'active':
      return 'Activa';
    case 'starting':
      return 'Iniciando';
    case 'error':
      return 'Error';
    default:
      return 'Detenida';
  }
}

function renderMfaStatus(mfa) {
  if (!mfa) {
    setText(selectors.mfaStatus, 'MFA no disponible');
    return;
  }

  if (mfa.verified) {
    setText(selectors.mfaStatus, `MFA verificado hasta ${formatDateTime(mfa.verifiedUntil)}`);
    return;
  }

  if (mfa.mailReady) {
    setText(selectors.mfaStatus, 'MFA pendiente');
    return;
  }

  setText(selectors.mfaStatus, mfa.detail || 'MFA no configurado');
}

function formatDateTime(value) {
  if (!value) {
    return '-';
  }

  return new Date(value).toLocaleString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDateTimeFull(value) {
  if (!value) {
    return '-';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '-';
  }

  return date.toLocaleString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function renderTask(task) {
  state.taskRunning = Boolean(task.running);
  selectors.taskPill.classList.toggle('is-running', state.taskRunning);
  setText(selectors.taskPill, state.taskRunning ? 'Ejecutando' : 'Sin tareas');
  syncButtons();
}

function buildIncidentRecords(activity, logs) {
  const incidentPattern = /(error|exception|fatal|critical|warning|incidencia|rechaz)/i;
  const activityIncidents = (activity || [])
    .filter((item) => incidentPattern.test(`${item.category} ${item.title} ${item.description}`))
    .map((item) => ({
      id: `activity-${item.id}`,
      source: 'Actividad',
      severity: /(error|exception|fatal|critical|incidencia)/i.test(`${item.category} ${item.title}`) ? 'error' : 'warning',
      title: item.title,
      detail: item.description,
      timestamp: item.timestamp,
    }));

  const logIncidents = (logs || []).flatMap((log) => (
    (log.lines || [])
      .filter((line) => incidentPattern.test(line))
      .slice(-5)
      .map((line, index) => ({
        id: `log-${log.file}-${index}`,
        source: log.file,
        severity: /(error|exception|fatal|critical)/i.test(line) ? 'error' : 'warning',
        title: /(error|exception|fatal|critical)/i.test(line) ? 'Error detectado en log' : 'Aviso detectado en log',
        detail: line,
        timestamp: log.updatedAt,
      }))
  ));

  return [...activityIncidents, ...logIncidents]
    .sort((left, right) => new Date(right.timestamp || 0).getTime() - new Date(left.timestamp || 0).getTime())
    .slice(0, 8);
}

function renderMonitorOverview(overview) {
  state.monitorOverview = overview;

  if (!overview) {
    setText(selectors.operationUpdated, 'Sin datos');
    const monitorPlaceholder = isCloudMode()
      ? (state.status?.services?.monitor?.label === 'Sin permisos'
        ? 'La cuenta cloud autentica, pero no puede leer el monitor. Usa admin/admin123 o un rol de monitor.'
        : 'Configura credenciales remotas validas para leer el monitor cloud.')
      : 'Levanta el backend para leer el monitor integrado.';
    selectors.monitorServices.innerHTML = `<p class="placeholder-text">${monitorPlaceholder}</p>`;
    selectors.monitorMetrics.innerHTML = '';
    selectors.monitorIncidents.innerHTML = '';
    selectors.monitorActivity.innerHTML = '';
    selectors.monitorTests.innerHTML = '';
    setText(selectors.incidentCount, '0 detectadas');
    return;
  }

  setText(selectors.operationUpdated, formatDateTimeFull(overview.generatedAt));
  selectors.monitorServices.innerHTML = (overview.services || [])
    .map((service) => `
      <article class="monitor-service-item is-${escapeHtml(service.status)}">
        <div>
          <strong>${escapeHtml(service.name)}</strong>
          <p>${escapeHtml(service.detail)}</p>
        </div>
        <span>${service.status === 'healthy' ? 'OK' : 'Revision'}</span>
      </article>
    `)
    .join('');

  selectors.monitorMetrics.innerHTML = (overview.metrics || [])
    .slice(0, 10)
    .map((metric) => `
      <article class="monitor-metric-item">
        <span>${escapeHtml(metric.label)}</span>
        <strong>${escapeHtml(metric.value)}</strong>
        <small>${escapeHtml(metric.hint)}</small>
      </article>
    `)
    .join('');

  const incidents = buildIncidentRecords(overview.activity, overview.logs);
  setText(selectors.incidentCount, `${incidents.length} detectadas`);
  selectors.monitorIncidents.innerHTML = incidents.length > 0
    ? incidents.map((incident) => `
      <article class="monitor-list-item is-${escapeHtml(incident.severity)}">
        <div>
          <strong>${escapeHtml(incident.title)}</strong>
          <small>${escapeHtml(incident.source)} | ${escapeHtml(formatDateTimeFull(incident.timestamp))}</small>
        </div>
        <p>${escapeHtml(incident.detail)}</p>
      </article>
    `).join('')
    : '<p class="placeholder-text">No se han detectado incidencias destacables.</p>';

  selectors.monitorActivity.innerHTML = (overview.activity || []).length > 0
    ? overview.activity.map((item) => `
      <article class="monitor-list-item">
        <div>
          <strong>${escapeHtml(item.title)}</strong>
          <small>${escapeHtml(item.category)} | ${escapeHtml(formatDateTimeFull(item.timestamp))}</small>
        </div>
        <p>${escapeHtml(item.description)}</p>
      </article>
    `).join('')
    : '<p class="placeholder-text">No hay actividad reciente.</p>';

  selectors.monitorTests.innerHTML = (overview.tests || [])
    .map((suite) => `
      <article class="monitor-test-item is-${escapeHtml(suite.status)}">
        <div>
          <strong>${escapeHtml(suite.name)}</strong>
          <small>${escapeHtml(suite.scope)} | ${escapeHtml(suite.totalFiles)} archivos</small>
        </div>
        <code>${escapeHtml(suite.command)}</code>
      </article>
    `)
    .join('');
}

function renderTestResult(payload) {
  if (!payload?.ok) {
    selectors.testResult.textContent = `ERROR\n${payload?.error || 'No se pudo ejecutar la suite.'}`;
    return;
  }

  const result = payload.result;
  selectors.testResult.textContent = [
    `${result.label}`,
    `Inicio: ${formatDateTimeFull(result.startedAt)}`,
    `Fin: ${formatDateTimeFull(result.finishedAt)}`,
    '',
    result.stdout || result.stderr || 'Ejecucion completada sin salida adicional.',
  ].join('\n');
}

function renderBackupResult(payload, fallbackError) {
  if (!payload?.ok) {
    selectors.backupResult.textContent = `ERROR\n${fallbackError || payload?.error || 'Operacion no completada.'}`;
    return;
  }

  const result = payload.result;
  if (result?.canceled) {
    selectors.backupResult.textContent = 'Restauracion cancelada.';
    return;
  }

  selectors.backupResult.textContent = Object.entries(result || {})
    .map(([key, value]) => `${key}: ${value}`)
    .join('\n') || 'Operacion completada.';
}

function renderDependencyDiagnostics(payload) {
  if (!payload?.ok) {
    selectors.dependencyDiagnostics.innerHTML = `<p class="placeholder-text">ERROR: ${escapeHtml(payload?.error || 'No se pudo diagnosticar.')}</p>`;
    return;
  }

  const items = payload.result?.items || [];
  selectors.dependencyDiagnostics.innerHTML = items.map((item) => `
    <article class="dependency-item is-${escapeHtml(item.status)}">
      <span>${escapeHtml(item.status.toUpperCase())}</span>
      <div>
        <strong>${escapeHtml(item.label)}</strong>
        <p>${escapeHtml(item.detail)}</p>
      </div>
    </article>
  `).join('');
}

function syncButtons() {
  const buttons = document.querySelectorAll('button[data-action], button[data-open], button[data-test-suite], button[data-log-target]');
  const cloudMode = isCloudMode();
  const remoteSshReady = Boolean(state.config?.remote?.sshTarget && state.config?.remote?.sshKeyPath);
  const localOnlyActions = new Set([
    'prepare',
    'startLocal',
    'stopLocal',
    'rebuild',
    'startPublic',
    'stopPublic',
    'requestMfa',
    'verifyMfa',
    'restoreDatabase',
  ]);
  const cloudOnlyActions = new Set([
    'restartRemoteApp',
    'restartRemoteDb',
  ]);
  const localOnlyTests = new Set(['backend-flow', 'frontend-unit', 'frontend-e2e']);
  const supportedCloudLogTargets = new Set(['backendOut', 'backendErr', 'symfonyLogs', 'database']);

  buttons.forEach((button) => {
    const action = button.dataset.action;
    const openTarget = button.dataset.open;
    let disabled = state.taskRunning;

    if (cloudMode && action && localOnlyActions.has(action)) {
      disabled = true;
    }

    if (!cloudMode && action && cloudOnlyActions.has(action)) {
      disabled = true;
    }

    if (openTarget && state.status) {
      disabled = disabled || !state.status.urls[openTarget];
      if (cloudMode && openTarget === 'monitor') {
        disabled = true;
      }
    }

    if (action === 'clearLogs') {
      disabled = false;
    }

    if (button.dataset.logTarget) {
      disabled = cloudMode ? (!supportedCloudLogTargets.has(button.dataset.logTarget) || !remoteSshReady) : false;
    }

    if (cloudMode && action && (action === 'backupDatabase' || cloudOnlyActions.has(action))) {
      disabled = disabled || !remoteSshReady;
    }

    if (button.dataset.testSuite && cloudMode && localOnlyTests.has(button.dataset.testSuite)) {
      disabled = true;
    }

    if (action === 'requestMfa') {
      disabled = disabled || !state.status?.services.mfa?.mailReady;
    }

    if (action === 'verifyMfa') {
      disabled = disabled || !selectors.mfaCodeInput?.value.trim();
    }

    if (action === 'startPublic' || action === 'stopPublic') {
      disabled = disabled || !state.status?.services.mfa?.verified;
    }

    button.disabled = disabled;
  });
}

function appendLog(entry) {
  state.logs = [entry, ...state.logs].slice(0, 80);
  selectors.logList.innerHTML = state.logs
    .map((item) => {
      const time = new Date(item.at).toLocaleTimeString('es-ES', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
      return `<li><time>${time}</time><span>${escapeHtml(item.message)}</span></li>`;
    })
    .join('');
}

function workflowStatusLabel(status) {
  switch (status) {
    case 'ok':
      return 'OK';
    case 'error':
      return 'Error';
    case 'running':
      return 'En curso';
    default:
      return 'Pendiente';
  }
}

function renderWorkflowResult(result) {
  state.workflowResult = result;

  if (!result) {
    setText(selectors.workflowStatus, 'Sin ejecutar');
    setText(selectors.workflowStatusDetail, 'Esperando prueba');
    selectors.workflowSteps.innerHTML = '';
    selectors.workflowArtifacts.textContent = 'Sin ejecutar';
    return;
  }

  const finished = Boolean(result.finishedAt);
  const running = result.steps?.some((step) => step.status === 'running');
  const hasErrors = result.steps?.some((step) => step.status === 'error');
  const statusText = running ? 'Ejecutando' : hasErrors ? 'Error' : result.ok ? 'Correcto' : finished ? 'Incompleto' : 'Ejecutando';
  const detailText = finished
    ? new Date(result.finishedAt).toLocaleString('es-ES')
    : `Inicio ${new Date(result.startedAt).toLocaleTimeString('es-ES')}`;

  selectors.workflowStatus.classList.remove('is-ok', 'is-error', 'is-running');
  selectors.workflowStatus.classList.add(hasErrors ? 'is-error' : running ? 'is-running' : result.ok ? 'is-ok' : 'is-running');
  setText(selectors.workflowStatus, statusText);
  setText(selectors.workflowStatusDetail, detailText);

  selectors.workflowSteps.innerHTML = (result.steps || [])
    .map((step) => `
      <li class="workflow-step is-${escapeHtml(step.status)}">
        <span>${escapeHtml(workflowStatusLabel(step.status))}</span>
        <strong>${escapeHtml(step.label)}</strong>
        <p>${escapeHtml(step.detail)}</p>
      </li>
    `)
    .join('');

  const artifacts = Object.entries(result.artifacts || {})
    .map(([key, value]) => `${key}: ${value}`)
    .join('\n');
  selectors.workflowArtifacts.textContent = artifacts || 'Sin datos';
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

async function refresh() {
  if (!bridgeReady) {
    setConnectionFeedback('error', 'Esta compilacion de Agora Desktop no incluye el puente IPC necesario para modo cloud. Regenera o reinstala la app.');
    return;
  }

  try {
    const status = await api.getStatus();
    renderStatus(status);
    if (status.mode === 'cloud' && (
      status.services.api.status !== 'running'
      || status.services.monitor.status !== 'running'
    )) {
      renderMonitorOverview(null);
      return;
    }
    try {
      renderMonitorOverview(await api.getMonitorOverview());
    } catch (error) {
      appendLog({
        message: `Monitor integrado: ${error.message}`,
        at: new Date().toISOString(),
      });
      renderMonitorOverview(null);
    }
  } catch (error) {
    appendLog({
      message: error.message,
      at: new Date().toISOString(),
    });
  }
}

async function saveConfig() {
  if (!bridgeReady) {
    setConnectionFeedback('error', 'Esta compilacion de Agora Desktop no incluye soporte de configuracion cloud. Regenera o reinstala la app.');
    return;
  }

  const payload = {
    mode: selectors.modeInput?.value === 'cloud' ? 'cloud' : 'local',
    remote: {
      baseUrl: selectors.remoteBaseUrlInput?.value.trim() || '',
      apiUsername: selectors.remoteApiUsernameInput?.value.trim() || '',
      apiPassword: selectors.remoteApiPasswordInput?.value || '',
      sshTarget: selectors.remoteSshTargetInput?.value.trim() || '',
      sshKeyPath: selectors.remoteSshKeyPathInput?.value.trim() || '',
      appContainer: selectors.remoteAppContainerInput?.value.trim() || '',
      dbContainer: selectors.remoteDbContainerInput?.value.trim() || '',
    },
  };

  setConnectionFeedback(null, 'Guardando configuracion...');
  try {
    const response = await api.saveConfig(payload);
    renderConfig(response);
    appendLog({
      message: `Configuracion guardada en modo ${response.mode}.`,
      at: new Date().toISOString(),
    });
    await refresh();

    const status = state.status;
    if (response.mode === 'cloud') {
      if (!response.remote?.baseUrl) {
        setConnectionFeedback('error', 'Configuracion guardada, pero falta la URL base cloud.');
        return;
      }

      if (status?.services.api?.label === 'Credenciales invalidas') {
        setConnectionFeedback('error', 'Configuracion guardada, pero la API cloud ha rechazado las credenciales.');
        return;
      }

      if (status?.services.backend?.status !== 'running') {
        setConnectionFeedback('error', 'Configuracion guardada, pero la URL cloud no responde correctamente.');
        return;
      }

      if (status?.services.api?.status === 'running' && status?.services.monitor?.status !== 'running') {
        setConnectionFeedback('error', 'Configuracion guardada, pero este usuario no puede acceder al monitor. Usa admin/admin123 o un usuario con ROLE_MONITOR.');
        return;
      }

      setConnectionFeedback('success', `Configuracion cloud guardada y portal accesible en ${response.remote.baseUrl}.`);
      return;
    }

    setConnectionFeedback('success', 'Configuracion local guardada.');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo guardar la configuracion.';
    setConnectionFeedback('error', message);
    throw error;
  }
}

async function runAction(action) {
  const actions = {
    refresh,
    saveConfig,
    prepare: () => api.prepare({ skipInstall: false }),
    startLocal: () => api.startLocal(),
    stopLocal: () => api.stopLocal(),
    restartRemoteApp: () => api.restartRemoteApp(),
    restartRemoteDb: () => api.restartRemoteDb(),
    rebuild: () => api.rebuild(),
    startPublic: () => api.startPublic(),
    stopPublic: () => api.stopPublic(),
    requestMfa: () => api.requestMfa(),
    verifyMfa: () => api.verifyMfa(selectors.mfaCodeInput.value),
    runWorkflowSmoke: () => api.runWorkflowSmoke(),
    backupDatabase: () => api.backupDatabase(),
    restoreDatabase: () => api.restoreDatabase(),
    diagnoseDependencies: () => api.diagnoseDependencies(),
    clearLogs: async () => {
      state.logs = [];
      selectors.logList.innerHTML = '';
    },
  };

  if (!actions[action]) {
    return;
  }

  try {
    const result = await actions[action]();
    if (action === 'runWorkflowSmoke') {
      renderWorkflowResult(result?.result || {
        ok: false,
        startedAt: new Date().toISOString(),
        finishedAt: new Date().toISOString(),
        steps: [],
        artifacts: {},
      });
    }
    if (action === 'backupDatabase' || action === 'restoreDatabase') {
      renderBackupResult(result);
    }
    if (action === 'diagnoseDependencies') {
      renderDependencyDiagnostics(result);
    }
    if (result?.status) {
      renderStatus(result.status);
      if (action === 'verifyMfa') {
        selectors.mfaCodeInput.value = '';
        syncButtons();
      }
    } else if (action !== 'clearLogs') {
      await refresh();
    }
  } catch (error) {
    appendLog({
      message: error.message,
      at: new Date().toISOString(),
    });
  }
}

async function runTestSuite(suite) {
  selectors.testResult.textContent = `Ejecutando ${suite}...`;
  const result = await api.runTestSuite(suite);
  renderTestResult(result);
  if (result?.status) {
    renderStatus(result.status);
  }
}

document.addEventListener('click', async (event) => {
  const actionButton = event.target.closest('button[data-action]');
  if (actionButton) {
    await runAction(actionButton.dataset.action);
    return;
  }

  const openButton = event.target.closest('button[data-open]');
  if (openButton) {
    try {
      await api.open(openButton.dataset.open, openButton.dataset.mode || 'window');
    } catch (error) {
      appendLog({
        message: error.message,
        at: new Date().toISOString(),
      });
    }
    return;
  }

  const testButton = event.target.closest('button[data-test-suite]');
  if (testButton) {
    await runTestSuite(testButton.dataset.testSuite);
    return;
  }

  const logButton = event.target.closest('button[data-log-target]');
  if (logButton) {
    try {
      await api.openLogTarget(logButton.dataset.logTarget);
    } catch (error) {
      appendLog({
        message: error.message,
        at: new Date().toISOString(),
      });
    }
    return;
  }

  const navButton = event.target.closest('button[data-scroll-target]');
  if (navButton) {
    document.querySelectorAll('.nav-item').forEach((button) => button.classList.remove('is-active'));
    navButton.classList.add('is-active');
    document.querySelector(`#${navButton.dataset.scrollTarget}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
});

selectors.mfaCodeInput?.addEventListener('input', syncButtons);

if (bridgeReady) {
  api.onStatus(renderStatus);
  api.onTask(renderTask);
  api.onLog(appendLog);
  api.onWorkflow(renderWorkflowResult);

  api.getConfig()
    .then(renderConfig)
    .catch((error) => {
      appendLog({
        message: `No se pudo cargar la configuracion del escritorio: ${error.message}`,
        at: new Date().toISOString(),
      });
    })
    .finally(() => {
      refresh();
    });

  setInterval(refresh, 5000);
} else {
  setConnectionFeedback('error', 'Esta instancia de Agora Desktop esta desactualizada y no expone las APIs de modo cloud.');
}
