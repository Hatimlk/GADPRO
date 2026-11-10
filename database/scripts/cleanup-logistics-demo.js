import pg from 'pg';

const confirmation = process.env.LOGISTICS_DEMO_CLEANUP_TARGET;
const webOrigin = new URL(process.env.WEB_ORIGIN || 'http://localhost:3000');
const logisticsUrl = new URL(process.env.LOGISTICS_DATABASE_URL || '');

if (confirmation !== 'preprod.gadimat.pro' || webOrigin.hostname !== confirmation) {
  throw new Error('Nettoyage refusé : définir LOGISTICS_DEMO_CLEANUP_TARGET=preprod.gadimat.pro sur la préproduction.');
}
if (logisticsUrl.pathname.replace(/^\//, '') !== 'gadimat_logistique') {
  throw new Error('Nettoyage refusé : la base cible doit être gadimat_logistique.');
}

const pool = new pg.Pool({ connectionString: process.env.LOGISTICS_DATABASE_URL, max: 1 });
const client = await pool.connect();
const counts = [];
const remove = async (label, sql, params = []) => {
  const result = await client.query(sql, params);
  counts.push([label, result.rowCount]);
};

try {
  await client.query("SELECT pg_advisory_lock(hashtext('progad_cleanup_logistics_demo'))");
  const schema = await client.query("SELECT 1 FROM schema_migrations WHERE version='015'");
  if (!schema.rowCount) throw new Error('Schéma Logistique incomplet : exécuter les migrations jusqu’à 015.');

  await client.query('BEGIN');
  const oilSnapshotSql = `SELECT COUNT(*)::int AS count,
    md5(COALESCE(string_agg(to_jsonb(o)::text,'' ORDER BY o.id),'')) AS fingerprint
    FROM logistics_oil_change_tracking o`;
  const oilBefore = await client.query(oilSnapshotSql);

  // Ces vues temporaires ciblent uniquement les données reconnaissables de seed/démonstration.
  await client.query("CREATE TEMP TABLE demo_assets ON COMMIT DROP AS SELECT id FROM logistics_assets WHERE fleet_number LIKE 'DEMO-%'");
  await client.query("CREATE TEMP TABLE demo_drivers ON COMMIT DROP AS SELECT id FROM logistics_drivers WHERE employee_identifier LIKE 'DEMO-%'");
  await client.query("CREATE TEMP TABLE demo_providers ON COMMIT DROP AS SELECT id FROM logistics_service_providers WHERE supplier_code LIKE 'DEMO-%'");
  await client.query("CREATE TEMP TABLE demo_interventions ON COMMIT DROP AS SELECT id FROM logistics_maintenance_interventions WHERE reference LIKE 'DEMO-%' OR asset_id IN (SELECT id FROM demo_assets) OR provider_id IN (SELECT id FROM demo_providers)");
  await client.query("CREATE TEMP TABLE demo_fuel ON COMMIT DROP AS SELECT id FROM logistics_fuel_transactions WHERE receipt_reference LIKE 'DEMO-%' OR asset_id IN (SELECT id FROM demo_assets) OR driver_id IN (SELECT id FROM demo_drivers)");
  await client.query("CREATE TEMP TABLE demo_tires ON COMMIT DROP AS SELECT id FROM logistics_tires WHERE internal_id LIKE 'DEMO-%'");
  await client.query("CREATE TEMP TABLE demo_parts ON COMMIT DROP AS SELECT id FROM logistics_spare_parts WHERE sku LIKE 'DEMO-%'");
  await client.query("CREATE TEMP TABLE demo_quotations ON COMMIT DROP AS SELECT q.id FROM logistics_quotations q WHERE q.intervention_id IN (SELECT id FROM demo_interventions) OR q.provider_id IN (SELECT id FROM demo_providers) OR EXISTS (SELECT 1 FROM logistics_quotation_items qi WHERE qi.quotation_id=q.id AND qi.spare_part_id IN (SELECT id FROM demo_parts))");
  await client.query("CREATE TEMP TABLE demo_orders ON COMMIT DROP AS SELECT id FROM logistics_purchase_orders WHERE quotation_id IN (SELECT id FROM demo_quotations) OR intervention_id IN (SELECT id FROM demo_interventions) OR provider_id IN (SELECT id FROM demo_providers)");
  await client.query("CREATE TEMP TABLE demo_invoices ON COMMIT DROP AS SELECT id FROM logistics_invoices WHERE purchase_order_id IN (SELECT id FROM demo_orders) OR intervention_id IN (SELECT id FROM demo_interventions) OR provider_id IN (SELECT id FROM demo_providers)");
  await client.query("CREATE TEMP TABLE demo_due_events ON COMMIT DROP AS SELECT id FROM logistics_maintenance_due_events WHERE asset_id IN (SELECT id FROM demo_assets) OR intervention_id IN (SELECT id FROM demo_interventions)");

  await remove('notifications', `DELETE FROM logistics_notifications WHERE entity_id IN (
    SELECT id FROM demo_assets UNION SELECT id FROM demo_drivers UNION SELECT id FROM demo_providers
    UNION SELECT id FROM demo_interventions UNION SELECT id FROM demo_quotations
    UNION SELECT id FROM demo_orders UNION SELECT id FROM demo_invoices UNION SELECT id FROM demo_due_events
    UNION SELECT id FROM demo_fuel UNION SELECT id FROM demo_tires UNION SELECT id FROM demo_parts
  )`);
  await remove('documents', `DELETE FROM logistics_documents WHERE entity_id IN (
    SELECT id FROM demo_assets UNION SELECT id FROM demo_drivers UNION SELECT id FROM demo_providers
    UNION SELECT id FROM demo_interventions UNION SELECT id FROM demo_quotations UNION SELECT id FROM demo_invoices
  )`);
  await remove('alertes', `DELETE FROM logistics_alerts WHERE asset_id IN (SELECT id FROM demo_assets)
    OR due_event_id IN (SELECT id FROM demo_due_events)
    OR related_entity_id IN (SELECT id FROM demo_assets UNION SELECT id FROM demo_drivers UNION SELECT id FROM demo_providers UNION SELECT id FROM demo_interventions UNION SELECT id FROM demo_due_events UNION SELECT id FROM demo_quotations UNION SELECT id FROM demo_orders UNION SELECT id FROM demo_invoices UNION SELECT id FROM demo_fuel UNION SELECT id FROM demo_tires UNION SELECT id FROM demo_parts)`);

  await remove('approbations', `DELETE FROM logistics_approvals WHERE
    (entity_type='quotation' AND entity_id IN (SELECT id FROM demo_quotations)) OR
    (entity_type='purchase_order' AND entity_id IN (SELECT id FROM demo_orders)) OR
    (entity_type='invoice' AND entity_id IN (SELECT id FROM demo_invoices))`);
  await remove('factures', 'DELETE FROM logistics_invoices WHERE id IN (SELECT id FROM demo_invoices)');
  await remove('commandes', 'DELETE FROM logistics_purchase_orders WHERE id IN (SELECT id FROM demo_orders)');
  await remove('lignes de devis', 'DELETE FROM logistics_quotation_items WHERE quotation_id IN (SELECT id FROM demo_quotations) OR spare_part_id IN (SELECT id FROM demo_parts)');
  await remove('devis', 'DELETE FROM logistics_quotations WHERE id IN (SELECT id FROM demo_quotations)');

  await client.query('UPDATE logistics_stock_movements SET reverses_movement_id=NULL WHERE reverses_movement_id IN (SELECT id FROM logistics_stock_movements WHERE spare_part_id IN (SELECT id FROM demo_parts) OR intervention_id IN (SELECT id FROM demo_interventions) OR asset_id IN (SELECT id FROM demo_assets))');
  await remove('lignes de coût', 'DELETE FROM logistics_intervention_cost_lines WHERE intervention_id IN (SELECT id FROM demo_interventions) OR (source_type=\'stock_movement\' AND source_id IN (SELECT id FROM logistics_stock_movements WHERE spare_part_id IN (SELECT id FROM demo_parts) OR asset_id IN (SELECT id FROM demo_assets)))');
  await remove('mouvements de stock', 'DELETE FROM logistics_stock_movements WHERE spare_part_id IN (SELECT id FROM demo_parts) OR intervention_id IN (SELECT id FROM demo_interventions) OR asset_id IN (SELECT id FROM demo_assets)');
  await remove('compatibilités pièces', 'DELETE FROM logistics_spare_part_compatibility WHERE spare_part_id IN (SELECT id FROM demo_parts) OR asset_id IN (SELECT id FROM demo_assets)');
  await remove('pièces', 'DELETE FROM logistics_spare_parts WHERE id IN (SELECT id FROM demo_parts)');

  await remove('mouvements pneumatiques', 'DELETE FROM logistics_tire_movements WHERE tire_id IN (SELECT id FROM demo_tires) OR source_asset_id IN (SELECT id FROM demo_assets) OR target_asset_id IN (SELECT id FROM demo_assets) OR intervention_id IN (SELECT id FROM demo_interventions)');
  await remove('pneumatiques', 'DELETE FROM logistics_tires WHERE id IN (SELECT id FROM demo_tires)');
  await remove('anomalies carburant', 'DELETE FROM logistics_fuel_anomalies WHERE transaction_id IN (SELECT id FROM demo_fuel)');
  await remove('carburant', 'DELETE FROM logistics_fuel_transactions WHERE id IN (SELECT id FROM demo_fuel)');

  await remove('immobilisations', 'DELETE FROM logistics_asset_downtime_periods WHERE asset_id IN (SELECT id FROM demo_assets) OR intervention_id IN (SELECT id FROM demo_interventions)');
  await client.query('UPDATE logistics_maintenance_interventions SET maintenance_due_event_id=NULL WHERE id IN (SELECT id FROM demo_interventions) OR maintenance_due_event_id IN (SELECT id FROM demo_due_events)');
  await remove('échéances préventives', 'DELETE FROM logistics_maintenance_due_events WHERE id IN (SELECT id FROM demo_due_events)');
  await remove('actifs des plans', 'DELETE FROM logistics_maintenance_plan_assets WHERE asset_id IN (SELECT id FROM demo_assets)');
  await remove('historiques interventions', 'DELETE FROM logistics_intervention_status_history WHERE intervention_id IN (SELECT id FROM demo_interventions)');
  await remove('commentaires interventions', 'DELETE FROM logistics_intervention_comments WHERE intervention_id IN (SELECT id FROM demo_interventions)');
  await remove('interventions', 'DELETE FROM logistics_maintenance_interventions WHERE id IN (SELECT id FROM demo_interventions)');

  await remove('affectations', 'DELETE FROM logistics_driver_assignments WHERE asset_id IN (SELECT id FROM demo_assets) OR driver_id IN (SELECT id FROM demo_drivers)');
  await remove('catégories permis', 'DELETE FROM logistics_driver_license_categories WHERE driver_id IN (SELECT id FROM demo_drivers)');
  await remove('autorisations conducteurs', 'DELETE FROM logistics_driver_authorizations WHERE driver_id IN (SELECT id FROM demo_drivers)');
  await remove('relevés compteurs', 'DELETE FROM logistics_meter_readings WHERE asset_id IN (SELECT id FROM demo_assets)');
  await remove('conducteurs', 'DELETE FROM logistics_drivers WHERE id IN (SELECT id FROM demo_drivers)');
  await client.query("UPDATE logistics_tires SET status='stock',current_asset_id=NULL,current_position_id=NULL,updated_at=NOW() WHERE current_asset_id IN (SELECT id FROM demo_assets)");
  await remove('actifs', 'DELETE FROM logistics_assets WHERE id IN (SELECT id FROM demo_assets)');

  // Détache d’éventuelles vraies fiches des prestataires de démonstration avant leur retrait.
  await client.query('UPDATE logistics_fuel_stations SET provider_id=NULL WHERE provider_id IN (SELECT id FROM demo_providers)');
  await client.query('UPDATE logistics_tires SET provider_id=NULL WHERE provider_id IN (SELECT id FROM demo_providers)');
  await client.query('UPDATE logistics_spare_parts SET preferred_provider_id=NULL WHERE preferred_provider_id IN (SELECT id FROM demo_providers)');
  await remove('spécialités prestataires', 'DELETE FROM logistics_provider_specialties WHERE provider_id IN (SELECT id FROM demo_providers)');
  await remove('prestataires', 'DELETE FROM logistics_service_providers WHERE id IN (SELECT id FROM demo_providers)');

  const oilAfter = await client.query(oilSnapshotSql);
  if (JSON.stringify(oilAfter.rows[0]) !== JSON.stringify(oilBefore.rows[0])) {
    throw new Error('Contrôle de sécurité refusé : les données du Suivi des vidanges ont changé.');
  }

  await client.query('COMMIT');
  console.log('Nettoyage des données de démonstration terminé.');
  for (const [label,count] of counts) if (count) console.log(`${label}: ${count}`);
  console.log(`Suivi des vidanges conservé : ${oilAfter.rows[0].count} fiche(s).`);
} catch (error) {
  await client.query('ROLLBACK').catch(() => undefined);
  throw error;
} finally {
  await client.query("SELECT pg_advisory_unlock(hashtext('progad_cleanup_logistics_demo'))").catch(() => undefined);
  client.release();
  await pool.end();
}
