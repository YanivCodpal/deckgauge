-- Add allowed_types column to board_github_sources for per-source GitHub issue-type filtering.

ALTER TABLE "board_github_sources"
  ADD COLUMN "allowed_types" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
