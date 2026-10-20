import { describe, expect, it } from 'vitest';
import { permissionsForRole, validateAccess } from '../src/routes/administration.js';

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
});
