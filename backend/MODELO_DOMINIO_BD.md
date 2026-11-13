# Modelo de dominio y persistencia

## Fuente única de persistencia
El backend utiliza Prisma ORM 6.19 y MongoDB. Los modelos persistentes se definen exclusivamente en `prisma/schema.prisma`; no se deben crear esquemas paralelos con Mongoose.

MongoDB se modela con referencias entre colecciones:
- `Applicant`: identidad y perfil socioeconómico.
- `LoanApplication`: petición de financiación, monto, plazo, destino y estado del trámite.
- `Loan`: crédito formalizado después de una decisión y un desembolso.
- `PaymentSchedule` y `Payment`: cuotas programadas y pagos registrados.
- `CreditPolicy`, `RiskEvaluation` y `LoanDecision`: reglas versionadas, análisis y decisión humana.
- `AuditLog`: trazabilidad de eventos.

## Flujo y estados
La solicitud y el préstamo son conceptos diferentes.

Estados de solicitud: `SUBMITTED`, `UNDER_REVIEW`, `NEEDS_INFORMATION`, `APPROVED`, `REJECTED`, `CANCELLED`.

Estados de préstamo: `PENDING_DISBURSEMENT`, `ACTIVE`, `PAID`, `WRITTEN_OFF`.

Estados de cuota: `PENDING`, `PARTIALLY_PAID`, `PAID`, `OVERDUE`.

Los estados se almacenan como cadenas. Las transiciones y permisos deben implementarse en servicios del backend; el cliente no debe cambiar libremente el estado.

### Transiciones permitidas (propuesta, pendiente de validar con el Product Owner)
Están codificadas en `src/domain/states.js` y cubiertas por `test/states.test.js`. Los servicios deben llamar a `assertTransition(...)` antes de cambiar un estado.

| Entidad | Desde | Hacia |
|---|---|---|
| Solicitud | `SUBMITTED` | `UNDER_REVIEW`, `CANCELLED` |
| Solicitud | `UNDER_REVIEW` | `NEEDS_INFORMATION`, `APPROVED`, `REJECTED`, `CANCELLED` |
| Solicitud | `NEEDS_INFORMATION` | `UNDER_REVIEW`, `CANCELLED` |
| Solicitud | `APPROVED` | `CANCELLED` (mientras no exista préstamo) |
| Solicitud | `REJECTED`, `CANCELLED` | final |
| Préstamo | `PENDING_DISBURSEMENT` | `ACTIVE` |
| Préstamo | `ACTIVE` | `PAID`, `WRITTEN_OFF` |
| Préstamo | `PAID`, `WRITTEN_OFF` | final |
| Cuota | `PENDING` | `PARTIALLY_PAID`, `PAID`, `OVERDUE` |
| Cuota | `PARTIALLY_PAID` | `PAID`, `OVERDUE` |
| Cuota | `OVERDUE` | `PARTIALLY_PAID`, `PAID` |
| Cuota | `PAID` | final |

Preguntas abiertas para el Product Owner (no se asumieron):
- Reconsideración de una solicitud `REJECTED`: hoy es estado final.
- Mora: se deriva de cuotas `OVERDUE`; no existe un estado de préstamo "en mora".
- Reversión de pagos: `Payment` solo tiene `CONFIRMED`; falta definir cómo se corrige un pago.
- Valores de `LoanDecision.outcome` y `RiskEvaluation.result`.

## Reglas de negocio
1. El formulario público registra una solicitud como `SUBMITTED`; no la aprueba ni calcula una decisión de riesgo.
2. La elegibilidad mostrada en frontend es orientativa. La validación definitiva pertenece al backend y a políticas confirmadas por el Product Owner.
3. No se codifica un umbral del 40 % como política oficial hasta que el Product Owner lo confirme.
4. La evaluación de riesgo apoya al funcionario. Toda decisión debe tener responsable y justificación.
5. El cronograma se genera cuando se formalice el desembolso, usando una tasa y fórmula aprobadas.
6. Los pagos confirmados y decisiones deben conservar trazabilidad.

## Datos monetarios
Prisma ORM 6 con MongoDB no soporta `Decimal`; los importes se mantienen temporalmente como `Float` en COP y la API restringe las entradas a pesos enteros. Antes de producción se debe evaluar una representación monetaria exacta compatible con el motor y definir redondeos con el Product Owner. No usar punto flotante como contabilidad definitiva.

## Operación local
Prisma utiliza transacciones internamente en ciertas operaciones. MongoDB requiere un replica set para esas operaciones; MongoDB Atlas ya lo configura. Para aplicar cambios:

```bash
npx prisma format
npx prisma validate
npx prisma generate
npx prisma db push
```
