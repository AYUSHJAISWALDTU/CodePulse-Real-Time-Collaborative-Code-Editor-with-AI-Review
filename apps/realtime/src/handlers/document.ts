import { Server, Socket } from "socket.io";
import type { DocUpdatePayload } from "@codepulse/types";

/**
 * Document update handler.
 *
 * This relays CRDT updates between collaborators.
 * The actual CRDT merge logic happens on the client side (Yjs).
 * The server acts as a relay and persistence layer.
 */
export function registerDocHandlers(io: Server, socket: Socket) {
  socket.on("doc:update", (payload: DocUpdatePayload & { roomId: string }) => {
    const { roomId, update, origin } = payload;

    // Relay to all other clients in the room
    socket.to(roomId).emit("doc:update", {
      update,
      origin: socket.user.sub,
    });
  });

  // Sync request: a new/reconnecting client asks for current state
  socket.on(
    "doc:sync-request",
    (payload: { roomId: string; lastVersion: number }) => {
      const { roomId, lastVersion } = payload;

      // Ask a peer in the room to provide the current document state
      socket.to(roomId).emit("doc:sync-request", {
        requesterId: socket.id,
        lastVersion,
      });
    }
  );

  // Sync response: a peer sends the current document state
  socket.on(
    "doc:sync-response",
    (payload: { requesterId: string; state: number[] }) => {
      const { requesterId, state } = payload;

      // Send the state directly to the requesting client
      io.to(requesterId).emit("doc:sync-response", { state });
    }
  );
}
