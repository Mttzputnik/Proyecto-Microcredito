import { Router } from "express";
import { prisma } from "../config/prisma.js";
import { authenticate } from "../middleware/authenticate.js";
import { authorize } from "../middleware/authorize.js";
import { PERMISSIONS } from "../domain/roles.js";
import {
  disburseSchema, formalizeSchema, listLoansQuery, paymentSchema, writeOffSchema
} from "../validators/finance.validator.js";
import {
  disburseLoan, formalizeLoan, listArrears, refreshArrears, registerPayment, writeOffLoan
} from "../services/loan.service.js";
import { httpError, parseOrThrow, requireObjectId } from "../utils/httpError.js";

// Préstamos, cronograma, pagos y mora. Todo exige sesión.
const router = Router();
router.use(authenticate);

const applicantSummary = { id: true, firstName: true, lastName: true, documentType: true, documentNumber: true };

// GET /api/loans/arrears  -> cuotas vencidas de préstamos activos, agrupadas por préstamo (definida ANTES de /:id)
router.get("/arrears", authorize(...PERMISSIONS.readLoans), async (_req, res) => {
  res.json({ success: true, data: await listArrears(prisma) });
});

// GET /api/loans?status=ACTIVE&page=1&limit=20
router.get("/", authorize(...PERMISSIONS.readLoans), async (req, res) => {
  const { status, page, limit } = parseOrThrow(listLoansQuery, req.query, "Los filtros no son válidos.");
  const where = status ? { status } : {};
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
      application: { select: { id: true, applicationNumber: true, applicant: { select: applicantSummary } } },
      paymentSchedules: { orderBy: { installment: "asc" } },
      payments: { orderBy: { paymentDate: "desc" } }
    }
  });
  if (!loan) throw httpError(404, "Préstamo no encontrado.");
  res.json({ success: true, data: loan });
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
