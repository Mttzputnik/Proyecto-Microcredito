# Informe de pruebas y validación

**Fecha de corte documental:** 25 de noviembre de 2026  
**Propósito:** registrar evidencia conocida sin atribuir ejecuciones que no se hayan realizado durante esta actualización documental.

## 1. Alcance de pruebas del backend

El proyecto usa el ejecutor nativo `node:test` mediante:

```bash
cd backend
npm test
```

La carpeta `backend/test` contiene pruebas para, entre otros, los siguientes módulos:

| Área | Archivos de prueba identificados |
|---|---|
| Solicitudes y seguimiento | `applicantSubmission.test.js`, `application.validator.test.js`, `applicationTracking.test.js`, `applicationAssignment.test.js` |
| Autorización y estados | `authorize.test.js`, `applicationStatus.test.js`, `states.test.js` |
| Evaluación y políticas | `evaluation.test.js`, `evaluation.po03.test.js`, `policy.validator.test.js` |
| Reconsideración e historial | `reconsideration.test.js`, `internalHistory.test.js` |
| Mora y pagos | `arrears.test.js`, `arrearsMonitoring.test.js`, `payments.test.js`, `finance.test.js`, `loan.service.test.js` |
| Reestructuración | `restructuring.domain.test.js`, `restructuring.permissions.test.js`, `restructuring.validator.test.js` |
| Reportes y auditoría | `report.service.test.js`, `audit.service.test.js`, `auditQuery.service.test.js`, `immutability.test.js` |
| Integración | `integration.flow.test.js` |

## 2. Prueba de integración PO-12

`backend/test/integration.flow.test.js` recorre un flujo real de API contra MongoDB. Incluye autenticación, permisos, solicitud pública, asignación, evaluación, decisión, formalización, desembolso, cronograma, mora, pagos, historial, reconsideración, reestructuración y restricciones de castigo.

La prueba está condicionada a que `TEST_DATABASE_URL` apunte a una base cuyo nombre termine en `_test`. Al finalizar ejecuta `dropDatabase` sobre esa base. Por seguridad:

- No ejecutar con la URI de desarrollo o producción.
- No usar una base compartida.
- Confirmar el nombre de la base antes de ejecutar.
- Si no se configura una URI con sufijo `_test`, la prueba queda omitida.

## 3. Evidencia histórica disponible

En una ejecución compartida antes de integrar la corrección de PO-04 se reportó:

- 154 pruebas aprobadas.
- 1 prueba fallida.
- 1 prueba de integración omitida.
- La falla estaba en `applicationStatus.test.js`: el texto de justificación era demasiado corto y la validación de longitud se ejecutaba antes de la regla de transición que la prueba pretendía comprobar.
- La corrección actualizó el dato de prueba, sin cambiar el servicio de producción, y se integró mediante PR #38.
- En esa misma revisión se había informado que el build frontend con Vite finalizaba correctamente.

Después de la integración de PR #38, el usuario confirmó que todo funcionaba correctamente. Sin embargo, no se dispone en esta actualización de un nuevo resumen cuantitativo de `npm test`, de una ejecución PO-12 con MongoDB `_test`, ni de una nueva salida de build. Por tanto, **no se publica un conteo posterior ni se declara una ejecución integral reciente como verificada**.

## 4. Procedimiento recomendado para cerrar validación

### Backend: pruebas unitarias y de servicio

```bash
cd backend
npm test
```

Registrar fecha, versión de Node.js, cantidad de pruebas aprobadas/fallidas/omitidas y salida de errores.

### Prisma

```bash
cd backend
npx prisma format
npx prisma validate
npx prisma generate
```

Ejecutar `db push` únicamente cuando el equipo lo requiera y contra la base correcta; no forma parte de una prueba inocua de documentación.

### Integración PO-12

Configurar `TEST_DATABASE_URL` en el entorno local con una base MongoDB desechable cuyo nombre termine en `_test`, verificar la URI y ejecutar la prueba. La suite puede eliminar esa base al finalizar.

### Frontend

```bash
cd frontend
npm run build
```

## 5. Plantilla para registrar una ejecución nueva

| Campo | Resultado |
|---|---|
| Fecha y hora | Pendiente de ejecución |
| Rama / commit | Pendiente de registrar |
| Backend `npm test` | Pendiente de ejecución |
| Prueba PO-12 con base `_test` | Pendiente de ejecución |
| Prisma validate | Pendiente de ejecución |
| Prisma generate | Pendiente de ejecución |
| Frontend `npm run build` | Pendiente de ejecución |
| Incidencias | Registrar únicamente errores observados |

## 6. Criterio de cierre

La documentación funcional y técnica está preparada, pero el cierre de pruebas requiere adjuntar resultados actuales del commit candidato. No confundir la presencia de archivos de prueba, una ejecución histórica o la confirmación conversacional de que una corrección funcionó con una ejecución reproducible de la suite completa.
