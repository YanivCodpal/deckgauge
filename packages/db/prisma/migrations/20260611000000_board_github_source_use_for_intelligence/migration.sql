-- Task A1 — Add `use_for_intelligence` to `board_github_sources`.
-- Additive boolean (default true) that lets a board opt out of using a GitHub
-- repo's PRs/commits for Intelligence metrics while keeping issue sync enabled.
--
-- Hand-written migration (rather than `prisma migrate dev`-generated) to stay
-- consistent with the project's documented shadow-DB workaround for the
-- historical migration history (see 20260603120000_drop_legacy_phase3_tables
-- and 20260605000000_add_developer_profile).
--
-- To apply:
--
--     pnpm --filter @deckgauge/db migrate:deploy

-- AlterTable
ALTER TABLE "board_github_sources" ADD COLUMN "use_for_intelligence" BOOLEAN NOT NULL DEFAULT true;
