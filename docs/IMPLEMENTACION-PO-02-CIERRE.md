# PO-02 — Cierre de seguimiento seguro

**Rama:** `fix/po-02-minimizar-seguimiento-publico`  
**Base:** `main`  
**Alcance:** seguimiento público mediante número de caso y token secreto, protección del perfil global del solicitante y conservación del snapshot por expediente.

## Reglas y comportamiento implementado

- El formulario de nueva solicitud es guiado y conserva los datos por pasos.
- Cada envío crea un número de caso único.
- El sistema genera un token aleatorio de 256 bits y lo entrega una sola vez en la respuesta de creación.
- MongoDB conserva únicamente el hash SHA-256 del token; la comparación se realiza en tiempo constante.
- La consulta pública usa `POST /api/applications/track`; el token viaja en el cuerpo y nunca en la URL.
- El seguimiento devuelve únicamente número de caso, estado y fechas. No entrega identidad, datos financieros, monto, documentos, evaluaciones, decisiones, credenciales ni asignación del oficial.
- Los resultados de seguimiento llevan `Cache-Control: no-store, private` y `Pragma: no-cache`.
- Un caso inexistente, una credencial incorrecta o una credencial revocada produce el mismo error público.
- Las consultas válidas actualizan `lastUsedAt`.
- Los endpoints públicos de presentación, seguimiento y reconsideración tienen limitación de intentos por IP configurable por variables de entorno.
- Una nueva presentación que reutiliza un documento no actualiza el perfil global existente. Los datos declarados se guardan en el snapshot inmutable del nuevo expediente.
- El solicitante no necesita cuenta ni contraseña.

## Cambios de esta entrega

La ruta de seguimiento delega su lógica en `lookupApplicationTracking`, que puede probarse de forma aislada. La respuesta pública se construye mediante `toPublicTrackingStatus`, una proyección con lista explícita de campos permitidos. La pantalla pública reconoce también el estado `APPROVED_WITH_CONDITIONS`.

## Pruebas

Se amplía `backend/test/applicationTracking.test.js` para cubrir:
- Emisión de token y validación de hash.
- Proyección pública sin campos personales, financieros ni internos.
- Consulta válida y actualización de `lastUsedAt`.
- Token incorrecto.
- Credencial revocada y caso inexistente con la misma respuesta.

Prueba específica:

```bash
node --test test/applicationTracking.test.js test/applicantSubmission.test.js test/application.validator.test.js test/rateLimit.test.js
```

No ejecutar la suite de integración global asociada a PO-12 como parte de esta validación.

## Límites conocidos

- No se implementa expiración automática del token porque el Product Owner no definió un plazo.
- El modelo contempla revocación, pero no se expone una operación pública para revocar o regenerar credenciales.
- El limitador actual guarda contadores en memoria por instancia; para despliegues con varias instancias debe configurarse un almacén compartido.
- El guardado de borradores no se incorpora: no está definido como regla confirmada del Product Owner.
- El flujo de información complementaria y adjuntos de reconsideración se implementó en el PR #34, ya fusionado.

## Aplicación local

No requiere cambios de esquema Prisma. Ejecutar las pruebas específicas anteriores y el build de frontend:

```bash
npm run build
```
