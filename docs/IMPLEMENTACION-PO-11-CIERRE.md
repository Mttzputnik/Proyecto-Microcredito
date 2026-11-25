# PO-11 — Cierre de auditoría de operaciones críticas

## Estado

**Estado: implementado e integrado en main mediante PR #36.**

La implementación de PO-11 fue integrada en `main` mediante la PR #36. Este documento describe el alcance técnico integrado; no representa una nueva validación local ni reemplaza los resultados del informe general de pruebas.

## Criterios cubiertos

- Los cambios de negocio que utilizan `writeAudit` registran el evento dentro de la transacción de la operación cuando corresponde.
- Cada evento exige actor (usuario o `null` para sistema/solicitante anónimo), acción, tipo e identificador de entidad y descripción.
- Los metadatos, cuando existen, deben ser un objeto estructurado.
- Los registros `AuditLog`, `LoanDecision`, `Payment` y `ApplicationApplicantSnapshot` son append-only a través del cliente Prisma compartido.
- La consulta administrativa devuelve actor, acción, entidad, descripción y fecha, sin exponer metadatos internos.
- El comité supervisor consulta reportes agregados, no la bitácora detallada.
- El historial de una solicitud devuelve una proyección mínima con actor y fecha.
- Los eventos de actualización de solicitantes registran nombres de campos modificados, no valores personales o financieros.
- Cada alerta automática de mora queda individualmente trazada, además del resumen del ciclo de monitoreo.

## Cambios de implementación

### Servicio central de auditoría

`backend/src/services/audit.service.js` valida el destino Prisma, el actor, los campos obligatorios y el tipo de metadatos antes de insertar.

### Atomicidad y minimización

La creación de usuario, su evento `USER_CREATED` y la reasignación de solicitudes pendientes se coordinan transaccionalmente. Los eventos de actualización de solicitantes guardan `changedFields` y `changeCount`, no valores anteriores/nuevos. Las consultas históricas proyectan campos explícitos y omiten metadatos internos.

### Alertas e inmutabilidad

Cada alerta creada por el monitor genera `ARREARS_ALERT_CREATED`; las ejecuciones idempotentes no duplican el evento. `backend/src/domain/immutability.js` bloquea operaciones de modificación y borrado de los modelos históricos protegidos mediante el cliente Prisma compartido.

## Catálogo de operaciones

| Operación | Eventos |
|---|---|
| Presentación y credencial de seguimiento | `APPLICATION_SUBMITTED`, `APPLICATION_TRACKING_CREDENTIAL_ISSUED` |
| Asignación automática | `APPLICATION_AUTO_ASSIGNED` |
| Verificación y evaluación | `RESIDENCE_VERIFIED`, `RISK_EVALUATED` |
| Cambio de estado y decisión | `APPLICATION_STATUS_CHANGED` |
| Reconsideración | `APPLICATION_RECONSIDERATION_SUBMITTED`, `APPLICATION_RECONSIDERATION_DECIDED` |
| Políticas | `POLICY_CREATED`, `RESTRUCTURING_POLICY_CREATED` |
| Usuario y autenticación | `USER_CREATED`, `USER_LOGIN` |
| Formalización y desembolso | `LOAN_FORMALIZED`, `LOAN_DISBURSED` |
| Pagos | `PAYMENT_REGISTERED` |
| Mora y alertas | `ARREARS_REFRESHED`, `ARREARS_MONITORED`, `ARREARS_ALERT_CREATED`, `ARREARS_ALERT_READ` |
| Cobro y castigo | `COLLECTION_ACTION_REGISTERED`, `LOAN_WRITTEN_OFF` |
| Reestructuración | `LOAN_RESTRUCTURING_REQUESTED`, `RESTRUCTURING_ESCALATED`, `LOAN_RESTRUCTURING_APPROVED`, `LOAN_RESTRUCTURING_REJECTED`, `RESTRUCTURING_REVIEW_REQUIRED`, `LOAN_RESTRUCTURED` |
| Perfil del solicitante | `APPLICANT_UPDATED` |

## Acceso y confidencialidad

- `GET /api/audit` exige autenticación y permiso `readAuditEvents`, asignado al área administrativa.
- El comité consulta agregados autorizados mediante `GET /api/reports`.
- Los oficiales consultan historial limitado a expedientes asignados.
- Los eventos no deben contener contraseñas, hashes de credenciales, tokens privados ni valores personales modificados.

## Pruebas relacionadas

La implementación incorpora o amplía pruebas en:

- `test/audit.service.test.js`
- `test/immutability.test.js`
- `test/auditQuery.service.test.js`
- `test/arrearsMonitoring.test.js`

También existen pruebas de integración de historial y permisos en `test/integration.flow.test.js`. El estado de ejecución más reciente conocido debe consultarse en [INFORME-DE-PRUEBAS.md](INFORME-DE-PRUEBAS.md).

## Límites

1. La protección append-only aplica a operaciones de modelo realizadas mediante el cliente Prisma compartido. Operaciones raw, herramientas administrativas o acceso directo a MongoDB pueden eludirla.
2. Una garantía fuerte en producción requiere separar privilegios operativos y administrativos de base de datos.
3. No se implementa una cadena criptográfica ni almacenamiento WORM.
4. La retención legal de auditoría no está definida por la institución.
5. Los intentos de autenticación fallidos no se atribuyen a un usuario existente.

## Resultado

PO-11 está implementada e integrada en el repositorio. La ejecución reciente de la suite y sus resultados cuantitativos se documentan por separado; no se infieren a partir de la existencia de las pruebas.
