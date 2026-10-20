CREATE TABLE IF NOT EXISTS logistics_spare_parts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), sku VARCHAR(80) NOT NULL UNIQUE, name VARCHAR(200) NOT NULL,
  category VARCHAR(120), unit VARCHAR(30) NOT NULL DEFAULT 'piece' CHECK (unit IN ('piece','liter','kg','meter','set')),
  average_cost NUMERIC(14,4) NOT NULL DEFAULT 0 CHECK (average_cost >= 0),
  quantity_on_hand NUMERIC(14,3) NOT NULL DEFAULT 0,
  minimum_quantity NUMERIC(14,3) NOT NULL DEFAULT 0 CHECK (minimum_quantity >= 0),
  reorder_quantity NUMERIC(14,3) NOT NULL DEFAULT 0 CHECK (reorder_quantity >= 0),
  location VARCHAR(160), preferred_provider_id UUID REFERENCES logistics_service_providers(id) ON DELETE RESTRICT,
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive','obsolete')), notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), created_by UUID NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_by UUID NOT NULL,
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0), deleted_at TIMESTAMPTZ, deleted_by UUID
);
CREATE INDEX IF NOT EXISTS logistics_spare_parts_stock_idx ON logistics_spare_parts(status,quantity_on_hand,minimum_quantity) WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS logistics_spare_part_compatibility (
  spare_part_id UUID NOT NULL REFERENCES logistics_spare_parts(id) ON DELETE RESTRICT,
  category_id UUID REFERENCES logistics_asset_categories(id) ON DELETE RESTRICT,
  asset_id UUID REFERENCES logistics_assets(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), created_by UUID NOT NULL,
  CHECK ((category_id IS NOT NULL AND asset_id IS NULL) OR (category_id IS NULL AND asset_id IS NOT NULL)),
  UNIQUE NULLS NOT DISTINCT(spare_part_id,category_id,asset_id)
);

CREATE TABLE IF NOT EXISTS logistics_stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), spare_part_id UUID NOT NULL REFERENCES logistics_spare_parts(id) ON DELETE RESTRICT,
  operation VARCHAR(20) NOT NULL CHECK (operation IN ('receipt','issue','return','adjustment','reversal')),
  quantity_signed NUMERIC(14,3) NOT NULL CHECK (quantity_signed <> 0), unit_cost NUMERIC(14,4) NOT NULL CHECK (unit_cost >= 0),
  total_value NUMERIC(14,2) NOT NULL, occurred_at TIMESTAMPTZ NOT NULL,
  intervention_id UUID REFERENCES logistics_maintenance_interventions(id) ON DELETE RESTRICT,
  asset_id UUID REFERENCES logistics_assets(id) ON DELETE RESTRICT, responsible_user_id UUID NOT NULL,
  source_document VARCHAR(160), reason TEXT, reverses_movement_id UUID UNIQUE REFERENCES logistics_stock_movements(id) ON DELETE RESTRICT,
  balance_after NUMERIC(14,3) NOT NULL, average_cost_after NUMERIC(14,4) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), created_by UUID NOT NULL,
  CHECK ((operation='issue' AND quantity_signed<0) OR (operation IN ('receipt','return') AND quantity_signed>0) OR operation IN ('adjustment','reversal'))
);
CREATE INDEX IF NOT EXISTS logistics_stock_movements_part_idx ON logistics_stock_movements(spare_part_id,occurred_at DESC);
CREATE INDEX IF NOT EXISTS logistics_stock_movements_intervention_idx ON logistics_stock_movements(intervention_id) WHERE intervention_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS logistics_intervention_cost_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), intervention_id UUID NOT NULL REFERENCES logistics_maintenance_interventions(id) ON DELETE RESTRICT,
  line_type VARCHAR(20) NOT NULL CHECK (line_type IN ('part','labor','service','other')),
  source_type VARCHAR(40) NOT NULL, source_id UUID NOT NULL, label VARCHAR(255) NOT NULL,
  quantity NUMERIC(14,3) NOT NULL, unit_price NUMERIC(14,4) NOT NULL, tax_rate NUMERIC(7,4) NOT NULL DEFAULT 0,
  total_amount NUMERIC(14,2) NOT NULL, included_in_provider_total BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), created_by UUID NOT NULL,
  UNIQUE(source_type,source_id)
);
CREATE INDEX IF NOT EXISTS logistics_cost_lines_intervention_idx ON logistics_intervention_cost_lines(intervention_id);

COMMENT ON COLUMN logistics_stock_movements.responsible_user_id IS 'Référence logique vers la base centrale users.id';
