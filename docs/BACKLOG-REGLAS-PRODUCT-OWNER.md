# Backlog técnico priorizado a partir de las respuestas del Product Owner

**Proyecto:** Plataforma de Microcrédito y Decisión de Préstamos  
**Base funcional:** `docs/RESPUESTAS-PRODUCT-OWNER.md`  
**Estado:** propuesta de trabajo; las tareas no implican que estén implementadas.

## Convenciones

- **P0:** bloqueo de seguridad o de integridad; resolver antes de exponer la funcionalidad.
- **P1:** funcionalidad central necesaria para cumplir las reglas confirmadas.
- **P2:** completar reportes, supervisión y validación transversal.
- Los archivos indicados son puntos de entrada observados en la revisión del repositorio; deben volver a inspeccionarse en la rama de implementación antes de modificarlos.
- No modificar archivos `.env`.
- Trabajar en ramas nuevas desde `main`; abrir PR para revisión y no fusionar sin autorización.
- No agregar roles, módulos o reglas de negocio que no estén respaldados por el enunciado o por el Product Owner.

## Fase A — Seguridad, actores y acceso

### PO-01 — Matriz de actores, roles y permisos
**Prioridad:** P0  
**Estado:** pendiente de diseño y validación.

**Contexto:** el negocio define cinco actores; el backend actualmente tiene roles técnicos `ADMIN`, `CREDIT_OFFICER` y `AUDITOR`. No debe asumirse una equivalencia automática.

**Trabajo:**
- Construir una matriz actor → operaciones permitidas → datos visibles → restricciones.
- Separar permisos de consulta, creación, modificación, decisión, configuración, pagos y supervisión.
- Restringir al comité supervisor a consultas e informes de supervisión, sin gestión rutinaria de casos, configuración ni registro de pagos.
- Revisar los permisos amplios actuales de lectura y las rutas protegidas.

**Puntos de entrada:** `backend/src/domain/roles.js`, middleware de autorización, rutas `backend/src/routes/*`, servicios de usuarios y pantallas internas del frontend.

**Criterios de aceptación:**
- Cada operación protegida tiene un permiso explícito.
- Las pruebas demuestran que un actor no puede ejecutar operaciones fuera de sus responsabilidades.
- El comité no puede registrar pagos, configurar políticas ni gestionar casos individuales.
- No se habilita acceso a información financiera por el solo hecho de estar autenticado.

**Pruebas:** matriz positiva y negativa por endpoint; pruebas de acceso a datos de otros solicitantes.

### PO-02 — Seguimiento seguro por número de caso
**Prioridad:** P0  
**Estado:** decisión de diseño del equipo pendiente.

**Trabajo:**
- Mantener el formulario guiado y generar un identificador único de caso.
- Elegir y documentar una verificación adicional para consultar el expediente (por ejemplo, token de acceso seguro); no tratar el número de caso como secreto suficiente.
- Evitar que conocer un documento de identidad o número de caso permita consultar o sobrescribir información privada.
- Revisar el flujo público de creación de solicitudes y la actualización de solicitantes existentes.

**Puntos de entrada:** rutas y controladores de `applications` y `applicants`; `frontend/src/services/applicationService.js`; flujo público de solicitud.

**Criterios de aceptación:**
- Cada solicitud obtiene un número único no predecible o acompañado de un secreto de consulta independiente.
- Un usuario no autorizado no puede recuperar datos financieros usando solo un identificador público.
- La creación pública no permite sobrescribir los datos de otra persona por conocer su número de documento.
- No se exige cuenta/contraseña al solicitante salvo que el equipo elija y documente esa alternativa.

**Pruebas:** colisiones de identificadores; consulta sin verificación; intento de acceso cruzado; intento de actualización no autorizada.

## Fase B — Elegibilidad y evaluación

### PO-03 — Completar verificaciones de elegibilidad configurables
**Prioridad:** P1  
**Estado:** parcial; los criterios actuales no cubren todas las condiciones confirmadas.

