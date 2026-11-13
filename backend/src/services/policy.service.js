import { httpError } from "../utils/httpError.js";
import { writeAudit } from "./audit.service.js";

// Política vigente: activa, ya en vigor y no vencida. Si hay varias, la de vigencia más reciente.
// La condición "no vencida" se filtra aquí y NO en la consulta: en MongoDB, `effectiveUntil: null` no
// encuentra los documentos donde el campo no existe (Prisma no escribe los opcionales que no se envían),
// así que una política recién creada nunca aparecería como vigente.
export async function findActivePolicy(db, now = new Date()) {
  const candidates = await db.creditPolicy.findMany({
    where: { active: true, effectiveFrom: { lte: now } },
    orderBy: [{ effectiveFrom: "desc" }, { version: "desc" }]
  });
  return candidates.find((policy) => !policy.effectiveUntil || new Date(policy.effectiveUntil) >= now) ?? null;
}

// Las políticas NO se editan (ADR-003): crear una con el mismo nombre genera una versión nueva
// y deja las anteriores inactivas. Las evaluaciones antiguas siguen apuntando a su versión.
export async function createPolicyVersion(prisma, { data, actor }) {
  const effectiveFrom = data.effectiveFrom ? new Date(data.effectiveFrom) : new Date();
  try {
    return await prisma.$transaction(async (tx) => {
      const latest = await tx.creditPolicy.findFirst({
        where: { name: data.name },
        orderBy: { version: "desc" },
        select: { version: true }
      });
      const version = (latest?.version ?? 0) + 1;

      await tx.creditPolicy.updateMany({
        where: { name: data.name, active: true },
        data: { active: false, effectiveUntil: effectiveFrom }
      });

      const policy = await tx.creditPolicy.create({
        data: { ...data, version, effectiveFrom, active: true }
      });

      await writeAudit(tx, {
        actorId: actor.id,
        action: "POLICY_CREATED",
        entityType: "CreditPolicy",
        entityId: policy.id,
        description: `Política "${policy.name}" versión ${policy.version} creada`,
        metadata: { name: policy.name, version: policy.version }
      });
      return policy;
    });
  } catch (error) {
    if (error.code === "P2002") throw httpError(409, "Otra persona creó una versión al mismo tiempo. Intenta de nuevo.");
    throw error;
  }
}
