// Prueba de integración: recorre el flujo completo de la API contra una base de datos REAL.
//
// Se OMITE sola si no se configura TEST_DATABASE_URL. Por seguridad solo corre si el nombre de la base
// termina en "_test" (al final BORRA esa base completa). NUNCA apuntes esto a la base "microcredito".
//
// Cómo correrla (PowerShell, desde la carpeta backend):
//   $env:TEST_DATABASE_URL = "mongodb+srv://USUARIO:CLAVE@cluster0.xxxxx.mongodb.net/microcredito_test?retryWrites=true&w=majority"
//   $env:DATABASE_URL = $env:TEST_DATABASE_URL ; npx prisma db push      # crea colecciones e índices en la base de prueba
//   npm test
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

describe("flujo completo de la API", { skip }, () => {
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
    for (const [key, role] of [["admin", "ADMIN"], ["officer", "CREDIT_OFFICER"], ["auditor", "AUDITOR"]]) {
      await prisma.user.create({ data: { firstName: key, lastName: "Prueba", email: `${key}@prueba.test`, passwordHash, role } });
    }
    server = http.createServer(app).listen(0);
    base = `http://127.0.0.1:${server.address().port}`;
    for (const key of ["admin", "officer", "auditor"]) {
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

  test("los roles se respetan: el auditor lee pero no crea políticas", async () => {
    assert.equal((await api("GET", "/api/applications", { token: tokens.auditor })).status, 200);
    assert.equal((await api("POST", "/api/policies", { token: tokens.auditor, body: { name: "Prueba" } })).status, 403);
    assert.equal((await api("POST", "/api/policies", { token: tokens.officer, body: { name: "Prueba" } })).status, 403);
  });

  test("evaluar sin política activa se rechaza con un mensaje claro", async () => {
    const created = await api("POST", "/api/applications", { body: applicationPayload() });
    assert.equal(created.status, 201);
    state.applicationId = created.body.data.id;
    assert.equal((await api("PATCH", `/api/applications/${state.applicationId}/status`, { token: tokens.officer, body: { status: "UNDER_REVIEW" } })).status, 200);
    const evaluation = await api("POST", `/api/applications/${state.applicationId}/evaluations`, { token: tokens.officer, body: {} });
    assert.equal(evaluation.status, 409);
    assert.match(evaluation.body.message, /política de crédito activa/);
  });

  test("el admin crea políticas versionadas", async () => {
    const policy = { name: "Prueba", minimumAge: 18, maximumAmount: 5_000_000, maximumTermMonths: 24, maxDebtRatio: 0.5, annualInterestRate: 24 };
    const first = await api("POST", "/api/policies", { token: tokens.admin, body: policy });
    assert.equal(first.status, 201);
    assert.equal(first.body.data.version, 1);
    const second = await api("POST", "/api/policies", { token: tokens.admin, body: { ...policy, maximumAmount: 6_000_000 } });
    assert.equal(second.body.data.version, 2);
    const active = await api("GET", "/api/policies/active", { token: tokens.officer });
    assert.equal(active.body.data.version, 2);
    assert.equal((await api("POST", "/api/policies", { token: tokens.admin, body: { name: "x", maxDebtRatio: 40 } })).status, 400);
  });

  test("evaluación, decisión justificada y transiciones", async () => {
    const evaluation = await api("POST", `/api/applications/${state.applicationId}/evaluations`, { token: tokens.officer, body: {} });
    assert.equal(evaluation.status, 201);
    assert.equal(evaluation.body.data.result, "SUPPORTS_APPROVAL");
    assert.equal(evaluation.body.data.policy.version, 2);

    const noJustification = await api("PATCH", `/api/applications/${state.applicationId}/status`, { token: tokens.officer, body: { status: "APPROVED" } });
    assert.equal(noJustification.status, 400);

    const approved = await api("PATCH", `/api/applications/${state.applicationId}/status`, {
      token: tokens.officer, body: { status: "APPROVED", justification: "Ingresos suficientes y capacidad de pago verificada." }
    });
    assert.equal(approved.status, 200);
    assert.ok(approved.body.data.decisionId);

    const invalid = await api("PATCH", `/api/applications/${state.applicationId}/status`, { token: tokens.officer, body: { status: "UNDER_REVIEW" } });
    assert.equal(invalid.status, 409);
  });

  test("formalizar crea el préstamo una sola vez y bloquea cancelar la solicitud", async () => {
    const loan = await api("POST", "/api/loans", { token: tokens.officer, body: { applicationId: state.applicationId } });
    assert.equal(loan.status, 201);
    assert.equal(loan.body.data.status, "PENDING_DISBURSEMENT");
    assert.equal(loan.body.data.annualRate, 24);
    state.loanId = loan.body.data.id;

    assert.equal((await api("POST", "/api/loans", { token: tokens.officer, body: { applicationId: state.applicationId } })).status, 409);
    assert.equal((await api("PATCH", `/api/applications/${state.applicationId}/status`, { token: tokens.officer, body: { status: "CANCELLED" } })).status, 409);
    assert.equal((await api("POST", `/api/loans/${state.loanId}/payments`, { token: tokens.officer, body: { amount: 1000 } })).status, 409);
  });

  test("desembolsar genera el cronograma y la mora marca las cuotas vencidas", async () => {
    const disbursementDate = new Date(Date.now() - 70 * DAY).toISOString();
    const disbursed = await api("POST", `/api/loans/${state.loanId}/disburse`, { token: tokens.officer, body: { disbursementDate } });
    assert.equal(disbursed.status, 201);

    const detail = await api("GET", `/api/loans/${state.loanId}`, { token: tokens.auditor });
    assert.equal(detail.body.data.status, "ACTIVE");
    assert.equal(detail.body.data.paymentSchedules.length, 6);
    state.installments = detail.body.data.paymentSchedules;
    assert.equal(state.installments.reduce((sum, row) => sum + row.principal, 0), 1_200_000);

    assert.equal((await api("POST", `/api/loans/${state.loanId}/disburse`, { token: tokens.officer, body: {} })).status, 409);

    const arrears = await api("POST", `/api/loans/${state.loanId}/refresh-arrears`, { token: tokens.officer });
    assert.equal(arrears.status, 200);
    assert.equal(arrears.body.data.updated, 2);
    assert.ok(arrears.body.data.arrears.every((item) => item.daysOverdue > 0));

    const list = await api("GET", "/api/loans/arrears", { token: tokens.auditor });
    assert.equal(list.body.data.length, 1);
    assert.equal(list.body.data[0].loanId, state.loanId);
  });

  test("los pagos se reparten, cierran cuotas y no admiten excesos ni roles sin permiso", async () => {
    const first = state.installments[0];
    assert.equal((await api("POST", `/api/loans/${state.loanId}/payments`, { token: tokens.auditor, body: { amount: 1000 } })).status, 403);

    const partial = await api("POST", `/api/loans/${state.loanId}/payments`, { token: tokens.officer, body: { amount: 1000, reference: "R-1" } });
    assert.equal(partial.status, 201);
    const rest = await api("POST", `/api/loans/${state.loanId}/payments`, { token: tokens.officer, body: { amount: first.totalDue - 1000 } });
    assert.equal(rest.status, 201);

    const detail = await api("GET", `/api/loans/${state.loanId}`, { token: tokens.officer });
    assert.equal(detail.body.data.paymentSchedules[0].status, "PAID");
    assert.equal(detail.body.data.paymentSchedules[1].status, "OVERDUE");
    assert.equal(detail.body.data.payments.length, 2);

    const tooMuch = await api("POST", `/api/loans/${state.loanId}/payments`, { token: tokens.officer, body: { amount: 99_999_999 } });
    assert.equal(tooMuch.status, 400);
    assert.equal((await api("POST", `/api/loans/${state.loanId}/payments`, { token: tokens.officer, body: { amount: 10.5 } })).status, 400);
  });

  test("la trazabilidad es completa y los registros no se pueden editar ni borrar", async () => {
    const history = await api("GET", `/api/applications/${state.applicationId}/history`, { token: tokens.auditor });
    assert.equal(history.status, 200);
    const actions = history.body.data.map((event) => event.action);
    assert.ok(actions.includes("APPLICATION_STATUS_CHANGED") && actions.includes("RISK_EVALUATED"));

    await assert.rejects(() => prisma.auditLog.updateMany({ data: { description: "alterado" } }), (e) => e.code === "IMMUTABLE_RECORD");
    await assert.rejects(() => prisma.auditLog.deleteMany({}), (e) => e.code === "IMMUTABLE_RECORD");
    await assert.rejects(() => prisma.loanDecision.deleteMany({}), (e) => e.code === "IMMUTABLE_RECORD");
    await assert.rejects(() => prisma.payment.updateMany({ data: { amount: 1 } }), (e) => e.code === "IMMUTABLE_RECORD");
  });

  test("solo el admin puede castigar un préstamo y después no admite pagos", async () => {
    const body = { justification: "Cartera irrecuperable tras agotar la gestión de cobro." };
    assert.equal((await api("POST", `/api/loans/${state.loanId}/write-off`, { token: tokens.officer, body })).status, 403);
    assert.equal((await api("POST", `/api/loans/${state.loanId}/write-off`, { token: tokens.admin, body })).status, 200);
    assert.equal((await api("POST", `/api/loans/${state.loanId}/payments`, { token: tokens.officer, body: { amount: 1000 } })).status, 409);
  });
});

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
