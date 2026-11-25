# Implementación PO-06: clasificación y alertas de mora

## Alcance

Esta entrega implementa clasificación automática de cuotas vencidas, alertas administrativas y visualización de cartera por categoría. No agrega intereses de mora, penalidades ni cambios automáticos al estado general del préstamo.

## Convención de días

- Se utilizan días calendario completos según la zona horaria `America/Bogota` (configurable mediante `BUSINESS_TIME_ZONE`).
- La fecha de vencimiento es el día 0.
- El día siguiente al vencimiento es el día 1 de retraso.
- 1–30 días: `LIGHT_DELAY` (retraso leve).
- 31–60 días: `EARLY_ARREARS` (mora temprana).
- 61 o más: `ESTABLISHED_ARREARS` (mora establecida).

La categoría se calcula a partir de los días de retraso de cada cuota pendiente. Para agrupar un préstamo en el panel se utiliza la categoría de su cuota con mayor número de días de mora.

## Alertas

El monitor diario:
- Actualiza a `OVERDUE` las cuotas vencidas que todavía tienen saldo.
- Genera una alerta al iniciar la mora (día 1).
- Genera alertas de escalamiento al alcanzar 31 y 61 días.
- Genera alertas de vencimiento próximo para los siguientes N días.
- Recupera hitos omitidos si el proceso estuvo detenido y vuelve a ejecutarse después.
- Evita duplicados por cuota, tipo de alerta y fecha de referencia.
- Registra los eventos de monitoreo en `AuditLog`.

Las alertas administrativas se consultan desde `GET /api/loans/alerts` y se marcan como atendidas con `PATCH /api/loans/alerts/:id/read`. Las gestiones de cobro se registran con `POST /api/loans/:id/collection-actions` y se consultan en el detalle del préstamo.

## Configuración

Variables opcionales del backend:

| Variable | Valor predeterminado | Descripción |
|---|---:|---|
| `BUSINESS_TIME_ZONE` | `America/Bogota` | Zona horaria usada para determinar el día calendario de vencimiento y mora. |
| `UPCOMING_PAYMENT_ALERT_DAYS` | `3` | Anticipación de alertas de vencimiento. Entero entre 0 y 90. |
| `ARREARS_MONITOR_INTERVAL_MS` | `86400000` | Intervalo del monitor en milisegundos (24 horas). Mínimo aceptado: 60000. |

El monitor se ejecuta al iniciar el backend y luego cada intervalo configurado. En despliegues con varias instancias debe ejecutarse un solo worker o agregarse un mecanismo distribuido de exclusión mutua. El índice único de Alert reduce duplicados, pero no sustituye un coordinador distribuido.

## Modelo de datos

Se agrega `Alert`, relacionada con `Loan` y `PaymentSchedule`. Las alertas conservan el tipo, fecha de referencia, hito de días, mensaje, estado de atención y fecha de creación/lectura. También se agrega `CollectionAction`, que conserva la descripción, resultado, fecha y usuario que registró cada gestión de cobro.

## Validación

Se agregan pruebas para:
- Día 0, día 1 y fechas futuras.
- Límites 1, 30, 31, 60 y 61.
- Cuotas pagadas o sin saldo.
- Generación de alertas de vencimiento y de hitos de mora.
- Idempotencia de ejecuciones sucesivas.
- Validación de la ventana configurable.
- Registro y auditoría de gestiones de cobro.

Después de actualizar la rama:
```bash
cd backend
npx prisma format
npx prisma validate
npx prisma generate
npm test
```

Para aplicar el modelo a la base de datos de desarrollo, revisar primero la conexión y luego ejecutar:
```bash
npx prisma db push
```
