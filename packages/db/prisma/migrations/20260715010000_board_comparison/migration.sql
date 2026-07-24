-- P6: multi-board comparison view type + persisted board set.

-- AlterEnum
ALTER TYPE "board_view_type" ADD VALUE 'comparison';

-- CreateTable
CREATE TABLE "board_comparison_members" (
    "id" TEXT NOT NULL,
    "comparison_view_id" TEXT NOT NULL,
    "board_id" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "board_comparison_members_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "board_comparison_members_comparison_view_id_position_idx" ON "board_comparison_members"("comparison_view_id", "position");

-- CreateIndex
CREATE UNIQUE INDEX "board_comparison_members_comparison_view_id_board_id_key" ON "board_comparison_members"("comparison_view_id", "board_id");

-- AddForeignKey
ALTER TABLE "board_comparison_members" ADD CONSTRAINT "board_comparison_members_comparison_view_id_fkey" FOREIGN KEY ("comparison_view_id") REFERENCES "board_views"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "board_comparison_members" ADD CONSTRAINT "board_comparison_members_board_id_fkey" FOREIGN KEY ("board_id") REFERENCES "boards"("id") ON DELETE CASCADE ON UPDATE CASCADE;
