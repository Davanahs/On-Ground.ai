/**
 * Clean phone string and format as E.164 (+91...)
 */
export function formatE164(phoneStr) {
  if (!phoneStr) return '';
  let cleaned = String(phoneStr).replace(/[^\d+]/g, '');
  if (!cleaned.startsWith('+')) {
    if (cleaned.startsWith('91') && cleaned.length === 12) {
      cleaned = '+' + cleaned;
    } else {
      cleaned = '+91' + cleaned;
    }
  }
  return cleaned;
}

/**
 * Validate E.164 format (+ followed by 8 to 15 digits)
 */
export function validateE164(phoneStr) {
  const formatted = formatE164(phoneStr);
  return /^\+\d{8,15}$/.test(formatted);
}
