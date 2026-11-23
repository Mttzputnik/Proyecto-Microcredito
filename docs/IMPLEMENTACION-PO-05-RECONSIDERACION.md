# Implementación PO-05 — Reconsideración única e imparcial

**Rama:** `feat/po-05-reconsideracion-imparcial`  
**Base:** `main` después de PO-04  
**Estado:** implementación inicial para validación local.

## Reglas cubiertas

- El solicitante inicia la reconsideración con número de caso y token privado; el token se envía en el cuerpo de la petición, nunca en la URL.
- Solo se admite si la solicitud conserva el estado `REJECTED` y existe una decisión de rechazo registrada.
- El modelo `Reconsideration` usa `applicationId @unique`, por lo que solo puede existir una reconsideración por solicitud.
- Se conserva el identificador de la decisión original y el identificador del oficial que la tomó.
- La asignación selecciona un oficial activo `CREDIT_OFFICER` distinto del original y utiliza la selección por menor carga ya existente.
- Si no hay otro oficial activo, la solicitud no se crea y se informa el conflicto.
- El oficial asignado registra el resultado y una justificación; el servicio valida nuevamente su identidad y el estado pendiente.
- La solicitud, la decisión original y el snapshot del solicitante no se actualizan.
- El envío y el resultado generan eventos de auditoría vinculados al expediente original.

## API

| Método | Ruta | Acceso | Propósito |
|---|---|---|---|
| POST | `/api/reconsiderations` | Público con número + token | Presentar información complementaria |
| GET | `/api/reconsiderations/assigned` | Oficial autenticado | Consultar reconsideraciones pendientes asignadas |
| PATCH | `/api/reconsiderations/:id/decision` | Oficial asignado | Registrar resultado y justificación |

Los resultados se expresan como `ACCEPTED` (aceptar la reconsideración para continuar la revisión) y `UPHELD` (confirmar el rechazo original). **Aceptar la reconsideración no equivale a aprobar automáticamente el crédito.** El Product Owner no definió una transición posterior del estado de la solicitud; por eso esta implementación conserva `LoanApplication.status = REJECTED` y registra el resultado por separado, sin inventar una transición de negocio.

## Interfaz

- El seguimiento público ofrece el acceso a reconsideración cuando el estado consultado es `REJECTED`.
- El formulario solicita número de caso, token privado y argumentos/información complementaria.
- El portal interno muestra la información aportada y la decisión original al oficial independiente.
- El oficial registra el resultado y la justificación desde el portal interno.

## Pendientes / límites de esta entrega

- La interfaz recibe información complementaria en texto. La carga y almacenamiento de archivos adjuntos no se implementa en esta entrega porque el flujo actual no dispone de un mecanismo de almacenamiento documental integrado.
- El resultado `ACCEPTED` no aprueba el préstamo ni cambia automáticamente el estado original. Debe confirmarse con el Product Owner qué estado o etapa debe seguir después de aceptar una reconsideración.
- La auditoría conserva el vínculo con la solicitud original; el historial de decisión original no se edita.

## Validación local requerida

Desde `backend`:

```bash
npx prisma format
npx prisma validate
npx prisma generate
npx prisma db push
npm test
```

Desde `frontend`:

```bash
npm run build
```

Ejecutar `db push` únicamente contra la base de desarrollo configurada para el proyecto. No compartir ni modificar archivos `.env`.
