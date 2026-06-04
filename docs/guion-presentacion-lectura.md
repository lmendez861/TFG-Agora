# Guion de lectura para la defensa

Duracion objetivo: 8-10 minutos. La idea es explicar con calma el problema, la solucion, la arquitectura, los flujos principales y cerrar con validacion y limitaciones. Este guion esta escrito en primera persona para poder leerlo casi literal.

## 1. Portada - 25 segundos

Buenos dias. Soy Luis Angel y voy a presentar mi Trabajo Final de Grado: Gestion de Empresas Colaboradoras para FP Dual.

El proyecto consiste en una plataforma web para centralizar la gestion de empresas, convenios, estudiantes, tutores, asignaciones, documentos y comunicacion entre el centro educativo y las empresas colaboradoras.

La idea principal es sustituir una gestion dispersa por una herramienta unica, trazable y preparada para poder usarse desde un despliegue cloud.

Tiempo acumulado: 0:25.

## 2. Problema - 35 segundos

El punto de partida era una gestion repartida entre hojas de calculo, correos, documentos y conocimiento manual de la persona responsable.

Esto genera varios problemas: cuesta saber el estado real de una empresa, de un convenio o de una asignacion; la informacion puede quedar duplicada o desactualizada; y la trazabilidad de mensajes, documentos y cambios no esta centralizada.

Por eso plantee como necesidad principal pasar a una plataforma unica, donde el centro pueda ver el flujo completo y donde las empresas tengan tambien un acceso externo controlado.

Tiempo acumulado: 1:00.

## 3. Objetivos - 40 segundos

Los objetivos se agrupan en cuatro bloques.

Primero, centralizar los datos principales: empresas, convenios, estudiantes, tutores y asignaciones.

Segundo, abrir un canal externo para empresas, con registro previo, verificacion por correo, seguimiento de estado y cuenta persistente.

Tercero, dar trazabilidad al flujo: mensajeria, documentos versionados, evidencias y evaluacion final.

Y cuarto, preparar una defensa tecnica completa: arquitectura separada, despliegue, pruebas, documentacion y una demo realista.

Tiempo acumulado: 1:40.

## 4. Arquitectura - 45 segundos

La arquitectura se organiza alrededor de una VM publica en Google Cloud.

El acceso externo entra por una URL publica con HTTPS. Caddy actua como proxy y enruta hacia la aplicacion. Dentro de la aplicacion, Symfony concentra la seguridad, las reglas de negocio y las APIs.

La base de datos es PostgreSQL y los documentos se guardan en un volumen persistente separado del contenedor, para que no se pierdan al reiniciar la aplicacion.

Ademas, Agora Desktop queda como consola tecnica: permite trabajar en modo local o conectarse al despliegue cloud para comprobar estado, logs, smoke tests y operaciones de soporte.

Tiempo acumulado: 2:25.

## 5. Modelo de datos - 45 segundos

El modelo sigue el flujo real de trabajo.

Primero existe una cuenta externa de empresa. Esa cuenta crea una solicitud de colaboracion. La solicitud almacena verificacion, estado, mensajes y datos iniciales.

Cuando el centro aprueba la solicitud, se crea la empresa colaboradora activa. A partir de ahi se pueden crear convenios asociados a esa empresa.

Sobre un convenio firmado o vigente se puede crear una asignacion de practicas, vinculando estudiante, empresa, convenio, tutor academico y tutor profesional.

Finalmente, la asignacion permite seguimiento y evaluacion final del estudiante.

Tiempo acumulado: 3:10.

## 6. Panel interno - 35 segundos

El panel interno es la herramienta diaria del centro.

Desde ahi se gestionan empresas, convenios, estudiantes, tutores, solicitudes, asignaciones, documentos y mensajes.

Tambien permite exportar datos en CSV y consultar fichas 360 de empresas y estudiantes.

Para la demo he dejado datos realistas: 10 empresas, 10 estudiantes, tutores academicos y profesionales, convenios y asignaciones preparadas.

Tiempo acumulado: 3:45.

## 7. Flujo empresa-centro - 40 segundos

El flujo empieza en el portal externo. La empresa se registra, crea su solicitud y verifica el correo.

El centro revisa esa solicitud desde el panel interno y puede aprobarla o rechazarla.

Si se aprueba, se crea la empresa colaboradora y queda disponible para convenios y asignaciones. Si se rechaza, el motivo queda visible para la empresa.

La mensajeria queda vinculada al mismo flujo, de forma que el centro y la empresa pueden mantener la conversacion sin perder contexto.

Tiempo acumulado: 4:25.

## 8. Portal externo - 35 segundos

El portal externo esta pensado para que la empresa no necesite acceso al panel interno.

La empresa puede crear su cuenta, completar los datos de solicitud, consultar el estado, acceder a su area privada, ver convenios, asignaciones, documentos y mensajes.

Para la demo he dejado creada una empresa llamada Luis S.L., registrada mediante este flujo externo. Sus credenciales de prueba son luis.demo@agora-tfg.local y Abrete01.

Tiempo acumulado: 5:00.

## 9. Desarrollo - 45 segundos

El desarrollo se ha dividido en bloques.

En backend uso Symfony con Doctrine, validaciones, controladores API, seguridad, correo, tokens, auditoria y persistencia.

En frontend hay dos aplicaciones React: el portal interno del centro y el portal externo de empresas.

