import test from "node:test";
import assert from "node:assert/strict";
import { changeApplicationStatus, verifyConditionalApproval } from "../src/services/applicationStatus.service.js";

// Prisma falso en memoria: registra lo que el servicio escribe.
function fakePrisma(initialStatus, { updateCount = 1, withConditionalApproval = true } = {}) {
  const calls = { decisions: [], conditionalApprovals: [], audits: [], updates: [] };
  const tx = {
    loanApplication: {
      findUnique: async () => (initialStatus ? { id: "a".repeat(24), status: initialStatus, assignedOfficerId: "b".repeat(24) } : null),
      updateMany: async (args) => { calls.updates.push(args); return { count: updateCount }; }
    },
    loanDecision: {
      create: async ({ data }) => { calls.decisions.push(data); return { id: "d".repeat(24) }; },
      findFirst: async () => ({ id: "d".repeat(24), conditions: "Presentar certificación laboral actualizada." })
    },
    conditionalApproval: {
      create: async ({ data }) => { calls.conditionalApprovals.push(data); return { id: "e".repeat(24), ...data }; },
      findUnique: async () => withConditionalApproval ? ({ id: "e".repeat(24), applicationId, decisionId: "d".repeat(24), status: "PENDING", conditions: "Presentar certificación laboral actualizada." }) : null,
      updateMany: async ({ data }) => { calls.conditionalApprovals.push(data); return { count: 1 }; }
    },
    auditLog: { create: async ({ data }) => { calls.audits.push(data); return data; } }
  };
  return { calls, $transaction: (fn) => fn(tx) };
}

const actor = { id: "b".repeat(24) };
const applicationId = "a".repeat(24);

test("pasar de SUBMITTED a UNDER_REVIEW cambia el estado y deja auditoría", async () => {
  const db = fakePrisma("SUBMITTED");
  const result = await changeApplicationStatus(db, { applicationId, toStatus: "UNDER_REVIEW", actor });
  assert.equal(result.status, "UNDER_REVIEW");
  assert.equal(db.calls.updates[0].where.status, "SUBMITTED");
  assert.equal(db.calls.decisions.length, 0);
  assert.equal(db.calls.audits.length, 1);
  assert.equal(db.calls.audits[0].action, "APPLICATION_STATUS_CHANGED");
});

test("aprobar exige justificación y no escribe nada sin ella", async () => {
  const db = fakePrisma("UNDER_REVIEW");
  await assert.rejects(
    () => changeApplicationStatus(db, { applicationId, toStatus: "APPROVED", actor }),
    (e) => e.status === 400
  );
  assert.equal(db.calls.updates.length, 0);
  await assert.rejects(
    () => changeApplicationStatus(db, { applicationId, toStatus: "APPROVED", actor, justification: "corto" }),
    (e) => e.status === 400 && /10 caracteres/.test(e.message)
  );
  assert.equal(db.calls.updates.length, 0);
});

test("aprobar con justificación registra la decisión y la auditoría", async () => {
  const db = fakePrisma("UNDER_REVIEW");
  const result = await changeApplicationStatus(db, {
    applicationId, toStatus: "APPROVED", actor, justification: "  Ingresos suficientes y buen historial.  "
  });
  assert.equal(result.decisionId, "d".repeat(24));
  assert.equal(db.calls.decisions[0].outcome, "APPROVED");
  assert.equal(db.calls.decisions[0].officerId, actor.id);
  assert.equal(db.calls.decisions[0].justification, "Ingresos suficientes y buen historial.");
  assert.equal(db.calls.audits[0].metadata.to, "APPROVED");
});

test("aprobar con condiciones exige y conserva condiciones justificadas", async () => {
  const db = fakePrisma("UNDER_REVIEW");
  await assert.rejects(
    () => changeApplicationStatus(db, { applicationId, toStatus: "APPROVED_WITH_CONDITIONS", actor, justification: "Evaluación favorable con requisitos.", conditions: "corto" }),
    (e) => e.status === 400 && /condiciones de al menos 10/.test(e.message)
  );
  assert.equal(db.calls.updates.length, 0);
  const result = await changeApplicationStatus(db, {
    applicationId, toStatus: "APPROVED_WITH_CONDITIONS", actor,
    justification: "La capacidad es suficiente con compromisos adicionales.",
    conditions: "Presentar soporte actualizado de ingresos antes del desembolso."
  });
  assert.equal(result.status, "APPROVED_WITH_CONDITIONS");
  assert.equal(db.calls.decisions[0].outcome, "APPROVED_WITH_CONDITIONS");
  assert.equal(db.calls.decisions[0].conditions, "Presentar soporte actualizado de ingresos antes del desembolso.");
  assert.equal(db.calls.conditionalApprovals[0].applicationId, applicationId);
  assert.equal(db.calls.conditionalApprovals[0].decisionId, "d".repeat(24));
  assert.equal(db.calls.audits[0].metadata.to, "APPROVED_WITH_CONDITIONS");
});

