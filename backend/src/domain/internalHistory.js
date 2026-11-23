const DAY_MS = 24 * 60 * 60 * 1000;

function utcDay(value) {
  const date = new Date(value);
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

/**
 * Devuelve únicamente cuotas que ya fueron saldadas después de su vencimiento.
 * Los retrasos activos se calculan por separado y no se duplican aquí.
 */
export function extractPreviousDelinquencies(loans = []) {
  return loans.flatMap((loan) => (loan.paymentSchedules ?? [])
    .filter((schedule) => {
      if (!schedule.paidAt || (schedule.status !== "PAID" && (schedule.paidAmount ?? 0) < schedule.totalDue)) return false;
      return utcDay(schedule.paidAt) > utcDay(schedule.dueDate);
    })
    .map((schedule) => ({
      loanId: loan.id,
      loanNumber: loan.loanNumber,
      dueDate: schedule.dueDate,
      settledAt: schedule.paidAt,
      daysLate: Math.floor((utcDay(schedule.paidAt) - utcDay(schedule.dueDate)) / DAY_MS)
    })))
    .sort((a, b) => new Date(b.settledAt) - new Date(a.settledAt));
}
