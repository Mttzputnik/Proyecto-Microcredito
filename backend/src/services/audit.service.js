// Registra un evento en AuditLog. `db` puede ser el cliente de Prisma o la transacción (tx),
// para que el registro de auditoría quede dentro de la misma transacción que el cambio.
export function writeAudit(db, { actorId, action, entityType, entityId, description, metadata }) {
  return db.auditLog.create({
    data: {
      actorId: actorId ?? null,
      action,
      entityType,
      entityId: String(entityId),
      description,
      ...(metadata ? { metadata } : {})
    }
  });
}
