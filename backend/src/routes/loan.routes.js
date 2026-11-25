import { Router } from "express";
import { prisma } from "../config/prisma.js";
import { authenticate } from "../middleware/authenticate.js";
import { authorize } from "../middleware/authorize.js";
import { PERMISSIONS } from "../domain/roles.js";
import {
  collectionActionSchema, disburseSchema, formalizeSchema, listLoansQuery, paymentSchema, writeOffSchema
} from "../validators/finance.validator.js";
import {
  disburseLoan, formalizeLoan, listArrears, listArrearsAlerts, markAlertRead, refreshArrears, registerCollectionAction, registerPayment, writeOffLoan
} from "../services/loan.service.js";
import { httpError, parseOrThrow, requireObjectId } from "../utils/httpError.js";
import {
  restructuringPolicySchema, createRestructuringSchema,
  restructuringDecisionSchema, restructuringAcceptanceSchema
} from "../validators/restructuring.validator.js";
import {
  listRestructuringPolicies, createRestructuringPolicy, listRestructurings,
  requestRestructuring, decideRestructuring, acceptRestructuring
} from "../services/restructuring.service.js";

// Préstamos, cronograma, pagos y mora. Todo exige sesión.
const router = Router();
router.use(authenticate);

const applicantSummary = { id: true, firstName: true, lastName: true, documentType: true, documentNumber: true };

// PO-08: políticas configurables, solicitudes, decisiones, aceptación e historial.
router.get("/restructuring-policies", authorize(...PERMISSIONS.readPolicies), async (_req, res) => {
  res.json({ success: true, data: await listRestructuringPolicies(prisma) });
});
router.post("/restructuring-policies", authorize(...PERMISSIONS.managePolicies), async (req, res) => {
  const payload = parseOrThrow(restructuringPolicySchema, req.body);
  res.status(201).json({ success: true, data: await createRestructuringPolicy(prisma, { payload, actor: req.user }) });
});
router.get("/restructurings", authorize(...PERMISSIONS.readRestructurings), async (req, res) => {
  res.json({ success: true, data: await listRestructurings(prisma, { actor: req.user }) });
});
router.patch("/restructurings/:id/decision", authorize(...PERMISSIONS.decideRestructurings), async (req, res) => {
  const restructuringId = requireObjectId(req.params.id);
  const payload = parseOrThrow(restructuringDecisionSchema, req.body);
  res.json({ success: true, data: await decideRestructuring(prisma, { restructuringId, ...payload, actor: req.user }) });
});
router.post("/restructurings/:id/accept", authorize(...PERMISSIONS.acceptRestructurings), async (req, res) => {
  const restructuringId = requireObjectId(req.params.id);
  const payload = parseOrThrow(restructuringAcceptanceSchema, req.body);
  res.json({ success: true, data: await acceptRestructuring(prisma, { restructuringId, ...payload, actor: req.user }) });
});
router.get("/:id/restructurings", authorize(...PERMISSIONS.readRestructurings), async (req, res) => {
  const loanId = requireObjectId(req.params.id);
  res.json({ success: true, data: await listRestructurings(prisma, { loanId, actor: req.user }) });
});
router.post("/:id/restructurings", authorize(...PERMISSIONS.createRestructurings), async (req, res) => {
  const loanId = requireObjectId(req.params.id);
  const payload = parseOrThrow(createRestructuringSchema, req.body);
  res.status(201).json({ success: true, data: await requestRestructuring(prisma, { loanId, payload, actor: req.user }) });
});

// GET /api/loans/arrears  -> cuotas vencidas de préstamos activos, agrupadas por préstamo (definida ANTES de /:id)
router.get("/arrears", authorize(...PERMISSIONS.readArrears), async (_req, res) => {
  res.json({ success: true, data: await listArrears(prisma) });
});

// GET /api/loans/alerts -> alertas administrativas pendientes de lectura.
router.get("/alerts", authorize(...PERMISSIONS.readArrears), async (_req, res) => {
  res.json({ success: true, data: await listArrearsAlerts(prisma) });
});

router.patch("/alerts/:id/read", authorize(...PERMISSIONS.manageLoans), async (req, res) => {
  const alertId = requireObjectId(req.params.id);
  res.json({ success: true, data: await markAlertRead(prisma, { alertId, actor: req.user }) });
});

