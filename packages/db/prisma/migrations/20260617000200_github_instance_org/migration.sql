-- Add `org` column to github_instances. Backfill from the first entry of
-- the deprecated `repos[]` array where possible (split on '/' and take the
-- owner segment). Leave empty for rows with no repos[] entries — the UI
-- requires this to be filled in when editing the instance.

ALTER TABLE "github_instances"
    ADD COLUMN "org" TEXT NOT NULL DEFAULT '';

UPDATE "github_instances"
SET    "org" = split_part(repos[1], '/', 1)
WHERE  cardinality(repos) > 0
   AND "org" = '';
