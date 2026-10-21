import { describe, expect, it, vi } from 'vitest';
import { deleteUserAccount, normalizeAccesses, permissionsForRole, saveAccess, validateAccess } from '../src/routes/administration.js';

describe('administration des accès Logistique', () => {
  it('crée un accès à partir de l’identité centrale sans identifiant historique', () => {
    const access = validateAccess({
      module: 'logistique',
      role: 'fleet_manager',
      dataScope: { siteIds: ['site-1'], allSites: false },
    });

    expect(access).toMatchObject({
      module: 'logistique',
      role: 'fleet_manager',
      legacyUserId: null,
      dataScope: { siteIds: ['site-1'], allSites: false },
    });
    expect(access.permissions).toContain('assets.read');
    expect(access.permissions).not.toContain('quotations.approve');
  });

  it('rejette un rôle Logistique inconnu', () => {
    expect(validateAccess({ module: 'logistique', role: 'superuser' })).toBeNull();
  });

  it('ne propose plus Consommations comme module autonome', () => {
    expect(validateAccess({ module: 'consommations', role: 'Administrateur', legacyUserId: '42' })).toBeNull();
  });

  it('convertit un ancien accès Consommations en Suivi des Instances', () => {
    expect(normalizeAccesses([{ module: 'consommations', role: 'Utilisateur', legacyUserId: '42' }])).toEqual([
      { module: 'cheques', role: 'Utilisateur', legacyUserId: '42' },
    ]);
    expect(normalizeAccesses([
      { module: 'consommations', role: 'Utilisateur', legacyUserId: '42' },
      { module: 'cheques', role: 'Administrateur', legacyUserId: '42' },
      { module: 'administration', role: 'admin' },
    ])).toEqual([{ module: 'cheques', role: 'Administrateur', legacyUserId: '42' }]);
  });

  it('supprime un compte central et laisse les cascades de la base nettoyer ses accès', async () => {
    const query = vi.fn()
      .mockResolvedValueOnce({ rows: [{ id: 'user-2', name: 'Compte test', email: 'test@gadimat.com', platform_admin: false }] })
      .mockResolvedValueOnce({ rowCount: 1 });
    await expect(deleteUserAccount({ query }, 'user-2')).resolves.toMatchObject({ status: 'deleted' });
    expect(query.mock.calls[1]).toEqual(['DELETE FROM users WHERE id=$1', ['user-2']]);
  });

  it('protège le dernier administrateur actif', async () => {
    const query = vi.fn()
      .mockResolvedValueOnce({ rows: [{ id: 'admin-1', platform_admin: true }] })
      .mockResolvedValueOnce({ rows: [{ count: 0 }] });
    await expect(deleteUserAccount({ query }, 'admin-1')).resolves.toEqual({ status: 'last_admin' });
    expect(query).toHaveBeenCalledTimes(2);
  });

  it('réserve le joker au rôle administrateur Logistique', () => {
    expect(permissionsForRole('logistique', 'logistics_admin')).toEqual(['*']);
    expect(permissionsForRole('logistique', 'read_only')).not.toContain('*');
  });

  it('enregistre réellement le module sans exiger d’identité historique', async () => {
    const query = vi.fn().mockResolvedValue({ rowCount: 1 });
    const access = validateAccess({ module: 'logistique', role: 'logistics_admin' });
    await saveAccess({ query }, '11111111-1111-4111-8111-111111111111', access);
    expect(query).toHaveBeenCalledTimes(1);
    expect(query.mock.calls[0][0]).toContain('INSERT INTO module_access');
    expect(query.mock.calls[0][1]).toEqual(expect.arrayContaining(['logistique', 'logistics_admin']));
  });
});
