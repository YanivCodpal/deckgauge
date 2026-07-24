FROM node:20-slim AS base
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
RUN npm i -g corepack && corepack enable && corepack prepare pnpm@9.0.0 --activate
WORKDIR /app
ENV NODE_TLS_REJECT_UNAUTHORIZED=0

# Install all deps (including devDeps for tsx)
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json tsconfig.base.json ./
COPY apps/api/package.json apps/api/
COPY packages/db/package.json packages/db/
COPY packages/shared/package.json packages/shared/
COPY packages/ui/package.json packages/ui/
RUN pnpm install --no-frozen-lockfile

# Copy source and generate Prisma client
FROM deps AS build
COPY packages/db/ packages/db/
# generate the Prisma client AND build the lib — its package "main" is dist/index.js,
# so without a build the api/worker crash: "Cannot find package @deckgauge/db/dist/index.js".
RUN pnpm --filter @deckgauge/db generate && pnpm --filter @deckgauge/db build

# Production
FROM build AS runner
ENV NODE_TLS_REJECT_UNAUTHORIZED=0
COPY packages/shared/ packages/shared/
COPY packages/ui/ packages/ui/
COPY apps/api/ apps/api/
COPY config/ config/

WORKDIR /app/apps/api
EXPOSE 3001
CMD ["npx", "tsx", "src/index.ts"]
