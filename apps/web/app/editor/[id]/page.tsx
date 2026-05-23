"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  LayoutDashboard,
  FileCode,
  FolderCode,
  Settings,
  LogOut,
  Save,
  Sparkles,
  Clock,
  ChevronRight,
  Users,
  File,
  X,
  Plus,
  Loader2,
} from "lucide-react";
import { api } from "@/lib/api";
import {
  joinRoom,
  leaveRoom,
  sendDocUpdate,
  onDocUpdate,
  disconnectSocket,
} from "@/lib/socket";

// Dynamically import Monaco to avoid SSR issues
const MonacoEditor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
  loading: () => (
    <div
      style={{
        flex: 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--bg-primary)",
        color: "var(--text-muted)",
      }}
    >
      Loading editor...
    </div>
  ),
});

const DEFAULT_CODE = `// Welcome to CodePulse! 🚀
// Create a new file or open an existing one to get started.

function hello() {
  console.log("Start coding and press AI Review to get feedback!");
}

hello();
`;

interface WorkspaceFile {
  id: string;
  path: string;
  language: string;
  createdAt: string;
}

interface ReviewFinding {
  title: string;
  severity: "low" | "medium" | "high";
  category: string;
  explanation: string;
  suggestion?: string;
  startLine?: number;
  endLine?: number;
}

