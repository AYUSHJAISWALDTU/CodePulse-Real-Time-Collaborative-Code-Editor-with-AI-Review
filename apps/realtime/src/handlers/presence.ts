import { Server, Socket } from "socket.io";
import type { PresenceUpdatePayload } from "@codepulse/types";

/**
 * Presence handler.
 *
 * Presence is ephemeral — stored in Redis with TTL in production.
 * Heartbeats keep the presence alive; stale records expire automatically.
 */
export function registerPresenceHandlers(io: Server, socket: Socket) {
  socket.on(
    "presence:update",
    (payload: Partial<PresenceUpdatePayload> & { roomId: string }) => {
      const { roomId, ...presenceData } = payload;

      // Relay to all other clients in the room
      socket.to(roomId).emit("presence:update", {
        userId: socket.user.sub,
        ...presenceData,
        lastSeen: new Date().toISOString(),
      });
    }
  );

  // Heartbeat to keep presence alive
  socket.on("presence:heartbeat", (payload: { roomId: string }) => {
    const { roomId } = payload;

    socket.to(roomId).emit("presence:update", {
      userId: socket.user.sub,
      lastSeen: new Date().toISOString(),
    });
  });
}
