import test from "node:test";
import assert from "node:assert/strict";
import { getPortfolioAndSupervisionReports } from "../src/services/report.service.js";

function fakePrisma({ applications = [], loans = [], payments = [] } = {}) {
  return {
    loanApplication: { findMany: async () => applications },
    loan: { findMany: async () => loans },
    payment: { findMany: async () => payments }
  };
}

const period = { from: "2026-01-01T00:00:00.000Z", to: "2026-12-31T23:59:59.999Z" };
const createdAt = new Date("2026-03-01T10:00:00.000Z");
const decidedAt = new Date("2026-03-04T10:00:00.000Z");

test("calcula cartera, pagos, aprobación y supervisión con datos persistidos", async () => {
  const applications = Array.from({ length: 5 }, (_, index) => ({
    id: `app-${index}`,
    status: index === 4 ? "UNDER_REVIEW" : index === 3 ? "REJECTED" : "APPROVED",
    purpose: "negocio",
    requestedAmount: 1_000_000,
    createdAt,
    applicant: { municipality: "Manizales", residenceZone: "urbana" },
    applicantSnapshot: { municipality: "Manizales", residenceZone: "urbana" },
    decisions: index === 4 ? [] : [{
      outcome: index === 3 ? "REJECTED" : "APPROVED",
      decidedAt,
      justification: "Análisis y verificación documentada."
    }]
  }));
  const loans = [{
    id: "loan-1",
    principal: 1_000_000,
    application: { purpose: "negocio" },
    paymentSchedules: [{
      id: "schedule-1", loanId: "loan-1", installment: 1,
      dueDate: new Date("2026-10-01T05:00:00.000Z"),
      totalDue: 100, paidAmount: 25, status: "OVERDUE"
    }]
  }];
  const payments = [{ amount: 25, paymentDate: new Date("2026-03-10T00:00:00.000Z"), loan: { application: { purpose: "negocio" } } }];

  const report = await getPortfolioAndSupervisionReports(fakePrisma({ applications, loans, payments }), period);
  assert.equal(report.applications.total, 5);
  assert.equal(report.applications.decided, 4);
  assert.equal(report.applications.approvalRate, 75);
  assert.equal(report.portfolio.outstanding, 75);
  assert.equal(report.portfolio.overdueOutstanding, 75);
  assert.equal(report.portfolio.paymentsCollected, 25);
  assert.equal(report.portfolio.delinquencyRate, 100);
  assert.equal(report.supervision.byMunicipality[0].municipality, "Manizales");
  assert.equal(report.supervision.byPurpose[0].purpose, "negocio");
  assert.equal(report.supervision.justifiedDecisions, 4);
  assert.equal(report.supervision.averageDecisionDays, 3);
  assert.equal(Object.hasOwn(report.supervision.byMunicipality[0], "documentNumber"), false);
});

test("suprime desagregaciones de municipios con menos de cinco solicitudes", async () => {
  const applications = Array.from({ length: 4 }, (_, index) => ({
    id: `app-${index}`, status: "UNDER_REVIEW", purpose: "negocio",
    requestedAmount: 500_000, createdAt, applicant: { municipality: "Neira" },
    applicantSnapshot: { municipality: "Neira" }, decisions: []
  }));
  const report = await getPortfolioAndSupervisionReports(fakePrisma({ applications }), period);
  assert.deepEqual(report.supervision.byMunicipality, []);
  assert.equal(report.supervision.byPurpose.length, 0);
});

test("rechaza un rango de fechas invertido", async () => {
  await assert.rejects(
    () => getPortfolioAndSupervisionReports(fakePrisma(), {
      from: "2026-12-31T00:00:00.000Z", to: "2026-01-01T00:00:00.000Z"
    }),
    /rango de fechas/
  );
});
