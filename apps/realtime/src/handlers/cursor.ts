import { Server, Socket } from "socket.io";
import type { CursorUpdatePayload } from "@codepulse/types";

/**
 * Cursor handler.
 *
 * Cursor updates are ephemeral — they are relayed immediately
 * to other room members but never persisted to the database.
 * Debouncing happens on the client side.
 */
export function registerCursorHandlers(io: Server, socket: Socket) {
  socket.on(
    "cursor:update",
    (payload: CursorUpdatePayload & { roomId: string }) => {
      const { roomId, ...cursorData } = payload;

      // Relay to all other clients in the room
      socket.to(roomId).emit("cursor:update", {
        ...cursorData,
        userId: socket.user.sub,
      });
    }
  );
}
