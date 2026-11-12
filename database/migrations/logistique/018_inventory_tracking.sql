CREATE SEQUENCE IF NOT EXISTS logistics_inventory_tracking_manual_row_seq START WITH 1000000;

CREATE TABLE IF NOT EXISTS logistics_inventory_tracking_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference VARCHAR(120) NOT NULL,
  normalized_reference VARCHAR(120) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  opening_quantity NUMERIC(14,3) NOT NULL DEFAULT 0,
  declared_quantity NUMERIC(14,3),
  inventory_quantity NUMERIC(14,3),
  inventory_note VARCHAR(500),
  unit VARCHAR(30) NOT NULL DEFAULT 'piece',
  source_name VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID,
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0)
);

CREATE TABLE IF NOT EXISTS logistics_inventory_tracking_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES logistics_inventory_tracking_items(id) ON DELETE RESTRICT,
  occurred_on DATE,
  movement_type VARCHAR(20) NOT NULL CHECK (movement_type IN ('entry','exit')),
  quantity NUMERIC(14,3) NOT NULL CHECK (quantity > 0),
  requester VARCHAR(255),
  vehicle_registration VARCHAR(120),
  operation_label VARCHAR(500),
  depot VARCHAR(160),
  source_name VARCHAR(255),
  source_row INTEGER,
  origin VARCHAR(20) NOT NULL DEFAULT 'import' CHECK (origin IN ('import','manual')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID,
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  UNIQUE (source_name, source_row, movement_type)
);

CREATE INDEX IF NOT EXISTS logistics_inventory_tracking_items_name_idx
  ON logistics_inventory_tracking_items(name);
CREATE INDEX IF NOT EXISTS logistics_inventory_tracking_movements_item_idx
  ON logistics_inventory_tracking_movements(item_id,occurred_on DESC,created_at DESC);
CREATE INDEX IF NOT EXISTS logistics_inventory_tracking_movements_date_idx
  ON logistics_inventory_tracking_movements(occurred_on DESC,created_at DESC);
