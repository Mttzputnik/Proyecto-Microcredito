import test from "node:test";
import assert from "node:assert/strict";
import { disburseLoan, formalizeLoan, refreshArrears, registerPayment, writeOffLoan } from "../src/services/loan.service.js";
import { evaluateApplication } from "../src/services/evaluation.service.js";
import { createPolicyVersion, findActivePolicy } from "../src/services/policy.service.js";

// Base de datos falsa en memoria: solo implementa lo que usan los servicios.
function memoryDb({ status = "APPROVED", policy = { id: "p1", name: "Base", version: 1, annualInterestRate: 24 }, withEvaluation = true } = {}) {
  let counter = 0;
  const nextId = () => String(++counter).padStart(24, "0");
  const match = (row, where = {}) =>
    Object.entries(where).every(([key, value]) => (value !== null && typeof value === "object" && !(value instanceof Date)) || row[key] === value);
  const applicant = { id: "ap1", birthDate: "1990-01-01T00:00:00Z", monthlyIncome: 3_000_000, monthlyExpenses: 1_000_000, monthlyDebtPayments: 0 };

  const t = {
    loanApplication: [{ id: "app1", status, requestedAmount: 1_200_000, requestedTerm: 6, applicant }],
    loanDecision: [{ id: "dec1", applicationId: "app1", outcome: "APPROVED", decidedAt: new Date() }],
    riskEvaluation: withEvaluation ? [{ id: "ev1", applicationId: "app1", policyId: policy.id, policy }] : [],
    creditPolicy: [{ ...policy, active: true, effectiveFrom: new Date("2026-01-01") }],
    loan: [], paymentSchedule: [], payment: [], auditLog: []
  };
  const collection = (name) => ({
    create: async ({ data }) => { const row = { id: nextId(), ...data }; t[name].push(row); return row; },
    updateMany: async ({ where, data }) => { const rows = t[name].filter((r) => match(r, where)); rows.forEach((r) => Object.assign(r, data)); return { count: rows.length }; },
    findUnique: async ({ where }) => t[name].find((r) => r.id === where.id) ?? null,
    findMany: async ({ where }) => t[name].filter((r) => match(r, where)).sort((a, b) => (a.installment ?? 0) - (b.installment ?? 0))
  });

  const db = {
    t,
    $transaction: (fn) => fn(db),
    loanApplication: {
      findUnique: async ({ where }) => {
        const application = t.loanApplication.find((r) => r.id === where.id);
        return application ? { ...application, loan: t.loan.find((l) => l.applicationId === application.id) ?? null } : null;
      }
    },
    loanDecision: { findFirst: async ({ where }) => t.loanDecision.filter((r) => match(r, where)).at(-1) ?? null },
    riskEvaluation: {
      ...collection("riskEvaluation"),
      findFirst: async ({ where }) => t.riskEvaluation.filter((r) => match(r, where)).at(-1) ?? null
    },
    creditPolicy: {
      ...collection("creditPolicy"),
      findFirst: async ({ where }) => {
        if (where?.name) return t.creditPolicy.filter((p) => p.name === where.name).sort((a, b) => b.version - a.version)[0] ?? null;
        return t.creditPolicy.filter((p) => p.active)[0] ?? null;
      }
    },
    loan: collection("loan"),
    paymentSchedule: {
      ...collection("paymentSchedule"),
      createMany: async ({ data }) => {
        data.forEach((d) => t.paymentSchedule.push({ id: nextId(), paidAmount: 0, paidAt: null, status: "PENDING", ...d }));
        return { count: data.length };
      }
    },
    payment: collection("payment"),
    auditLog: collection("auditLog")
  };
  return db;
}

const actor = { id: "u1" };
const actions = (db) => db.t.auditLog.map((a) => a.action);

test("formalizar una solicitud aprobada crea el préstamo con la tasa de la política", async () => {
  const db = memoryDb();
  const loan = await formalizeLoan(db, { applicationId: "app1", actor });
  assert.equal(loan.status, "PENDING_DISBURSEMENT");
  assert.equal(loan.annualRate, 24);
  assert.equal(loan.principal, 1_200_000);
  assert.equal(loan.termMonths, 6);
  assert.match(loan.loanNumber, /^LN-\d{4}-[0-9A-F]{8}$/);
  assert.deepEqual(actions(db), ["LOAN_FORMALIZED"]);
});

