# Seguridad y permisos

## 1. Principios

- La autenticación no concede automáticamente acceso a todos los datos.
- Cada operación interna requiere permiso explícito y, cuando aplica, alcance sobre el expediente asignado.
- Los actores funcionales del negocio se mantienen separados de los roles técnicos.
- Los datos financieros y credenciales de seguimiento son confidenciales.
- Las decisiones, pagos confirmados y snapshots históricos deben conservarse.
- El comité supervisor trabaja con información agregada y no con la gestión rutinaria de expedientes.

## 2. Actores y roles técnicos

Actores funcionales definidos por el dominio:

- Solicitante.
- Oficial de crédito.
- Analista de riesgo.
- Área administrativa.
- Comité supervisor.

Roles técnicos definidos en `backend/src/domain/roles.js`:

| Rol técnico | Función |
|---|---|
| `ADMIN` | Rol técnico de bootstrap y gestión de usuarios; no hereda automáticamente permisos de negocio |
| `CREDIT_OFFICER` | Operación de solicitudes asignadas, evaluación y decisiones |
| `analista_riesgo` | Gestión de políticas |
| `administrativo` | Operación de préstamos, pagos, mora, auditoría detallada y aceptación de reestructuraciones |
| `comite_supervisor` | Reportes agregados y decisiones sobre reestructuraciones escaladas |
| `AUDITOR` | Compatibilidad con cuentas antiguas; sin permisos operativos |

El solicitante usa flujos públicos y no requiere cuenta interna obligatoria.

## 3. Permisos del backend

La matriz vigente se define en `PERMISSIONS`:

| Permiso | Roles habilitados |
|---|---|
| `manageUsers` | ADMIN |
| `readApplicants` | CREDIT_OFFICER |
| `editApplicants` | Ninguno |
| `readApplications` | CREDIT_OFFICER |
| `changeApplicationStatus` | CREDIT_OFFICER |
| `evaluateApplications` | CREDIT_OFFICER |
| `managePolicies` | analista_riesgo |
| `readPolicies` | analista_riesgo, CREDIT_OFFICER, administrativo |
| `readLoans` | administrativo, CREDIT_OFFICER |
| `readArrears` | administrativo |
| `manageLoans` | administrativo |
| `registerPayments` | administrativo |
| `writeOffLoans` | Ninguno |
| `readPortfolioReports` | administrativo, comite_supervisor |
| `readAuditEvents` | administrativo |
| `readRestructurings` | administrativo, CREDIT_OFFICER, comite_supervisor |
| `createRestructurings` | administrativo, CREDIT_OFFICER |
| `decideRestructurings` | CREDIT_OFFICER, comite_supervisor |
| `acceptRestructurings` | administrativo |

Además del permiso, los servicios restringen los expedientes al oficial asignado cuando corresponde.

## 4. Controles implementados

- JWT para endpoints internos y endpoint `/api/auth/me`.
- Hash de contraseñas con bcryptjs.
- Rate limiting en inicio de sesión, envío/seguimiento de solicitudes y reconsideraciones.
- Helmet y CORS con orígenes permitidos.
- Credencial de seguimiento almacenada como hash, independiente del número de caso.
- Snapshot de los datos presentados al registrar solicitud.
- Proyecciones limitadas en consultas de historial y auditoría.
- Eventos de auditoría para operaciones críticas.
- Inmutabilidad a nivel del cliente Prisma para `AuditLog`, `LoanDecision`, `Payment` y `ApplicationApplicantSnapshot`.

## 5. Restricciones del comité supervisor

El comité puede consultar reportes agregados y decidir propuestas de reestructuración escaladas. No puede:
- Consultar o gestionar rutinariamente expedientes individuales.
- Configurar políticas.
- Registrar pagos.
- Consultar auditoría detallada.
- Administrar préstamos o registrar gestiones de cobro.

## 6. Límites y riesgos residuales

1. La extensión de inmutabilidad Prisma puede eludirse con acceso raw o directo a MongoDB. La base de datos requiere controles de privilegios propios para una garantía fuerte.
2. No se configura en este repositorio un sistema de secretos, rotación de claves o gestión de credenciales de infraestructura.
3. La protección append-only no equivale a WORM ni a una cadena criptográfica.
4. La retención y eliminación legal de auditoría no está definida.
5. En despliegues con varias instancias, el monitor de mora puede duplicarse si no se ejecuta un único worker o una exclusión distribuida.
6. Los datos personales y financieros reales no deben utilizarse en pruebas o capturas de documentación sin anonimización y autorización.
7. La API de usuarios debe revisarse en el contexto del router y middleware completo antes de publicar el servicio.

## 7. Recomendaciones operativas

- Mantener `.env` fuera del control de versiones.
- Usar cuentas MongoDB con privilegios mínimos.
- Separar bases de desarrollo, pruebas y producción.
- Restringir red y acceso administrativo a MongoDB.
- Ejecutar integración únicamente contra una base cuyo nombre termine en `_test`.
- No registrar tokens privados, contraseñas ni información financiera en logs.
- Revisar dependencias, configuración TLS, respaldos y monitoreo antes de cualquier despliegue real.
