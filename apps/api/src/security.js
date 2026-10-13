import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { config } from './config.js';

export const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');
export const newCsrfToken = () => crypto.randomBytes(32).toString('base64url');

export function signAccess(user, sessionId) {
  return jwt.sign({ sub: user.id, sid: sessionId, sv: user.session_version }, config.accessSecret, { expiresIn: config.accessTtl });
}
export function signRefresh(userId, sessionId) {
  return jwt.sign({ sub: userId, sid: sessionId, jti: crypto.randomUUID() }, config.refreshSecret, { expiresIn: `${config.refreshDays}d` });
}
export const verifyAccess = (token) => jwt.verify(token, config.accessSecret);
export const verifyRefresh = (token) => jwt.verify(token, config.refreshSecret);

export function setAuthCookies(res, access, refresh, csrf) {
  const base = { secure: config.secureCookies, sameSite: 'lax', path: '/' };
  res.cookie('gadimat_access', access, { ...base, httpOnly: true, maxAge: 15 * 60 * 1000 });
  res.cookie('gadimat_refresh', refresh, { ...base, httpOnly: true, maxAge: config.refreshDays * 86400000 });
  res.cookie('gadimat_csrf', csrf, { ...base, httpOnly: false, maxAge: config.refreshDays * 86400000 });
}
export function clearAuthCookies(res) {
  for (const name of ['gadimat_access', 'gadimat_refresh', 'gadimat_csrf']) res.clearCookie(name, { path: '/' });
}