**Trabajo:**
- Incorporar edad mínima, residencia verificable, mora activa interna, límite de endeudamiento simultáneo y categorías permitidas del propósito.
- Consultar el historial interno y mostrar antecedentes al oficial.
- Aplicar períodos de espera únicamente cuando estén configurados en la política vigente.
- Mantener umbrales y categorías como datos de política, no como reglas rígidas.

**Puntos de entrada:** `backend/src/domain/evaluation.js`, `backend/src/services/evaluation.service.js`, `backend/src/services/policy.service.js`, modelos Prisma de solicitante, solicitud, préstamo y política; frontend de evaluación.

**Criterios de aceptación:**
- Cada requisito configurable produce un resultado verificable y una explicación.
- Un antecedente saldado se muestra al oficial y solo bloquea la continuación si una política vigente establece un período de espera aplicable.
- El sistema genera alertas/indicadores; no rechaza automáticamente por un incumplimiento.
- Se registra qué versión de política se utilizó.

**Pruebas:** casos límite de edad; residencia no verificada; mora activa; deuda simultánea en el límite y por encima; propósito permitido/no permitido; antecedente saldado con y sin período de espera.

### PO-04 — Decisión humana justificada y consistente
**Prioridad:** P1  
**Estado:** parcial; revisar diferencias entre estados soportados por backend y opciones de interfaz.

**Trabajo:**
- Alinear las opciones de decisión de la interfaz con el dominio y los endpoints.
- Asegurar que el oficial pueda revisar los indicadores de elegibilidad y riesgo.
- Conservar la justificación y el autor de cada decisión.
- No convertir indicadores o alertas en rechazo automático.

**Puntos de entrada:** `backend/src/services/applicationStatus.service.js`, `backend/src/domain/states.js`, rutas de gestión de solicitudes y evaluación; `frontend/src/pages/internal/RiskEvaluationPage.jsx`.

**Criterios de aceptación:**
- Toda decisión final es atribuible a un usuario autorizado y contiene justificación.
- La interfaz no ofrece opciones que el backend no pueda procesar correctamente.
- Un indicador de incumplimiento no produce por sí solo un rechazo automático.
- El historial de decisiones permanece consultable.

**Pruebas:** decisión sin justificación; usuario no autorizado; decisión repetida; consistencia entre UI, API y estados.

## Fase C — Reconsideración

### PO-05 — Implementar reconsideración única e imparcial
**Prioridad:** P1  
**Estado:** mock en frontend; flujo backend pendiente según revisión.

**Trabajo:**
- Crear un flujo de reconsideración asociado a una solicitud rechazada.
- Recibir información complementaria y argumentos sin modificar la solicitud original.
- Registrar el oficial que decidió originalmente y exigir un oficial distinto para reconsiderar.
- Impedir una segunda reconsideración.
- Registrar resultado, justificación, responsable y fecha en el expediente original.
- Preservar la decisión y los documentos iniciales.

**Puntos de entrada:** `backend/src/domain/states.js`, rutas/servicios de aplicaciones, esquema Prisma y auditoría; `frontend/src/pages/applicant/ReconsiderationPage.jsx`, servicio de reconsideración.

**Criterios de aceptación:**
- Solo una solicitud rechazada puede iniciar reconsideración.
- La misma solicitud no admite más de una reconsideración.
- El oficial asignado no puede ser el autor de la decisión original.
- Los datos originales no cambian; los nuevos soportes quedan anexados como información complementaria.
- El resultado queda vinculado al expediente original y no sobrescribe la decisión inicial.

**Pruebas:** solicitud no rechazada; segundo intento; mismo oficial; alteración de datos originales; persistencia del resultado e historial.

## Fase D — Mora, alertas y gestión administrativa

### PO-06 — Clasificación automática de mora
**Prioridad:** P1  
**Estado:** parcial; existe actualización manual de mora, pero falta contrastar e implementar la clasificación confirmada.

