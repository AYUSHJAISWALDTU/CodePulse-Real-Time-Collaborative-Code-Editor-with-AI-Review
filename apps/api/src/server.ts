import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { getEnv } from "@codepulse/config";
import { authRouter } from "./routes/auth";
import { workspaceRouter } from "./routes/workspaces";
import { fileRouter } from "./routes/files";
import { reviewRouter } from "./routes/reviews";
import { healthRouter } from "./routes/health";
import { errorHandler } from "./middleware/error-handler";
import { apiLimiter } from "./middleware/rate-limit";

const env = getEnv();
const app = express();

// ── Global Middleware ────────────────────────────────────

app.use(helmet());
app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
app.use(express.json({ limit: "1mb" }));
app.use(morgan(env.NODE_ENV === "production" ? "combined" : "dev"));
app.use(apiLimiter);

// ── Routes ───────────────────────────────────────────────

app.use("/api/health", healthRouter);
app.use("/api/auth", authRouter);
app.use("/api/workspaces", workspaceRouter);
app.use("/api/files", fileRouter);
app.use("/api/reviews", reviewRouter);

// ── Error Handling ───────────────────────────────────────

app.use(errorHandler);

// ── Start ────────────────────────────────────────────────

app.listen(env.API_PORT, () => {
  console.log(`🚀 API server running on port ${env.API_PORT}`);
  console.log(`   Environment: ${env.NODE_ENV}`);
});

export default app;
