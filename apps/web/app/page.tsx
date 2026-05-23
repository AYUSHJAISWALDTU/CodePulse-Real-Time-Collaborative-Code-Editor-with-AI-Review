"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Code2,
  Users,
  Sparkles,
  GitBranch,
  Shield,
  Zap,
  ArrowRight,
  Terminal,
  Eye,
  Clock,
} from "lucide-react";

export default function LandingPage() {
  return (
    <div style={{ background: "var(--bg-primary)", minHeight: "100vh" }}>
      {/* ── Hero ──────────────────────────────────────── */}
      <header
        style={{
          position: "relative",
          overflow: "hidden",
          padding: "80px 24px 100px",
          textAlign: "center",
        }}
      >
        {/* Background gradients */}
        <div
          className="auth-bg-gradient auth-bg-gradient-1"
          style={{ top: "-300px", right: "10%" }}
        />
        <div
          className="auth-bg-gradient auth-bg-gradient-2"
          style={{ bottom: "-300px", left: "20%" }}
        />

        <nav
          style={{
            maxWidth: 1200,
            margin: "0 auto 64px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            position: "relative",
            zIndex: 1,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div className="sidebar-logo-icon">CP</div>
            <span className="sidebar-logo-text">CodePulse</span>
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            <Link href="/login" className="btn btn-ghost btn-sm">
              Sign In
            </Link>
            <Link href="/register" className="btn btn-primary btn-sm">
              Get Started
            </Link>
          </div>
        </nav>

        <div
          className="fade-in-up"
          style={{ position: "relative", zIndex: 1, maxWidth: 800, margin: "0 auto" }}
        >
          <div
            className="badge badge-info"
            style={{ marginBottom: 24, fontSize: "0.75rem" }}
          >
            <Sparkles size={12} style={{ marginRight: 6 }} />
            AI-Powered Code Review
          </div>

          <h1
            style={{
              fontSize: "clamp(2.5rem, 6vw, 4rem)",
              fontWeight: 900,
              letterSpacing: "-0.03em",
              lineHeight: 1.1,
              marginBottom: 24,
              background:
                "linear-gradient(135deg, #f0f0f5, #818cf8, #a855f7)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            Code together.
            <br />
            Review with AI.
          </h1>

          <p
            style={{
              fontSize: "1.125rem",
              color: "var(--text-secondary)",
              maxWidth: 560,
              margin: "0 auto 40px",
              lineHeight: 1.7,
            }}
          >
            A real-time collaborative code editor where teams write, review,
            and ship code together — with intelligent AI analysis built in.
          </p>

          <div style={{ display: "flex", gap: 16, justifyContent: "center" }}>
            <Link href="/register" className="btn btn-primary btn-lg">
              Start Coding
              <ArrowRight size={18} />
            </Link>
            <Link href="#features" className="btn btn-ghost btn-lg">
              See Features
            </Link>
          </div>
        </div>

        {/* Fake editor preview */}
        <div
          className="fade-in-up glass-card"
          style={{
            maxWidth: 900,
            margin: "64px auto 0",
            padding: 0,
            overflow: "hidden",
            position: "relative",
            zIndex: 1,
            animationDelay: "0.2s",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "12px 16px",
              background: "var(--bg-secondary)",
              borderBottom: "1px solid var(--border-subtle)",
            }}
          >
            <div
              style={{
                width: 12,
                height: 12,
                borderRadius: "50%",
                background: "#ef4444",
              }}
            />
            <div
              style={{
                width: 12,
                height: 12,
                borderRadius: "50%",
                background: "#f59e0b",
              }}
            />
            <div
              style={{
                width: 12,
                height: 12,
                borderRadius: "50%",
                background: "#22c55e",
              }}
            />
            <span
              style={{
                marginLeft: 12,
                fontFamily: "var(--font-mono)",
                fontSize: "0.75rem",
                color: "var(--text-tertiary)",
              }}
            >
              server.ts — CodePulse
            </span>
            <div style={{ flex: 1 }} />
            <div className="avatar-stack">
              <div className="avatar" style={{ background: "#6366f1" }}>
                AJ
              </div>
              <div className="avatar" style={{ background: "#a855f7" }}>
                SK
              </div>
              <div className="avatar" style={{ background: "#ec4899" }}>
                MR
              </div>
            </div>
          </div>
          <pre
            style={{
              padding: "20px 24px",
              fontFamily: "var(--font-mono)",
              fontSize: "0.8125rem",
              lineHeight: 1.8,
              color: "var(--text-secondary)",
              overflow: "hidden",
              textAlign: "left",
            }}
          >
            <code>
              <span style={{ color: "#c084fc" }}>import</span>
              {" { Server } "}
              <span style={{ color: "#c084fc" }}>from</span>
              {' "socket.io";\n'}
              <span style={{ color: "#c084fc" }}>import</span>
              {" { createAdapter } "}
              <span style={{ color: "#c084fc" }}>from</span>
              {' "@socket.io/redis-adapter";\n\n'}
              <span style={{ color: "#c084fc" }}>const</span>
              {" io = "}
              <span style={{ color: "#c084fc" }}>new</span>
              {" "}
              <span style={{ color: "#60a5fa" }}>Server</span>
              {"(server, {\n"}
              {"  "}
              <span style={{ color: "#4ade80" }}>cors</span>
              {": { origin: env.CORS_ORIGIN },\n"}
              {"  "}
              <span style={{ color: "#4ade80" }}>transports</span>
              {': ["websocket"],\n'}
              {"});\n\n"}
              <span style={{ color: "#5e5e72" }}>
                {"// AI review finding ← "}{" "}
              </span>
              <span
                style={{
                  background: "var(--status-warning-soft)",
                  color: "var(--status-warning)",
                  padding: "2px 8px",
                  borderRadius: 4,
                  fontSize: "0.75rem",
                }}
              >
                ⚠ Consider adding rate limiting
              </span>
            </code>
          </pre>
        </div>
      </header>

      {/* ── Features Grid ─────────────────────────────── */}
      <section
        id="features"
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          padding: "80px 24px",
        }}
      >
        <h2
          style={{
            textAlign: "center",
            fontSize: "2rem",
            fontWeight: 800,
            marginBottom: 12,
          }}
        >
          Built for real engineering teams
        </h2>
        <p
          style={{
            textAlign: "center",
            color: "var(--text-secondary)",
            marginBottom: 48,
            fontSize: "1rem",
          }}
        >
          Everything you need to collaborate on code in real time.
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
            gap: 20,
          }}
        >
          {[
            {
              icon: <Users size={22} />,
              title: "Real-Time Collaboration",
              desc: "See teammates' cursors, selections, and edits as they type. CRDT-powered merge, not last-write-wins.",
              color: "#6366f1",
            },
            {
              icon: <Sparkles size={22} />,
              title: "AI Code Review",
              desc: "GPT-4 reviews your code and surfaces bugs, security issues, and refactoring opportunities inline.",
              color: "#a855f7",
            },
            {
              icon: <Clock size={22} />,
              title: "Version History",
              desc: "Every edit is versioned. Browse snapshots, diff changes, and restore earlier versions instantly.",
              color: "#ec4899",
            },
            {
              icon: <Terminal size={22} />,
              title: "Monaco Editor",
              desc: "VS Code's editor engine with syntax highlighting, IntelliSense, and keyboard shortcuts.",
              color: "#3b82f6",
            },
            {
              icon: <GitBranch size={22} />,
              title: "Workspace Management",
              desc: "Organize files into workspaces, invite teammates, and control access with roles.",
              color: "#22c55e",
            },
            {
              icon: <Shield size={22} />,
              title: "Secure by Design",
              desc: "JWT auth, encrypted transport, rate limiting, and strict input validation throughout.",
              color: "#f59e0b",
            },
          ].map((feature, i) => (
            <div
              key={i}
              className="glass-card fade-in-up"
              style={{
                padding: 28,
                animationDelay: `${i * 0.1}s`,
              }}
            >
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: "var(--radius-md)",
                  background: `${feature.color}15`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: feature.color,
                  marginBottom: 16,
                }}
              >
                {feature.icon}
              </div>
              <h3
                style={{
                  fontSize: "1rem",
                  fontWeight: 700,
                  marginBottom: 8,
                }}
              >
                {feature.title}
              </h3>
              <p
                style={{
                  fontSize: "0.875rem",
                  color: "var(--text-secondary)",
                  lineHeight: 1.6,
                }}
              >
                {feature.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Tech Stack ────────────────────────────────── */}
      <section
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          padding: "40px 24px 100px",
          textAlign: "center",
        }}
      >
        <p
          style={{
            fontSize: "0.75rem",
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            color: "var(--text-muted)",
            marginBottom: 20,
          }}
        >
          Powered by
        </p>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 16,
            justifyContent: "center",
          }}
        >
          {[
            "Next.js",
            "TypeScript",
            "Node.js",
            "Socket.io",
            "Redis",
            "PostgreSQL",
            "OpenAI",
            "Docker",
            "Kubernetes",
          ].map((tech) => (
            <span
              key={tech}
              style={{
                padding: "8px 18px",
                background: "var(--bg-tertiary)",
                borderRadius: "var(--radius-full)",
                fontSize: "0.8125rem",
                fontWeight: 500,
                color: "var(--text-secondary)",
                border: "1px solid var(--border-subtle)",
              }}
            >
              {tech}
            </span>
          ))}
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────── */}
      <footer
        style={{
          borderTop: "1px solid var(--border-subtle)",
          padding: "32px 24px",
          textAlign: "center",
          fontSize: "0.8125rem",
          color: "var(--text-muted)",
        }}
      >
        Built with care by Ayush Jaiswal · CodePulse © 2026
      </footer>
    </div>
  );
}
