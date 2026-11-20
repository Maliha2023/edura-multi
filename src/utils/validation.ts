import type { CurriculumSubTrack, EducationStream, StudentClass } from '../types/domain';

export const DEFAULT_PATHWAY_OPTIONS: readonly string[] = [
  'General',
  'Science',
  'Commerce',
  'Humanities',
] as const;

export const EDUCATION_STREAMS: readonly EducationStream[] = [
  'Bangladesh National Curriculum (NCTB)',
  'International Curriculum (English Medium)',
  'Bangladesh Madrasa Education',
] as const;

export const STREAM_SUBTRACKS: Record<EducationStream, readonly CurriculumSubTrack[]> = {
  'Bangladesh National Curriculum (NCTB)': ['Bangla Version', 'English Version'],
  'International Curriculum (English Medium)': ['Cambridge', 'Edexcel'],
  'Bangladesh Madrasa Education': ['Alia', 'Qawmi'],
} as const;

export function getSubTracksForStream(stream: EducationStream): readonly CurriculumSubTrack[] {
  return STREAM_SUBTRACKS[stream];
}

export function isValidSubTrackForStream(
  stream: EducationStream,
  subTrack?: string | null
): subTrack is CurriculumSubTrack {
  if (!subTrack) return false;
  return (STREAM_SUBTRACKS[stream] as readonly string[]).includes(subTrack);
}

export function normalizeEducationStream(raw?: string | null): EducationStream | null {
  if (!raw) return null;
  if (raw === 'Bangladesh National Curriculum (NCTB)' || raw === 'Bangla Medium' || raw === 'English Version') {
    return 'Bangladesh National Curriculum (NCTB)';
  }
  if (raw === 'International Curriculum (English Medium)' || raw === 'English Medium') {
    return 'International Curriculum (English Medium)';
  }
  if (raw === 'Bangladesh Madrasa Education' || raw === 'Madrasa') {
    return 'Bangladesh Madrasa Education';
  }
  return null;
}

export const STUDENT_CLASSES: readonly StudentClass[] = [6, 7, 8, 9, 10, 11, 12] as const;

export type ValidationResult =
  | { valid: true }
  | { valid: false; errorKey: string };

export function normalizeCouponCode(raw: string): string {
  return raw.trim().toUpperCase();
}

export function isValidCouponFormat(raw: string): boolean {
  const code = normalizeCouponCode(raw);
  return /^[TS]-\d{5}$/.test(code);
}

export function getCouponRoleFromCode(raw: string): 'teacher' | 'student' | null {
  const code = normalizeCouponCode(raw);
  if (code.startsWith('T-')) return 'teacher';
  if (code.startsWith('S-')) return 'student';
  return null;
}

export function validateFullName(name: string): ValidationResult {
  const trimmed = name.trim();
  if (trimmed.length < 2) {
    return { valid: false, errorKey: 'validation.nameRequired' };
  }
  return { valid: true };
}

export function validateEmail(email: string): ValidationResult {
  const trimmed = email.trim();
  if (!trimmed) {
    return { valid: false, errorKey: 'validation.emailRequired' };
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  if (!emailRegex.test(trimmed)) {
    return { valid: false, errorKey: 'validation.emailInvalid' };
  }
  return { valid: true };
}

export function normalizeBangladeshPhone(phone: string): string {
  return phone.replace(/[\s-]/g, '').trim();
}

export function validateBangladeshPhone(phone: string): ValidationResult {
  const cleaned = normalizeBangladeshPhone(phone);
  if (!cleaned) {
    return { valid: false, errorKey: 'validation.phoneRequired' };
  }
  // Bangladesh phone format: 01XXXXXXXXX (11 digits starting with 01)
  if (!/^01\d{9}$/.test(cleaned)) {
    return { valid: false, errorKey: 'validation.phoneInvalid' };
  }
  return { valid: true };
}

export function validatePassword(password: string): ValidationResult {
  if (!password || password.length < 8) {
    return { valid: false, errorKey: 'validation.passwordMinLength' };
  }
  return { valid: true };
}

export function validatePasswordConfirmation(
  password: string,
  confirmPassword: string
): ValidationResult {
  if (password !== confirmPassword) {
    return { valid: false, errorKey: 'validation.passwordMismatch' };
  }
  return { valid: true };
}

export function validateTeacherId(teacherId: string): ValidationResult {
  const trimmed = teacherId.trim();
  if (trimmed.length < 2) {
    return { valid: false, errorKey: 'validation.teacherIdRequired' };
  }
  return { valid: true };
}

export type PasswordStrengthLevel = 'weak' | 'fair' | 'good' | 'strong';

export interface PasswordStrengthInfo {
  score: number; // 0 to 4
  level: PasswordStrengthLevel;
  hasMinLength: boolean;
  hasUpperAndLower: boolean;
  hasNumber: boolean;
  hasSymbol: boolean;
}

export function evaluatePasswordStrength(password: string): PasswordStrengthInfo {
  const hasMinLength = password.length >= 8;
  const hasUpperAndLower = /[a-z]/.test(password) && /[A-Z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSymbol = /[^A-Za-z0-9]/.test(password);

  let score = 0;
  if (hasMinLength) score += 1;
  if (hasUpperAndLower) score += 1;
  if (hasNumber) score += 1;
  if (hasSymbol) score += 1;

  let level: PasswordStrengthLevel = 'weak';
  if (score >= 4) level = 'strong';
  else if (score === 3) level = 'good';
  else if (score === 2) level = 'fair';

  return {
    score,
    level,
    hasMinLength,
    hasUpperAndLower,
    hasNumber,
    hasSymbol,
  };
}