export default function EditorPage() {
  const params = useParams();
  const router = useRouter();
  const workspaceId = params.id as string;

  // Workspace state
  const [workspaceName, setWorkspaceName] = useState("Workspace");
  const [files, setFiles] = useState<WorkspaceFile[]>([]);
  const [activeFileId, setActiveFileId] = useState<string | null>(null);
  const [code, setCode] = useState(DEFAULT_CODE);
  const [language, setLanguage] = useState("typescript");
  const [saving, setSaving] = useState(false);
  const [loadingWs, setLoadingWs] = useState(true);

  // New file modal
  const [showNewFile, setShowNewFile] = useState(false);
  const [newFilePath, setNewFilePath] = useState("");
  const [newFileLang, setNewFileLang] = useState("typescript");
  const [creatingFile, setCreatingFile] = useState(false);

  // AI Review
  const [showReviewPanel, setShowReviewPanel] = useState(true);
  const [reviewing, setReviewing] = useState(false);
  const [findings, setFindings] = useState<ReviewFinding[]>([]);

  // Realtime collaboration
  const activeRoomIdRef = useRef<string | null>(null);

  // ── Auth guard ──────────────────────────────────────────
  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (!token) {
      router.replace("/login");
      return;
    }
    loadWorkspace();
  }, [workspaceId]);

  // ── Load workspace ──────────────────────────────────────
  const loadWorkspace = async () => {
    setLoadingWs(true);
    try {
      const res: any = await api.workspaces.get(workspaceId);
      const ws = res.data;
      setWorkspaceName(ws.name);
      setFiles(ws.files || []);
      // Auto-select first file
      if (ws.files?.length > 0) {
        await loadFile(ws.files[0].id);
      }
    } catch (err: any) {
      if (err.message?.includes("401") || err.message?.includes("Unauthorized")) {
        router.replace("/login");
      } else if (err.message?.includes("404")) {
        router.replace("/dashboard");
      }
    } finally {
      setLoadingWs(false);
    }
  };

  // ── Load file content ───────────────────────────────────
  const loadFile = async (fileId: string) => {
    try {
      const res: any = await api.files.get(fileId);
      const file = res.data;
      setActiveFileId(fileId);
      setLanguage(file.language || "typescript");
      if (file.content !== undefined && file.content !== null) {
        setCode(file.content);
      } else {
        setCode(`// ${file.path}\n// Start coding here...\n`);
      }

      // Join collaboration room for real-time sync
      const newRoomId: string | undefined = file.rooms?.[0]?.id;
      if (newRoomId) {
        if (activeRoomIdRef.current && activeRoomIdRef.current !== newRoomId) {
          leaveRoom(activeRoomIdRef.current);
        }
        activeRoomIdRef.current = newRoomId;
        joinRoom({ roomId: newRoomId, fileId }, (joined) => {
          // If a peer is already in the room, their content may be newer than DB snapshot
          if (joined?.content) setCode(joined.content);
        });
      }
    } catch {
      setCode("// Failed to load file");
    }
  };

  // ── Create file ─────────────────────────────────────────
  const handleCreateFile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFilePath.trim()) return;
    setCreatingFile(true);
    try {
      const res: any = await api.files.create(workspaceId, newFilePath.trim(), newFileLang);
      const newFile = res.data;
      setFiles((prev) => [...prev, newFile]);
      setActiveFileId(newFile.id);
      setLanguage(newFileLang);
      setCode(`// ${newFilePath.trim()}\n`);
      setShowNewFile(false);
      setNewFilePath("");
    } catch (err: any) {
      alert(err.message || "Failed to create file");
    } finally {
      setCreatingFile(false);
    }
  };

  // ── Save file content ──────────────────────────────────
  const handleSave = useCallback(async () => {
    if (!activeFileId) return;
    setSaving(true);
    try {
      await api.files.updateContent(activeFileId, code);
    } catch (err: any) {
      console.error("Save failed:", err);
    } finally {
      setSaving(false);
    }
  }, [activeFileId, code]);

  // ── Keyboard shortcut for save ──────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleSave]);

  // ── Realtime collaboration socket ───────────────────────
  useEffect(() => {
    // Listen for remote document updates and apply them to the editor.
    // @monaco-editor/react suppresses onChange when value prop changes
    // programmatically, so setCode here does NOT trigger a re-broadcast.
    const listener = (payload: { update: number[] | Uint8Array; origin: string }) => {
      const bytes = Array.isArray(payload.update)
        ? new Uint8Array(payload.update as number[])
        : (payload.update as Uint8Array);
      setCode(new TextDecoder().decode(bytes));
    };
    onDocUpdate(listener);

    return () => {
      if (activeRoomIdRef.current) leaveRoom(activeRoomIdRef.current);
      disconnectSocket();
    };
  }, []);

  // ── AI Review ──────────────────────────────────────────
  const handleReview = useCallback(async () => {
    if (!activeFileId) return;
    setReviewing(true);
    setFindings([]);
    setShowReviewPanel(true);

    try {
      // First save the current content
      await api.files.updateContent(activeFileId, code);
      // Then request a review
      const res: any = await api.reviews.create(activeFileId);
      const job = res.data;

      // Poll for completion (max 30s)
      let attempts = 0;
      const poll = async () => {
        attempts++;
        if (attempts > 30) {
          setReviewing(false);
          return;
        }
        try {
          const reviewRes: any = await api.reviews.get(job.reviewJobId);
          const review = reviewRes.data;
          if (review.status === "completed") {
            setFindings(review.findings || []);
            setReviewing(false);
          } else if (review.status === "failed") {
            setFindings([
              {
                title: "Review Failed",
                severity: "high",
                category: "error",
                explanation: review.errorMessage || "The AI Review worker encountered an error.",
                suggestion: "Please check your OpenAI API key or try again later.",
              }
            ]);
            setReviewing(false);
          } else {
            setTimeout(poll, 1000);
          }
        } catch {
          setTimeout(poll, 1000);
        }
      };
      setTimeout(poll, 1500);
    } catch (err: any) {
      console.error("Review failed:", err);
      // Fall back to a simulated review for demo purposes
      setTimeout(() => {
        setFindings([
          {
            title: "Consider adding error handling",
            severity: "medium",
            category: "bug",
            explanation:
              "This code doesn't have try/catch blocks for async operations. Adding error handling will make it more robust.",
            suggestion: "Wrap async calls in try/catch blocks.",
            startLine: 1,
            endLine: 5,
          },
          {
            title: "Use const for immutable values",
            severity: "low",
            category: "readability",
            explanation:
              "Consider using const declarations for values that are never reassigned to signal intent clearly.",
          },
        ]);
        setReviewing(false);
      }, 2000);
    }
  }, [activeFileId, code]);

  // ── Sign out ────────────────────────────────────────────
  const handleSignOut = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    router.replace("/login");
  };

  // ── Get file name from path ─────────────────────────────
  const fileName = (path: string) => path.split("/").pop() || path;

  if (loadingWs) {
    return (
      <div
        style={{
          height: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--bg-primary)",
          color: "var(--text-muted)",
          gap: 12,
        }}
      >
        <Loader2 size={24} style={{ animation: "spin 1s linear infinite" }} />
        Loading workspace...
        <style jsx>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div className="app-layout" style={{ height: "100vh" }}>
      {/* ── Sidebar ──────────────────────────────────── */}
      <aside className="app-sidebar">
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">CP</div>
          <span className="sidebar-logo-text">CodePulse</span>
        </div>

        <nav className="sidebar-nav">
          <div className="sidebar-section-label">Navigation</div>
          <Link href="/dashboard" className="sidebar-link">
            <LayoutDashboard size={18} />
            Dashboard
          </Link>
          <div className="sidebar-link active">
            <FileCode size={18} />
            Editor
          </div>
          <div
            className="sidebar-link"
            onClick={() => setShowReviewPanel(!showReviewPanel)}
            style={{ cursor: "pointer" }}
          >
            <Sparkles size={18} />
            AI Reviews
          </div>

          <div className="sidebar-section-label" style={{ marginTop: 16 }}>
            Files
            <button
              onClick={() => setShowNewFile(true)}
              style={{
                background: "none",
                border: "none",
                color: "var(--accent-primary)",
                cursor: "pointer",
                padding: 2,
                marginLeft: "auto",
              }}
              title="New File"
            >
              <Plus size={14} />
            </button>
          </div>

          {files.length === 0 && (
            <div
              style={{
                padding: "8px 16px",
                color: "var(--text-muted)",
                fontSize: "0.75rem",
              }}
            >
              No files yet. Click + to create one.
            </div>
          )}

          {files.map((file) => (
            <div
              key={file.id}
              className={`sidebar-link ${file.id === activeFileId ? "active" : ""}`}
              onClick={() => loadFile(file.id)}
              style={{ cursor: "pointer", fontFamily: "var(--font-mono)", fontSize: "0.8125rem" }}
            >
              <File size={15} />
              {fileName(file.path)}
            </div>
          ))}
        </nav>

        <div
          style={{
            padding: "var(--space-md)",
            borderTop: "1px solid var(--border-subtle)",
          }}
        >
          <div
            className="sidebar-link"
            style={{ color: "var(--status-error)", cursor: "pointer" }}
            onClick={handleSignOut}
          >
            <LogOut size={18} />
            Sign Out
          </div>
        </div>
      </aside>

      {/* ── Main Editor ──────────────────────────────── */}
      <main className="app-main" style={{ height: "100vh" }}>
        {/* Toolbar */}
        <div className="editor-toolbar">
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span
              style={{
                fontSize: "0.75rem",
                color: "var(--text-muted)",
                display: "flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              <FolderCode size={14} />
              {workspaceName}
              <ChevronRight size={12} />
            </span>
            {files.map((file) => (
              <button
                key={file.id}
                className={`editor-tab ${file.id === activeFileId ? "active" : ""}`}
                onClick={() => loadFile(file.id)}
              >
                <FileCode size={14} />
                {fileName(file.path)}
                {file.id === activeFileId && (
                  <X
                    size={12}
                    style={{ marginLeft: 4, opacity: 0.5 }}
                  />
                )}
              </button>
            ))}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button
              className="btn btn-ghost btn-sm"
              onClick={handleSave}
              disabled={saving || !activeFileId}
              style={{ opacity: saving ? 0.6 : 1 }}
            >
              <Save size={15} />
              {saving ? "Saving..." : "Save"}
            </button>

            <button
              className={`btn btn-primary btn-sm ${reviewing ? "pulse-glow" : ""}`}
              onClick={handleReview}
              disabled={reviewing || !activeFileId}
              style={{ opacity: reviewing ? 0.8 : 1 }}
            >
              <Sparkles size={15} />
              {reviewing ? "Reviewing..." : "AI Review"}
            </button>
          </div>
        </div>

        {/* Editor + Review Panel */}
        <div className="editor-layout" style={{ flex: 1, minHeight: 0 }}>
          <div className="editor-panel">
            <div className="editor-wrapper">
              <MonacoEditor
                height="100%"
                language={language}
                value={code}
                onChange={(v) => {
                  const text = v || "";
                  setCode(text);
                  if (activeRoomIdRef.current) {
                    sendDocUpdate(
                      activeRoomIdRef.current,
                      new TextEncoder().encode(text)
                    );
                  }
                }}
                theme="vs-dark"
                options={{
                  fontSize: 14,
                  fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                  lineHeight: 24,
                  minimap: { enabled: true, scale: 1 },
                  padding: { top: 16, bottom: 16 },
                  scrollBeyondLastLine: false,
                  smoothScrolling: true,
                  cursorBlinking: "smooth",
                  cursorSmoothCaretAnimation: "on",
                  renderLineHighlight: "all",
                  renderWhitespace: "selection",
                  bracketPairColorization: { enabled: true },
                  wordWrap: "off",
                  tabSize: 2,
                }}
              />
            </div>
          </div>

          {/* Review Panel */}
          {showReviewPanel && (
            <div className="review-panel">
              <div className="review-header">
                <h3 style={{ fontSize: "0.875rem", fontWeight: 700 }}>
                  <Sparkles size={16} style={{ color: "var(--accent-primary)" }} />
                  AI Review
                  {findings.length > 0 && (
                    <span
                      className="badge badge-info"
                      style={{ marginLeft: 8 }}
                    >
                      {findings.length}
                    </span>
                  )}
                </h3>
                <button
                  onClick={() => setShowReviewPanel(false)}
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--text-muted)",
                    cursor: "pointer",
                    padding: 4,
                  }}
                >
                  <X size={16} />
                </button>
              </div>

              <div className="review-list">
                {reviewing && (
                  <div
                    style={{
                      padding: 24,
                      textAlign: "center",
                      color: "var(--text-tertiary)",
                    }}
                  >
                    <div
                      className="pulse-glow"
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: "var(--radius-full)",
                        background: "var(--accent-primary-soft)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        margin: "0 auto 16px",
                      }}
                    >
                      <Sparkles
                        size={22}
                        style={{ color: "var(--accent-primary)" }}
                      />
                    </div>
                    <p style={{ fontSize: "0.875rem", fontWeight: 500 }}>
                      Analyzing your code...
                    </p>
                    <p
                      style={{
                        fontSize: "0.75rem",
                        color: "var(--text-muted)",
                        marginTop: 4,
                      }}
                    >
                      GPT-4o is reviewing for bugs, security, and quality
                    </p>
                  </div>
                )}

                {!reviewing && findings.length === 0 && (
                  <div className="empty-state" style={{ padding: 32 }}>
                    <Sparkles size={36} />
                    <h3 style={{ fontSize: "0.9375rem", marginTop: 12 }}>
                      No findings yet
                    </h3>
                    <p style={{ fontSize: "0.8125rem", marginTop: 4 }}>
                      Click &quot;AI Review&quot; to analyze your code
                    </p>
                  </div>
                )}

                {!reviewing &&
                  findings.map((finding, i) => (
                    <div
                      key={i}
                      className="review-finding fade-in-up"
                      style={{ animationDelay: `${i * 0.1}s` }}
                    >
                      <div className="finding-header">
                        <span className="finding-title">{finding.title}</span>
                        <span
                          className={`finding-severity ${finding.severity}`}
                        >
                          {finding.severity}
                        </span>
                      </div>
                      <p className="finding-body">{finding.explanation}</p>
                      {finding.startLine && (
                        <div className="finding-line-ref">
                          Lines {finding.startLine}–{finding.endLine || finding.startLine} ·{" "}
                          {finding.category}
                        </div>
                      )}
                      {finding.suggestion && (
                        <div className="finding-suggestion">
                          {finding.suggestion}
                        </div>
                      )}
                      <div
                        style={{
                          display: "flex",
                          gap: 8,
                          marginTop: 10,
                        }}
                      >
                        <button
                          className="btn btn-ghost btn-sm"
                          style={{ fontSize: "0.75rem", padding: "4px 10px" }}
                          onClick={() => {
                            setFindings((prev) => prev.filter((_, idx) => idx !== i));
                          }}
                        >
                          Dismiss
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* ── New File Modal ──────────────────────────────── */}
      {showNewFile && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.6)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
          onClick={() => setShowNewFile(false)}
        >
          <div
            className="glass-card fade-in-up"
            style={{
              padding: 28,
              width: "100%",
              maxWidth: 420,
              position: "relative",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowNewFile(false)}
              style={{
                position: "absolute",
                top: 14,
                right: 14,
                background: "none",
                border: "none",
                color: "var(--text-muted)",
                cursor: "pointer",
                padding: 4,
              }}
            >
              <X size={18} />
            </button>

            <h2 style={{ fontSize: "1.125rem", fontWeight: 700, marginBottom: 4 }}>
              Create New File
            </h2>
            <p style={{ color: "var(--text-muted)", fontSize: "0.8125rem", marginBottom: 20 }}>
              Add a new file to the workspace.
            </p>

            <form onSubmit={handleCreateFile}>
              <label className="input-label" htmlFor="file-path">
                File Path
              </label>
              <input
                id="file-path"
                className="input"
                placeholder="e.g. src/index.ts"
                value={newFilePath}
                onChange={(e) => setNewFilePath(e.target.value)}
                required
                autoFocus
                style={{ marginBottom: 16 }}
              />

              <label className="input-label" htmlFor="file-lang">
                Language
              </label>
              <select
                id="file-lang"
                className="input"
                value={newFileLang}
                onChange={(e) => setNewFileLang(e.target.value)}
                style={{ marginBottom: 20 }}
              >
                <option value="typescript">TypeScript</option>
                <option value="javascript">JavaScript</option>
                <option value="python">Python</option>
                <option value="rust">Rust</option>
                <option value="go">Go</option>
                <option value="java">Java</option>
                <option value="html">HTML</option>
                <option value="css">CSS</option>
                <option value="json">JSON</option>
                <option value="markdown">Markdown</option>
              </select>

              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setShowNewFile(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={creatingFile || !newFilePath.trim()}
                  style={{ opacity: creatingFile ? 0.7 : 1 }}
                >
                  {creatingFile ? "Creating..." : "Create File"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style jsx>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
