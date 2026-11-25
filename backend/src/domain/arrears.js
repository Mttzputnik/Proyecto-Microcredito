// Clasificación de mora con días calendario reales (zona horaria de la cooperativa).
// El día del vencimiento es día 0; el día siguiente inicia la mora.

import { PAYABLE_STATUSES, outstanding } from "./payments.js";

const DAY_MS = 24 * 60 * 60 * 1000;
const BUSINESS_TIME_ZONE = process.env.BUSINESS_TIME_ZONE ?? "America/Bogota";
const calendarFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: BUSINESS_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit"
});
export const ARREARS_CATEGORIES = Object.freeze({
  LIGHT_DELAY: "LIGHT_DELAY",
  EARLY_ARREARS: "EARLY_ARREARS",
  ESTABLISHED_ARREARS: "ESTABLISHED_ARREARS"
});

export const startOfCalendarDay = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new RangeError("La fecha proporcionada no es válida.");
  const parts = Object.fromEntries(calendarFormatter.formatToParts(date).map(({ type, value: part }) => [type, part]));
  return Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day));
};

export function calendarDayDifference(fromDate, toDate) {
  return Math.floor((startOfCalendarDay(toDate) - startOfCalendarDay(fromDate)) / DAY_MS);
}

export function daysOverdue(dueDate, today = new Date()) {
  return calendarDayDifference(dueDate, today);
}

export function classifyArrearsDays(days) {
  if (!Number.isInteger(days) || days <= 0) return null;
  if (days <= 30) return ARREARS_CATEGORIES.LIGHT_DELAY;
  if (days <= 60) return ARREARS_CATEGORIES.EARLY_ARREARS;
  return ARREARS_CATEGORIES.ESTABLISHED_ARREARS;
}

export function arrearsCategoryLabel(category) {
  return ({
    [ARREARS_CATEGORIES.LIGHT_DELAY]: "Retraso leve",
    [ARREARS_CATEGORIES.EARLY_ARREARS]: "Mora temprana",
    [ARREARS_CATEGORIES.ESTABLISHED_ARREARS]: "Mora establecida"
  })[category] ?? "Al día";
}

export function classifyArrears(installments, today = new Date()) {
  return installments
    .filter((i) => PAYABLE_STATUSES.includes(i.status) && outstanding(i) > 0 && daysOverdue(i.dueDate, today) > 0)
    .map((i) => {
      const overdueDays = daysOverdue(i.dueDate, today);
      const category = classifyArrearsDays(overdueDays);
      return {
        id: i.id,
        installment: i.installment,
        dueDate: i.dueDate,
        daysOverdue: overdueDays,
        category,
        categoryLabel: arrearsCategoryLabel(category),
        outstanding: outstanding(i),
        needsStatusUpdate: i.status !== "OVERDUE"
      };
    });
}
