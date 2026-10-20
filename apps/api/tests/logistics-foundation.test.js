import { describe, expect, it } from 'vitest';
import { assetCreateSchema, assignmentCreateSchema, meterReadingSchema } from '../src/domains/logistique/schemas/validation.js';
import { appendAssetScope, isSiteAllowed, requireLogisticsPermission } from '../src/domains/logistique/middleware/authorization.js';
import { validateMeterProgression } from '../src/domains/logistique/services/meters.js';

describe('validation du parc Logistique', () => {
  const validAsset = {
    fleetNumber: 'G1-001', categoryId: '8f760b2d-e1d8-4b57-a193-f0f3fa1f2662', brand: 'Marque', model: 'Modèle',
    siteId: '97336729-04bf-4bbd-af34-175c1d39cb37', currentMileage: 100, currentOperatingHours: 0,
  };

  it('normalise les champs optionnels et refuse un compteur négatif', () => {
    expect(assetCreateSchema.parse(validAsset)).toMatchObject({ registrationNumber: null, status: 'available', currentMileage: 100 });
    expect(assetCreateSchema.safeParse({ ...validAsset, currentMileage: -1 }).success).toBe(false);
    expect(meterReadingSchema.safeParse({ meterType: 'hours', reading: -2, recordedAt: new Date().toISOString() }).success).toBe(false);
  });

  it('exige des UUID et une date ISO pour les affectations', () => {
    expect(assignmentCreateSchema.safeParse({ driverId: 'x', assetId: 'y', startsAt: '20/10/2026' }).success).toBe(false);
  });
});

describe('périmètre et permissions Logistique', () => {
  it('ajoute les filtres site et service aux requêtes SQL', () => {
    const conditions = [];
    const params = [];
    appendAssetScope({ moduleAccess: { permissions: ['assets.read'], data_scope: { allSites: false, siteIds: ['site-1'], departmentIds: ['dep-1'] } } }, conditions, params);
    expect(conditions).toEqual(['a.site_id = ANY($1::uuid[])', 'a.department_id = ANY($2::uuid[])']);
    expect(params).toEqual([['site-1'], ['dep-1']]);
  });

  it('refuse par défaut un périmètre explicitement vide', () => {
    const conditions = [];
    appendAssetScope({ moduleAccess: { permissions: ['assets.read'], data_scope: { allSites: false, siteIds: [] } } }, conditions, []);
    expect(conditions).toContain('FALSE');
    expect(isSiteAllowed({ moduleAccess: { permissions: ['assets.create'], data_scope: { allSites: false, siteIds: [] } } }, 'site-1')).toBe(false);
  });

  it('contrôle les permissions de route', () => {
    let called = false;
    const req = { moduleAccess: { permissions: ['assets.read'] } };
    const res = { statusCode: 200, status(code) { this.statusCode = code; return this; }, json() { return this; } };
    requireLogisticsPermission('assets.create')(req, res, () => { called = true; });
    expect(called).toBe(false);
    expect(res.statusCode).toBe(403);
  });
});

describe('cohérence des compteurs', () => {
  it('accepte une progression et refuse une baisse non justifiée', () => {
    expect(validateMeterProgression({ currentValue: 100, reading: 120, canCorrect: false })).toEqual({ allowed: true });
    expect(validateMeterProgression({ currentValue: 100, reading: 90, canCorrect: true, correctionReason: '' }).allowed).toBe(false);
    expect(validateMeterProgression({ currentValue: 100, reading: 90, canCorrect: true, correctionReason: 'Remplacement compteur' }).allowed).toBe(true);
  });
});
