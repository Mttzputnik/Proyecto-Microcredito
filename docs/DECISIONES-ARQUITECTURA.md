# Decisiones de arquitectura

Este documento registra decisiones técnicas observables en el repositorio. Las reglas de negocio confirmadas se mantienen en [RESPUESTAS-PRODUCT-OWNER.md](RESPUESTAS-PRODUCT-OWNER.md); una decisión técnica no debe presentarse como una respuesta del Product Owner.

## ADR-001 — Stack tecnológico

**Estado:** adoptado.

React + Vite en el frontend; Node.js + Express en el backend; MongoDB como persistencia y Prisma ORM 6 como única capa de acceso a datos. No se usa Mongoose en paralelo.

## ADR-002 — Separación por capas

**Estado:** adoptado.

- Las rutas reciben solicitudes HTTP, aplican autenticación/autorización y delegan el trabajo.
- Los servicios concentran reglas de negocio y coordinación transaccional.
- El dominio contiene reglas y cálculos que pueden probarse independientemente.
- Prisma se consume mediante el cliente compartido de `backend/src/config/prisma.js`.

## ADR-003 — Políticas versionadas

**Estado:** adoptado.

Las políticas de crédito y de reestructuración se almacenan como registros versionados. Las evaluaciones conservan la referencia a la política utilizada. Las políticas deben tener los datos de aprobación institucional exigidos por las validaciones actuales; el sistema no inventa tasas ni límites institucionales.

## ADR-004 — Decisión humana y trazabilidad

**Estado:** adoptado.

La evaluación apoya al funcionario y no decide autónomamente. Las decisiones humanas requieren justificación. La decisión original de una reconsideración no se sobrescribe. Las operaciones críticas generan eventos de auditoría.

## ADR-005 — Precisión monetaria

**Estado:** limitación técnica vigente.

Prisma ORM 6 no ofrece el tipo Decimal para MongoDB en el esquema utilizado. Los importes se representan actualmente mediante `Float`; las entradas de ciertos flujos se validan como pesos enteros COP. Esta decisión no equivale a una garantía de precisión contable. Debe definirse una estrategia exacta de representación y redondeo antes de producción.

## ADR-006 — Separación entre solicitud y préstamo

**Estado:** adoptado.

Una solicitud recibida no es un préstamo. La formalización crea el préstamo después de una decisión humana aprobatoria y de las validaciones del flujo administrativo. El registro de solicitud no desembolsa fondos.

## ADR-007 — Seguimiento del solicitante mediante credencial

**Estado:** implementado.

El número de caso no es suficiente para consultar el expediente. El flujo público emite una credencial de seguimiento; el esquema almacena su hash y la API recibe la credencial para el seguimiento. El token privado no debe registrarse en logs ni exponerse en consultas administrativas.

## ADR-008 — Actores y roles separados

**Estado:** adoptado.

Los actores funcionales están definidos en `backend/src/domain/actors.js`; los roles técnicos y permisos están en `backend/src/domain/roles.js`. No se debe inferir que un actor tiene acceso solo por estar autenticado. Las operaciones se habilitan mediante permisos explícitos.

## ADR-009 — Reconsideración inmutable

**Estado:** implementado.

Se admite una reconsideración asociada a una solicitud rechazada, asignada a un oficial diferente. La información complementaria y el resultado se registran en una entidad vinculada; la solicitud y decisión originales se conservan.

## ADR-010 — Mora y alertas idempotentes

**Estado:** implementado.

La clasificación usa días calendario, con el día de vencimiento como día cero y la zona `America/Bogota`. Los umbrales son 1–30, 31–60 y 61 o más días. El monitor se ejecuta al iniciar el backend y luego según `ARREARS_MONITOR_INTERVAL_MS` (24 horas por defecto). Las alertas se identifican para evitar duplicados. En despliegues de múltiples instancias se requiere un único worker o exclusión distribuida.

## ADR-011 — Reestructuración y cronogramas versionados

**Estado:** implementado con límites explícitos.

La reestructuración conserva el cronograma anterior y genera una nueva versión. El flujo requiere revisión, decisión, aceptación documentada y activación. No se calcula automáticamente interés de mora. El motor documentado admite periodicidad mensual; no se inventan reglas de amortización para otras frecuencias. Los detalles se encuentran en [IMPLEMENTACION-PO-08.md](IMPLEMENTACION-PO-08.md) y [IMPLEMENTACION-POLITICAS-CONDICIONES-REESTRUCTURACION.md](IMPLEMENTACION-POLITICAS-CONDICIONES-REESTRUCTURACION.md).

## ADR-012 — Auditoría e inmutabilidad en el cliente Prisma

**Estado:** implementado con límite de infraestructura.

Los eventos de auditoría se escriben desde servicios y operaciones transaccionales. El cliente Prisma compartido bloquea modificaciones y borrados sobre modelos históricos protegidos. Las operaciones raw o el acceso directo a MongoDB pueden eludir esta protección; no se presenta como almacenamiento WORM ni como garantía criptográfica.

## Decisiones pendientes o límites que no deben ocultarse

- Definir una representación monetaria exacta y reglas de redondeo para producción.
- Revisar seguridad de infraestructura, gestión de secretos, respaldos, monitoreo y despliegue.
- Evitar workers de mora duplicados en despliegues con varias instancias.
- Confirmar institucionalmente evidencias de residencia y criterios de endeudamiento si se amplía el dominio.
- No atribuir el castigo de préstamos a un actor: el permiso `writeOffLoans` está vacío porque el PO no definió esa responsabilidad.
- La retención legal de auditoría no está definida por la institución.
