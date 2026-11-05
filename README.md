# Plataforma de Microcrédito y Decisión de Préstamos

Sistema académico para gestionar el ciclo de vida de solicitudes y préstamos de una cooperativa de economía solidaria.

## Objetivo

Estructurar la recepción de solicitudes, verificación de elegibilidad, evaluación de riesgo como apoyo a la decisión humana, registro justificado de decisiones, seguimiento de pagos y análisis del portafolio.

## Stack tecnológico

- **Frontend:** React, React Router, Redux Toolkit, Ant Design y Axios.
- **Backend:** Node.js y Express.
- **Persistencia:** MongoDB mediante Prisma ORM.
- **Autenticación:** JWT y contraseñas con hash seguro.

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

## Estructura prevista

```text
backend/   API REST, reglas de negocio y Prisma
frontend/  Aplicación web React
docs/      Requisitos, arquitectura, decisiones y pruebas
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

## Configuración

Los pasos de instalación se documentarán por separado para frontend y backend cuando se incorpore cada aplicación.

> Proyecto académico de Ingeniería de Software II. Las reglas financieras concretas deben validarse con el Product Owner antes de implementarse.
