/**
 * Actores del dominio definidos en el enunciado del proyecto.
 *
 * Un actor del dominio no equivale automáticamente a un rol autenticado.
 * El enunciado describe responsabilidades, pero no especifica qué actores
 * deben tener credenciales ni una matriz completa de permisos. Esa relación
 * debe validarse con el Product Owner antes de cambiar la autorización.
 */
export const ACTORS = Object.freeze({
  APPLICANT: "APPLICANT",
  CREDIT_OFFICER: "CREDIT_OFFICER",
  RISK_ANALYST: "RISK_ANALYST",
  ADMINISTRATIVE_AREA: "ADMINISTRATIVE_AREA",
  SUPERVISORY_COMMITTEE: "SUPERVISORY_COMMITTEE"
});

export const ALL_ACTORS = Object.freeze(Object.values(ACTORS));
