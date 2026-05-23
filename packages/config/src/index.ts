import { z } from "zod";
import dotenv from "dotenv";
import path from "path";

// Walk up from cwd to find the root .env (handles monorepo sub-package CWDs)
const candidates = [
  path.resolve(process.cwd(), ".env"),
  path.resolve(process.cwd(), "../../.env"),
  path.resolve(process.cwd(), "../../../.env"),
];
for (const p of candidates) {
  const result = dotenv.config({ path: p });
  if (!result.error) break;
}

const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().url(),

  // Redis
  REDIS_URL: z.string().url(),

  // Auth
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default("15m"),
  REFRESH_TOKEN_EXPIRES_IN: z.string().default("7d"),

  // OpenAI
  OPENAI_API_KEY: z.string().startsWith("sk-"),
  OPENAI_MODEL: z.string().default("gpt-4o"),

  // Ports
  API_PORT: z.coerce.number().default(4000),
  REALTIME_PORT: z.coerce.number().default(4001),
  WORKER_PORT: z.coerce.number().default(4002),
  WEB_PORT: z.coerce.number().default(3000),

  // CORS
  CORS_ORIGIN: z.string().url().default("http://localhost:3000"),

  // Node
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
});

export type Env = z.infer<typeof envSchema>;

/**
 * Parse and validate environment variables.
 * Throws a descriptive error on invalid config so the service
 * fails fast at startup, not minutes later in production.
 */
export function loadEnv(): Env {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    console.error("❌ Invalid environment variables:");
    console.error(result.error.format());
    throw new Error("Environment validation failed. Check .env file.");
  }

  return result.data;
}

/**
 * Lazy singleton so modules can import `env` directly.
 * Falls back to partial parsing in development for convenience.
 */
let _env: Env | null = null;

export function getEnv(): Env {
  if (!_env) {
    _env = loadEnv();
  }
  return _env;
}

export { envSchema };
