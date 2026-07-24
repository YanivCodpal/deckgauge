-- Deckgauge analytics database. Idempotent so the file can be re-applied
-- on top of an existing DB without dropping data.
CREATE DATABASE IF NOT EXISTS cockpit;
