CREATE SEQUENCE IF NOT EXISTS logistics_fleet_history_manual_row_seq START WITH 1000000;

CREATE TABLE IF NOT EXISTS logistics_fleet_history_vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_number VARCHAR(80) NOT NULL,
  normalized_registration VARCHAR(80) NOT NULL UNIQUE,
  fleet_type VARCHAR(20) NOT NULL CHECK (fleet_type IN ('tractor','carrier')),
  model_label VARCHAR(255),
  chassis_number VARCHAR(120),
  registered_on DATE,
  status_note VARCHAR(2000),
  source_name VARCHAR(255),
  source_sheet VARCHAR(120),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID,
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0)
);

CREATE TABLE IF NOT EXISTS logistics_fleet_history_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID NOT NULL REFERENCES logistics_fleet_history_vehicles(id) ON DELETE RESTRICT,
  occurred_on DATE,
  date_label VARCHAR(120),
  driver_name VARCHAR(255),
  intervention_label TEXT NOT NULL,
  mileage NUMERIC(14,1) CHECK (mileage >= 0),
  cost_amount NUMERIC(14,2) CHECK (cost_amount >= 0),
  cost_note VARCHAR(160),
  observation TEXT,
  provider_name VARCHAR(500),
  source_name VARCHAR(255),
  source_sheet VARCHAR(120),
  source_row INTEGER,
  origin VARCHAR(20) NOT NULL DEFAULT 'import' CHECK (origin IN ('import','manual')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID,
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  UNIQUE (source_name, source_sheet, source_row)
);

CREATE INDEX IF NOT EXISTS logistics_fleet_history_vehicles_type_idx
  ON logistics_fleet_history_vehicles(fleet_type,registration_number);
CREATE INDEX IF NOT EXISTS logistics_fleet_history_entries_vehicle_idx
  ON logistics_fleet_history_entries(vehicle_id,occurred_on DESC NULLS LAST,created_at DESC);
CREATE INDEX IF NOT EXISTS logistics_fleet_history_entries_date_idx
  ON logistics_fleet_history_entries(occurred_on DESC NULLS LAST,created_at DESC);
