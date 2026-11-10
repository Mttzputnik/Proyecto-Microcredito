import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import applicationRoutes from "./routes/application.routes.js";

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

app.use("/api/applications", applicationRoutes);

app.use((req, res) => res.status(404).json({
  success: false,
  message: `Route not found: ${req.method} ${req.originalUrl}`
}));

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(error.status ?? 500).json({
    success: false,
    message: error.status && error.status < 500 ? error.message : "Internal server error",
    ...(error.details ? { details: error.details } : {})
  });
});

export default app;