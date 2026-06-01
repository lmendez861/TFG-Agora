# Guion para la presentacion final

Duracion recomendada: 8-10 minutos, dejando 2-3 minutos para preguntas.

## 1. Portada
Presenta el proyecto como una plataforma para gestionar empresas colaboradoras, convenios y practicas de FP Dual. No empieces por tecnologia: empieza por el problema real.

## 2. Problema
Explica que antes habia informacion dispersa, poca trazabilidad y dependencia de correos/hojas de calculo. La idea clave es que el centro necesitaba una vista unica.

## 3. Objetivos
Resume cuatro objetivos: centralizar datos, abrir canal externo, dejar trazabilidad documental y construir algo defendible tecnicamente.

## 4. Arquitectura
Defiende la separacion: Symfony concentra negocio y seguridad; React se divide en panel interno y portal externo; documentacion y Agora Desktop no contaminan el flujo operativo.

## 5. Modelo y flujo
Insiste en el orden de negocio: empresa activa, convenio operativo, asignacion, seguimiento y evaluacion. Esto demuestra que no son CRUD aislados.

## 6. Panel interno
Muestra dashboard, KPI, modulos y exportacion CSV. Di que es la herramienta de trabajo diaria para coordinacion.

## 7. Flujo empresa-centro
Explica solicitudes, verificacion por correo, aprobacion interna y bandeja. Este punto conecta el centro con empresas reales.

## 8. Portal externo
Explica que la empresa puede registrarse, consultar estado, activar cuenta, recuperar contrasena y comunicarse sin acceder al panel interno.

## 9. Como lo he desarrollado
Explica por fases: problema real, modelo de datos, backend, portal interno, portal externo y operacion final con escritorio, pruebas y empaquetado.

## 10. Gestor de correos
Aclara que el proveedor configurado es Brevo. Se usa para verificacion, activacion de cuenta, recuperacion de contrasena, MFA tecnico local y avisos de rechazo.

## 11. Dominio externo
Explica el problema que habia: una URL local en el correo no sirve fuera. Ahora los enlaces publicos salen con el origen correcto de la VM cloud y quedan bajo HTTPS.

## 12. Mensajeria
Senala que la bandeja y el chat ya se refrescan solos. Esto mejora la demo y evita dar una imagen de aplicacion estatica.

## 13. Agora Desktop
Muestra que ya no dependes de varios terminales: la app de escritorio centraliza modo local, modo cloud, logs, smoke, reinicios y backups.

## 14. Validacion
Da cifras exactas solo si las acabas de regenerar. Lo importante es remarcar que se han validado flujos criticos, despliegue cloud, correo, mensajeria y escritorio.

## 15. Acceso de evaluacion
Indica la URL cloud efectiva y el usuario de prueba `profesora / Abrete01`. Si hace falta, comenta que tambien existe `profesor / Abrete01`. Aclara que sirven para que la tutora o profesorado testeen desde fuera mientras la VM este activa y que, si la IP cambia, la referencia buena es la URL mostrada por Agora Desktop.

## 16. Alcance cerrado
Deja explicitamente que el nucleo ya esta terminado: portales `/app` y `/externo`, correo real, documentos, mensajeria, despliegue cloud por HTTPS y Agora Desktop como consola tecnica local/cloud.

## 17. Mejoras futuras
Explica que el siguiente paso ya no es "hacer que funcione", sino endurecer dominio, observabilidad, servicios gestionados y ampliar el cliente tecnico sin mezclarlo con negocio.

## 18. Limitaciones
No las escondas: SSO, firma avanzada, migracion documental a un servicio gestionado independiente, dominio propio y perfilado productivo quedan como lineas futuras. Aclara que el despliegue cloud funcional si esta hecho; lo que no esta cerrado es una infraestructura mas endurecida y gestionada.

## 19. Cierre
Cierra con una frase directa: el valor del TFG esta en convertir una necesidad real en una solucion completa, funcional, trazable y defendible.

## Orden rapido de demo
1. Abrir `URL/app/`.
2. Login con `profesora / Abrete01`.
3. Dashboard y exportacion CSV.
4. Solicitudes, bandeja y refresco de mensajes.
5. Convenios/asignaciones.
6. Portal externo en `URL/externo/`.
7. Agora Desktop en modo cloud si queda tiempo.
