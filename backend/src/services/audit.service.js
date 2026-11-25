// Registra un evento de auditoría dentro de la misma transacción que el cambio.
// db puede ser el cliente Prisma o una transacción activa.
function requiredText(value, field, maxLength) {
  if (typeof value !== "string" || !value.trim() || value.trim().length > maxLength) {
    throw Object.assign(new TypeError(`El campo de auditoría "${field}" no es válido.`), {
      status: 500,
      code: "AUDIT_INVALID_EVENT"
    });
  }
  return value.trim();
}

export function writeAudit(db, event = {}) {
  if (!db?.auditLog?.create) {
    throw Object.assign(new TypeError("El destino de auditoría no está disponible."), {
      status: 500,
      code: "AUDIT_INVALID_EVENT"
    });
  }

  if (!Object.hasOwn(event, "actorId")) {
    throw Object.assign(new TypeError("El actor de auditoría debe indicarse explícitamente (usuario o sistema)."), {
      status: 500,
      code: "AUDIT_INVALID_EVENT"
    });
  }

  const actorId = event.actorId;
  if (actorId !== null && (typeof actorId !== "string" || !actorId.trim())) {
    throw Object.assign(new TypeError("El actor de auditoría no es válido."), {
      status: 500,
      code: "AUDIT_INVALID_EVENT"
    });
  }

  const action = requiredText(event.action, "action", 100);
  const entityType = requiredText(event.entityType, "entityType", 100);
  const entityId = requiredText(String(event.entityId ?? ""), "entityId", 200);
  const description = requiredText(event.description, "description", 1000);

  if (event.metadata !== undefined &&
      (event.metadata === null || typeof event.metadata !== "object" || Array.isArray(event.metadata))) {
    throw Object.assign(new TypeError("Los metadatos de auditoría deben ser un objeto JSON."), {
      status: 500,
      code: "AUDIT_INVALID_EVENT"
    });
  }

  return db.auditLog.create({
    data: {
      actorId,
      action,
      entityType,
      entityId,
      description,
      ...(event.metadata !== undefined ? { metadata: event.metadata } : {})
    }
  });
}
