const router = require('express').Router();
const db = require('../db');

const canManage = (req, res, next) => req.user?.role === 'Administrateur'
  ? next()
  : res.status(403).json({ error: 'Action réservée aux administrateurs.' });

const numberOrNull = value => {
  if (value === '' || value === null || value === undefined || value === '-') return null;
  const parsed = Number(String(value).replace(',', '.'));
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : NaN;
};

function normalize(body) {
  const year = Number(body.year);
  const month = Number(body.month);
  const branchId = body.branchId === null || body.branchId === '' ? null : Number(body.branchId);
  if (!Number.isInteger(year) || year < 2000 || year > 2100 || !Number.isInteger(month) || month < 1 || month > 12 || (branchId !== null && !Number.isInteger(branchId))) return null;
  const names = ['electricityAmount', 'electricityKwh', 'waterAmount', 'waterM3', 'telecomInternetFixedAmount', 'telecomMobileAmount'];
  const data = { year, month, branchId, notes: String(body.notes || '').trim().slice(0, 2000) || null };
  for (const name of names) {
    data[name] = numberOrNull(body[name]);
    if (Number.isNaN(data[name])) return null;
  }
  if (names.every(name => data[name] === null)) return null;
  return data;
}

const selectRecords = `SELECT cr.id, cr.branch_id AS "branchId", b.code AS "branchCode", b.name AS "branchName",
  cr.year, cr.month, cr.electricity_amount::float AS "electricityAmount",
  cr.electricity_kwh::float AS "electricityKwh", cr.water_amount::float AS "waterAmount",
  cr.water_m3::float AS "waterM3", cr.telecom_internet_fixed_amount::float AS "telecomInternetFixedAmount",
  cr.telecom_mobile_amount::float AS "telecomMobileAmount", cr.notes,
  cr.created_at AS "createdAt", cr.updated_at AS "updatedAt"
  FROM consumption_records cr LEFT JOIN consumption_branches b ON b.id=cr.branch_id`;

router.get('/branches', async (_req, res) => {
  try {
    const { rows } = await db.query('SELECT id, code, name, active FROM consumption_branches ORDER BY code');
    res.json(rows);
  } catch (error) { console.error(error); res.status(500).json({ error: 'Chargement des branches impossible.' }); }
});

router.post('/branches', canManage, async (req, res) => {
  const code = String(req.body.code || '').trim().toUpperCase().slice(0, 20);
  const name = String(req.body.name || code).trim().slice(0, 100);
  if (!code) return res.status(400).json({ error: 'Code branche requis.' });
  try {
    const { rows } = await db.query(`INSERT INTO consumption_branches(code,name) VALUES($1,$2)
      ON CONFLICT(code) DO UPDATE SET name=EXCLUDED.name, active=TRUE RETURNING id,code,name,active`, [code, name]);
    res.status(201).json(rows[0]);
  } catch (error) { console.error(error); res.status(500).json({ error: 'Création de la branche impossible.' }); }
});

router.get('/records', async (_req, res) => {
  try { const { rows } = await db.query(`${selectRecords} ORDER BY cr.year DESC, cr.month DESC, b.code NULLS FIRST`); res.json(rows); }
  catch (error) { console.error(error); res.status(500).json({ error: 'Chargement des consommations impossible.' }); }
});

