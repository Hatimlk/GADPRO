import { Router } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { centralQuery } from '../db.js';
import { clearAuthCookies, hashToken, newCsrfToken, setAuthCookies, signAccess, signRefresh, verifyRefresh } from '../security.js';
import { authenticate } from '../middleware/auth.js';
import { config } from '../config.js';

const router = Router();
const normalizeEmail = (email) => String(email || '').trim().toLowerCase();

async function loadAccesses(userId) {
  const { rows } = await centralQuery(
    `SELECT ma.module_code AS module,ma.role,ma.permissions,ma.data_scope AS "dataScope",li.legacy_user_id AS "legacyUserId"
     FROM module_access ma LEFT JOIN legacy_identities li ON li.central_user_id=ma.user_id
       AND li.source=CASE WHEN ma.module_code='consommations' THEN 'cheques' ELSE ma.module_code END
     WHERE ma.user_id=$1 AND ma.active=true ORDER BY ma.module_code`, [userId]
  );
  return rows;
}
async function publicUser(user) {
  return { id: user.id, name: user.name, nom: user.name, email: user.email, active: user.active, platformAdmin: user.platform_admin, accesses: await loadAccesses(user.id) };
}
async function createSession(req, res, user, rotatedFrom = null) {
  const sessionId = crypto.randomUUID();
  const refresh = signRefresh(user.id, sessionId);
  await centralQuery(
    `INSERT INTO sessions(id,user_id,refresh_token_hash,user_agent,ip_address,expires_at,rotated_from)
     VALUES($1,$2,$3,$4,$5,NOW()+($6 || ' days')::interval,$7)`,
    [sessionId, user.id, hashToken(refresh), req.get('user-agent') || null, req.ip, config.refreshDays, rotatedFrom]
  );
  const csrf = newCsrfToken();
  setAuthCookies(res, signAccess(user, sessionId), refresh, csrf);
  return csrf;
}

router.get('/csrf', (_req, res) => {
  const csrf = newCsrfToken();
  res.cookie('gadimat_csrf', csrf, { secure: config.secureCookies, sameSite: 'lax', path: '/', httpOnly: false });
  res.json({ csrfToken: csrf });
});

router.post('/login', async (req, res) => {
  const email = normalizeEmail(req.body.email);
  const { rows } = await centralQuery('SELECT * FROM users WHERE email_normalized=$1', [email]);
  const user = rows[0];
  if (!user || !await bcrypt.compare(String(req.body.password || ''), user.password_hash)) {
    return res.status(401).json({ error: 'Email ou mot de passe incorrect.' });
  }
  if (!user.active) return res.status(403).json({ error: 'Ce compte est désactivé.' });
  await createSession(req, res, user);
  await centralQuery('INSERT INTO audit_logs(user_id,event,ip_address) VALUES($1,$2,$3)', [user.id, 'login', req.ip]);
  res.json({ user: await publicUser(user) });
});

router.post('/refresh', async (req, res) => {
  try {
    const token = req.cookies.gadimat_refresh;
    const decoded = verifyRefresh(token || '');
    const consumed = await centralQuery(
      `UPDATE sessions SET revoked_at=NOW() WHERE id=$1 AND user_id=$2 AND refresh_token_hash=$3
       AND revoked_at IS NULL AND expires_at>NOW() RETURNING id`,
      [decoded.sid, decoded.sub, hashToken(token)]
    );
    if (!consumed.rowCount) return res.status(401).json({ error: 'Session expirée.' });
    const users = await centralQuery('SELECT * FROM users WHERE id=$1 AND active=true', [decoded.sub]);
    if (!users.rowCount) return res.status(401).json({ error: 'Compte désactivé.' });
    await createSession(req, res, users.rows[0], decoded.sid);
    res.json({ user: await publicUser(users.rows[0]) });
  } catch {
    clearAuthCookies(res);
    res.status(401).json({ error: 'Session expirée.' });
  }
});

router.post('/logout', authenticate, async (req, res) => {
  await centralQuery('UPDATE sessions SET revoked_at=NOW() WHERE id=$1 AND user_id=$2', [req.sessionId, req.identity.id]);
  clearAuthCookies(res);
  res.status(204).end();
});

router.get('/me', authenticate, async (req, res) => res.json(await publicUser(req.identity)));

export default router;
