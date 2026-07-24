-- Board templates: mark which template a board was seeded from / behaves as.
-- "development" = the historical default board (dashboard + roadmap); all existing
-- rows backfill to this so behaviour is preserved. "blank" = empty board.
-- "recruitment" = candidate pipeline board (seeded groups/columns + opt-in capabilities).
ALTER TABLE "boards" ADD COLUMN "kind" TEXT NOT NULL DEFAULT 'development';
