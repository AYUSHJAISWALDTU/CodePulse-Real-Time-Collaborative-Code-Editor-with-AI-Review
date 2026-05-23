import http from "http";
import { Server } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import { Redis } from "ioredis";
import { getEnv } from "@codepulse/config";
import { verifyAccessToken } from "@codepulse/auth";
import { registerRoomHandlers } from "./handlers/room";
import { registerDocHandlers } from "./handlers/document";
import { registerCursorHandlers } from "./handlers/cursor";
import { registerPresenceHandlers } from "./handlers/presence";
import { registerReviewHandlers } from "./handlers/review";
import type { JwtPayload } from "@codepulse/types";

/**
 * Extend Socket type to include authenticated user data
 */
declare module "socket.io" {
  interface Socket {
    user: JwtPayload;
  }
}

const env = getEnv();

const server = http.createServer();
const io = new Server(server, {
  cors: {
    origin: env.CORS_ORIGIN,
    credentials: true,
  },
  transports: ["websocket"],
  pingTimeout: 30000,
  pingInterval: 15000,
});

// ── Redis Adapter for Multi-Pod Broadcast ────────────────

const pubClient = new Redis(env.REDIS_URL);
const subClient = pubClient.duplicate();

io.adapter(createAdapter(pubClient, subClient));

console.log("📡 Redis adapter connected for cross-pod fanout");

// ── Socket Authentication Middleware ─────────────────────

io.use((socket, next) => {
  const token = socket.handshake.auth.token as string;

  if (!token) {
    return next(new Error("Authentication required"));
  }

  const payload = verifyAccessToken(token, env.JWT_SECRET);

  if (!payload) {
    return next(new Error("Invalid or expired token"));
  }

  socket.user = payload;
  next();
});

// ── Connection Handler ───────────────────────────────────

io.on("connection", (socket) => {
  console.log(
    `🔌 Connected: ${socket.user.email} (${socket.id})`
  );

  // Register all event handlers
  registerRoomHandlers(io, socket);
  registerDocHandlers(io, socket);
  registerCursorHandlers(io, socket);
  registerPresenceHandlers(io, socket);
  registerReviewHandlers(io, socket);

  socket.on("disconnect", (reason) => {
    console.log(
      `🔌 Disconnected: ${socket.user.email} (${reason})`
    );
  });
});

// ── Start ────────────────────────────────────────────────

server.listen(env.REALTIME_PORT, () => {
  console.log(`⚡ Realtime server running on port ${env.REALTIME_PORT}`);
});
