// Prueba de integración: recorre el flujo de la API contra una base de datos REAL.
// Solo se ejecuta si TEST_DATABASE_URL apunta a una base cuyo nombre termina en "_test".
// Al finalizar elimina esa base de prueba completa. Nunca apuntar a la base de desarrollo/producción.
import { describe, before, after, test } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";

const TEST_URL = process.env.TEST_DATABASE_URL;
let dbName = "";
try { dbName = TEST_URL ? new URL(TEST_URL).pathname.replace("/", "") : ""; } catch { dbName = ""; }
const skip = dbName.endsWith("_test")
  ? false
  : "Define TEST_DATABASE_URL apuntando a una base cuyo nombre termine en _test para correr la prueba de integración.";

const DAY = 24 * 60 * 60 * 1000;

describe("flujo completo de la API y permisos por actor", { skip }, () => {
  let prisma, server, base;
  const tokens = {};
  const state = {};

  async function api(method, path, { body, token } = {}) {
    const response = await fetch(`${base}${path}`, {
      method,
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {})
    });
    return { status: response.status, body: await response.json() };
  }

  before(async () => {
    process.env.DATABASE_URL = TEST_URL;
    if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 20 || process.env.JWT_SECRET.startsWith("replace-with")) {
      process.env.JWT_SECRET = "clave-solo-para-pruebas-1234567890";
    }
    const bcrypt = (await import("bcryptjs")).default;
    ({ prisma } = await import("../src/config/prisma.js"));
    const { default: app } = await import("../src/app.js");

    const passwordHash = await bcrypt.hash("Clave-de-prueba-1", 4);
    const users = [
      ["admin", "ADMIN"],
      ["officer", "CREDIT_OFFICER"],
      ["officer2", "CREDIT_OFFICER"],
      ["risk", "analista_riesgo"],
      ["administrative", "administrativo"],
      ["committee", "comite_supervisor"],
      ["auditor", "AUDITOR"]
    ];
    for (const [key, role] of users) {
      await prisma.user.create({ data: { firstName: key, lastName: "Prueba", email: `${key}@prueba.test`, passwordHash, role } });
    }

    server = http.createServer(app).listen(0);
    base = `http://127.0.0.1:${server.address().port}`;
    for (const [key] of users) {
      const login = await api("POST", "/api/auth/login", { body: { email: `${key}@prueba.test`, password: "Clave-de-prueba-1" } });
      tokens[key] = login.body.data.token;
    }
  });

  after(async () => {
    try { await prisma?.$runCommandRaw({ dropDatabase: 1 }); } finally {
      await prisma?.$disconnect();
      await new Promise((resolve) => (server ? server.close(resolve) : resolve()));
    }
  });

  test("sin sesión o con credenciales malas no hay acceso", async () => {
    assert.equal((await api("GET", "/api/applications")).status, 401);
    assert.equal((await api("GET", "/api/loans")).status, 401);
    assert.equal((await api("POST", "/api/auth/login", { body: { email: "admin@prueba.test", password: "incorrecta" } })).status, 401);
  });

  test("cada actor queda limitado a sus operaciones", async () => {
    assert.equal((await api("GET", "/api/applications", { token: tokens.officer })).status, 200);
    assert.equal((await api("GET", "/api/applications", { token: tokens.auditor })).status, 403);
    assert.equal((await api("GET", "/api/applications", { token: tokens.committee })).status, 403);
    assert.equal((await api("GET", "/api/loans", { token: tokens.committee })).status, 403);
    assert.equal((await api("GET", "/api/loans", { token: tokens.officer })).status, 403);
    assert.equal((await api("GET", "/api/loans", { token: tokens.administrative })).status, 200);
    assert.equal((await api("GET", "/api/policies", { token: tokens.risk })).status, 200);
    assert.equal((await api("GET", "/api/reports", { token: tokens.administrative })).status, 200);
    assert.equal((await api("GET", "/api/reports", { token: tokens.committee })).status, 200);
    assert.equal((await api("GET", "/api/reports", { token: tokens.officer })).status, 403);
    assert.equal((await api("GET", "/api/audit", { token: tokens.administrative })).status, 200);
    assert.equal((await api("GET", "/api/audit", { token: tokens.committee })).status, 403);
    assert.equal((await api("POST", "/api/policies", { token: tokens.admin, body: { name: "Prueba" } })).status, 403);
    assert.equal((await api("POST", "/api/policies", { token: tokens.officer, body: { name: "Prueba" } })).status, 403);
    assert.equal((await api("POST", "/api/policies", { token: tokens.auditor, body: { name: "Prueba" } })).status, 403);
  });

  test("las nuevas solicitudes se asignan automáticamente y quedan aisladas por oficial", async () => {
    const created = await api("POST", "/api/applications", { body: applicationPayload() });
    assert.equal(created.status, 201);
    assert.equal(created.body.data.status, "SUBMITTED");
    // La API pública no expone IDs internos ni del oficial asignado.
    // La prueba consulta esos datos directamente en la base aislada.
    const persistedApplication = await prisma.loanApplication.findUnique({
      where: { applicationNumber: created.body.data.applicationNumber },
      select: { id: true, assignedOfficerId: true, assignedAt: true }
    });
    assert.ok(persistedApplication?.assignedOfficerId);
    assert.ok(persistedApplication?.assignedAt);
    state.applicationId = persistedApplication.id;
    const assignedOfficer = await prisma.user.findUnique({
      where: { id: persistedApplication.assignedOfficerId },
      select: { id: true, email: true }
    });
    state.assignedToken = assignedOfficer.email === "officer2@prueba.test" ? tokens.officer2 : tokens.officer;
    state.otherOfficerToken = assignedOfficer.email === "officer2@prueba.test" ? tokens.officer : tokens.officer2;
    const assignedToken = state.assignedToken;

    const applicantId = (await prisma.loanApplication.findUnique({
      where: { id: state.applicationId },
      select: { applicantId: true }
    })).applicantId;

    // El otro oficial no puede consultar ni modificar el expediente original.
    assert.equal((await api("GET", "/api/applications", { token: state.otherOfficerToken })).body.data.length, 0);
    assert.equal((await api("GET", `/api/applications/${state.applicationId}`, { token: state.otherOfficerToken })).status, 404);
    assert.equal((await api("GET", `/api/applicants/${applicantId}`, { token: state.otherOfficerToken })).status, 404);
    assert.equal((await api("PATCH", `/api/applications/${state.applicationId}/status`, { token: state.otherOfficerToken, body: { status: "UNDER_REVIEW" } })).status, 404);

    // Reutilizar el mismo documento en otra solicitud no debe sobrescribir el perfil existente.
    const originalApplicant = await prisma.applicant.findUnique({ where: { id: applicantId } });
    const secondPayload = applicationPayload();
    secondPayload.applicant.documentNumber = originalApplicant.documentNumber;
    secondPayload.applicant.firstName = "Intento de modificación";
    secondPayload.applicant.monthlyIncome = 99_000_000;
    const secondCreated = await api("POST", "/api/applications", { body: secondPayload });
    assert.equal(secondCreated.status, 201);
    const secondApplication = await prisma.loanApplication.findUnique({
      where: { applicationNumber: secondCreated.body.data.applicationNumber },
      include: { applicant: true, applicantSnapshot: true }
    });
    assert.equal(secondApplication.applicant.firstName, originalApplicant.firstName);
    assert.equal(secondApplication.applicant.monthlyIncome, originalApplicant.monthlyIncome);
    assert.equal(secondApplication.applicantSnapshot.firstName, "Intento de modificación");
    assert.equal(secondApplication.applicantSnapshot.monthlyIncome, 99_000_000);

    assert.equal((await api("PATCH", `/api/applications/${state.applicationId}/status`, { token: assignedToken, body: { status: "UNDER_REVIEW" } })).status, 200);
    assert.equal((await api("GET", `/api/applicants/${applicantId}`, { token: assignedToken })).status, 200);
  });

  test("evaluar sin política activa se rechaza con un mensaje claro", async () => {
    const evaluation = await api("POST", `/api/applications/${state.applicationId}/evaluations`, { token: state.assignedToken, body: {} });
    assert.equal(evaluation.status, 409);
    assert.match(evaluation.body.message, /política de crédito activa/);
  });

  test("el analista de riesgo crea políticas versionadas", async () => {
    const policy = { name: "Prueba", minimumAge: 18, maximumAmount: 5_000_000, maximumTermMonths: 24, maxDebtRatio: 0.5, annualInterestRate: 24 };
    const first = await api("POST", "/api/policies", { token: tokens.risk, body: policy });
    assert.equal(first.status, 201);
    assert.equal(first.body.data.version, 1);
    const second = await api("POST", "/api/policies", { token: tokens.risk, body: { ...policy, maximumAmount: 6_000_000 } });
    assert.equal(second.status, 201);
    assert.equal(second.body.data.version, 2);
    const active = await api("GET", "/api/policies/active", { token: state.assignedToken });
    assert.equal(active.body.data.version, 2);
    assert.equal((await api("POST", "/api/policies", { token: tokens.risk, body: { name: "x", maxDebtRatio: 40 } })).status, 400);
  });

  test("evaluación y decisión humana justificada", async () => {
    const evaluation = await api("POST", `/api/applications/${state.applicationId}/evaluations`, { token: state.assignedToken, body: {} });
    assert.equal(evaluation.status, 201);
    assert.equal(evaluation.body.data.result, "SUPPORTS_APPROVAL");
    assert.equal(evaluation.body.data.policy.version, 2);

    const noJustification = await api("PATCH", `/api/applications/${state.applicationId}/status`, { token: state.assignedToken, body: { status: "APPROVED" } });
    assert.equal(noJustification.status, 400);

    const approved = await api("PATCH", `/api/applications/${state.applicationId}/status`, {
      token: state.assignedToken, body: { status: "APPROVED", justification: "Ingresos suficientes y capacidad de pago verificada." }
    });
    assert.equal(approved.status, 200);
    assert.ok(approved.body.data.decisionId);

    const invalid = await api("PATCH", `/api/applications/${state.applicationId}/status`, { token: state.assignedToken, body: { status: "UNDER_REVIEW" } });
    assert.equal(invalid.status, 409);
  });

  test("el área administrativa formaliza y registra el préstamo", async () => {
    const loan = await api("POST", "/api/loans", { token: tokens.administrative, body: { applicationId: state.applicationId } });
    assert.equal(loan.status, 201);
    assert.equal(loan.body.data.status, "PENDING_DISBURSEMENT");
    assert.equal(loan.body.data.annualRate, 24);
    state.loanId = loan.body.data.id;

    assert.equal((await api("POST", "/api/loans", { token: tokens.administrative, body: { applicationId: state.applicationId } })).status, 409);
    assert.equal((await api("PATCH", `/api/applications/${state.applicationId}/status`, { token: state.assignedToken, body: { status: "CANCELLED" } })).status, 409);
    assert.equal((await api("POST", `/api/loans/${state.loanId}/payments`, { token: state.assignedToken, body: { amount: 1000 } })).status, 403);
  });

  test("desembolsar genera el cronograma y la mora marca cuotas vencidas", async () => {
    const disbursementDate = new Date(Date.now() - 70 * DAY).toISOString();
    const disbursed = await api("POST", `/api/loans/${state.loanId}/disburse`, { token: tokens.administrative, body: { disbursementDate } });
    assert.equal(disbursed.status, 201);

    const detail = await api("GET", `/api/loans/${state.loanId}`, { token: tokens.administrative });
    assert.equal(detail.body.data.status, "ACTIVE");
    assert.equal(detail.body.data.paymentSchedules.length, 6);
    state.installments = detail.body.data.paymentSchedules;
    assert.equal(state.installments.reduce((sum, row) => sum + row.principal, 0), 1_200_000);
    assert.equal((await api("GET", `/api/loans/${state.loanId}`, { token: tokens.committee })).status, 403);

    assert.equal((await api("POST", `/api/loans/${state.loanId}/disburse`, { token: tokens.administrative, body: {} })).status, 409);

    const arrears = await api("POST", `/api/loans/${state.loanId}/refresh-arrears`, { token: tokens.administrative });
    assert.equal(arrears.status, 200);
    assert.equal(arrears.body.data.updated, 2);
    assert.ok(arrears.body.data.arrears.every((item) => item.daysOverdue > 0));

    const list = await api("GET", "/api/loans/arrears", { token: tokens.administrative });
    assert.equal(list.body.data.length, 1);
    assert.equal(list.body.data[0].loanId, state.loanId);
  });

  test("los pagos se reparten, cierran cuotas y no admiten excesos", async () => {
    const first = state.installments[0];
    assert.equal((await api("POST", `/api/loans/${state.loanId}/payments`, { token: tokens.auditor, body: { amount: 1000 } })).status, 403);

    const partial = await api("POST", `/api/loans/${state.loanId}/payments`, { token: tokens.administrative, body: { amount: 1000, reference: "R-1" } });
    assert.equal(partial.status, 201);
    const rest = await api("POST", `/api/loans/${state.loanId}/payments`, { token: tokens.administrative, body: { amount: first.totalDue - 1000 } });
    assert.equal(rest.status, 201);

    const detail = await api("GET", `/api/loans/${state.loanId}`, { token: tokens.administrative });
    assert.equal(detail.body.data.paymentSchedules[0].status, "PAID");
    assert.equal(detail.body.data.paymentSchedules[1].status, "OVERDUE");
    assert.equal(detail.body.data.payments.length, 2);

    assert.equal((await api("POST", `/api/loans/${state.loanId}/payments`, { token: tokens.administrative, body: { amount: 99_999_999 } })).status, 400);
    assert.equal((await api("POST", `/api/loans/${state.loanId}/payments`, { token: tokens.administrative, body: { amount: 10.5 } })).status, 400);
  });

  test("la trazabilidad de la solicitud se limita al oficial asignado", async () => {
    const history = await api("GET", `/api/applications/${state.applicationId}/history`, { token: state.assignedToken });
    assert.equal(history.status, 200);
    assert.equal((await api("GET", `/api/applications/${state.applicationId}/history`, { token: state.otherOfficerToken })).status, 404);
    const actions = history.body.data.map((event) => event.action);
    assert.ok(actions.includes("APPLICATION_AUTO_ASSIGNED"));
    assert.ok(actions.includes("APPLICATION_STATUS_CHANGED") && actions.includes("RISK_EVALUATED"));

    await assert.rejects(() => prisma.auditLog.updateMany({ data: { description: "alterado" } }), (e) => e.code === "IMMUTABLE_RECORD");
    await assert.rejects(() => prisma.auditLog.deleteMany({}), (e) => e.code === "IMMUTABLE_RECORD");
    await assert.rejects(() => prisma.loanDecision.deleteMany({}), (e) => e.code === "IMMUTABLE_RECORD");
    await assert.rejects(() => prisma.payment.updateMany({ data: { amount: 1 } }), (e) => e.code === "IMMUTABLE_RECORD");
  });

  test("la reconsideración se asigna a otro oficial y conserva la decisión original", async () => {
    const created = await api("POST", "/api/applications", { body: applicationPayload() });
    assert.equal(created.status, 201);
    const application = await prisma.loanApplication.findUnique({
      where: { applicationNumber: created.body.data.applicationNumber },
      select: { id: true, assignedOfficerId: true, status: true }
    });
    assert.ok(application?.assignedOfficerId);

    const originalOfficer = await prisma.user.findUnique({
      where: { id: application.assignedOfficerId },
      select: { id: true, email: true }
    });
    const originalToken = originalOfficer.email === "officer2@prueba.test" ? tokens.officer2 : tokens.officer;
    const otherToken = originalOfficer.email === "officer2@prueba.test" ? tokens.officer : tokens.officer2;

    assert.equal((await api("PATCH", `/api/applications/${application.id}/status`, {
      token: originalToken, body: { status: "UNDER_REVIEW" }
    })).status, 200);
    assert.equal((await api("PATCH", `/api/applications/${application.id}/status`, {
      token: originalToken,
      body: { status: "REJECTED", justification: "La capacidad de pago declarada no alcanza el umbral de la política vigente." }
    })).status, 200);

    const submitted = await api("POST", "/api/reconsiderations", {
      body: {
        applicationNumber: created.body.data.applicationNumber,
        accessToken: created.body.data.trackingToken,
        applicantMessage: "Adjunto información complementaria sobre mis ingresos actuales y solicito una nueva revisión."
      }
    });
    assert.equal(submitted.status, 201);

    const reconsideration = await prisma.reconsideration.findUnique({
      where: { applicationId: application.id }
    });
    assert.ok(reconsideration);
    assert.notEqual(reconsideration.assignedOfficerId, reconsideration.originalOfficerId);
    assert.equal((await api("PATCH", `/api/reconsiderations/${reconsideration.id}/decision`, {
      token: originalToken,
      body: { outcome: "ACCEPTED", justification: "Intento de decisión por el oficial original." }
    })).status, 404);

    const assignedOfficer = await prisma.user.findUnique({
      where: { id: reconsideration.assignedOfficerId },
      select: { email: true }
    });
    const assignedToken = assignedOfficer.email === "officer2@prueba.test" ? tokens.officer2 : tokens.officer;
    assert.equal((await api("GET", "/api/reconsiderations/assigned", { token: assignedToken })).status, 200);

    const decision = await api("PATCH", `/api/reconsiderations/${reconsideration.id}/decision`, {
      token: assignedToken,
      body: { outcome: "ACCEPTED", justification: "La información complementaria permite continuar el análisis del caso." }
    });
    assert.equal(decision.status, 200);
    assert.equal(decision.body.data.status, "ACCEPTED");

    const unchangedApplication = await prisma.loanApplication.findUnique({
      where: { id: application.id },
      include: { decisions: true, reconsideration: true }
    });
    assert.equal(unchangedApplication.status, "REJECTED");
    assert.equal(unchangedApplication.decisions.length, 1);
    assert.equal(unchangedApplication.reconsideration.outcome, "ACCEPTED");

    assert.equal((await api("POST", "/api/reconsiderations", {
      body: {
        applicationNumber: created.body.data.applicationNumber,
        accessToken: created.body.data.trackingToken,
        applicantMessage: "Segundo intento de reconsideración que debe ser rechazado por el sistema."
      }
    })).status, 409);
    assert.equal((await api("PATCH", `/api/reconsiderations/${reconsideration.id}/decision`, {
      token: assignedToken,
      body: { outcome: "UPHELD", justification: "Intento de resolver dos veces la misma reconsideración." }
    })).status, 409);
  });

  test("la reestructuración aprobada conserva el cronograma anterior y activa una nueva versión", async () => {
    const policy = await api("POST", "/api/loans/restructuring-policies", {
      token: tokens.risk,
      body: {
        name: "Política de prueba de reestructuración",
        maximumTermMonths: 24,
        maximumGracePeriodDays: 30,
        maximumUsuryRate: 100,
        maximumOfficerApprovalAmount: 100_000_000,
        allowRateChange: false,
        allowRepeatedRestructuring: false,
        maximumRestructurings: 1,
        overdueInstallmentsTreatment: "CAPITALIZE",
        includeAccruedInterest: false,
        lateInterestTreatment: "NOT_APPLICABLE",
        effectiveFrom: new Date(Date.now() - DAY).toISOString()
      }
    });
    assert.equal(policy.status, 201);

    const now = new Date();
    const firstDueDate = addCalendarMonth(now).toISOString();
    const requested = await api("POST", `/api/loans/${state.loanId}/restructurings`, {
      token: state.assignedToken,
      body: {
        policyId: policy.body.data.id,
        reason: "Dificultades temporales de pago y solicitud de ajuste del plazo.",
        termMonths: 6,
        gracePeriodDays: 0,
        firstDueDate
      }
    });
    assert.equal(requested.status, 201);
    assert.equal(requested.body.data.status, "PENDING_REVIEW");
    const restructuringId = requested.body.data.id;

    const approved = await api("PATCH", `/api/loans/restructurings/${restructuringId}/decision`, {
      token: state.assignedToken,
      body: { outcome: "APPROVED", justification: "La propuesta está dentro del límite de autorización del oficial." }
    });
    assert.equal(approved.status, 200);
    assert.equal(approved.body.data.status, "PENDING_ACCEPTANCE");

    const accepted = await api("POST", `/api/loans/restructurings/${restructuringId}/accept`, {
      token: tokens.administrative,
      body: {
        accepted: true,
        acceptanceMethod: "SIGNED_DOCUMENT",
        acceptanceEvidence: "Acta de aceptación de prueba firmada y archivada en el expediente."
      }
    });
    assert.equal(accepted.status, 200);
    assert.equal(accepted.body.data.restructuring.status, "ACTIVE");
    assert.equal(accepted.body.data.restructuring.scheduleVersion, 2);

    const loan = await api("GET", `/api/loans/${state.loanId}`, { token: tokens.administrative });
    assert.equal(loan.status, 200);
    assert.equal(loan.body.data.paymentSchedules.length, 6);
    assert.ok(loan.body.data.paymentSchedules.every((row) => row.isCurrent && row.scheduleVersion === 2));
    assert.equal(loan.body.data.scheduleHistory.length, 6);
    assert.ok(loan.body.data.scheduleHistory.every((row) => !row.isCurrent && row.scheduleVersion === 1));
    assert.equal(loan.body.data.payments.length, 2);
  });

  test("el castigo de préstamos permanece bloqueado mientras no tenga actor autorizado", async () => {
    const body = { justification: "Cartera irrecuperable tras agotar la gestión de cobro." };
    assert.equal((await api("POST", `/api/loans/${state.loanId}/write-off`, { token: tokens.admin, body })).status, 403);
    assert.equal((await api("POST", `/api/loans/${state.loanId}/write-off`, { token: tokens.administrative, body })).status, 403);
  });
});

function addCalendarMonth(date) {
  const result = new Date(date.getTime());
  const day = result.getUTCDate();
  result.setUTCDate(1);
  result.setUTCMonth(result.getUTCMonth() + 1);
  const lastDay = new Date(Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0)).getUTCDate();
  result.setUTCDate(Math.min(day, lastDay));
  return result;
}

function applicationPayload() {
  return {
    applicant: {
      documentType: "CC",
      documentNumber: String(Math.floor(1_000_000_000 + Math.random() * 8_000_000_000)),
      firstName: "Ana", lastName: "Prueba",
      birthDate: "1990-05-20T00:00:00.000Z",
      phone: "3001234567", municipality: "Manizales", residenceZone: "urbana",
      occupation: "Comerciante", activityDuration: "mas-3",
      monthlyIncome: 3_000_000, monthlyExpenses: 1_000_000,
      dependents: 1, hasExistingDebts: false, monthlyDebtPayments: 0
    },
    requestedAmount: 1_200_000,
    requestedTerm: 6,
    purpose: "negocio"
  };
}
