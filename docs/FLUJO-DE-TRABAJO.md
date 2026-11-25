# Flujo de trabajo del equipo

## Ramas

- `main`: versión estable e integrada.
- `feature/nombre` o `feat/nombre`: funcionalidad nueva.
- `fix/nombre`: corrección.
- `docs/nombre`: documentación.

Crear ramas desde `main), salvo que el equipo acuerde explícitamente otra base. No trabajar directamente sobre `main`.

## Pull Requests

1. Crear una rama enfocada en un objetivo.
2. Mantener el cambio acotado y evitar mezclar funcionalidades no relacionadas.
3. Describir el problema, el alcance, los archivos relevantes y las decisiones tomadas.
4. Incluir pruebas automatizadas y resultados reales cuando aplique.
5. Revisar que no se incluyan secretos, archivos `.env`, credenciales ni datos personales.
6. Revisar el diff y resolver observaciones.
7. Fusionar solo después de la aprobación correspondiente.

Una PR en borrador indica trabajo pendiente de revisión; no equivale a una entrega validada.

## Commits

Usar mensajes descriptivos, por ejemplo:

- `feat: add applicant tracking credential`
- `fix: validate conditional approval transition`
- `docs: describe loan lifecycle`
- `test: cover eligibility policy limits`

## Verificaciones recomendadas

Backend:

```bash
npm test
npx prisma validate
npx prisma generate
```

Frontend:

```bash
npm run build
```

La prueba de integración requiere una base MongoDB aislada cuyo nombre termine en `_test`; el test elimina esa base al terminar. Nunca usar una base compartida, de desarrollo o producción.

## Responsabilidades

El equipo distribuye análisis con Product Owner, backend, frontend, pruebas, integración y documentación. Los responsables concretos se asignan entre los integrantes; este documento no atribuye responsabilidades personales.

## Reglas de alcance

- Las respuestas del Product Owner prevalecen sobre mocks, supuestos o documentación antigua.
- No agregar actores, permisos, tasas, límites, fórmulas ni reglas no respaldadas.
- Las decisiones que el PO delega al equipo deben identificarse como decisiones técnicas.
- No modificar `.env` durante tareas de documentación.
