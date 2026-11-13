import { PrismaClient } from "@prisma/client";
import { assertMutationAllowed } from "../domain/immutability.js";

// Cliente compartido. La extensión bloquea editar o borrar AuditLog, LoanDecision y Payment (ADR-004):
// las correcciones se registran como eventos nuevos. Las operaciones raw ($runCommandRaw) no pasan por aquí.
function createClient() {
  return new PrismaClient().$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          assertMutationAllowed(model, operation);
          return query(args);
        }
      }
    }
  });
}

const globalForPrisma = globalThis;
export const prisma = globalForPrisma.prisma ?? createClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
