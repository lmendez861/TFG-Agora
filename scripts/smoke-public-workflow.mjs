#!/usr/bin/env node

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

function parseArgs(argv) {
  const options = {};

  for (let index = 0; index < argv.length; index += 1) {
    const current = argv[index];
    if (!current.startsWith('--')) {
      continue;
    }

    const [rawKey, inlineValue] = current.slice(2).split('=', 2);
    if (inlineValue !== undefined) {
      options[rawKey] = inlineValue;
      continue;
    }

    const next = argv[index + 1];
    if (next && !next.startsWith('--')) {
      options[rawKey] = next;
      index += 1;
      continue;
    }

    options[rawKey] = 'true';
  }

  return options;
}

function createCookieJar() {
  let cookieHeader = '';

  return {
    apply(headers) {
      if (cookieHeader) {
        headers.cookie = cookieHeader;
      }
    },
    capture(response) {
      const getSetCookie = response.headers.getSetCookie?.bind(response.headers);
      const rawCookies = getSetCookie ? getSetCookie() : [];
      if (rawCookies.length === 0) {
        const singleHeader = response.headers.get('set-cookie');
        if (!singleHeader) {
          return;
        }
        cookieHeader = singleHeader.split(',').map((chunk) => chunk.split(';', 1)[0].trim()).join('; ');
        return;
      }

      cookieHeader = rawCookies
        .map((item) => item.split(';', 1)[0].trim())
        .filter(Boolean)
        .join('; ');
    },
  };
}

function buildBasicAuthHeader(username, password) {
  return `Basic ${Buffer.from(`${username}:${password}`, 'utf8').toString('base64')}`;
}

function normalizeBaseUrl(value) {
  return String(value || '').replace(/\/+$/, '');
}

function assertCondition(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function request(url, {
  method = 'GET',
  headers = {},
  body,
  cookieJar,
  redirect = 'follow',
} = {}) {
  const finalHeaders = { ...headers };
  if (cookieJar) {
    cookieJar.apply(finalHeaders);
  }

  let payload = body;
  if (body && typeof body === 'object' && !(body instanceof Uint8Array) && !(body instanceof ArrayBuffer)) {
    payload = JSON.stringify(body);
    if (!finalHeaders['Content-Type']) {
      finalHeaders['Content-Type'] = 'application/json';
    }
  }

  const response = await fetch(url, {
    method,
    headers: finalHeaders,
    body: payload,
    redirect,
  });

  if (cookieJar) {
    cookieJar.capture(response);
  }

  const contentType = response.headers.get('content-type') || '';
  const text = await response.text();
  let json = null;
  if (contentType.includes('application/json')) {
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = null;
    }
  }

  return {
    ok: response.ok,
    status: response.status,
    headers: response.headers,
    text,
    json,
    url: response.url,
  };
}

function ensureStatus(response, expectedStatus, label) {
  if (response.status !== expectedStatus) {
    const message = response.json?.message || response.text || 'Sin detalle';
    throw new Error(`${label}: esperado ${expectedStatus}, recibido ${response.status}. ${message}`);
  }

  return response;
}

async function sshExec(target, command) {
  const args = [
    '-i',
    `${process.env.USERPROFILE}\\.ssh\\id_rsa`,
    '-o',
    'StrictHostKeyChecking=no',
    target,
    command,
  ];

  const { stdout, stderr } = await execFileAsync('ssh', args, { windowsHide: true });
  if (stderr && stderr.trim() !== '') {
    return `${stdout}\n${stderr}`.trim();
  }

  return stdout.trim();
}

