import test from "node:test";
import assert from "node:assert/strict";
import { getOrCreateApplicantForSubmission } from "../src/services/applicantSubmission.service.js";

const applicantData = {
  documentType: "CC",
  documentNumber: "123456789",
  firstName: "Nombre nuevo",
  lastName: "Apellido nuevo",
  monthlyIncome: 2500000
};

test("una solicitud pública reutiliza al solicitante existente sin modificar su perfil", async () => {
  const existing = {
    id: "a".repeat(24),
    documentNumber: applicantData.documentNumber,
    firstName: "Nombre original",
    lastName: "Apellido original",
    monthlyIncome: 1200000
  };
  const calls = { find: 0, create: 0, update: 0 };
  const tx = {
    applicant: {
      findUnique: async ({ where }) => {
        calls.find += 1;
        assert.equal(where.documentNumber, applicantData.documentNumber);
        return existing;
      },
      create: async () => { calls.create += 1; throw new Error("No debe crear duplicado"); },
      update: async () => { calls.update += 1; throw new Error("El perfil existente no se debe actualizar"); }
    }
  };

  const result = await getOrCreateApplicantForSubmission(tx, applicantData);

  assert.equal(result, existing);
  assert.equal(result.firstName, "Nombre original");
  assert.equal(result.monthlyIncome, 1200000);
  assert.deepEqual(calls, { find: 1, create: 0, update: 0 });
});

test("una solicitud pública crea un perfil cuando el documento no existe", async () => {
  const created = { id: "b".repeat(24), ...applicantData };
  const calls = { find: 0, create: 0 };
  const tx = {
    applicant: {
      findUnique: async () => { calls.find += 1; return null; },
      create: async ({ data }) => { calls.create += 1; assert.deepEqual(data, applicantData); return created; }
    }
  };

  const result = await getOrCreateApplicantForSubmission(tx, applicantData);

  assert.equal(result, created);
  assert.deepEqual(calls, { find: 1, create: 1 });
});
