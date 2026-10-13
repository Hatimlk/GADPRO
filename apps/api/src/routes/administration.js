import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { centralPool, centralQuery } from '../db.js';
import chequesDb from '../domains/cheques/db.js';
import impayesDb from '../domains/impayes/config/db.js';
import { authenticate, requirePlatformAdmin } from '../middleware/auth.js';

const router = Router();
router.use(authenticate, requirePlatformAdmin);

const MODULE_ROLES = {
  cheques: ['Administrateur', 'Utilisateur'],
  impayes: ['admin', 'responsable_recouvrement', 'commercial', 'lecture_seule'],
  consommations: ['Administrateur', 'Utilisateur'],
};
const MODULES = Object.keys(MODULE_ROLES);
const identitySource = (module) => module === 'consommations' ? 'cheques' : module;
const permissionsForRole = (module, role) => {
  if ((module === 'cheques' || module === 'consommations') && role === 'Administrateur') return ['read', 'write', 'admin', '*'];
  if (module === 'impayes' && role === 'admin') return ['read', 'write', 'admin', '*'];
  if (module === 'impayes' && role === 'lecture_seule') return ['read'];
  return ['read', 'write'];
};
const cleanEmail = (value) => String(value || '').trim().toLowerCase();

function validateAccess(access) {
  if (!MODULES.includes(access?.module) || !MODULE_ROLES[access.module].includes(access?.role)) return null;
  const legacyUserId = String(access.legacyUserId || '').trim();
  if (!legacyUserId) return null;
  return {
    module: access.module,
    role: access.role,
    permissions: permissionsForRole(access.module, access.role),
    dataScope: access.module === 'impayes' && access.role === 'commercial' ? { own: true } : {},
    legacyUserId,
  };
}

async function saveAccess(client, userId, access) {
  await client.query(
    `INSERT INTO module_access(user_id,module_code,role,permissions,data_scope,active)
     VALUES($1,$2,$3,$4,$5,true)
     ON CONFLICT(user_id,module_code) DO UPDATE SET role=EXCLUDED.role,permissions=EXCLUDED.permissions,
       data_scope=EXCLUDED.data_scope,active=true`,
    [userId, access.module, access.role, JSON.stringify(access.permissions), JSON.stringify(access.dataScope)],
  );
  await client.query(
    `INSERT INTO legacy_identities(central_user_id,source,legacy_user_id)
     VALUES($1,$2,$3)
     ON CONFLICT(central_user_id,source) DO UPDATE SET legacy_user_id=EXCLUDED.legacy_user_id`,
    [userId, identitySource(access.module), access.legacyUserId],
  );
}

router.get('/users', async (_req, res) => {
  const { rows } = await centralQuery(`
    SELECT u.id,u.name,u.email,u.active,u.platform_admin AS "platformAdmin",
      COALESCE((SELECT json_agg(json_build_object(
        'module',ma.module_code,'role',ma.role,'permissions',ma.permissions,'dataScope',ma.data_scope,
        'legacyUserId',li.legacy_user_id) ORDER BY ma.module_code)
        FROM module_access ma
        LEFT JOIN legacy_identities li ON li.central_user_id=ma.user_id
          AND li.source=CASE WHEN ma.module_code='consommations' THEN 'cheques' ELSE ma.module_code END
        WHERE ma.user_id=u.id AND ma.active=true),'[]') AS accesses
    FROM users u ORDER BY u.name`);
  res.json(rows);
});

router.get('/legacy-identities', async (_req, res) => {
  const [cheques, impayes] = await Promise.all([
    chequesDb.query('SELECT id,name,email,role,status FROM users ORDER BY name'),
    impayesDb.query('SELECT id,nom AS name,email,role,actif AS active FROM users ORDER BY nom'),
  ]);
  res.json({
    cheques: cheques.rows.map((user) => ({ ...user, id: String(user.id), active: user.status === 'Actif' })),
    impayes: impayes.rows.map((user) => ({ ...user, id: String(user.id) })),
  });
});

