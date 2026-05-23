const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

/**
 * Typed API client for CodePulse backend.
 * Handles auth headers and JSON parsing automatically.
 */
async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("accessToken")
      : null;

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: "Request failed" }));
    throw new Error(err.message || `HTTP ${res.status}`);
  }

  return res.json();
}

// ── Auth ─────────────────────────────────────────────────

export const api = {
  auth: {
    login: (email: string, password: string) =>
      request("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      }),

    register: (email: string, password: string, displayName: string) =>
      request("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({ email, password, displayName }),
      }),

    refresh: (refreshToken: string) =>
      request("/api/auth/refresh", {
        method: "POST",
        body: JSON.stringify({ refreshToken }),
      }),
  },

  // ── Workspaces ───────────────────────────────────────

  workspaces: {
    list: () => request("/api/workspaces"),

    get: (id: string) => request(`/api/workspaces/${id}`),

    create: (name: string) =>
      request("/api/workspaces", {
        method: "POST",
        body: JSON.stringify({ name }),
      }),

    invite: (workspaceId: string, email: string, role: string) =>
      request(`/api/workspaces/${workspaceId}/invite`, {
        method: "POST",
        body: JSON.stringify({ email, role }),
      }),
  },

  // ── Files ────────────────────────────────────────────

  files: {
    get: (fileId: string) => request(`/api/files/${fileId}`),

    create: (workspaceId: string, path: string, language: string, content?: string) =>
      request("/api/files", {
        method: "POST",
        body: JSON.stringify({ workspaceId, path, language, content }),
      }),

    updateContent: (fileId: string, content: string) =>
      request(`/api/files/${fileId}/content`, {
        method: "PUT",
        body: JSON.stringify({ content }),
      }),

    history: (fileId: string, page = 1) =>
      request(`/api/files/${fileId}/history?page=${page}`),
  },

  // ── Reviews ──────────────────────────────────────────

  reviews: {
    create: (fileId: string) =>
      request("/api/reviews", {
        method: "POST",
        body: JSON.stringify({ fileId }),
      }),

    get: (reviewId: string) => request(`/api/reviews/${reviewId}`),

    listForFile: (fileId: string, page = 1) =>
      request(`/api/reviews/file/${fileId}?page=${page}`),
  },

  // ── Health ───────────────────────────────────────────

  health: {
    check: () => request("/api/health"),
    ready: () => request("/api/health/ready"),
  },
};
