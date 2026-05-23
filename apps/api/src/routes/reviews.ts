import { Router, Request, Response } from "express";
import { prisma } from "@codepulse/db";
import { v4 as uuid } from "uuid";
import { z } from "zod";
import { authenticate } from "../middleware/authenticate";
import { validate } from "../middleware/validate";
import { reviewLimiter } from "../middleware/rate-limit";

export const reviewRouter = Router();

// ── Create Review ────────────────────────────────────────

const createReviewSchema = z.object({
  fileId: z.string().uuid(),
});

reviewRouter.post(
  "/",
  authenticate,
  reviewLimiter,
  validate(createReviewSchema),
  async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.sub;
    const { fileId } = req.body;

    const file = await prisma.file.findUnique({
      where: { id: fileId },
      include: {
        rooms: {
          where: { branchName: "main" },
          include: {
            snapshots: { orderBy: { versionNo: "desc" }, take: 1 },
          },
        },
      },
    });

    if (!file) {
      res.status(404).json({
        error: "NotFound",
        message: "File not found",
        statusCode: 404,
      });
      return;
    }

    // Check membership
    const membership = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: { workspaceId: file.workspaceId, userId },
      },
    });

    if (!membership) {
      res.status(403).json({
        error: "Forbidden",
        message: "Access denied",
        statusCode: 403,
      });
      return;
    }

    const snapshot = file.rooms[0]?.snapshots[0];
    if (!snapshot) {
      res.status(400).json({
        error: "BadRequest",
        message: "No content snapshot found for this file",
        statusCode: 400,
      });
      return;
    }

    // Create queued review job
    const job = await prisma.aiReviewJob.create({
      data: {
        id: uuid(),
        fileId,
        snapshotId: snapshot.id,
        triggeredBy: userId,
        status: "queued",
        modelName: process.env.OPENAI_MODEL || "gpt-4o",
      },
    });

    // In production, this would publish to a job queue.
    // The worker service picks it up asynchronously.

    res.status(202).json({
      data: {
        reviewJobId: job.id,
        status: job.status,
        message: "Review queued. Results will be streamed when ready.",
      },
    });
  }
);

// ── Get Review ───────────────────────────────────────────

reviewRouter.get(
  "/:reviewId",
  authenticate,
  async (req: Request, res: Response): Promise<void> => {
    const { reviewId } = req.params;

    const job = await prisma.aiReviewJob.findUnique({
      where: { id: reviewId },
      include: {
        findings: {
          orderBy: { startLine: "asc" },
        },
        snapshot: {
          select: { versionNo: true },
        },
      },
    });

    if (!job) {
      res.status(404).json({
        error: "NotFound",
        message: "Review not found",
        statusCode: 404,
      });
      return;
    }

    res.json({
      data: {
        ...job,
        snapshot: {
          versionNo: Number(job.snapshot.versionNo),
        },
      },
    });
  }
);

// ── List Reviews for a File ──────────────────────────────

reviewRouter.get(
  "/file/:fileId",
  authenticate,
  async (req: Request, res: Response): Promise<void> => {
    const { fileId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = Math.min(
      parseInt(req.query.pageSize as string) || 10,
      50
    );

    const [reviews, total] = await Promise.all([
      prisma.aiReviewJob.findMany({
        where: { fileId },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          _count: { select: { findings: true } },
          triggerer: {
            select: { displayName: true, avatarUrl: true },
          },
        },
      }),
      prisma.aiReviewJob.count({ where: { fileId } }),
    ]);

    res.json({
      data: reviews,
      total,
      page,
      pageSize,
      hasMore: page * pageSize < total,
    });
  }
);
