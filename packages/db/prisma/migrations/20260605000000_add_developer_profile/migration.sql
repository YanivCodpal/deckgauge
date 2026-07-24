-- P8.2 — Add DeveloperProfile model.
-- This table represents a canonical "developer identity" sourced from a provider
-- (github, gitlab, ado, jira, ...). It is optionally linked to an internal User
-- so we can attribute commits/PRs/issues to a real person across providers.
--
-- Hand-written migration (rather than `prisma migrate dev`-generated) to stay
-- consistent with the project's documented shadow-DB workaround for the
-- historical migration history (see 20260603120000_drop_legacy_phase3_tables).
--
-- To apply:
--
--     pnpm --filter @deckgauge/db migrate:deploy

-- AddTable
CREATE TABLE "developer_profiles" (
    "id" TEXT NOT NULL,
    "provider" VARCHAR(32) NOT NULL,
    "login" VARCHAR(256) NOT NULL,
    "display_name" VARCHAR(256),
    "avatar_url" TEXT,
    "email" VARCHAR(320),
    "user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "developer_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "developer_profiles_provider_login_key" ON "developer_profiles"("provider", "login");

-- CreateIndex
CREATE INDEX "developer_profiles_user_id_idx" ON "developer_profiles"("user_id");

-- CreateIndex
CREATE INDEX "developer_profiles_email_idx" ON "developer_profiles"("email");

-- AddForeignKey
ALTER TABLE "developer_profiles" ADD CONSTRAINT "developer_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
