# Arquitectura del sistema

## 1. Vista general

La solución utiliza una arquitectura web cliente-servidor organizada en capas dentro del backend:

```text
Navegador
   |
   v
Frontend React + Vite
   |  Axios / HTTP JSON
   v
API REST Express
   |-- Middlewares: CORS, Helmet, autenticación, autorización y validación
   |-- Rutas HTTP
   v
Servicios de aplicación
   |-- Solicitudes y solicitantes
   |-- Evaluación y políticas
   |-- Decisiones y reconsideraciones
   |-- Préstamos, pagos y mora
   |-- Reestructuraciones
   |-- Reportes y auditoría
   v
Dominio + Prisma Client
   |
   v
MongoDB
```

El frontend separa páginas por áreas, layouts, rutas, servicios HTTP y estado Redux. El backend separa rutas, middlewares, servicios, dominio, validadores y configuración de persistencia.

## 2. Componentes

### Frontend

Ubicación: `frontend/src`.

- `pages/applicant`: experiencia del solicitante y consulta de su préstamo.
- `pages/public`: seguimiento público de solicitud.
- `pages/auth`: inicio de sesión y registro/recuperación según las pantallas existentes.
- `pages/internal`: operaciones internas de solicitudes, evaluación, préstamos, mora, políticas, reportes, auditoría y reestructuraciones.
- `layouts`: navegación y estructura para solicitantes y usuarios internos.
- `services` y `api`: comunicación con la API.
- `store`: estado global de autenticación e interfaz.
- `routes`: composición y protección de rutas de interfaz.

### Backend

Ubicación: `backend/src`.

- `app.js`: configuración de Express, middleware global, health check y montaje de routers.
- `server.js`: arranque HTTP, conexión Prisma y ejecución periódica del monitor de mora.
- `routes`: endpoints HTTP y aplicación de permisos.
- `services`: coordinación de casos de uso, transacciones y persistencia.
- `domain`: reglas de evaluación, mora, finanzas, pagos, estados, roles, actores e inmutabilidad.
- `middlewares`: autenticación, autorización, límites de frecuencia y validaciones compartidas.
- `config/prisma.js`: cliente Prisma compartido.

## 3. Flujos principales

### 3.1 Solicitud y seguimiento

1. El solicitante envía el formulario público.
2. La API valida los datos y registra el snapshot de lo presentado.
3. Se genera el número de caso y una credencial de seguimiento independiente.
4. La solicitud se asigna a un oficial según la lógica de asignación.
5. El solicitante consulta el estado aportando número de caso y credencial; la credencial se almacena como hash.

### 3.2 Evaluación y decisión

1. El oficial consulta expedientes asignados.
2. El servicio obtiene la política de crédito vigente y validada.
3. Se calculan indicadores de elegibilidad/capacidad y se guarda la referencia de política.
4. El oficial toma una decisión con justificación.
5. Si la aprobación es condicionada, se registran condiciones y su verificación; la formalización requiere que estén verificadas.

### 3.3 Reconsideración

1. El solicitante inicia reconsideración de una solicitud rechazada con su credencial.
2. El sistema conserva los datos y decisión originales.
3. La reconsideración se asigna a un oficial distinto.
4. Se registra una única decisión de reconsideración, vinculada al expediente original.

### 3.4 Formalización, pagos y mora

1. El área administrativa formaliza una solicitud elegible y crea el préstamo.
2. El desembolso genera el cronograma.
3. Los pagos se registran y se imputan a cuotas.
4. El monitor actualiza la mora y genera alertas idempotentes.
5. El área administrativa consulta alertas y registra gestiones de cobro.

### 3.5 Reestructuración

1. Se registra una solicitud de reestructuración para un préstamo elegible.
2. Se calcula el saldo y se valida la política de reestructuración vigente.
3. El oficial decide; los casos que superan su límite se escalan al comité.
4. Tras la aprobación, el área administrativa registra método y evidencia de aceptación.
5. Se activa el acuerdo, se marca el cronograma previo como no vigente y se crea una nueva versión. El historial se conserva.

### 3.6 Reportes y auditoría

- Los reportes se generan desde información persistida y agregaciones autorizadas.
- El comité recibe información agregada y no la auditoría detallada.
- Las operaciones críticas escriben eventos de auditoría.
- Los modelos históricos protegidos no admiten actualización o borrado mediante el cliente Prisma compartido.

## 4. Seguridad transversal

La API aplica Helmet, CORS con orígenes configurados, autenticación JWT, permisos explícitos y rate limiting en endpoints sensibles. Las rutas y permisos concretos están descritos en [API](API.md) y [Seguridad y permisos](SEGURIDAD-Y-PERMISOS.md).

## 5. Despliegue y operación

- MongoDB debe operar como replica set para transacciones.
- El monitor de mora corre al iniciar el backend y luego con el intervalo configurado.
- En múltiples instancias debe garantizarse un único worker o una exclusión distribuida.
- No usar una base de integración que no termine en `_test`; la prueba integrada elimina la base de datos al finalizar.
- No subir archivos de entorno ni secretos.

## 6. Límites arquitectónicos

- La protección append-only de Prisma no bloquea operaciones directas en MongoDB.
- La precisión monetaria basada en `Float` requiere revisión antes de producción.
- No hay cálculo automático de interés de mora.
- El motor documentado de reestructuración admite periodicidad mensual.
- La arquitectura no implica por sí sola cumplimiento legal o certificación de seguridad.
