CREATE TABLE IF NOT EXISTS logistics_fuel_tracking_vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_number VARCHAR(80) NOT NULL,
  normalized_registration VARCHAR(80) NOT NULL UNIQUE,
  vehicle_type VARCHAR(80),
  target_consumption NUMERIC(10,3) CHECK (target_consumption > 0),
  tank_capacity NUMERIC(12,3) CHECK (tank_capacity > 0),
  source VARCHAR(255) NOT NULL DEFAULT 'Suivi_Carburant_Mensuel_v6_2026.xlsx',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID,
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0)
);

CREATE TABLE IF NOT EXISTS logistics_fuel_tracking_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID NOT NULL REFERENCES logistics_fuel_tracking_vehicles(id) ON DELETE RESTRICT,
  occurred_on DATE NOT NULL,
  month SMALLINT NOT NULL CHECK (month BETWEEN 1 AND 12),
  fill_type VARCHAR(30) NOT NULL CHECK (fill_type IN ('initial','addition','final')),
  odometer NUMERIC(14,1) NOT NULL CHECK (odometer >= 0),
  distance_travelled NUMERIC(14,1) NOT NULL DEFAULT 0 CHECK (distance_travelled >= 0),
  quantity NUMERIC(12,3) NOT NULL CHECK (quantity > 0),
  tank_control VARCHAR(20) NOT NULL CHECK (tank_control IN ('ok','exceeded','unknown')),
  note VARCHAR(500),
  unit_price NUMERIC(12,4) CHECK (unit_price > 0),
  source_name VARCHAR(255) NOT NULL,
  source_row INTEGER NOT NULL CHECK (source_row >= 4),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID,
  UNIQUE(source_name,source_row)
);

CREATE INDEX IF NOT EXISTS logistics_fuel_tracking_entries_month_idx ON logistics_fuel_tracking_entries(month,occurred_on DESC);
CREATE INDEX IF NOT EXISTS logistics_fuel_tracking_entries_vehicle_idx ON logistics_fuel_tracking_entries(vehicle_id,occurred_on,odometer);
