const freeze = (map) => Object.freeze(Object.fromEntries(Object.entries(map).map(([k, v]) => [k, Object.freeze(v)])));
export const applicationTransitions = freeze({
  PENDING_ASSIGNMENT: ["SUBMITTED"],
  SUBMITTED: ["UNDER_REVIEW", "CANCELLED"],
  UNDER_REVIEW: ["NEEDS_INFORMATION", "APPROVED", "APPROVED_WITH_CONDITIONS", "REJECTED", "CANCELLED"],
  NEEDS_INFORMATION: ["UNDER_REVIEW", "CANCELLED"],
  APPROVED: ["CANCELLED"],
  APPROVED_WITH_CONDITIONS: [],
  REJECTED: [],
  CANCELLED: []
});
export const loanTransitions = freeze({
  PENDING_DISBURSEMENT: ["ACTIVE"], ACTIVE: ["PAID", "WRITTEN_OFF"], PAID: [], WRITTEN_OFF: []
});
export const installmentTransitions = freeze({
  PENDING: ["PARTIALLY_PAID", "PAID", "OVERDUE"],
  PARTIALLY_PAID: ["PAID", "OVERDUE"],
  OVERDUE: ["PARTIALLY_PAID", "PAID"], PAID: []
});
export const canTransition = (transitions, from, to) => Boolean(transitions[from]?.includes(to));
export function assertTransition(transitions, from, to, entityName = "Registro") {
  if (!(from in transitions)) throw Object.assign(new Error(`${entityName}: estado desconocido "${from}"`), { status: 500 });
  if (!canTransition(transitions, from, to)) {
    const allowed = transitions[from].length ? transitions[from].join(", ") : "ninguno (estado final)";
    throw Object.assign(new Error(`${entityName}: no se puede pasar de ${from} a ${to}. Permitidos: ${allowed}`), { status: 409 });
  }
}
