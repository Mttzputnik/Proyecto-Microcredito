# Etapa 2 — Actores y control de acceso

## Fuente funcional

Este análisis se limita al enunciado de **Plataforma de Microcrédito y Decisión de Préstamos**, sección 3 (Actores involucrados) y sección 9 (Alcance del proyecto).

## Actores del dominio

| Actor del enunciado | Responsabilidad descrita |
|---|---|
| Solicitantes | Presentan información personal y financiera, propósito del préstamo y documentos de respaldo. |
| Oficiales de crédito | Revisan solicitudes, verifican documentos y comunican decisiones. |
| Analistas de riesgo | Establecen políticas y criterios para reducir el incumplimiento y mantener estabilidad y cumplimiento normativo. |
| Área administrativa | Monitorea pagos, identifica retrasos y genera reportes financieros para controlar el portafolio. |
| Comité supervisor | Revisa patrones de aprobación, detecta posibles sesgos o inconsistencias y vela por la equidad y la misión. |

El catálogo de dominio está representado en `backend/src/domain/actors.js`.

## Estado encontrado en el backend

El módulo actual `backend/src/domain/roles.js` define los roles autenticados `ADMIN`, `CREDIT_OFFICER` y `AUDITOR`. Esa lista no coincide directamente con los cinco actores del enunciado.

Además, el proyecto contiene un usuario `ADMIN` usado por el mecanismo técnico de bootstrap. El enunciado no define un actor de negocio llamado administrador ni describe la administración de usuarios como responsabilidad funcional.

## Decisiones que no se deben asumir

El enunciado no determina expresamente:

1. Si los solicitantes deben iniciar sesión o si el registro de solicitudes es público.
2. Si cada uno de los cuatro actores institucionales dispone de una cuenta individual.
3. La matriz exacta de permisos por operación, incluidos los permisos de lectura de datos personales.
4. Si `ADMIN` debe mantenerse como cuenta técnica de configuración y qué operaciones puede ejecutar sin convertirse en un actor funcional.

Estas decisiones deben confirmarse con el Product Owner indicado en el enunciado: https://po-microcredito-ucaldas.fly.dev/.

## Criterio para la siguiente modificación

No se deben asignar permisos por intuición ni otorgar acceso general a datos de solicitantes. Una vez confirmadas las decisiones anteriores, se actualizarán conjuntamente:

- `backend/src/domain/roles.js`
- Los middlewares y las rutas protegidas.
- El validador de creación de usuarios y el bootstrap, si corresponde.
- La representación de roles y permisos del frontend.

Este cambio inicial es deliberadamente no disruptivo: introduce el catálogo de actores del dominio sin alterar el inicio de sesión, las cuentas existentes ni los permisos actuales.
