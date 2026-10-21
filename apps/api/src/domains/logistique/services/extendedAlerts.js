import { settingsMap } from './settings.js';

async function resolveMissing(client, actorUserId, alertType, existenceSql, extraValue) {
  await client.query(`UPDATE logistics_alerts al SET status='resolved',resolved_at=NOW(),resolved_by=$1,updated_at=NOW(),version=version+1
    WHERE al.alert_type=$2 AND al.status!='resolved' AND NOT EXISTS(${existenceSql})`, [actorUserId, alertType, extraValue]);
}

export async function synchronizeExtendedAlerts(client, actorUserId) {
  const configured = await client.query('SELECT key,value FROM logistics_module_settings');
  const settings = settingsMap(configured.rows);
  const documentDays = Number(settings['alerts.document_expiry_days'] ?? 30);
  const licenseDays = Number(settings['alerts.driver_license_expiry_days'] ?? 30);
  const summary = { documents: 0, driverLicenses: 0, lowStock: 0, fuelAnomalies: 0, pendingQuotations: 0 };

  const documents = await client.query(`INSERT INTO logistics_alerts(alert_type,asset_id,severity,title,message,deduplication_key,related_entity_type,related_entity_id,deadline)
    SELECT CASE d.category WHEN 'insurance' THEN 'insurance_expiry' WHEN 'technical_inspection' THEN 'technical_inspection_expiry' ELSE 'document_expiry' END,
      CASE WHEN d.entity_type='asset' THEN d.entity_id ELSE NULL END,CASE WHEN d.expires_at<CURRENT_DATE THEN 'critical' ELSE 'warning' END,
      CASE d.category WHEN 'insurance' THEN 'Assurance à renouveler' WHEN 'technical_inspection' THEN 'Visite technique à renouveler' ELSE 'Document à renouveler' END,
      d.original_name||' expire le '||TO_CHAR(d.expires_at,'DD/MM/YYYY'),'document-expiry:'||d.id,'document',d.id,d.expires_at
    FROM logistics_documents d WHERE d.deleted_at IS NULL AND d.expires_at IS NOT NULL AND d.expires_at<=CURRENT_DATE+$1::int
    ON CONFLICT(deduplication_key) DO UPDATE SET severity=EXCLUDED.severity,title=EXCLUDED.title,message=EXCLUDED.message,deadline=EXCLUDED.deadline,
      status=CASE WHEN logistics_alerts.status='resolved' THEN 'open' ELSE logistics_alerts.status END,
      resolved_at=CASE WHEN logistics_alerts.status='resolved' THEN NULL ELSE logistics_alerts.resolved_at END,
      resolved_by=CASE WHEN logistics_alerts.status='resolved' THEN NULL ELSE logistics_alerts.resolved_by END,updated_at=NOW()`, [documentDays]);
  summary.documents = documents.rowCount;
  for (const type of ['insurance_expiry', 'technical_inspection_expiry', 'document_expiry']) {
    await resolveMissing(client, actorUserId, type, `SELECT 1 FROM logistics_documents d WHERE d.id=al.related_entity_id AND d.deleted_at IS NULL AND d.expires_at IS NOT NULL AND d.expires_at<=CURRENT_DATE+$3::int`, documentDays);
  }

  const licenses = await client.query(`INSERT INTO logistics_alerts(alert_type,severity,title,message,deduplication_key,related_entity_type,related_entity_id,deadline)
    SELECT 'driver_license_expiry',CASE WHEN license_expiry_date<CURRENT_DATE THEN 'critical' ELSE 'warning' END,'Permis de conduire à renouveler',
      full_name||' · échéance '||TO_CHAR(license_expiry_date,'DD/MM/YYYY'),'driver-license-expiry:'||id,'driver',id,license_expiry_date
    FROM logistics_drivers WHERE active=true AND deleted_at IS NULL AND license_expiry_date IS NOT NULL AND license_expiry_date<=CURRENT_DATE+$1::int
    ON CONFLICT(deduplication_key) DO UPDATE SET severity=EXCLUDED.severity,message=EXCLUDED.message,deadline=EXCLUDED.deadline,
      status=CASE WHEN logistics_alerts.status='resolved' THEN 'open' ELSE logistics_alerts.status END,
      resolved_at=CASE WHEN logistics_alerts.status='resolved' THEN NULL ELSE logistics_alerts.resolved_at END,
      resolved_by=CASE WHEN logistics_alerts.status='resolved' THEN NULL ELSE logistics_alerts.resolved_by END,updated_at=NOW()`, [licenseDays]);
  summary.driverLicenses = licenses.rowCount;
  await resolveMissing(client, actorUserId, 'driver_license_expiry', `SELECT 1 FROM logistics_drivers d WHERE d.id=al.related_entity_id AND d.active=true AND d.deleted_at IS NULL AND d.license_expiry_date IS NOT NULL AND d.license_expiry_date<=CURRENT_DATE+$3::int`, licenseDays);

  const lowStockEnabled = settings['alerts.low_stock_enabled'] !== false;
  if (lowStockEnabled) {
    const stock = await client.query(`INSERT INTO logistics_alerts(alert_type,severity,title,message,deduplication_key,related_entity_type,related_entity_id)
      SELECT 'critical_stock',CASE WHEN quantity_on_hand<=0 THEN 'critical' ELSE 'warning' END,'Stock critique · '||sku,
        name||' : '||quantity_on_hand||' '||unit||' disponible(s), minimum '||minimum_quantity,'critical-stock:'||id,'spare_part',id
      FROM logistics_spare_parts WHERE status='active' AND deleted_at IS NULL AND quantity_on_hand<=minimum_quantity
      ON CONFLICT(deduplication_key) DO UPDATE SET severity=EXCLUDED.severity,title=EXCLUDED.title,message=EXCLUDED.message,
        status=CASE WHEN logistics_alerts.status='resolved' THEN 'open' ELSE logistics_alerts.status END,
        resolved_at=CASE WHEN logistics_alerts.status='resolved' THEN NULL ELSE logistics_alerts.resolved_at END,
        resolved_by=CASE WHEN logistics_alerts.status='resolved' THEN NULL ELSE logistics_alerts.resolved_by END,updated_at=NOW()`);
    summary.lowStock = stock.rowCount;
  }
  await resolveMissing(client, actorUserId, 'critical_stock', `SELECT 1 FROM logistics_spare_parts sp WHERE sp.id=al.related_entity_id AND sp.status='active' AND sp.deleted_at IS NULL AND sp.quantity_on_hand<=sp.minimum_quantity AND $3::boolean`, lowStockEnabled);

  const fuelEnabled = settings['alerts.fuel_anomaly_enabled'] !== false;
  if (fuelEnabled) {
    const fuel = await client.query(`INSERT INTO logistics_alerts(alert_type,asset_id,severity,title,message,deduplication_key,related_entity_type,related_entity_id)
      SELECT 'abnormal_fuel_consumption',ft.asset_id,fa.severity,'Anomalie carburant · '||a.fleet_number,fa.description,
        'fuel-anomaly:'||fa.id,'fuel_anomaly',fa.id FROM logistics_fuel_anomalies fa
      JOIN logistics_fuel_transactions ft ON ft.id=fa.transaction_id JOIN logistics_assets a ON a.id=ft.asset_id
      WHERE fa.status='open' AND a.deleted_at IS NULL
      ON CONFLICT(deduplication_key) DO UPDATE SET severity=EXCLUDED.severity,title=EXCLUDED.title,message=EXCLUDED.message,
        status=CASE WHEN logistics_alerts.status='resolved' THEN 'open' ELSE logistics_alerts.status END,
        resolved_at=CASE WHEN logistics_alerts.status='resolved' THEN NULL ELSE logistics_alerts.resolved_at END,
        resolved_by=CASE WHEN logistics_alerts.status='resolved' THEN NULL ELSE logistics_alerts.resolved_by END,updated_at=NOW()`);
    summary.fuelAnomalies = fuel.rowCount;
  }
  await resolveMissing(client, actorUserId, 'abnormal_fuel_consumption', `SELECT 1 FROM logistics_fuel_anomalies fa WHERE fa.id=al.related_entity_id AND fa.status='open' AND $3::boolean`, fuelEnabled);

  const quotationsEnabled = settings['alerts.pending_quotation_enabled'] !== false;
  if (quotationsEnabled) {
    const quotations = await client.query(`INSERT INTO logistics_alerts(alert_type,asset_id,severity,title,message,deduplication_key,related_entity_type,related_entity_id,deadline)
      SELECT 'pending_quotation_approval',i.asset_id,'warning','Devis à approuver · '||q.reference,p.company_name||' · '||q.total_amount||' DH',
        'pending-quotation:'||q.id,'quotation',q.id,q.validity_date FROM logistics_quotations q
      JOIN logistics_maintenance_interventions i ON i.id=q.intervention_id JOIN logistics_service_providers p ON p.id=q.provider_id
      WHERE q.status='pending_approval' AND i.deleted_at IS NULL
      ON CONFLICT(deduplication_key) DO UPDATE SET message=EXCLUDED.message,deadline=EXCLUDED.deadline,
        status=CASE WHEN logistics_alerts.status='resolved' THEN 'open' ELSE logistics_alerts.status END,
        resolved_at=CASE WHEN logistics_alerts.status='resolved' THEN NULL ELSE logistics_alerts.resolved_at END,
        resolved_by=CASE WHEN logistics_alerts.status='resolved' THEN NULL ELSE logistics_alerts.resolved_by END,updated_at=NOW()`);
    summary.pendingQuotations = quotations.rowCount;
  }
  await resolveMissing(client, actorUserId, 'pending_quotation_approval', `SELECT 1 FROM logistics_quotations q WHERE q.id=al.related_entity_id AND q.status='pending_approval' AND $3::boolean`, quotationsEnabled);
  return summary;
}
