const sum = (rows, key) => rows.reduce((total, row) => total + Number(row[key] || 0), 0);

export function calculateRestructuringBalance({
  schedules,
  payments,
  includeAccruedInterest,
  lateInterestTreatment,
  lateInterestAmount = 0,
  asOf = new Date()
}) {
  const scheduleIds = new Set(schedules.map((row) => row.id));
  const paidBySchedule = new Map();
  for (const payment of payments) {
    for (const allocation of payment.allocations || []) {
      if (!scheduleIds.has(allocation.scheduleId)) continue;
      const current = paidBySchedule.get(allocation.scheduleId) || { principal: 0, interest: 0 };
      current.principal += Number(allocation.principalPaid || 0);
      current.interest += Number(allocation.interestPaid || 0);
      paidBySchedule.set(allocation.scheduleId, current);
    }
  }

  const paidFor = (row) => {
    const recorded = paidBySchedule.get(row.id);
    if (recorded) return recorded;
    const paidAmount = Number(row.paidAmount || 0);
    const interest = Number(row.interest || 0);
    return {
      interest: Math.min(paidAmount, interest),
      principal: Math.max(0, paidAmount - interest)
    };
  };

  const principalOutstanding = Math.max(0, sum(schedules, "principal") -
    schedules.reduce((total, row) => total + paidFor(row).principal, 0));

  const accruedInterestOutstanding = Math.max(0, schedules
    .filter((row) => new Date(row.dueDate).getTime() <= new Date(asOf).getTime())
    .reduce((total, row) => total + Math.max(0, Number(row.interest || 0) - paidFor(row).interest), 0));

  if (!Number.isInteger(lateInterestAmount) || lateInterestAmount < 0) {
    throw new RangeError("Los intereses de mora manuales deben ser un entero no negativo en COP.");
  }
  if (lateInterestTreatment !== "MANUAL_CAPITALIZE" && lateInterestAmount !== 0) {
    throw new RangeError("La política vigente no permite ingresar un valor manual de intereses de mora.");
  }

  const includedInterest = includeAccruedInterest ? accruedInterestOutstanding : 0;
  const includedLateInterest = lateInterestTreatment === "MANUAL_CAPITALIZE" ? lateInterestAmount : 0;
  return {
    principalOutstanding,
    accruedInterestOutstanding,
    includedInterest,
    lateInterestAmount: includedLateInterest,
    waivedInterest: accruedInterestOutstanding - includedInterest,
    newPrincipal: Math.round(principalOutstanding + includedInterest + includedLateInterest)
  };
}

export function calculateGraceDays(effectiveAt, firstDueDate) {
  const start = new Date(effectiveAt);
  const end = new Date(firstDueDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
    throw new RangeError("El primer vencimiento debe ser una fecha posterior a la formalización.");
  }
  return Math.ceil((end.getTime() - start.getTime()) / 86_400_000);
}
