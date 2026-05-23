import { Router, Request, Response } from "express";
import { prisma } from "@codepulse/db";

export const healthRouter = Router();

healthRouter.get("/", (_req: Request, res: Response) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

healthRouter.get("/ready", async (_req: Request, res: Response) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: "ready", database: "connected" });
  } catch (err) {
    res.status(503).json({ status: "not ready", database: "disconnected" });
  }
});
