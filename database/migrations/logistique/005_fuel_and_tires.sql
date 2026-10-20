CREATE TABLE IF NOT EXISTS logistics_fuel_stations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), code VARCHAR(60) NOT NULL UNIQUE, name VARCHAR(160) NOT NULL,
  provider_id UUID REFERENCES logistics_service_providers(id) ON DELETE RESTRICT,
  site_id UUID REFERENCES logistics_sites(id) ON DELETE RESTRICT, active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), created_by UUID
);

CREATE TABLE IF NOT EXISTS logistics_fuel_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), asset_id UUID NOT NULL REFERENCES logistics_assets(id) ON DELETE RESTRICT,
  driver_id UUID REFERENCES logistics_drivers(id) ON DELETE RESTRICT, station_id UUID REFERENCES logistics_fuel_stations(id) ON DELETE RESTRICT,
  occurred_at TIMESTAMPTZ NOT NULL, fuel_type VARCHAR(30) NOT NULL CHECK (fuel_type IN ('diesel','gasoline','electric','lpg','other')),
  quantity NUMERIC(12,3) NOT NULL CHECK (quantity > 0), unit_price NUMERIC(12,4) NOT NULL CHECK (unit_price > 0),
  total_amount NUMERIC(14,2) NOT NULL CHECK (total_amount >= 0), meter_type VARCHAR(20) NOT NULL CHECK (meter_type IN ('odometer','hours')),
  meter_reading NUMERIC(14,1) NOT NULL CHECK (meter_reading >= 0), receipt_reference VARCHAR(160), notes TEXT,
  consumption_rate NUMERIC(14,3) CHECK (consumption_rate >= 0), review_status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (review_status IN ('pending','clear','flagged','reviewed')),
  fingerprint CHAR(64) NOT NULL UNIQUE, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), created_by UUID NOT NULL
);
CREATE INDEX IF NOT EXISTS logistics_fuel_asset_date_idx ON logistics_fuel_transactions(asset_id,occurred_at DESC);

CREATE TABLE IF NOT EXISTS logistics_fuel_anomalies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), transaction_id UUID NOT NULL REFERENCES logistics_fuel_transactions(id) ON DELETE RESTRICT,
  rule_code VARCHAR(60) NOT NULL, severity VARCHAR(20) NOT NULL CHECK (severity IN ('warning','critical')),
  observed_value NUMERIC(14,3), expected_value NUMERIC(14,3), description TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'open' CHECK (status IN ('open','resolved','false_positive')),
  reviewed_at TIMESTAMPTZ, reviewed_by UUID, resolution TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0), UNIQUE(transaction_id,rule_code)
);

CREATE TABLE IF NOT EXISTS logistics_tire_positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), code VARCHAR(50) NOT NULL UNIQUE, label VARCHAR(120) NOT NULL,
  category_id UUID REFERENCES logistics_asset_categories(id) ON DELETE RESTRICT, active BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS logistics_tires (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), internal_id VARCHAR(80) NOT NULL UNIQUE, brand VARCHAR(120) NOT NULL,
  model VARCHAR(120), size VARCHAR(80) NOT NULL, dot_serial VARCHAR(120), provider_id UUID REFERENCES logistics_service_providers(id) ON DELETE RESTRICT,
  purchased_at DATE, purchase_cost NUMERIC(14,2) CHECK (purchase_cost >= 0), status VARCHAR(20) NOT NULL DEFAULT 'stock' CHECK (status IN ('stock','installed','repair','retired','scrapped')),
  current_asset_id UUID REFERENCES logistics_assets(id) ON DELETE RESTRICT, current_position_id UUID REFERENCES logistics_tire_positions(id) ON DELETE RESTRICT,
  first_installed_mileage NUMERIC(14,1), current_installed_mileage NUMERIC(14,1), notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), created_by UUID NOT NULL, updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_by UUID NOT NULL,
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0), deleted_at TIMESTAMPTZ, deleted_by UUID,
  CHECK ((status='installed' AND current_asset_id IS NOT NULL AND current_position_id IS NOT NULL) OR (status!='installed' AND current_asset_id IS NULL AND current_position_id IS NULL))
);
CREATE UNIQUE INDEX IF NOT EXISTS logistics_tires_dot_unique ON logistics_tires(LOWER(dot_serial)) WHERE dot_serial IS NOT NULL AND deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS logistics_tires_active_position_unique ON logistics_tires(current_asset_id,current_position_id) WHERE status='installed' AND deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS logistics_tire_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), tire_id UUID NOT NULL REFERENCES logistics_tires(id) ON DELETE RESTRICT,
  operation VARCHAR(20) NOT NULL CHECK (operation IN ('received','installed','removed','transferred','sent_repair','returned_repair','retired','scrapped')),
  source_asset_id UUID REFERENCES logistics_assets(id) ON DELETE RESTRICT, target_asset_id UUID REFERENCES logistics_assets(id) ON DELETE RESTRICT,
  source_position_id UUID REFERENCES logistics_tire_positions(id) ON DELETE RESTRICT, target_position_id UUID REFERENCES logistics_tire_positions(id) ON DELETE RESTRICT,
  mileage NUMERIC(14,1) CHECK (mileage >= 0), occurred_at TIMESTAMPTZ NOT NULL, intervention_id UUID REFERENCES logistics_maintenance_interventions(id) ON DELETE RESTRICT,
  cost NUMERIC(14,2) CHECK (cost >= 0), notes TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), created_by UUID NOT NULL
);
CREATE INDEX IF NOT EXISTS logistics_tire_movements_tire_idx ON logistics_tire_movements(tire_id,occurred_at DESC);

INSERT INTO logistics_tire_positions(code,label) VALUES
 ('front_left','Avant gauche'),('front_right','Avant droite'),('rear_left','Arrière gauche'),('rear_right','Arrière droite'),
 ('rear_inner_left','Arrière intérieur gauche'),('rear_inner_right','Arrière intérieur droit'),('spare','Roue de secours')
ON CONFLICT(code) DO NOTHING;
