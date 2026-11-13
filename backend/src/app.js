import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import applicationRoutes from "./routes/application.routes.js";
import applicationManagementRoutes from "./routes/application.management.routes.js";
import applicantRoutes from "./routes/applicant.routes.js";
import authRoutes from "./routes/auth.routes.js";
import userRoutes from "./routes/user.routes.js";
import policyRoutes from "./routes/policy.routes.js";
import applicationEvaluationRoutes from "./routes/application.evaluation.routes.js";
import loanRoutes from "./routes/loan.routes.js";

const app = express();
app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL ?? "http://localhost:5173" }));
app.use(express.json({ limit: "1mb" }));
app.use(morgan("dev"));

app.get("/api/health", (_req, res) => res.status(200).json({
  success: true,
  message: "Microcredit API is running",
  timestamp: new Date().toISOString()
}));

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/applicants", applicantRoutes);
// El router público (POST / del formulario) va primero; el de gestión exige sesión.
app.use("/api/applications", applicationRoutes);
app.use("/api/applications", applicationManagementRoutes);
app.use("/api/applications", applicationEvaluationRoutes);
app.use("/api/policies", policyRoutes);
app.use("/api/loans", loanRoutes);

app.use((req, res) => res.status(404).json({
  success: false,
  message: `Route not found: ${req.method} ${req.originalUrl}`
}));

app.use((error, _req, res, _next) => {
  // Los errores esperados (401, 403, 404, 409...) no necesitan imprimir la traza completa.
  if (!error.status || error.status >= 500) console.error(error);
  res.status(error.status ?? 500).json({
    success: false,
    message: error.status && error.status < 500 ? error.message : "Internal server error",
    ...(error.details ? { details: error.details } : {})
  });
});

export default app;