-- BoardCalendarEvent: calendar overlays (freezes/migrations/holidays) for the
-- DELIVERY_TREND_ANNOTATED widget. board_id NULL = global event.
CREATE TABLE "board_calendar_events" (
  "id" TEXT NOT NULL,
  "board_id" TEXT,
  "label" VARCHAR(120) NOT NULL,
  "kind" VARCHAR(20) NOT NULL,
  "starts_at" TIMESTAMP(3) NOT NULL,
  "ends_at" TIMESTAMP(3) NOT NULL,
  "color" VARCHAR(20),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "board_calendar_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "board_calendar_events_board_id_idx" ON "board_calendar_events"("board_id");

ALTER TABLE "board_calendar_events" ADD CONSTRAINT "board_calendar_events_board_id_fkey"
  FOREIGN KEY ("board_id") REFERENCES "boards"("id") ON DELETE CASCADE ON UPDATE CASCADE;
