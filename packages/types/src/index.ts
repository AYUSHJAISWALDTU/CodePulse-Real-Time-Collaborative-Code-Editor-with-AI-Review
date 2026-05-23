// ── User ─────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  createdAt: Date;
}

export interface CreateUserInput {
  email: string;
  password: string;
  displayName: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface JwtPayload {
  sub: string;
  email: string;
  sessionId: string;
  iat: number;
  exp: number;
}

// ── Workspace ────────────────────────────────────────────

export type WorkspaceRole = "owner" | "editor" | "viewer";

export interface Workspace {
  id: string;
  name: string;
  ownerUserId: string;
  createdAt: Date;
}

export interface WorkspaceMember {
  workspaceId: string;
  userId: string;
  role: WorkspaceRole;
  joinedAt: Date;
}

export interface CreateWorkspaceInput {
  name: string;
}

// ── File ─────────────────────────────────────────────────

export interface CodeFile {
  id: string;
  workspaceId: string;
  path: string;
  language: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateFileInput {
  workspaceId: string;
  path: string;
  language: string;
  content?: string;
}

export interface UpdateFileContentInput {
  content: string;
}

// ── Collaboration Room ───────────────────────────────────

export type RoomStatus = "active" | "idle" | "archived";

export interface CollaborationRoom {
  id: string;
  fileId: string;
  branchName: string;
  status: RoomStatus;
  latestSnapshotId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// ── Document Snapshot ────────────────────────────────────

export type SnapshotReason =
  | "autosave"
  | "manual_save"
  | "review"
  | "restore"
  | "compaction";

export interface DocumentSnapshot {
  id: string;
  roomId: string;
  fileId: string;
  versionNo: number;
  textContent: string;
  createdBy: string | null;
  reason: SnapshotReason;
  createdAt: Date;
}

// ── AI Review ────────────────────────────────────────────

export type ReviewStatus = "queued" | "running" | "completed" | "failed";
export type FindingSeverity = "low" | "medium" | "high";
export type FindingCategory =
  | "bug"
  | "performance"
  | "security"
  | "readability"
  | "refactor";

export interface AiReviewJob {
  id: string;
  fileId: string;
  snapshotId: string;
  triggeredBy: string;
  status: ReviewStatus;
  modelName: string;
  inputTokens: number | null;
  outputTokens: number | null;
  latencyMs: number | null;
  summary: string | null;
  errorMessage: string | null;
  createdAt: Date;
  completedAt: Date | null;
}

export interface AiReviewFinding {
  id: string;
  reviewJobId: string;
  severity: FindingSeverity;
  category: FindingCategory;
  title: string;
  explanation: string;
  suggestion: string | null;
  startLine: number | null;
  endLine: number | null;
  confidence: number | null;
  acceptedBy: string | null;
  acceptedAt: Date | null;
}

export interface CreateReviewInput {
  fileId: string;
}

// ── Socket Events ────────────────────────────────────────

export interface RoomJoinPayload {
  roomId: string;
  fileId: string;
}

export interface RoomJoinedPayload {
  snapshotVersion: number;
  content: string;
  peers: PeerInfo[];
}

export interface PeerInfo {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  color: string;
}

export interface CursorUpdatePayload {
  userId: string;
  fileId: string;
  anchor: number;
  head: number;
  color: string;
}

export interface PresenceUpdatePayload {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  color: string;
  activeFileId: string | null;
  isTyping: boolean;
  lastSeen: string;
}

export interface DocUpdatePayload {
  update: Uint8Array | number[];
  origin: string;
}

export interface ReviewStreamPayload {
  reviewJobId: string;
  status: ReviewStatus;
  partialSummary?: string;
  findings?: AiReviewFinding[];
}

// ── API Response Wrappers ────────────────────────────────

export interface ApiResponse<T> {
  data: T;
  meta?: Record<string, unknown>;
}

export interface ApiError {
  error: string;
  message: string;
  statusCode: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}