**Trabajo:**
- Calcular días de incumplimiento a partir del vencimiento de cada cuota.
- Clasificar: 1–30 retraso leve; 31–60 mora temprana; más de 60 mora establecida.
- Ejecutar la actualización automáticamente con un mecanismo programado compatible con el despliegue.
- Mantener el cálculo idempotente y auditable.

**Puntos de entrada:** `backend/src/services/loan.service.js`, `backend/src/domain/states.js`, modelos de cuotas/préstamos y configuración de ejecución.

**Criterios de aceptación:**
- Los límites 1, 30, 31, 60 y 61 días producen exactamente la clasificación definida.
- La clasificación se actualiza sin intervención manual.
- El proceso puede ejecutarse más de una vez sin duplicar efectos ni degradar estados.
- Los registros conservan fecha de vencimiento y datos necesarios para explicar la clasificación.

**Pruebas:** pruebas de límites; cuotas pagadas/parciales/pendientes; ejecución repetida; cambio de estado al recibir pago.

**Dependencia:** confirmar si los días son calendario o hábiles, zona horaria y momento de corte.

### PO-07 — Alertas automáticas y gestiones de cobro
**Prioridad:** P1  
**Estado:** pendiente de integración completa.

**Trabajo:**
- Generar alerta para el área administrativa al entrar una cuota en retraso leve (día 1).
- Configurar alertas preventivas para cuotas que vencen dentro de N días.
- Mostrar cartera clasificada por días de mora.
- Registrar gestiones de cobro asociadas al préstamo/cuota.
- Evitar duplicar alertas en cada ejecución del proceso.

**Puntos de entrada:** servicios y rutas de préstamos; modelos de alertas/gestiones si existen; pantallas administrativas y servicios frontend.

**Criterios de aceptación:**
- Una cuota genera la alerta de mora correspondiente una sola vez por transición.
- El umbral preventivo N es configurable.
- El área administrativa puede consultar alertas y registrar una gestión con responsable y fecha.
- El comité supervisor no recibe permisos de operación administrativa.

**Pruebas:** generación de alerta al día 1; umbral N; deduplicación; registro y consulta de gestión; autorización por actor.

## Fase E — Reestructuración

### PO-08 — Registrar reestructuración y nuevo cronograma
**Prioridad:** P1  
**Estado:** implementado y fusionado en PR #31; documentado en `docs/IMPLEMENTACION-PO-08.md`.

**Trabajo:**
- Permitir reestructurar préstamos en mora temprana o establecida debido a dificultades de pago.
- Registrar el acuerdo y las nuevas condiciones por un oficial autorizado.
- Generar un nuevo cronograma vinculado al préstamo y a la reestructuración.
- Conservar cronogramas, cuotas y pagos anteriores como historial.
- Evitar modificar o eliminar pagos confirmados.

**Puntos de entrada:** `backend/src/services/loan.service.js`, rutas de préstamos, modelos Prisma de Loan/Installment/Payment; pantallas y servicios frontend de préstamos.

**Criterios de aceptación:**
- Solo préstamos en los estados de mora admitidos pueden iniciar reestructuración.
- El acuerdo conserva autor, fecha y condiciones pactadas.
- El nuevo cronograma se genera y queda vinculado al préstamo.
- El cronograma anterior y los pagos históricos siguen disponibles y no se sobrescriben.
- La operación queda auditada.

**Pruebas:** préstamo no elegible; préstamo en mora; generación del cronograma; conservación de pagos e historial; acceso por rol.

**Dependencia:** precisar campos del acuerdo, tratamiento de cuotas vencidas/saldo/intereses, número de reestructuraciones y transición del cronograma anterior.

## Fase F — Reportes, supervisión y trazabilidad

### PO-09 — Reportes administrativos de cartera
**Prioridad:** P2  
**Estado:** implementado y fusionado en PR #30; validar cifras con datos de desarrollo.

**Trabajo:**
- Sustituir datos simulados por consultas reales. (Implementado)
- Reportar cartera, pagos, cuotas vencidas y clasificación de mora. (Implementado)
- Exponer filtros y agregaciones necesarios para el área administrativa. (Implementado con rango de fechas y exportación CSV)
- Mantener los datos consistentes con pagos y cronogramas reales.

