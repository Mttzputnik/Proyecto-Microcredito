# Plataforma de Microcrédito y Decisión de Préstamos

Sistema académico para gestionar el ciclo de vida de solicitudes y préstamos de una cooperativa de economía solidaria.

## Objetivo

Estructurar la recepción de solicitudes, verificación de elegibilidad, evaluación de riesgo como apoyo a la decisión humana, registro justificado de decisiones, seguimiento de pagos y análisis del portafolio.

## Stack tecnológico

- **Frontend:** React, Vite, React Router, Redux Toolkit, Ant Design y Axios.
- **Backend:** Node.js y Express.
- **Persistencia:** MongoDB mediante Prisma ORM.
- **Autenticación prevista:** JWT y contraseñas con hash seguro.

## Alcance funcional

1. Usuarios, roles y solicitantes.
2. Solicitudes y documentos.
3. Políticas de crédito configurables y versionadas.
4. Evaluación de riesgo e indicadores de capacidad de pago.
5. Decisiones justificadas y reconsideraciones.
6. Préstamos y cronogramas de pago.
7. Registro de pagos, alertas y mora.
8. Reestructuración.
9. Reportes y auditoría.

El sistema apoya el juicio del funcionario: no toma decisiones crediticias autónomas. Los desembolsos, consultas automáticas a fuentes externas, contabilidad general y cobro jurídico están fuera del alcance académico inicial.

## Estructura del repositorio

```text
Proyecto-Microcredito/
├── backend/
│   ├── prisma/
│   │   └── schema.prisma
│   ├── src/
│   │   ├── config/
│   │   │   └── prisma.js
│   │   ├── app.js
│   │   └── server.js
│   ├── .env.example
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   ├── store.js
│   │   └── styles.css
│   ├── index.html
│   └── package.json
└── docs/
    ├── DECISIONES-ARQUITECTURA.md
    └── FLUJO-DE-TRABAJO.md
```

## Estructura de carpetas backend

```text
backend/
├── prisma/
│   └── schema.prisma
│
├── src/
│   ├── config/
│   │   └── database.js
│   │
│   ├── controllers/
│   │   ├── AuthController.js
│   │   ├── UserController.js
│   │   ├── ApplicantController.js
│   │   ├── LoanApplicationController.js
│   │   ├── RiskEvaluationController.js
│   │   ├── LoanDecisionController.js
│   │   ├── LoanController.js
│   │   ├── PaymentController.js
│   │   ├── PolicyController.js
│   │   ├── ReportController.js
│   │   └── AuditController.js
│   │
│   ├── services/
│   │   ├── LoanService.js
│   │   ├── RiskEvaluationService.js
│   │   ├── PolicyService.js
│   │   ├── PaymentScheduleService.js
│   │   ├── DelinquencyService.js
│   │   └── AuditService.js
│   │
│   ├── routes/
│   ├── middlewares/
│   ├── utils/
│   └── index.js
│
├── .env
├── package.json
└── server.js
```


## Estructura de carpetas frontend

```text
frontend/
└── src/
    ├── api/
    │   ├── applicant.js
    │   ├── application.js
    │   ├── loan.js
    │   ├── payment.js
    │   ├── policy.js
    │   └── user.js
    │
    ├── components/
    │   ├── general/
    │   ├── applicants/
    │   ├── applications/
    │   ├── loans/
    │   └── reports/
    │
    ├── layouts/
    │   └── AdminLayout/
    │
    ├── pages/
    │   ├── Dashboard/
    │   ├── Applicants/
    │   ├── Applications/
    │   ├── Evaluations/
    │   ├── Decisions/
    │   ├── Loans/
    │   ├── Payments/
    │   ├── Policies/
    │   ├── Reports/
    │   └── Audit/
    │
    ├── routes/
    ├── slices/
    ├── utils/
    └── App.js
```

## Desarrollo por incrementos

