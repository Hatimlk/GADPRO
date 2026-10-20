import { Router } from 'express';
import { logisticsPool, logisticsQuery } from '../../../db.js';
import { requireLogisticsPermission, appendAssetScope, isSiteAllowed } from '../middleware/authorization.js';
import { assetCreateSchema, assetListSchema, assetUpdateSchema, meterReadingSchema, validateBody, validateQuery } from '../schemas/validation.js';
import { sendDatabaseError, writeAudit } from '../services/audit.js';
import { validateMeterProgression } from '../services/meters.js';

const router = Router();
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
router.param('id', (req, res, next, value) => UUID.test(value) ? next() : res.status(400).json({ error: 'Identifiant invalide.' }));

const selectAsset = `SELECT a.*, c.name AS category_name,c.meter_type,s.code AS site_code,s.name AS site_name,
  d.code AS department_code,d.name AS department_name,
  da.driver_id AS primary_driver_id,dr.full_name AS primary_driver_name
  FROM logistics_assets a
  JOIN logistics_asset_categories c ON c.id=a.category_id
  JOIN logistics_sites s ON s.id=a.site_id
  LEFT JOIN logistics_departments d ON d.id=a.department_id
  LEFT JOIN logistics_driver_assignments da ON da.asset_id=a.id AND da.is_primary=true AND da.ends_at IS NULL
  LEFT JOIN logistics_drivers dr ON dr.id=da.driver_id`;

router.get('/', requireLogisticsPermission('assets.read'), validateQuery(assetListSchema), async (req, res, next) => {
  try {
    const { page, limit, search, status, categoryId, siteId, assetGroup } = req.validatedQuery;
    const params = [];
    const conditions = ['a.deleted_at IS NULL'];
    appendAssetScope(req, conditions, params);
    if (search) { params.push(`%${search}%`); conditions.push(`(a.fleet_number ILIKE $${params.length} OR a.registration_number ILIKE $${params.length} OR a.brand ILIKE $${params.length} OR a.model ILIKE $${params.length})`); }
    if (status) { params.push(status); conditions.push(`a.status=$${params.length}`); }
    if (categoryId) { params.push(categoryId); conditions.push(`a.category_id=$${params.length}`); }
    if (siteId) { params.push(siteId); conditions.push(`a.site_id=$${params.length}`); }
    if (assetGroup) {
      const codes = assetGroup === 'vehicles' ? ['truck', 'light_commercial', 'passenger_vehicle'] : ['forklift', 'handling_equipment', 'trailer', 'other'];
      params.push(codes); conditions.push(`a.category_id IN (SELECT id FROM logistics_asset_categories WHERE code=ANY($${params.length}::text[]))`);
    }
    const where = conditions.join(' AND ');
    const total = await logisticsQuery(`SELECT COUNT(*)::int AS count FROM logistics_assets a WHERE ${where}`, params);
    params.push(limit, (page - 1) * limit);
    const rows = await logisticsQuery(`${selectAsset} WHERE ${where} ORDER BY a.fleet_number LIMIT $${params.length - 1} OFFSET $${params.length}`, params);
    res.json({ data: rows.rows, page, limit, total: total.rows[0].count, totalPages: Math.ceil(total.rows[0].count / limit) });
  } catch (error) { next(error); }
});

