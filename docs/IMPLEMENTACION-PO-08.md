# PO-08 — Reestructuración de préstamos

## Alcance implementado

- Políticas versionadas y configurables para las reestructuraciones.
- Registro de solicitudes sobre préstamos activos.
- Cálculo del capital pendiente con base en cuotas vigentes y asignaciones de pagos confirmados.
- Inclusión opcional de intereses corrientes vencidos según política.
- Tratamiento de cuotas vencidas mediante capitalización o exigencia de pago previo. En el segundo caso, las cuotas vencidas deben estar saldadas antes de activar el acuerdo.
- Intereses de mora sin cálculo automático: se pueden registrar manualmente solo cuando la política lo permite y se aporta una referencia/soporte contable.
- Decisión humana con justificación obligatoria.
- Escalamiento al comité cuando el nuevo saldo supera el límite de aprobación del oficial.
- Registro de aceptación del asociado y evidencia verificable antes de activar el acuerdo.
- Generación de un nuevo cronograma francés y conservación del cronograma anterior.
- Historial de acuerdos y eventos de auditoría.

## Flujo

1. El oficial o el área administrativa registra una solicitud para un préstamo ACTIVE.
2. El sistema valida una política vigente y calcula el saldo propuesto.
3. La solicitud pasa a PENDING_REVIEW.
4. El oficial aprueba o rechaza con justificación. Si el importe supera su límite, el sistema la mueve a PENDING_COMMITTEE_REVIEW.
5. El comité decide únicamente los casos escalados.
6. Una aprobación deja el acuerdo en PENDING_ACCEPTANCE.
7. El área administrativa registra el método y la evidencia de aceptación del asociado.
8. En una única transacción, el préstamo se actualiza, las cuotas anteriores quedan con isCurrent=false, se genera el nuevo cronograma y el acuerdo pasa a ACTIVE.

## Política de reestructuración

Cada versión configura:
- Plazo máximo.
- Período de gracia máximo.
- Tasa anual máxima legal aplicable.
- Límite de aprobación directa del oficial.
- Permiso y límite de reestructuraciones sucesivas.
- Tratamiento de cuotas vencidas: CAPITALIZE o REQUIRE_PAYMENT.
- Inclusión o no de intereses corrientes vencidos.
- Tratamiento de intereses de mora: MANUAL_CAPITALIZE, WAIVE o NOT_APPLICABLE.

La política debe publicarse con valores aprobados por la cooperativa. El sistema no define tasas, límites ni montos institucionales por defecto.

## Cálculo de saldo

- El capital pendiente se obtiene de la suma del capital programado en el cronograma vigente menos el capital imputado en pagos confirmados.
- Los intereses corrientes considerados son únicamente los de cuotas cuyo vencimiento ya ocurrió, menos los intereses imputados en pagos confirmados.
- Si la política permite incluir intereses corrientes vencidos, se agregan al nuevo saldo.
- Los intereses de mora no se calculan automáticamente porque el dominio actual no define fórmula ni causación. Si la política habilita capitalización manual, el usuario debe ingresar el importe respaldado por una referencia contable.
- La solicitud solo se admite cuando existe mora activa. Si la política exige pagar cuotas vencidas, el acuerdo queda pendiente de activación hasta que se salden; si los pagos modifican el saldo aprobado, el sistema recalcula y exige una nueva revisión y aceptación.
- La tasa propuesta no puede superar el máximo configurado en la política.

## Cronogramas versionados

PaymentSchedule incorpora scheduleVersion e isCurrent. El índice único pasa a ser loanId + scheduleVersion + installment.

Las operaciones ordinarias de pagos y mora consultan exclusivamente isCurrent=true. Las cuotas anteriores se conservan sin borrarse y quedan disponibles en scheduleHistory.

## Roles y permisos

- Oficial de crédito: consulta préstamos asignados, registra solicitudes y toma decisiones dentro de su límite.
- Área administrativa: consulta y registra solicitudes, consulta políticas vigentes, registra la aceptación comprobada y administra préstamos.
- Analista de riesgo: publica versiones de políticas de reestructuración.
- Comité supervisor: consulta exclusivamente propuestas escaladas y decide esos casos; no recibe el flujo de gestión rutinaria.
- El asociado no dispone todavía de una sesión autenticada vinculada al préstamo en este repositorio. Por eso la aceptación se registra por personal administrativo después de verificar el consentimiento, indicando método y evidencia.

## Límites deliberados por falta de reglas institucionales

- No se calcula interés de mora ni penalidad automáticamente.
- No se admite una periodicidad distinta de la mensual en el motor actual. El dominio menciona que pueden existir frecuencias no mensuales, pero no define sus reglas de conversión, amortización ni calendario; no se inventa esa fórmula.
- El primer vencimiento se captura explícitamente. El período de gracia se valida contra la fecha base mensual (un mes después de la solicitud) y el máximo de la política.
- La aceptación se registra con evidencia, pero no es una firma electrónica ni una autenticación directa del asociado.
- La retención legal de auditoría continúa pendiente de definición institucional; esta entrega conserva los eventos en AuditLog como lo hace el resto del sistema.

## Migración de datos

Antes de habilitar la nueva versión del backend sobre una base existente:

1. Ejecutar npx prisma format.
2. Ejecutar npx prisma validate.
3. Ejecutar npx prisma generate.
4. Aplicar npx prisma db push en una ventana de mantenimiento.
5. Ejecutar npm run db:migrate-restructuring-schedules para marcar los cronogramas históricos existentes como versión 1 vigente.
6. Ejecutar npm test.

La migración usa una operación MongoDB para completar isCurrent=true y scheduleVersion=1 en los documentos antiguos que no tienen esos campos. No se deben ejecutar instancias antiguas de la aplicación entre el cambio de esquema y el backfill.

## Endpoints

- GET /api/loans/restructuring-policies
- POST /api/loans/restructuring-policies
- GET /api/loans/restructurings
- GET /api/loans/:id/restructurings
- POST /api/loans/:id/restructurings
- PATCH /api/loans/restructurings/:id/decision
- POST /api/loans/restructurings/:id/accept

## Validación

Se agregan pruebas unitarias del cálculo del saldo y del período de gracia en test/restructuring.domain.test.js. La ejecución de Prisma, la suite completa y el build frontend deben confirmarse en un entorno con dependencias y MongoDB configurados.
