# PO-02.1 — Conservación histórica de datos del solicitante

**Rama:** `feat/po-02-1-historico-solicitante`  
**Base:** `feat/po-01-1-asignacion-equitativa`

## Problema detectado

El registro de una nueva solicitud encontraba al solicitante por documento y actualizaba su registro `Applicant`. Como cada solicitud conserva una relación con ese mismo registro, una nueva declaración podía cambiar retroactivamente los datos que se mostraban y utilizaban al evaluar expedientes anteriores.

## Solución

Se incorpora `ApplicationApplicantSnapshot`, una copia de los datos declarados en el momento de presentar cada solicitud:

- Identidad y documento.
- Fecha de nacimiento y teléfono.
- Municipio y zona de residencia.
- Ocupación y antigüedad de actividad.
- Ingresos, gastos, dependientes y obligaciones mensuales.

El perfil `Applicant` continúa representando los datos vigentes del solicitante y puede actualizarse con una nueva presentación o por el personal autorizado. La copia asociada a cada expediente no se modifica.

## Comportamiento

- La creación de la solicitud guarda su snapshot dentro de la misma transacción.
- La evaluación de riesgo utiliza el snapshot correspondiente al expediente.
- Para expedientes anteriores que no tengan snapshot, la evaluación conserva compatibilidad usando el perfil `Applicant` existente.
- Las vistas internas de lista y detalle exponen los datos del snapshot cuando existe.
- No se añade una operación para editar snapshots: son evidencia histórica de lo declarado al presentar el caso.

## Validación

Se añade una prueba unitaria que modifica deliberadamente el perfil actual y verifica que la evaluación utilice los valores históricos de la solicitud.

## Despliegue

El cambio de esquema requiere sincronizar Prisma con MongoDB en el entorno correspondiente. En desarrollo, después de revisar la rama y respaldar los datos, validar con:

```bash
npx prisma validate
npx prisma db push
npx prisma generate
npm test
```

No se ejecutó ninguna operación contra la base de datos remota ni se modificaron archivos `.env`.
