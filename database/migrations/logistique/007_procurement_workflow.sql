CREATE SEQUENCE IF NOT EXISTS logistics_quotation_reference_seq;
CREATE SEQUENCE IF NOT EXISTS logistics_purchase_order_reference_seq;

CREATE TABLE IF NOT EXISTS logistics_approval_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), entity_type VARCHAR(30) NOT NULL CHECK (entity_type IN ('quotation','purchase_order','invoice')),
  name VARCHAR(160) NOT NULL, minimum_amount NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (minimum_amount >= 0),
  maximum_amount NUMERIC(14,2) CHECK (maximum_amount IS NULL OR maximum_amount >= minimum_amount),
  required_permission VARCHAR(100) NOT NULL, approval_order INTEGER NOT NULL DEFAULT 1 CHECK (approval_order > 0),
  active BOOLEAN NOT NULL DEFAULT true, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), created_by UUID NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_by UUID NOT NULL, version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  UNIQUE(entity_type, approval_order, minimum_amount)
);

CREATE TABLE IF NOT EXISTS logistics_quotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), reference VARCHAR(40) NOT NULL UNIQUE,
  provider_reference VARCHAR(120), provider_id UUID NOT NULL REFERENCES logistics_service_providers(id) ON DELETE RESTRICT,
  intervention_id UUID NOT NULL REFERENCES logistics_maintenance_interventions(id) ON DELETE RESTRICT,
  quotation_date DATE NOT NULL, validity_date DATE, currency CHAR(3) NOT NULL DEFAULT 'MAD' CHECK (currency='MAD'),
  subtotal NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (subtotal >= 0), tax_amount NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (tax_amount >= 0),
  total_amount NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
  status VARCHAR(30) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','submitted','pending_approval','approved','rejected','expired','cancelled')),
  notes TEXT, attachment_document_id UUID, requested_by UUID NOT NULL, submitted_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ, approved_by UUID, rejection_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), created_by UUID NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_by UUID NOT NULL,
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0), deleted_at TIMESTAMPTZ, deleted_by UUID,
  CHECK (validity_date IS NULL OR validity_date >= quotation_date), CHECK (total_amount = subtotal + tax_amount)
);
CREATE INDEX IF NOT EXISTS logistics_quotations_intervention_idx ON logistics_quotations(intervention_id,status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS logistics_quotations_provider_idx ON logistics_quotations(provider_id,quotation_date DESC) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS logistics_quotations_one_approved_per_intervention ON logistics_quotations(intervention_id) WHERE status='approved' AND deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS logistics_quotation_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), quotation_id UUID NOT NULL REFERENCES logistics_quotations(id) ON DELETE RESTRICT,
  position INTEGER NOT NULL CHECK (position > 0), description VARCHAR(500) NOT NULL,
  item_type VARCHAR(20) NOT NULL CHECK (item_type IN ('part','labor','service','other')),
  spare_part_id UUID REFERENCES logistics_spare_parts(id) ON DELETE RESTRICT,
  quantity NUMERIC(14,3) NOT NULL CHECK (quantity > 0), unit_price NUMERIC(14,4) NOT NULL CHECK (unit_price >= 0),
  tax_rate NUMERIC(7,4) NOT NULL DEFAULT 0 CHECK (tax_rate >= 0 AND tax_rate <= 100),
  subtotal NUMERIC(14,2) NOT NULL CHECK (subtotal >= 0), tax_amount NUMERIC(14,2) NOT NULL CHECK (tax_amount >= 0),
  total_amount NUMERIC(14,2) NOT NULL CHECK (total_amount >= 0), created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), created_by UUID NOT NULL,
  UNIQUE(quotation_id,position), CHECK (item_type='part' OR spare_part_id IS NULL), CHECK (total_amount = subtotal + tax_amount)
);

