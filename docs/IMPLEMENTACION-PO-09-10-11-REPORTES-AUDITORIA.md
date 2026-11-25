# Implementación PO-09, PO-10 y avance PO-11: reportes y supervisión

## Alcance

Esta entrega reemplaza los reportes simulados por consultas a la base de datos, ofrece indicadores agregados para el comité supervisor y conecta la pantalla administrativa con los eventos persistidos de auditoría.

## API

### `GET /api/reports`

Requiere autenticación y permiso `readPortfolioReports`, asignado al área administrativa y al comité supervisor.

Filtros opcionales:
- `from`: fecha/hora ISO 8601 inclusiva.
- `to`: fecha/hora ISO 8601 inclusiva.

Si no se envía un rango, solicitudes y pagos se consultan para los últimos 12 meses. Los indicadores de cartera vigente representan el estado actual, independientemente del rango histórico seleccionado.

La respuesta contiene:
- Saldo pendiente de la cartera activa, préstamos activos, pagos confirmados del periodo y tasa de mora.
- Solicitudes por estado, tasa de aprobación y resultados de decisión.
- Cuotas, préstamos y saldo agrupados por categoría de mora.
- Indicadores agregados por municipio, zona de residencia y propósito.
- Comportamiento de cartera activa y mora por propósito, con umbral mínimo de grupo.
- Aprobaciones condicionadas justificadas, decisiones justificadas y tiempo promedio hasta decisión.

### `GET /api/audit`

Requiere autenticación y permiso `readAuditEvents`, reservado al área administrativa.

Filtros opcionales:
- `from`, `to`: fechas ISO 8601.
- `action`: acción exacta.
- `entityType`: tipo de entidad.
- `page`: página (por defecto 1).
- `limit`: tamaño de página (por defecto 50; máximo 100).

La consulta devuelve actor, acción, entidad, identificador, descripción y fecha. No devuelve metadatos internos ni cargas financieras detalladas. El actor se resuelve con el nombre de usuario cuando existe; eventos automáticos aparecen como Sistema.

## Acceso y confidencialidad

- El comité supervisor puede consultar exclusivamente `/api/reports`; no tiene acceso a expedientes, préstamos individuales, pagos ni auditoría detallada.
- El área administrativa puede consultar reportes y eventos detallados de auditoría.
- Las desagregaciones por municipio, zona de residencia, propósito y comportamiento de cartera se ocultan si el grupo tiene menos de cinco registros.
- No se generan indicadores por género o edad: el modelo no define esas dimensiones como atributos de perfil autorizados para estos reportes. No se utilizan datos personales ni identificadores en los agregados.
- La comparación entre propósito y mora es descriptiva; no demuestra causalidad.

## Eventos de auditoría ya identificados en los servicios

La revisión del código encontró registros para emisión de credencial de seguimiento, asignación automática, evaluación de riesgo, verificación de residencia, cambios de estado/decisión, creación de políticas, presentación y resolución de reconsideraciones, formalización, desembolso, pagos confirmados, refresco y monitoreo de mora, registro de gestiones de cobro, atención de alertas y castigo de préstamos.

La revisión final de PO-11 debe comprobar que cada ruta que ejecuta estas operaciones usa el servicio correspondiente y que no existe una ruta alternativa que omita la auditoría. La reestructuración todavía no está implementada y deberá auditarse cuando se desarrolle.

## Interfaz

- `ReportsPage` consume la API real, permite seleccionar un periodo y exportar un CSV de agregados.
- `AuditPage` consume la API real, con filtros de fecha, acción y tipo de entidad, y paginación.
- La navegación y las rutas del frontend limitan la auditoría detallada al área administrativa y los reportes al área administrativa/comité.

## Validación

Se agregan pruebas unitarias para:
- Cálculo de saldo pendiente, pagos, mora y tasa de aprobación.
- Agregaciones por municipio, propósito y zona de residencia.
- Supresión de grupos pequeños.
- Validación de rangos de fechas.
- Paginación y resolución de actores de auditoría sin exponer metadatos.
- Permisos del comité y del área administrativa.

Comandos locales:
```bash
cd backend
npm test
npx prisma validate
npx prisma generate

cd ../frontend
npm run build
```

No ejecutar migraciones ni modificar la base de datos para esta entrega: no se agregan modelos ni campos Prisma.

## Estado y limitaciones

- PO-09: API e interfaz de reportes reales implementadas; validar con datos de desarrollo y reconciliar cifras con los registros contables del proyecto.
- PO-10: supervisión agregada implementada con municipio, zona y propósito; los datos demográficos no modelados no se inventan.
- PO-11: consulta detallada implementada y separada por permisos. Antes del cierre, revisar cobertura de auditoría de cada operación crítica y verificar que no existan rutas que permitan alterar o borrar eventos.
