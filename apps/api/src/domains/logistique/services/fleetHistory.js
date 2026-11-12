export function normalizeFleetRegistration(value) {
  return String(value ?? '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
}

export function formatFleetRegistration(value) {
  const normalized=normalizeFleetRegistration(value);
  const match=normalized.match(/^(\d{3,6})([A-Z])(\d{1,2})$/);
  return match?`${match[1]}-${match[2]}-${match[3]}`:String(value ?? '').trim().toUpperCase();
}
