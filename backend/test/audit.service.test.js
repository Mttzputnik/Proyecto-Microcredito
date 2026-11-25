import test from "node:test";
import assert from "node:assert/strict";
import { writeAudit } from "../src/services/audit.service.js";

test("writeAudit persiste un evento mínimo y conserva metadatos estructurados", async () => {
  let received;
  const db = { auditLog: { create: async ({ data }) => { received = data; return { id: "event-1", ...data }; } } };
  const result = await writeAudit(db, {
    actorId: "user-1",
    action: "PAYMENT_REGISTERED",
    entityType: "Loan",
    entityId: "loan-1",
    description: "Pago registrado",
    metadata: { paymentId: "payment-1", amount: 250 }
  });
  assert.equal(result.id, "event-1");
  assert.equal(received.actorId, "user-1");
  assert.equal(received.entityId, "loan-1");
  assert.deepEqual(received.metadata, { paymentId: "payment-1", amount: 250 });
});

test("writeAudit admite eventos automáticos sin actor humano", async () => {
  let received;
  const db = { auditLog: { create: async ({ data }) => { received = data; return data; } } };
  await writeAudit(db, {
    actorId: null,
    action: "ARREARS_MONITORED",
    entityType: "PaymentSchedule",
    entityId: "daily-monitor",
    description: "Monitoreo automático ejecutado"
  });
  assert.equal(received.actorId, null);
  assert.equal(Object.hasOwn(received, "metadata"), false);
});

test("writeAudit rechaza eventos incompletos o metadatos no estructurados", async () => {
  const db = { auditLog: { create: async () => { throw new Error("No debe persistir"); } } };
  await assert.rejects(
    () => writeAudit(db, { action: "PAYMENT_REGISTERED", entityType: "Loan", entityId: "loan-1" }),
    (error) => error.code === "AUDIT_INVALID_EVENT"
  );
  await assert.rejects(
    () => writeAudit(db, {
      actorId: "user-1", action: "PAYMENT_REGISTERED", entityType: "Loan",
      entityId: "loan-1", description: "Pago registrado", metadata: ["no", "es", "objeto"]
    }),
    (error) => error.code === "AUDIT_INVALID_EVENT"
  );
  await assert.rejects(
    () => writeAudit({}, {
      actorId: "user-1", action: "PAYMENT_REGISTERED", entityType: "Loan",
      entityId: "loan-1", description: "Pago registrado"
    }),
    (error) => error.code === "AUDIT_INVALID_EVENT"
  );
});
