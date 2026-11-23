# Implementación de seguridad PO-02 — protección del perfil del solicitante

**Rama:** `fix/po-02-proteger-perfil-solicitante`  
**Base:** `main`  
**Alcance de esta entrega:** evitar la modificación no autenticada del perfil global durante la presentación de una nueva solicitud.

## Regla funcional aplicada

El Product Owner establece que el solicitante no puede modificar los datos originales después de presentar una solicitud. Puede presentar información complementaria, pero esta no debe sobrescribir el expediente original.

## Cambio implementado

- `POST /api/applications` sigue siendo público para permitir la presentación de solicitudes sin cuenta.
- Si el documento no existe, se crea el perfil del solicitante.
- Si el documento ya existe, se reutiliza el registro sin ejecutar ninguna actualización.
- Los datos enviados para la nueva solicitud se guardan en `ApplicationApplicantSnapshot`, vinculados al expediente nuevo.
- De esta manera se conserva el historial declarado por cada solicitud y se evita que conocer el documento de otra persona permita modificar su perfil global.

## Pruebas añadidas

- Reutilización del perfil existente sin modificar nombre, apellidos ni información financiera (prueba unitaria).
- Creación de un perfil cuando el documento todavía no existe (prueba unitaria).
- Segunda solicitud HTTP con el mismo documento: el perfil global permanece intacto y el snapshot conserva los datos declarados para el segundo expediente (prueba de integración).

Archivo de pruebas: `backend/test/applicantSubmission.test.js`.

## Pendiente para completar PO-02

- [x] Añadir limitación de peticiones por IP al formulario público, inicio de sesión, seguimiento y envío de reconsideraciones (ventanas y máximos configurables por variables de entorno).
- Ejecutar la prueba de integración HTTP añadida para demostrar que una segunda solicitud con el mismo documento no altera el perfil anterior y conserva su propio snapshot.
- Verificar el aislamiento de consultas de seguimiento y el manejo de tokens revocados.
- Definir y probar un flujo seguro para correcciones o información complementaria sin modificar los datos originales.
- Ejecutar las pruebas contra una base de integración cuyo nombre termine en `_test`.

## Limitación de intentos públicos

Se incorporó `backend/src/middleware/rateLimit.js` con ventanas fijas por dirección IP y respuestas HTTP 429 con cabeceras `RateLimit-*` y `Retry-After`.

Valores iniciales:
- Inicio de sesión: 10 intentos cada 15 minutos.
- Seguimiento: 20 consultas cada 15 minutos.
- Presentación de solicitudes: 5 envíos por hora.
- Reconsideraciones: 3 envíos por hora.

Los límites se pueden ajustar con `LOGIN_RATE_LIMIT_MAX`, `LOGIN_RATE_LIMIT_WINDOW_MS`, `TRACKING_RATE_LIMIT_MAX`, `TRACKING_RATE_LIMIT_WINDOW_MS`, `SUBMISSION_RATE_LIMIT_MAX`, `SUBMISSION_RATE_LIMIT_WINDOW_MS`, `RECONSIDERATION_RATE_LIMIT_MAX` y `RECONSIDERATION_RATE_LIMIT_WINDOW_MS`.

**Limitación operativa:** el almacenamiento actual es en memoria por instancia. En un despliegue con varias instancias o reinicios frecuentes se debe configurar un almacén compartido (por ejemplo Redis) antes de producción. La IP se obtiene de `req.ip`; solo se debe configurar `trust proxy` cuando la aplicación esté detrás de proxies conocidos y confiables.

## Seguridad y alcance

No se modifica el endpoint autenticado `PATCH /api/applicants/:id`; permanece deshabilitado para todos los roles mientras no exista una regla aprobada para corregir perfiles. Tampoco se cambia la matriz de permisos ni se habilita acceso adicional a datos personales.
