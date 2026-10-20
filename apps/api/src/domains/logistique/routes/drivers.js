import { Router } from 'express';
import { logisticsPool, logisticsQuery } from '../../../db.js';
import { requireLogisticsPermission } from '../middleware/authorization.js';
import { driverCreateSchema, driverListSchema, driverUpdateSchema, validateBody, validateQuery } from '../schemas/validation.js';
import { sendDatabaseError, writeAudit } from '../services/audit.js';

const router = Router();
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
router.param('id', (req, res, next, value) => UUID.test(value) ? next() : res.status(400).json({ error: 'Identifiant invalide.' }));

router.get('/', requireLogisticsPermission('drivers.read'), validateQuery(driverListSchema), async (req, res, next) => {
  try {
    const { page, limit, search, status } = req.validatedQuery;
    const params = [];
    const conditions = ['d.deleted_at IS NULL'];
    if (search) { params.push(`%${search}%`); conditions.push(`(d.full_name ILIKE $${params.length} OR d.employee_identifier ILIKE $${params.length})`); }
    if (status) { params.push(status); conditions.push(`d.employee_status=$${params.length}`); }
    const where = conditions.join(' AND ');
    const total = await logisticsQuery(`SELECT COUNT(*)::int AS count FROM logistics_drivers d WHERE ${where}`, params);
    params.push(limit, (page - 1) * limit);
    const rows = await logisticsQuery(`SELECT d.*,
      COUNT(da.id) FILTER (WHERE da.ends_at IS NULL)::int AS active_assignments
      FROM logistics_drivers d LEFT JOIN logistics_driver_assignments da ON da.driver_id=d.id
      WHERE ${where} GROUP BY d.id ORDER BY d.full_name LIMIT $${params.length - 1} OFFSET $${params.length}`, params);
    res.json({ data: rows.rows, page, limit, total: total.rows[0].count, totalPages: Math.ceil(total.rows[0].count / limit) });
  } catch (error) { next(error); }
});

router.post('/', requireLogisticsPermission('drivers.create'), validateBody(driverCreateSchema), async (req, res) => {
  const value = req.validated;
  const client = await logisticsPool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query(`INSERT INTO logistics_drivers(employee_identifier,full_name,employee_status,professional_phone,
      professional_email,license_expiry_date,notes,active,created_by,updated_by)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$9) RETURNING *`, [value.employeeIdentifier, value.fullName, value.employeeStatus,
      value.professionalPhone, value.professionalEmail, value.licenseExpiryDate, value.notes, value.employeeStatus === 'active', req.identity.id]);
    await writeAudit(client, req, 'driver.created', 'driver', result.rows[0].id, null, result.rows[0]);
    await client.query('COMMIT');
    res.status(201).json(result.rows[0]);
  } catch (error) { await client.query('ROLLBACK'); return sendDatabaseError(res, error); }
  finally { client.release(); }
});

router.get('/:id', requireLogisticsPermission('drivers.read'), async (req, res, next) => {
  try {
    const result = await logisticsQuery('SELECT * FROM logistics_drivers WHERE id=$1 AND deleted_at IS NULL', [req.params.id]);
    if (!result.rows[0]) return res.status(404).json({ error: 'Conducteur introuvable.' });
    const [licenses, assignments] = await Promise.all([
      logisticsQuery('SELECT * FROM logistics_driver_license_categories WHERE driver_id=$1 ORDER BY category', [req.params.id]),
      logisticsQuery(`SELECT da.*,a.fleet_number,a.registration_number FROM logistics_driver_assignments da
        JOIN logistics_assets a ON a.id=da.asset_id WHERE da.driver_id=$1 ORDER BY da.starts_at DESC`, [req.params.id]),
    ]);
    res.json({ ...result.rows[0], licenses: licenses.rows, assignments: assignments.rows });
  } catch (error) { next(error); }
});

router.patch('/:id', requireLogisticsPermission('drivers.update'), validateBody(driverUpdateSchema), async (req, res) => {
  const mapping = { employeeIdentifier: 'employee_identifier', fullName: 'full_name', employeeStatus: 'employee_status', professionalPhone: 'professional_phone', professionalEmail: 'professional_email', licenseExpiryDate: 'license_expiry_date', notes: 'notes' };
  const client = await logisticsPool.connect();
  try {
    await client.query('BEGIN');
    const before = await client.query('SELECT * FROM logistics_drivers WHERE id=$1 AND deleted_at IS NULL FOR UPDATE', [req.params.id]);
    if (!before.rows[0]) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Conducteur introuvable.' }); }
    const sets = [];
    const params = [];
    for (const [key, column] of Object.entries(mapping)) if (Object.hasOwn(req.validated, key)) { params.push(req.validated[key]); sets.push(`${column}=$${params.length}`); }
    if (Object.hasOwn(req.validated, 'employeeStatus')) { params.push(req.validated.employeeStatus === 'active'); sets.push(`active=$${params.length}`); }
    if (!sets.length) { await client.query('ROLLBACK'); return res.status(400).json({ error: 'Aucune modification fournie.' }); }
    params.push(req.identity.id, req.params.id, req.validated.version);
    const result = await client.query(`UPDATE logistics_drivers SET ${sets.join(',')},updated_by=$${params.length - 2},updated_at=NOW(),version=version+1
      WHERE id=$${params.length - 1} AND version=$${params.length} RETURNING *`, params);
    if (!result.rows[0]) { await client.query('ROLLBACK'); return res.status(409).json({ error: 'La fiche a été modifiée par un autre utilisateur.', code: 'VERSION_CONFLICT' }); }
    await writeAudit(client, req, 'driver.updated', 'driver', req.params.id, before.rows[0], result.rows[0]);
    await client.query('COMMIT');
    res.json(result.rows[0]);
  } catch (error) { await client.query('ROLLBACK'); return sendDatabaseError(res, error); }
  finally { client.release(); }
});

export default router;
