import { Router } from "express";
import { prisma } from "../config/prisma.js";
import { authenticate } from "../middleware/authenticate.js";
import { authorize } from "../middleware/authorize.js";
import { PERMISSIONS } from "../domain/roles.js";
import { evaluationSchema, residenceVerificationSchema } from "../validators/finance.validator.js";
import { evaluateApplication, verifyApplicationResidence } from "../services/evaluation.service.js";
import { parseOrThrow, requireObjectId, httpError } from "../utils/httpError.js";
const router = Router();
router.use(authenticate);
router.post("/:id/evaluations", authorize(...PERMISSIONS.evaluateApplications), async (req, res) => {
  const applicationId = requireObjectId(req.params.id);
  const { policyId } = parseOrThrow(evaluationSchema, req.body ?? {});
  const evaluation = await evaluateApplication(prisma, { applicationId, actor: req.user, policyId });
  res.status(201).json({ success: true, data: evaluation });
});
router.get("/:id/evaluations", authorize(...PERMISSIONS.readApplications), async (req, res) => {
  const applicationId = requireObjectId(req.params.id);
  const assigned = await prisma.loanApplication.findFirst({
    where: { id: applicationId, assignedOfficerId: req.user.id }, select: { id: true }
  });
  if (!assigned) throw httpError(404, "Solicitud no encontrada.");
  const evaluations = await prisma.riskEvaluation.findMany({
    where: { applicationId }, orderBy: { evaluatedAt: "desc" },
    include: { policy: { select: { id: true, name: true, version: true } } }
  });
  res.json({ success: true, data: evaluations });
});
router.post("/:id/verifications/residence", authorize(...PERMISSIONS.evaluateApplications), async (req, res) => {
  const applicationId = requireObjectId(req.params.id);
  const payload = parseOrThrow(residenceVerificationSchema, req.body);
  const verification = await verifyApplicationResidence(prisma, { applicationId, actor: req.user, ...payload });
  res.status(201).json({ success: true, data: verification });
});
export default router;
