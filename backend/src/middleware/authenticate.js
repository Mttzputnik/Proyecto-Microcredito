import jwt from "jsonwebtoken";
import { prisma } from "../config/prisma.js";
import { httpError, isObjectId } from "../utils/httpError.js";

export function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret === "replace-with-a-long-random-secret" || secret.length < 20) {
    // 500: es un error de configuración del servidor, no del cliente.
    throw httpError(500, "JWT_SECRET no está configurado correctamente en el .env.");
  }
  return secret;
}

export function signToken(user) {
  return jwt.sign({ sub: user.id, role: user.role }, getJwtSecret(), {
    expiresIn: process.env.JWT_EXPIRES_IN ?? "8h"
  });
}

// Lee "Authorization: Bearer <token>", valida el token y carga al usuario desde la base de datos
// (así un usuario desactivado o con rol cambiado pierde acceso de inmediato).
export async function authenticate(req, _res, next) {
  try {
    const header = req.headers.authorization ?? "";
    const [scheme, token] = header.split(" ");
    if (scheme !== "Bearer" || !token) throw httpError(401, "Debes iniciar sesión.");

    let payload;
    try {
      payload = jwt.verify(token, getJwtSecret());
    } catch (error) {
      if (error.status) throw error;
      throw httpError(401, "Sesión inválida o vencida. Inicia sesión de nuevo.");
    }

    if (!isObjectId(payload.sub)) throw httpError(401, "Sesión inválida.");
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, firstName: true, lastName: true, email: true, role: true, active: true }
    });
    if (!user || !user.active) throw httpError(401, "Usuario no disponible.");

    req.user = user;
    return next();
  } catch (error) {
    return next(error);
  }
}
