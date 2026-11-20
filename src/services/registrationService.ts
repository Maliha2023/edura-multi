import type {
  EditHistoryEntry,
  EducationStream,
  Language,
  PendingRegistration,
  RegistrationStatus,
  StudentClass,
  UserAccount,
} from '../types/domain';
import { hashPassword } from '../utils/crypto';
import {
  normalizeBangladeshPhone,
  normalizeCouponCode,
  validateBangladeshPhone,
  validateEmail,
  validateFullName,
  validatePassword,
  validateTeacherId,
} from '../utils/validation';
import { couponService } from './couponService';
import { loadDatabase, saveDatabase } from './storage';

export interface TeacherSubmissionInput {
  role: 'teacher';
  couponCode: string;
  preferredLanguage: Language;
  fullName: string;
  email: string;
  password: string;
  teacherId: string;
}

export interface StudentSubmissionInput {
  role: 'student';
  couponCode: string;
  preferredLanguage: Language;
  fullName: string;
  phone: string;
  email: string;
  password: string;
  studentClass: StudentClass;
  educationStream: EducationStream;
  pathway: string;
}

export type RegistrationSubmissionInput = TeacherSubmissionInput | StudentSubmissionInput;

export interface RegistrationEditablePatch {
  fullName?: string;
  email?: string;
  phone?: string;
  teacherId?: string;
  studentClass?: StudentClass;
  educationStream?: EducationStream;
  pathway?: string;
  preferredLanguage?: Language;
}

function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

const BN_DIGIT_MAP: Record<string, string> = {
  '০': '0',
  '১': '1',
  '২': '2',
  '৩': '3',
  '৪': '4',
  '৫': '5',
  '৬': '6',
  '৭': '7',
  '৮': '8',
  '৯': '9',
};

function normalizeSearchText(value: string): string {
  return value
    .replace(/[০-৯]/g, (d) => BN_DIGIT_MAP[d] ?? d)
    .toLowerCase()
    .trim();
}

