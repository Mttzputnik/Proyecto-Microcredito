// Detección de mora. Funciones puras. Los días se cuentan en UTC.
//
// SUPUESTOS (ver docs/SUPUESTOS-PARA-REVISION.md):
//  M1. Una cuota está en mora cuando su fecha de vencimiento es anterior a hoy y aún tiene saldo.
//  M2. Mora = estado OVERDUE de la CUOTA; el préstamo sigue ACTIVE (no existe un estado de préstamo "en mora").
//  M3. No se calcula interés de mora ni penalidades: no hay una regla confirmada.

import { PAYABLE_STATUSES, outstanding } from "./payments.js";

const DAY_MS = 24 * 60 * 60 * 1000;
const startOfDayUTC = (date) => Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());

export function daysOverdue(dueDate, today = new Date()) {
  return Math.floor((startOfDayUTC(today) - startOfDayUTC(new Date(dueDate))) / DAY_MS);
}

export function classifyArrears(installments, today = new Date()) {
  return installments
    .filter((i) => PAYABLE_STATUSES.includes(i.status) && outstanding(i) > 0 && daysOverdue(i.dueDate, today) > 0)
    .map((i) => ({
      id: i.id,
      installment: i.installment,
      dueDate: i.dueDate,
      daysOverdue: daysOverdue(i.dueDate, today),
      outstanding: outstanding(i),
      needsStatusUpdate: i.status !== "OVERDUE"
    }));
}
