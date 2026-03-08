# Preguntas Probables de la Defensa

## 1. Por que elegiste Symfony y React?
Porque separan bien backend y frontend, tienen ecosistema maduro y permiten construir una API mantenible con una interfaz moderna y rapida para el usuario.

## 2. Por que has separado panel interno y portal externo?
Porque tienen usuarios, flujos y necesidades diferentes. Separarlos reduce complejidad, mejora la seguridad y hace mas clara la arquitectura.

## 3. Que problema real resuelve el proyecto?
Centraliza una gestion que antes estaba repartida entre correos, hojas de calculo y documentos, aportando trazabilidad y control del ciclo completo.

## 4. Cual es la funcionalidad mas diferencial?
El flujo completo de solicitud externa, verificacion, aprobacion interna y transformacion en empresa gestionable, junto con el workflow documental de convenios.

## 5. Por que usas SQLite en desarrollo?
Porque simplifica la puesta en marcha local y la demo. La arquitectura no queda atada a SQLite; Doctrine permite migrar a otros motores soportados.

## 6. Como has tratado la seguridad?
La API protege rutas internas con autenticacion y roles, y limita las rutas publicas al registro y verificacion de solicitudes. Como mejora futura queda sustituir Basic auth por un mecanismo mas robusto.

## 7. Que pruebas has realizado?
Pruebas backend automatizadas, builds de ambos frontends y verificacion funcional de los flujos principales durante la demo local.

## 8. Cual es la principal limitacion de la version actual?
La parte mas mejorable es la seguridad productiva y la automatizacion E2E. El proyecto esta bien para entorno academico y demostracion, pero no aun para explotacion real sin endurecimiento adicional.

## 9. Que aportacion personal destacarias?
El redisenio del alcance hacia un problema real del centro y la implementacion de una plataforma coherente de punta a punta: modelo, API, panel, portal y documentacion.

## 10. Que haria en una siguiente iteracion?
Refuerzo de autenticacion, politicas documentales, pruebas E2E, mejor refactor del frontend y salida PDF maquetada para informes y documentacion.
