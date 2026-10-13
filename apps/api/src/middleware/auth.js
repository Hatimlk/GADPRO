import { centralQuery } from '../db.js';
import { verifyAccess } from '../security.js';
import crypto from 'node:crypto';

export async function authenticate(req, res, next) {
  try {
    const bearer = req.get('authorization')?.startsWith('Bearer ') ? req.get('authorization').slice(7) : null;
    const decoded = verifyAccess(req.cookies.gadimat_access || bearer || '');
    const result = await centralQuery(
      `SELECT u.id,u.name,u.email,u.active,u.platform_admin,u.session_version,s.revoked_at,s.expires_at
       FROM users u JOIN sessions s ON s.id=$2 AND s.user_id=u.id WHERE u.id=$1`,
      [decoded.sub, decoded.sid]
    );
    const user = result.rows[0];
    if (!user?.active || user.revoked_at || new Date(user.expires_at) <= new Date() || user.session_version !== decoded.sv) {
      return res.status(401).json({ error: 'Session révoquée ou compte désactivé.' });
    }
    req.identity = user;
    req.sessionId = decoded.sid;
    next();
  } catch {
    res.status(401).json({ error: 'Authentification requise.' });
  }
}

export function requireCsrf(req, res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  if (req.path?.startsWith('/impayes/erp-sync') && req.get('authorization')?.startsWith('Bearer ')) return next();
  const cookie = req.cookies.gadimat_csrf;
  const header = req.get('x-csrf-token');
  if (!cookie || !header || cookie.length !== header.length || !crypto.timingSafeEqual(Buffer.from(cookie), Buffer.from(header))) {
    return res.status(403).json({ error: 'Jeton CSRF invalide.' });
  }
  next();
}

export function requirePlatformAdmin(req, res, next) {
  if (!req.identity?.platform_admin) return res.status(403).json({ error: 'Administration plateforme requise.' });
  next();
}

export function requireModule(moduleCode, permission = 'read') {
  return async (req, res, next) => {
    const identitySource = moduleCode === 'consommations' ? 'cheques' : moduleCode;
    const result = await centralQuery(
      `SELECT ma.role,ma.permissions,ma.data_scope,li.legacy_user_id
       FROM module_access ma LEFT JOIN legacy_identities li ON li.central_user_id=ma.user_id AND li.source=$2
       WHERE ma.user_id=$1 AND ma.module_code=$3 AND ma.active=true`,
      [req.identity.id, identitySource, moduleCode]
    );
    const access = result.rows[0];
    if (!access || (!access.permissions.includes('*') && !access.permissions.includes(permission))) {
      return res.status(403).json({ error: `Accès au module ${moduleCode} refusé.` });
    }
    if (['cheques', 'impayes', 'consommations'].includes(moduleCode) && !access.legacy_user_id) {
      return res.status(403).json({ error: `Correspondance historique ${moduleCode} absente.` });
    }
    req.moduleAccess = access;
    req.user = {
      id: ['cheques', 'consommations'].includes(moduleCode) ? Number(access.legacy_user_id) : access.legacy_user_id,
      email: req.identity.email,
      nom: req.identity.name,
      name: req.identity.name,
      role: access.role,
      centralId: req.identity.id,
      dataScope: access.data_scope,
    };
    next();
  };
}

export function requireModuleForRequest(moduleCode) {
  return (req, res, next) => {
    const permission = ['GET', 'HEAD', 'OPTIONS'].includes(req.method) ? 'read' : 'write';
    return requireModule(moduleCode, permission)(req, res, next);
  };
}
