import { beforeEach, describe, expect, it, vi } from 'vitest';

const centralQuery = vi.fn();
vi.mock('../src/db.js', () => ({ centralQuery }));
const { authenticate, requireCsrf, requireModule, requireModuleForRequest } = await import('../src/middleware/auth.js');
const { signAccess } = await import('../src/security.js');

function response() {
  return { statusCode: 200, body: null, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } };
}

async function invoke(middleware, overrides = {}) {
  const req = { method: 'GET', identity: { id: 'central-1', email: 'user@gadimat.com', name: 'User' }, ...overrides };
  const res = response();
  let next = false;
  await middleware(req, res, () => { next = true; });
  return { req, res, next };
}

describe('autorisation par module', () => {
  beforeEach(() => centralQuery.mockReset());

  it('refuse par défaut un module absent', async () => {
    centralQuery.mockResolvedValue({ rows: [] });
    const { res, next } = await invoke(requireModule('impayes', 'read'));
    expect(next).toBe(false);
    expect(res.statusCode).toBe(403);
  });

  it('traduit vers l’identité historique et conserve le rôle commercial', async () => {
    centralQuery.mockResolvedValue({ rows: [{ role: 'commercial', permissions: ['read'], data_scope: { own: true }, legacy_user_id: 'legacy-uuid' }] });
    const { req, next } = await invoke(requireModule('impayes', 'read'));
    expect(next).toBe(true);
    expect(req.user).toMatchObject({ id: 'legacy-uuid', role: 'commercial', centralId: 'central-1' });
  });

  it('refuse une permission non accordée', async () => {
    centralQuery.mockResolvedValue({ rows: [{ role: 'lecture_seule', permissions: ['read'], data_scope: {}, legacy_user_id: 'legacy-uuid' }] });
    const { res } = await invoke(requireModule('impayes', 'write'));
    expect(res.statusCode).toBe(403);
  });

  it('isole un utilisateur Chèques du module Impayés', async () => {
    centralQuery.mockImplementation((_sql, params = []) => Promise.resolve({ rows: params[2] === 'cheques'
      ? [{ role: 'Utilisateur', permissions: ['read', 'write'], data_scope: {}, legacy_user_id: '12' }]
      : [] }));
    expect((await invoke(requireModule('cheques', 'read'))).next).toBe(true);
    expect((await invoke(requireModule('impayes', 'read'))).res.statusCode).toBe(403);
  });

  it('autorise les deux modules quand les deux accès existent', async () => {
    centralQuery.mockImplementation((_sql, params = []) => Promise.resolve({ rows: [{
      role: params[2] === 'impayes' ? 'responsable_recouvrement' : 'Utilisateur',
      permissions: ['read', 'write'], data_scope: {}, legacy_user_id: params[2] === 'impayes' ? 'uuid-legacy' : '12',
    }] }));
    expect((await invoke(requireModule('cheques', 'read'))).next).toBe(true);
    expect((await invoke(requireModule('impayes', 'read'))).next).toBe(true);
  });

  it('interdit une mutation à un compte lecture seule', async () => {
    centralQuery.mockResolvedValue({ rows: [{ role: 'lecture_seule', permissions: ['read'], data_scope: {}, legacy_user_id: 'legacy-uuid' }] });
    const { res, next } = await invoke(requireModuleForRequest('impayes'), { method: 'POST' });
    expect(next).toBe(false);
    expect(res.statusCode).toBe(403);
  });

  it('utilise directement l’identité centrale pour Logistique sans correspondance historique', async () => {
    centralQuery.mockResolvedValue({ rows: [{ role: 'fleet_manager', permissions: ['dashboard.read', 'assets.read'], data_scope: { siteIds: ['site-1'] }, legacy_user_id: null }] });
    const { req, next } = await invoke(requireModule('logistique', 'assets.read'));
    expect(next).toBe(true);
    expect(req.user).toMatchObject({ id: 'central-1', centralId: 'central-1', role: 'fleet_manager', dataScope: { siteIds: ['site-1'] } });
  });

  it('applique une permission Logistique fine et accepte le joker administrateur', async () => {
    centralQuery.mockResolvedValueOnce({ rows: [{ role: 'read_only', permissions: ['assets.read'], data_scope: {}, legacy_user_id: null }] });
    expect((await invoke(requireModule('logistique', 'quotations.approve'))).res.statusCode).toBe(403);
    centralQuery.mockResolvedValueOnce({ rows: [{ role: 'logistics_admin', permissions: ['*'], data_scope: {}, legacy_user_id: null }] });
    expect((await invoke(requireModule('logistique', 'quotations.approve'))).next).toBe(true);
  });
});

describe('session et CSRF', () => {
  beforeEach(() => centralQuery.mockReset());

  it('rejette immédiatement un compte désactivé', async () => {
    const token = signAccess({ id: 'central-1', session_version: 2 }, 'session-1');
    centralQuery.mockResolvedValue({ rows: [{ id: 'central-1', active: false, session_version: 2, revoked_at: null, expires_at: new Date(Date.now() + 60000) }] });
    const req = { cookies: { gadimat_access: token }, get: () => undefined };
    const result = await new Promise((resolve) => {
      const res = { statusCode: 200, status(code) { this.statusCode = code; return this; }, json(body) { resolve({ code: this.statusCode, body }); } };
      authenticate(req, res, () => resolve({ code: 200 }));
    });
    expect(result.code).toBe(401);
  });

  it('accepte un jeton CSRF identique et refuse une valeur différente', () => {
    const okReq = { method: 'POST', cookies: { gadimat_csrf: 'abc' }, get: () => 'abc' };
    let called = false;
    requireCsrf(okReq, {}, () => { called = true; });
    expect(called).toBe(true);
    const res = response();
    requireCsrf({ ...okReq, get: () => 'xyz' }, res, () => {});
    expect(res.statusCode).toBe(403);
  });
});
