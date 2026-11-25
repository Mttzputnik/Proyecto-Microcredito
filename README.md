# Plataforma de Microcrédito y Decisión de Préstamos

Sistema académico para gestionar el ciclo de vida de solicitudes y préstamos de una cooperativa de economía solidaria.

## Objetivo

Apoyar la recepción y seguimiento de solicitudes, la verificación de elegibilidad, la evaluación de riesgo, las decisiones humanas justificadas, la formalización de préstamos, los pagos, la mora, la reestructuración, los reportes y la auditoría.

El sistema **no toma decisiones crediticias autónomas**. La evaluación genera indicadores para apoyar al funcionario autorizado; las decisiones deben ser humanas, justificadas y trazables.

## Stack tecnológico

- **Frontend:** React 19, Vite, React Router, Redux Toolkit, Ant Design y Axios.
- **Backend:** Node.js, Express 5 y JavaScript ES modules.
- **Persistencia:** MongoDB mediante Prisma ORM 6.
- **Autenticación:** JWT, contraseñas con bcryptjs y endpoint de sesión `/api/auth/me`.
- **Validación HTTP:** Zod.
- **Seguridad HTTP:** Helmet, CORS configurado y límites de frecuencia en flujos sensibles.

## Alcance funcional implementado

- Registro público de solicitudes y credencial de seguimiento.
- Asignación de solicitudes y acceso restringido a expedientes.
- Gestión de usuarios internos y autenticación.
- Políticas de crédito versionadas y evaluación configurable.
- Verificación de residencia y antecedentes internos.
- Decisiones justificadas y aprobación condicionada con verificación.
- Reconsideración única, asignada a un oficial distinto y sin sobrescribir la decisión original.
- Formalización y desembolso administrativo de préstamos.
- Generación y consulta de cronogramas de pago.
- Registro de pagos, actualización de mora, alertas y gestiones de cobro.
- Reestructuración con políticas versionadas, aprobación, aceptación documentada y cronogramas versionados.
- Reportes de cartera y estadísticas agregadas para supervisión.
- Auditoría de operaciones críticas e inmutabilidad de registros históricos protegidos mediante el cliente Prisma.

El alcance y las reglas funcionales se deben interpretar junto con [las respuestas del Product Owner](docs/RESPUESTAS-PRODUCT-OWNER.md). No se deben inferir reglas financieras que no estén definidas allí o en decisiones técnicas expresas.

## Estructura del repositorio

```text
Proyecto-Microcredito/
├── backend/
│   ├── prisma/schema.prisma
│   ├── scripts/
│   ├── src/
│   │   ├── config/
│   │   ├── domain/
│   │   ├── middlewares/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── validators/
│   │   ├── app.js
│   │   └── server.js
│   ├── test/
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   ├── components/
│   │   ├── layouts/
│   │   ├── mocks/
│   │   ├── pages/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── store/
│   │   └── theme/
│   ├── package.json
│   └── vite.config.js
├── docs/
└── plan.md
```

## Documentación del proyecto

| Documento | Contenido |
|---|---|
| [Reglas del Product Owner](docs/RESPUESTAS-PRODUCT-OWNER.md) | Fuente funcional prioritaria |
| [Backlog y estado PO](docs/BACKLOG-REGLAS-PRODUCT-OWNER.md) | Estado de PO-01 a PO-12 |
| [Matriz de trazabilidad](docs/MATRIZ-TRAZABILIDAD-PO.md) | Requisito, implementación y pruebas |
| [Arquitectura](docs/ARQUITECTURA-SISTEMA.md) | Capas, módulos y flujos |
| [Modelo de datos](docs/MODELO-DATOS.md) | Entidades y relaciones Prisma |
| [API](docs/API.md) | Rutas HTTP identificadas en el backend |
| [Seguridad y permisos](docs/SEGURIDAD-Y-PERMISOS.md) | Roles, permisos y límites |
| [Informe de pruebas](docs/INFORME-DE-PRUEBAS.md) | Evidencia disponible y validaciones pendientes |
| [Decisiones de arquitectura](docs/DECISIONES-ARQUITECTURA.md) | ADR y límites técnicos |
| [Flujo de trabajo](docs/FLUJO-DE-TRABAJO.md) | Ramas, PR y revisión |

También se conservan documentos de implementación por PO como evidencia histórica y técnica.

## Requisitos previos

- Node.js compatible con las dependencias del proyecto.
- MongoDB accesible mediante una URI.
- MongoDB configurado como replica set para las operaciones que usan transacciones.
- Variables de entorno configuradas localmente a partir de los archivos de ejemplo disponibles. No compartir secretos ni subir archivos `.env`.

## Ejecución local

### Backend

```bash
cd backend
npm install
npx prisma format
npx prisma validate
npx prisma generate
npx prisma db push
npm run dev
```

El backend usa por defecto el puerto `3001`. Comprueba su disponibilidad en `GET /api/health`.

### Frontend

En otra terminal:

```bash
cd frontend
npm install
npm run dev
```

Vite inicia el frontend, normalmente en el puerto `5173`. Configura la URL de la API mediante la variable de entorno frontend definida por el proyecto.

### Pruebas backend

```bash
cd backend
npm test
```

La prueba de integración `test/integration.flow.test.js` solo se ejecuta cuando `TEST_DATABASE_URL` apunta a una base MongoDB cuyo nombre termina en `_test`. La prueba elimina esa base al finalizar. **Nunca configures esa variable con una base de desarrollo o producción.**

### Build frontend

```bash
cd frontend
npm run build
```

## Consideraciones operativas y límites conocidos

- La credencial de seguimiento del solicitante es independiente del número de caso; no debe exponerse el token privado.
- Los permisos del comité supervisor están limitados a reportes agregados y a las decisiones de reestructuración que llegan escaladas; no obtiene gestión rutinaria de expedientes, configuración de políticas ni registro de pagos.
- Los roles técnicos y actores del negocio se documentan por separado.
- La protección append-only de ciertos modelos se aplica en el cliente Prisma compartido; no constituye una protección contra acceso directo o privilegios administrativos de MongoDB.
- Los importes financieros del esquema usan `Float` por la limitación de Prisma ORM 6 con MongoDB. Esta representación requiere una decisión de precisión monetaria antes de un uso productivo.
- El monitor de mora se ejecuta al iniciar el backend y periódicamente. En despliegues con varias instancias debe evitarse ejecutar workers duplicados.
- La periodicidad de pagos distinta de la mensual no está soportada por el motor de reestructuración documentado.
- No se calcula automáticamente interés de mora.
- No se afirma que el proyecto esté listo para producción: la seguridad de infraestructura, operación, protección de datos y reglas institucionales requiere revisión adicional.

## Estado de validación

La documentación describe el código y los documentos disponibles en la rama base. Los resultados de ejecución deben consultarse en [el informe de pruebas](docs/INFORME-DE-PRUEBAS.md); este README no sustituye una ejecución local reciente de la suite ni del build.

Proyecto académico de Ingeniería de Software II.
