# PO-11 — Cierre de auditoría de operaciones críticas

## Estado de esta entrega

Cierre técnico propuesto sobre la rama `feat/po-11-cierre-auditoria-integral`. Los cambios de código y las pruebas nuevas están preparados; la validación ejecutada en el entorno local del equipo debe quedar registrada antes de fusionar.

## Criterios cubiertos

- Los cambios de negocio que ya usan `writeAudit` registran el evento dentro de la misma transacción que la operación.
- Cada evento exige actor (usuario o `null` para sistema/solicitante anónimo), acción, tipo e identificador de entidad y descripción.
- Los metadatos, cuando existen, deben ser un objeto estructurado.
- Los registros `AuditLog`, `LoanDecision`, `Payment` y `ApplicationApplicantSnapshot` son append-only a través del cliente Prisma compartido.
- La consulta administrativa devuelve actor, acción, entidad, descripción y fecha, sin exponer metadatos internos.
- El comité supervisor continúa limitado a reportes agregados; no obtiene acceso a la auditoría detallada.
- El historial de una solicitud devuelve una proyección mínima con actor y fecha, no los metadatos internos.
- Los eventos de actualización de solicitantes registran nombres de campos modificados, no valores personales o financieros.
- Cada alerta automática de mora queda individualmente trazada, además del resumen del ciclo de monitoreo.

## Cambios de implementación

### Servicio central de auditoría

`backend/src/services/audit.service.js` valida el destino Prisma, el actor, los campos obligatorios y el tipo de metadatos antes de insertar. Un evento inválido falla explícitamente y no se omite silenciosamente.

### Atomicidad de creación de usuarios

La creación de usuario, su evento `USER_CREATED` y la reasignación de solicitudes pendientes (cuando se crea un oficial activo) ahora ocurren dentro de una única transacción. Si la auditoría o la asignación falla, la creación también se revierte.

El evento de inicio de sesión exitoso mantiene actor y entidad, pero ya no incluye el correo del usuario en la descripción.

### Minimización de datos

- `APPLICANT_UPDATED` conserva `changedFields` y `changeCount`, no los valores anteriores/nuevos.
- `GET /api/applications/:id/history` selecciona campos explícitos y omite `metadata`.
- La consulta administrativa de `GET /api/audit` mantiene su proyección sin metadatos.
- La ordenación de auditoría usa fecha descendente e identificador descendente como desempate estable.

### Alertas automáticas

Cada alerta creada por el monitor de mora genera `ARREARS_ALERT_CREATED`, vinculado al identificador de la alerta y con referencias a préstamo, cuota, tipo, fecha de referencia y umbral. La escritura del evento comparte la transacción del monitor. Las ejecuciones idempotentes que encuentran una alerta existente no duplican el evento.

### Inmutabilidad

`backend/src/domain/immutability.js` bloquea `update`, `updateMany`, `updateManyAndReturn`, `upsert`, `delete` y `deleteMany` sobre los modelos históricos protegidos. La creación de nuevos registros permanece permitida.

## Catálogo de operaciones críticas

| Operación | Evento(s) |
|---|---|
| Presentación pública de solicitud y emisión de credencial | `APPLICATION_SUBMITTED`, `APPLICATION_TRACKING_CREDENTIAL_ISSUED` |
| Asignación automática | `APPLICATION_AUTO_ASSIGNED` |
| Verificación de residencia y evaluación de riesgo | `RESIDENCE_VERIFIED`, `RISK_EVALUATED` |
| Cambio de estado y decisión humana | `APPLICATION_STATUS_CHANGED` |
| Reconsideración | `APPLICATION_RECONSIDERATION_SUBMITTED`, `APPLICATION_RECONSIDERATION_DECIDED` |
| Creación de política de crédito | `POLICY_CREATED` |
| Usuario interno y autenticación exitosa | `USER_CREATED`, `USER_LOGIN` |
| Formalización y desembolso | `LOAN_FORMALIZED`, `LOAN_DISBURSED` |
| Pago confirmado | `PAYMENT_REGISTERED` |
| Actualización y monitoreo de mora | `ARREARS_REFRESHED`, `ARREARS_MONITORED` |
| Creación y atención de alertas | `ARREARS_ALERT_CREATED`, `ARREARS_ALERT_READ` |
| Gestión de cobro y castigo | `COLLECTION_ACTION_REGISTERED`, `LOAN_WRITTEN_OFF` |
| Política y ciclo de reestructuración | `RESTRUCTURING_POLICY_CREATED`, `LOAN_RESTRUCTURING_REQUESTED`, `RESTRUCTURING_ESCALATED`, `LOAN_RESTRUCTURING_APPROVED`, `LOAN_RESTRUCTURING_REJECTED`, `RESTRUCTURING_REVIEW_REQUIRED`, `LOAN_RESTRUCTURED` |
| Actualización de perfil de solicitante | `APPLICANT_UPDATED` |