| Incremento | Objetivo |
|---|---|
| 1 | Base del proyecto, autenticación, roles y solicitantes |
| 2 | Solicitudes y documentación |
| 3 | Políticas configurables y evaluación de riesgo |
| 4 | Decisiones y reconsideraciones |
| 5 | Préstamos y cronogramas |
| 6 | Pagos, mora y reestructuración |
| 7 | Reportes, auditoría y pruebas integrales |

## Trabajo colaborativo

- `main`: versión estable.
- `feature/nombre`: funcionalidades nuevas.
- `fix/nombre`: correcciones.
- `docs/nombre`: documentación.

Crea ramas por funcionalidad y abre Pull Requests para revisar e integrar los cambios. Consulta [docs/FLUJO-DE-TRABAJO.md](docs/FLUJO-DE-TRABAJO.md) para conocer las pautas del equipo.

## Consideraciones de arquitectura

- Las reglas crediticias deben ser configurables y versionadas.
- Cada evaluación debe conservar la política utilizada y sus indicadores.
- La evaluación de riesgo es apoyo a la decisión; la decisión final corresponde a un funcionario autorizado y debe quedar justificada.
- Las decisiones y pagos confirmados deben conservar trazabilidad.
- Antes de implementar cálculos financieros se deben definir con el Product Owner las fórmulas, la precisión monetaria y las reglas de redondeo. El esquema inicial es una base de trabajo y requiere revisión antes de producción.

Consulta [docs/DECISIONES-ARQUITECTURA.md](docs/DECISIONES-ARQUITECTURA.md) para ver las decisiones y pendientes técnicos.

## Estado del proyecto

El repositorio contiene la estructura inicial del frontend y backend, el esquema inicial de Prisma y la documentación de arquitectura y colaboración. Los módulos funcionales se desarrollarán y validarán progresivamente; por tanto, no todas las funcionalidades descritas en el alcance están implementadas todavía.

> Proyecto académico de Ingeniería de Software II. Las reglas financieras concretas deben validarse con el Product Owner antes de implementarse.


## Primer flujo funcional: recepción de solicitudes

El formulario público del frontend consume `POST /api/applications`. El endpoint valida el payload con Zod, crea o actualiza el solicitante por número de documento y registra una solicitud con estado `SUBMITTED`. La respuesta incluye el número generado por el backend; la interfaz solo muestra la confirmación cuando la API responde correctamente.

### Ejecutar localmente

Backend:
```bash
cd backend
cp .env.example .env
npm install
npx prisma format
npx prisma validate
npx prisma generate
npx prisma db push
npm run dev
```

Frontend (en otra terminal):
```bash
cd frontend
cp .env.example .env
npm ci
npm run dev
```

Configura `DATABASE_URL` en `backend/.env` con una base de desarrollo de MongoDB. Prisma ORM 6 con MongoDB requiere un replica set para operaciones transaccionales; MongoDB Atlas lo proporciona por defecto. En `frontend/.env`, configura `VITE_API_URL=http://localhost:3001/api` si el backend usa el puerto predeterminado.

### API disponible

- `GET /api/health`: comprobación básica del servidor.
- `POST /api/applications`: recibe la solicitud del formulario. Valida identidad, datos socioeconómicos, monto, plazo y propósito. Devuelve `201` y `data.applicationNumber` cuando se guarda correctamente.

El endpoint de recepción es público para permitir el formulario inicial. No expongas endpoints administrativos ni datos personales de consulta hasta implementar autenticación, autorización, controles antiabuso y políticas de protección de datos.

### Límites conocidos del incremento

- La elegibilidad del frontend es informativa y no constituye evaluación ni aprobación.
- Las políticas, umbrales y fórmulas crediticias deben confirmarse con el Product Owner.
- Los importes se reciben como pesos enteros COP; el uso de `Float` en el esquema es provisional y no debe considerarse contabilidad definitiva.
- La creación del solicitante y de la solicitud se realiza en operaciones separadas; para consistencia transaccional, la base MongoDB debe operar como replica set y se debe añadir una estrategia de transacción/compensación probada.
- La autenticación y los módulos administrativos siguen pendientes.
