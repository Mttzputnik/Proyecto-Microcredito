# Implementación de seguridad PO-02 — protección del perfil del solicitante

**Rama:** `fix/po-02-proteger-perfil-solicitante`  
**Base:** `main`  
**Alcance de esta entrega:** evitar la modificación no autenticada del perfil global durante la presentación de una nueva solicitud.

## Regla funcional aplicada

El Product Owner establece que el solicitante no puede modificar los datos originales después de presentar una solicitud. Puede presentar información complementaria, pero esta no debe sobrescribir el expediente original.

## Cambio implementado

- `POST /api/applications` sigue siendo público para permitir la presentación de solicitudes sin cuenta.
- Si el documento no existe, se crea el perfil del solicitante.
- Si el documento ya existe, se reutiliza el registro sin ejecutar ninguna actualización.
- Los datos enviados para la nueva solicitud se guardan en `ApplicationApplicantSnapshot`, vinculados al expediente nuevo.
- De esta manera se conserva el historial declarado por cada solicitud y se evita que conocer el documento de otra persona permita modificar su perfil global.

## Pruebas añadidas

- Reutilización del perfil existente sin modificar nombre, apellidos ni información financiera.
- Creación de un perfil cuando el documento todavía no existe.

Archivo de pruebas: `backend/test/applicantSubmission.test.js`.

## Pendiente para completar PO-02

- Añadir limitación de peticiones al formulario público y al inicio de sesión.
- Añadir pruebas de integración HTTP para demostrar que una segunda solicitud con el mismo documento no altera el perfil anterior y conserva su propio snapshot.
- Verificar el aislamiento de consultas de seguimiento y el manejo de tokens revocados.
- Definir y probar un flujo seguro para correcciones o información complementaria sin modificar los datos originales.
- Ejecutar las pruebas contra una base de integración cuyo nombre termine en `_test`.

## Seguridad y alcance

No se modifica el endpoint autenticado `PATCH /api/applicants/:id`; permanece deshabilitado para todos los roles mientras no exista una regla aprobada para corregir perfiles. Tampoco se cambia la matriz de permisos ni se habilita acceso adicional a datos personales.