**Puntos de entrada:** `frontend/src/pages/internal/ReportsPage.jsx`, `frontend/src/mocks/reportData.js`, servicios y rutas backend de reportes (crear solo si hacen falta para los reportes requeridos).

**Criterios de aceptación:**
- Los totales se derivan de registros persistidos, no de constantes o mocks.
- Los filtros no exponen información fuera de los permisos del actor.
- Las cifras pueden reconciliarse con préstamos, cuotas y pagos.

**Pruebas:** totales con conjunto de datos controlado; filtros; permisos; consistencia financiera.

### PO-10 — Estadísticas y revisión del comité supervisor
**Prioridad:** P2  
**Estado:** implementado y fusionado en PR #30; agregaciones por municipio, zona de residencia y propósito con supresión de grupos pequeños. Dimensiones demográficas no modeladas no se inventan.

**Trabajo:**
- Proporcionar estadísticas agregadas por municipio, zona de residencia y propósito para analizar patrones de aprobación. (Implementado; umbral mínimo de cinco registros)
- Facilitar revisión agregada de decisiones justificadas, aprobaciones condicionadas y relación descriptiva entre propósito y comportamiento de pago. (Implementado parcialmente)
- No incluir operaciones de gestión individual, configuración ni pagos en el perfil del comité. (Restringido en API y navegación)

**Puntos de entrada:** servicios/rutas de reportes, `frontend/src/pages/internal/ReportsPage.jsx`, pantallas de auditoría y permisos.

**Criterios de aceptación:**
- Los informes se calculan con datos reales.
- Las dimensiones de perfil están justificadas por los requisitos y la política de privacidad; no se inventan indicadores sensibles.
- Las excepciones pueden rastrearse hasta su justificación.
- El comité solo dispone de acceso de consulta a estadísticas e informes autorizados.

**Pruebas:** agregaciones; datos vacíos; filtros; autorización; trazabilidad de excepciones.

### PO-11 — Auditoría de operaciones críticas
**Prioridad:** P1 transversal  
**Estado:** implementación transversal completada en esta rama; validación local dirigida pendiente. Ver `docs/IMPLEMENTACION-PO-11-CIERRE.md`.

**Trabajo:**
- Verificar auditoría de decisiones, reconsideraciones, cambios de política, pagos y alertas; reestructuraciones se auditarán cuando se implementen.
- Registrar actor, operación, fecha, entidad afectada y referencia al motivo/justificación cuando corresponda.
- Preservar la inmutabilidad de decisiones y pagos confirmados.
- Proveer consultas acordes con los permisos de cada actor. (Consulta detallada implementada para área administrativa; comité solo recibe agregados)

**Puntos de entrada:** `backend/src/services/audit.service.js`, modelos de auditoría, servicios de aplicaciones y préstamos, rutas de historial; `frontend/src/pages/internal/AuditPage.jsx`.

**Criterios de aceptación:**
- Cada operación crítica produce un evento de auditoría.
- Los eventos permiten reconstruir quién hizo qué y cuándo.
- No se sobrescriben decisiones históricas ni pagos confirmados.
- Los usuarios solo consultan los registros que su rol les permite ver.

**Pruebas:** evento por operación; inmutabilidad; orden temporal; permisos de consulta.

## Fase G — Verificación y cierre

### PO-12 — Pruebas de aceptación y regresión del flujo completo
**Prioridad:** P1 transversal  
**Estado:** pendiente de ejecutar contra el estado actualizado.

**Trabajo:**
- Crear pruebas integradas desde registro hasta decisión, formalización, cronograma, pagos, mora y reportes.
- Cubrir reconsideración y reestructuración.
- Validar matriz de permisos y confidencialidad.
- Ejecutar pruebas existentes y registrar resultados reales; no marcar pruebas como ejecutadas sin evidencia.

