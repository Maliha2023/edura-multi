import type {
  AuthSession,
  CurriculumSubTrack,
  DeviceSession,
  EducationStream,
  Language,
  UserAccount,
  UserRole,
} from '../types/domain';
import { hashPassword, verifyPassword } from '../utils/crypto';
import {
  normalizeBangladeshPhone,
  validateBangladeshPhone,
  validateEmail,
  validatePassword,
} from '../utils/validation';
import { loadDatabase, saveDatabase } from './storage';

export const MAX_FAILED_LOGIN_ATTEMPTS = 5;
export const LOGIN_LOCK_DURATION_MS = 5 * 60 * 1000; // 5 minutes mock lock
export const DEMO_OTP_CODE = '123456';

export type LoginResult =
  | { ok: true; session: AuthSession }
  | {
      ok: false;
      reason: 'invalid_credentials' | 'pending_approval' | 'locked' | 'role_mismatch';
      remainingSeconds?: number;
      attemptsRemaining?: number;
      actualRole?: UserRole;
    };

export type ChangePasswordResult =
  | { ok: true; session: AuthSession | null }
  | { ok: false; errorKey: string };

function normalizeIdentifier(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.includes('@')) {
    return trimmed.toLowerCase();
  }
  return normalizeBangladeshPhone(trimmed);
}

function findUserByIdentifier(users: UserAccount[], identifier: string): UserAccount | undefined {
  const normalized = normalizeIdentifier(identifier);
  if (!normalized) return undefined;
  return users.find(
    (u) => u.email.toLowerCase() === normalized || (u.phone && u.phone === normalized)
  );
}

export interface LoginCurriculumContext {
  stream?: EducationStream;
  pathway?: CurriculumSubTrack;
}

function buildSession(
  user: UserAccount,
  now: number,
  context?: LoginCurriculumContext
): AuthSession {
  return {
    userId: user.id,
    role: user.role,
    fullName: user.fullName,
    email: user.email,
    phone: user.phone,
    mustChangePassword: user.mustChangePassword,
    preferredLanguage: user.preferredLanguage,
    selectedStream: context?.stream,
    selectedPathway: context?.pathway,
    loggedInAt: now,
  };
}

function createDefaultDeviceSessionsForUser(userId: string, now: number): DeviceSession[] {
  const hour = 60 * 60 * 1000;
  return [
    {
      id: `dev-current-${userId}`,
      userId,
      deviceName: 'Desktop Browser',
      deviceType: 'desktop',
      browser: 'Chrome · Current Device',
      location: 'Dhaka, Bangladesh',
      lastActiveAt: now,
      isCurrent: true,
    },
    {
      id: `dev-mobile-${userId}`,
      userId,
      deviceName: 'Android Phone (Galaxy A54)',
      deviceType: 'mobile',
      browser: 'Chrome Mobile',
      location: 'Dhaka, Bangladesh',
      lastActiveAt: now - 3 * hour,
      isCurrent: false,
    },
    {
      id: `dev-laptop-${userId}`,
      userId,
      deviceName: 'Office Laptop (Windows 11)',
      deviceType: 'desktop',
      browser: 'Microsoft Edge',
      location: 'Chattogram, Bangladesh',
      lastActiveAt: now - 26 * hour,
      isCurrent: false,
    },
  ];
}

function ensureUserDeviceSessions(
  deviceSessions: DeviceSession[],
  userId: string,
  now: number
): DeviceSession[] {
  const existing = deviceSessions.filter((d) => d.userId === userId);
  if (existing.length > 0) {
    const hasCurrent = existing.some((d) => d.isCurrent);
    if (hasCurrent) {
      return deviceSessions.map((d) =>
        d.userId === userId && d.isCurrent ? { ...d, lastActiveAt: now } : d
      );
    }
    const firstId = existing[0].id;
    return deviceSessions.map((d) =>
      d.id === firstId ? { ...d, isCurrent: true, lastActiveAt: now } : d
    );
  }
  return [...deviceSessions, ...createDefaultDeviceSessionsForUser(userId, now)];
}

