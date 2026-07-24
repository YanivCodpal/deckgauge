-- Add per-roadmap-view list of hidden (deselected) group ids. Additive with a
-- default, safe for the shared staging DB. Hand-written (migrate:dev is
-- unavailable here); applied via migrate:deploy.

ALTER TABLE "roadmap_configs"
  ADD COLUMN "hidden_group_ids" JSONB NOT NULL DEFAULT '[]';
