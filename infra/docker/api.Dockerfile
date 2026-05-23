# ── Stage 1: Build ────────────────────────────────────
FROM node:20-alpine AS builder
RUN corepack enable pnpm

WORKDIR /app
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* ./
COPY packages/ packages/
COPY apps/api/ apps/api/

RUN pnpm install --frozen-lockfile
RUN pnpm --filter @codepulse/db generate
RUN pnpm --filter @codepulse/api build

# ── Stage 2: Production ──────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
RUN addgroup --system --gid 1001 codepulse && \
    adduser --system --uid 1001 codepulse

COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/apps/api/package.json ./
COPY --from=builder /app/node_modules ./node_modules

USER codepulse
EXPOSE 4000

CMD ["node", "dist/server.js"]
