export function validateMeterProgression({ currentValue, reading, correctionReason, canCorrect }) {
  if (reading >= currentValue) return { allowed: true };
  if (canCorrect && String(correctionReason || '').trim()) return { allowed: true };
  return { allowed: false, code: 'METER_DECREASE' };
}
