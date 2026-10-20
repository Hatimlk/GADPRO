import { Router } from 'express';
import { logisticsPool, logisticsQuery } from '../../../db.js';
import { appendAssetScope, requireLogisticsPermission } from '../middleware/authorization.js';
import { assignmentCreateSchema, assignmentEndSchema, validateBody } from '../schemas/validation.js';
import { sendDatabaseError, writeAudit } from '../services/audit.js';

const router = Router();
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
router.param('id', (req, res, next, value) => UUID.test(value) ? next() : res.status(400).json({ error: 'Identifiant invalide.' }));

router.get('/', requireLogisticsPermission('assets.read'), async (req, res, next) => {
  try {
    const params = [];
    const conditions = ['a.deleted_at IS NULL', 'd.deleted_at IS NULL'];
    appendAssetScope(req, conditions, params);
    const result = await logisticsQuery(`SELECT da.*,a.fleet_number,a.registration_number,d.full_name,d.employee_identifier
      FROM logistics_driver_assignments da JOIN logistics_assets a ON a.id=da.asset_id JOIN logistics_drivers d ON d.id=da.driver_id
      WHERE ${conditions.join(' AND ')} ORDER BY (da.ends_at IS NULL) DESC,da.starts_at DESC LIMIT 200`, params);
    res.json({ data: result.rows });
  } catch (error) { next(error); }
});

router.post('/', requireLogisticsPermission('assignments.create'), validateBody(assignmentCreateSchema), async (req, res) => {
  const value = req.validated;
  const client = await logisticsPool.connect();
  try {
    await client.query('BEGIN');
    const params = [value.assetId];
    const conditions = ['a.id=$1', 'a.deleted_at IS NULL'];
    appendAssetScope(req, conditions, params);
    const asset = await client.query(`SELECT a.* FROM logistics_assets a WHERE ${conditions.join(' AND ')} FOR UPDATE`, params);
    if (!asset.rows[0]) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Actif introuvable dans votre périmètre.' }); }
    const driver = await client.query('SELECT * FROM logistics_drivers WHERE id=$1 AND active=true AND deleted_at IS NULL', [value.driverId]);
    if (!driver.rows[0]) { await client.query('ROLLBACK'); return res.status(400).json({ error: 'Conducteur indisponible.' }); }
    if (driver.rows[0].license_expiry_date && String(driver.rows[0].license_expiry_date).slice(0, 10) < value.startsAt.slice(0, 10)) {
      await client.query('ROLLBACK'); return res.status(409).json({ error: 'Le permis du conducteur est expiré à la date d’affectation.', code: 'LICENSE_EXPIRED' });
    }
    const result = await client.query(`INSERT INTO logistics_driver_assignments(driver_id,asset_id,starts_at,is_primary,reason,created_by)
      VALUES($1,$2,$3,$4,$5,$6) RETURNING *`, [value.driverId, value.assetId, value.startsAt, value.isPrimary, value.reason, req.identity.id]);
    await writeAudit(client, req, 'assignment.created', 'driver_assignment', result.rows[0].id, null, result.rows[0]);
    await client.query('COMMIT');
    res.status(201).json(result.rows[0]);
  } catch (error) { await client.query('ROLLBACK'); return sendDatabaseError(res, error); }
  finally { client.release(); }
});

router.patch('/:id/end', requireLogisticsPermission('assignments.update'), validateBody(assignmentEndSchema), async (req, res) => {
  const client = await logisticsPool.connect();
  try {
    await client.query('BEGIN');
    const params = [req.params.id];
    const conditions = ['da.id=$1', 'da.ends_at IS NULL'];
    appendAssetScope(req, conditions, params);
    const before = await client.query(`SELECT da.* FROM logistics_driver_assignments da JOIN logistics_assets a ON a.id=da.asset_id
      WHERE ${conditions.join(' AND ')} FOR UPDATE OF da`, params);
    if (!before.rows[0]) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Affectation active introuvable.' }); }
    if (new Date(req.validated.endsAt) < new Date(before.rows[0].starts_at)) { await client.query('ROLLBACK'); return res.status(400).json({ error: 'La fin précède le début.' }); }
    const result = await client.query('UPDATE logistics_driver_assignments SET ends_at=$1,ended_by=$2 WHERE id=$3 RETURNING *', [req.validated.endsAt, req.identity.id, req.params.id]);
    await writeAudit(client, req, 'assignment.ended', 'driver_assignment', req.params.id, before.rows[0], result.rows[0]);
    await client.query('COMMIT');
    res.json(result.rows[0]);
  } catch (error) { await client.query('ROLLBACK'); return sendDatabaseError(res, error); }
  finally { client.release(); }
});

export default router;
