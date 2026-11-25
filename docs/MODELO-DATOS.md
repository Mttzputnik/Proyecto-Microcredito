# Modelo de datos

El modelo persistente está definido en `backend/prisma/schema.prisma` y usa MongoDB mediante Prisma ORM 6. Los identificadores principales usan `ObjectId`. Los importes se representan actualmente con `Float`; esta es una limitación conocida, no una recomendación contable.

## Entidades y responsabilidades

| Entidad | Responsabilidad | Relaciones principales |
|---|---|---|
| `User` | Usuarios internos, rol y estado | Oficial asignado, decisiones, reconsideraciones y verificaciones |
| `Applicant` | Perfil actual del solicitante | Varias solicitudes |
| `LoanApplication` | Expediente y estado de solicitud | Solicitante, oficial, evaluaciones, decisiones, reconsideración, préstamo |
| `ApplicationApplicantSnapshot` | Datos presentados al momento de solicitar | Una instantánea por solicitud |
| `ApplicationTrackingCredential` | Hash de credencial privada para seguimiento | Una credencial por solicitud |
| `ApplicationVerification` | Verificación de residencia | Una verificación por solicitud |
| `CreditPolicy` | Política de crédito versionada | Evaluaciones |
| `RiskEvaluation` | Indicadores y resultado de evaluación | Solicitud y política aplicada |
| `LoanDecision` | Decisión humana y justificación | Solicitud y oficial |
| `ConditionalApproval` | Condiciones y verificación de aprobación condicionada | Solicitud y decisión |
| `Reconsideration` | Revisión única de una decisión rechazada | Solicitud y oficial diferente |
| `ReconsiderationDocument` | Metadatos de documentos complementarios | Reconsideración |
| `Loan` | Préstamo formalizado | Solicitud, cronogramas, pagos, alertas y reestructuraciones |
| `PaymentSchedule` | Cuotas de cada versión del cronograma | Préstamo, alertas |
| `Payment` | Registro de pago | Préstamo |
| `Alert` | Alertas preventivas y de mora | Préstamo y cuota |
| `CollectionAction` | Gestión de cobro registrada | Préstamo |
| `RestructuringPolicy` | Política versionada de reestructuración | Reestructuraciones |
| `LoanRestructuring` | Acuerdo, revisión, aceptación y activación | Préstamo y política |
| `AuditLog` | Eventos de auditoría | Referencia lógica a actor y entidad |

## Relaciones principales

```text
Applicant 1 --- N LoanApplication
LoanApplication 1 --- N RiskEvaluation --- 1 CreditPolicy
LoanApplication 1 --- N LoanDecision --- 1 User
LoanApplication 1 --- 0..1 Reconsideration
LoanApplication 1 --- 0..1 Loan
Loan 1 --- N PaymentSchedule
Loan 1 --- N Payment
Loan 1 --- N Alert
Loan 1 --- N CollectionAction
Loan 1 --- N LoanRestructuring --- 1 RestructuringPolicy
LoanRestructuring -> PaymentSchedule (nueva versión)
```

La relación de auditoría es polimórfica a nivel lógico: `AuditLog` guarda `entityType` y `entityId`, no una relación Prisma a cada tabla.

## Restricciones e índices relevantes

- Documento del solicitante: único.
- Número de solicitud: único.
- Número de préstamo: único.
- Política de crédito: combinación nombre + versión única.
- Política de reestructuración: combinación nombre + versión única.
- Cronograma: combinación préstamo + versión + número de cuota única.
- Alerta: combinación cuota + tipo + fecha de referencia única para deduplicación.
- Reestructuración: combinación préstamo + versión única.
- Solicitud y reconsideración: relación única para impedir más de una reconsideración.
- Aprobación condicionada: relación única con solicitud y decisión.

## Conservación histórica

- El snapshot conserva los datos presentados originalmente.
- La reconsideración agrega información y resultado sin sustituir la decisión original.
- Los pagos confirmados y las decisiones son append-only mediante el cliente Prisma compartido.
- Los cronogramas anteriores permanecen almacenados con `isCurrent=false`; el cronograma activo tiene `isCurrent=true` y versión superior.

## Límites

El esquema no implementa por sí solo todas las restricciones institucionales. La protección de inmutabilidad se aplica desde el cliente Prisma, no ante acceso directo a MongoDB. Los importes usan `Float` y requieren una decisión de precisión monetaria antes de producción.
