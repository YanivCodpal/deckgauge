-- CreateEnum
CREATE TYPE "roadmap_access_role" AS ENUM ('owner', 'editor', 'viewer');

-- CreateEnum
CREATE TYPE "roadmap_group_source" AS ENUM ('manual', 'board_sub');

-- CreateEnum
CREATE TYPE "roadmap_view_type" AS ENUM ('grid', 'gantt');

-- CreateTable
CREATE TABLE "roadmaps" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "created_by" TEXT NOT NULL,
    "hidden_system_columns" JSONB NOT NULL DEFAULT '[]',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "roadmaps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roadmap_access" (
    "id" TEXT NOT NULL,
    "roadmap_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "role" "roadmap_access_role" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "roadmap_access_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roadmap_board_subscriptions" (
    "id" TEXT NOT NULL,
    "roadmap_id" TEXT NOT NULL,
    "board_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "roadmap_board_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roadmap_groups" (
    "id" TEXT NOT NULL,
    "roadmap_id" TEXT NOT NULL,
    "group_id" TEXT NOT NULL,
    "position" DOUBLE PRECISION NOT NULL,
    "source" "roadmap_group_source" NOT NULL DEFAULT 'manual',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "roadmap_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roadmap_views" (
    "id" TEXT NOT NULL,
    "roadmap_id" TEXT NOT NULL,
    "type" "roadmap_view_type" NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "roadmap_views_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roadmap_gantt_configs" (
    "id" TEXT NOT NULL,
    "roadmap_view_id" TEXT NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "visible_quarters" INTEGER NOT NULL DEFAULT 4,
    "size_durations" JSONB NOT NULL,
    "default_size_weeks" DOUBLE PRECISION NOT NULL DEFAULT 2,
    "hidden_group_ids" JSONB NOT NULL DEFAULT '[]',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "roadmap_gantt_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_roadmap_prefs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "roadmap_id" TEXT NOT NULL,
    "folder_id" TEXT,
    "position" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "is_favorite" BOOLEAN NOT NULL DEFAULT false,
    "is_hidden" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_roadmap_prefs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "roadmap_access_roadmap_id_idx" ON "roadmap_access"("roadmap_id");

-- CreateIndex
CREATE INDEX "roadmap_access_user_id_idx" ON "roadmap_access"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "roadmap_access_roadmap_id_user_id_key" ON "roadmap_access"("roadmap_id", "user_id");

-- CreateIndex
CREATE INDEX "roadmap_board_subscriptions_roadmap_id_idx" ON "roadmap_board_subscriptions"("roadmap_id");

-- CreateIndex
CREATE UNIQUE INDEX "roadmap_board_subscriptions_roadmap_id_board_id_key" ON "roadmap_board_subscriptions"("roadmap_id", "board_id");

-- CreateIndex
CREATE INDEX "roadmap_groups_roadmap_id_position_idx" ON "roadmap_groups"("roadmap_id", "position");

-- CreateIndex
CREATE UNIQUE INDEX "roadmap_groups_roadmap_id_group_id_key" ON "roadmap_groups"("roadmap_id", "group_id");

-- CreateIndex
CREATE INDEX "roadmap_views_roadmap_id_idx" ON "roadmap_views"("roadmap_id");

-- CreateIndex
CREATE UNIQUE INDEX "roadmap_gantt_configs_roadmap_view_id_key" ON "roadmap_gantt_configs"("roadmap_view_id");

-- CreateIndex
CREATE INDEX "user_roadmap_prefs_user_id_folder_id_position_idx" ON "user_roadmap_prefs"("user_id", "folder_id", "position");

-- CreateIndex
CREATE UNIQUE INDEX "user_roadmap_prefs_user_id_roadmap_id_key" ON "user_roadmap_prefs"("user_id", "roadmap_id");

-- AddForeignKey
ALTER TABLE "roadmap_access" ADD CONSTRAINT "roadmap_access_roadmap_id_fkey" FOREIGN KEY ("roadmap_id") REFERENCES "roadmaps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roadmap_access" ADD CONSTRAINT "roadmap_access_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roadmap_board_subscriptions" ADD CONSTRAINT "roadmap_board_subscriptions_roadmap_id_fkey" FOREIGN KEY ("roadmap_id") REFERENCES "roadmaps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roadmap_board_subscriptions" ADD CONSTRAINT "roadmap_board_subscriptions_board_id_fkey" FOREIGN KEY ("board_id") REFERENCES "boards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roadmap_groups" ADD CONSTRAINT "roadmap_groups_roadmap_id_fkey" FOREIGN KEY ("roadmap_id") REFERENCES "roadmaps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roadmap_groups" ADD CONSTRAINT "roadmap_groups_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roadmap_views" ADD CONSTRAINT "roadmap_views_roadmap_id_fkey" FOREIGN KEY ("roadmap_id") REFERENCES "roadmaps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roadmap_gantt_configs" ADD CONSTRAINT "roadmap_gantt_configs_roadmap_view_id_fkey" FOREIGN KEY ("roadmap_view_id") REFERENCES "roadmap_views"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roadmap_prefs" ADD CONSTRAINT "user_roadmap_prefs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roadmap_prefs" ADD CONSTRAINT "user_roadmap_prefs_roadmap_id_fkey" FOREIGN KEY ("roadmap_id") REFERENCES "roadmaps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roadmap_prefs" ADD CONSTRAINT "user_roadmap_prefs_folder_id_fkey" FOREIGN KEY ("folder_id") REFERENCES "board_folders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