router.get('/records/:id', async (req, res) => {
  try {
    const { rows } = await db.query(`${selectRecords} WHERE cr.id=$1`, [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Consommation introuvable.' });
    res.json(rows[0]);
  } catch (error) { res.status(500).json({ error: 'Chargement impossible.' }); }
});

router.post('/records', async (req, res) => {
  const data = normalize(req.body);
  if (!data) return res.status(400).json({ error: 'Données invalides ou aucun poste renseigné.' });
  try {
    const { rows } = await db.query(`INSERT INTO consumption_records(branch_id,year,month,electricity_amount,electricity_kwh,
      water_amount,water_m3,telecom_internet_fixed_amount,telecom_mobile_amount,notes,created_by)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id`,
      [data.branchId,data.year,data.month,data.electricityAmount,data.electricityKwh,data.waterAmount,data.waterM3,
        data.telecomInternetFixedAmount,data.telecomMobileAmount,data.notes,req.user.id]);
    const result = await db.query(`${selectRecords} WHERE cr.id=$1`, [rows[0].id]);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    if (error.code === '23505') return res.status(409).json({ error: 'Une consommation existe déjà pour cette branche et ce mois.' });
    console.error(error); res.status(500).json({ error: 'Enregistrement impossible.' });
  }
});

router.put('/records/:id', async (req, res) => {
  const data = normalize(req.body);
  if (!data) return res.status(400).json({ error: 'Données invalides ou aucun poste renseigné.' });
  try {
    await db.query(`UPDATE consumption_records SET branch_id=$1,year=$2,month=$3,electricity_amount=$4,electricity_kwh=$5,
      water_amount=$6,water_m3=$7,telecom_internet_fixed_amount=$8,telecom_mobile_amount=$9,notes=$10,updated_at=NOW() WHERE id=$11`,
      [data.branchId,data.year,data.month,data.electricityAmount,data.electricityKwh,data.waterAmount,data.waterM3,
        data.telecomInternetFixedAmount,data.telecomMobileAmount,data.notes,req.params.id]);
    const result = await db.query(`${selectRecords} WHERE cr.id=$1`, [req.params.id]);
    res.json(result.rows[0]);
  } catch (error) {
    if (error.code === '23505') return res.status(409).json({ error: 'Une consommation existe déjà pour cette branche et ce mois.' });
    console.error(error); res.status(500).json({ error: 'Modification impossible.' });
  }
});

router.delete('/records/:id', canManage, async (req, res) => {
  try { await db.query('DELETE FROM consumption_records WHERE id=$1', [req.params.id]); res.json({ success: true }); }
  catch (error) { console.error(error); res.status(500).json({ error: 'Suppression impossible.' }); }
});

router.post('/import', canManage, async (req, res) => {
  if (!Array.isArray(req.body.records) || req.body.records.length > 5000) return res.status(400).json({ error: 'Lot d’import invalide.' });
  const client = await db.connect();
  let imported = 0;
  try {
    await client.query('BEGIN');
    for (const item of req.body.records) {
      const code = String(item.branchCode || '').trim().toUpperCase();
      let branchId = null;
      if (code && code !== 'GLOBAL') {
        const branch = await client.query(`INSERT INTO consumption_branches(code,name) VALUES($1,$1)
          ON CONFLICT(code) DO UPDATE SET active=TRUE RETURNING id`, [code]);
        branchId = branch.rows[0].id;
      }
      const data = normalize({ ...item, branchId });
      if (!data) continue;
      await client.query(`INSERT INTO consumption_records(branch_id,year,month,electricity_amount,electricity_kwh,
        water_amount,water_m3,telecom_internet_fixed_amount,telecom_mobile_amount,notes,created_by)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
        ON CONFLICT ((COALESCE(branch_id,0)),year,month) DO UPDATE SET electricity_amount=EXCLUDED.electricity_amount,
        electricity_kwh=EXCLUDED.electricity_kwh,water_amount=EXCLUDED.water_amount,water_m3=EXCLUDED.water_m3,
        telecom_internet_fixed_amount=EXCLUDED.telecom_internet_fixed_amount,telecom_mobile_amount=EXCLUDED.telecom_mobile_amount,
        notes=EXCLUDED.notes,updated_at=NOW()`,
        [branchId,data.year,data.month,data.electricityAmount,data.electricityKwh,data.waterAmount,data.waterM3,
          data.telecomInternetFixedAmount,data.telecomMobileAmount,data.notes,req.user.id]);
      imported++;
    }
    await client.query('COMMIT'); res.json({ imported });
  } catch (error) { await client.query('ROLLBACK'); console.error(error); res.status(500).json({ error: 'Import impossible.' }); }
  finally { client.release(); }
});

module.exports = router;
