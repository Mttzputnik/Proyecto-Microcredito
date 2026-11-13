# Supuestos para revisión (una sola vez)

Estas reglas ya están **implementadas** con la opción más razonable, para no frenar el desarrollo. Cada una está aislada en un
solo lugar, así que si el Product Owner pide otra cosa se cambia en minutos. **No hace falta responder "sí"**: basta con
revisar la tabla y marcar solo las que se quieran cambiar.

Reglas que NO se inventaron: **no hay ninguna tasa, monto máximo, plazo máximo ni umbral escrito en el código.** Todo eso
vive en la tabla `CreditPolicy` y lo carga un administrador con `POST /api/policies` usando los valores confirmados por el PO
(ADR-003, ADR-005). Mientras no exista una política activa, evaluar solicitudes responde un error claro en vez de adivinar.

## 1. Supuestos financieros (dónde cambiarlos)

| # | Supuesto | Dónde está | Si el PO pide otra cosa |
|---|---|---|---|
| S1 | La tasa se guarda como porcentaje anual (24 = 24 %) | `src/validators/finance.validator.js` | Cambiar la validación |
| S2 | La tasa es **efectiva anual**: mensual = (1+EA)^(1/12) − 1 | `RATE_CONVENTION` en `src/domain/finance.js` | Poner `"NOMINAL_ANNUAL"` (una línea) |
| S3 | Cuota fija mensual (sistema francés) | `src/domain/finance.js` | Reescribir `buildSchedule` |
| S4 | Pesos enteros; la última cuota absorbe el redondeo | `src/domain/finance.js` | Cambiar `roundCOP` |
| S5 | Primera cuota 1 mes después del desembolso, cuotas mensuales | `src/domain/finance.js` | Cambiar `addMonths` |
| E1 | `maxDebtRatio` es fracción (0.4 = 40 %): (deudas actuales + cuota) / ingreso | `src/domain/evaluation.js` | Cambiar la fórmula |
| E2 | Recomendación: falla un límite → apoya rechazo; falta un dato → revisión manual; todo cumple → apoya aprobación | `src/domain/evaluation.js` | Cambiar `evaluate` |
| E3 | No se calcula "nivel de riesgo" (no hay umbrales confirmados) | — | Pedir los umbrales y agregarlos como campos de la política |
| P1 | Un pago se aplica a la cuota pendiente más antigua; lo que sobra pasa a la siguiente (cubre pagos parciales y anticipados) | `src/domain/payments.js` | Cambiar `allocatePayment` |
| P2 | Dentro de una cuota se paga primero interés y luego capital | `src/domain/payments.js` | Idem |
| P3 | Se rechaza un pago mayor al saldo total | `src/services/loan.service.js` | Idem |
| M1 | Cuota en mora = vence antes de hoy y tiene saldo (días en UTC) | `src/domain/arrears.js` | Cambiar `classifyArrears` |
| M2 | Mora es estado de la **cuota** (OVERDUE); el préstamo sigue ACTIVE | `src/domain/states.js` | Agregar estado de préstamo |
| M3 | **No** hay interés de mora ni penalidades | — | Pedir la regla y agregarla |

## 2. Supuestos de proceso

| # | Supuesto | Dónde |
|---|---|---|
| F1 | Evaluar solo si la solicitud está `UNDER_REVIEW`; la evaluación no cambia el estado | `evaluation.service.js` |
| F2 | Aprobar o rechazar exige justificación (≥ 10 caracteres) y genera una `LoanDecision` | `applicationStatus.service.js` |
| F3 | Aprobar **no** exige haber evaluado antes (la evaluación es apoyo, ADR-004). Formalizar sí exige una evaluación con política que tenga tasa | `loan.service.js` |
| F4 | Formalizar crea el préstamo en `PENDING_DISBURSEMENT`; desembolsar lo pasa a `ACTIVE` y genera el cronograma | `loan.service.js` |
| F5 | Una solicitud con préstamo no se puede cancelar | `applicationStatus.service.js` |
| F6 | Castigar (`WRITTEN_OFF`) lo hace solo ADMIN y exige justificación | `loan.routes.js` |
| F7 | Valores de decisión: `APPROVED` / `REJECTED`; de evaluación: `SUPPORTS_APPROVAL` / `SUPPORTS_REJECTION` / `MANUAL_REVIEW` | `evaluation.js`, `applicationStatus.service.js` |
| F8 | Una solicitud `REJECTED` es final (no hay reconsideración todavía) | `states.js` |
| F9 | Los pagos confirmados no se corrigen: una reversión será un evento nuevo (aún no implementada) | `immutability.js` |
| R1 | Roles ADMIN, CREDIT_OFFICER, AUDITOR y sus permisos | `src/domain/roles.js` |

## 3. Cambios al esquema de datos (solo aditivos)

Se agregaron campos que no rompen nada existente:

- `PaymentSchedule.paidAmount` (Float, por defecto 0) y `PaymentSchedule.paidAt` (DateTime opcional): para soportar pagos parciales.
- `Payment.allocations` (Json opcional): cómo se repartió cada pago entre cuotas (trazabilidad).

Después de integrar hay que correr `npx prisma generate` y `npx prisma db push`.

## 4. Hallazgos de seguridad fuera de este cambio (no se tocaron)

1. **`POST /api/applications` es público y actualiza al solicitante si el documento ya existe.** Cualquiera que conozca una
   cédula puede sobrescribir los datos de esa persona (ingresos, teléfono, etc.). Propuesta: que el formulario público solo
   cree solicitantes nuevos, y que la actualización de datos existentes se haga autenticada por `PATCH /api/applicants/:id`.
2. **No hay límite de intentos de inicio de sesión** (fuerza bruta). Propuesta: `express-rate-limit` en `/api/auth/login`.
3. **El formulario público no tiene límite de peticiones**: se puede llenar la base de solicitudes basura.

## 5. Qué NO está hecho (necesita información que no existe aún)

- Reversión de pagos y reestructuración de préstamos (ADR-005 las deja abiertas).
- Reconsideración de solicitudes rechazadas.
- Alertas (no existe un modelo `Alert` en el esquema).
- Valores reales de la política de crédito: los debe cargar el administrador con los datos del PO.