router.post('/', requireLogisticsPermission('assets.create'), validateBody(assetCreateSchema), async (req, res) => {
  const value = req.validated;
  if (!isSiteAllowed(req, value.siteId, value.departmentId)) return res.status(403).json({ error: 'Site ou service hors de votre périmètre.' });
  const client = await logisticsPool.connect();
  try {
    await client.query('BEGIN');
    const references = await client.query(`SELECT
      EXISTS(SELECT 1 FROM logistics_sites WHERE id=$1 AND active=true AND deleted_at IS NULL) AS site_ok,
      EXISTS(SELECT 1 FROM logistics_asset_categories WHERE id=$2 AND active=true AND deleted_at IS NULL) AS category_ok,
      ($3::uuid IS NULL OR EXISTS(SELECT 1 FROM logistics_departments WHERE id=$3 AND active=true AND deleted_at IS NULL)) AS department_ok`,
      [value.siteId, value.categoryId, value.departmentId]);
    if (!references.rows[0].site_ok || !references.rows[0].category_ok || !references.rows[0].department_ok) {
      await client.query('ROLLBACK'); return res.status(400).json({ error: 'Site, catégorie ou service inactif/introuvable.' });
    }
    const result = await client.query(
      `INSERT INTO logistics_assets(fleet_number,registration_number,category_id,brand,model,serial_number,vin,manufacture_year,
       acquisition_date,purchase_cost,site_id,department_id,current_mileage,current_operating_hours,fuel_type,status,notes,created_by,updated_by)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$18) RETURNING *`,
      [value.fleetNumber, value.registrationNumber, value.categoryId, value.brand, value.model, value.serialNumber, value.vin,
        value.manufactureYear, value.acquisitionDate, value.purchaseCost, value.siteId, value.departmentId, value.currentMileage,
        value.currentOperatingHours, value.fuelType, value.status, value.notes, req.identity.id],
    );
    const asset = result.rows[0];
    for (const [meterType, reading] of [['odometer', value.currentMileage], ['hours', value.currentOperatingHours]]) {
      if (reading > 0) await client.query(
        `INSERT INTO logistics_meter_readings(asset_id,meter_type,reading,recorded_at,source,created_by)
         VALUES($1,$2,$3,NOW(),'manual',$4)`, [asset.id, meterType, reading, req.identity.id],
      );
    }
    await writeAudit(client, req, 'asset.created', 'asset', asset.id, null, asset);
    await client.query('COMMIT');
    res.status(201).json(asset);
  } catch (error) { await client.query('ROLLBACK'); return sendDatabaseError(res, error); }
  finally { client.release(); }
});

router.get('/:id', requireLogisticsPermission('assets.read'), async (req, res, next) => {
  try {
    const params = [req.params.id];
    const conditions = ['a.id=$1', 'a.deleted_at IS NULL'];
    appendAssetScope(req, conditions, params);
    const asset = await logisticsQuery(`${selectAsset} WHERE ${conditions.join(' AND ')}`, params);
    if (!asset.rows[0]) return res.status(404).json({ error: 'Actif introuvable.' });
    const [meters, assignments] = await Promise.all([
      logisticsQuery('SELECT * FROM logistics_meter_readings WHERE asset_id=$1 ORDER BY recorded_at DESC LIMIT 50', [req.params.id]),
      logisticsQuery(`SELECT da.*,d.full_name,d.employee_identifier FROM logistics_driver_assignments da
        JOIN logistics_drivers d ON d.id=da.driver_id WHERE da.asset_id=$1 ORDER BY da.starts_at DESC`, [req.params.id]),
    ]);
    res.json({ ...asset.rows[0], meterReadings: meters.rows, driverAssignments: assignments.rows });
  } catch (error) { next(error); }
});

