CREATE SEQUENCE IF NOT EXISTS logistics_fuel_tracking_manual_row_seq START WITH 1000000;

ALTER TABLE logistics_fuel_tracking_entries
  ADD COLUMN IF NOT EXISTS origin VARCHAR(20) NOT NULL DEFAULT 'import' CHECK (origin IN ('import','manual')),
  ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0);