export const registrationService = {
  getPathwayOptions(now = Date.now()): string[] {
    const db = loadDatabase(now);
    return [...db.pathwayOptions];
  },

  listRegistrations(status?: RegistrationStatus, now = Date.now()): PendingRegistration[] {
    const db = loadDatabase(now);
    const items = status
      ? db.registrations.filter((r) => r.status === status)
      : db.registrations;
    return [...items].sort((a, b) => b.submittedAt - a.submittedAt);
  },

  getRegistrationById(id: string, now = Date.now()): PendingRegistration | null {
    const db = loadDatabase(now);
    return db.registrations.find((r) => r.id === id) ?? null;
  },

  filterEditHistory(
    entries: EditHistoryEntry[],
    query: string,
    fieldLabels?: Record<string, string>
  ): EditHistoryEntry[] {
    const normalizedQuery = normalizeSearchText(query);
    if (!normalizedQuery) return entries;

    const tokens = normalizedQuery.split(/\s+/).filter(Boolean);
    return entries.filter((entry) => {
      const label = fieldLabels?.[entry.field] ?? '';
      const haystack = normalizeSearchText(
        `${entry.field} ${label} ${entry.oldValue} ${entry.newValue}`
      );
      return tokens.every((token) => haystack.includes(token));
    });
  },

  submitRegistration(
    input: RegistrationSubmissionInput,
    now = Date.now()
  ): { ok: true; registration: PendingRegistration } | { ok: false; errorKey: string } {
    const couponCheck = couponService.validateCoupon(input.couponCode, now);
    if (!couponCheck.valid) {
      return { ok: false, errorKey: `coupon.error.${couponCheck.error}` };
    }
    if (couponCheck.role !== input.role) {
      return { ok: false, errorKey: 'coupon.error.roleMismatch' };
    }

    const nameCheck = validateFullName(input.fullName);
    if (!nameCheck.valid) return { ok: false, errorKey: nameCheck.errorKey };

    const emailCheck = validateEmail(input.email);
    if (!emailCheck.valid) return { ok: false, errorKey: emailCheck.errorKey };

    const passCheck = validatePassword(input.password);
    if (!passCheck.valid) return { ok: false, errorKey: passCheck.errorKey };

    const normalizedEmail = input.email.trim().toLowerCase();
    const db = loadDatabase(now);

    const existingUserByEmail = db.users.find(
      (u) => u.email.toLowerCase() === normalizedEmail
    );
    const existingPendingByEmail = db.registrations.find(
      (r) => r.status === 'pending' && r.email.toLowerCase() === normalizedEmail
    );
    if (existingUserByEmail || existingPendingByEmail) {
      return { ok: false, errorKey: 'validation.emailInUse' };
    }

    if (input.role === 'teacher') {
      const tidCheck = validateTeacherId(input.teacherId);
      if (!tidCheck.valid) return { ok: false, errorKey: tidCheck.errorKey };
    } else {
      const phoneCheck = validateBangladeshPhone(input.phone);
      if (!phoneCheck.valid) return { ok: false, errorKey: phoneCheck.errorKey };

      const normalizedPhone = normalizeBangladeshPhone(input.phone);
      const existingUserByPhone = db.users.find((u) => u.phone === normalizedPhone);
      const existingPendingByPhone = db.registrations.find(
        (r) => r.status === 'pending' && r.phone === normalizedPhone
      );
      if (existingUserByPhone || existingPendingByPhone) {
        return { ok: false, errorKey: 'validation.phoneInUse' };
      }
    }

    const registrationId = generateId('reg');
    // Never store plain-text password. Production auth will use Supabase Auth.
    const passwordHash = hashPassword(input.password);
    const couponCode = normalizeCouponCode(input.couponCode);

    const registration: PendingRegistration =
      input.role === 'teacher'
        ? {
            id: registrationId,
            role: 'teacher',
            couponCode,
            preferredLanguage: input.preferredLanguage,
            fullName: input.fullName.trim(),
            email: normalizedEmail,
            passwordHash,
            teacherId: input.teacherId.trim(),
            status: 'pending',
            submittedAt: now,
            editHistory: [],
          }
        : {
            id: registrationId,
            role: 'student',
            couponCode,
            preferredLanguage: input.preferredLanguage,
            fullName: input.fullName.trim(),
            phone: normalizeBangladeshPhone(input.phone),
            email: normalizedEmail,
            passwordHash,
            studentClass: input.studentClass,
            educationStream: input.educationStream,
            pathway: input.pathway,
            status: 'pending',
            submittedAt: now,
            editHistory: [],
          };

    db.registrations.unshift(registration);
    // Mark coupon used inside the same database write
    const coupon = db.coupons.find((c) => c.code === couponCode);
    if (coupon) {
      coupon.status = 'used';
      coupon.usedAt = now;
      coupon.usedByRegistrationId = registrationId;
    }
    saveDatabase(db);

    return { ok: true, registration };
  },

  updateRegistration(
    id: string,
    patch: RegistrationEditablePatch,
    now = Date.now()
  ): { ok: true; registration: PendingRegistration } | { ok: false; errorKey: string } {
    const db = loadDatabase(now);
    const reg = db.registrations.find((r) => r.id === id);
    if (!reg) {
      return { ok: false, errorKey: 'registrations.notFound' };
    }
    if (reg.status === 'rejected') {
      return { ok: false, errorKey: 'registrations.alreadyReviewed' };
    }

    const previousEmailLower = reg.email.toLowerCase();
    const linkedUser =
      reg.status === 'approved'
        ? db.users.find((u) => u.email.toLowerCase() === previousEmailLower)
        : undefined;

    if (patch.fullName !== undefined) {
      const check = validateFullName(patch.fullName);
      if (!check.valid) return { ok: false, errorKey: check.errorKey };
    }
    if (patch.email !== undefined) {
      const check = validateEmail(patch.email);
      if (!check.valid) return { ok: false, errorKey: check.errorKey };
      const nextEmailLower = patch.email.trim().toLowerCase();
      const emailTakenByOtherUser = db.users.some(
        (u) => u.email.toLowerCase() === nextEmailLower && u.id !== linkedUser?.id
      );
      const emailTakenByOtherPending = db.registrations.some(
        (r) =>
          r.id !== reg.id &&
          r.status === 'pending' &&
          r.email.toLowerCase() === nextEmailLower
      );
      if (emailTakenByOtherUser || emailTakenByOtherPending) {
        return { ok: false, errorKey: 'validation.emailInUse' };
      }
    }
    if (reg.role === 'student' && patch.phone !== undefined) {
      const check = validateBangladeshPhone(patch.phone);
      if (!check.valid) return { ok: false, errorKey: check.errorKey };
      const nextPhone = normalizeBangladeshPhone(patch.phone);
      const phoneTakenByOtherUser = db.users.some(
        (u) => u.phone === nextPhone && u.id !== linkedUser?.id
      );
      const phoneTakenByOtherPending = db.registrations.some(
        (r) => r.id !== reg.id && r.status === 'pending' && r.phone === nextPhone
      );
      if (phoneTakenByOtherUser || phoneTakenByOtherPending) {
        return { ok: false, errorKey: 'validation.phoneInUse' };
      }
    }
    if (reg.role === 'teacher' && patch.teacherId !== undefined) {
      const check = validateTeacherId(patch.teacherId);
      if (!check.valid) return { ok: false, errorKey: check.errorKey };
    }

    const recordEdit = (field: string, oldVal: unknown, newVal: unknown) => {
      const oldStr = oldVal === undefined || oldVal === null ? '' : String(oldVal);
      const newStr = newVal === undefined || newVal === null ? '' : String(newVal);
      if (oldStr !== newStr) {
        const entry: EditHistoryEntry = {
          id: generateId('edit'),
          field,
          oldValue: oldStr,
          newValue: newStr,
          editedAt: now,
        };
        reg.editHistory.unshift(entry);
      }
    };

    if (patch.fullName !== undefined) {
      const trimmed = patch.fullName.trim();
      recordEdit('fullName', reg.fullName, trimmed);
      reg.fullName = trimmed;
    }
    if (patch.email !== undefined) {
      const normalized = patch.email.trim().toLowerCase();
      recordEdit('email', reg.email, normalized);
      reg.email = normalized;
    }
    if (patch.preferredLanguage !== undefined) {
      recordEdit('preferredLanguage', reg.preferredLanguage, patch.preferredLanguage);
      reg.preferredLanguage = patch.preferredLanguage;
    }
    if (reg.role === 'teacher' && patch.teacherId !== undefined) {
      const trimmed = patch.teacherId.trim();
      recordEdit('teacherId', reg.teacherId, trimmed);
      reg.teacherId = trimmed;
    }
    if (reg.role === 'student') {
      if (patch.phone !== undefined) {
        const cleaned = normalizeBangladeshPhone(patch.phone);
        recordEdit('phone', reg.phone, cleaned);
        reg.phone = cleaned;
      }
      if (patch.studentClass !== undefined) {
        recordEdit('studentClass', reg.studentClass, patch.studentClass);
        reg.studentClass = patch.studentClass;
      }
      if (patch.educationStream !== undefined) {
        recordEdit('educationStream', reg.educationStream, patch.educationStream);
        reg.educationStream = patch.educationStream;
      }
      if (patch.pathway !== undefined) {
        recordEdit('pathway', reg.pathway, patch.pathway);
        reg.pathway = patch.pathway;
      }
    }

    if (linkedUser) {
      linkedUser.fullName = reg.fullName;
      linkedUser.email = reg.email;
      linkedUser.phone = reg.phone;
      linkedUser.preferredLanguage = reg.preferredLanguage;
      linkedUser.teacherId = reg.teacherId;
      linkedUser.studentClass = reg.studentClass;
      linkedUser.educationStream = reg.educationStream;
      linkedUser.pathway = reg.pathway;
    }

    saveDatabase(db);
    return { ok: true, registration: reg };
  },

  approveRegistration(
    id: string,
    now = Date.now()
  ): { ok: true; registration: PendingRegistration; user: UserAccount } | { ok: false; errorKey: string } {
    const db = loadDatabase(now);
    const reg = db.registrations.find((r) => r.id === id);
    if (!reg) {
      return { ok: false, errorKey: 'registrations.notFound' };
    }
    if (reg.status !== 'pending') {
      return { ok: false, errorKey: 'registrations.alreadyReviewed' };
    }

    const emailExists = db.users.some(
      (u) => u.email.toLowerCase() === reg.email.toLowerCase()
    );
    if (emailExists) {
      return { ok: false, errorKey: 'validation.emailInUse' };
    }
    if (reg.phone) {
      const phoneExists = db.users.some((u) => u.phone === reg.phone);
      if (phoneExists) {
        return { ok: false, errorKey: 'validation.phoneInUse' };
      }
    }

    const user: UserAccount = {
      id: generateId(reg.role),
      role: reg.role,
      fullName: reg.fullName,
      email: reg.email,
      phone: reg.phone,
      passwordHash: reg.passwordHash,
      mustChangePassword: false,
      preferredLanguage: reg.preferredLanguage,
      createdAt: now,
      teacherId: reg.teacherId,
      studentClass: reg.studentClass,
      educationStream: reg.educationStream,
      pathway: reg.pathway,
    };

    reg.status = 'approved';
    reg.reviewedAt = now;
    db.users.push(user);
    saveDatabase(db);

    return { ok: true, registration: reg, user };
  },

  rejectRegistration(
    id: string,
    reason: string,
    now = Date.now()
  ): { ok: true; registration: PendingRegistration } | { ok: false; errorKey: string } {
    const trimmedReason = reason.trim();
    if (!trimmedReason) {
      return { ok: false, errorKey: 'registrations.rejectReasonRequired' };
    }

    const db = loadDatabase(now);
    const reg = db.registrations.find((r) => r.id === id);
    if (!reg) {
      return { ok: false, errorKey: 'registrations.notFound' };
    }
    if (reg.status !== 'pending') {
      return { ok: false, errorKey: 'registrations.alreadyReviewed' };
    }

    reg.status = 'rejected';
    reg.rejectionReason = trimmedReason;
    reg.reviewedAt = now;
    saveDatabase(db);

    return { ok: true, registration: reg };
  },
};
