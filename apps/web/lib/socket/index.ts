import { io, Socket } from "socket.io-client";
import type {
  RoomJoinPayload,
  RoomJoinedPayload,
  CursorUpdatePayload,
  PresenceUpdatePayload,
  DocUpdatePayload,
  ReviewStreamPayload,
} from "@codepulse/types";

const REALTIME_URL =
  process.env.NEXT_PUBLIC_REALTIME_URL || "http://localhost:4001";

let socket: Socket | null = null;

/**
 * Initialize a Socket.io connection with JWT authentication.
 * Returns the existing socket if already connected.
 */
export function getSocket(): Socket {
  if (socket?.connected) return socket;

  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("accessToken")
      : null;

  socket = io(REALTIME_URL, {
    auth: { token },
    transports: ["websocket"],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
  });

  socket.on("connect", () => {
    console.log("🔌 Socket connected:", socket?.id);
  });

  socket.on("connect_error", (err) => {
    console.error("🔌 Socket connection error:", err.message);
  });

  socket.on("disconnect", (reason) => {
    console.warn("🔌 Socket disconnected:", reason);
  });

  return socket;
}

/**
 * Disconnect and clean up the socket.
 */
export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

// ── Room Operations ──────────────────────────────────────

export function joinRoom(
  payload: RoomJoinPayload,
  onJoined: (data: RoomJoinedPayload) => void
): void {
  const s = getSocket();
  s.emit("room:join", payload);
  s.once("room:joined", onJoined);
}

export function leaveRoom(roomId: string): void {
  getSocket().emit("room:leave", { roomId });
}

// ── Document Operations ──────────────────────────────────

export function sendDocUpdate(
  roomId: string,
  update: Uint8Array
): void {
  getSocket().emit("doc:update", {
    roomId,
    update: Array.from(update),
    origin: "local",
  });
}

export function onDocUpdate(
  callback: (payload: DocUpdatePayload) => void
): void {
  getSocket().on("doc:update", callback);
}

// ── Cursor ───────────────────────────────────────────────

export function sendCursorUpdate(
  roomId: string,
  anchor: number,
  head: number,
  color: string
): void {
  getSocket().emit("cursor:update", {
    roomId,
    anchor,
    head,
    color,
    fileId: "",
    userId: "",
  });
}

export function onCursorUpdate(
  callback: (payload: CursorUpdatePayload) => void
): void {
  getSocket().on("cursor:update", callback);
}

// ── Presence ─────────────────────────────────────────────

export function onPresenceUpdate(
  callback: (payload: PresenceUpdatePayload) => void
): void {
  getSocket().on("presence:update", callback);
}

export function onPeerLeft(
  callback: (payload: { userId: string }) => void
): void {
  getSocket().on("peer:left", callback);
}

// ── Review ───────────────────────────────────────────────

export function onReviewStream(
  callback: (payload: ReviewStreamPayload) => void
): void {
  getSocket().on("review:stream", callback);
}

export function onReviewCompleted(
  callback: (payload: ReviewStreamPayload) => void
): void {
  getSocket().on("review:completed", callback);
}
