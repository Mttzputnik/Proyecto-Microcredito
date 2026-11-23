import { Router } from "express";
import { prisma } from "../config/prisma.js";
import { authenticate } from "../middleware/authenticate.js";
import { authorize } from "../middleware/authorize.js";
import { PERMISSIONS } from "../domain/roles.js";
import { requireObjectId, parseOrThrow } from "../utils/httpError.js";
import { submitReconsiderationSchema, decideReconsiderationSchema } from "../validators/reconsideration.validator.js";
import { submitReconsideration, listAssignedReconsiderations, decideReconsideration } from "../services/reconsideration.service.js";

const router = Router();

// El solicitante demuestra control del caso mediante número + token privado.
router.post("/", async (req, res, next) => {
  const payload = parseOrThrow(submitReconsiderationSchema, req.body, "Los datos de reconsideración no son válidos.");
  try {
    const data = await submitReconsideration(prisma, payload);
    return res.status(201).json({ success: true, message: "La reconsideración fue recibida y asignada a un oficial diferente.", data });
  } catch (error) {
    return next(error);
  }
});

router.use(authenticate);

router.get("/assigned", authorize(...PERMISSIONS.readApplications), async (req, res) => {
  const data = await listAssignedReconsiderations(prisma, req.user);
  res.json({ success: true, data });
});

router.patch("/:id/decision", authorize(...PERMISSIONS.changeApplicationStatus), async (req, res) => {
  const reconsiderationId = requireObjectId(req.params.id);
  const payload = parseOrThrow(decideReconsiderationSchema, req.body, "Los datos de decisión no son válidos.");
  const data = await decideReconsideration(prisma, { reconsiderationId, actor: req.user, ...payload });
  res.json({ success: true, message: "La reconsideración fue resuelta.", data });
});

export default router;