Los eventos automáticos y las acciones de solicitantes sin sesión usan `actorId: null` y se muestran como `Sistema` en la consulta. Los eventos realizados por personal interno guardan su identificador; la consulta resuelve el nombre actual del usuario.

## Acceso y confidencialidad

- `GET /api/audit` exige autenticación y `readAuditEvents`, reservado al área administrativa.
- El comité consulta agregados autorizados mediante `GET /api/reports`; no consulta la bitácora detallada.
- Los oficiales consultan el historial de sus propios expedientes asignados con una proyección limitada.
- No se incluyen contraseñas, hashes de credenciales, tokens privados ni valores personales modificados en los eventos nuevos de actualización de solicitantes.

## Pruebas añadidas o ampliadas

- `test/audit.service.test.js`: contrato mínimo, actor de sistema, metadatos estructurados y rechazo de eventos inválidos.
- `test/immutability.test.js`: operaciones de modificación/borrado para todos los modelos append-only y permiso de creación.
- `test/auditQuery.service.test.js`: ordenación determinista, resolución de actor y ausencia de metadatos.
- `test/arrearsMonitoring.test.js`: evento individual por alerta y ausencia de duplicados al repetir el monitor.

## Validación local requerida

Desde `backend`:

```bash
node --test test/audit.service.test.js test/auditQuery.service.test.js test/immutability.test.js test/arrearsMonitoring.test.js test/applicationStatus.test.js test/reconsideration.test.js test/loan.service.test.js test/restructuring.domain.test.js test/restructuring.permissions.test.js test/report.service.test.js
npx prisma validate
npx prisma generate
```

Desde `frontend`:

```bash
npm run build
```

Esta validación dirigida no incluye la prueba de integración global de PO-12. No se modificó el esquema Prisma y no se requiere migración.

## Límites operativos que permanecen explícitos

1. La protección append-only se aplica a las operaciones de modelo realizadas mediante el cliente Prisma compartido. Las operaciones MongoDB raw, herramientas administrativas o acceso directo a la base de datos pueden eludir una extensión de cliente. El código de ejecución normal no debe usarlas para modificar colecciones protegidas.
2. Para una garantía fuerte en producción, el despliegue debe separar privilegios operativos y administrativos de base de datos y restringir las modificaciones directas de `AuditLog`, `LoanDecision` y `Payment`. Esta entrega no configura permisos del clúster MongoDB.
3. No se implementa una cadena criptográfica de eventos ni almacenamiento externo WORM; no son requisitos confirmados del Product Owner.
4. No se define un período de retención o eliminación legal de auditoría, porque la institución no lo especificó. Los eventos permanecen sin endpoints de edición o borrado.
5. Los eventos de intentos de autenticación fallidos no se atribuyen a un usuario existente; los controles de frecuencia de inicio de sesión siguen siendo el mecanismo actual contra intentos repetidos.

## Resultado

PO-11 queda implementada en código con trazabilidad transaccional, minimización de datos, consulta por permisos e inmutabilidad a nivel de Prisma. El cierre definitivo requiere que el equipo ejecute los comandos anteriores y revise los resultados antes de fusionar el PR.
