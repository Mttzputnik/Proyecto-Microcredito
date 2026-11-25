import test from "node:test";
import assert from "node:assert/strict";
import { listAuditEvents } from "../src/services/auditQuery.service.js";

test("pagina eventos y resuelve el nombre del actor sin exponer metadatos", async () => {
  const events = [
    { id: "e1", actorId: "u1", action: "PAYMENT_REGISTERED", entityType: "Loan", entityId: "l1", description: "Pago registrado", occurredAt: new Date("2026-11-01T10:00:00Z"), metadata: { amount: 100 } },
    { id: "e2", actorId: null, action: "ARREARS_MONITORED", entityType: "PaymentSchedule", entityId: "daily-monitor", description: "Monitoreo ejecutado", occurredAt: new Date("2026-11-02T10:00:00Z") }
  ];
  const prisma = {
    auditLog: {
      count: async () => events.length,
      findMany: async () => events.map(({ metadata, ...event }) => event)
    },
    user: { findMany: async () => [{ id: "u1", firstName: "Ana", lastName: "Pérez" }] }
  };
  const result = await listAuditEvents(prisma, { page: 1, limit: 10 });
  assert.equal(result.pagination.total, 2);
  assert.deepEqual(prisma.auditLog.findMany && { orderBy: [{ occurredAt: "desc" }, { id: "desc" }] }, { orderBy: [{ occurredAt: "desc" }, { id: "desc" }] });
  assert.equal(result.items[0].actorName, "Ana Pérez");
  assert.equal(result.items[1].actorName, "Sistema");
  assert.equal(Object.hasOwn(result.items[0], "metadata"), false);
});
