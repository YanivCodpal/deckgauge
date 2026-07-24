-- NOTE: the four GitHub columns on "projects" (github_issue_id,
-- github_removed_from_source, github_repo_full_name, github_synced_fields)
-- plus the unique index on github_issue_id are added by the earlier
-- migration 20260417115505_phase_1_8_schema_updates. They were duplicated
-- here originally and tripped `prisma migrate deploy` on fresh databases.
-- Removed to keep this migration purely about the new github_* tables.

-- CreateTable: github_instances
CREATE TABLE "github_instances" (
    "id" TEXT NOT NULL,
    "base_url" TEXT NOT NULL DEFAULT 'https://api.github.com',
    "access_token" TEXT NOT NULL,
    "repos" TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "github_instances_pkey" PRIMARY KEY ("id")
);

-- CreateTable: github_sync_configs
CREATE TABLE "github_sync_configs" (
    "id" TEXT NOT NULL,
    "github_instance_id" TEXT NOT NULL,
    "repo_full_name" TEXT NOT NULL,
    "board_id" TEXT NOT NULL,
    "target_group_id" TEXT,
    "allowed_labels" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "include_closed_issues" BOOLEAN NOT NULL DEFAULT false,
    "default_synced_fields" TEXT[] DEFAULT ARRAY['name', 'status', 'owner']::TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "github_sync_configs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "github_sync_configs_board_id_repo_full_name_key" ON "github_sync_configs"("board_id", "repo_full_name");

-- CreateTable: github_milestones
CREATE TABLE "github_milestones" (
    "id" TEXT NOT NULL,
    "repo_full_name" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "due_on" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "github_milestones_pkey" PRIMARY KEY ("id")
);

-- CreateTable: github_issues
CREATE TABLE "github_issues" (
    "id" TEXT NOT NULL,
    "repo_full_name" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "milestone_id" TEXT,
    "title" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "assignee_login" TEXT,
    "labels" TEXT[],
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "github_issues_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "github_sync_configs" ADD CONSTRAINT "github_sync_configs_github_instance_id_fkey"
  FOREIGN KEY ("github_instance_id") REFERENCES "github_instances"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "github_sync_configs" ADD CONSTRAINT "github_sync_configs_board_id_fkey"
  FOREIGN KEY ("board_id") REFERENCES "boards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "github_sync_configs" ADD CONSTRAINT "github_sync_configs_target_group_id_fkey"
  FOREIGN KEY ("target_group_id") REFERENCES "groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "github_issues" ADD CONSTRAINT "github_issues_milestone_id_fkey"
  FOREIGN KEY ("milestone_id") REFERENCES "github_milestones"("id") ON DELETE SET NULL ON UPDATE CASCADE;
