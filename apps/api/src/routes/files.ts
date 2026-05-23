import { Router, Request, Response } from "express";
import { prisma } from "@codepulse/db";
import { v4 as uuid } from "uuid";
import { z } from "zod";
import { authenticate } from "../middleware/authenticate";
import { validate } from "../middleware/validate";

export const fileRouter = Router();

// ── Schemas ──────────────────────────────────────────────

const createFileSchema = z.object({
  workspaceId: z.string().uuid(),
  path: z.string().min(1).max(500),
  language: z.string().min(1).max(50),
  content: z.string().optional().default(""),
});

const updateContentSchema = z.object({
  content: z.string(),
});

// ── Create File ──────────────────────────────────────────

fileRouter.post(
  "/",
  authenticate,
  validate(createFileSchema),
  async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.sub;
    const { workspaceId, path, language, content } = req.body;

    // Check membership
    const membership = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId } },
    });

    if (!membership || membership.role === "viewer") {
      res.status(403).json({
        error: "Forbidden",
        message: "Cannot create files in this workspace",
        statusCode: 403,
      });
      return;
    }

    const fileId = uuid();
    const roomId = uuid();
    const snapshotId = uuid();

    const file = await prisma.file.create({
      data: {
        id: fileId,
        workspaceId,
        path,
        language,
        createdBy: userId,
        rooms: {
          create: {
            id: roomId,
            status: "idle",
            latestSnapshotId: snapshotId,
            snapshots: {
              create: {
                id: snapshotId,
                fileId,
                versionNo: 1,
                textContent: content,
                createdBy: userId,
                reason: "manual_save",
              },
            },
          },
        },
      },
      include: { rooms: true },
    });

    res.status(201).json({ data: file });
  }
);

// ── Get File ─────────────────────────────────────────────

fileRouter.get(
  "/:fileId",
  authenticate,
  async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.sub;
    const { fileId } = req.params;

    const file = await prisma.file.findUnique({
      where: { id: fileId },
      include: {
        rooms: {
          where: { branchName: "main" },
          include: {
            snapshots: {
              orderBy: { versionNo: "desc" },
              take: 1,
            },
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

    // Verify membership
    const membership = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId: file.workspaceId, userId } },
    });

    if (!membership) {
      res.status(403).json({
        error: "Forbidden",
        message: "Access denied",
        statusCode: 403,
      });
      return;
    }

    const latestSnapshot = file.rooms[0]?.snapshots[0];

    res.json({
      data: {
        ...file,
        content: latestSnapshot?.textContent ?? "",
        version: latestSnapshot?.versionNo
          ? Number(latestSnapshot.versionNo)
          : 0,
      },
    });
  }
);

// ── Update File Content ──────────────────────────────────

fileRouter.put(
  "/:fileId/content",
  authenticate,
  validate(updateContentSchema),
  async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.sub;
    const { fileId } = req.params;
    const { content } = req.body;

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

    const membership = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId: file.workspaceId, userId } },
    });

    if (!membership || membership.role === "viewer") {
      res.status(403).json({
        error: "Forbidden",
        message: "Cannot edit this file",
        statusCode: 403,
      });
      return;
    }

    const room = file.rooms[0];
    const lastVersion = room?.snapshots[0]?.versionNo ?? BigInt(0);
    const newVersion = lastVersion + BigInt(1);
    const snapshotId = uuid();

    const snapshot = await prisma.documentSnapshot.create({
      data: {
        id: snapshotId,
        roomId: room.id,
        fileId,
        versionNo: newVersion,
        textContent: content,
        createdBy: userId,
        reason: "manual_save",
      },
    });

    // Update room pointer
    await prisma.collaborationRoom.update({
      where: { id: room.id },
      data: { latestSnapshotId: snapshotId },
    });

    // Touch file updated_at
    await prisma.file.update({
      where: { id: fileId },
      data: { updatedAt: new Date() },
    });

    res.json({
      data: {
        fileId,
        version: Number(newVersion),
        savedAt: snapshot.createdAt,
      },
    });
  }
);

// ── Get File History ─────────────────────────────────────

fileRouter.get(
  "/:fileId/history",
  authenticate,
  async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.sub;
    const { fileId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = Math.min(parseInt(req.query.pageSize as string) || 20, 50);

    const file = await prisma.file.findUnique({ where: { id: fileId } });
    if (!file) {
      res.status(404).json({
        error: "NotFound",
        message: "File not found",
        statusCode: 404,
      });
      return;
    }

    const membership = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId: file.workspaceId, userId } },
    });

    if (!membership) {
      res.status(403).json({
        error: "Forbidden",
        message: "Access denied",
        statusCode: 403,
      });
      return;
    }

    const [snapshots, total] = await Promise.all([
      prisma.documentSnapshot.findMany({
        where: { fileId },
        orderBy: { versionNo: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          versionNo: true,
          reason: true,
          createdAt: true,
          createdBy: true,
          creator: {
            select: { displayName: true, avatarUrl: true },
          },
        },
      }),
      prisma.documentSnapshot.count({ where: { fileId } }),
    ]);

    res.json({
      data: snapshots.map((s) => ({
        ...s,
        versionNo: Number(s.versionNo),
      })),
      total,
      page,
      pageSize,
      hasMore: page * pageSize < total,
    });
  }
);
