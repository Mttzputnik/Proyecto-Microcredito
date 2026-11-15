// Estados y transiciones permitidas del dominio.
//
// Los nombres de estado son los que ya usa schema.prisma (se guardan como String)
// y los documentados en backend/MODELO_DOMINIO_BD.md. NO se agregan estados nuevos aquí:
// si el Product Owner pide uno, primero se actualiza el documento y luego este archivo.
//
// Un arreglo vacío significa estado terminal.
// Las transiciones son una PROPUESTA pendiente de validar con el Product Owner.

const freeze = (map) =>
  Object.freeze(Object.fromEntries(Object.entries(map).map(([k, v]) => [k, Object.freeze(v)])));

export const applicationTransitions = freeze({
  SUBMITTED: ["UNDER_REVIEW", "CANCELLED"],
  UNDER_REVIEW: ["NEEDS_INFORMATION", "APPROVED", "REJECTED", "CANCELLED"],
  NEEDS_INFORMATION: ["UNDER_REVIEW", "CANCELLED"],
  APPROVED: ["CANCELLED"],
  REJECTED: [],
  CANCELLED: []
});

export const loanTransitions = freeze({
  PENDING_DISBURSEMENT: ["ACTIVE"],
  ACTIVE: ["PAID", "WRITTEN_OFF"],
  PAID: [],
  WRITTEN_OFF: []
});

export const installmentTransitions = freeze({
  PENDING: ["PARTIALLY_PAID", "PAID", "OVERDUE"],
  PARTIALLY_PAID: ["PAID", "OVERDUE"],
  OVERDUE: ["PARTIALLY_PAID", "PAID"],
  PAID: []
});

export const canTransition = (transitions, from, to) =>
  Boolean(transitions[from]?.includes(to));

// Lanza un error con status 409 que el manejador de errores de app.js ya devuelve como JSON.
export function assertTransition(transitions, from, to, entityName = "Registro") {
  if (!(from in transitions)) {
    throw Object.assign(new Error(`${entityName}: estado desconocido "${from}"`), { status: 500 });
  }
  if (!canTransition(transitions, from, to)) {
    const allowed = transitions[from].length ? transitions[from].join(", ") : "ninguno (estado final)";
    throw Object.assign(
      new Error(`${entityName}: no se puede pasar de ${from} a ${to}. Permitidos: ${allowed}`),
      { status: 409 }
    );
  }
}
