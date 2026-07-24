-- Migration: drop bucket roadmap schema (Task 14)
-- SAFETY: Use IF EXISTS on all drops so a partial apply is safe to re-run.
-- DO NOT apply against the shared staging DB while main branch still uses these columns.

-- Drop the bucket index on projects
DROP INDEX IF EXISTS "projects_boardId_roadmapBucket_roadmapOrder_idx";

-- Drop bucket columns from projects
ALTER TABLE projects
  DROP COLUMN IF EXISTS roadmap_bucket,
  DROP COLUMN IF EXISTS roadmap_bucket_source,
  DROP COLUMN IF EXISTS roadmap_order,
  DROP COLUMN IF EXISTS roadmap_projection;

-- Drop the old RoadmapViewConfig table
DROP TABLE IF EXISTS roadmap_view_configs;

-- Drop bucket-related enum types
DROP TYPE IF EXISTS roadmap_bucket_source;
DROP TYPE IF EXISTS bucket_granularity;
