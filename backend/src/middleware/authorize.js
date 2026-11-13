import { httpError } from "../utils/httpError.js";

// Debe usarse DESPUÉS de authenticate. Ejemplo: router.get("/", authenticate, authorize(...PERMISSIONS.readApplicants), handler)
export function authorize(...allowedRoles) {
  return (req, _res, next) => {
    if (!req.user) return next(httpError(401, "Debes iniciar sesión."));
    if (!allowedRoles.includes(req.user.role)) {
      return next(httpError(403, "No tienes permiso para realizar esta acción."));
    }
    return next();
  };
}
