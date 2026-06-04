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

## 9. Flujo funcional - 45 segundos

En esta parte no voy a entrar en detalle de codigo, sino en el recorrido funcional que queda cerrado.

Primero, la empresa entra por el portal externo, crea cuenta y envia una solicitud.

Segundo, el centro revisa esa solicitud desde el panel interno y puede aprobarla o rechazarla.

Tercero, si se aprueba, la empresa pasa al catalogo interno y ya puede tener convenios.

Cuarto, sobre el convenio se crea la asignacion, vinculando estudiante, empresa, convenio, tutor academico, tutor profesional, horas y fechas.

Y finalmente se completa el ciclo con mensajes, documentos, seguimientos y evaluacion final.

Tiempo acumulado: 5:45.

## 10. Correo y rechazo - 35 segundos

El correo se gestiona con Brevo.

Se usa para verificar solicitudes de empresa, activar cuentas, recuperar contrasenas y comunicar operaciones importantes.

En el caso de rechazo, la empresa puede ver el estado y el motivo en el portal externo. El backend tambien intenta enviar una notificacion por correo si Brevo esta disponible. Esto evita que el resultado quede solo en una conversacion suelta.

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

En seguridad ya hay roles aplicados en backend y visibles en el portal interno.

El usuario administrador tiene control completo y es el unico que puede eliminar datos de prueba desde el panel. Para evitar romper relaciones, el borrado esta limitado: primero se eliminan asignaciones; despues convenios que ya no tengan asignaciones; y finalmente empresas que no tengan convenios ni asignaciones.

El perfil profesor o coordinador mantiene la operativa diaria: puede crear, editar y consultar empresas, convenios, asignaciones, solicitudes y mensajes, pero no ve ni puede ejecutar botones de eliminacion.

Esto me permite defender una separacion real de permisos: el profesorado puede probar la aplicacion sin riesgo de borrar datos, mientras que el administrador puede limpiar datos para pruebas. No necesito explicar todos los roles tecnicos en la diapositiva. Como mejora futura, esta base se puede ampliar con perfiles de solo lectura, permisos por departamento, auditoria visible por rol y separacion por centro educativo.

Tiempo acumulado: 9:20.

## 15. Validacion - 35 segundos

Antes de la entrega he validado tanto backend como frontend y flujos completos.

Se han probado portales publicados, autenticacion, registro externo, verificacion, aprobacion, rechazo, chat, documentos, convenios y asignaciones.

Tambien he hecho una prueba de carga controlada con datos y documentos para comprobar que las APIs principales siguen respondiendo correctamente.

Tiempo acumulado: 9:55.

## 16. Acceso de evaluacion - 25 segundos

La aplicacion se puede probar desde fuera con la VM levantada.

El panel interno esta en /app y el portal externo en /externo, ambos bajo la misma URL publica.

Hay usuarios internos de prueba, como profesor o profesora, con la contrasena Abrete01. La cuenta admin queda para tareas de limpieza y administracion, no para la prueba normal.

Tiempo acumulado: 10:20.

## 17. Alcance y futuro - 35 segundos

Lo que queda cerrado es el nucleo funcional: portales interno y externo, correo, documentos, chat, exportacion, despliegue cloud y consola tecnica.

Como mejoras futuras quedan aspectos que amplian el alcance: subida documental mas robusta, almacenamiento gestionado fuera de la VM, roles avanzados, perfiles de solo lectura y soporte multi-centro.

El soporte multi-centro seria importante si la plataforma se quisiera usar en varios centros educativos, porque ahora mismo el proyecto trabaja sobre una base comun. En una evolucion real, cada centro tendria sus usuarios, empresas, convenios y asignaciones separados.

Esto no bloquea la defensa porque el flujo principal ya es funcional y demostrable.

Tiempo acumulado: 10:55.

## 18. Limitaciones - 30 segundos

Las limitaciones principales estan relacionadas con la infraestructura y con el alcance temporal.

La VM actual funciona para la defensa, pero en produccion seria mejor usar una infraestructura mas gestionada, almacenamiento documental externo, dominio propio, roles mas finos y separacion multi-centro.

SSO o firma electronica avanzada se podrian estudiar mas adelante, pero no las considero la prioridad principal frente a documentos, roles y multi-centro.

Tiempo acumulado: 11:25.

## 19. Cierre - 25 segundos

Como cierre, el proyecto transforma una gestion dispersa en una plataforma funcional, trazable y documentada para empresas colaboradoras y practicas de FP Dual.

Incluye backend, dos portales web, consola de escritorio, despliegue cloud, correo, documentos, chat y demo preparada.

Con esto doy paso a la demostracion y a las preguntas.

Tiempo total estimado: 11:50.

## Version corta si necesito ajustarme a 8 minutos

Si voy justo de tiempo, reduzco las diapositivas 9, 13, 17 y 18 a una frase cada una:

- Desarrollo: "El proyecto se divide en Symfony, portal interno, portal externo y Agora Desktop."
- Agora Desktop: "La app de escritorio centraliza operaciones tecnicas locales y cloud."
- Futuro: "Las mejoras futuras endurecen infraestructura, dominio, backups y roles."
- Limitaciones: "Lo pendiente no bloquea el flujo principal, que ya esta operativo para la demo."
