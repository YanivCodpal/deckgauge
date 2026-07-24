-- CreateEnum
CREATE TYPE "board_view_type" AS ENUM ('board', 'dashboard');

-- CreateTable
CREATE TABLE "board_views" (
    "id" TEXT NOT NULL,
    "board_id" TEXT NOT NULL,
    "type" "board_view_type" NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "board_views_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dashboard_widgets" (
    "id" TEXT NOT NULL,
    "board_view_id" TEXT NOT NULL,
    "widget_type" VARCHAR(50) NOT NULL,
    "title" VARCHAR(100) NOT NULL,
    "config" JSONB NOT NULL DEFAULT '{}',
    "layout" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dashboard_widgets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_status_changes" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "from_status" TEXT,
    "to_status" TEXT NOT NULL,
    "changed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "changed_by" TEXT,

    CONSTRAINT "project_status_changes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "board_views_board_id_idx" ON "board_views"("board_id");

-- CreateIndex
CREATE INDEX "dashboard_widgets_board_view_id_idx" ON "dashboard_widgets"("board_view_id");

-- CreateIndex
CREATE INDEX "project_status_changes_project_id_changed_at_idx" ON "project_status_changes"("project_id", "changed_at");

-- CreateIndex
CREATE INDEX "project_status_changes_to_status_changed_at_idx" ON "project_status_changes"("to_status", "changed_at");

-- AddForeignKey
ALTER TABLE "board_views" ADD CONSTRAINT "board_views_board_id_fkey" FOREIGN KEY ("board_id") REFERENCES "boards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dashboard_widgets" ADD CONSTRAINT "dashboard_widgets_board_view_id_fkey" FOREIGN KEY ("board_view_id") REFERENCES "board_views"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_status_changes" ADD CONSTRAINT "project_status_changes_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
