import { Router, Request, Response } from "express";
import { prisma } from "@codepulse/db";
import { v4 as uuid } from "uuid";
import { z } from "zod";
import { authenticate } from "../middleware/authenticate";
import { validate } from "../middleware/validate";

export const workspaceRouter = Router();

const createWorkspaceSchema = z.object({
  name: z.string().min(1).max(100),
});

// ── Create Workspace ─────────────────────────────────────

workspaceRouter.post(
  "/",
  authenticate,
  validate(createWorkspaceSchema),
  async (req: Request, res: Response): Promise<void> => {
    const { name } = req.body;
    const userId = req.user!.sub;
    const workspaceId = uuid();

    const workspace = await prisma.workspace.create({
      data: {
        id: workspaceId,
        name,
        ownerUserId: userId,
        members: {
          create: { userId, role: "owner" },
        },
      },
    });

    res.status(201).json({ data: workspace });
  }
);

// ── List User Workspaces ─────────────────────────────────

workspaceRouter.get(
  "/",
  authenticate,
  async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.sub;

    const memberships = await prisma.workspaceMember.findMany({
      where: { userId },
      include: {
        workspace: {
          include: {
            _count: { select: { files: true, members: true } },
          },
        },
      },
      orderBy: { joinedAt: "desc" },
    });

    const workspaces = memberships.map((m) => ({
      ...m.workspace,
      role: m.role,
      fileCount: m.workspace._count.files,
      memberCount: m.workspace._count.members,
    }));

    res.json({ data: workspaces });
  }
);

// ── Get Workspace ────────────────────────────────────────

workspaceRouter.get(
  "/:workspaceId",
  authenticate,
  async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.sub;
    const { workspaceId } = req.params;

    const membership = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: { workspaceId, userId },
      },
      include: {
        workspace: {
          include: {
            members: {
              include: { user: { select: { id: true, displayName: true, email: true, avatarUrl: true } } },
            },
            files: { orderBy: { updatedAt: "desc" } },
          },
        },
      },
    });

    if (!membership) {
      res.status(404).json({
        error: "NotFound",
        message: "Workspace not found or access denied",
        statusCode: 404,
      });
      return;
    }

    res.json({
      data: {
        ...membership.workspace,
        role: membership.role,
      },
    });
  }
);

// ── Invite Member ────────────────────────────────────────

const inviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(["editor", "viewer"]),
});

workspaceRouter.post(
  "/:workspaceId/invite",
  authenticate,
  validate(inviteSchema),
  async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.sub;
    const { workspaceId } = req.params;
    const { email, role } = req.body;

    // Check caller is owner or editor
    const callerMembership = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId } },
    });

    if (!callerMembership || callerMembership.role === "viewer") {
      res.status(403).json({
        error: "Forbidden",
        message: "Only owners and editors can invite members",
        statusCode: 403,
      });
      return;
    }

    const invitee = await prisma.user.findUnique({ where: { email } });
    if (!invitee) {
      res.status(404).json({
        error: "NotFound",
        message: "User not found",
        statusCode: 404,
      });
      return;
    }

    const existing = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId: invitee.id } },
    });

    if (existing) {
      res.status(409).json({
        error: "Conflict",
        message: "User is already a member",
        statusCode: 409,
      });
      return;
    }

    const member = await prisma.workspaceMember.create({
      data: { workspaceId, userId: invitee.id, role },
    });

    res.status(201).json({ data: member });
  }
);
