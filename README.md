# CodePulse

**Real-time collaborative code editor with AI-powered code review.**

CodePulse is a collaborative coding platform where multiple developers edit code simultaneously, receive AI-generated code reviews with inline suggestions, and maintain persistent version history — built with a production-grade architecture designed for horizontal scaling.

## Architecture

```
┌─────────┐     ┌────────────────┐     ┌──────────────────┐
│  Client  │────▶│  Nginx Ingress │────▶│  Next.js Web App │
│ (Browser)│     │                │     └──────────────────┘
└─────────┘     │  /api/* ───────│────▶ Node.js API Service
                │  /socket.io/* ─│────▶ Socket.io Realtime
                └────────────────┘
                         │
              ┌──────────┼──────────┐
              ▼          ▼          ▼
         ┌────────┐ ┌────────┐ ┌────────────┐
         │  Redis │ │Postgres│ │ AI Review  │
         │Pub/Sub │ │   DB   │ │   Worker   │
         └────────┘ └────────┘ └──────┬─────┘
                                      │
                                ┌─────▼─────┐
                                │ OpenAI API │
                                └───────────┘
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js, TypeScript, Monaco Editor, Socket.io Client |
| API | Node.js, Express, Prisma ORM, Zod |
| Realtime | Socket.io, Redis Adapter for multi-pod fanout |
| Database | PostgreSQL (durable state), Redis (ephemeral state) |
| AI | OpenAI GPT-4o, structured JSON output |
| Infrastructure | Docker, Kubernetes, Nginx Ingress, cert-manager |
| CI/CD | GitHub Actions |

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm 9+
- Docker & Docker Compose
- PostgreSQL 16 (or use Docker)
- Redis 7 (or use Docker)

### Setup

```bash
# Clone the repo
git clone https://github.com/YOUR_USERNAME/codepulse.git
cd codepulse

# Install dependencies
pnpm install

# Start Postgres and Redis
docker compose up -d

# Copy env file and fill in values
cp .env.example .env

# Generate Prisma client and run migrations
pnpm db:generate
pnpm db:migrate

# Start all services in development
pnpm dev
```

This starts:
- **Web** on `http://localhost:3000`
- **API** on `http://localhost:4000`
- **Realtime** on `http://localhost:4001`
- **Worker** polling for review jobs

## Project Structure

```
codepulse/
├── apps/
│   ├── web/          # Next.js frontend with Monaco editor
│   ├── api/          # Express REST API
│   ├── realtime/     # Socket.io server for live collaboration
│   └── worker/       # AI review worker (OpenAI pipeline)
├── packages/
│   ├── types/        # Shared TypeScript types
│   ├── db/           # Prisma schema and client
│   ├── auth/         # JWT and password utilities
│   ├── config/       # Zod-validated environment config
│   └── tsconfig/     # Shared TypeScript configs
├── infra/
│   ├── docker/       # Multi-stage Dockerfiles
│   └── k8s/          # Kubernetes manifests
├── docs/             # System design documentation
└── .github/workflows/ # CI/CD pipelines
```

## Key Features

- **Real-Time Collaboration** — WebSocket document sync via Socket.io with Redis Pub/Sub for multi-pod broadcast (CRDT merge layer planned)
- **AI Code Review** — Async GPT-4 review pipeline with structured findings, severity classification, and inline suggestions
- **Version History** — Append-only operation log + periodic snapshots with restore support
- **Workspace Management** — Role-based access (owner/editor/viewer) with team invitations
- **Production-Ready Infrastructure** — Docker, Kubernetes, HPA, Nginx Ingress, TLS, CI/CD

## Design Decisions

| Decision | Why |
|----------|-----|
| WebSocket relay over OT | Simple, correct for current scale; CRDT (Yjs) merge layer is the planned next step |
| Separate realtime service | Different scaling characteristics than CRUD API — connection-heavy vs request-heavy |
| Redis for ephemeral state | Cursors, presence, and room state don't need PostgreSQL's durability guarantees |
| Async AI review worker | Decouples expensive OpenAI calls from user-facing request path; supports backpressure |
| Managed databases | Avoids operational complexity of self-hosted Postgres/Redis inside K8s |

## Documentation

See [docs/codepulse-system-design.md](docs/codepulse-system-design.md) for the complete system design covering:

1. Full system architecture
2. Development roadmap (5 phases)
3. Resume-ready project descriptions
4. Real-time collaboration design (OT vs CRDT)
5. AI code review engine
6. Backend engineering patterns
7. PostgreSQL database schema
8. DevOps and deployment
9. Security design
10. Interview preparation (25 Q&A)
11. Realistic production metrics
12. Production folder structure

## License

MIT
# CodePulse-Real-Time-Collaborative-Code-Editor-with-AI-Review
