-- Task 4 — Add `roadmap_pinned_start` to `projects` + new `roadmap_configs` table.
-- Additive-only migration: no DROP or ALTER of existing columns.
--
-- Hand-written migration (rather than `prisma migrate dev`-generated) to stay
-- consistent with the project's documented shadow-DB workaround for the
-- historical migration history (see 20260603120000_drop_legacy_phase3_tables).
--
-- To apply:
--
--     pnpm --filter @deckgauge/db migrate:deploy

-- AlterTable
ALTER TABLE "projects" ADD COLUMN "roadmap_pinned_start" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "roadmap_configs" (
    "id" TEXT NOT NULL,
    "board_view_id" TEXT NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "visible_quarters" INTEGER NOT NULL DEFAULT 4,
    "size_durations" JSONB NOT NULL,
    "default_size_weeks" DOUBLE PRECISION NOT NULL DEFAULT 2,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "roadmap_configs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "roadmap_configs_board_view_id_key" ON "roadmap_configs"("board_view_id");

-- AddForeignKey
ALTER TABLE "roadmap_configs" ADD CONSTRAINT "roadmap_configs_board_view_id_fkey" FOREIGN KEY ("board_view_id") REFERENCES "board_views"("id") ON DELETE CASCADE ON UPDATE CASCADE;
