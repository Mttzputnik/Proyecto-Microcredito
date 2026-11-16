import { Router } from "express";
import { prisma } from "../config/prisma.js";
import { authenticate } from "../middleware/authenticate.js";
import { authorize } from "../middleware/authorize.js";
import { PERMISSIONS } from "../domain/roles.js";
import { policySchema } from "../validators/finance.validator.js";
import { createPolicyVersion, findActivePolicy } from "../services/policy.service.js";
import { httpError, parseOrThrow } from "../utils/httpError.js";

// Políticas de crédito CONFIGURABLES: tasas y límites viven aquí como datos, no en el código.
// Las políticas no se editan: crear una con el mismo nombre genera una versión nueva.
const router = Router();
router.use(authenticate);

// GET /api/policies/active  -> política vigente
router.get("/active", authorize(...PERMISSIONS.readPolicies), async (_req, res) => {
  const policy = await findActivePolicy(prisma);
  if (!policy) throw httpError(404, "No hay una política de crédito activa.");
  res.json({ success: true, data: policy });
});

// GET /api/policies  -> todas las versiones
router.get("/", authorize(...PERMISSIONS.readPolicies), async (_req, res) => {
  const policies = await prisma.creditPolicy.findMany({ orderBy: [{ name: "asc" }, { version: "desc" }] });
  res.json({ success: true, data: policies });
});

// POST /api/policies  (solo ADMIN) -> nueva política o nueva versión de una existente
router.post("/", authorize(...PERMISSIONS.managePolicies), async (req, res) => {
  const data = parseOrThrow(policySchema, req.body);
  const policy = await createPolicyVersion(prisma, { data, actor: req.user });
  res.status(201).json({ success: true, data: policy });
});

export default router;
