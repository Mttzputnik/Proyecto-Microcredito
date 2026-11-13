// Crea un error con código HTTP. El manejador de errores de app.js lo convierte en JSON.
export function httpError(status, message, details) {
  return Object.assign(new Error(message), { status, ...(details ? { details } : {}) });
}

// Los ids de MongoDB son 24 caracteres hexadecimales.
export const isObjectId = (value) => typeof value === "string" && /^[a-f\d]{24}$/i.test(value);

export function requireObjectId(value, label = "id") {
  if (!isObjectId(value)) throw httpError(404, `Recurso no encontrado (${label} inválido).`);
  return value;
}

// Convierte los errores de Zod en una respuesta 400 con el detalle por campo.
export function parseOrThrow(schema, data, message = "Los datos enviados no son válidos.") {
  const parsed = schema.safeParse(data);
  if (!parsed.success) {
    throw httpError(
      400,
      message,
      parsed.error.issues.map(({ path, message: msg }) => ({ field: path.join("."), message: msg }))
    );
  }
  return parsed.data;
}