router.post('/users', async (req, res) => {
  const { name, password, active = true, platformAdmin = false } = req.body;
  const email = cleanEmail(req.body.email);
  const accesses = (Array.isArray(req.body.accesses) ? req.body.accesses : []).map(validateAccess);
  if (!String(name || '').trim() || !email || !password || password.length < 12) {
    return res.status(400).json({ error: 'Nom, e-mail et mot de passe (12 caractères minimum) requis.' });
  }
  if (accesses.some((access) => !access)) return res.status(400).json({ error: 'Module, rôle ou identifiant historique invalide.' });
  const sources = new Map();
  for (const access of accesses) {
    const source = identitySource(access.module);
    if (sources.has(source) && sources.get(source) !== access.legacyUserId) {
      return res.status(400).json({ error: 'Chèques et Consommations doivent utiliser le même identifiant historique Chèques.' });
    }
    sources.set(source, access.legacyUserId);
  }
  const client = await centralPool.connect();
  try {
    await client.query('BEGIN');
    const hash = await bcrypt.hash(password, 12);
    const result = await client.query(
      `INSERT INTO users(name,email,email_normalized,password_hash,active,platform_admin)
       VALUES($1,$2,$3,$4,$5,$6)
       RETURNING id,name,email,active,platform_admin AS "platformAdmin"`,
      [String(name).trim(), email, email, hash, Boolean(active), Boolean(platformAdmin)],
    );
    for (const access of accesses) await saveAccess(client, result.rows[0].id, access);
    await client.query('COMMIT');
    res.status(201).json(result.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    const conflict = error.code === '23505';
    res.status(conflict ? 409 : 500).json({ error: conflict ? 'E-mail ou correspondance historique déjà utilisée.' : 'Erreur serveur.' });
  } finally {
    client.release();
  }
});

router.put('/users/:id', async (req, res) => {
  const name = String(req.body.name || '').trim();
  const email = cleanEmail(req.body.email);
  if (!name || !email) return res.status(400).json({ error: 'Nom et e-mail requis.' });
  try {
    const { rows } = await centralQuery(
      `UPDATE users SET name=$2,email=$3,email_normalized=$3,platform_admin=$4,updated_at=NOW()
       WHERE id=$1 RETURNING id,name,email,active,platform_admin AS "platformAdmin"`,
      [req.params.id, name, email, Boolean(req.body.platformAdmin)],
    );
    if (!rows[0]) return res.status(404).json({ error: 'Utilisateur introuvable.' });
    res.json(rows[0]);
  } catch (error) {
    res.status(error.code === '23505' ? 409 : 500).json({ error: error.code === '23505' ? 'Adresse e-mail déjà utilisée.' : 'Erreur serveur.' });
  }
});

router.put('/users/:id/access/:module', async (req, res) => {
  const access = validateAccess({ ...req.body, module: req.params.module });
  if (!access) return res.status(400).json({ error: 'Module, rôle ou identifiant historique invalide.' });
  const client = await centralPool.connect();
  try {
    await client.query('BEGIN');
    const exists = await client.query('SELECT 1 FROM users WHERE id=$1', [req.params.id]);
    if (!exists.rowCount) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Utilisateur introuvable.' }); }
    await saveAccess(client, req.params.id, access);
    await client.query('COMMIT');
    res.status(204).end();
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(error.code === '23505' ? 409 : 500).json({ error: error.code === '23505' ? 'Cet identifiant historique est déjà lié à un autre compte.' : 'Erreur serveur.' });
  } finally { client.release(); }
});

router.delete('/users/:id/access/:module', async (req, res) => {
  if (!MODULES.includes(req.params.module)) return res.status(400).json({ error: 'Module invalide.' });
  const source = identitySource(req.params.module);
  const client = await centralPool.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM module_access WHERE user_id=$1 AND module_code=$2', [req.params.id, req.params.module]);
    const stillUsed = source === 'cheques'
      ? await client.query(`SELECT 1 FROM module_access WHERE user_id=$1 AND module_code IN ('cheques','consommations') AND active=true`, [req.params.id])
      : await client.query(`SELECT 1 FROM module_access WHERE user_id=$1 AND module_code='impayes' AND active=true`, [req.params.id]);
    if (!stillUsed.rowCount) await client.query('DELETE FROM legacy_identities WHERE central_user_id=$1 AND source=$2', [req.params.id, source]);
    await client.query('UPDATE users SET session_version=session_version+1,updated_at=NOW() WHERE id=$1', [req.params.id]);
    await client.query('COMMIT');
    res.status(204).end();
  } catch {
    await client.query('ROLLBACK');
    res.status(500).json({ error: 'Suppression de l\'accès impossible.' });
  } finally { client.release(); }
});

router.patch('/users/:id/status', async (req, res) => {
  if (req.params.id === req.identity.id && req.body.active === false) return res.status(400).json({ error: 'Vous ne pouvez pas désactiver votre propre compte.' });
  const { rows } = await centralQuery(
    'UPDATE users SET active=$2,session_version=session_version+1,updated_at=NOW() WHERE id=$1 RETURNING id,active',
    [req.params.id, Boolean(req.body.active)],
  );
  if (!rows[0]) return res.status(404).json({ error: 'Utilisateur introuvable.' });
  res.json(rows[0]);
});

export default router;
