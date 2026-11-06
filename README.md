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

## Requisitos previos

Instala las siguientes herramientas antes de iniciar:

- **Node.js 20.19 o superior** (recomendado para Vite 7).
- **npm**, incluido con Node.js.
- Una instancia de **MongoDB**, local o en MongoDB Atlas.
- **Git** para clonar el repositorio.

Puedes comprobar las versiones con:

```bash
node --version
npm --version
git --version
```

## Instalación y configuración

### 1. Clonar el repositorio

```bash
git clone https://github.com/Mttzputnik/Proyecto-Microcredito.git
cd Proyecto-Microcredito
```

Si vas a trabajar con la rama de implementación inicial:

```bash
git fetch origin
git checkout feature/bootstrap-arquitectura
```

### 2. Configurar MongoDB

Puedes utilizar MongoDB Atlas o una instancia local. Crea una base de datos para el proyecto y ten disponible su cadena de conexión.

En MongoDB Atlas:

1. Crea un cluster y una base de datos.
2. Crea un usuario de base de datos.
3. Configura el acceso de red para tu entorno de desarrollo.
4. Copia la cadena de conexión proporcionada por Atlas.
5. Sustituye el usuario, contraseña y nombre de base de datos en la cadena.

No publiques credenciales ni compartas tu archivo `.env`.

### 3. Configurar el backend

Desde la raíz del repositorio:

```bash
cd backend
npm install
```

Crea el archivo local de variables de entorno a partir de la plantilla:

**Linux / macOS / Git Bash:**

```bash
cp .env.example .env
```

**Windows PowerShell:**

```powershell
Copy-Item .env.example .env
```

Edita `backend/.env` y configura los valores:

| Variable | Descripción |
|---|---|
| `PORT` | Puerto de la API. Por defecto, `3001`. |
| `NODE_ENV` | Entorno de ejecución, por ejemplo `development`. |
| `DATABASE_URL` | Cadena de conexión de MongoDB. |
| `JWT_SECRET` | Secreto aleatorio y privado para firmar tokens. |
| `JWT_EXPIRES_IN` | Tiempo de expiración del token, por ejemplo `8h`. |
| `FRONTEND_URL` | Origen permitido para CORS. Por defecto, `http://localhost:5173`. |

Ejemplo de configuración (reemplaza los valores de ejemplo por los tuyos):

```env
PORT=3001
NODE_ENV=development
DATABASE_URL="mongodb+srv://USUARIO:CONTRASENA@CLUSTER/NOMBRE_BD?retryWrites=true&w=majority"
JWT_SECRET="reemplazar-por-un-secreto-aleatorio-largo"
JWT_EXPIRES_IN="8h"
FRONTEND_URL="http://localhost:5173"
```

Genera el cliente de Prisma y valida el esquema:

```bash
npx prisma format
npx prisma validate
npx prisma generate
```

Para sincronizar el esquema inicial con MongoDB:

```bash
npx prisma db push
```

> **Importante:** Prisma utiliza `db push` para sincronizar esquemas con MongoDB; no se debe utilizar `prisma migrate dev` en este proyecto. Ejecuta este comando únicamente contra la base de datos de desarrollo que hayas configurado.

Inicia el servidor:

```bash
npm run dev
```

La API estará disponible en:

- `http://localhost:3001`
- Comprobación de estado: `http://localhost:3001/api/health`

La ruta de salud debe responder con un JSON que indique que la API está activa.

### 4. Configurar el frontend

Abre otra terminal desde la raíz del repositorio:

```bash
cd frontend
npm install
npm run dev
```

Vite mostrará la dirección local de la aplicación. Con la configuración actual estará disponible en:

- `http://localhost:5173`

### 5. Ejecutar ambos proyectos durante el desarrollo

Mantén dos terminales abiertas:

| Terminal | Directorio | Comando |
|---|---|---|
| Backend | `backend/` | `npm run dev` |
| Frontend | `frontend/` | `npm run dev` |

## Comandos útiles

### Backend

| Comando | Función |
|---|---|
| `npm run dev` | Inicia Express en modo desarrollo con Nodemon. |
| `npm start` | Inicia Express. |
| `npx prisma format` | Formatea el esquema Prisma. |
| `npx prisma validate` | Valida el esquema Prisma. |
| `npx prisma generate` | Genera el cliente Prisma. |
| `npx prisma db push` | Sincroniza el esquema con MongoDB. |

### Frontend

| Comando | Función |
|---|---|
| `npm run dev` | Inicia el servidor de desarrollo Vite. |
| `npm run build` | Genera la compilación de producción. |
| `npm run preview` | Previsualiza la compilación. |

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
