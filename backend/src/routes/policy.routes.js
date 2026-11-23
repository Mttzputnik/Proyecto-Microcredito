import { Router } from "express";
import { prisma } from "../config/prisma.js";
import { authenticate } from "../middleware/authenticate.js";
import { authorize } from "../middleware/authorize.js";
import { PERMISSIONS } from "../domain/roles.js";
import { policySchema } from "../validators/finance.validator.js";
import { createPolicyVersion, findActivePolicy } from "../services/policy.service.js";
import { httpError, parseOrThrow } from "../utils/httpError.js";
const router = Router();
router.use(authenticate);
router.get("/active", authorize(...PERMISSIONS.readPolicies), async (_req, res) => {
  const policy = await findActivePolicy(prisma);
  if (!policy) throw httpError(404, "No hay una política de crédito activa.");
  res.json({ success: true, data: policy });
});
router.get("/", authorize(...PERMISSIONS.readPolicies), async (_req, res) => {
  const policies = await prisma.creditPolicy.findMany({ orderBy: [{ name: "asc" }, { version: "desc" }] });
  res.json({ success: true, data: policies });
});
// La gestión de políticas corresponde al analista de riesgo según la matriz de permisos del PO.
router.post("/", authorize(...PERMISSIONS.managePolicies), async (req, res) => {
  const data = parseOrThrow(policySchema, req.body);
  const policy = await createPolicyVersion(prisma, { data, actor: req.user });
  res.status(201).json({ success: true, data: policy });
});
export default router;
