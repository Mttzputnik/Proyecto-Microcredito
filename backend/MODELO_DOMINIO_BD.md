# Documentación del Modelo de Dominio y Base de Datos (MongoDB)

## 1. Entidades Principales y Colecciones
- **users:** Credenciales, roles y autenticación de los usuarios del sistema (Clientes, Analistas, Administradores).
- **clients:** Perfil socioeconómico del cliente solicitante (vinculado a un registro de `users`).
- **loans:** Objeto principal del crédito. Incluye montos, tasa, estado global y contiene dos subdocumentos (arrays embebidos):
  - `installments`: Plan de amortización (cuotas mensuales con capital, interés y fechas límite).
  - `payments`: Registro e historial inmutable de pagos recibidos.

---

## 2. Máquina de Estados (Ciclo de Vida)

### Estados del Crédito (`loan.status`)
1. **`BORRADOR`**: Solicitud iniciada por el cliente pero aún no enviada a evaluación.
2. **`EN_ESTUDIO`**: Enviada y en proceso de revisión por parte del analista financiero.
3. **`APROBADO`**: Evaluada positivamente por el analista, lista para el desembolso.
4. **`RECHAZADO`**: La solicitud no superó las políticas de riesgo crediticio.
5. **`ACTIVO`**: Crédito desembolsado con su plan de pagos corriendo.
6. **`PAGADO`**: Totalidad del capital e intereses saldados por el cliente.
7. **`CASTIGADO`**: En mora prolongada e incobrable.

### Estados de la Cuota (`installment.status`)
1. **`PENDIENTE`**: Cuota vigencia con fecha límite futura.
2. **`PAGADA`**: Cuota saldada en su totalidad.
3. **`VENCIDA`**: Pasó la fecha de vencimiento sin registro de pago completo.

---

## 3. Reglas de Negocio Backend
1. **Límite de Capacidad de Pago:** La cuota estimada del crédito solicitado no puede superar el 40% del ingreso mensual neto del cliente (`monthlyIncome`).
2. **Generación Automática del Cronograma:** Al cambiar el estado del crédito a `ACTIVO`, el backend debe generar automáticamente el array de cuotas (`installments`) aplicando el cálculo de amortización según el plazo (`termMonths`) e interés (`interestRate`).
3. **Bloqueo por Mora:** Un cliente con al menos una cuota en estado `VENCIDA` en un crédito activo no puede solicitar un nuevo microcrédito.
