import { beforeEach, describe, expect, it, vi } from 'vitest';
import { buildImpayesPoolConfig } from '../src/domains/impayes/config/connection.js';
import {
  analyzeUserMigration,
  assertMigrationCanApply,
} from '../../../database/scripts/migrate-users-core.js';
import { normalizeCommercialIdentity, shouldUseCommercialScope } from '../src/domains/impayes/services/commercialIdentity.js';

const schemaQuery = vi.fn();
vi.mock('../src/domains/impayes/config/db.js', () => ({ query: schemaQuery }));
const { ensureErpTrackingTables } = await import('../src/domains/impayes/services/schema.js');

const HASH_A = '$2b$12$aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
const HASH_B = '$2b$12$bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';

describe('configuration PostgreSQL Impayés', () => {
  it('laisse une copie locale sans SSL, indépendamment de NODE_ENV', () => {
    const previous = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    try {
      expect(buildImpayesPoolConfig('postgresql://user:pass@127.0.0.1:5544/gadpro_impayes_copy').ssl).toBe(false);
    } finally {
      process.env.NODE_ENV = previous;
    }
  });

  it('vérifie les certificats Neon en l’absence de réglage explicite', () => {
    const config = buildImpayesPoolConfig('postgresql://user:pass@ep-example.eu.neon.tech/db');
    expect(config.ssl).toEqual({ rejectUnauthorized: true });
  });

  it('préserve les paramètres SSL explicites pour que pg les interprète', () => {
    const disabled = buildImpayesPoolConfig('postgresql://user:pass@127.0.0.1:5544/db?sslmode=disable');
    const verified = buildImpayesPoolConfig('postgresql://user:pass@ep-example.neon.tech/db?sslmode=verify-full');
    expect(disabled.connectionString).toContain('sslmode=disable');
    expect(verified.connectionString).toContain('sslmode=verify-full');
    expect(disabled).not.toHaveProperty('ssl');
    expect(verified).not.toHaveProperty('ssl');
  });
});

describe('portefeuille commercial personnel', () => {
  it('normalise Nabil SAFOUANE vers le commercial ERP NABIL', () => {
    expect(normalizeCommercialIdentity('Nabil SAFOUANE')).toBe('NABIL');
  });

  it('impose toujours le périmètre personnel aux commerciaux', () => {
    expect(shouldUseCommercialScope({ role: 'commercial' })).toBe(true);
  });

  it('autorise la vue personnelle explicite pour un utilisateur responsable', () => {
    expect(shouldUseCommercialScope({ role: 'responsable_recouvrement' }, 'mine')).toBe(true);
    expect(shouldUseCommercialScope({ role: 'responsable_recouvrement' })).toBe(false);
    expect(shouldUseCommercialScope({ role: 'admin' }, 'mine')).toBe(false);
  });
});

describe('initialisation runtime du schéma Impayés', () => {
  beforeEach(() => schemaQuery.mockReset().mockResolvedValue({ rows: [] }));

  it('ne supprime aucun dossier et ne réécrit aucun e-mail historique', async () => {
    await ensureErpTrackingTables();
    const sql = schemaQuery.mock.calls[0][0];
    expect(sql).not.toMatch(/DELETE\s+FROM\s+dossiers/i);
    expect(sql).not.toMatch(/UPDATE\s+users\s+SET\s+email/i);
    expect(sql).not.toContain('006_remove_legacy_test_dossiers');
    expect(sql).not.toContain('007_users_email_gadimat_com');
  });
});

describe('précontrôle de migration des utilisateurs', () => {
  const account = (overrides = {}) => ({
    source: 'impayes', legacyId: '19', name: 'Hatim', email: 'hatim@gadimat.com',
    hash: HASH_A, role: 'admin', active: true, ...overrides,
  });

  it('déclare un conflit d’empreintes, sans prétendre connaître les mots de passe', () => {
    const result = analyzeUserMigration([
      account(),
      account({ source: 'cheques', legacyId: '7', hash: HASH_B }),
    ]);
    expect(result.conflicts[0].reasons).toContain('empreintes_bcrypt_differentes');
    expect(result.conflicts[0].reasons.join(' ')).not.toContain('mots_de_passe');
  });

  it('détecte le compte central Hatim préexistant avec une autre empreinte', () => {
    const result = analyzeUserMigration([account()], [{
      id: 'central-hatim', email: 'hatim@gadimat.com', email_normalized: 'hatim@gadimat.com',
      password_hash: HASH_B, active: true,
    }]);
    expect(result.conflicts[0].reasons).toContain('empreinte_bcrypt_centrale_differente');
    expect(() => assertMigrationCanApply(result)).toThrow(/avant toute écriture/);
  });

  it('détecte une correspondance historique vers un autre compte central', () => {
    const result = analyzeUserMigration(
      [account()],
      [
        { id: 'central-hatim', email_normalized: 'hatim@gadimat.com', password_hash: HASH_A, active: true },
        { id: 'central-autre', email_normalized: 'autre@gadimat.com', password_hash: HASH_A, active: true },
      ],
      [{ central_user_id: 'central-autre', source: 'impayes', legacy_user_id: '19' }],
    );
    expect(result.conflicts[0].reasons).toContain('correspondance_legacy_vers_autre_compte');
  });

  it('réutilise une correspondance centrale cohérente', () => {
    const result = analyzeUserMigration(
      [account()],
      [{ id: 'central-hatim', email_normalized: 'hatim@gadimat.com', password_hash: HASH_A, active: true }],
      [{ central_user_id: 'central-hatim', source: 'impayes', legacy_user_id: '19' }],
    );
    expect(result.conflicts).toEqual([]);
    expect(result.candidates[0].centralUserId).toBe('central-hatim');
    expect(() => assertMigrationCanApply(result)).not.toThrow();
  });
});
