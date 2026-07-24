-- Standalone comparisons: promote the multi-board comparison from a board-scoped
-- BoardView (type=COMPARISON) to a first-class entity reached through the
-- Comparisons category. The old board_comparison_members table and the
-- board_view_type 'comparison' enum value are intentionally LEFT IN PLACE
-- (dormant) — the shared staging DB is used by parallel sessions and dropping a
-- Postgres enum value / live table there is disruptive. The app simply stops
-- reading or writing them.

-- Comparison: owned by its creator (like Roadmap), lean like OrgTree.
CREATE TABLE "comparisons" (
  "id" TEXT NOT NULL,
  "name" VARCHAR(100) NOT NULL,
  "created_by" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "comparisons_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "comparisons_created_by_idx" ON "comparisons"("created_by");

-- ComparisonMember: the ordered board set for a comparison.
CREATE TABLE "comparison_members" (
  "id" TEXT NOT NULL,
  "comparison_id" TEXT NOT NULL,
  "board_id" TEXT NOT NULL,
  "position" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "comparison_members_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "comparison_members_comparison_id_board_id_key"
  ON "comparison_members"("comparison_id", "board_id");
CREATE INDEX "comparison_members_comparison_id_position_idx"
  ON "comparison_members"("comparison_id", "position");
ALTER TABLE "comparison_members" ADD CONSTRAINT "comparison_members_comparison_id_fkey"
  FOREIGN KEY ("comparison_id") REFERENCES "comparisons"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "comparison_members" ADD CONSTRAINT "comparison_members_board_id_fkey"
  FOREIGN KEY ("board_id") REFERENCES "boards"("id") ON DELETE CASCADE ON UPDATE CASCADE;
