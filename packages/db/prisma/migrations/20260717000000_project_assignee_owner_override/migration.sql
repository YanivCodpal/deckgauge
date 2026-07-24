-- Split the single `owner` person column into a synced Assignee + an editable Owner.
--
-- `owner` stays the effective, user-facing value every consumer already reads
-- (roadmap lanes, widgets, filters, sort, search). We add:
--   * assignee          — the value coming from the source sync (Jira/ADO/GitHub).
--                         Today's `owner` IS the synced assignee, so we backfill it.
--   * owner_overridden  — once the user edits Owner by hand this flips true and the
--                         sync stops touching `owner`. "Reset to Assignee" flips it
--                         back to false and copies assignee -> owner.
ALTER TABLE "projects" ADD COLUMN "assignee" TEXT NOT NULL DEFAULT '';
ALTER TABLE "projects" ADD COLUMN "owner_overridden" BOOLEAN NOT NULL DEFAULT false;

-- Backfill: existing `owner` values were written by sync, so they are the assignee.
UPDATE "projects" SET "assignee" = "owner";