export const authService = {
  getCurrentSession(now = Date.now()): AuthSession | null {
    const db = loadDatabase(now);
    return db.session;
  },

  getCurrentUserProfile(now = Date.now()): Omit<UserAccount, 'passwordHash'> | null {
    const db = loadDatabase(now);
    if (!db.session) return null;
    const user = db.users.find((u) => u.id === db.session?.userId);
    if (!user) return null;
    const { passwordHash: _omitted, ...safeProfile } = user;
    return safeProfile;
  },

  login(
    rawIdentifier: string,
    password: string,
    now = Date.now(),
    expectedRole?: UserRole,
    context?: LoginCurriculumContext
  ): LoginResult {
    const key = normalizeIdentifier(rawIdentifier) || '__empty__';
    const db = loadDatabase(now);

    const existingLock = db.loginLocks[key];
    if (existingLock?.lockedUntil) {
      if (now < existingLock.lockedUntil) {
        return {
          ok: false,
          reason: 'locked',
          remainingSeconds: Math.ceil((existingLock.lockedUntil - now) / 1000),
        };
      }
      // Lock duration elapsed; reset lock state
      delete db.loginLocks[key];
      saveDatabase(db);
    }

    const user = findUserByIdentifier(db.users, key);
    if (user && verifyPassword(password, user.passwordHash)) {
      if (expectedRole && user.role !== expectedRole) {
        return { ok: false, reason: 'role_mismatch', actualRole: user.role };
      }
      delete db.loginLocks[key];
      const session = buildSession(user, now, context);
      db.session = session;
      db.deviceSessions = ensureUserDeviceSessions(db.deviceSessions ?? [], user.id, now);
      saveDatabase(db);
      return { ok: true, session };
    }

    // Check if this person has a pending registration with matching password.
    // Checking password hash prevents revealing account existence to arbitrary guesses.
    const pendingReg = db.registrations.find(
      (r) =>
        r.status === 'pending' &&
        (r.email.toLowerCase() === key || (r.phone && r.phone === key))
    );
    if (pendingReg && verifyPassword(password, pendingReg.passwordHash)) {
      if (expectedRole && pendingReg.role !== expectedRole) {
        return { ok: false, reason: 'role_mismatch', actualRole: pendingReg.role };
      }
      return { ok: false, reason: 'pending_approval' };
    }

    // Record failed attempt
    const currentAttempts = (db.loginLocks[key]?.failedAttempts ?? 0) + 1;
    if (currentAttempts >= MAX_FAILED_LOGIN_ATTEMPTS) {
      const lockedUntil = now + LOGIN_LOCK_DURATION_MS;
      db.loginLocks[key] = {
        failedAttempts: currentAttempts,
        lockedUntil,
      };
      saveDatabase(db);
      return {
        ok: false,
        reason: 'locked',
        remainingSeconds: Math.ceil(LOGIN_LOCK_DURATION_MS / 1000),
      };
    }

    db.loginLocks[key] = {
      failedAttempts: currentAttempts,
      lockedUntil: null,
    };
    saveDatabase(db);

    return {
      ok: false,
      reason: 'invalid_credentials',
      attemptsRemaining: MAX_FAILED_LOGIN_ATTEMPTS - currentAttempts,
    };
  },

  logout(now = Date.now()): void {
    const db = loadDatabase(now);
    db.session = null;
    saveDatabase(db);
  },

  updatePreferredLanguage(language: Language, now = Date.now()): void {
    const db = loadDatabase(now);
    if (!db.session) return;
    db.session.preferredLanguage = language;
    const user = db.users.find((u) => u.id === db.session?.userId);
    if (user) {
      user.preferredLanguage = language;
    }
    saveDatabase(db);
  },

  requestPasswordOtp(rawIdentifier: string, now = Date.now()): { ok: true } | { ok: false; errorKey: string } {
    const normalized = normalizeIdentifier(rawIdentifier);
    if (!normalized) {
      return { ok: false, errorKey: 'changePassword.identifierRequired' };
    }
    // In mock mode we accept any non-empty email/phone format and always emit OTP 123456
    // without revealing whether the account exists before OTP verification.
    loadDatabase(now);
    return { ok: true };
  },

  verifyOtpAndChangePassword(
    rawIdentifier: string,
    otpCode: string,
    newPassword: string,
    now = Date.now(),
    expectedUserId?: string
  ): ChangePasswordResult {
    const trimmedOtp = otpCode.trim();
    if (trimmedOtp !== DEMO_OTP_CODE) {
      return { ok: false, errorKey: 'changePassword.invalidOtp' };
    }

    const passCheck = validatePassword(newPassword);
    if (!passCheck.valid) {
      return { ok: false, errorKey: passCheck.errorKey };
    }

    const db = loadDatabase(now);
    const user = findUserByIdentifier(db.users, rawIdentifier);
    if (!user) {
      return { ok: false, errorKey: 'changePassword.accountNotFound' };
    }
    if (expectedUserId && user.id !== expectedUserId) {
      return { ok: false, errorKey: 'changePassword.wrongAccountIdentifier' };
    }

    // Never store plain-text password. Production auth will use Supabase Auth.
    user.passwordHash = hashPassword(newPassword);
    user.mustChangePassword = false;

    if (db.session && db.session.userId === user.id) {
      db.session = buildSession(user, now, {
        stream: db.session.selectedStream,
        pathway: db.session.selectedPathway,
      });
    }

    saveDatabase(db);
    return { ok: true, session: db.session };
  },

  requestRecoveryOtp(
    rawEmail: string,
    rawPhone: string,
    now = Date.now()
  ): { ok: true } | { ok: false; errorKey: string } {
    const emailCheck = validateEmail(rawEmail);
    if (!emailCheck.valid) {
      return { ok: false, errorKey: emailCheck.errorKey };
    }
    const phoneCheck = validateBangladeshPhone(rawPhone);
    if (!phoneCheck.valid) {
      return { ok: false, errorKey: phoneCheck.errorKey };
    }
    loadDatabase(now);
    return { ok: true };
  },

  verifyRecoveryOtpAndResetPassword(
    rawEmail: string,
    rawPhone: string,
    otpCode: string,
    newPassword: string,
    expectedRole?: UserRole,
    now = Date.now()
  ): ChangePasswordResult {
    const emailCheck = validateEmail(rawEmail);
    if (!emailCheck.valid) {
      return { ok: false, errorKey: emailCheck.errorKey };
    }
    const phoneCheck = validateBangladeshPhone(rawPhone);
    if (!phoneCheck.valid) {
      return { ok: false, errorKey: phoneCheck.errorKey };
    }

    if (otpCode.trim() !== DEMO_OTP_CODE) {
      return { ok: false, errorKey: 'changePassword.invalidOtp' };
    }

    const passCheck = validatePassword(newPassword);
    if (!passCheck.valid) {
      return { ok: false, errorKey: passCheck.errorKey };
    }

    const normalizedEmail = rawEmail.trim().toLowerCase();
    const normalizedPhone = normalizeBangladeshPhone(rawPhone);
    const db = loadDatabase(now);

    const user = db.users.find(
      (u) =>
        u.email.toLowerCase() === normalizedEmail &&
        (!u.phone || u.phone === normalizedPhone) &&
        (!expectedRole || u.role === expectedRole)
    );
    if (!user) {
      return { ok: false, errorKey: 'changePassword.recoveryAccountMismatch' };
    }

    user.passwordHash = hashPassword(newPassword);
    user.mustChangePassword = false;

    if (db.session && db.session.userId === user.id) {
      db.session = buildSession(user, now, {
        stream: db.session.selectedStream,
        pathway: db.session.selectedPathway,
      });
    }

    saveDatabase(db);
    return { ok: true, session: db.session };
  },

  listDeviceSessions(userId: string, now = Date.now()): DeviceSession[] {
    const db = loadDatabase(now);
    const beforeLen = (db.deviceSessions ?? []).length;
    const updated = ensureUserDeviceSessions(db.deviceSessions ?? [], userId, now);
    if (updated.length !== beforeLen) {
      db.deviceSessions = updated;
      saveDatabase(db);
    }
    return updated
      .filter((d) => d.userId === userId)
      .sort((a, b) => Number(b.isCurrent) - Number(a.isCurrent) || b.lastActiveAt - a.lastActiveAt);
  },

  revokeDeviceSession(userId: string, deviceId: string, now = Date.now()): DeviceSession[] {
    const db = loadDatabase(now);
    const currentList = ensureUserDeviceSessions(db.deviceSessions ?? [], userId, now);
    db.deviceSessions = currentList.filter(
      (d) => !(d.userId === userId && d.id === deviceId && !d.isCurrent)
    );
    saveDatabase(db);
    return db.deviceSessions
      .filter((d) => d.userId === userId)
      .sort((a, b) => Number(b.isCurrent) - Number(a.isCurrent) || b.lastActiveAt - a.lastActiveAt);
  },

  revokeOtherDeviceSessions(userId: string, now = Date.now()): DeviceSession[] {
    const db = loadDatabase(now);
    const currentList = ensureUserDeviceSessions(db.deviceSessions ?? [], userId, now);
    db.deviceSessions = currentList.filter((d) => d.userId !== userId || d.isCurrent);
    saveDatabase(db);
    return db.deviceSessions.filter((d) => d.userId === userId);
  },
};
