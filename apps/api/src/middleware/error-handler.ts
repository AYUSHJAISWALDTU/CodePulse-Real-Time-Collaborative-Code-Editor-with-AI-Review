import { Request, Response, NextFunction } from "express";

/**
 * Global error handler. Catches unhandled errors from route handlers
 * and returns a consistent JSON error response.
 */
export function errorHandler(
  err: Error & { statusCode?: number },
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  const statusCode = err.statusCode ?? 500;
  const message =
    statusCode === 500 && process.env.NODE_ENV === "production"
      ? "Internal server error"
      : err.message;

  if (statusCode === 500) {
    console.error("Unhandled error:", err);
  }

  res.status(statusCode).json({
    error: err.name || "Error",
    message,
    statusCode,
  });
}
