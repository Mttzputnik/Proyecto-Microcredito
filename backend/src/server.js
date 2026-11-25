import "dotenv/config";
import app from "./app.js";
import { prisma } from "./config/prisma.js";
import { monitorArrears } from "./services/loan.service.js";

const PORT = Number(process.env.PORT ?? 3001);
const server = app.listen(PORT, () => console.log(`Microcredit API listening on port ${PORT}`));

const DAY_MS = 24 * 60 * 60 * 1000;
const configuredInterval = Number.parseInt(process.env.ARREARS_MONITOR_INTERVAL_MS ?? String(DAY_MS), 10);
const monitorInterval = Number.isInteger(configuredInterval) && configuredInterval >= 60_000
  ? configuredInterval
  : DAY_MS;

async function runArrearsMonitor() {
  try {
    const result = await monitorArrears(prisma);
    console.log("Arrears monitoring completed:", result);
  } catch (error) {
    console.error("Arrears monitoring failed:", error);
  }
}

// Primera ejecución al iniciar y luego con la periodicidad configurada.
void runArrearsMonitor();
const arrearsTimer = setInterval(runArrearsMonitor, monitorInterval);
arrearsTimer.unref?.();

async function shutdown(signal) {
  console.log(`${signal} received. Closing server...`);
  clearInterval(arrearsTimer);
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}
process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