test("verificar condiciones habilita formalización y deja auditoría", async () => {
  const db = fakePrisma("APPROVED_WITH_CONDITIONS");
  const result = await verifyConditionalApproval(db, { applicationId, actor, notes: "Se revisó el soporte laboral y se confirmó el ingreso requerido." });
  assert.equal(result.status, "APPROVED");
  assert.equal(result.conditionalApprovalStatus, "VERIFIED");
  assert.equal(db.calls.conditionalApprovals.at(-1).status, "VERIFIED");
  assert.ok(db.calls.audits.some((event) => event.action === "CONDITIONAL_APPROVAL_VERIFIED"));
});

test("permite verificar expedientes condicionados históricos creando su seguimiento pendiente", async () => {
  const db = fakePrisma("APPROVED_WITH_CONDITIONS", { withConditionalApproval: false });
  const result = await verifyConditionalApproval(db, { applicationId, actor, notes: "Se revisaron los soportes históricos y se comprobó el cumplimiento." });
  assert.equal(result.status, "APPROVED");
  assert.equal(db.calls.conditionalApprovals[0].conditions, "Presentar certificación laboral actualizada.");
});

test("no permite aprobar directamente sin pasar por la verificación de condiciones", async () => {
  const db = fakePrisma("APPROVED_WITH_CONDITIONS");
  await assert.rejects(
    () => changeApplicationStatus(db, {
      applicationId, toStatus: "APPROVED", actor,
      justification: "Se verificó la documentación presentada."
    }),
    (e) => e.status === 409 && /verificación/.test(e.message)
  );
  assert.equal(db.calls.updates.length, 0);
});

test("una transición no permitida responde 409 y no escribe nada", async () => {
  const db = fakePrisma("REJECTED");
  await assert.rejects(
    () => changeApplicationStatus(db, { applicationId, toStatus: "APPROVED", actor, justification: "Cambio de opinión total" }),
    (e) => e.status === 409
  );
  assert.equal(db.calls.updates.length, 0);
  assert.equal(db.calls.audits.length, 0);
});

test("no se puede cancelar una solicitud que ya tiene préstamo", async () => {
  const db = fakePrisma("APPROVED");
  const original = db.$transaction;
  db.$transaction = (fn) => original((tx) => {
    const find = tx.loanApplication.findUnique;
    tx.loanApplication.findUnique = async (args) => ({ ...(await find(args)), loan: { id: "c".repeat(24) } });
    return fn(tx);
  });
  await assert.rejects(
    () => changeApplicationStatus(db, { applicationId, toStatus: "CANCELLED", actor }),
    (e) => e.status === 409 && /préstamo/.test(e.message)
  );
  assert.equal(db.calls.updates.length, 0);
});

test("un oficial distinto al asignado no puede cambiar la solicitud", async () => {
  const db = fakePrisma("SUBMITTED");
  const original = db.$transaction;
  db.$transaction = (fn) => original((tx) => {
    const find = tx.loanApplication.findUnique;
    tx.loanApplication.findUnique = async (args) => ({ ...(await find(args)), assignedOfficerId: "c".repeat(24) });
    return fn(tx);
  });
  await assert.rejects(
    () => changeApplicationStatus(db, { applicationId, toStatus: "UNDER_REVIEW", actor }),
    (e) => e.status === 404
  );
  assert.equal(db.calls.updates.length, 0);
});

test("solicitud inexistente responde 404", async () => {
  const db = fakePrisma(null);
  await assert.rejects(
    () => changeApplicationStatus(db, { applicationId, toStatus: "UNDER_REVIEW", actor }),
    (e) => e.status === 404
  );
});

test("si otro usuario cambió el estado en paralelo responde 409", async () => {
  const db = fakePrisma("SUBMITTED", { updateCount: 0 });
  await assert.rejects(
    () => changeApplicationStatus(db, { applicationId, toStatus: "UNDER_REVIEW", actor }),
    (e) => e.status === 409 && /cambió/.test(e.message)
  );
  assert.equal(db.calls.audits.length, 0);
});