Tambien hay una aplicacion de escritorio, Agora Desktop, para operaciones tecnicas.

El objetivo no era solo crear pantallas, sino cerrar el ciclo funcional: solicitud, aprobacion, convenio, asignacion, seguimiento, documentos y comunicacion.

Tiempo acumulado: 5:45.

## 10. Correo y rechazo - 35 segundos

El correo se gestiona con Brevo.

Se usa para verificar solicitudes de empresa, activar cuentas, recuperar contrasenas y comunicar operaciones importantes.

En el caso de rechazo, la empresa puede ver el estado y el motivo en el portal externo. Esto evita que el resultado quede solo en un correo o en una conversacion suelta.

Tiempo acumulado: 6:20.

## 11. Dominio externo - 35 segundos

Uno de los problemas del despliegue era evitar enlaces con 127.0.0.1 o con rutas locales.

Ahora la aplicacion genera enlaces usando la URL publica de la VM. Para esta defensa la URL activa es https://agora.34.175.161.212.nip.io.

La solucion actual usa nip.io porque permite resolver automaticamente el nombre a la IP publica. Como mejora futura, lo ideal seria sustituirlo por un dominio institucional propio.

Tiempo acumulado: 6:55.

## 12. Mensajeria - 35 segundos

La mensajeria permite comunicar centro y empresa dentro del mismo flujo.

El chat se actualiza automaticamente de forma periodica y tambien cuando la ventana recupera el foco, por lo que no es necesario recargar manualmente para ver nuevos mensajes.

Esto es importante porque convierte la solicitud y la colaboracion en un canal vivo, no solo en un formulario inicial.

Tiempo acumulado: 7:30.

## 13. Agora Desktop - 40 segundos

Agora Desktop es la consola tecnica del proyecto.

Su objetivo es separar la operacion tecnica del flujo funcional web. Desde la app de escritorio se puede trabajar en modo local o modo cloud.

En modo cloud permite ver estado, URL efectiva, logs, pruebas smoke y operaciones de soporte sobre la VM.

En modo local sirve como respaldo por si el despliegue cloud falla durante una demo.

Tiempo acumulado: 8:10.

## 14. Operacion y seguridad - 40 segundos

El despliegue cloud esta preparado para arrancar automaticamente.

La VM ejecuta un servicio systemd que lanza Docker Compose. Docker Compose levanta PostgreSQL, la aplicacion y el proxy Caddy.

Tambien se recalcula la URL nip.io cuando cambia la IP publica, para que Agora Desktop y el despliegue puedan trabajar con la URL correcta.

En seguridad hay roles definidos: administrador, coordinador, gestor documental, monitor tecnico y cuenta externa de empresa. En una mejora futura se podria afinar mas la matriz de permisos por rol.

Tiempo acumulado: 8:50.

## 15. Validacion - 35 segundos

Antes de la entrega he validado tanto backend como frontend y flujos completos.

Se han probado portales publicados, autenticacion, registro externo, verificacion, aprobacion, rechazo, chat, documentos, convenios y asignaciones.

Tambien he hecho una prueba de carga controlada con datos y documentos para comprobar que las APIs principales siguen respondiendo correctamente.

Tiempo acumulado: 9:25.

## 16. Acceso de evaluacion - 25 segundos

La profesora puede probar la aplicacion desde fuera con la VM levantada.

El panel interno esta en /app y el portal externo en /externo, ambos bajo la misma URL publica.

El usuario interno de prueba es profesora con la contrasena Abrete01.

Tiempo acumulado: 9:50.

## 17. Alcance y futuro - 35 segundos

Lo que queda cerrado es el nucleo funcional: portales interno y externo, correo, documentos, chat, exportacion, despliegue cloud y consola tecnica.

Como mejoras futuras quedan aspectos que amplian o endurecen el sistema: dominio propio, servicios gestionados para documentos y backups, observabilidad mas avanzada y evolucion de roles.

Esto no bloquea la defensa porque el flujo principal ya es funcional y demostrable.

Tiempo acumulado: 10:25.

## 18. Limitaciones - 30 segundos

Las limitaciones principales estan relacionadas con la infraestructura y con el alcance temporal.

La VM actual funciona para la defensa, pero en produccion seria mejor usar base de datos gestionada, almacenamiento documental externo, dominio propio, SSO institucional y firma electronica avanzada.

Tambien quedaria pendiente un perfilado mas profundo de rendimiento en produccion real.

Tiempo acumulado: 10:55.

## 19. Cierre - 25 segundos

Como cierre, el proyecto transforma una gestion dispersa en una plataforma funcional, trazable y documentada para empresas colaboradoras y practicas de FP Dual.

Incluye backend, dos portales web, consola de escritorio, despliegue cloud, correo, documentos, chat y demo preparada.

Con esto doy paso a la demostracion y a las preguntas.

Tiempo total estimado: 11:20.

## Version corta si necesito ajustarme a 8 minutos

Si voy justo de tiempo, reduzco las diapositivas 9, 13, 17 y 18 a una frase cada una:

- Desarrollo: "El proyecto se divide en Symfony, portal interno, portal externo y Agora Desktop."
- Agora Desktop: "La app de escritorio centraliza operaciones tecnicas locales y cloud."
- Futuro: "Las mejoras futuras endurecen infraestructura, dominio, backups y roles."
- Limitaciones: "Lo pendiente no bloquea el flujo principal, que ya esta operativo para la demo."
