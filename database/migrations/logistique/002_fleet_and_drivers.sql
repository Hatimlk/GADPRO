CREATE TABLE IF NOT EXISTS logistics_departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(40) NOT NULL UNIQUE,
  name VARCHAR(160) NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID,
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  deleted_at TIMESTAMPTZ,
  deleted_by UUID
);

CREATE TABLE IF NOT EXISTS logistics_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fleet_number VARCHAR(80) NOT NULL UNIQUE,
  registration_number VARCHAR(80),
  category_id UUID NOT NULL REFERENCES logistics_asset_categories(id) ON DELETE RESTRICT,
  brand VARCHAR(120) NOT NULL,
  model VARCHAR(120) NOT NULL,
  serial_number VARCHAR(160),
  vin VARCHAR(80),
  manufacture_year SMALLINT CHECK (manufacture_year BETWEEN 1900 AND 2200),
  acquisition_date DATE,
  purchase_cost NUMERIC(14,2) CHECK (purchase_cost >= 0),
  currency CHAR(3) NOT NULL DEFAULT 'MAD' CHECK (currency = 'MAD'),
  site_id UUID NOT NULL REFERENCES logistics_sites(id) ON DELETE RESTRICT,
  department_id UUID REFERENCES logistics_departments(id) ON DELETE RESTRICT,
  current_mileage NUMERIC(14,1) NOT NULL DEFAULT 0 CHECK (current_mileage >= 0),
  current_operating_hours NUMERIC(14,1) NOT NULL DEFAULT 0 CHECK (current_operating_hours >= 0),
  fuel_type VARCHAR(30) CHECK (fuel_type IN ('diesel','gasoline','electric','hybrid','lpg','other')),
  status VARCHAR(30) NOT NULL DEFAULT 'available'
    CHECK (status IN ('available','in_operation','under_maintenance','immobilized','out_of_service','sold','decommissioned')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID NOT NULL,
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  deleted_at TIMESTAMPTZ,
  deleted_by UUID
);

CREATE UNIQUE INDEX IF NOT EXISTS logistics_assets_registration_unique
  ON logistics_assets(LOWER(registration_number)) WHERE registration_number IS NOT NULL AND deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS logistics_assets_vin_unique
  ON logistics_assets(LOWER(vin)) WHERE vin IS NOT NULL AND deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS logistics_assets_serial_unique
  ON logistics_assets(LOWER(serial_number)) WHERE serial_number IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS logistics_assets_scope_idx
  ON logistics_assets(site_id, department_id, category_id, status) WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS logistics_meter_readings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID NOT NULL REFERENCES logistics_assets(id) ON DELETE RESTRICT,
  meter_type VARCHAR(20) NOT NULL CHECK (meter_type IN ('odometer','hours')),
  reading NUMERIC(14,1) NOT NULL CHECK (reading >= 0),
  recorded_at TIMESTAMPTZ NOT NULL,
  source VARCHAR(30) NOT NULL DEFAULT 'manual' CHECK (source IN ('manual','fuel','maintenance','import','telematics')),
  source_record_id UUID,
  correction_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID NOT NULL
);
CREATE INDEX IF NOT EXISTS logistics_meter_readings_asset_idx
  ON logistics_meter_readings(asset_id, meter_type, recorded_at DESC);

CREATE TABLE IF NOT EXISTS logistics_drivers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_identifier VARCHAR(80) NOT NULL UNIQUE,
  full_name VARCHAR(200) NOT NULL,
  employee_status VARCHAR(30) NOT NULL DEFAULT 'active'
    CHECK (employee_status IN ('active','suspended','inactive','departed')),
  professional_phone VARCHAR(40),
  professional_email VARCHAR(255),
  license_expiry_date DATE,
  notes TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID NOT NULL,
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  deleted_at TIMESTAMPTZ,
  deleted_by UUID
);
CREATE UNIQUE INDEX IF NOT EXISTS logistics_drivers_email_unique
  ON logistics_drivers(LOWER(professional_email)) WHERE professional_email IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS logistics_drivers_status_idx
  ON logistics_drivers(employee_status, license_expiry_date) WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS logistics_driver_license_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id UUID NOT NULL REFERENCES logistics_drivers(id) ON DELETE RESTRICT,
  category VARCHAR(20) NOT NULL,
  issued_at DATE,
  expires_at DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID NOT NULL,
  UNIQUE(driver_id, category),
  CHECK (expires_at IS NULL OR issued_at IS NULL OR expires_at >= issued_at)
);

CREATE TABLE IF NOT EXISTS logistics_driver_authorizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id UUID NOT NULL REFERENCES logistics_drivers(id) ON DELETE RESTRICT,
  asset_category_id UUID NOT NULL REFERENCES logistics_asset_categories(id) ON DELETE RESTRICT,
  valid_from DATE NOT NULL DEFAULT CURRENT_DATE,
  valid_until DATE,
  authorized_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(driver_id, asset_category_id, valid_from),
  CHECK (valid_until IS NULL OR valid_until >= valid_from)
);

CREATE TABLE IF NOT EXISTS logistics_driver_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id UUID NOT NULL REFERENCES logistics_drivers(id) ON DELETE RESTRICT,
  asset_id UUID NOT NULL REFERENCES logistics_assets(id) ON DELETE RESTRICT,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID NOT NULL,
  ended_by UUID,
  CHECK (ends_at IS NULL OR ends_at >= starts_at)
);
CREATE UNIQUE INDEX IF NOT EXISTS logistics_assignments_one_current_primary
  ON logistics_driver_assignments(asset_id) WHERE is_primary=true AND ends_at IS NULL;
CREATE INDEX IF NOT EXISTS logistics_assignments_asset_idx
  ON logistics_driver_assignments(asset_id, starts_at DESC);
CREATE INDEX IF NOT EXISTS logistics_assignments_driver_idx
  ON logistics_driver_assignments(driver_id, starts_at DESC);

COMMENT ON COLUMN logistics_assets.created_by IS 'Référence logique vers la base centrale users.id';
COMMENT ON COLUMN logistics_drivers.created_by IS 'Référence logique vers la base centrale users.id';
COMMENT ON COLUMN logistics_driver_assignments.created_by IS 'Référence logique vers la base centrale users.id';
