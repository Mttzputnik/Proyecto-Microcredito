# Implementación: políticas autorizadas, aprobaciones condicionadas y reglas financieras

**Rama:** `feat/politicas-aprobacion-condicionada-reglas-financieras`  
**Base:** `main`  
**Estado:** implementación preparada; requiere validación local y aplicación del cambio de esquema antes de fusionar.

## 1. Políticas de crédito con autorización institucional

### Contrato de creación

La creación de una nueva versión exige que el analista registre todos los parámetros que la evaluación utiliza:

- Edad mínima.
- Monto máximo.
- Plazo máximo.
- Relación máxima deuda/ingreso.
- Tasa anual.
- Máximo de préstamos simultáneos.
- Al menos un propósito permitido.
- Regla de verificación de residencia.
- Referencia del acta o resolución aprobatoria.
- Fecha de aprobación institucional.

No se incorporan umbrales numéricos por defecto. La interfaz exige que el analista introduzca los valores aprobados. La API y el servicio vuelven a validar que la política esté completa.

### Uso de políticas

- `isCreditPolicyReady` comprueba integridad y referencia de aprobación.
- La búsqueda de política vigente excluye versiones incompletas o sin aprobación registrada.
- Una evaluación que seleccione explícitamente una política también valida su integridad y vigencia.
- La fecha de entrada en vigor no puede ser anterior a la fecha de aprobación.
- Las versiones anteriores conservan su período de vigencia. Una versión futura no desactiva anticipadamente la política que todavía rige.
- La interfaz distingue las políticas históricas y las activas que están bloqueadas por falta de configuración o referencia.

**Límite:** el sistema almacena la referencia y fecha de aprobación declaradas por el analista; no consulta por sí mismo el acta de la cooperativa ni certifica su autenticidad. La validación documental institucional sigue siendo responsabilidad de la cooperativa.

## 2. Flujo de aprobación condicionada

Se incorpora el modelo `ConditionalApproval`, separado de `LoanDecision` para no modificar la decisión histórica inmutable.

### Flujo

1. El oficial registra una decisión `APPROVED_WITH_CONDITIONS` con justificación y condiciones.
2. En la misma transacción se crea el seguimiento de cumplimiento con estado `PENDING`.
3. La solicitud permanece en `APPROVED_WITH_CONDITIONS`; no puede formalizarse.
4. El oficial asignado revisa los soportes y registra evidencia de cumplimiento.
5. El servicio valida que el expediente siga asignado al oficial, que esté pendiente y que no tenga un préstamo formalizado.
6. En una transacción se marca el cumplimiento como `VERIFIED`, se registra responsable/fecha/evidencia y se cambia el estado de la solicitud a `APPROVED`.
7. Se generan eventos de auditoría para la verificación y el cambio de estado.
8. La formalización comprueba nuevamente que, si la decisión fue condicionada, exista un seguimiento `VERIFIED`. Para expedientes históricos sin el nuevo registro, la primera verificación inicializa el seguimiento a partir de la decisión original y luego exige la evidencia del oficial.

La API impide cambiar directamente de `APPROVED_WITH_CONDITIONS` a `APPROVED` mediante el endpoint genérico de estados. La única vía es la verificación de condiciones.

### Endpoint nuevo

`PATCH /api/applications/:id/conditional-approval/verify`

Payload:

```json
{
  "notes": "Evidencia revisada y cumplimiento comprobado por el oficial asignado."
}
```

La nota debe tener al menos 10 caracteres. El endpoint usa el permiso de cambio de estado y verifica nuevamente la asignación en el servicio.

**Alcance:** el expediente guarda las condiciones como el texto registrado en la decisión y una nota de evidencia de su verificación conjunta. No convierte automáticamente un párrafo libre en una lista de condiciones independientes.

## 3. Reglas financieras de reestructuración

Las políticas de reestructuración nuevas requieren:

- Referencia de acta o resolución aprobatoria.
- Fecha de aprobación institucional.
- Fecha de entrada en vigor igual o posterior a la aprobación.
- Los límites financieros y operativos ya exigidos por el formulario.

Las políticas anteriores sin referencia/fecha de aprobación no se ofrecen para nuevas solicitudes. Deben publicarse nuevas versiones con parámetros aprobados.

### Restricciones preservadas y reforzadas

- El motor solo admite cronogramas mensuales; se rechaza cualquier frecuencia distinta.
- No se calcula automáticamente interés de mora.
- Un importe manual de interés de mora solo se acepta cuando la política lo permite y se adjunta referencia/soporte contable.
- Si el tratamiento de interés es `WAIVE` o `NOT_APPLICABLE`, no se admite introducir un importe manual.
- Si la política exige pagar cuotas vencidas, la activación se bloquea mientras exista saldo vencido.
- Si la política permite incorporarlas, el saldo de capital pendiente entra en el nuevo saldo según el cálculo existente.
- La inclusión de intereses corrientes vencidos continúa gobernada por `includeAccruedInterest`.
- La tasa propuesta no puede superar el límite registrado en la política.
- El límite de aprobación del oficial continúa determinando el escalamiento al comité.

No se agregan fórmulas de interés de mora ni se asumen valores institucionales.

## 4. Archivos principales

- `backend/prisma/schema.prisma`: referencias de aprobación y modelo `ConditionalApproval`.
- `backend/src/services/policy.service.js`: integridad, vigencia y versionado.
- `backend/src/services/evaluation.service.js`: validación de política antes de evaluar.
- `backend/src/services/applicationStatus.service.js`: creación y verificación de condiciones.
- `backend/src/routes/application.management.routes.js`: endpoint de verificación.
- `backend/src/services/loan.service.js`: bloqueo de formalización.
- `backend/src/services/restructuring.service.js`: autorización, frecuencia y tratamiento de intereses.
- `backend/src/validators/finance.validator.js` y `restructuring.validator.js`: contratos de entrada.
- `frontend/src/pages/internal/PoliciesPage.jsx`: captura de umbrales y referencia.
- `frontend/src/pages/internal/RiskEvaluationPage.jsx`: seguimiento y verificación de condiciones.
- `frontend/src/pages/internal/RestructuringsPage.jsx`: captura de aprobación institucional.

## 5. Aplicación local y validación

Desde `backend`:

```bash
npx prisma format
npx prisma validate
npx prisma generate
npx prisma db push
node --test test/policy.validator.test.js test/evaluation.test.js test/applicationStatus.test.js test/loan.service.test.js test/restructuring.validator.test.js test/restructuring.domain.test.js test/restructuring.permissions.test.js
```

Desde `frontend`:

```bash
npm run build
```

`db push` incorpora el modelo nuevo y los campos opcionales de aprobación. No elimina ni sobrescribe decisiones, pagos o políticas existentes. Las políticas históricas que no tengan referencia/fecha quedan fuera de selección hasta que el analista publique una versión autorizada.

No se incluye ni se solicita ejecutar la suite de integración global PO-12.