test("no se formaliza dos veces, ni sin aprobación, ni sin una política con tasa", async () => {
  const db = memoryDb();
  await formalizeLoan(db, { applicationId: "app1", actor });
  await assert.rejects(() => formalizeLoan(db, { applicationId: "app1", actor }), (e) => e.status === 409 && /ya tiene un préstamo/.test(e.message));

  await assert.rejects(() => formalizeLoan(memoryDb({ status: "UNDER_REVIEW" }), { applicationId: "app1", actor }), (e) => e.status === 409);
  await assert.rejects(() => formalizeLoan(memoryDb({ withEvaluation: false }), { applicationId: "app1", actor }), (e) => e.status === 409 && /evaluación/.test(e.message));
  await assert.rejects(
    () => formalizeLoan(memoryDb({ policy: { id: "p1", name: "Sin tasa", version: 1, annualInterestRate: null } }), { applicationId: "app1", actor }),
    (e) => e.status === 409
  );
  await assert.rejects(() => formalizeLoan(memoryDb(), { applicationId: "no-existe", actor }), (e) => e.status === 404);
});

test("desembolsar activa el préstamo y genera el cronograma completo", async () => {
  const db = memoryDb();
  const loan = await formalizeLoan(db, { applicationId: "app1", actor });
  const result = await disburseLoan(db, { loanId: loan.id, actor, disbursementDate: new Date("2026-01-15T00:00:00Z") });

  assert.equal(db.t.loan[0].status, "ACTIVE");
  assert.equal(db.t.paymentSchedule.length, 6);
  assert.equal(db.t.paymentSchedule.reduce((s, r) => s + r.principal, 0), 1_200_000);
  assert.equal(result.schedule[0].dueDate.toISOString().slice(0, 10), "2026-02-15");
  assert.deepEqual(actions(db), ["LOAN_FORMALIZED", "LOAN_DISBURSED"]);

  await assert.rejects(() => disburseLoan(db, { loanId: loan.id, actor }), (e) => e.status === 409);
  assert.equal(db.t.paymentSchedule.length, 6);
});

async function activeLoan() {
  const db = memoryDb();
  const loan = await formalizeLoan(db, { applicationId: "app1", actor });
  await disburseLoan(db, { loanId: loan.id, actor, disbursementDate: new Date("2026-01-15T00:00:00Z") });
  return { db, loanId: loan.id };
}
const now = new Date("2026-02-01T12:00:00Z");

test("pagar una cuota exacta la deja PAID y guarda cómo se repartió el pago", async () => {
  const { db, loanId } = await activeLoan();
  const first = db.t.paymentSchedule[0];
  const result = await registerPayment(db, { loanId, amount: first.totalDue, actor, now });
  assert.equal(first.status, "PAID");
  assert.equal(first.paidAmount, first.totalDue);
  assert.equal(result.allocations.length, 1);
  assert.equal(db.t.payment[0].status, "CONFIRMED");
  assert.equal(db.t.payment[0].recordedById, "u1");
  assert.ok(actions(db).includes("PAYMENT_REGISTERED"));
});

test("pagos parciales acumulan hasta cerrar la cuota", async () => {
  const { db, loanId } = await activeLoan();
  const first = db.t.paymentSchedule[0];
  await registerPayment(db, { loanId, amount: 1000, actor, now });
  assert.equal(first.status, "PARTIALLY_PAID");
  await registerPayment(db, { loanId, amount: first.totalDue - 1000, actor, now });
  assert.equal(first.status, "PAID");
  assert.equal(db.t.payment.length, 2);
});

test("un pago mayor al saldo se rechaza y no escribe nada", async () => {
  const { db, loanId } = await activeLoan();
  const total = db.t.paymentSchedule.reduce((s, r) => s + r.totalDue, 0);
  await assert.rejects(() => registerPayment(db, { loanId, amount: total + 1, actor, now }), (e) => e.status === 400 && /excede/.test(e.message));
  assert.equal(db.t.payment.length, 0);
  assert.ok(db.t.paymentSchedule.every((r) => r.paidAmount === 0));
});

test("pagar todo el saldo cierra el préstamo como PAID y luego no admite más pagos", async () => {
  const { db, loanId } = await activeLoan();
  const total = db.t.paymentSchedule.reduce((s, r) => s + r.totalDue, 0);
  const result = await registerPayment(db, { loanId, amount: total, actor, now });
  assert.equal(result.remainingBalance, 0);
  assert.equal(result.loanStatus, "PAID");
  assert.equal(db.t.loan[0].status, "PAID");
  assert.ok(db.t.paymentSchedule.every((r) => r.status === "PAID"));
  await assert.rejects(() => registerPayment(db, { loanId, amount: 1000, actor, now }), (e) => e.status === 409);
});

test("no se aceptan pagos con fecha futura ni en un préstamo sin desembolsar", async () => {
  const { db, loanId } = await activeLoan();
  await assert.rejects(
    () => registerPayment(db, { loanId, amount: 1000, actor, now, paymentDate: new Date("2026-06-01T00:00:00Z") }),
    (e) => e.status === 400
  );
  const fresh = memoryDb();
  const loan = await formalizeLoan(fresh, { applicationId: "app1", actor });
  await assert.rejects(() => registerPayment(fresh, { loanId: loan.id, amount: 1000, actor, now }), (e) => e.status === 409);
});

