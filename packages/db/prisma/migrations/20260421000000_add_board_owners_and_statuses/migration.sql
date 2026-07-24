-- CreateTable
CREATE TABLE "board_owners" (
    "id" TEXT NOT NULL,
    "board_id" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "color" VARCHAR(7) NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "board_owners_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "board_statuses" (
    "id" TEXT NOT NULL,
    "board_id" TEXT NOT NULL,
    "label" VARCHAR(50) NOT NULL,
    "color" VARCHAR(7) NOT NULL,
    "icon" VARCHAR(10),
    "order" INTEGER NOT NULL DEFAULT 0,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "board_statuses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "board_owners_board_id_idx" ON "board_owners"("board_id");

-- CreateIndex
CREATE UNIQUE INDEX "board_owners_board_id_name_key" ON "board_owners"("board_id", "name");

-- CreateIndex
CREATE INDEX "board_statuses_board_id_idx" ON "board_statuses"("board_id");

-- CreateIndex
CREATE UNIQUE INDEX "board_statuses_board_id_label_key" ON "board_statuses"("board_id", "label");

-- CreateIndex
CREATE UNIQUE INDEX "board_statuses_board_id_color_key" ON "board_statuses"("board_id", "color");

-- AddForeignKey
ALTER TABLE "board_owners" ADD CONSTRAINT "board_owners_board_id_fkey" FOREIGN KEY ("board_id") REFERENCES "boards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "board_statuses" ADD CONSTRAINT "board_statuses_board_id_fkey" FOREIGN KEY ("board_id") REFERENCES "boards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable: add ownerId and statusId to projects
ALTER TABLE "projects" ADD COLUMN "owner_id" TEXT;
ALTER TABLE "projects" ADD COLUMN "status_id" TEXT;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "board_owners"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_status_id_fkey" FOREIGN KEY ("status_id") REFERENCES "board_statuses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Partial unique index: only one isDefault=true per board
CREATE UNIQUE INDEX "board_statuses_board_id_is_default_true_key"
    ON "board_statuses" ("board_id")
    WHERE "is_default" = true;

-- Data migration: seed 5 default statuses for every existing board
INSERT INTO "board_statuses" ("id", "board_id", "label", "color", "icon", "order", "is_default", "createdAt", "updatedAt")
SELECT
    gen_random_uuid(), b."id", s."label", s."color", s."icon", s."order", s."is_default",
    NOW(), NOW()
FROM "boards" b
CROSS JOIN (
    VALUES
        ('Not Started', '#C4C4C4', '○',  0, true),
        ('In Progress', '#579BFC', '◑',  1, false),
        ('At Risk',     '#FDAB3D', '⚠',  2, false),
        ('Blocked',     '#E44258', '⊗',  3, false),
        ('Done',        '#00C875', '✓',  4, false)
) AS s("label", "color", "icon", "order", "is_default");

-- Data migration: map existing projects' status enum to board_statuses by label match
UPDATE "projects" p
SET "status_id" = bs."id"
FROM "board_statuses" bs
WHERE p."board_id" = bs."board_id"
  AND bs."label" = CASE p."status"
    WHEN 'Not started' THEN 'Not Started'
    WHEN 'In progress' THEN 'In Progress'
    WHEN 'At risk'     THEN 'At Risk'
    WHEN 'Blocked'     THEN 'Blocked'
    WHEN 'Done'        THEN 'Done'
  END;

-- Data migration: update JiraSyncConfig statusMapping from enum values to board_status IDs
-- For each jira_sync_config row, replace the enum-value entries in the statusMapping JSON
-- with the corresponding board_status IDs from the same board.
UPDATE "jira_sync_configs" jsc
SET "status_mapping" = (
    SELECT COALESCE(
        jsonb_object_agg(
            kv.key,
            COALESCE(bs."id", kv.value #>> '{}')
        ),
        '{}'::jsonb
    )
    FROM jsonb_each(jsc."status_mapping"::jsonb) AS kv(key, value)
    LEFT JOIN "board_statuses" bs
        ON bs."board_id" = jsc."board_id"
        AND bs."label" = CASE kv.value #>> '{}'
            WHEN 'Not started' THEN 'Not Started'
            WHEN 'In progress' THEN 'In Progress'
            WHEN 'At risk'     THEN 'At Risk'
            WHEN 'Blocked'     THEN 'Blocked'
            WHEN 'Done'        THEN 'Done'
            ELSE kv.value #>> '{}'
        END
)
WHERE jsonb_typeof(jsc."status_mapping"::jsonb) = 'object'
  AND jsc."status_mapping"::jsonb != '{}'::jsonb;
