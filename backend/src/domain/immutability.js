// Registros append-only (ADR-004): una corrección se registra como un NUEVO evento,
// nunca editando o borrando el registro histórico.
export const IMMUTABLE_MODELS = Object.freeze([
  "AuditLog",
  "LoanDecision",
  "Payment",
  "ApplicationApplicantSnapshot"
]);

const MUTATING_OPERATIONS = new Set([
  "update",
  "updateMany",
  "updateManyAndReturn",
  "upsert",
  "delete",
  "deleteMany"
]);

export function assertMutationAllowed(model, operation) {
  if (IMMUTABLE_MODELS.includes(model) && MUTATING_OPERATIONS.has(operation)) {
    throw Object.assign(
      new Error(`${model} es de solo escritura: no se permite "${operation}". Registra la corrección como un nuevo evento.`),
      { status: 500, code: "IMMUTABLE_RECORD" }
    );
  }
}
