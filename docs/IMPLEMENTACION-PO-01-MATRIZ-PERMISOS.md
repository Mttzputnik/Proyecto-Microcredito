# Implementación PO-01 — Matriz de actores y permisos

**Rama:** feat/po-01-matriz-permisos-actores  
**Estado:** implementación inicial para revisión; no fusionada.  
**Fuente funcional:** docs/RESPUESTAS-PRODUCT-OWNER.md.

## 1. Matriz aplicada en backend

| Actor de negocio | Valor de rol en backend | Permisos implementados |
|---|---|---|
| Solicitante | No requiere cuenta interna | Presentación pública de solicitudes. No se agrega rol autenticado de solicitante. |
| Oficial de crédito | CREDIT_OFFICER | Consultar solicitantes y solicitudes asignadas; consultar políticas; evaluar como apoyo; registrar decisiones justificadas. |
| Analista de riesgo | analista_riesgo | Consultar y crear/versionar políticas. |
| Área administrativa | administrativo | Consultar préstamos, formalizar/registrar el ciclo operativo existente y registrar pagos. |
| Comité supervisor | comite_supervisor | Sin acceso a expedientes individuales ni operaciones. Los reportes agregados reales aún no tienen API implementada. |

### Roles técnicos y legado

- ADMIN se conserva para el bootstrap técnico y la gestión de usuarios; no representa uno de los cinco actores de negocio ni hereda permisos operativos.
- AUDITOR se conserva para no invalidar el valor histórico almacenado en usuarios existentes, pero queda sin permisos operativos. Las cuentas antiguas con ese rol necesitan una reasignación autorizada al rol correcto; no se migran automáticamente.
- CREDIT_OFFICER se mantiene con su valor histórico para no romper las cuentas existentes.

## 2. Restricciones implementadas

- El comité supervisor no puede consultar expedientes individuales, solicitantes ni préstamos mediante las rutas actuales.
- El área administrativa no puede revisar/decidir solicitudes ni administrar políticas.
- El analista de riesgo no puede consultar solicitantes ni registrar pagos.
- El oficial de crédito no puede registrar pagos ni administrar políticas.
- La ruta de edición de datos del solicitante queda sin roles autorizados: el Product Owner confirmó que el solicitante no modifica los datos originales después de presentar la solicitud. Un flujo formal de corrección o información complementaria debe implementarse por separado, sin sobrescribir el expediente.
- La operación de castigo/escritura de baja de préstamos queda sin roles autorizados porque el Product Owner no atribuyó esa facultad a ninguno de los cinco actores.
- La consulta de solicitudes, solicitantes, evaluaciones, decisiones e historial queda limitada al oficial asignado (assignedOfficerId).

## 3. Pendientes que bloquean el cierre completo de PO-01

### 3.1. Asignación de solicitudes

**Estado actualizado:** implementada la asignación automática en el backend.

- Las solicitudes nuevas entran en la cola y se asignan a oficiales activos.
- Se selecciona al oficial con menor carga activa; los empates se resuelven por tiempo desde la última asignación y antigüedad del usuario.
- La operación registra un evento de auditoría y se ejecuta dentro de la transacción de creación.
- Si no hay oficiales activos, la solicitud permanece en `PENDING_ASSIGNMENT`.
- Al crear o activar un oficial de crédito, se reprocesa la cola pendiente.

**Punto de validación pendiente:** el criterio de menor carga es una decisión técnica del equipo; confirmar con el Product Owner si satisface la distribución esperada o si debe cambiarse.

### 3.2. Responsabilidad de formalización y registro del desembolso

La respuesta del Product Owner asigna al área administrativa el monitoreo de pagos, identificación de retrasos y reportes. No detalla expresamente quién formaliza el préstamo aprobado ni quién registra la fecha de desembolso. Por compatibilidad con el flujo existente, las rutas agrupadas bajo manageLoans se asignaron provisionalmente al área administrativa. Validar esta atribución con el Product Owner antes de considerarla definitiva.

### 3.3. Comité supervisor y reportes

El rol comite_supervisor no tiene acceso a las rutas actuales de datos individuales. La interfaz puede mostrar la pantalla de reportes, pero esta todavía usa datos simulados y no existe API de reportes agregados. No debe interpretarse el acceso visual a esa pantalla como funcionalidad terminada ni como autorización para consultar datos individuales.

### 3.4. Gestión de cuentas antiguas

Las cuentas con rol AUDITOR dejan de acceder a las rutas protegidas por permisos. Deben identificarse y reasignarse manualmente solo después de confirmar si corresponden al comité supervisor u otro actor. No se hace una migración automática porque el nombre histórico no demuestra la identidad funcional del usuario.

## 4. Archivos modificados

- backend/src/domain/roles.js: catálogo de roles y matriz central de permisos.
- backend/src/routes/application.management.routes.js: lista, detalle e historial de solicitudes limitados al oficial asignado.
- backend/src/routes/applicant.routes.js: consulta de solicitantes limitada a quienes tienen solicitudes asignadas al oficial.
- backend/src/routes/application.evaluation.routes.js: historial de evaluación limitado al oficial asignado.
- backend/src/services/applicationStatus.service.js: impide cambiar el estado de una solicitud asignada a otro oficial.
- backend/src/services/evaluation.service.js: impide evaluar solicitudes asignadas a otro oficial.
- backend/test/authorize.test.js: pruebas unitarias de la matriz de permisos.
- backend/test/applicationStatus.test.js: prueba de rechazo al oficial no asignado.
- backend/test/integration.flow.test.js: flujo integrado adaptado a los roles institucionales y aislamiento por oficial.
- frontend/src/services/authService.js: etiquetas de los nuevos roles.
- frontend/src/routes/navigation.jsx: menú según responsabilidades.
- frontend/src/routes/AppRoutes.jsx: protección de rutas internas según actor.

## 5. Verificación

- Se revisaron los cambios y los archivos afectados mediante el contenido de la rama.
- Se actualizaron pruebas unitarias e integración, pero no se ejecutaron en un entorno Node/MongoDB.
- La prueba de integración existente requiere una base cuyo nombre termine en _test y elimina esa base al finalizar.
- No se modificaron archivos .env.
- Antes de fusionar, ejecutar npm test en backend y las verificaciones de build/lint disponibles en frontend.

## 6. Próximo trabajo recomendado

1. Consultar al Product Owner quién asigna solicitudes y cómo se distribuyen.
2. Consultar quién formaliza el préstamo y registra el desembolso.
3. Continuar con PO-02: corregir la actualización pública de solicitantes existentes y diseñar el seguimiento seguro por número de caso más verificación independiente.
