import { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "@codepulse/auth";
import { getEnv } from "@codepulse/config";
import type { JwtPayload } from "@codepulse/types";

/**
 * Extend Express Request to include authenticated user info.
 */
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

/**
 * Middleware to authenticate requests via Bearer token.
 * Attaches decoded JWT payload to `req.user`.
 */
export function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({
      error: "Unauthorized",
      message: "Missing or malformed Authorization header",
      statusCode: 401,
    });
    return;
  }

  const token = authHeader.slice(7);
  const env = getEnv();
  const payload = verifyAccessToken(token, env.JWT_SECRET);

  if (!payload) {
    res.status(401).json({
      error: "Unauthorized",
      message: "Invalid or expired access token",
      statusCode: 401,
    });
    return;
  }

  req.user = payload;
  next();
}