function isoDateOffset(days) {
  const value = new Date();
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

function generateDni(seed) {
  const digits = String(seed % 100000000).padStart(8, '0');
  const letters = 'TRWAGMYFPDXBNJZSQVHLCKE';
  const letter = letters[Number.parseInt(digits, 10) % 23];

  return `${digits}${letter}`;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const baseUrl = normalizeBaseUrl(options['base-url'] || process.env.BASE_URL || 'http://agora.34.175.224.87.nip.io');
  const adminUser = options['admin-user'] || process.env.ADMIN_USER || 'profesor';
  const adminPassword = options['admin-password'] || process.env.ADMIN_PASSWORD || 'Abrete01';
  const sshTarget = options['ssh-target'] || process.env.SSH_TARGET || 'lmendezgsd@34.175.224.87';
  const dbContainer = options['db-container'] || process.env.DB_CONTAINER || 'agora-db-1';
  const seed = Date.now();
  const suffix = seed.toString(36);
  const companyEmail = `agora.public.${suffix}@example.com`;
  const companyPassword = `AgoraPublic${String(seed).slice(-6)}Aa1`;
  const companyName = `Agora Public ${suffix}`;
  const tutorEmail = `tutor.academico.${suffix}@example.com`;
  const studentEmail = `alumno.public.${suffix}@example.com`;
  const adminAuthHeader = buildBasicAuthHeader(adminUser, adminPassword);
  const companyCookieJar = createCookieJar();
  const result = {
    ok: false,
    baseUrl,
    startedAt: new Date().toISOString(),
    finishedAt: null,
    steps: [],
    artifacts: {},
  };

  const runStep = async (id, label, handler) => {
    const step = { id, label, status: 'running', detail: 'En curso' };
    result.steps.push(step);
    try {
      const value = await handler();
      step.status = 'ok';
      step.detail = value?.detail || 'OK';
      if (value?.artifacts) {
        Object.assign(result.artifacts, value.artifacts);
      }
      return value?.value ?? value;
    } catch (error) {
      step.status = 'error';
      step.detail = error instanceof Error ? error.message : String(error);
      result.finishedAt = new Date().toISOString();
      console.error(JSON.stringify(result, null, 2));
      process.exitCode = 1;
      throw error;
    }
  };

  await runStep('app', 'Comprobar portal interno publicado', async () => {
    ensureStatus(await request(`${baseUrl}/app/`), 200, 'Portal interno');
    return { detail: '/app responde 200' };
  });

  await runStep('externo', 'Comprobar portal externo publicado', async () => {
    ensureStatus(await request(`${baseUrl}/externo/`), 200, 'Portal externo');
    return { detail: '/externo responde 200' };
  });

  await runStep('unauthorized-internal', 'Validar 401 en API interna sin credenciales', async () => {
    ensureStatus(await request(`${baseUrl}/api/me`, { redirect: 'manual' }), 401, 'API interna sin auth');
    return { detail: '/api/me devuelve 401 sin credenciales' };
  });

  await runStep('unauthorized-company', 'Validar 401 en portal empresa sin sesion', async () => {
    ensureStatus(await request(`${baseUrl}/portal-auth/me`, { redirect: 'manual' }), 401, 'Portal empresa sin sesion');
    ensureStatus(await request(`${baseUrl}/api/portal-company/overview`, { redirect: 'manual' }), 401, 'Overview empresa sin sesion');
    return { detail: 'Portal empresa protegido con 401' };
  });

  const tutorAcademico = await runStep('tutor-academico', 'Crear tutor academico remoto', async () => {
    const response = ensureStatus(await request(`${baseUrl}/api/tutores-academicos`, {
      method: 'POST',
      headers: {
        Authorization: adminAuthHeader,
      },
      body: {
        nombre: 'Laura',
        apellido: `Public ${suffix}`,
        email: tutorEmail,
        telefono: '610000111',
        departamento: 'Informatica',
        especialidad: 'Arquitectura de software',
        activo: true,
      },
    }), 201, 'Crear tutor academico');

    return {
      detail: `Tutor academico #${response.json.id}`,
      value: response.json,
      artifacts: {
        tutorAcademicoId: response.json.id,
      },
    };
  });

  const registration = await runStep('registro', 'Registrar solicitud desde el portal externo', async () => {
    const response = ensureStatus(await request(`${baseUrl}/registro-empresa`, {
      method: 'POST',
      body: {
        nombreEmpresa: companyName,
        cif: `PUB${String(seed).slice(-8)}`,
        sector: 'Servicios cloud',
        ciudad: 'Madrid',
        web: 'https://example.com',
        descripcion: 'Solicitud de validacion publica automatizada.',
        contactoNombre: 'Responsable Publico',
        contactoEmail: companyEmail,
        contactoTelefono: '600123123',
      },
    }), 201, 'Registro externo');

    const verificationUrl = response.json?.verificationUrl;
    const portalToken = response.json?.portalToken;
    assertCondition(typeof verificationUrl === 'string' && verificationUrl !== '', 'La respuesta de registro no incluye verificationUrl.');
    assertCondition(typeof portalToken === 'string' && portalToken !== '', 'La respuesta de registro no incluye portalToken.');

    const verificationHost = new URL(verificationUrl).host;
    const expectedHost = new URL(baseUrl).host;
    assertCondition(
      verificationHost === expectedHost,
      `El enlace de verificacion apunta a ${verificationHost} y se esperaba ${expectedHost}.`,
    );

    return {
      detail: `Solicitud #${response.json.id} registrada`,
      value: response.json,
      artifacts: {
        solicitudId: response.json.id,
        portalToken,
        verificationUrl,
        companyEmail,
        companyName,
      },
    };
  });

  await runStep('verificacion', 'Confirmar correo de empresa con la URL publica', async () => {
    ensureStatus(await request(registration.verificationUrl), 200, 'Confirmacion publica');
    return { detail: 'Correo corporativo verificado con URL publica' };
  });

  const approval = await runStep('aprobacion', 'Aprobar la solicitud desde la API interna', async () => {
    const response = ensureStatus(await request(`${baseUrl}/api/empresa-solicitudes/${registration.id}/aprobar`, {
      method: 'POST',
      headers: {
        Authorization: adminAuthHeader,
      },
    }), 201, 'Aprobacion interna');

    return {
      detail: `Empresa #${response.json.empresa.id} aprobada`,
      value: response.json,
      artifacts: {
        empresaId: response.json.empresa.id,
        portalAccountId: response.json.portalAccount.id,
      },
    };
  });

  const tutorProfesional = await runStep('tutor-profesional', 'Crear tutor profesional asociado a la empresa aprobada', async () => {
    const response = ensureStatus(await request(`${baseUrl}/api/tutores-profesionales`, {
      method: 'POST',
      headers: {
        Authorization: adminAuthHeader,
      },
      body: {
        empresaId: approval.empresa.id,
        nombre: `Tutor Public ${suffix}`,
        email: `tutor.prof.${suffix}@example.com`,
        telefono: '611000222',
        cargo: 'Responsable de practicas',
        certificaciones: 'ISO 27001',
        activo: true,
      },
    }), 201, 'Crear tutor profesional');

    return {
      detail: `Tutor profesional #${response.json.id}`,
      value: response.json,
      artifacts: {
        tutorProfesionalId: response.json.id,
      },
    };
  });

  const convenio = await runStep('convenio', 'Crear convenio remoto', async () => {
    const response = ensureStatus(await request(`${baseUrl}/api/convenios`, {
      method: 'POST',
      headers: {
        Authorization: adminAuthHeader,
      },
      body: {
        empresaId: approval.empresa.id,
        titulo: `Convenio publico ${suffix}`,
        descripcion: 'Convenio generado por smoke remoto.',
        tipo: 'FP Dual',
        estado: 'firmado',
        fechaInicio: isoDateOffset(1),
        fechaFin: isoDateOffset(180),
        observaciones: 'Validacion publica de despliegue.',
      },
    }), 201, 'Crear convenio');

    return {
      detail: `Convenio #${response.json.id}`,
      value: response.json,
      artifacts: {
        convenioId: response.json.id,
      },
    };
  });

  const estudiante = await runStep('estudiante', 'Crear estudiante remoto', async () => {
    const response = ensureStatus(await request(`${baseUrl}/api/estudiantes`, {
      method: 'POST',
      headers: {
        Authorization: adminAuthHeader,
      },
      body: {
        nombre: 'Alumno',
        apellido: `Public ${suffix}`,
        dni: generateDni(seed),
        email: studentEmail,
        telefono: '612000333',
        grado: 'Desarrollo de Aplicaciones Web',
        curso: '2',
        expediente: `PUB-${suffix}`,
        estado: 'disponible',
      },
    }), 201, 'Crear estudiante');

    return {
      detail: `Estudiante #${response.json.id}`,
      value: response.json,
      artifacts: {
        estudianteId: response.json.id,
      },
    };
  });

  const asignacion = await runStep('asignacion', 'Crear asignacion remota', async () => {
    const response = ensureStatus(await request(`${baseUrl}/api/asignaciones`, {
      method: 'POST',
      headers: {
        Authorization: adminAuthHeader,
      },
      body: {
        estudianteId: estudiante.id,
        empresaId: approval.empresa.id,
        convenioId: convenio.id,
        tutorAcademicoId: tutorAcademico.id,
        tutorProfesionalId: tutorProfesional.id,
        fechaInicio: isoDateOffset(7),
        fechaFin: isoDateOffset(120),
        modalidad: 'presencial',
        horasTotales: 400,
        estado: 'planificada',
      },
    }), 201, 'Crear asignacion');

    return {
      detail: `Asignacion #${response.json.id}`,
      value: response.json,
      artifacts: {
        asignacionId: response.json.id,
      },
    };
  });

  const activationToken = await runStep('token-activacion', 'Recuperar token de activacion desde la VM', async () => {
    const sql = `SELECT setup_token FROM empresa_portal_cuenta WHERE id = ${Number(approval.portalAccount.id)} LIMIT 1;`;
    const command = `docker exec ${dbContainer} sh -lc 'PGPASSWORD=\"$POSTGRES_PASSWORD\" psql -U \"$POSTGRES_USER\" -d \"$POSTGRES_DB\" -t -A -c \"${sql}\"'`;
    const token = (await sshExec(sshTarget, command)).trim();
    assertCondition(token !== '', 'No se ha encontrado token de activacion para la cuenta portal.');

    return { detail: 'Token de activacion obtenido', value: token };
  });

  await runStep('activar-cuenta', 'Activar la cuenta de empresa aprobada', async () => {
    ensureStatus(await request(`${baseUrl}/portal-auth/activate`, {
      method: 'POST',
      body: {
        token: activationToken,
        password: companyPassword,
      },
    }), 200, 'Activar cuenta empresa');

    return { detail: `Cuenta ${companyEmail} activada` };
  });

  await runStep('login-empresa', 'Entrar en el portal de empresa con sesion persistente', async () => {
    ensureStatus(await request(`${baseUrl}/portal-auth/login`, {
      method: 'POST',
      body: {
        email: companyEmail,
        password: companyPassword,
      },
      cookieJar: companyCookieJar,
    }), 204, 'Login empresa');

    const me = ensureStatus(await request(`${baseUrl}/portal-auth/me`, {
      cookieJar: companyCookieJar,
    }), 200, 'Sesion empresa');
    assertCondition(me.json?.email === companyEmail, 'La sesion del portal empresa no coincide con el email aprobado.');

    return { detail: `Sesion de empresa iniciada como ${companyEmail}` };
  });

  await runStep('overview-empresa', 'Comprobar convenios, asignaciones y cuenta en el portal empresa', async () => {
    const overview = ensureStatus(await request(`${baseUrl}/api/portal-company/overview`, {
      cookieJar: companyCookieJar,
    }), 200, 'Overview empresa');

    assertCondition(overview.json?.company?.id === approval.empresa.id, 'La empresa del overview no coincide con la aprobada.');
    assertCondition(
      Array.isArray(overview.json?.convenios) && overview.json.convenios.some((item) => item.id === convenio.id),
      'El convenio creado no aparece en el portal empresa.',
    );
    assertCondition(
      Array.isArray(overview.json?.asignaciones) && overview.json.asignaciones.some((item) => item.id === asignacion.id),
      'La asignacion creada no aparece en el portal empresa.',
    );

    return { detail: 'Overview empresa coherente con los datos creados' };
  });

  const companyMessage = await runStep('mensaje-empresa', 'Enviar mensaje desde el portal empresa', async () => {
    const response = ensureStatus(await request(`${baseUrl}/api/portal-company/messages`, {
      method: 'POST',
      cookieJar: companyCookieJar,
      body: {
        texto: `Mensaje empresa smoke ${suffix}`,
      },
    }), 201, 'Mensaje empresa');

    return {
      detail: `Mensaje empresa #${response.json.id}`,
      value: response.json,
      artifacts: {
        mensajeEmpresaId: response.json.id,
      },
    };
  });

  await runStep('bandeja-interna', 'Comprobar que la bandeja interna refleja la conversacion', async () => {
    const inbox = ensureStatus(await request(`${baseUrl}/api/empresa-solicitudes/bandeja`, {
      headers: {
        Authorization: adminAuthHeader,
      },
    }), 200, 'Bandeja interna');

    const thread = Array.isArray(inbox.json)
      ? inbox.json.find((item) => item.solicitud?.id === registration.id)
      : null;
    assertCondition(Boolean(thread), 'La solicitud aprobada no aparece en la bandeja interna.');
    assertCondition(thread.companyMessageCount >= 1, 'La bandeja interna no refleja mensajes de empresa.');

    return { detail: `Bandeja interna detecta ${thread.companyMessageCount} mensaje(s) de empresa` };
  });

  await runStep('mensaje-centro', 'Responder desde la API interna y verificar visibilidad externa', async () => {
    ensureStatus(await request(`${baseUrl}/api/empresa-solicitudes/${registration.id}/mensajes`, {
      method: 'POST',
      headers: {
        Authorization: adminAuthHeader,
      },
      body: {
        autor: 'centro',
        texto: `Respuesta centro smoke ${suffix}`,
      },
    }), 201, 'Respuesta centro');

    const messages = ensureStatus(await request(`${baseUrl}/portal/solicitudes/${registration.portalToken}/mensajes`), 200, 'Chat publico empresa');
    const textos = Array.isArray(messages.json) ? messages.json.map((item) => item.texto) : [];
    assertCondition(textos.includes(`Mensaje empresa smoke ${suffix}`), 'El mensaje de empresa no aparece en el canal publico.');
    assertCondition(textos.includes(`Respuesta centro smoke ${suffix}`), 'La respuesta del centro no aparece en el canal publico.');

    return { detail: 'Conversacion visible desde ambos lados' };
  });

  await runStep('colecciones-internas', 'Comprobar colecciones internas desde la URL publica', async () => {
    const [empresas, convenios, estudiantes, asignaciones] = await Promise.all([
      request(`${baseUrl}/api/empresas`, { headers: { Authorization: adminAuthHeader } }),
      request(`${baseUrl}/api/convenios`, { headers: { Authorization: adminAuthHeader } }),
      request(`${baseUrl}/api/estudiantes`, { headers: { Authorization: adminAuthHeader } }),
      request(`${baseUrl}/api/asignaciones`, { headers: { Authorization: adminAuthHeader } }),
    ]);

    ensureStatus(empresas, 200, 'Coleccion empresas');
    ensureStatus(convenios, 200, 'Coleccion convenios');
    ensureStatus(estudiantes, 200, 'Coleccion estudiantes');
    ensureStatus(asignaciones, 200, 'Coleccion asignaciones');

    assertCondition(Array.isArray(empresas.json) && empresas.json.some((item) => item.id === approval.empresa.id), 'La empresa aprobada no aparece en /api/empresas.');
    assertCondition(Array.isArray(convenios.json) && convenios.json.some((item) => item.id === convenio.id), 'El convenio creado no aparece en /api/convenios.');
    assertCondition(Array.isArray(estudiantes.json) && estudiantes.json.some((item) => item.id === estudiante.id), 'El estudiante creado no aparece en /api/estudiantes.');
    assertCondition(Array.isArray(asignaciones.json) && asignaciones.json.some((item) => item.id === asignacion.id), 'La asignacion creada no aparece en /api/asignaciones.');

    return { detail: 'Colecciones internas visibles desde el despliegue publico' };
  });

  result.ok = true;
  result.finishedAt = new Date().toISOString();
  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  if (process.exitCode !== 1) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
});
