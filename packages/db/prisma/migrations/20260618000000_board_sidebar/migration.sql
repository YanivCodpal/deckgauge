-- CreateTable
CREATE TABLE "board_folders" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "parent_id" TEXT,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#6366F1',
    "position" DOUBLE PRECISION NOT NULL,
    "is_expanded" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "board_folders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_board_prefs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "board_id" TEXT NOT NULL,
    "folder_id" TEXT,
    "position" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "is_favorite" BOOLEAN NOT NULL DEFAULT false,
    "is_hidden" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_board_prefs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "board_folders_user_id_parent_id_position_idx" ON "board_folders"("user_id", "parent_id", "position");

-- CreateIndex
CREATE UNIQUE INDEX "user_board_prefs_user_id_board_id_key" ON "user_board_prefs"("user_id", "board_id");

-- CreateIndex
CREATE INDEX "user_board_prefs_user_id_folder_id_position_idx" ON "user_board_prefs"("user_id", "folder_id", "position");

-- AddForeignKey
ALTER TABLE "board_folders" ADD CONSTRAINT "board_folders_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "board_folders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "board_folders" ADD CONSTRAINT "board_folders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_board_prefs" ADD CONSTRAINT "user_board_prefs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_board_prefs" ADD CONSTRAINT "user_board_prefs_board_id_fkey" FOREIGN KEY ("board_id") REFERENCES "boards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_board_prefs" ADD CONSTRAINT "user_board_prefs_folder_id_fkey" FOREIGN KEY ("folder_id") REFERENCES "board_folders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