router.patch('/:id', requireLogisticsPermission('assets.update'), validateBody(assetUpdateSchema), async (req, res) => {
  const mapping = {
    fleetNumber: 'fleet_number', registrationNumber: 'registration_number', categoryId: 'category_id', brand: 'brand', model: 'model',
    serialNumber: 'serial_number', vin: 'vin', manufactureYear: 'manufacture_year', acquisitionDate: 'acquisition_date', purchaseCost: 'purchase_cost',
    siteId: 'site_id', departmentId: 'department_id', fuelType: 'fuel_type', status: 'status', notes: 'notes',
  };
  const client = await logisticsPool.connect();
  try {
    await client.query('BEGIN');
    const scopeParams = [req.params.id];
    const scopeConditions = ['a.id=$1', 'a.deleted_at IS NULL'];
    appendAssetScope(req, scopeConditions, scopeParams);
    const before = await client.query(`SELECT a.* FROM logistics_assets a WHERE ${scopeConditions.join(' AND ')} FOR UPDATE`, scopeParams);
    if (!before.rows[0]) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Actif introuvable.' }); }
    const targetSite = req.validated.siteId ?? before.rows[0].site_id;
    const targetDepartment = Object.hasOwn(req.validated, 'departmentId') ? req.validated.departmentId : before.rows[0].department_id;
    if (!isSiteAllowed(req, targetSite, targetDepartment)) { await client.query('ROLLBACK'); return res.status(403).json({ error: 'Site ou service hors de votre périmètre.' }); }
    const targetCategory = req.validated.categoryId ?? before.rows[0].category_id;
    const references = await client.query(`SELECT
      EXISTS(SELECT 1 FROM logistics_sites WHERE id=$1 AND active=true AND deleted_at IS NULL) AS site_ok,
      EXISTS(SELECT 1 FROM logistics_asset_categories WHERE id=$2 AND active=true AND deleted_at IS NULL) AS category_ok,
      ($3::uuid IS NULL OR EXISTS(SELECT 1 FROM logistics_departments WHERE id=$3 AND active=true AND deleted_at IS NULL)) AS department_ok`,
      [targetSite, targetCategory, targetDepartment]);
    if (!references.rows[0].site_ok || !references.rows[0].category_ok || !references.rows[0].department_ok) {
      await client.query('ROLLBACK'); return res.status(400).json({ error: 'Site, catégorie ou service inactif/introuvable.' });
    }
    const sets = [];
    const params = [];
    for (const [key, column] of Object.entries(mapping)) if (Object.hasOwn(req.validated, key)) { params.push(req.validated[key]); sets.push(`${column}=$${params.length}`); }
    if (!sets.length) { await client.query('ROLLBACK'); return res.status(400).json({ error: 'Aucune modification fournie.' }); }
    params.push(req.identity.id, req.params.id, req.validated.version);
    const result = await client.query(`UPDATE logistics_assets SET ${sets.join(',')},updated_by=$${params.length - 2},updated_at=NOW(),version=version+1
      WHERE id=$${params.length - 1} AND version=$${params.length} RETURNING *`, params);
    if (!result.rows[0]) { await client.query('ROLLBACK'); return res.status(409).json({ error: 'La fiche a été modifiée par un autre utilisateur.', code: 'VERSION_CONFLICT' }); }
    await writeAudit(client, req, 'asset.updated', 'asset', req.params.id, before.rows[0], result.rows[0]);
    await client.query('COMMIT');
    res.json(result.rows[0]);
  } catch (error) { await client.query('ROLLBACK'); return sendDatabaseError(res, error); }
  finally { client.release(); }
});

router.post('/:id/meters', requireLogisticsPermission('meters.create'), validateBody(meterReadingSchema), async (req, res) => {
  const { meterType, reading, recordedAt, correctionReason } = req.validated;
  const client = await logisticsPool.connect();
  try {
    await client.query('BEGIN');
    const params = [req.params.id];
    const conditions = ['a.id=$1', 'a.deleted_at IS NULL'];
    appendAssetScope(req, conditions, params);
    const current = await client.query(`SELECT a.* FROM logistics_assets a WHERE ${conditions.join(' AND ')} FOR UPDATE`, params);
    if (!current.rows[0]) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Actif introuvable.' }); }
    const currentValue = Number(meterType === 'odometer' ? current.rows[0].current_mileage : current.rows[0].current_operating_hours);
    const canCorrect = req.moduleAccess.permissions.includes('*') || req.moduleAccess.permissions.includes('meters.correct');
    const progression = validateMeterProgression({ currentValue, reading, correctionReason, canCorrect });
    if (!progression.allowed) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'Un compteur ne peut pas diminuer sans droit de correction et justification.', code: 'METER_DECREASE' });
    }
    const inserted = await client.query(`INSERT INTO logistics_meter_readings(asset_id,meter_type,reading,recorded_at,source,correction_reason,created_by)
      VALUES($1,$2,$3,$4,'manual',$5,$6) RETURNING *`, [req.params.id, meterType, reading, recordedAt, correctionReason, req.identity.id]);
    const column = meterType === 'odometer' ? 'current_mileage' : 'current_operating_hours';
    await client.query(`UPDATE logistics_assets SET ${column}=$1,updated_at=NOW(),updated_by=$2,version=version+1 WHERE id=$3`, [reading, req.identity.id, req.params.id]);
    await writeAudit(client, req, 'meter.recorded', 'asset', req.params.id, { [meterType]: currentValue }, { [meterType]: reading }, { meterReadingId: inserted.rows[0].id });
    await client.query('COMMIT');
    res.status(201).json(inserted.rows[0]);
  } catch (error) { await client.query('ROLLBACK'); return sendDatabaseError(res, error); }
  finally { client.release(); }
});

export default router;