test("la mora marca las cuotas vencidas como OVERDUE y un pago posterior las cierra", async () => {
  const { db, loanId } = await activeLoan();
  const today = new Date("2026-04-20T10:00:00Z");

  const result = await refreshArrears(db, { loanId, actor, today });
  assert.equal(result.updated, 3);
  assert.deepEqual(result.arrears.map((a) => a.installment), [1, 2, 3]);
  assert.equal(result.arrears[0].daysOverdue, 64);
  assert.deepEqual(db.t.paymentSchedule.map((r) => r.status), ["OVERDUE", "OVERDUE", "OVERDUE", "PENDING", "PENDING", "PENDING"]);
  assert.ok(actions(db).includes("ARREARS_REFRESHED"));

  const again = await refreshArrears(db, { loanId, actor, today });
  assert.equal(again.updated, 0);

  await registerPayment(db, { loanId, amount: db.t.paymentSchedule[0].totalDue, actor, now: today });
  assert.equal(db.t.paymentSchedule[0].status, "PAID");
  assert.equal(db.t.paymentSchedule[1].status, "OVERDUE");
});

test("castigar un préstamo activo exige que esté ACTIVE y bloquea pagos", async () => {
  const { db, loanId } = await activeLoan();
  await writeOffLoan(db, { loanId, actor, justification: "Cartera irrecuperable tras 180 días." });
  assert.equal(db.t.loan[0].status, "WRITTEN_OFF");
  assert.equal(db.t.auditLog.at(-1).metadata.justification, "Cartera irrecuperable tras 180 días.");
  await assert.rejects(() => registerPayment(db, { loanId, amount: 1000, actor, now }), (e) => e.status === 409);
  await assert.rejects(() => writeOffLoan(db, { loanId, actor, justification: "Otra vez lo mismo por favor" }), (e) => e.status === 409);
});

test("evaluar guarda la evaluación con la política usada y registra la auditoría", async () => {
  const db = memoryDb({ status: "UNDER_REVIEW", policy: { id: "p1", name: "Base", version: 3, annualInterestRate: 24, maximumAmount: 5_000_000 } });
  const evaluation = await evaluateApplication(db, { applicationId: "app1", actor, now: new Date("2026-11-12T00:00:00Z") });
  assert.equal(evaluation.result, "SUPPORTS_APPROVAL");
  assert.equal(evaluation.policy.version, 3);
  assert.equal(db.t.riskEvaluation.at(-1).policyId, "p1");
  assert.deepEqual(actions(db), ["RISK_EVALUATED"]);
  assert.equal(db.t.loanApplication[0].status, "UNDER_REVIEW");
});

test("evaluar exige solicitud en revisión y una política activa", async () => {
  await assert.rejects(() => evaluateApplication(memoryDb({ status: "SUBMITTED" }), { applicationId: "app1", actor }), (e) => e.status === 409 && /UNDER_REVIEW/.test(e.message));
  const noPolicy = memoryDb({ status: "UNDER_REVIEW" });
  noPolicy.t.creditPolicy.length = 0;
  await assert.rejects(() => evaluateApplication(noPolicy, { applicationId: "app1", actor }), (e) => e.status === 409 && /política de crédito activa/.test(e.message));
});

test("una política sin effectiveUntil (campo ausente en MongoDB) cuenta como vigente", async () => {
  const db = memoryDb();
  assert.equal("effectiveUntil" in db.t.creditPolicy[0], false);
  assert.equal((await findActivePolicy(db, new Date("2026-06-01T00:00:00Z"))).id, "p1");

  db.t.creditPolicy[0].effectiveUntil = null;
  assert.equal((await findActivePolicy(db, new Date("2026-06-01T00:00:00Z"))).id, "p1");

  db.t.creditPolicy[0].effectiveUntil = new Date("2026-12-31T00:00:00Z");
  assert.equal((await findActivePolicy(db, new Date("2026-06-01T00:00:00Z"))).id, "p1");

  db.t.creditPolicy[0].effectiveUntil = new Date("2026-03-01T00:00:00Z");
  assert.equal(await findActivePolicy(db, new Date("2026-06-01T00:00:00Z")), null);
});

test("crear una política con el mismo nombre genera la versión siguiente y desactiva la anterior", async () => {
  const db = memoryDb();
  const created = await createPolicyVersion(db, { data: { name: "Base", maximumAmount: 2_000_000 }, actor });
  assert.equal(created.version, 2);
  assert.equal(created.active, true);
  assert.equal(db.t.creditPolicy[0].active, false);
  assert.ok(db.t.creditPolicy[0].effectiveUntil instanceof Date);
  assert.deepEqual(actions(db), ["POLICY_CREATED"]);
});
