import { Server, Socket } from "socket.io";
import { prisma } from "@codepulse/db";
import { v4 as uuid } from "uuid";
import type { RoomJoinPayload, RoomJoinedPayload, PeerInfo } from "@codepulse/types";

// Ephemeral in-memory presence for fast lookups on this pod
const roomPeers = new Map<string, Map<string, PeerInfo>>();

// Assign consistent colors to collaborators
const PEER_COLORS = [
  "#2F7DFF", "#FF6B6B", "#4ECB71", "#FFB347",
  "#9B59B6", "#1ABC9C", "#E74C3C", "#3498DB",
];

function getColor(index: number): string {
  return PEER_COLORS[index % PEER_COLORS.length];
}

export function registerRoomHandlers(io: Server, socket: Socket) {
  // ── Join Room ──────────────────────────────────────────

  socket.on("room:join", async (payload: RoomJoinPayload) => {
    const { roomId, fileId } = payload;
    const userId = socket.user.sub;

    try {
      // Verify room exists and user has file access
      const room = await prisma.collaborationRoom.findUnique({
        where: { id: roomId },
        include: {
          file: true,
          snapshots: {
            orderBy: { versionNo: "desc" },
            take: 1,
          },
        },
      });

      if (!room) {
        socket.emit("room:error", { message: "Room not found" });
        return;
      }

      // Check workspace membership
      const membership = await prisma.workspaceMember.findUnique({
        where: {
          workspaceId_userId: {
            workspaceId: room.file.workspaceId,
            userId,
          },
        },
      });

      if (!membership) {
        socket.emit("room:error", { message: "Access denied" });
        return;
      }

      // Join the Socket.io room
      socket.join(roomId);

      // Track peer in memory
      if (!roomPeers.has(roomId)) {
        roomPeers.set(roomId, new Map());
      }
      const peers = roomPeers.get(roomId)!;
      const peerInfo: PeerInfo = {
        userId,
        displayName: socket.user.email.split("@")[0],
        avatarUrl: null,
        color: getColor(peers.size),
      };
      peers.set(userId, peerInfo);

      // Record session
      await prisma.roomSession.create({
        data: {
          id: uuid(),
          roomId,
          userId,
          socketId: socket.id,
        },
      });

      // Send current state to joining user
      const latestSnapshot = room.snapshots[0];
      const joined: RoomJoinedPayload = {
        snapshotVersion: latestSnapshot
          ? Number(latestSnapshot.versionNo)
          : 0,
        content: latestSnapshot?.textContent ?? "",
        peers: Array.from(peers.values()),
      };
      socket.emit("room:joined", joined);

      // Notify other room members
      socket.to(roomId).emit("presence:update", {
        userId,
        displayName: peerInfo.displayName,
        avatarUrl: peerInfo.avatarUrl,
        color: peerInfo.color,
        activeFileId: fileId,
        isTyping: false,
        lastSeen: new Date().toISOString(),
      });
    } catch (err) {
      console.error("room:join error:", err);
      socket.emit("room:error", { message: "Failed to join room" });
    }
  });

  // ── Leave Room ─────────────────────────────────────────

  socket.on("room:leave", async (payload: { roomId: string }) => {
    const { roomId } = payload;
    const userId = socket.user.sub;

    socket.leave(roomId);

    // Remove from peer map
    const peers = roomPeers.get(roomId);
    if (peers) {
      peers.delete(userId);
      if (peers.size === 0) {
        roomPeers.delete(roomId);
      }
    }

    // Update session record
    await prisma.roomSession.updateMany({
      where: { roomId, userId, leftAt: null },
      data: { leftAt: new Date() },
    });

    // Notify remaining peers
    socket.to(roomId).emit("peer:left", { userId });
  });

  // ── Cleanup on Disconnect ──────────────────────────────

  socket.on("disconnect", async () => {
    const userId = socket.user.sub;

    // Clean up all rooms this socket was in
    for (const [roomId, peers] of roomPeers.entries()) {
      if (peers.has(userId)) {
        peers.delete(userId);
        if (peers.size === 0) {
          roomPeers.delete(roomId);
        }
        socket.to(roomId).emit("peer:left", { userId });
      }
    }

    // Mark sessions as ended
    await prisma.roomSession.updateMany({
      where: { userId, socketId: socket.id, leftAt: null },
      data: { leftAt: new Date() },
    });
  });
}
