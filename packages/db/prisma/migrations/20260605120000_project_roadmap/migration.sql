-- Hand-written migration to avoid `prisma migrate dev`'s shadow-DB diff against
-- a drifted staging database (some enum values + tables exist in staging from
-- in-flight feature branches whose Prisma model defs haven't merged to main yet).
-- This file is the additive subset only; it does NOT include any DROPs.

-- AlterEnum
ALTER TYPE "board_view_type" ADD VALUE 'roadmap';

-- CreateEnum
CREATE TYPE "roadmap_bucket_source" AS ENUM ('auto', 'manual');

-- CreateEnum
CREATE TYPE "bucket_granularity" AS ENUM ('quarter', 'month', 'mixed');

-- AlterTable
ALTER TABLE "projects"
  ADD COLUMN "roadmap_bucket"        TEXT,
  ADD COLUMN "roadmap_bucket_source" "roadmap_bucket_source" NOT NULL DEFAULT 'auto',
  ADD COLUMN "roadmap_order"         DOUBLE PRECISION,
  ADD COLUMN "roadmap_projection"    JSONB;

-- CreateIndex
CREATE INDEX "projects_board_id_roadmap_bucket_roadmap_order_idx"
  ON "projects" ("board_id", "roadmap_bucket", "roadmap_order");

-- CreateTable
CREATE TABLE "roadmap_view_configs" (
  "id"                     TEXT NOT NULL,
  "board_view_id"          TEXT NOT NULL,
  "bucket_granularity"     "bucket_granularity" NOT NULL DEFAULT 'mixed',
  "window_quarters_ahead"  INTEGER NOT NULL DEFAULT 3,
  "window_quarters_behind" INTEGER NOT NULL DEFAULT 0,
  "lane_group_ids"         TEXT[] DEFAULT ARRAY[]::TEXT[],
  "show_unplanned_tray"    BOOLEAN NOT NULL DEFAULT true,
  "created_at"             TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"             TIMESTAMP(3) NOT NULL,
  CONSTRAINT "roadmap_view_configs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "roadmap_view_configs_board_view_id_key"
  ON "roadmap_view_configs" ("board_view_id");

-- AddForeignKey
ALTER TABLE "roadmap_view_configs"
  ADD CONSTRAINT "roadmap_view_configs_board_view_id_fkey"
  FOREIGN KEY ("board_view_id") REFERENCES "board_views"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
