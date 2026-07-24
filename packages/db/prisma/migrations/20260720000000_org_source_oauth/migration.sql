-- Per-user delegated Microsoft OAuth connection fields for org-tree Graph sync.
-- All additive + nullable; existing rows are unaffected (they read as "not connected").
ALTER TABLE "org_tree_sources" ADD COLUMN "ms_refresh_token" TEXT;
ALTER TABLE "org_tree_sources" ADD COLUMN "microsoft_upn" TEXT;
ALTER TABLE "org_tree_sources" ADD COLUMN "connected_by_email" TEXT;
ALTER TABLE "org_tree_sources" ADD COLUMN "connected_at" TIMESTAMP(3);
