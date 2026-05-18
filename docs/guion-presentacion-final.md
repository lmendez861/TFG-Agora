# Guion para la presentacion final

Duracion recomendada: 8-10 minutos, dejando 2-3 minutos para preguntas.

## 1. Portada
Presenta el proyecto como una plataforma para gestionar empresas colaboradoras, convenios y practicas de FP Dual. Empieza por el problema real, no por la tecnologia.

## 2. Problema
Explica que antes habia informacion dispersa, poca trazabilidad y dependencia de correos, hojas de calculo y conocimiento manual. La idea clave es que el centro necesitaba una vista unica y operativa.

## 3. Objetivos
Resume cuatro objetivos:

1. centralizar datos y estados;
2. abrir un canal externo controlado con empresas;
3. dejar trazabilidad documental y operativa;
4. entregar algo defendible tecnicamente y accesible desde fuera.

## 4. Alcance cerrado
Aqui conviene ser muy claro: el nucleo entregado y cerrado es:

- portal interno;
- portal externo con preregistro, solicitud, verificacion y mensajeria;
- backend central con seguridad y persistencia;
- despliegue cloud en Google Cloud con HTTPS;
- consola de escritorio para operacion tecnica local o remota.

## 5. Arquitectura
Defiende la separacion:

- Symfony concentra negocio, seguridad y persistencia;
- React se divide en panel interno y portal externo;
- Docker Compose publica la solucion en cloud;
- Agora Desktop se reserva para supervision tecnica y soporte, no para duplicar el portal interno.

## 6. Modelo y flujo
Insiste en el orden de negocio:

1. la empresa crea cuenta;
2. envia solicitud;
3. verifica correo;
4. el centro revisa;
5. se activa la relacion academica;
6. despues llegan convenio, estudiante, asignacion, seguimiento y evaluacion.

Esto demuestra que no son CRUD aislados.

## 7. Panel interno
Muestra dashboard, KPI, modulos operativos, bandeja y exportacion CSV. Di que es la herramienta de trabajo diaria para coordinacion.

## 8. Flujo empresa-centro
Explica solicitudes, verificacion por correo, aprobacion interna y mensajeria. Este punto conecta el centro con empresas reales y es el eje funcional del proyecto.

## 9. Portal externo
Explica que la empresa puede:

- preregistrarse;
- iniciar sesion;
- rellenar su solicitud desde area privada;
- consultar estado;
- recuperar contrasena;
- comunicarse con el centro sin acceder al panel interno.

## 10. Despliegue cloud
Este es uno de los cierres importantes:

- VM Ubuntu en Google Cloud Compute Engine;
- Docker Compose;
- PostgreSQL;
- proxy HTTPS con certificados;
- URL publica accesible desde fuera.

Aqui debes remarcar que ya no dependes del portatil para la demo principal.

## 11. Correo y enlaces externos
Aclara que Brevo gestiona verificacion, reseteo de contrasena, MFA tecnico local y avisos de rechazo. Explica que los enlaces ya se generan con el origen publico correcto, no con `127.0.0.1`.

## 12. Mensajeria
Senala que el chat entre empresa y centro se refresca automaticamente por polling y queda ligado a la solicitud, no a una entidad suelta. Eso preserva el contexto antes y despues de la aprobacion.

## 13. Agora Desktop
Presentalo como consola tecnica:

- modo local para demo offline;
- modo cloud para revisar monitor, logs, reinicios, backups y smoke del despliegue.

Aclara que no intenta sustituir toda la operativa funcional del portal interno.

## 14. Validacion
Da cifras reales y recientes de las pruebas que quieras ensear. No infles cobertura. Lo importante es explicar que se han validado flujos criticos, despliegue cloud, correo, mensajeria y escritorio.

## 15. Acceso de evaluacion
Indica la URL publica:

- `https://agora.34.175.224.87.nip.io/app/`

Usuarios de prueba:

- `profesora / Abrete01`
- `profesor / Abrete01`

## 16. Mejoras futuras
No escondas el recorte de alcance. Explica que algunas lineas quedan como mejora futura porque no son nucleares para la entrega:

- absorber todo el monitor en la app de escritorio y retirar `/monitor` del uso diario;
- decidir si el escritorio debe incorporar tambien bandeja y chat;
- SSO institucional;
- almacenamiento documental gestionado;
- dominio institucional propio;
- mas observabilidad, pruebas de carga y alta disponibilidad.

## 17. Cierre
Cierra con una idea simple: el valor del proyecto no esta en abarcarlo todo, sino en haber cerrado bien el nucleo funcional y tecnico que hace util, demostrable y defendible la plataforma.

## Orden rapido de demo
1. Abrir `https://agora.34.175.224.87.nip.io/app/`.
2. Login con `profesora / Abrete01`.
3. Dashboard y exportacion CSV.
4. Solicitudes, bandeja y chat.
5. Convenios y asignaciones.
6. Portal externo en `https://agora.34.175.224.87.nip.io/externo/`.
7. Si queda tiempo, Agora Desktop en modo cloud.
