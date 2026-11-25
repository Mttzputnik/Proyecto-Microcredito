import { classifyArrears } from "../domain/arrears.js";
import { outstanding } from "../domain/payments.js";

const APPROVED_OUTCOMES = new Set(["APPROVED", "APPROVED_WITH_CONDITIONS"]);
const FINAL_OUTCOMES = new Set(["APPROVED", "APPROVED_WITH_CONDITIONS", "REJECTED"]);
const MINIMUM_GROUP_SIZE = 5;

function dateWindow({ from, to } = {}) {
  const end = to ? new Date(to) : new Date();
  const start = from ? new Date(from) : new Date(end.getTime());
  if (!from) start.setFullYear(start.getFullYear() - 1);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) {
    throw new RangeError("El rango de fechas del reporte no es válido.");
  }
  return { start, end };
}

function increment(map, key, value) {
  const current = map.get(key) ?? { key, applications: 0, approved: 0, rejected: 0, requestedAmount: 0, decisionDays: [] };
  current.applications += 1;
  current.requestedAmount += value.requestedAmount ?? 0;
  if (value.outcome === "REJECTED") current.rejected += 1;
  if (APPROVED_OUTCOMES.has(value.outcome)) current.approved += 1;
  if (value.decisionDays !== null && value.decisionDays !== undefined) current.decisionDays.push(value.decisionDays);
  map.set(key, current);
}

function finishGroups(map, field) {
  return [...map.values()]
    .filter((item) => item.applications >= MINIMUM_GROUP_SIZE)
    .map((item) => ({
      [field]: item.key,
      applications: item.applications,
      approved: item.approved,
      rejected: item.rejected,
      approvalRate: item.applications ? Number((item.approved / item.applications * 100).toFixed(1)) : 0,
      averageRequestedAmount: item.applications ? Math.round(item.requestedAmount / item.applications) : 0,
      averageDecisionDays: item.decisionDays.length
        ? Number((item.decisionDays.reduce((sum, value) => sum + value, 0) / item.decisionDays.length).toFixed(1))
        : null
    }))
    .sort((a, b) => b.applications - a.applications);
}

