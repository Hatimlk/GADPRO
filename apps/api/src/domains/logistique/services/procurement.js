const round = (value, decimals = 2) => {
  const factor = 10 ** decimals;
  return Math.round((Number(value) + Number.EPSILON) * factor) / factor;
};

export function calculateQuotationTotals(items) {
  const lines = items.map((item, index) => {
    const quantity = round(item.quantity, 3);
    const unitPrice = round(item.unitPrice, 4);
    const taxRate = round(item.taxRate || 0, 4);
    const subtotal = round(quantity * unitPrice);
    const taxAmount = round(subtotal * taxRate / 100);
    return { ...item, position: index + 1, quantity, unitPrice, taxRate, subtotal, taxAmount, totalAmount: round(subtotal + taxAmount) };
  });
  return {
    lines,
    subtotal: round(lines.reduce((sum, line) => sum + line.subtotal, 0)),
    taxAmount: round(lines.reduce((sum, line) => sum + line.taxAmount, 0)),
    totalAmount: round(lines.reduce((sum, line) => sum + line.totalAmount, 0)),
  };
}

export function calculateInvoiceTotals(subtotal, taxAmount) {
  return { subtotal: round(subtotal), taxAmount: round(taxAmount), totalAmount: round(Number(subtotal) + Number(taxAmount)) };
}

export function canDecideApproval({ actorUserId, requesterUserId, permissions, requiredPermission }) {
  if (actorUserId === requesterUserId) return { allowed: false, code: 'SELF_APPROVAL_FORBIDDEN', message: 'Le demandeur ne peut pas approuver sa propre demande.' };
  if (!permissions.includes('*') && !permissions.includes(requiredPermission)) return { allowed: false, code: 'PERMISSION_DENIED', message: 'Permission d’approbation insuffisante.' };
  return { allowed: true };
}

export function isInvoiceAmountConsistent(invoiceTotal, orderTotal) {
  return round(invoiceTotal) <= round(orderTotal);
}
