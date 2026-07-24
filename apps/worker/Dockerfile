FROM node:20-slim AS base
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
RUN npm i -g corepack && corepack enable && corepack prepare pnpm@9.0.0 --activate
WORKDIR /app
ENV NODE_TLS_REJECT_UNAUTHORIZED=0

# Install all deps (including devDeps for tsx)
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json tsconfig.base.json ./
COPY apps/worker/package.json apps/worker/
COPY packages/db/package.json packages/db/
COPY packages/shared/package.json packages/shared/
COPY packages/ui/package.json packages/ui/
RUN pnpm install --frozen-lockfile

# Copy source and generate Prisma client
FROM deps AS build
COPY packages/db/ packages/db/
RUN pnpm --filter @deckgauge/db generate

# Production
FROM build AS runner
ENV NODE_TLS_REJECT_UNAUTHORIZED=0
COPY packages/shared/ packages/shared/
COPY packages/ui/ packages/ui/
COPY apps/worker/ apps/worker/
COPY config/ config/

WORKDIR /app/apps/worker
CMD ["npx", "tsx", "src/index.ts"]