router.post("/:id/collection-actions", authorize(...PERMISSIONS.manageLoans), async (req, res) => {
  const loanId = requireObjectId(req.params.id);
  const payload = parseOrThrow(collectionActionSchema, req.body);
  const action = await registerCollectionAction(prisma, { loanId, ...payload, actor: req.user });
  res.status(201).json({ success: true, data: action });
});

// GET /api/loans?status=ACTIVE&page=1&limit=20
router.get("/", authorize(...PERMISSIONS.readLoans), async (req, res) => {
  const { status, page, limit } = parseOrThrow(listLoansQuery, req.query, "Los filtros no son válidos.");
  const where = { ...(status ? { status } : {}), ...(req.user.role === "CREDIT_OFFICER" ? { application: { assignedOfficerId: req.user.id } } : {}) };
  const [total, items] = await Promise.all([
    prisma.loan.count({ where }),
    prisma.loan.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: { application: { select: { applicationNumber: true, applicant: { select: applicantSummary } } } }
    })
  ]);
  res.json({ success: true, data: items, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
});

// GET /api/loans/:id  -> préstamo con cronograma y pagos
router.get("/:id", authorize(...PERMISSIONS.readLoans), async (req, res) => {
  const id = requireObjectId(req.params.id);
  const loan = await prisma.loan.findUnique({
    where: { id },
    include: {
      application: { select: { id: true, applicationNumber: true, assignedOfficerId: true, applicant: { select: applicantSummary } } },
      paymentSchedules: { where: { isCurrent: true }, orderBy: { installment: "asc" } },
      payments: { orderBy: { paymentDate: "desc" } },
      collectionActions: { orderBy: { performedAt: "desc" } }
    }
  });
  if (!loan || (req.user.role === "CREDIT_OFFICER" && loan.application.assignedOfficerId !== req.user.id)) throw httpError(404, "Préstamo no encontrado.");
  const scheduleHistory = await prisma.paymentSchedule.findMany({
    where: { loanId: id, isCurrent: false },
    orderBy: [{ scheduleVersion: "desc" }, { installment: "asc" }]
  });
  res.json({ success: true, data: { ...loan, scheduleHistory } });
});

// POST /api/loans  { applicationId }  -> formaliza una solicitud APPROVED
router.post("/", authorize(...PERMISSIONS.manageLoans), async (req, res) => {
  const { applicationId } = parseOrThrow(formalizeSchema, req.body);
  const loan = await formalizeLoan(prisma, { applicationId, actor: req.user });
  res.status(201).json({ success: true, data: loan });
});

// POST /api/loans/:id/disburse  { disbursementDate? }  -> ACTIVE + cronograma
router.post("/:id/disburse", authorize(...PERMISSIONS.manageLoans), async (req, res) => {
  const loanId = requireObjectId(req.params.id);
  const { disbursementDate } = parseOrThrow(disburseSchema, req.body ?? {});
  const result = await disburseLoan(prisma, {
    loanId,
    actor: req.user,
    ...(disbursementDate ? { disbursementDate: new Date(disbursementDate) } : {})
  });
  res.status(201).json({ success: true, data: result });
});

// POST /api/loans/:id/payments  { amount, paymentDate?, reference?, notes? }
router.post("/:id/payments", authorize(...PERMISSIONS.registerPayments), async (req, res) => {
  const loanId = requireObjectId(req.params.id);
  const { amount, paymentDate, reference, notes } = parseOrThrow(paymentSchema, req.body);
  const result = await registerPayment(prisma, {
    loanId, amount, reference, notes, actor: req.user,
    ...(paymentDate ? { paymentDate: new Date(paymentDate) } : {})
  });
  res.status(201).json({ success: true, data: result });
});

// POST /api/loans/:id/refresh-arrears  -> marca cuotas vencidas como OVERDUE y devuelve la mora
router.post("/:id/refresh-arrears", authorize(...PERMISSIONS.manageLoans), async (req, res) => {
  const loanId = requireObjectId(req.params.id);
  res.json({ success: true, data: await refreshArrears(prisma, { loanId, actor: req.user }) });
});

// POST /api/loans/:id/write-off  { justification }  (solo ADMIN)
router.post("/:id/write-off", authorize(...PERMISSIONS.writeOffLoans), async (req, res) => {
  const loanId = requireObjectId(req.params.id);
  const { justification } = parseOrThrow(writeOffSchema, req.body);
  res.json({ success: true, data: await writeOffLoan(prisma, { loanId, actor: req.user, justification }) });
});

export default router;
