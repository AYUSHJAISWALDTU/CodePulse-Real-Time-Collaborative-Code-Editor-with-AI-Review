import { Server, Socket } from "socket.io";
import type { ReviewStreamPayload } from "@codepulse/types";

/**
 * Review event handler.
 *
 * The worker pushes review status and findings into Redis,
 * which gets relayed to room members via the Redis adapter.
 * This handler also lets clients request reviews via socket.
 */
export function registerReviewHandlers(io: Server, socket: Socket) {
  // Client can request a review status update
  socket.on(
    "review:subscribe",
    (payload: { roomId: string; reviewJobId: string }) => {
      // Join a review-specific room for targeted updates
      socket.join(`review:${payload.reviewJobId}`);
    }
  );
}

/**
 * Utility function called by the worker service to push review
 * updates to all subscribed clients via Socket.io.
 *
 * In production, the worker publishes to Redis and the adapter
 * handles cross-pod delivery automatically.
 */
export function emitReviewUpdate(
  io: Server,
  roomId: string,
  payload: ReviewStreamPayload
) {
  io.to(roomId).emit("review:stream", payload);

  if (payload.status === "completed" || payload.status === "failed") {
    io.to(roomId).emit(
      payload.status === "completed" ? "review:completed" : "review:failed",
      payload
    );
  }
}
