# Guion para la presentacion final

Duracion recomendada: 8-10 minutos, dejando 2-3 minutos para preguntas.

## 1. Portada
Presenta el proyecto como una plataforma para gestionar empresas colaboradoras, convenios y practicas de FP Dual. No empieces por tecnologia: empieza por el problema real.

## 2. Problema
Explica que antes habia informacion dispersa, poca trazabilidad y dependencia de correos/hojas de calculo. La idea clave es que el centro necesitaba una vista unica.

## 3. Objetivos
Resume cuatro objetivos: centralizar datos, abrir canal externo, dejar trazabilidad documental y construir algo defendible tecnicamente.

## 4. Arquitectura
Defiende la separacion: Symfony concentra negocio y seguridad; React se divide en panel interno y portal externo; documentacion y monitor no contaminan el flujo operativo.

## 5. Modelo y flujo
Insiste en el orden de negocio: empresa activa, convenio operativo, asignacion, seguimiento y evaluacion. Esto demuestra que no son CRUD aislados.

## 6. Panel interno
Muestra dashboard, KPI, modulos y exportacion CSV. Di que es la herramienta de trabajo diaria para coordinacion.

## 7. Flujo empresa-centro
Explica solicitudes, verificacion por correo, aprobacion interna y bandeja. Este punto conecta el centro con empresas reales.

## 8. Portal externo
Explica que la empresa puede registrarse, consultar estado, activar cuenta, recuperar contrasena y comunicarse sin acceder al panel interno.

## 9. Documentacion y monitor
Justifica madurez del proyecto: hay guia funcional, monitor privado, MFA y supervision de rutas/servicios.

## 10. Codigo: registro externo
Explica que el formulario publico no inserta datos sin control: el backend valida los campos, crea una solicitud y genera un token de verificacion por correo.

## 11. Codigo: reglas de asignacion
Usa esta diapositiva para defender que hay reglas de negocio reales en backend: una asignacion solo se permite si la empresa esta activa y el convenio esta en un estado operativo.

## 12. Codigo: cliente API
Explica que el frontend no hace llamadas sueltas: centraliza credenciales, sesion, errores y llamadas HTTP en un cliente API comun.

## 13. Codigo: pruebas E2E
Muestra que se prueba un flujo de usuario real: entrar al portal externo, rellenar el formulario y llegar al paso de correo.

## 14. Validacion
Da cifras exactas: 90 tests backend, 522 aserciones, 14 tests frontend, 3 E2E. Si preguntan por la deprecacion, di que es aviso de libreria, no fallo funcional.

## 15. Acceso de evaluacion
Aclara que la profesora no necesita instalar nada si tu equipo esta levantado: recibe URL temporal de cloudflared y entra a /app, /externo, /documentacion o /monitor.

## 16. Limitaciones
No las escondas: despliegue permanente, SSO, firma avanzada, nube documental y perfilado productivo quedan como lineas futuras.

## 17. Cierre
Cierra con una frase directa: el valor del TFG esta en convertir una necesidad real en una solucion completa, funcional, trazable y defendible.

## Orden rapido de demo
1. Abrir `http://127.0.0.1:8000/app`.
2. Login con `admin / admin123`.
3. Dashboard y exportacion CSV.
4. Solicitudes y bandeja.
5. Convenios/asignaciones.
6. Portal externo en `http://127.0.0.1:8000/externo`.
7. Documentacion y monitor si queda tiempo.