**Criterios de aceptación:**
- Los escenarios principales y límites de las reglas confirmadas están automatizados.
- Los tests de permisos incluyen accesos permitidos y denegados.
- Los datos históricos permanecen íntegros tras reconsideraciones y reestructuraciones.
- La documentación distingue funcionalidades reales de mocks o pendientes.

## Dependencias y preguntas abiertas

Estas cuestiones no quedaron definidas en las respuestas recibidas y deben mantenerse visibles:

1. **Consulta de caso:** mecanismo de verificación elegido por el equipo y controles contra enumeración/consulta cruzada.
2. **Matriz de permisos:** equivalencia concreta entre los cinco actores y roles técnicos actuales.
3. **Residencia verificable:** qué evidencia o dato se acepta para considerarla verificada.
4. **Endeudamiento simultáneo:** definición exacta del cómputo y qué obligaciones se incluyen.
5. **Días de mora:** calendario/hábiles, zona horaria y momento de corte.
6. **Alertas:** canales, frecuencia, destinatarios adicionales, deduplicación y configuración del umbral N.
7. **Reestructuración:** campos del acuerdo, cálculo de saldo/intereses, tratamiento de cuotas vencidas y número de reestructuraciones permitidas.
8. **Estadísticas por perfil:** dimensiones autorizadas, protección de datos y umbrales mínimos de agregación.

## Orden recomendado de ejecución

1. PO-01 y PO-02: permisos y acceso seguro.
2. PO-03 y PO-04: elegibilidad y decisiones.
3. PO-05: reconsideración.
4. PO-06 y PO-07: mora, alertas y gestiones.
5. PO-08: reestructuración.
6. PO-11: asegurar auditoría transversal a medida que se implementa cada operación.
7. PO-09 y PO-10: reportes administrativos y supervisión.
8. PO-12: regresión integral y verificación final.

No iniciar tareas que dependan de una decisión abierta sin documentar primero el supuesto aprobado o solicitar aclaración al Product Owner.


---

## Estado actualizado de los pendientes funcionales (rama de estabilización)

Esta sección prevalece sobre los estados históricos de las fases anteriores, que se conservan como registro de planificación.

### PO-03 — Políticas de crédito configurables
**Estado propuesto:** implementado en la rama `feat/politicas-aprobacion-condicionada-reglas-financieras`; pendiente de validación local y fusión.

- La API exige todos los umbrales usados por evaluación.
- Se exige referencia y fecha de aprobación institucional.
- No se asignan valores numéricos por defecto.
- Políticas antiguas incompletas o sin autorización registrada no pueden seleccionarse para evaluar.
- Las versiones futuras no desactivan la política que sigue vigente.
- La referencia documental se registra, pero su autenticidad debe comprobarse institucionalmente.

### PO-04 — Aprobación condicionada
**Estado propuesto:** flujo implementado en la rama; pendiente de validación local y fusión.

- La decisión original permanece inmutable.
- Se crea un registro separado de seguimiento de condiciones.
- El oficial asignado registra evidencia de cumplimiento.
- La solicitud pasa a `APPROVED` únicamente tras la verificación.
- La formalización comprueba el estado `VERIFIED`; no basta con que la decisión original diga `APPROVED_WITH_CONDITIONS`.

### PO-08 — Reglas financieras de reestructuración
**Estado propuesto:** controles adicionales implementados en la rama; pendiente de validación local y fusión.

- Las políticas nuevas requieren referencia y fecha de aprobación institucional.
- Solo se admite periodicidad mensual.
- No se calculan automáticamente intereses de mora.
- La capitalización manual requiere autorización de política y soporte contable.
- El tratamiento de cuotas vencidas y de intereses corrientes sigue siendo configurable según política.
- No se inventan tasas, límites ni parámetros financieros.

**Documento técnico:** `docs/IMPLEMENTACION-POLITICAS-CONDICIONES-REESTRUCTURACION.md`.

**Validación pendiente:** ejecutar las pruebas dirigidas, Prisma Validate/Generate/DB Push y el build de frontend indicados en el documento. No ejecutar la suite global PO-12.
