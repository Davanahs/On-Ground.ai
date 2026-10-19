import { describe, it, expect } from 'vitest';
import { formatE164, validateE164 } from './phone.js';

describe('Phone Utility', () => {
  it('formats raw phone strings to E.164', () => {
    expect(formatE164('+91 91234 56789')).toBe('+919123456789');
    expect(formatE164('9800000000')).toBe('+919800000000');
    expect(formatE164('+1 415 555 2671')).toBe('+14155552671');
  });

  it('validates E.164 format correctly', () => {
    expect(validateE164('+919123456789')).toBe(true);
    expect(validateE164('+91 91234 56789')).toBe(true);
    expect(validateE164('123')).toBe(false);
    expect(validateE164('')).toBe(false);
  });
});
