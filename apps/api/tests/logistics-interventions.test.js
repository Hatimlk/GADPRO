import { describe, expect, it } from 'vitest';
import { providerCreateSchema, providerUpdateSchema, transitionSchema } from '../src/domains/logistique/schemas/validation.js';
import { evaluateTransition } from '../src/domains/logistique/services/interventionWorkflow.js';

const requester = '11111111-1111-4111-8111-111111111111';
const approver = '22222222-2222-4222-8222-222222222222';

describe('workflow des interventions Logistique', () => {
  it('autorise une validation par un autre utilisateur habilité', () => {
    expect(evaluateTransition({
      fromStatus: 'requested', toStatus: 'validated', actorUserId: approver,
      requesterUserId: requester, permissions: ['interventions.validate'], reason: null,
    }).allowed).toBe(true);
  });

  it('interdit l’auto-validation, même à un administrateur', () => {
    expect(evaluateTransition({
      fromStatus: 'requested', toStatus: 'validated', actorUserId: requester,
      requesterUserId: requester, permissions: ['*'], reason: null,
    })).toMatchObject({ allowed: false, code: 'SELF_APPROVAL_FORBIDDEN' });
  });

  it('exige un motif pour le rejet et l’annulation', () => {
    expect(evaluateTransition({
      fromStatus: 'requested', toStatus: 'rejected', actorUserId: approver,
      requesterUserId: requester, permissions: ['interventions.validate'], reason: ' ',
    })).toMatchObject({ allowed: false, code: 'REASON_REQUIRED' });
  });

  it('permet au demandeur habilité de retirer sa propre demande', () => {
    expect(evaluateTransition({
      fromStatus: 'requested', toStatus: 'cancelled', actorUserId: requester,
      requesterUserId: requester, permissions: ['interventions.update'], reason: 'Demande créée par erreur',
    }).allowed).toBe(true);
  });

  it('refuse une transition qui contourne le workflow', () => {
    expect(evaluateTransition({
      fromStatus: 'requested', toStatus: 'closed', actorUserId: approver,
      requesterUserId: requester, permissions: ['*'], reason: null,
    })).toMatchObject({ allowed: false, code: 'INVALID_TRANSITION' });
  });
});

describe('validation des prestataires et transitions', () => {
  it('normalise un prestataire et contrôle les dates du contrat', () => {
    const valid = providerCreateSchema.parse({ supplierCode: 'FOU-001', companyName: 'Garage Atlas' });
    expect(valid).toMatchObject({ status: 'active', specialtyIds: [] });
    expect(providerCreateSchema.safeParse({
      supplierCode: 'FOU-002', companyName: 'Garage Sud',
      contractStartsAt: '2026-12-01', contractEndsAt: '2026-11-01',
    }).success).toBe(false);
  });

  it('ne vide pas les spécialités lors d’une modification qui ne les fournit pas', () => {
    const update = providerUpdateSchema.parse({ companyName: 'Garage Atlas SARL', version: 2 });
    expect(Object.hasOwn(update, 'specialtyIds')).toBe(false);
  });

  it('refuse les coûts négatifs et exige une version positive', () => {
    expect(transitionSchema.safeParse({ toStatus: 'completed', version: 0, actualCost: -1 }).success).toBe(false);
  });

  it('réserve les données de fin au passage au statut terminé', () => {
    expect(transitionSchema.safeParse({ toStatus: 'validated', version: 1, actualCost: 100 }).success).toBe(false);
    expect(transitionSchema.safeParse({ toStatus: 'completed', version: 1, actualCost: 100 }).success).toBe(true);
  });
});
