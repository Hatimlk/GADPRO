import { describe, expect, it, vi } from 'vitest';
import { permissionsForRole, saveAccess, validateAccess } from '../src/routes/administration.js';

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
