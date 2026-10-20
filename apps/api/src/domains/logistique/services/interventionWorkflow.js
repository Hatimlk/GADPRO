export const transitionRules = {
  requested: {
    validated: { permission: 'interventions.validate', separateApprover: true },
    rejected: { permission: 'interventions.validate', separateApprover: true, reasonRequired: true },
    cancelled: { permission: 'interventions.cancel', reasonRequired: true, requesterMayAct: true },
  },
  validated: {
    planned: { permission: 'interventions.plan' }, waiting_quote: { permission: 'interventions.update' },
    cancelled: { permission: 'interventions.cancel', reasonRequired: true },
  },
  waiting_quote: {
    validated: { permission: 'interventions.validate' }, rejected: { permission: 'interventions.validate', reasonRequired: true },
    cancelled: { permission: 'interventions.cancel', reasonRequired: true },
  },
  planned: { in_progress: { permission: 'interventions.execute' }, cancelled: { permission: 'interventions.cancel', reasonRequired: true } },
  in_progress: {
    waiting_parts: { permission: 'interventions.update' }, completed: { permission: 'interventions.complete' },
    cancelled: { permission: 'interventions.cancel', reasonRequired: true },
  },
  waiting_parts: { in_progress: { permission: 'interventions.execute' }, cancelled: { permission: 'interventions.cancel', reasonRequired: true } },
  completed: { invoiced: { permission: 'interventions.invoice' }, closed: { permission: 'interventions.close' } },
  invoiced: { closed: { permission: 'interventions.close' } },
};

export function evaluateTransition({ fromStatus, toStatus, actorUserId, requesterUserId, permissions, reason }) {
  const rule = transitionRules[fromStatus]?.[toStatus];
  if (!rule) return { allowed: false, code: 'INVALID_TRANSITION', message: 'Transition de statut non autorisée.' };
  const hasPermission = permissions.includes('*') || permissions.includes(rule.permission)
    || (rule.requesterMayAct && actorUserId === requesterUserId && permissions.includes('interventions.update'));
  if (!hasPermission) return { allowed: false, code: 'PERMISSION_DENIED', message: 'Permission insuffisante pour cette transition.' };
  if (rule.separateApprover && actorUserId === requesterUserId) return { allowed: false, code: 'SELF_APPROVAL_FORBIDDEN', message: 'Le demandeur ne peut pas valider ou rejeter sa propre demande.' };
  if (rule.reasonRequired && !String(reason || '').trim()) return { allowed: false, code: 'REASON_REQUIRED', message: 'Un motif est obligatoire.' };
  return { allowed: true, rule };
}
