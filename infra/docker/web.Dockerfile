# ── Stage 1: Build ────────────────────────────────────
FROM node:20-alpine AS builder
RUN corepack enable pnpm

WORKDIR /app
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* ./
COPY packages/ packages/
COPY apps/web/ apps/web/

RUN pnpm install --frozen-lockfile
RUN pnpm --filter @codepulse/web build

# ── Stage 2: Production ──────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
RUN addgroup --system --gid 1001 codepulse && \
    adduser --system --uid 1001 codepulse

COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder /app/apps/web/public ./apps/web/public

USER codepulse
EXPOSE 3000
ENV PORT=3000

CMD ["node", "apps/web/server.js"]
