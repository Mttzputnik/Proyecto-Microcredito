import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

try {
  // Backfill existing schedule documents before enabling version-aware queries.
  // MongoDB collection name follows the Prisma model name (PaymentSchedule).
  const result = await prisma.$runCommandRaw({
    update: "PaymentSchedule",
    updates: [{
      q: { isCurrent: { $exists: false } },
      u: { $set: { isCurrent: true, scheduleVersion: 1 } },
      multi: true
    }]
  });
  console.log("Payment schedule version migration completed:", result);
} finally {
  await prisma.$disconnect();
}
