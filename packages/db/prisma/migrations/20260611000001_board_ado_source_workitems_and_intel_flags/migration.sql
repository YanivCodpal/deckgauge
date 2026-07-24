-- Task A2 — Add `sync_work_items_to_board` and `use_for_intelligence` to
-- `board_ado_sources`. Both default true; hand-written per the repo's
-- documented shadow-DB workaround (see 20260605000000_add_developer_profile).

-- AlterTable
ALTER TABLE "board_ado_sources" ADD COLUMN "sync_work_items_to_board" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "board_ado_sources" ADD COLUMN "use_for_intelligence" BOOLEAN NOT NULL DEFAULT true;
