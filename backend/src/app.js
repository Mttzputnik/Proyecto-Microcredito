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
import reconsiderationRoutes from "./routes/reconsideration.routes.js";
import reportRoutes from "./routes/report.routes.js";
import auditRoutes from "./routes/audit.routes.js";

const app = express();

function normalizeOrigin(value) {
  try {
    return new URL(value.trim()).origin;
  } catch {
    throw new Error(`Invalid FRONTEND_URL origin: ${value}`);
  }
}

const allowedOrigins = (process.env.FRONTEND_URL ?? "http://localhost:5173")
  .split(",")
  .map(normalizeOrigin);

const corsOptions = {
  origin(origin, callback) {
    // Requests without Origin (curl, health checks and server-to-server) are allowed.
    if (!origin || allowedOrigins.includes(normalizeOrigin(origin))) {
      return callback(null, true);
    }
    return callback(new Error("Origin not allowed by CORS"));
  },
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  optionsSuccessStatus: 204
};

app.use(helmet());
app.use(cors(corsOptions));
app.options(/.*/, cors(corsOptions));
// Hasta 3 adjuntos de 4 MB codificados en base64.
app.use(express.json({ limit: "18mb" }));
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
app.use("/api/reconsiderations", reconsiderationRoutes);
app.use("/api/policies", policyRoutes);
app.use("/api/loans", loanRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/audit", auditRoutes);

app.use((req, res) => res.status(404).json({
  success: false,
  message: `Route not found: ${req.method} ${req.originalUrl}`
}));

app.use((error, _req, res, _next) => {
  if (!error.status || error.status >= 500) console.error(error);
  res.status(error.status ?? 500).json({
    success: false,
    message: error.status && error.status < 500 ? error.message : "Internal server error",
    ...(error.details ? { details: error.details } : {})
  });
});

export default app;