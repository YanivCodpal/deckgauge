-- CreateEnum
CREATE TYPE "sync_source" AS ENUM ('ADO', 'GITHUB', 'JIRA', 'GITLAB');

-- CreateTable
CREATE TABLE "board_sync_exclusions" (
    "id" TEXT NOT NULL,
    "board_id" TEXT NOT NULL,
    "source" "sync_source" NOT NULL,
    "external_id" TEXT NOT NULL,
    "excluded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "excluded_by" TEXT,

    CONSTRAINT "board_sync_exclusions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "board_sync_exclusions_board_id_source_idx" ON "board_sync_exclusions"("board_id", "source");

-- CreateIndex
CREATE UNIQUE INDEX "board_sync_exclusions_board_id_source_external_id_key" ON "board_sync_exclusions"("board_id", "source", "external_id");

-- AddForeignKey
ALTER TABLE "board_sync_exclusions" ADD CONSTRAINT "board_sync_exclusions_board_id_fkey" FOREIGN KEY ("board_id") REFERENCES "boards"("id") ON DELETE CASCADE ON UPDATE CASCADE;
