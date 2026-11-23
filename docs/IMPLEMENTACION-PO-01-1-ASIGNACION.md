# PO-01.1 — Asignación inicial y cola de solicitudes

**Rama:** `feat/po-01-1-asignacion-equitativa`  
**Estado:** propuesta técnica implementada para revisión.  
**Reglas funcionales:** `docs/RESPUESTAS-PRODUCT-OWNER.md` y aclaración del PO sobre el estado pendiente de asignación.

## 1. Regla aplicada

El Product Owner confirmó que una solicitud recién registrada permanece pendiente de asignación y que la distribución debe procurar imparcialidad, transparencia y evitar sobrecarga o sesgos. No definió quién asigna ni un algoritmo obligatorio; por tanto, el siguiente mecanismo es una decisión de diseño del equipo, no una regla textual del PO:

1. Solo participan usuarios activos con rol `CREDIT_OFFICER`.
2. Se selecciona al oficial con menor número de solicitudes activas asignadas.
3. En empate, se prioriza a quien lleva más tiempo sin recibir una asignación.
4. Si persiste el empate, se prioriza la cuenta creada primero.
5. Cada asignación registra fecha, método, criterio y oficial destinatario en `AuditLog`.

La carga activa cuenta solicitudes en `SUBMITTED`, `UNDER_REVIEW` y `NEEDS_INFORMATION`. Los estados aprobados, rechazados y cancelados no incrementan la carga activa, pero su fecha de asignación sí se considera para el desempate por antigüedad.

## 2. Flujo implementado

1. El formulario público crea el caso en estado `PENDING_ASSIGNMENT`.
2. El backend procesa la cola pendiente en orden de llegada.
3. Si hay oficiales activos, asigna el caso y lo pasa a `SUBMITTED`.
4. Si no hay oficiales disponibles, conserva `PENDING_ASSIGNMENT`.
5. Cuando se crea un usuario activo `CREDIT_OFFICER`, se vuelve a procesar la cola pendiente.
6. La bandeja de cada oficial continúa filtrando por `assignedOfficerId`; no se amplía el acceso a casos ajenos.

Se procesa también la cola heredada de solicitudes `SUBMITTED` sin oficial asignado, para no dejar registros antiguos inaccesibles.

## 3. Datos y trazabilidad

- `LoanApplication.assignedAt`: fecha de asignación.
- `LoanApplication.status`: nuevo estado inicial `PENDING_ASSIGNMENT`.
- `AuditLog.action = APPLICATION_AUTO_ASSIGNED`: evento generado por el sistema, con `actorId = null`.
- Índices compuestos para buscar la cola pendiente y la carga por oficial.

## 4. Límites y decisiones pendientes

- El algoritmo de menor carga es una propuesta técnica; el PO no confirmó un criterio único.
- No se crea un actor supervisor con permiso de asignación, porque el PO no atribuyó expresamente esa operación al comité supervisor ni a otro actor.
- Si no existen oficiales activos, los casos permanecen pendientes. La cola se reintenta al registrar una nueva solicitud o al crear un oficial activo.
- La asignación es automática; no se incorpora una interfaz de asignación manual.
- La lógica usa las solicitudes activas como aproximación de carga. No mide complejidad ni tiempo de trabajo por expediente.
- Para registros históricos sin `assignedAt`, el desempate usa `createdAt` como aproximación de la fecha de asignación.

## 5. Verificación

Se añadieron pruebas unitarias del selector y del procesamiento de la cola. No se afirma que hayan sido ejecutadas. La validación Prisma y las pruebas completas deben correrse en un entorno configurado con MongoDB. No se modificaron archivos `.env`.
