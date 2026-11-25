export async function listAuditEvents(prisma, filters = {}) {
  const { from, to, action, entityType, page = 1, limit = 50 } = filters;
  const where = {
    ...(from || to ? { occurredAt: { ...(from ? { gte: new Date(from) } : {}), ...(to ? { lte: new Date(to) } : {}) } } : {}),
    ...(action ? { action } : {}),
    ...(entityType ? { entityType } : {})
  };
  const [total, events] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      where,
      orderBy: [{ occurredAt: "desc" }, { id: "desc" }],
      skip: (page - 1) * limit,
      take: limit,
      select: { id: true, actorId: true, action: true, entityType: true, entityId: true, description: true, occurredAt: true }
    })
  ]);
  const actorIds = [...new Set(events.map((event) => event.actorId).filter(Boolean))];
  const actors = actorIds.length
    ? await prisma.user.findMany({ where: { id: { in: actorIds } }, select: { id: true, firstName: true, lastName: true } })
    : [];
  const actorNames = new Map(actors.map((actor) => [actor.id, `${actor.firstName} ${actor.lastName}`.trim()]));
  return {
    items: events.map(({ actorId, ...event }) => ({
      ...event,
      actorId,
      actorName: actorId ? actorNames.get(actorId) ?? "Usuario interno" : "Sistema"
    })),
    pagination: { page, limit, total, pages: Math.ceil(total / limit) }
  };
}

export async function getAuditSummary(prisma, filters = {}) {
  const { from, to } = filters;
  const where = {
    ...(from || to ? { occurredAt: { ...(from ? { gte: new Date(from) } : {}), ...(to ? { lte: new Date(to) } : {}) } } : {})
  };
  const events = await prisma.auditLog.findMany({
    where,
    select: { action: true, entityType: true, occurredAt: true }
  });
  const byAction = new Map();
  const byEntity = new Map();
  for (const event of events) {
    byAction.set(event.action, (byAction.get(event.action) ?? 0) + 1);
    byEntity.set(event.entityType, (byEntity.get(event.entityType) ?? 0) + 1);
  }
  return {
    totalEvents: events.length,
    byAction: [...byAction.entries()].map(([action, count]) => ({ action, count })).sort((a, b) => b.count - a.count),
    byEntity: [...byEntity.entries()].map(([entityType, count]) => ({ entityType, count })).sort((a, b) => b.count - a.count)
  };
}