export async function getPortfolioAndSupervisionReports(prisma, filters = {}) {
  const { start, end } = dateWindow(filters);
  const [applications, activeLoans, payments] = await Promise.all([
    prisma.loanApplication.findMany({
      where: { createdAt: { gte: start, lte: end } },
      select: {
        id: true, status: true, purpose: true, requestedAmount: true, createdAt: true,
        applicant: { select: { municipality: true, residenceZone: true } },
        applicantSnapshot: { select: { municipality: true, residenceZone: true } },
        decisions: { select: { outcome: true, decidedAt: true, justification: true } }
      }
    }),
    prisma.loan.findMany({
      where: { status: "ACTIVE" },
      select: {
        id: true, principal: true,
        application: { select: { purpose: true } },
        paymentSchedules: {
          select: { id: true, loanId: true, installment: true, dueDate: true, totalDue: true, paidAmount: true, status: true }
        }
      }
    }),
    prisma.payment.findMany({
      where: { status: "CONFIRMED", paymentDate: { gte: start, lte: end } },
      select: { amount: true, paymentDate: true, loan: { select: { application: { select: { purpose: true } } } } }
    })
  ]);

  const allActiveSchedules = activeLoans.flatMap((loan) => loan.paymentSchedules);
  const portfolioOutstanding = allActiveSchedules.reduce((sum, schedule) => sum + outstanding(schedule), 0);
  const arrears = classifyArrears(allActiveSchedules);
  const overdueOutstanding = arrears.reduce((sum, item) => sum + item.outstanding, 0);
  const delinquencyRate = portfolioOutstanding > 0
    ? Number((overdueOutstanding / portfolioOutstanding * 100).toFixed(2))
    : 0;
  const paymentsCollected = payments.reduce((sum, payment) => sum + payment.amount, 0);

  const statusCounts = new Map();
  const municipalityGroups = new Map();
  const purposeGroups = new Map();
  const decisionsByOutcome = new Map();
  let decisionDaysTotal = 0;
  let decisionDaysCount = 0;
  let conditionalApprovals = 0;
  let justifiedDecisions = 0;

  for (const application of applications) {
    statusCounts.set(application.status, (statusCounts.get(application.status) ?? 0) + 1);
    const latestDecision = [...application.decisions]
      .filter((decision) => new Date(decision.decidedAt) <= end)
      .sort((a, b) => new Date(b.decidedAt) - new Date(a.decidedAt))[0];
    const outcome = latestDecision?.outcome;
    if (outcome) decisionsByOutcome.set(outcome, (decisionsByOutcome.get(outcome) ?? 0) + 1);
    if (outcome === "APPROVED_WITH_CONDITIONS" && latestDecision.justification?.trim()) conditionalApprovals += 1;
    if (latestDecision?.justification?.trim()) justifiedDecisions += 1;
    const decisionDays = latestDecision
      ? Math.max(0, (new Date(latestDecision.decidedAt) - new Date(application.createdAt)) / 86400000)
      : null;
    if (decisionDays !== null) {
      decisionDaysTotal += decisionDays;
      decisionDaysCount += 1;
    }
    const municipality = application.applicantSnapshot?.municipality
      ?? application.applicant?.municipality
      ?? "Sin municipio";
    increment(municipalityGroups, municipality, {
      requestedAmount: application.requestedAmount,
      outcome,
      decisionDays
    });
    increment(purposeGroups, application.purpose || "Sin propósito", {
      requestedAmount: application.requestedAmount,
      outcome,
      decisionDays
    });
  }

  const arrearsByCategory = new Map();
  for (const item of arrears) {
    const current = arrearsByCategory.get(item.category) ?? { category: item.category, installments: 0, outstanding: 0, loanIds: new Set() };
    current.installments += 1;
    current.outstanding += item.outstanding;
    const schedule = allActiveSchedules.find((row) => row.id === item.id);
    if (schedule) current.loanIds.add(schedule.loanId);
    arrearsByCategory.set(item.category, current);
  }

  const performanceByPurpose = new Map();
  for (const loan of activeLoans) {
    const purpose = loan.application?.purpose || "Sin propósito";
    const current = performanceByPurpose.get(purpose) ?? { purpose, activeLoans: 0, outstanding: 0, overdueOutstanding: 0 };
    current.activeLoans += 1;
    current.outstanding += loan.paymentSchedules.reduce((sum, row) => sum + outstanding(row), 0);
    current.overdueOutstanding += arrears
      .filter((item) => loan.paymentSchedules.some((row) => row.id === item.id))
      .reduce((sum, item) => sum + item.outstanding, 0);
    performanceByPurpose.set(purpose, current);
  }

  const applicationCount = applications.length;
  const decidedCount = [...decisionsByOutcome.values()].reduce((sum, count) => sum + count, 0);
  const approvedCount = [...decisionsByOutcome.entries()]
    .filter(([outcome]) => APPROVED_OUTCOMES.has(outcome))
    .reduce((sum, [, count]) => sum + count, 0);

  return {
    asOf: new Date().toISOString(),
    period: { from: start.toISOString(), to: end.toISOString() },
    portfolio: {
      outstanding: Math.round(portfolioOutstanding),
      activeLoans: activeLoans.length,
      paymentsCollected: Math.round(paymentsCollected),
      delinquencyRate,
      overdueOutstanding: Math.round(overdueOutstanding),
      averageTicket: activeLoans.length
        ? Math.round(activeLoans.reduce((sum, loan) => sum + loan.principal, 0) / activeLoans.length)
        : 0
    },
    applications: {
      total: applicationCount,
      pending: applications.filter((item) => !["APPROVED", "APPROVED_WITH_CONDITIONS", "REJECTED", "CANCELLED"].includes(item.status)).length,
      decided: decidedCount,
      approvalRate: decidedCount ? Number((approvedCount / decidedCount * 100).toFixed(1)) : 0,
      byStatus: [...statusCounts.entries()].map(([status, count]) => ({ status, count })),
      byOutcome: [...decisionsByOutcome.entries()].map(([outcome, count]) => ({ outcome, count }))
    },
    arrears: [...arrearsByCategory.values()].map((item) => ({
      category: item.category,
      installments: item.installments,
      loans: item.loanIds.size,
      outstanding: Math.round(item.outstanding)
    })),
    supervision: {
      minimumGroupSize: MINIMUM_GROUP_SIZE,
      byMunicipality: finishGroups(municipalityGroups, "municipality"),
      byPurpose: finishGroups(purposeGroups, "purpose"),
      portfolioByPurpose: [...performanceByPurpose.values()].map((item) => ({
        ...item,
        outstanding: Math.round(item.outstanding),
        overdueOutstanding: Math.round(item.overdueOutstanding),
        delinquencyRate: item.outstanding > 0
          ? Number((item.overdueOutstanding / item.outstanding * 100).toFixed(1))
          : 0
      })),
      conditionalApprovals,
      justifiedDecisions,
      averageDecisionDays: decisionDaysCount
        ? Number((decisionDaysTotal / decisionDaysCount).toFixed(1))
        : null
    }
  };
}
