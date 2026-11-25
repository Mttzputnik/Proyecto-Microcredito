import { httpError } from "../utils/httpError.js";
import { writeAudit } from "./audit.service.js";

export function isCreditPolicyReady(policy) {
  const requiredNumbers = ["minimumAge", "maximumAmount", "maximumTermMonths", "maxDebtRatio", "annualInterestRate", "maximumSimultaneousLoans"];
  return requiredNumbers.every((key) => Number.isFinite(policy?.[key])) &&
    Array.isArray(policy?.allowedPurposes) && policy.allowedPurposes.length > 0 &&
    typeof policy?.requireVerifiedResidence === "boolean" &&
    typeof policy?.approvalReference === "string" && policy.approvalReference.trim().length >= 5 &&
    policy?.approvalDate != null && !Number.isNaN(new Date(policy.approvalDate).getTime());
}

// Política vigente: activa, completa, autorizada, ya en vigor y no vencida. Si hay varias, la de vigencia más reciente.
// La condición "no vencida" se filtra aquí y NO en la consulta: en MongoDB, `effectiveUntil: null` no
// encuentra los documentos donde el campo no existe (Prisma no escribe los opcionales que no se envían),
// así que una política recién creada nunca aparecería como vigente.
export async function findActivePolicy(db, now = new Date()) {
  const candidates = await db.creditPolicy.findMany({
    where: { active: true, effectiveFrom: { lte: now } },
    orderBy: [{ effectiveFrom: "desc" }, { version: "desc" }]
  });
  return candidates.find((policy) => isCreditPolicyReady(policy) && (!policy.effectiveUntil || new Date(policy.effectiveUntil) >= now)) ?? null;
}

// Las políticas NO se editan (ADR-003): crear una versión nueva cierra la vigencia anterior.
// Si la nueva versión tiene fecha futura, la anterior sigue activa hasta ese momento.
export async function createPolicyVersion(prisma, { data, actor }) {
  const effectiveFrom = data.effectiveFrom ? new Date(data.effectiveFrom) : new Date();
  const approvalDate = new Date(data.approvalDate);
  if (!data.approvalReference?.trim() || Number.isNaN(approvalDate.getTime())) throw httpError(400, "La política requiere referencia y fecha de aprobación institucional.");
  if (effectiveFrom < approvalDate) throw httpError(400, "La política no puede entrar en vigor antes de su aprobación institucional.");
  if (!isCreditPolicyReady({ ...data, approvalDate })) throw httpError(400, "La política está incompleta: define todos los umbrales, propósitos, regla de residencia y referencia de aprobación.");
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
        data: { ...(effectiveFrom <= new Date() ? { active: false } : {}), effectiveUntil: effectiveFrom }
      });

      const policy = await tx.creditPolicy.create({
        data: { ...data, approvalReference: data.approvalReference.trim(), approvalDate, version, effectiveFrom, active: true }
      });

      await writeAudit(tx, {
        actorId: actor.id,
        action: "POLICY_CREATED",
        entityType: "CreditPolicy",
        entityId: policy.id,
        description: `Política "${policy.name}" versión ${policy.version} creada`,
        metadata: { name: policy.name, version: policy.version, approvalReference: policy.approvalReference, approvalDate: policy.approvalDate.toISOString() }
      });
      return policy;
    });
  } catch (error) {
    if (error.code === "P2002") throw httpError(409, "Otra persona creó una versión al mismo tiempo. Intenta de nuevo.");
    throw error;
  }
}
