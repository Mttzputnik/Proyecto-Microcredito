# PO-06 — Gestión operativa de préstamos y cartera

## Objetivo
Conectar la operación interna de préstamos con los endpoints reales de `/api/loans`, sustituyendo el uso de datos simulados en el servicio de préstamos para el módulo administrativo.

## Alcance de esta entrega
- Servicio frontend para listar y consultar préstamos, registrar desembolso, registrar pagos y consultar/refrescar mora.
- Pantalla administrativa de préstamos con filtros por estado, detalle, cronograma, historial de pagos y registro de pagos.
- Pantalla administrativa de cartera en mora con resumen por préstamo y detalle de cuotas vencidas.
- Rutas y navegación visibles únicamente para el rol `administrativo`, coherentes con `PERMISSIONS.readLoans`, `manageLoans` y `registerPayments` del backend.
- El desembolso registra el evento y genera el cronograma; no representa una transferencia real de dinero, que permanece fuera del alcance académico.

## Reglas de negocio respetadas
- Solo se listan/consultan préstamos mediante sesión autenticada.
- El desembolso solo se permite en préstamos `PENDING_DISBURSEMENT`.
- Los pagos se registran en préstamos `ACTIVE`, con valores enteros COP.
- La asignación de pagos, los estados de cuota y el saldo pendiente siguen las reglas ya implementadas en `loan.service.js` y `domain/payments.js`.
- La mora se consulta según vencimientos y saldo pendiente; no se agregan intereses ni penalidades.
- No se ofrece castigo de cartera porque el Product Owner no ha asignado esa facultad a un rol operativo.

## Endpoints consumidos
- `GET /api/loans`
- `GET /api/loans/:id`
- `POST /api/loans/:id/disburse`
- `POST /api/loans/:id/payments`
- `GET /api/loans/arrears`
- `POST /api/loans/:id/refresh-arrears` (disponible en el servicio para operación posterior)

## Validación local pendiente
- `npm run build` en frontend.
- `npm test` en backend.
- Validar con usuario `administrativo`: listado, filtros, detalle, desembolso, pago parcial, pago total y cartera en mora.
- Confirmar que `CREDIT_OFFICER`, `analista_riesgo` y `comite_supervisor` no pueden abrir las pantallas operativas de préstamos.

## Fuera de este PR
- La formalización desde la bandeja de solicitudes aprobadas requiere conectar el acto administrativo de formalización con una selección segura de solicitudes elegibles. El endpoint backend `POST /api/loans` ya existe; no se habilita un formulario que permita ingresar IDs manualmente.
- El portal del solicitante sigue usando datos mock para préstamo y cronograma porque el modelo actual no vincula credenciales públicas de seguimiento con una vista segura del préstamo.
- Reversos de pagos y reestructuración siguen pendientes de definición funcional.
