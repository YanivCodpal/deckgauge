-- BoardCalendarSource: one Microsoft Graph calendar connection per recruitment board.
CREATE TABLE "board_calendar_sources" (
  "id" TEXT NOT NULL,
  "board_id" TEXT NOT NULL,
  "provider" TEXT NOT NULL DEFAULT 'microsoft',
  "calendar_upn" TEXT NOT NULL DEFAULT '',
  "ms_access_token" TEXT,
  "ms_refresh_token" TEXT,
  "microsoft_upn" TEXT,
  "status" TEXT NOT NULL DEFAULT 'idle',
  "last_synced_at" TIMESTAMP(3),
  "last_sync_summary" JSONB,
  "connected_by_email" TEXT,
  "connected_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "board_calendar_sources_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "board_calendar_sources_board_id_key" ON "board_calendar_sources"("board_id");
ALTER TABLE "board_calendar_sources" ADD CONSTRAINT "board_calendar_sources_board_id_fkey"
  FOREIGN KEY ("board_id") REFERENCES "boards"("id") ON DELETE CASCADE ON UPDATE CASCADE;
