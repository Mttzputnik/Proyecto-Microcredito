# PO-02 — Seguimiento seguro de solicitudes

**Rama:** `feat/po-02-seguimiento-seguro`  
**Base:** `feat/po-01-1-asignacion-equitativa`

## Regla funcional

El Product Owner confirmó que el número único de caso permite identificar una solicitud, pero no debe ser la única credencial para consultar información financiera. La solución de diseño elegida por el equipo es una consulta pública con dos datos: número de caso y token secreto de acceso.

## Comportamiento implementado

- Al registrar una solicitud se genera un token aleatorio criptográficamente seguro de 256 bits.
- El token se entrega una sola vez en la respuesta de creación.
- En MongoDB se almacena únicamente su hash SHA-256; el token original no se persiste.
- La consulta se realiza con `POST /api/applications/track` y credenciales en el cuerpo, nunca en la URL.
- La respuesta pública solo expone número de caso, estado y fechas de registro/actualización.
- No expone identidad, datos financieros, documentos, evaluaciones, decisiones detalladas ni información del oficial asignado.
- Las credenciales inexistentes, incorrectas o revocadas producen el mismo error público.
- Se registra la emisión de la credencial en auditoría sin incluir el secreto.
- Se actualiza `lastUsedAt` al consultar correctamente.

## Contrato de API

### Registrar solicitud

`POST /api/applications`

La respuesta incluye `data.trackingToken`. Debe mostrarse al solicitante una sola vez y recomendarle guardarlo en un lugar privado. No debe guardarse en logs ni en almacenamiento compartido del navegador.

### Consultar estado

`POST /api/applications/track`

```json
{
  "applicationNumber": "MC-2026-XXXXXXXX",
  "accessToken": "<token privado recibido al registrar>"
}
```

Respuesta satisfactoria:

```json
{
  "success": true,
  "data": {
    "applicationNumber": "MC-2026-XXXXXXXX",
    "status": "PENDING_ASSIGNMENT",
    "createdAt": "…",
    "updatedAt": "…"
  }
}
```

## Límites y validación pendiente

- No se añadió autenticación tradicional ni cuentas para solicitantes.
- La credencial no tiene expiración automática porque el Product Owner no definió un plazo. La revocación queda contemplada en el modelo, pero no se expone aún una operación pública para regenerar o revocar tokens.
- Debe validarse el flujo de extremo a extremo con MongoDB y conectarse a la pantalla pública de seguimiento del frontend.
- La interfaz debe evitar persistir el token en localStorage/sessionStorage y no debe volver a mostrarlo después de abandonar la confirmación de registro.
- Esta rama depende de la revisión/merge de PO-01.1; el PR debe apuntar a la rama de asignación hasta que esa base llegue a main.
