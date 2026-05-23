"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard,
  FolderCode,
  Settings,
  LogOut,
  Plus,
  FileCode,
  Users,
  Clock,
  Search,
  Bell,
  Sparkles,
  X,
  Loader2,
} from "lucide-react";
import { api } from "@/lib/api";

interface Workspace {
  id: string;
  name: string;
  createdAt: string;
  fileCount?: number;
  memberCount?: number;
  role?: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState("User");
  const [userInitials, setUserInitials] = useState("U");

  // New Workspace modal
  const [showNewModal, setShowNewModal] = useState(false);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  // ── Auth guard ──────────────────────────────────────────
  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (!token) {
      router.replace("/login");
      return;
    }

    // Decode display name from JWT payload
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      const email = payload.email || "";
      const name = email.split("@")[0] || "User";
      setUserName(name.charAt(0).toUpperCase() + name.slice(1));
      setUserInitials(
        name
          .split(/[._-]/)
          .map((w: string) => w[0]?.toUpperCase())
          .join("")
          .slice(0, 2)
      );
    } catch {
      /* ignore */
    }

    fetchWorkspaces();
  }, [router]);

  // ── Fetch workspaces ────────────────────────────────────
  const fetchWorkspaces = useCallback(async () => {
    setLoading(true);
    try {
      const res: any = await api.workspaces.list();
      setWorkspaces(res.data || []);
    } catch (err: any) {
      // If 401, redirect to login
      if (err.message?.includes("401") || err.message?.includes("Unauthorized")) {
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        router.replace("/login");
        return;
      }
      console.error("Failed to load workspaces", err);
    } finally {
      setLoading(false);
    }
  }, [router]);

  // ── Create workspace ────────────────────────────────────
  const handleCreateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    setCreateError("");

    try {
      await api.workspaces.create(newName.trim());
      setShowNewModal(false);
      setNewName("");
      fetchWorkspaces();
    } catch (err: any) {
      setCreateError(err.message || "Failed to create workspace");
    } finally {
      setCreating(false);
    }
  };

  // ── Sign out ────────────────────────────────────────────
  const handleSignOut = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    router.replace("/login");
  };

  // ── Computed stats ──────────────────────────────────────
  const totalFiles = workspaces.reduce((sum, ws) => sum + (ws.fileCount || 0), 0);
  const totalMembers = new Set(workspaces.flatMap(() => [])).size || workspaces.reduce((sum, ws) => sum + (ws.memberCount || 0), 0);

  const filteredWorkspaces = workspaces.filter((ws) =>
    ws.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // ── Time ago helper ─────────────────────────────────────
  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  };

  return (
    <div className="app-layout">
      {/* ── Sidebar ──────────────────────────────────── */}
      <aside className="app-sidebar">
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">CP</div>
          <span className="sidebar-logo-text">CodePulse</span>
        </div>

        <nav className="sidebar-nav">
          <div className="sidebar-section-label">Navigation</div>
          <div className="sidebar-link active">
            <LayoutDashboard size={18} />
            Dashboard
          </div>
          <div className="sidebar-link" style={{ opacity: 0.5, cursor: "default" }}>
            <Sparkles size={18} />
            AI Reviews
          </div>
          <div className="sidebar-link" style={{ opacity: 0.5, cursor: "default" }}>
            <Clock size={18} />
            History
          </div>

          <div className="sidebar-section-label" style={{ marginTop: 16 }}>
            Settings
          </div>
          <div className="sidebar-link" style={{ opacity: 0.5, cursor: "default" }}>
            <Settings size={18} />
            Preferences
          </div>
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

      {/* ── Main Content ─────────────────────────────── */}
      <main className="app-main">
        <header className="app-header">
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ position: "relative" }}>
              <Search
                size={16}
                style={{
                  position: "absolute",
                  left: 12,
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "var(--text-muted)",
                }}
              />
              <input
                className="input"
                placeholder="Search workspaces..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: 280,
                  paddingLeft: 36,
                  background: "var(--bg-secondary)",
                }}
              />
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button
              className="btn btn-ghost btn-sm"
              style={{ position: "relative" }}
            >
              <Bell size={18} />
            </button>
            <div
              className="avatar"
              style={{ background: "#6366f1", cursor: "pointer" }}
            >
              {userInitials}
            </div>
          </div>
        </header>

        <div className="app-content">
          <div
            className="fade-in-up"
            style={{ marginBottom: "var(--space-xl)" }}
          >
            <h1 style={{ fontSize: "1.75rem", fontWeight: 800, marginBottom: 4 }}>
              Welcome back, {userName}
            </h1>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.9375rem" }}>
              Your workspaces and recent activity
            </p>
          </div>

          {/* Stats row */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
              gap: 16,
              marginBottom: 32,
            }}
          >
            {[
              { label: "Workspaces", value: String(workspaces.length), icon: <FolderCode size={18} />, color: "#6366f1" },
              { label: "Total Files", value: String(totalFiles), icon: <FileCode size={18} />, color: "#a855f7" },
              { label: "AI Reviews", value: "0", icon: <Sparkles size={18} />, color: "#ec4899" },
              { label: "Collaborators", value: String(totalMembers), icon: <Users size={18} />, color: "#22c55e" },
            ].map((stat, i) => (
              <div
                key={i}
                className="glass-card fade-in-up"
                style={{ padding: 20, animationDelay: `${i * 0.05}s` }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 8,
                  }}
                >
                  <span
                    style={{
                      fontSize: "0.75rem",
                      fontWeight: 600,
                      color: "var(--text-tertiary)",
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                    }}
                  >
                    {stat.label}
                  </span>
                  <div style={{ color: stat.color, opacity: 0.7 }}>
                    {stat.icon}
                  </div>
                </div>
                <div
                  style={{
                    fontSize: "1.75rem",
                    fontWeight: 800,
                    color: "var(--text-primary)",
                  }}
                >
                  {loading ? "–" : stat.value}
                </div>
              </div>
            ))}
          </div>

          {/* Workspaces header */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 16,
            }}
          >
            <h2 style={{ fontSize: "1.125rem", fontWeight: 700 }}>
              Your Workspaces
            </h2>
            <button
              className="btn btn-primary btn-sm"
              onClick={() => setShowNewModal(true)}
            >
              <Plus size={16} />
              New Workspace
            </button>
          </div>

          {/* Loading state */}
          {loading && (
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                padding: 64,
                color: "var(--text-muted)",
              }}
            >
              <Loader2 size={24} className="spin" style={{ animation: "spin 1s linear infinite" }} />
              <span style={{ marginLeft: 12, fontSize: "0.875rem" }}>Loading workspaces...</span>
            </div>
          )}

          {/* Empty state */}
          {!loading && workspaces.length === 0 && (
            <div
              className="glass-card fade-in-up"
              style={{
                padding: 48,
                textAlign: "center",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 12,
              }}
            >
              <FolderCode size={40} style={{ color: "var(--text-muted)", opacity: 0.5 }} />
              <h3 style={{ fontSize: "1rem", fontWeight: 600 }}>
                No workspaces yet
              </h3>
              <p style={{ color: "var(--text-muted)", fontSize: "0.875rem", maxWidth: 320 }}>
                Create your first workspace to start collaborating on code with AI-powered reviews.
              </p>
              <button
                className="btn btn-primary"
                onClick={() => setShowNewModal(true)}
                style={{ marginTop: 8 }}
              >
                <Plus size={16} />
                Create Your First Workspace
              </button>
            </div>
          )}

          {/* Workspace grid */}
          {!loading && filteredWorkspaces.length > 0 && (
            <div className="dashboard-grid">
              {filteredWorkspaces.map((ws, i) => (
                <Link
                  key={ws.id}
                  href={`/editor/${ws.id}`}
                  className="workspace-card fade-in-up"
                  style={{ animationDelay: `${i * 0.08}s`, textDecoration: "none", color: "inherit" }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                    <div
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: "var(--radius-md)",
                        background: "var(--accent-primary-soft)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "var(--accent-primary)",
                      }}
                    >
                      <FolderCode size={20} />
                    </div>
                    <div>
                      <div className="workspace-card-title" style={{ marginBottom: 0 }}>
                        {ws.name}
                      </div>
                    </div>
                  </div>
                  <div className="workspace-card-meta">
                    <span>
                      <FileCode size={14} />
                      {ws.fileCount ?? 0} files
                    </span>
                    <span>
                      <Users size={14} />
                      {ws.memberCount ?? 0} members
                    </span>
                    <span>
                      <Clock size={14} />
                      {timeAgo(ws.createdAt)}
                    </span>
                  </div>
                </Link>
              ))}

              {/* New workspace card */}
              <div
                className="workspace-card workspace-card-new fade-in-up"
                onClick={() => setShowNewModal(true)}
                style={{ cursor: "pointer" }}
              >
                <Plus size={24} />
                <span style={{ fontWeight: 500, fontSize: "0.875rem" }}>
                  Create Workspace
                </span>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* ── New Workspace Modal ────────────────────────── */}
      {showNewModal && (
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
          onClick={() => setShowNewModal(false)}
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
              onClick={() => setShowNewModal(false)}
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
              Create New Workspace
            </h2>
            <p style={{ color: "var(--text-muted)", fontSize: "0.8125rem", marginBottom: 20 }}>
              A workspace is a project folder for your code and collaborators.
            </p>

            <form onSubmit={handleCreateWorkspace}>
              {createError && (
                <div
                  style={{
                    padding: "10px 14px",
                    background: "var(--status-error-soft)",
                    color: "var(--status-error)",
                    borderRadius: "var(--radius-md)",
                    fontSize: "0.8125rem",
                    marginBottom: 16,
                  }}
                >
                  {createError}
                </div>
              )}

              <label className="input-label" htmlFor="workspace-name">
                Workspace Name
              </label>
              <input
                id="workspace-name"
                className="input"
                placeholder="e.g. My Awesome Project"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                required
                autoFocus
                style={{ marginBottom: 20 }}
              />

              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setShowNewModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={creating || !newName.trim()}
                  style={{ opacity: creating ? 0.7 : 1 }}
                >
                  {creating ? "Creating..." : "Create Workspace"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Spinner animation */}
      <style jsx>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
