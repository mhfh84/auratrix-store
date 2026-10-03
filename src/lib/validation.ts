/**
 * validation.ts
 * ─────────────
 * Shared client + server-side validation helpers.
 */

// ─── Phone ────────────────────────────────────────────────────────────────────

/**
 * Egyptian mobile number regex.
 * Valid prefixes: 010 (Vodafone), 011 (Etisalat), 012 (Orange), 015 (WE)
 * Format: 01X XXXX XXXX — exactly 11 digits after stripping non-digit chars.
 */
export const EGYPT_PHONE_REGEX = /^01[0125][0-9]{8}$/;

/**
 * Strip spaces, dashes and country code prefix (+20 or 0020) before validating.
 */
export function normalizePhone(phone: string): string {
  let p = phone.replace(/[\s\-().]/g, '');
  if (p.startsWith('+20')) p = '0' + p.slice(3);
  if (p.startsWith('0020')) p = '0' + p.slice(4);
  return p;
}

export function validateEgyptPhone(phone: string): boolean {
  return EGYPT_PHONE_REGEX.test(normalizePhone(phone));
}

export function getPhoneError(phone: string, isArabic = false): string | null {
  if (!phone || !phone.trim()) {
    return isArabic ? 'رقم الهاتف مطلوب' : 'Phone number is required';
  }
  if (!validateEgyptPhone(phone)) {
    return isArabic
      ? 'رقم الهاتف غير صحيح — يجب أن يبدأ بـ 010 أو 011 أو 012 أو 015'
      : 'Invalid phone — must start with 010, 011, 012, or 015';
  }
  return null;
}

// ─── Password ─────────────────────────────────────────────────────────────────

export type PasswordStrength = 'empty' | 'weak' | 'medium' | 'strong';

export interface PasswordStrengthResult {
  score: number;        // 0–4
  strength: PasswordStrength;
  feedback: string[];
}

export function getPasswordStrength(password: string, isArabic = false): PasswordStrengthResult {
  if (!password) return { score: 0, strength: 'empty', feedback: [] };

  const feedback: string[] = [];
  let score = 0;

  if (password.length >= 8) score++;
  else feedback.push(isArabic ? 'على الأقل 8 أحرف' : 'At least 8 characters');

  if (/[A-Z]/.test(password)) score++;
  else feedback.push(isArabic ? 'حرف كبير واحد على الأقل' : 'At least one uppercase letter');

  if (/[0-9]/.test(password)) score++;
  else feedback.push(isArabic ? 'رقم واحد على الأقل' : 'At least one number');

  if (/[^A-Za-z0-9]/.test(password)) score++;
  else feedback.push(isArabic ? 'رمز خاص واحد على الأقل (!@#$…)' : 'At least one special character (!@#$…)');

  const strength: PasswordStrength =
    score <= 1 ? 'weak' : score <= 2 ? 'medium' : 'strong';

  return { score, strength, feedback };
}

// ─── Name ─────────────────────────────────────────────────────────────────────

export function validateName(name: string, isArabic = false): string | null {
  if (!name || !name.trim()) {
    return isArabic ? 'الاسم مطلوب' : 'Name is required';
  }
  if (name.trim().length < 2) {
    return isArabic ? 'الاسم قصير جداً' : 'Name is too short';
  }
  return null;
}
