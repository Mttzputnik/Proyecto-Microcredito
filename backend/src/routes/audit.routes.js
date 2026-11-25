import { Router } from "express";
import { prisma } from "../config/prisma.js";
import { authenticate } from "../middleware/authenticate.js";
import { authorize } from "../middleware/authorize.js";
import { PERMISSIONS } from "../domain/roles.js";
import { listAuditEvents } from "../services/auditQuery.service.js";
import { parseOrThrow } from "../utils/httpError.js";
import { auditQuerySchema } from "../validators/audit.validator.js";

const router = Router();
router.use(authenticate);

// La consulta detallada se reserva al área administrativa; el comité recibe solo agregados en /api/reports.
router.get("/", authorize(...PERMISSIONS.readAuditEvents), async (req, res) => {
  const filters = parseOrThrow(auditQuerySchema, req.query, "Los filtros de auditoría no son válidos.");
  const data = await listAuditEvents(prisma, filters);
  res.json({ success: true, data });
});

export default router;
