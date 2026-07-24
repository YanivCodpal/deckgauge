-- AlterTable
ALTER TABLE "board_views" ADD COLUMN "preset_key" VARCHAR(50);

-- CreateIndex
CREATE INDEX "board_views_preset_key_idx" ON "board_views"("preset_key");
