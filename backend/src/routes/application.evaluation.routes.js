import { Router } from "express";
import { prisma } from "../config/prisma.js";
import { authenticate } from "../middleware/authenticate.js";
import { authorize } from "../middleware/authorize.js";
import { PERMISSIONS } from "../domain/roles.js";
import { evaluationSchema } from "../validators/finance.validator.js";
import { evaluateApplication } from "../services/evaluation.service.js";
import { parseOrThrow, requireObjectId } from "../utils/httpError.js";

// Se monta en /api/applications. La evaluación es apoyo a la decisión humana; no cambia el estado.
const router = Router();
router.use(authenticate);

// POST /api/applications/:id/evaluations  { policyId? }  (la solicitud debe estar UNDER_REVIEW)
router.post("/:id/evaluations", authorize(...PERMISSIONS.evaluateApplications), async (req, res) => {
  const applicationId = requireObjectId(req.params.id);
  const { policyId } = parseOrThrow(evaluationSchema, req.body ?? {});
  const evaluation = await evaluateApplication(prisma, { applicationId, actor: req.user, policyId });
  res.status(201).json({ success: true, data: evaluation });
});

// GET /api/applications/:id/evaluations  -> historial de evaluaciones
router.get("/:id/evaluations", authorize(...PERMISSIONS.readApplications), async (req, res) => {
  const applicationId = requireObjectId(req.params.id);
  const evaluations = await prisma.riskEvaluation.findMany({
    where: { applicationId },
    orderBy: { evaluatedAt: "desc" },
    include: { policy: { select: { id: true, name: true, version: true } } }
  });
  res.json({ success: true, data: evaluations });
});

export default router;
