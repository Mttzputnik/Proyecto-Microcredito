// Registros de solo escritura (ADR-004): decisiones, pagos confirmados y auditoría no se sobrescriben
// ni se borran en silencio. Una corrección se registra como un NUEVO evento, nunca editando el anterior.
// Se aplica en src/config/prisma.js a TODAS las consultas que pasan por el cliente compartido.

export const IMMUTABLE_MODELS = Object.freeze(["AuditLog", "LoanDecision", "Payment"]);

const MUTATING_OPERATION = /^(update|upsert|delete)/;

export function assertMutationAllowed(model, operation) {
  if (IMMUTABLE_MODELS.includes(model) && MUTATING_OPERATION.test(operation)) {
    throw Object.assign(
      new Error(`${model} es de solo escritura: no se permite "${operation}". Registra la corrección como un nuevo evento.`),
      { status: 500, code: "IMMUTABLE_RECORD" }
    );
  }
}
