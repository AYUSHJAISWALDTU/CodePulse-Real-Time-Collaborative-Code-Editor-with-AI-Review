import { Router, Request, Response } from "express";
import { prisma } from "@codepulse/db";
import {
  hashPassword,
  verifyPassword,
  signAccessToken,
  signRefreshToken,
  hashToken,
} from "@codepulse/auth";
import { getEnv } from "@codepulse/config";
import { v4 as uuid } from "uuid";
import { z } from "zod";
import { validate } from "../middleware/validate";
import { authLimiter } from "../middleware/rate-limit";

export const authRouter = Router();

// ── Schemas ──────────────────────────────────────────────

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  displayName: z.string().min(1).max(100),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

const refreshSchema = z.object({
  refreshToken: z.string(),
});

// ── Register ─────────────────────────────────────────────

authRouter.post(
  "/register",
  authLimiter,
  validate(registerSchema),
  async (req: Request, res: Response): Promise<void> => {
    const { email, password, displayName } = req.body;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      res.status(409).json({
        error: "Conflict",
        message: "Email already registered",
        statusCode: 409,
      });
      return;
    }

    const passwordHash = await hashPassword(password);
    const user = await prisma.user.create({
      data: { id: uuid(), email, passwordHash, displayName },
    });

    const env = getEnv();
    const sessionId = uuid();

    const accessToken = signAccessToken(
      { sub: user.id, email: user.email, sessionId },
      env.JWT_SECRET,
      env.JWT_EXPIRES_IN
    );

    const refreshToken = signRefreshToken();
    await prisma.refreshToken.create({
      data: {
        id: uuid(),
        userId: user.id,
        tokenHash: hashToken(refreshToken),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    res.status(201).json({
      data: {
        user: {
          id: user.id,
          email: user.email,
          displayName: user.displayName,
          avatarUrl: user.avatarUrl,
        },
        accessToken,
        refreshToken,
      },
    });
  }
);

// ── Login ────────────────────────────────────────────────

authRouter.post(
  "/login",
  authLimiter,
  validate(loginSchema),
  async (req: Request, res: Response): Promise<void> => {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      res.status(401).json({
        error: "Unauthorized",
        message: "Invalid email or password",
        statusCode: 401,
      });
      return;
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      res.status(401).json({
        error: "Unauthorized",
        message: "Invalid email or password",
        statusCode: 401,
      });
      return;
    }

    const env = getEnv();
    const sessionId = uuid();

    const accessToken = signAccessToken(
      { sub: user.id, email: user.email, sessionId },
      env.JWT_SECRET,
      env.JWT_EXPIRES_IN
    );

    const refreshToken = signRefreshToken();
    await prisma.refreshToken.create({
      data: {
        id: uuid(),
        userId: user.id,
        tokenHash: hashToken(refreshToken),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    res.json({
      data: {
        user: {
          id: user.id,
          email: user.email,
          displayName: user.displayName,
          avatarUrl: user.avatarUrl,
        },
        accessToken,
        refreshToken,
      },
    });
  }
);

// ── Refresh ──────────────────────────────────────────────

authRouter.post(
  "/refresh",
  validate(refreshSchema),
  async (req: Request, res: Response): Promise<void> => {
    const { refreshToken } = req.body;
    const tokenHash = hashToken(refreshToken);

    const stored = await prisma.refreshToken.findFirst({
      where: { tokenHash, revokedAt: null, expiresAt: { gt: new Date() } },
      include: { user: true },
    });

    if (!stored) {
      res.status(401).json({
        error: "Unauthorized",
        message: "Invalid or expired refresh token",
        statusCode: 401,
      });
      return;
    }

    // Revoke old token (rotation)
    await prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });

    const env = getEnv();
    const sessionId = uuid();
    const user = stored.user;

    const newAccessToken = signAccessToken(
      { sub: user.id, email: user.email, sessionId },
      env.JWT_SECRET,
      env.JWT_EXPIRES_IN
    );

    const newRefreshToken = signRefreshToken();
    await prisma.refreshToken.create({
      data: {
        id: uuid(),
        userId: user.id,
        tokenHash: hashToken(newRefreshToken),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    res.json({
      data: {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      },
    });
  }
);
