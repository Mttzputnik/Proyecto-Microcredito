# PO-03 — Visibilidad de antecedentes de mora ya saldados

**Rama:** `feat/po-03-historial-mora-previa`
**Base:** `main`
**Alcance:** mostrar al oficial los retrasos históricos que ya fueron pagados, sin convertirlos automáticamente en un rechazo.

## Comportamiento

- La evaluación consulta las cuotas de préstamos anteriores del mismo solicitante.
- Identifica cuotas completamente saldadas después de su fecha de vencimiento.
- Calcula los días calendario entre vencimiento y pago, y ordena los antecedentes desde el más reciente.
- Expone número de préstamo, fecha de vencimiento, fecha de pago y días de retraso dentro de `indicators.internalHistory.previousDelinquencies`.
- La pantalla de evaluación presenta estos antecedentes como contexto para la revisión humana.
- Los retrasos activos continúan evaluándose mediante el indicador de mora interna activa.

## Regla funcional respetada

El Product Owner establece que los antecedentes ya saldados deben mostrarse al oficial. Un período mínimo de espera solo se aplica cuando la política vigente lo defina. Esta entrega no crea un período de espera ni modifica la recomendación por la sola existencia de mora histórica, porque el modelo de política actual no contiene ese parámetro.

## Pruebas añadidas

- Cálculo de días de retraso en calendario UTC.
- Exclusión de cuotas pagadas a tiempo, no pagadas o parcialmente pagadas.
- Verificación de que un antecedente ya saldado se conserva en los indicadores sin cambiar automáticamente la recomendación.

## Validación pendiente

Ejecutar `npm test` en `backend`, validar la evaluación con datos históricos reales de una base de pruebas y revisar visualmente la sección de antecedentes en la pantalla de evaluación.
