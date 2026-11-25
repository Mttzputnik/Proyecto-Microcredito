import { Router } from "express";
import { prisma } from "../config/prisma.js";
import { authenticate } from "../middleware/authenticate.js";
import { authorize } from "../middleware/authorize.js";
import { PERMISSIONS } from "../domain/roles.js";
import { getPortfolioAndSupervisionReports } from "../services/report.service.js";
import { parseOrThrow } from "../utils/httpError.js";
import { reportQuerySchema } from "../validators/report.validator.js";

const router = Router();
router.use(authenticate);

// Solo cifras agregadas; no se devuelven identificadores, nombres ni expedientes individuales.
router.get("/", authorize(...PERMISSIONS.readPortfolioReports), async (req, res) => {
  const filters = parseOrThrow(reportQuerySchema, req.query, "El rango del reporte no es válido.");
  const data = await getPortfolioAndSupervisionReports(prisma, filters);
  res.json({ success: true, data });
});

export default router;
