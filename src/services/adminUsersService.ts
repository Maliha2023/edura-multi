import type { CurriculumSubTrack, StudentClass, UserAccount } from '../types/domain';
import { hashPassword } from '../utils/crypto';
import { validateEmail, validateFullName, validatePassword } from '../utils/validation';
import { loadDatabase, saveDatabase } from './storage';

export type AdminUserPathway = 'bangla_version' | 'english_version';
export type DirectoryRole = 'teacher' | 'student';
export type AcademicClassLevel = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;
export type AcademicGroup = 'Science' | 'Arts' | 'Commerce';
export type RegistrationSourceType = 'coupon_auto' | 'admin_manual';
export type DirectoryUserStatus = 'active' | 'suspended';

export const ACADEMIC_CLASSES: AcademicClassLevel[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
export const ACADEMIC_GROUPS: AcademicGroup[] = ['Science', 'Arts', 'Commerce'];
export const PENDING_EXPIRY_WINDOW_MS = 48 * 60 * 60 * 1000;

export interface PathwayPendingRegistration {
  id: string;
  pathway: AdminUserPathway;
  role: DirectoryRole;
  fullName: string;
  email: string;
  academicClass: AcademicClassLevel;
  academicGroup: AcademicGroup | null;
  couponCode: string;
  submittedAt: number;
  expiresAt: number;
  passwordHash: string;
}

export interface PathwayUserProfile {
  id: string;
  pathway: AdminUserPathway;
  role: DirectoryRole;
  fullName: string;
  email: string;
  academicClass: AcademicClassLevel;
  academicGroup: AcademicGroup | null;
  registrationType: RegistrationSourceType;
  status: DirectoryUserStatus;
  couponCode?: string;
  joinedAt: number;
  updatedAt: number;
  passwordHash: string;
}

interface AdminUsersStore {
  pendingRegistrations: PathwayPendingRegistration[];
  profiles: PathwayUserProfile[];
}

export interface DirectoryFilterCriteria {
  role: DirectoryRole;
  query?: string;
  academicClass?: AcademicClassLevel | 'all';
  academicGroup?: AcademicGroup | 'all';
  status?: DirectoryUserStatus | 'all';
  registrationType?: RegistrationSourceType | 'all';
}

export interface PendingFilterCriteria {
  role: DirectoryRole;
  academicGroup?: AcademicGroup | 'all';
}

export interface ManualRegistrationInput {
  pathway: AdminUserPathway;
  role: DirectoryRole;
  fullName: string;
  email: string;
  temporaryPassword: string;
  academicClass: AcademicClassLevel;
  academicGroup: AcademicGroup | null;
}

const USERS_STORAGE_KEY = 'edura_admin_users_workspace_v1';
let memoryUsersStore: string | null = null;

function canUseLocalStorage(): boolean {
  try {
    return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
  } catch {
    return false;
  }
}

export function resolveAdminPathway(
  selectedPathway?: CurriculumSubTrack
): AdminUserPathway | null {
  if (!selectedPathway || selectedPathway === 'Bangla Version') {
    return 'bangla_version';
  }
  if (selectedPathway === 'English Version') {
    return 'english_version';
  }
  return null;
}

export function getPathwayDisplayName(pathway: AdminUserPathway): string {
  return pathway === 'bangla_version' ? 'Bangla Version' : 'English Version';
}

export function isGroupApplicableForClass(academicClass: AcademicClassLevel): boolean {
  return academicClass >= 9 && academicClass <= 12;
}

export function normalizeAcademicGroup(
  academicClass: AcademicClassLevel,
  group: AcademicGroup | null | undefined
): AcademicGroup | null {
  if (!isGroupApplicableForClass(academicClass)) {
    return null;
  }
  if (group === 'Science' || group === 'Arts' || group === 'Commerce') {
    return group;
  }
  return 'Science';
}

export function formatAcademicLevel(
  academicClass: AcademicClassLevel,
  academicGroup: AcademicGroup | null
): string {
  if (isGroupApplicableForClass(academicClass) && academicGroup) {
    return `Class ${academicClass} • ${academicGroup}`;
  }
  return `Class ${academicClass}`;
}

export function formatCountdownRemaining(
  expiresAt: number,
  now = Date.now()
): { text: string; expired: boolean; urgent: boolean } {
  const diff = expiresAt - now;
  if (diff <= 0) {
    return { text: 'Expired', expired: true, urgent: true };
  }
  const totalSeconds = Math.floor(diff / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return {
    text: `${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s`,
    expired: false,
    urgent: hours < 6,
  };
}

export function generateRandomPassword(length = 12): string {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghijkmnpqrstuvwxyz';
  const digits = '23456789';
  const symbols = '@#$%&*!';
  const all = upper + lower + digits + symbols;

  const pick = (pool: string) => pool[Math.floor(Math.random() * pool.length)];
  const chars = [pick(upper), pick(lower), pick(digits), pick(symbols)];
  while (chars.length < Math.max(8, length)) {
    chars.push(pick(all));
  }
  // Fisher-Yates shuffle
  for (let i = chars.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join('');
}

export function getUserInitials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'U';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function escapeCsvCell(value: string): string {
  const str = String(value ?? '');
  if (/[",\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function buildUsersCsv(profiles: PathwayUserProfile[]): string {
  const headers = [
    'User ID',
    'Full Name',
    'Email',
    'Role',
    'Pathway',
    'Class',
    'Group',
    'Entry Source',
    'Status',
    'Joined Date',
  ];

  const rows = profiles.map((p) => [
    p.id,
    p.fullName,
    p.email,
    p.role === 'teacher' ? 'Teacher' : 'Student',
    getPathwayDisplayName(p.pathway),
    `Class ${p.academicClass}`,
    p.academicGroup ?? '',
    p.registrationType === 'coupon_auto' ? 'Auto Coupon' : 'Manual',
    p.status === 'active' ? 'Active' : 'Suspended',
    new Date(p.joinedAt).toISOString().slice(0, 10),
  ]);

  return [headers, ...rows]
    .map((row) => row.map(escapeCsvCell).join(','))
    .join('\r\n');
}

function createSeedUsersStore(now = Date.now()): AdminUsersStore {
  const hour = 60 * 60 * 1000;
  const day = 24 * hour;

  const pendingRegistrations: PathwayPendingRegistration[] = [
    // Bangla Version — Pending Teachers
    {
      id: 'pend-bv-t1',
      pathway: 'bangla_version',
      role: 'teacher',
      fullName: 'Farhana Rahman',
      email: 'farhana.bv@eduramulti.edu.bd',
      academicClass: 10,
      academicGroup: 'Science',
      couponCode: 'T-10482',
      submittedAt: now - 6 * hour,
      expiresAt: now + 42 * hour,
      passwordHash: hashPassword('Farhana@2026'),
    },
    {
      id: 'pend-bv-t2',
      pathway: 'bangla_version',
      role: 'teacher',
      fullName: 'Mahmudul Hasan',
      email: 'mahmudul.bv@eduramulti.edu.bd',
      academicClass: 8,
      academicGroup: null,
      couponCode: 'T-21904',
      submittedAt: now - 44 * hour,
      expiresAt: now + 4 * hour,
      passwordHash: hashPassword('Mahmud@2026'),
    },
    // Bangla Version — Pending Students
    {
      id: 'pend-bv-s1',
      pathway: 'bangla_version',
      role: 'student',
      fullName: 'Tanvir Ahmed',
      email: 'tanvir.bv@student.edu.bd',
      academicClass: 10,
      academicGroup: 'Science',
      couponCode: 'S-20815',
      submittedAt: now - 3 * hour,
      expiresAt: now + 45 * hour,
      passwordHash: hashPassword('Tanvir@2026'),
    },
    {
      id: 'pend-bv-s2',
      pathway: 'bangla_version',
      role: 'student',
      fullName: 'Nusrat Jahan',
      email: 'nusrat.bv@student.edu.bd',
      academicClass: 11,
      academicGroup: 'Arts',
      couponCode: 'S-31490',
      submittedAt: now - 14 * hour,
      expiresAt: now + 34 * hour,
      passwordHash: hashPassword('Nusrat@2026'),
    },
    {
      id: 'pend-bv-s3',
      pathway: 'bangla_version',
      role: 'student',
      fullName: 'Rafiul Islam',
      email: 'rafiul.bv@student.edu.bd',
      academicClass: 12,
      academicGroup: 'Commerce',
      couponCode: 'S-49201',
      submittedAt: now - 43 * hour,
      expiresAt: now + 5 * hour,
      passwordHash: hashPassword('Rafiul@2026'),
    },
    {
      id: 'pend-bv-s4',
      pathway: 'bangla_version',
      role: 'student',
      fullName: 'Sadia Afrin',
      email: 'sadia.bv@student.edu.bd',
      academicClass: 6,
      academicGroup: null,
      couponCode: 'S-58312',
      submittedAt: now - 9 * hour,
      expiresAt: now + 39 * hour,
      passwordHash: hashPassword('Sadia@2026'),
    },

    // English Version — Pending Teachers
    {
      id: 'pend-ev-t1',
      pathway: 'english_version',
      role: 'teacher',
      fullName: 'Dr. Sabrina Karim',
      email: 'sabrina.ev@eduramulti.edu.bd',
      academicClass: 11,
      academicGroup: 'Science',
      couponCode: 'T-77412',
      submittedAt: now - 5 * hour,
      expiresAt: now + 43 * hour,
      passwordHash: hashPassword('Sabrina@2026'),
    },
    // English Version — Pending Students
    {
      id: 'pend-ev-s1',
      pathway: 'english_version',
      role: 'student',
      fullName: 'Ayaan Chowdhury',
      email: 'ayaan.ev@student.edu.bd',
      academicClass: 10,
      academicGroup: 'Science',
      couponCode: 'S-88301',
      submittedAt: now - 7 * hour,
      expiresAt: now + 41 * hour,
      passwordHash: hashPassword('Ayaan@2026'),
    },
    {
      id: 'pend-ev-s2',
      pathway: 'english_version',
      role: 'student',
      fullName: 'Zara Rahman',
      email: 'zara.ev@student.edu.bd',
      academicClass: 9,
      academicGroup: 'Commerce',
      couponCode: 'S-91244',
      submittedAt: now - 20 * hour,
      expiresAt: now + 28 * hour,
      passwordHash: hashPassword('Zara@2026'),
    },
  ];

  const profiles: PathwayUserProfile[] = [
    // Bangla Version — Teachers
    {
      id: 'USR-BV-T101',
      pathway: 'bangla_version',
      role: 'teacher',
      fullName: 'Kamrul Hasan',
      email: 'kamrul.bv@school.edu.bd',
      academicClass: 10,
      academicGroup: 'Science',
      registrationType: 'coupon_auto',
      status: 'active',
      couponCode: 'T-10012',
      joinedAt: now - 18 * day,
      updatedAt: now - 4 * day,
      passwordHash: hashPassword('Teacher@1234'),
    },
    {
      id: 'USR-BV-T102',
      pathway: 'bangla_version',
      role: 'teacher',
      fullName: 'Taslima Akter',
      email: 'taslima.bv@school.edu.bd',
      academicClass: 12,
      academicGroup: 'Arts',
      registrationType: 'admin_manual',
      status: 'active',
      joinedAt: now - 12 * day,
      updatedAt: now - 12 * day,
      passwordHash: hashPassword('Teacher@1234'),
    },
    {
      id: 'USR-BV-T103',
      pathway: 'bangla_version',
      role: 'teacher',
      fullName: 'Shafiqul Alam',
      email: 'shafiqul.bv@school.edu.bd',
      academicClass: 5,
      academicGroup: null,
      registrationType: 'admin_manual',
      status: 'suspended',
      joinedAt: now - 29 * day,
      updatedAt: now - 2 * day,
      passwordHash: hashPassword('Teacher@1234'),
    },

    // Bangla Version — Students
    {
      id: 'USR-BV-S201',
      pathway: 'bangla_version',
      role: 'student',
      fullName: 'Nafisa Tasnim',
      email: 'nafisa.bv@student.edu.bd',
      academicClass: 9,
      academicGroup: 'Science',
      registrationType: 'coupon_auto',
      status: 'active',
      couponCode: 'S-12041',
      joinedAt: now - 15 * day,
      updatedAt: now - 3 * day,
      passwordHash: hashPassword('Student@1234'),
    },
    {
      id: 'USR-BV-S202',
      pathway: 'bangla_version',
      role: 'student',
      fullName: 'Mehedi Hasan',
      email: 'mehedi.bv@student.edu.bd',
      academicClass: 11,
      academicGroup: 'Commerce',
      registrationType: 'admin_manual',
      status: 'active',
      joinedAt: now - 9 * day,
      updatedAt: now - 9 * day,
      passwordHash: hashPassword('Student@1234'),
    },
    {
      id: 'USR-BV-S203',
      pathway: 'bangla_version',
      role: 'student',
      fullName: 'Sumaiya Khatun',
      email: 'sumaiya.bv@student.edu.bd',
      academicClass: 5,
      academicGroup: null,
      registrationType: 'coupon_auto',
      status: 'active',
      couponCode: 'S-19344',
      joinedAt: now - 6 * day,
      updatedAt: now - 6 * day,
      passwordHash: hashPassword('Student@1234'),
    },
    {
      id: 'USR-BV-S204',
      pathway: 'bangla_version',
      role: 'student',
      fullName: 'Ariful Haque',
      email: 'ariful.bv@student.edu.bd',
      academicClass: 10,
      academicGroup: 'Arts',
      registrationType: 'coupon_auto',
      status: 'suspended',
      couponCode: 'S-18720',
      joinedAt: now - 24 * day,
      updatedAt: now - 1 * day,
      passwordHash: hashPassword('Student@1234'),
    },

    // English Version — Teachers
    {
      id: 'USR-EV-T301',
      pathway: 'english_version',
      role: 'teacher',
      fullName: 'Rezaul Karim',
      email: 'rezaul.ev@school.edu.bd',
      academicClass: 10,
      academicGroup: 'Science',
      registrationType: 'coupon_auto',
      status: 'active',
      couponCode: 'T-70210',
      joinedAt: now - 16 * day,
      updatedAt: now - 5 * day,
      passwordHash: hashPassword('Teacher@1234'),
    },
    {
      id: 'USR-EV-T302',
      pathway: 'english_version',
      role: 'teacher',
      fullName: 'Nadia Sultana',
      email: 'nadia.ev@school.edu.bd',
      academicClass: 7,
      academicGroup: null,
      registrationType: 'admin_manual',
      status: 'active',
      joinedAt: now - 8 * day,
      updatedAt: now - 8 * day,
      passwordHash: hashPassword('Teacher@1234'),
    },

    // English Version — Students
    {
      id: 'USR-EV-S401',
      pathway: 'english_version',
      role: 'student',
      fullName: 'Ishan Rahman',
      email: 'ishan.ev@student.edu.bd',
      academicClass: 10,
      academicGroup: 'Science',
      registrationType: 'coupon_auto',
      status: 'active',
      couponCode: 'S-80211',
      joinedAt: now - 11 * day,
      updatedAt: now - 2 * day,
      passwordHash: hashPassword('Student@1234'),
    },
    {
      id: 'USR-EV-S402',
      pathway: 'english_version',
      role: 'student',
      fullName: 'Maisha Siddiqui',
      email: 'maisha.ev@student.edu.bd',
      academicClass: 12,
      academicGroup: 'Commerce',
      registrationType: 'admin_manual',
      status: 'active',
      joinedAt: now - 5 * day,
      updatedAt: now - 5 * day,
      passwordHash: hashPassword('Student@1234'),
    },
    {
      id: 'USR-EV-S403',
      pathway: 'english_version',
      role: 'student',
      fullName: 'Rayhan Kabir',
      email: 'rayhan.ev@student.edu.bd',
      academicClass: 4,
      academicGroup: null,
      registrationType: 'coupon_auto',
      status: 'suspended',
      couponCode: 'S-81455',
      joinedAt: now - 21 * day,
      updatedAt: now - 1 * day,
      passwordHash: hashPassword('Student@1234'),
    },
  ];

  return { pendingRegistrations, profiles };
}

function loadUsersStore(now = Date.now()): AdminUsersStore {
  const raw = canUseLocalStorage() ? window.localStorage.getItem(USERS_STORAGE_KEY) : memoryUsersStore;
  if (!raw) {
    const seeded = createSeedUsersStore(now);
    saveUsersStore(seeded);
    return seeded;
  }
  try {
    const parsed = JSON.parse(raw) as AdminUsersStore;
    if (
      !parsed ||
      !Array.isArray(parsed.pendingRegistrations) ||
      !Array.isArray(parsed.profiles)
    ) {
      const seeded = createSeedUsersStore(now);
      saveUsersStore(seeded);
      return seeded;
    }
    return parsed;
  } catch {
    const seeded = createSeedUsersStore(now);
    saveUsersStore(seeded);
    return seeded;
  }
}

function saveUsersStore(store: AdminUsersStore): void {
  const serialized = JSON.stringify(store);
  if (canUseLocalStorage()) {
    window.localStorage.setItem(USERS_STORAGE_KEY, serialized);
  } else {
    memoryUsersStore = serialized;
  }
}

export function resetAdminUsersStore(now = Date.now()): AdminUsersStore {
  const seeded = createSeedUsersStore(now);
  saveUsersStore(seeded);
  return seeded;
}

function generateProfileId(pathway: AdminUserPathway, role: DirectoryRole): string {
  const pwCode = pathway === 'bangla_version' ? 'BV' : 'EV';
  const roleCode = role === 'teacher' ? 'T' : 'S';
  const suffix = Math.floor(1000 + Math.random() * 9000);
  return `USR-${pwCode}-${roleCode}${suffix}`;
}

function syncProfileToAuthDb(profile: PathwayUserProfile, mustChangePassword: boolean, now: number) {
  const db = loadDatabase(now);
  const existing = db.users.find(
    (u) => u.id === profile.id || u.email.toLowerCase() === profile.email.toLowerCase()
  );
  const mappedClass: StudentClass | undefined =
    profile.academicClass >= 6 && profile.academicClass <= 12
      ? (profile.academicClass as StudentClass)
      : undefined;

  if (existing) {
    existing.fullName = profile.fullName;
    existing.email = profile.email;
    existing.passwordHash = profile.passwordHash;
    existing.mustChangePassword = mustChangePassword;
    existing.studentClass = profile.role === 'student' ? mappedClass : existing.studentClass;
    existing.pathway = profile.academicGroup ?? getPathwayDisplayName(profile.pathway);
  } else {
    const newAccount: UserAccount = {
      id: profile.id,
      role: profile.role,
      fullName: profile.fullName,
      email: profile.email,
      passwordHash: profile.passwordHash,
      mustChangePassword,
      preferredLanguage: profile.pathway === 'bangla_version' ? 'bn' : 'en',
      createdAt: profile.joinedAt,
      studentClass: profile.role === 'student' ? mappedClass : undefined,
      educationStream: 'Bangladesh National Curriculum (NCTB)',
      pathway: profile.academicGroup ?? getPathwayDisplayName(profile.pathway),
    };
    db.users.push(newAccount);
  }

  if (profile.couponCode) {
    const coupon = db.coupons.find((c) => c.code === profile.couponCode);
    if (coupon && coupon.status !== 'used') {
      coupon.status = 'used';
      coupon.usedAt = now;
    }
  }

  saveDatabase(db);
}

function removeProfileFromAuthDb(email: string, id: string, now: number) {
  const db = loadDatabase(now);
  const nextUsers = db.users.filter(
    (u) => u.id !== id && u.email.toLowerCase() !== email.toLowerCase()
  );
  if (nextUsers.length !== db.users.length) {
    db.users = nextUsers;
    saveDatabase(db);
  }
}

export const adminUsersService = {
  // ---- Pending Approvals (Strictly Pathway-Scoped) ----
  listPending(pathway: AdminUserPathway, now = Date.now()): PathwayPendingRegistration[] {
    const store = loadUsersStore(now);
    return store.pendingRegistrations
      .filter((item) => item.pathway === pathway)
      .sort((a, b) => a.expiresAt - b.expiresAt);
  },

  filterPending(
    items: PathwayPendingRegistration[],
    criteria: PendingFilterCriteria
  ): PathwayPendingRegistration[] {
    return items.filter((item) => {
      if (item.role !== criteria.role) return false;
      if (
        criteria.role === 'student' &&
        criteria.academicGroup &&
        criteria.academicGroup !== 'all'
      ) {
        if (!isGroupApplicableForClass(item.academicClass)) return false;
        if (item.academicGroup !== criteria.academicGroup) return false;
      }
      return true;
    });
  },

  editPendingRegistration(
    pathway: AdminUserPathway,
    id: string,
    patch: {
      fullName: string;
      academicClass: AcademicClassLevel;
      academicGroup: AcademicGroup | null;
    },
    now = Date.now()
  ): { ok: true; record: PathwayPendingRegistration } | { ok: false; error: string } {
    const nameCheck = validateFullName(patch.fullName);
    if (!nameCheck.valid) {
      return { ok: false, error: 'Please enter a valid full name (at least 2 characters).' };
    }

    const store = loadUsersStore(now);
    const target = store.pendingRegistrations.find(
      (item) => item.id === id && item.pathway === pathway
    );
    if (!target) {
      return { ok: false, error: 'Pending registration not found in your active pathway.' };
    }

    target.fullName = patch.fullName.trim();
    target.academicClass = patch.academicClass;
    target.academicGroup = normalizeAcademicGroup(patch.academicClass, patch.academicGroup);
    saveUsersStore(store);

    return { ok: true, record: { ...target } };
  },

  approvePendingRegistration(
    pathway: AdminUserPathway,
    id: string,
    now = Date.now()
  ): { ok: true; profile: PathwayUserProfile } | { ok: false; error: string } {
    const store = loadUsersStore(now);
    const idx = store.pendingRegistrations.findIndex(
      (item) => item.id === id && item.pathway === pathway
    );
    if (idx === -1) {
      return { ok: false, error: 'Pending registration not found in your active pathway.' };
    }

    const pending = store.pendingRegistrations[idx];
    const emailConflict = store.profiles.some(
      (p) => p.email.toLowerCase() === pending.email.toLowerCase()
    );
    if (emailConflict) {
      return { ok: false, error: 'An account with this email already exists in the directory.' };
    }

    const profile: PathwayUserProfile = {
      id: generateProfileId(pathway, pending.role),
      pathway,
      role: pending.role,
      fullName: pending.fullName,
      email: pending.email.toLowerCase(),
      academicClass: pending.academicClass,
      academicGroup: normalizeAcademicGroup(pending.academicClass, pending.academicGroup),
      registrationType: 'coupon_auto',
      status: 'active',
      couponCode: pending.couponCode,
      joinedAt: now,
      updatedAt: now,
      passwordHash: pending.passwordHash,
    };

    store.pendingRegistrations.splice(idx, 1);
    store.profiles.unshift(profile);
    saveUsersStore(store);

    syncProfileToAuthDb(profile, false, now);
    return { ok: true, profile };
  },

  rejectPendingRegistration(
    pathway: AdminUserPathway,
    id: string,
    now = Date.now()
  ): { ok: true } | { ok: false; error: string } {
    const store = loadUsersStore(now);
    const idx = store.pendingRegistrations.findIndex(
      (item) => item.id === id && item.pathway === pathway
    );
    if (idx === -1) {
      return { ok: false, error: 'Pending registration not found in your active pathway.' };
    }
    store.pendingRegistrations.splice(idx, 1);
    saveUsersStore(store);
    return { ok: true };
  },

  // ---- User Directory (Strictly Pathway-Scoped) ----
  listProfiles(pathway: AdminUserPathway, now = Date.now()): PathwayUserProfile[] {
    const store = loadUsersStore(now);
    return store.profiles
      .filter((p) => p.pathway === pathway)
      .sort((a, b) => b.joinedAt - a.joinedAt);
  },

  filterProfiles(
    profiles: PathwayUserProfile[],
    criteria: DirectoryFilterCriteria
  ): PathwayUserProfile[] {
    const q = (criteria.query ?? '').trim().toLowerCase();
    return profiles.filter((p) => {
      if (p.role !== criteria.role) return false;
      if (criteria.academicClass && criteria.academicClass !== 'all') {
        if (p.academicClass !== criteria.academicClass) return false;
      }
      if (criteria.academicGroup && criteria.academicGroup !== 'all') {
        if (p.academicGroup !== criteria.academicGroup) return false;
      }
      if (criteria.status && criteria.status !== 'all') {
        if (p.status !== criteria.status) return false;
      }
      if (criteria.registrationType && criteria.registrationType !== 'all') {
        if (p.registrationType !== criteria.registrationType) return false;
      }
      if (q) {
        const haystack = `${p.id} ${p.fullName} ${p.email}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  },

  updateProfileAcademicInfo(
    pathway: AdminUserPathway,
    id: string,
    patch: {
      fullName: string;
      academicClass: AcademicClassLevel;
      academicGroup: AcademicGroup | null;
    },
    now = Date.now()
  ): { ok: true; profile: PathwayUserProfile } | { ok: false; error: string } {
    const nameCheck = validateFullName(patch.fullName);
    if (!nameCheck.valid) {
      return { ok: false, error: 'Please enter a valid full name (at least 2 characters).' };
    }

    const store = loadUsersStore(now);
    const target = store.profiles.find((p) => p.id === id && p.pathway === pathway);
    if (!target) {
      return { ok: false, error: 'User profile not found in your active pathway.' };
    }

    target.fullName = patch.fullName.trim();
    target.academicClass = patch.academicClass;
    target.academicGroup = normalizeAcademicGroup(patch.academicClass, patch.academicGroup);
    target.updatedAt = now;
    saveUsersStore(store);

    syncProfileToAuthDb(target, false, now);
    return { ok: true, profile: { ...target } };
  },

  toggleProfileStatus(
    pathway: AdminUserPathway,
    id: string,
    now = Date.now()
  ): { ok: true; profile: PathwayUserProfile } | { ok: false; error: string } {
    const store = loadUsersStore(now);
    const target = store.profiles.find((p) => p.id === id && p.pathway === pathway);
    if (!target) {
      return { ok: false, error: 'User profile not found in your active pathway.' };
    }

    target.status = target.status === 'active' ? 'suspended' : 'active';
    target.updatedAt = now;
    saveUsersStore(store);

    return { ok: true, profile: { ...target } };
  },

  resetProfilePassword(
    pathway: AdminUserPathway,
    id: string,
    newTemporaryPassword: string,
    now = Date.now()
  ):
    | { ok: true; profile: PathwayUserProfile; temporaryPassword: string }
    | { ok: false; error: string } {
    const passCheck = validatePassword(newTemporaryPassword);
    if (!passCheck.valid) {
      return { ok: false, error: 'Temporary password must be at least 8 characters long.' };
    }

    const store = loadUsersStore(now);
    const target = store.profiles.find((p) => p.id === id && p.pathway === pathway);
    if (!target) {
      return { ok: false, error: 'User profile not found in your active pathway.' };
    }

    target.passwordHash = hashPassword(newTemporaryPassword);
    target.updatedAt = now;
    saveUsersStore(store);

    syncProfileToAuthDb(target, true, now);
    return { ok: true, profile: { ...target }, temporaryPassword: newTemporaryPassword };
  },

  deleteProfile(
    pathway: AdminUserPathway,
    id: string,
    now = Date.now()
  ): { ok: true } | { ok: false; error: string } {
    const store = loadUsersStore(now);
    const idx = store.profiles.findIndex((p) => p.id === id && p.pathway === pathway);
    if (idx === -1) {
      return { ok: false, error: 'User profile not found in your active pathway.' };
    }
    const [removed] = store.profiles.splice(idx, 1);
    saveUsersStore(store);
    removeProfileFromAuthDb(removed.email, removed.id, now);
    return { ok: true };
  },

  // ---- Manual Registration (Direct Admin Entry, Strictly Pathway-Scoped) ----
  createManualAccount(
    input: ManualRegistrationInput,
    now = Date.now()
  ):
    | { ok: true; profile: PathwayUserProfile; temporaryPassword: string }
    | { ok: false; error: string } {
    const nameCheck = validateFullName(input.fullName);
    if (!nameCheck.valid) {
      return { ok: false, error: 'Please enter a valid full name (at least 2 characters).' };
    }

    const emailCheck = validateEmail(input.email);
    if (!emailCheck.valid) {
      return { ok: false, error: 'Please enter a valid email address.' };
    }

    const passCheck = validatePassword(input.temporaryPassword);
    if (!passCheck.valid) {
      return { ok: false, error: 'Temporary password must be at least 8 characters long.' };
    }

    const normalizedEmail = input.email.trim().toLowerCase();
    const store = loadUsersStore(now);
    const existingProfile = store.profiles.some(
      (p) => p.email.toLowerCase() === normalizedEmail
    );
    const existingPending = store.pendingRegistrations.some(
      (r) => r.email.toLowerCase() === normalizedEmail
    );
    if (existingProfile || existingPending) {
      return {
        ok: false,
        error: 'An account or pending registration already exists with this email address.',
      };
    }

    const profile: PathwayUserProfile = {
      id: generateProfileId(input.pathway, input.role),
      pathway: input.pathway,
      role: input.role,
      fullName: input.fullName.trim(),
      email: normalizedEmail,
      academicClass: input.academicClass,
      academicGroup: normalizeAcademicGroup(input.academicClass, input.academicGroup),
      registrationType: 'admin_manual',
      status: 'active',
      joinedAt: now,
      updatedAt: now,
      passwordHash: hashPassword(input.temporaryPassword),
    };

    store.profiles.unshift(profile);
    saveUsersStore(store);

    syncProfileToAuthDb(profile, true, now);
    return { ok: true, profile, temporaryPassword: input.temporaryPassword };
  },
};
