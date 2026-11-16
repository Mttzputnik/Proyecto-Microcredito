# TODO — Arquitectura frontend por roles

## Entregado en esta fase

- [x] Cliente Axios con base URL configurable, JWT y manejo global de 401/403.
- [x] Servicios mock separados para autenticación, solicitudes, préstamos, pagos, políticas y usuarios.
- [x] Datos mock en COP, fechas día/mes/año y roles de la cooperativa.
- [x] Redux Toolkit con sesión de usuario, rol, token y estado de interfaz.
- [x] Login con correo y contraseña; en modo API consume JWT y usuario desde `/api/auth/login`, y en modo mock permite desarrollo local.
- [x] Rutas protegidas por sesión y rol, pantalla de acceso restringido y redirección a login.
- [x] ApplicantLayout mobile-first con barra inferior de Inicio, Mi solicitud, Mi préstamo y Ayuda.
- [x] InternalLayout con Sider colapsable, búsqueda, alertas, perfil y menú filtrado por rol.
- [x] Componentes StatusChip, JustificationBlock, AuditTimeline, ConfirmModal, PageHeader y EmptyState.
- [x] Páginas de solicitud, préstamo, pagos, políticas, auditoría y resumen operativo.
- [x] Vista del Oficial de Crédito con indicadores de apoyo, política aplicada, trazabilidad y decisión humana.
- [x] Justificación obligatoria de mínimo 30 caracteres y condiciones obligatorias para aprobación condicionada.
- [x] Pantalla de cronograma de pagos con desglose de capital, interés, saldo, vencimiento y estado de cada cuota.
- [x] Flujo de reconsideración para rechazos con explicación mínima de 30 caracteres y soportes opcionales.
- [x] Panel de reportes de portafolio y equidad restringido a administración y comité supervisor.

## Próximos incrementos

- [ ] Conectar los servicios con endpoints reales cuando exista el backend.
- [ ] Implementar el formulario guiado de nueva solicitud con guardado de borrador.
- [ ] Incorporar carga y validación de documentos.
- [ ] Conectar evaluación de riesgo y registro de decisiones con endpoints reales.
- [ ] Construir decisiones justificadas, reconsideraciones y confirmaciones irreversibles en backend.
- [ ] Añadir pruebas unitarias y de navegación por rol.
- [x] Implementar autenticación real con correo, contraseña, bcrypt, JWT, sesión/perfil y autorización por rol en backend.
- [ ] Conectar cronograma, reconsideraciones y reportes a endpoints reales cuando backend los publique.
