import { writeAudit } from "./audit.service.js";

const ACTIVE_APPLICATION_STATUSES = ["SUBMITTED", "UNDER_REVIEW", "NEEDS_INFORMATION"];
const PENDING_APPLICATION_STATUSES = ["PENDING_ASSIGNMENT", "SUBMITTED"];

// Selecciona al oficial con menor carga activa. En empate, prioriza al que lleva
// más tiempo sin recibir una asignación; el alta más antigua desempata casos restantes.
export function selectOfficerByWorkload(officers, assignedApplications) {
  if (!officers.length) return null;

  const workload = new Map(officers.map((officer) => [officer.id, {
    officer,
    activeCount: 0,
    lastAssignedAt: null
  }]));

  for (const application of assignedApplications) {
    const current = workload.get(application.assignedOfficerId);
    if (!current) continue;
    current.activeCount += 1;
    const assignedAt = application.assignedAt ?? application.createdAt;
    if (assignedAt && (!current.lastAssignedAt || assignedAt > current.lastAssignedAt)) {
      current.lastAssignedAt = assignedAt;
    }
  }

  return [...workload.values()].sort((a, b) => {
    if (a.activeCount !== b.activeCount) return a.activeCount - b.activeCount;
    if (!a.lastAssignedAt && b.lastAssignedAt) return -1;
    if (a.lastAssignedAt && !b.lastAssignedAt) return 1;
    if (a.lastAssignedAt && b.lastAssignedAt && a.lastAssignedAt.getTime() !== b.lastAssignedAt.getTime()) {
      return a.lastAssignedAt - b.lastAssignedAt;
    }
    return a.officer.createdAt - b.officer.createdAt;
  })[0];
}

// Asigna la cola pendiente en orden de llegada. Recibe el cliente Prisma o una
// transacción activa para que cada asignación y su auditoría sean atómicas.
export async function assignPendingApplications(db, { limit = 100 } = {}) {
  const officers = await db.user.findMany({
    where: { role: "CREDIT_OFFICER", active: true },
    select: { id: true, createdAt: true },
    orderBy: { createdAt: "asc" }
  });

  if (!officers.length) {
    const pendingCount = await db.loanApplication.count({
      where: { assignedOfficerId: null, status: { in: PENDING_APPLICATION_STATUSES } }
    });
    return { assigned: 0, pending: pendingCount };
  }

  const officerIds = officers.map(({ id }) => id);
  const [assignedApplications, pendingApplications] = await Promise.all([
    db.loanApplication.findMany({
      where: {
        assignedOfficerId: { in: officerIds },
        status: { in: ACTIVE_APPLICATION_STATUSES }
      },
      select: { assignedOfficerId: true, assignedAt: true, createdAt: true }
    }),
    db.loanApplication.findMany({
      where: {
        assignedOfficerId: null,
        status: { in: PENDING_APPLICATION_STATUSES }
      },
      orderBy: { createdAt: "asc" },
      take: limit,
      select: { id: true, status: true, createdAt: true }
    })
  ]);

  const workload = assignedApplications.slice();
  let assigned = 0;

  for (const application of pendingApplications) {
    const selected = selectOfficerByWorkload(officers, workload);
    if (!selected) break;

    const assignedAt = new Date();
    const updated = await db.loanApplication.updateMany({
      where: {
        id: application.id,
        assignedOfficerId: null,
        status: application.status
      },
      data: {
        assignedOfficerId: selected.officer.id,
        assignedAt,
        status: "SUBMITTED"
      }
    });

    // La condición evita asignar dos veces si otra ejecución tomó el caso primero.
    if (updated.count !== 1) continue;

    await writeAudit(db, {
      actorId: null,
      action: "APPLICATION_AUTO_ASSIGNED",
      entityType: "LoanApplication",
      entityId: application.id,
      description: "Solicitud asignada automáticamente a un oficial de crédito.",
      metadata: {
        method: "LOWEST_ACTIVE_WORKLOAD",
        tieBreak: "OLDEST_LAST_ASSIGNMENT",
        assignedOfficerId: selected.officer.id,
        activeWorkloadBeforeAssignment: selected.activeCount,
        assignedAt: assignedAt.toISOString()
      }
    });

    workload.push({
      assignedOfficerId: selected.officer.id,
      assignedAt,
      createdAt: application.createdAt
    });
    assigned += 1;
  }

  const pending = await db.loanApplication.count({
    where: { assignedOfficerId: null, status: { in: PENDING_APPLICATION_STATUSES } }
  });

  return { assigned, pending };
}
