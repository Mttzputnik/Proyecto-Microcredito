# API REST

## Convenciones

- Base local habitual: `http://localhost:3001`.
- Prefijo: `/api`.
- Formato de intercambio: JSON.
- Los endpoints protegidos usan `Authorization: Bearer <JWT>`.
- Los permisos se verifican en el backend; ocultar una opción en frontend no sustituye autorización.
- La lista se deriva de los routers montados en `backend/src/app.js`. Los parámetros de consulta y los esquemas completos de cada payload deben consultarse en los validadores y servicios correspondientes.

## Salud y autenticación

| Método | Ruta | Acceso | Propósito |
|---|---|---|---|
| GET | `/api/health` | Público | Estado básico del servidor |
| POST | `/api/auth/login` | Público + rate limit | Inicio de sesión |
| GET | `/api/auth/me` | JWT | Usuario autenticado |

## Solicitantes y solicitudes

| Método | Ruta | Acceso | Propósito |
|---|---|---|---|
| POST | `/api/applications` | Público + rate limit | Registrar solicitud y credencial de seguimiento |
| POST | `/api/applications/track` | Público + rate limit | Consultar seguimiento con credencial |
| GET | `/api/applicants` | `readApplicants` | Listar solicitantes permitidos |
| GET | `/api/applicants/:id` | `readApplicants` | Consultar solicitante dentro del alcance autorizado |
| PATCH | `/api/applicants/:id` | `editApplicants` | Ruta definida; el permiso actual no concede edición |
| GET | `/api/applications` | `readApplications` | Listar expedientes permitidos |
| GET | `/api/applications/:id` | `readApplications` | Detalle del expediente asignado |
| PATCH | `/api/applications/:id/status` | `changeApplicationStatus` | Cambio de estado/decisión justificada |
| PATCH | `/api/applications/:id/conditional-approval/verify` | `changeApplicationStatus` | Verificar condiciones |
| GET | `/api/applications/:id/history` | `readApplications` | Historial limitado del expediente |
| POST | `/api/applications/:id/evaluations` | `evaluateApplications` | Ejecutar evaluación |
| GET | `/api/applications/:id/evaluations` | `readApplications` | Consultar evaluaciones |
| POST | `/api/applications/:id/verifications/residence` | `evaluateApplications` | Registrar verificación de residencia |

## Reconsideraciones

| Método | Ruta | Acceso | Propósito |
|---|---|---|---|
| POST | `/api/reconsiderations` | Público + rate limit + credencial | Iniciar reconsideración |
| GET | `/api/reconsiderations/assigned` | `readApplications` | Consultar reconsideraciones asignadas |
| GET | `/api/reconsiderations/assigned/:id/documents/:documentId` | `readApplications` | Obtener documento autorizado |
| PATCH | `/api/reconsiderations/:id/decision` | `changeApplicationStatus` | Registrar resultado justificado |

## Políticas

| Método | Ruta | Acceso | Propósito |
|---|---|---|---|
| GET | `/api/policies` | `readPolicies` | Listar políticas |
| GET | `/api/policies/active` | `readPolicies` | Consultar política vigente |
| POST | `/api/policies` | `managePolicies` | Crear versión de política |
| GET | `/api/loans/restructuring-policies` | `readPolicies` | Consultar políticas de reestructuración |
| POST | `/api/loans/restructuring-policies` | `managePolicies` | Crear política de reestructuración |

## Préstamos, pagos, mora y reestructuración

| Método | Ruta | Acceso | Propósito |
|---|---|---|---|
| GET | `/api/loans` | `readLoans` | Listar préstamos |
| GET | `/api/loans/:id` | `readLoans` | Consultar préstamo y cronogramas |
| POST | `/api/loans` | `manageLoans` | Formalizar préstamo |
| POST | `/api/loans/:id/disburse` | `manageLoans` | Registrar desembolso y generar cronograma |
| POST | `/api/loans/:id/payments` | `registerPayments` | Registrar pago |
| POST | `/api/loans/:id/refresh-arrears` | `manageLoans` | Actualización manual de mora |
| GET | `/api/loans/arrears` | `readArrears` | Consultar cartera en mora |
| GET | `/api/loans/alerts` | `readArrears` | Consultar alertas |
| PATCH | `/api/loans/alerts/:id/read` | `manageLoans` | Marcar alerta como atendida/leída |
| POST | `/api/loans/:id/collection-actions` | `manageLoans` | Registrar gestión de cobro |
| POST | `/api/loans/:id/write-off` | `writeOffLoans` | Ruta existente; permiso sin roles autorizados |
| GET | `/api/loans/restructurings` | `readRestructurings` | Listar reestructuraciones |
| GET | `/api/loans/:id/restructurings` | `readRestructurings` | Historial de reestructuraciones del préstamo |
| POST | `/api/loans/:id/restructurings` | `createRestructurings` | Solicitar reestructuración |
| PATCH | `/api/loans/restructurings/:id/decision` | `decideRestructurings` | Aprobar/rechazar o escalar según política |
| POST | `/api/loans/restructurings/:id/accept` | `acceptRestructurings` | Registrar aceptación y activar cuando corresponda |

## Reportes, auditoría y usuarios

| Método | Ruta | Acceso | Propósito |
|---|---|---|---|
| GET | `/api/reports` | `readPortfolioReports` | Reportes administrativos y agregados |
| GET | `/api/audit` | `readAuditEvents` | Consulta detallada de auditoría |
| GET | `/api/users` | Router de usuarios | Listar usuarios |
| POST | `/api/users` | Router de usuarios | Crear usuario interno |

## Respuestas y errores

La aplicación responde con un objeto JSON que normalmente contiene `success`, `data` y/o `message`. Los errores de validación o negocio usan códigos HTTP 4xx; errores inesperados responden 500 con un mensaje genérico. El middleware global no debe filtrar detalles internos ni secretos.

## Notas

- La ruta de usuarios debe revisarse junto con el middleware del router; no se debe asumir un permiso solo por aparecer en esta tabla.
- El permiso de edición de solicitantes está vacío actualmente.
- El permiso de castigo de préstamos está vacío porque el PO no asignó esa operación a un actor.
- Para contratos exactos de request/response, revisar `backend/src/validators` y `backend/src/services`; esta referencia documenta rutas, no reemplaza un contrato OpenAPI.
