import test from "node:test";
import assert from "node:assert/strict";
import { applicationSchema, trackingLookupSchema } from "../src/validators/application.validator.js";

const validPayload = {
  applicant: {
    documentType: "CC",
    documentNumber: "123456789",
    firstName: "Ana",
    lastName: "Pérez",
    birthDate: "1995-04-12T00:00:00.000Z",
    phone: "3001234567",
    municipality: "Manizales",
    residenceZone: "urbana",
    occupation: "Comerciante",
    activityDuration: "1-3",
    monthlyIncome: 2500000,
    monthlyExpenses: 1200000,
    dependents: 1,
    hasExistingDebts: false,
    monthlyDebtPayments: 0
  },
  requestedAmount: 5000000,
  requestedTerm: 12,
  purpose: "negocio"
};

test("accepts a valid loan application payload", () => {
  assert.equal(applicationSchema.safeParse(validPayload).success, true);
});

test("rejects negative or fractional requested amounts", () => {
  assert.equal(applicationSchema.safeParse({ ...validPayload, requestedAmount: -100 }).success, false);
  assert.equal(applicationSchema.safeParse({ ...validPayload, requestedAmount: 1000.5 }).success, false);
});

test("rejects unsupported application purposes", () => {
  assert.equal(applicationSchema.safeParse({ ...validPayload, purpose: "vacaciones" }).success, false);
});

test("rejects malformed applicant documents", () => {
  assert.equal(applicationSchema.safeParse({
    ...validPayload,
    applicant: { ...validPayload.applicant, documentNumber: "ABC" }
  }).success, false);
});


test("el seguimiento exige número de caso y token privado en el cuerpo", () => {
  const valid = {
    applicationNumber: "MC-2026-AB12CD34",
    accessToken: "a".repeat(43)
  };
  assert.equal(trackingLookupSchema.safeParse(valid).success, true);
  assert.equal(trackingLookupSchema.safeParse({ applicationNumber: valid.applicationNumber }).success, false);
  assert.equal(trackingLookupSchema.safeParse({ ...valid, accessToken: "corto" }).success, false);
  assert.equal(trackingLookupSchema.safeParse({ ...valid, applicantDocument: "123456789" }).success, false);
});
