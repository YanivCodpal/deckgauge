-- Project: explicit schedule fields
ALTER TABLE "projects" ADD COLUMN "start_date" TIMESTAMP(3);
ALTER TABLE "projects" ADD COLUMN "end_date" TIMESTAMP(3);
ALTER TABLE "projects" ADD COLUMN "duration_code" TEXT;

-- Board: per-board system-field visibility
ALTER TABLE "boards" ADD COLUMN "hidden_system_fields" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

-- Backfill start_date from the superseded soft pin
UPDATE "projects" SET "start_date" = "roadmap_pinned_start"
WHERE "roadmap_pinned_start" IS NOT NULL AND "start_date" IS NULL;

-- Default Size = 'L' for any project that has no Size field value yet.
-- Size lives as a ProjectFieldValue on the board column named 'Size'.
INSERT INTO "project_field_values" ("id", "projectId", "columnId", "value")
SELECT gen_random_uuid(), p."id", c."id", 'L'
FROM "projects" p
JOIN "board_columns" c ON c."boardId" = p."board_id" AND c."name" = 'Size'
LEFT JOIN "project_field_values" fv ON fv."projectId" = p."id" AND fv."columnId" = c."id"
WHERE p."board_id" IS NOT NULL AND fv."id" IS NULL;