CREATE TABLE IF NOT EXISTS logistics_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), entity_type VARCHAR(30) NOT NULL CHECK (entity_type IN ('quotation','purchase_order','invoice')),
  entity_id UUID NOT NULL, approval_order INTEGER NOT NULL DEFAULT 1 CHECK (approval_order > 0),
  required_permission VARCHAR(100) NOT NULL, status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','cancelled')),
  requested_by UUID NOT NULL, requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), decided_by UUID, decided_at TIMESTAMPTZ, decision_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), UNIQUE(entity_type,entity_id,approval_order)
);
CREATE INDEX IF NOT EXISTS logistics_approvals_pending_idx ON logistics_approvals(entity_type,status,requested_at) WHERE status='pending';

CREATE TABLE IF NOT EXISTS logistics_purchase_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), reference VARCHAR(40) NOT NULL UNIQUE,
  quotation_id UUID NOT NULL UNIQUE REFERENCES logistics_quotations(id) ON DELETE RESTRICT,
  provider_id UUID NOT NULL REFERENCES logistics_service_providers(id) ON DELETE RESTRICT,
  intervention_id UUID NOT NULL REFERENCES logistics_maintenance_interventions(id) ON DELETE RESTRICT,
  order_date DATE NOT NULL DEFAULT CURRENT_DATE, expected_delivery_date DATE,
  subtotal NUMERIC(14,2) NOT NULL CHECK (subtotal >= 0), tax_amount NUMERIC(14,2) NOT NULL CHECK (tax_amount >= 0),
  total_amount NUMERIC(14,2) NOT NULL CHECK (total_amount = subtotal + tax_amount), currency CHAR(3) NOT NULL DEFAULT 'MAD' CHECK (currency='MAD'),
  status VARCHAR(30) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','pending_approval','approved','issued','partially_received','completed','cancelled')),
  notes TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), created_by UUID NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_by UUID NOT NULL,
  approved_at TIMESTAMPTZ, approved_by UUID, issued_at TIMESTAMPTZ,
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  CHECK (expected_delivery_date IS NULL OR expected_delivery_date >= order_date)
);
CREATE INDEX IF NOT EXISTS logistics_purchase_orders_intervention_idx ON logistics_purchase_orders(intervention_id,status);

CREATE TABLE IF NOT EXISTS logistics_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), supplier_invoice_number VARCHAR(120) NOT NULL,
  provider_id UUID NOT NULL REFERENCES logistics_service_providers(id) ON DELETE RESTRICT,
  purchase_order_id UUID NOT NULL REFERENCES logistics_purchase_orders(id) ON DELETE RESTRICT,
  intervention_id UUID NOT NULL REFERENCES logistics_maintenance_interventions(id) ON DELETE RESTRICT,
  invoice_date DATE NOT NULL, subtotal NUMERIC(14,2) NOT NULL CHECK (subtotal >= 0),
  tax_amount NUMERIC(14,2) NOT NULL CHECK (tax_amount >= 0), total_amount NUMERIC(14,2) NOT NULL CHECK (total_amount = subtotal + tax_amount),
  currency CHAR(3) NOT NULL DEFAULT 'MAD' CHECK (currency='MAD'),
  status VARCHAR(30) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','pending_validation','validated','rejected','cancelled')),
  attachment_document_id UUID, notes TEXT, submitted_at TIMESTAMPTZ, validated_at TIMESTAMPTZ, validated_by UUID, rejection_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), created_by UUID NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_by UUID NOT NULL,
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0)
);
CREATE UNIQUE INDEX IF NOT EXISTS logistics_invoices_provider_number_unique ON logistics_invoices(provider_id,LOWER(supplier_invoice_number));
CREATE INDEX IF NOT EXISTS logistics_invoices_intervention_idx ON logistics_invoices(intervention_id,status,invoice_date DESC);

COMMENT ON COLUMN logistics_quotations.requested_by IS 'Référence logique vers la base centrale users.id';
COMMENT ON TABLE logistics_approval_rules IS 'Seuils optionnels configurables; aucune valeur financière métier n’est imposée par défaut.';
COMMENT ON TABLE logistics_approvals IS 'Journal d’approbation append-only avec séparation demandeur-décideur.';
