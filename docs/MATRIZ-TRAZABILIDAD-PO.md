# Matriz de trazabilidad de Product Owner

**Corte documental:** 25 de noviembre de 2026  
**Fuente funcional:** [RESPUESTAS-PRODUCT-OWNER.md](RESPUESTAS-PRODUCT-OWNER.md)  
**Estado técnico:** revisado contra la estructura de `main` y los documentos de implementación disponibles.

Esta matriz relaciona cada requisito con los componentes y pruebas existentes. “Implementado” significa que hay implementación en el repositorio; la ejecución reciente y la aceptación final se registran en [INFORME-DE-PRUEBAS.md](INFORME-DE-PRUEBAS.md).

| ID | Requisito / resultado esperado | Implementación identificada | Evidencia de pruebas | Estado |
|---|---|---|---|---|
| PO-01 | Actores, permisos explícitos y asignación de expedientes | `backend/src/domain/actors.js`, `roles.js`, middleware de autorización, rutas de aplicaciones; documentos `IMPLEMENTACION-PO-01-*` | `authorize.test.js`, `applicationAssignment.test.js`, integración de permisos | Implementado en main |
| PO-02 | Seguimiento privado mediante credencial y preservación de datos originales | `ApplicationTrackingCredential`, `ApplicationApplicantSnapshot`, rutas públicas de solicitud y seguimiento | `applicationTracking.test.js`, `applicantSubmission.test.js`, `integration.flow.test.js` | Implementado en main |
| PO-03 | Elegibilidad configurable, historial interno y política versionada | `evaluation.service.js`, `policy.service.js`, dominio de evaluación y modelos `CreditPolicy` / `RiskEvaluation` | `evaluation.test.js`, `evaluation.po03.test.js`, `policy.validator.test.js` | Implementado en main |
| PO-04 | Decisión humana justificada y aprobación condicionada verificada | `applicationStatus.service.js`, `ConditionalApproval`, rutas de estado y verificación | `applicationStatus.test.js`, `states.test.js` | Implementado en main; corrección de test PR #38 |
| PO-05 | Una reconsideración, oficial distinto y expediente original inmutable | `Reconsideration`, `ReconsiderationDocument`, rutas y servicio de reconsideración | `reconsideration.test.js`, `internalHistory.test.js`, integración | Implementado en main |
| PO-06 | Días de mora y categorías 1–30, 31–60 y 61+ | `domain/arrears.js`, servicio de préstamos y monitor programado | `arrears.test.js`, `arrearsMonitoring.test.js` | Implementado en main |
| PO-07 | Alertas preventivas y por mora, consulta y gestiones de cobro | Modelos `Alert` y `CollectionAction`, rutas de préstamos y monitor idempotente | `arrearsMonitoring.test.js`, `integration.flow.test.js` | Implementado en main |
| PO-08 | Reestructuración con aprobación, aceptación y cronograma nuevo conservando el anterior | `RestructuringPolicy`, `LoanRestructuring`, `PaymentSchedule.scheduleVersion/isCurrent`, servicio de préstamos | `restructuring.domain.test.js`, `restructuring.permissions.test.js`, `restructuring.validator.test.js`, integración | Implementado en main; PR #31 y controles PR #37 |
| PO-09 | Reportes administrativos basados en datos persistidos | Servicio y ruta `GET /api/reports`, pantalla de reportes | `report.service.test.js`, integración | Implementado en main; PR #30 |
| PO-10 | Estadísticas agregadas para supervisión y protección de grupos pequeños | Servicio de reportes y permisos `readPortfolioReports` | `report.service.test.js`, integración de permisos | Implementado en main; PR #30 |
| PO-11 | Auditoría, minimización de datos e inmutabilidad histórica | `audit.service.js`, `auditQuery.service.js`, `domain/immutability.js`, ruta `/api/audit` | `audit.service.test.js`, `auditQuery.service.test.js`, `immutability.test.js`, `arrearsMonitoring.test.js` | Implementado en main; PR #36 |
| PO-12 | Regresión integrada de registro a reportes, incluyendo reconsideración y reestructuración | `backend/test/integration.flow.test.js` | Requiere `TEST_DATABASE_URL` con nombre terminado en `_test`; el test destruye esa base al finalizar | Preparado; ejecución actual pendiente de evidencia |

## Reglas funcionales transversales

- La evaluación es apoyo a la decisión humana; no es aprobación o rechazo autónomo.
- La política y su versión quedan asociadas a la evaluación.
- Los antecedentes saldados se muestran y solo generan espera si la política vigente lo define.
- El solicitante no modifica el snapshot original después de presentar la solicitud.
- La reconsideración no reemplaza la decisión inicial.
- La mora usa días calendario, día de vencimiento como día cero y zona `America/Bogota`.
- Los pagos confirmados y cronogramas anteriores se conservan.
- El comité supervisor recibe reportes agregados y no permisos operativos generales.
- No se inventan tasas, intereses de mora, períodos, límites o permisos que el PO no haya definido.

## Límites y asuntos abiertos

La implementación mantiene límites que deben comunicarse: evidencia institucional de residencia, definición institucional de retención de auditoría, precisión monetaria exacta para producción, protección contra acceso directo a MongoDB, worker único en despliegues multinodo y reglas no definidas para periodicidades no mensuales o interés de mora. Véanse [decisiones de arquitectura](DECISIONES-ARQUITECTURA.md) y [seguridad y permisos](SEGURIDAD-Y-PERMISOS.md).
