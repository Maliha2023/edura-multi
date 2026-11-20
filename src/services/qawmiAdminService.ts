import { loadDatabase, saveDatabase } from './storage';
import type { CouponStatus, UserAccount } from '../types/domain';
import { hashPassword, verifyPassword } from '../utils/crypto';
import { validateEmail, validateFullName, validatePassword } from '../utils/validation';

export type QawmiPathway = 'qawmi';
export type QawmiAdminRole = 'teacher' | 'student';
export type QawmiRegistrationType = 'coupon_auto' | 'manual_admin';
export type QawmiUserStatus = 'active' | 'suspended';
export type QawmiNoticeAudience = 'teacher' | 'student' | 'both';
export type QawmiNoticeTag = 'General' | 'Exam' | 'Urgent';

export type QawmiMarhala =
  | 'Maktab / Hifz / Nazera'
  | 'Ibtidaiyyah (Primary Marhala)'
  | 'Mutawassitah (Middle Marhala)'
  | 'Sanawiyyah Ulya (Higher Secondary Marhala)'
  | 'Fazilat (Degree Marhala)'
  | 'Takmil (Masters / Dawra-e-Hadith Marhala)';

export type QawmiFocusBranch =
  | 'General / Kitab'
  | 'Hifzul Quran'
  | 'Tajweed & Qiraat'
  | 'Hadith & Tafsir'
  | 'Fiqh & Usul'
  | 'Arabic & Adab';

export const QAWMI_MARHALAS: readonly QawmiMarhala[] = [
  'Maktab / Hifz / Nazera',
  'Ibtidaiyyah (Primary Marhala)',
  'Mutawassitah (Middle Marhala)',
  'Sanawiyyah Ulya (Higher Secondary Marhala)',
  'Fazilat (Degree Marhala)',
  'Takmil (Masters / Dawra-e-Hadith Marhala)',
] as const;

export const QAWMI_FOCUS_BRANCHES: readonly QawmiFocusBranch[] = [
  'General / Kitab',
  'Hifzul Quran',
  'Tajweed & Qiraat',
  'Hadith & Tafsir',
  'Fiqh & Usul',
  'Arabic & Adab',
] as const;

export interface QawmiAdminCoupon {
  id: string;
  code: string;
  pathway: QawmiPathway;
  role: QawmiAdminRole;
  status: CouponStatus;
  createdAt: number;
  expiresAt: number;
  usedAt?: number;
  issuedBy: string;
}

export interface QawmiAdminPendingRegistration {
  id: string;
  role: QawmiAdminRole;
  pathway: QawmiPathway;
  fullName: string;
  email: string;
  marhala: QawmiMarhala;
  assignedMarhalas?: QawmiMarhala[];
  focusBranch: QawmiFocusBranch;
  primarySubject?: string;
  couponCode: string;
  submittedAt: number;
  expiresAt: number;
}

export interface QawmiAdminUserProfile {
  id: string;
  role: QawmiAdminRole;
  pathway: QawmiPathway;
  fullName: string;
  email: string;
  passwordHash: string;
  marhala: QawmiMarhala;
  assignedMarhalas?: QawmiMarhala[];
  focusBranch: QawmiFocusBranch;
  primarySubject?: string;
  status: QawmiUserStatus;
  registrationType: QawmiRegistrationType;
  couponCode?: string;
  joinedAt: number;
  updatedAt?: number;
}

export interface QawmiAdminNotice {
  id: string;
  pathway: QawmiPathway;
  title: string;
  description: string;
  audience: QawmiNoticeAudience;
  marhala: 'all' | QawmiMarhala;
  focusBranch: 'all' | QawmiFocusBranch;
  tag: QawmiNoticeTag;
  createdAt: number;
  updatedAt: number;
}

export interface QawmiAdminActivityItem {
  id: string;
  pathway: QawmiPathway;
  category: 'coupon' | 'approval' | 'directory' | 'notice' | 'security';
  summary: string;
  actorEmail: string;
  createdAt: number;
}

export interface QawmiOverviewMetrics {
  activeTeachers: number;
  activeStudents: number;
  pendingApprovals: number;
  activeCoupons: number;
}

interface QawmiAdminStore {
  coupons: QawmiAdminCoupon[];
  pending: QawmiAdminPendingRegistration[];
  profiles: QawmiAdminUserProfile[];
  notices: QawmiAdminNotice[];
  activities: QawmiAdminActivityItem[];
  adminSeeded?: boolean;
}

// Shared Qawmi storage key so Student, Teacher, and Admin portals stay synchronized
// while strictly isolated from NCTB, Cambridge/Edexcel, and Alia Madrasa.
const STORAGE_KEY = 'edura_qawmi_workspace_v1';
const FORTY_EIGHT_HOURS_MS = 48 * 60 * 60 * 1000;
const DEFAULT_ADMIN_ACTOR = 'muhtamim@qawmi-madrasa.edu.bd';

let memoryStore: QawmiAdminStore | null = null;

function canUseLocalStorage(): boolean {
  try {
    return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
  } catch {
    return false;
  }
}

export function resolveQawmiAdminPathway(raw?: string | null): QawmiPathway | null {
  if (!raw) return null;
  const normalized = raw.trim().toLowerCase();
  if (
    normalized === 'qawmi' ||
    normalized === 'qawmi madrasa' ||
    normalized === 'qawmi_madrasa' ||
    normalized === 'qawmi panel' ||
    normalized === 'qawmi madrasa panel'
  ) {
    return 'qawmi';
  }
  return null;
}

export function getQawmiPanelName(): string {
  return 'Qawmi Madrasa Panel';
}

export function getQawmiStreamLabel(): string {
  return 'Bangladesh Madrasa Education';
}

export function getQawmiBoardLabel(): string {
  return 'Wifaqul Madarisil Arabia Bangladesh (Befaq / Dars-e-Nizami)';
}

export interface QawmiDemoAdminPreset {
  pathway: QawmiPathway;
  pathwayLabel: 'Qawmi';
  panelName: string;
  quickAccessTitle: string;
  fullName: string;
  email: string;
  password: string;
  phone: string;
}

export function getDemoQawmiAdminPreset(): QawmiDemoAdminPreset {
  return {
    pathway: 'qawmi',
    pathwayLabel: 'Qawmi',
    panelName: 'Qawmi Madrasa Panel',
    quickAccessTitle: 'Quick Qawmi Panel Access',
    fullName: 'Qawmi Madrasa Admin',
    email: 'admin.qawmi@example.com',
    password: 'Admin@1234',
    phone: '01710000104',
  };
}

export function getShortMarhalaLabel(marhala: QawmiMarhala): string {
  switch (marhala) {
    case 'Maktab / Hifz / Nazera':
      return 'Maktab / Hifz';
    case 'Ibtidaiyyah (Primary Marhala)':
      return 'Ibtidaiyyah';
    case 'Mutawassitah (Middle Marhala)':
      return 'Mutawassitah';
    case 'Sanawiyyah Ulya (Higher Secondary Marhala)':
      return 'Sanawiyyah Ulya';
    case 'Fazilat (Degree Marhala)':
      return 'Fazilat';
    case 'Takmil (Masters / Dawra-e-Hadith Marhala)':
      return 'Takmil';
  }
}

export function getDirectoryFilterMarhalaLabel(marhala: QawmiMarhala): string {
  switch (marhala) {
    case 'Maktab / Hifz / Nazera':
      return 'Maktab / Hifz / Nazera';
    case 'Ibtidaiyyah (Primary Marhala)':
      return 'Ibtidaiyyah';
    case 'Mutawassitah (Middle Marhala)':
      return 'Mutawassitah';
    case 'Sanawiyyah Ulya (Higher Secondary Marhala)':
      return 'Sanawiyyah Ulya';
    case 'Fazilat (Degree Marhala)':
      return 'Fazilat';
    case 'Takmil (Masters / Dawra-e-Hadith Marhala)':
      return 'Takmil';
  }
}

export function getFocusBranchesForMarhala(_marhala: QawmiMarhala): readonly QawmiFocusBranch[] {
  return QAWMI_FOCUS_BRANCHES;
}

export function isValidMarhala(value: string): value is QawmiMarhala {
  return (QAWMI_MARHALAS as readonly string[]).includes(value);
}

export function isValidFocusBranch(value: string): value is QawmiFocusBranch {
  return (QAWMI_FOCUS_BRANCHES as readonly string[]).includes(value);
}

export function normalizeFocusBranch(
  rawFocus?: string
): { ok: true; focusBranch: QawmiFocusBranch } | { ok: false; error: string } {
  if (rawFocus && isValidFocusBranch(rawFocus)) {
    return { ok: true, focusBranch: rawFocus };
  }
  return {
    ok: false,
    error: `Please select a valid Focus / Branch (${QAWMI_FOCUS_BRANCHES.join(', ')}).`,
  };
}

export function formatQawmiAcademicDisplay(item: {
  role: QawmiAdminRole;
  marhala: QawmiMarhala;
  focusBranch: QawmiFocusBranch;
  primarySubject?: string;
}): { marhalaShort: string; detail: string } {
  const marhalaShort = getShortMarhalaLabel(item.marhala);
  if (item.role === 'teacher' && item.primarySubject?.trim()) {
    return {
      marhalaShort,
      detail: `${item.focusBranch} · ${item.primarySubject.trim()}`,
    };
  }
  return {
    marhalaShort,
    detail: item.focusBranch,
  };
}

export function getQawmiKitabSuggestions(focusBranch: QawmiFocusBranch): readonly string[] {
  switch (focusBranch) {
    case 'Hifzul Quran':
      return [
        'Quran & Tajweed / Hifz',
        'Sabak, Sabki & Amukhta Supervision',
        'Makharij & Hifz Daur',
      ];
    case 'Tajweed & Qiraat':
      return [
        'Quran & Tajweed / Hifz',
        'Muqaddamah al-Jazariyyah & Qiraat',
        'Qiraat Sab’ah & Tartil',
      ];
    case 'Hadith & Tafsir':
      return [
        'Hadith & Tafsir (Bukhari / Mishkat)',
        'Tafsir al-Jalalayn & Usul al-Tafsir',
        'Mishkat al-Masabih & Sahihayn',
      ];
    case 'Fiqh & Usul':
      return [
        'Fiqh & Usul-e-Fiqh (Al-Hidayah / Nur al-Anwar)',
        'Quduri & Kanz al-Daqaiq',
        'Fatawa & Usul al-Shashi',
      ];
    case 'Arabic & Adab':
      return [
        'Nahw & Sarf (Hidayatun Nahw / Kafiya)',
        'Arabic Adab & Balaghah',
        'Mizanus Sarf & Nahw Mir',
      ];
    default:
      return [
        'Hadith & Tafsir (Bukhari / Mishkat)',
        'Nahw & Sarf (Hidayatun Nahw / Kafiya)',
        'Fiqh & Usul-e-Fiqh (Al-Hidayah / Nur al-Anwar)',
        'Quran & Tajweed / Hifz',
        'Arabic Adab & Balaghah',
        'Tafsir al-Jalalayn & Usul al-Tafsir',
      ];
  }
}

export function generateTemporaryPassword(length = 12): string {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghijkmnopqrstuvwxyz';
  const digits = '23456789';
  const symbols = '@#$%&*!';
  const all = upper + lower + digits + symbols;

  const pick = (charset: string) => charset[Math.floor(Math.random() * charset.length)];
  const chars = [pick(upper), pick(lower), pick(digits), pick(symbols)];
  while (chars.length < Math.max(10, length)) {
    chars.push(pick(all));
  }
  for (let i = chars.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join('');
}

export function formatCountdownRemaining(expiresAt: number, now = Date.now()): {
  label: string;
  expired: boolean;
} {
  const diff = expiresAt - now;
  if (diff <= 0) {
    return { label: 'Expired', expired: true };
  }
  const totalSeconds = Math.floor(diff / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return {
    label: `${String(hours).padStart(2, '0')}h ${String(minutes).padStart(2, '0')}m ${String(seconds).padStart(2, '0')}s`,
    expired: false,
  };
}

export function getQawmiUserInitials(fullName: string): string {
  const parts = fullName
    .trim()
    .split(/\s+/)
    .filter(
      (p) =>
        p &&
        !/^(dr\.|prof\.|mr\.|ms\.|mrs\.|maulana|mawlana|ustad|ustadh|ustadha|hafez|hafiz|mufti|qari)$/i.test(
          p
        )
    );
  if (parts.length === 0) {
    const raw = fullName.trim().split(/\s+/).filter(Boolean);
    return (raw[0]?.[0] ?? 'Q').toUpperCase();
  }
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function createSeedStore(now = Date.now()): QawmiAdminStore {
  const hour = 60 * 60 * 1000;
  const day = 24 * hour;
  const studentHash = hashPassword('Student@1234');
  const teacherHash = hashPassword('Teacher@1234');

  const coupons: QawmiAdminCoupon[] = [
    {
      id: 'QAWMI-CPN-S01',
      code: 'S-85101',
      pathway: 'qawmi',
      role: 'student',
      status: 'active',
      createdAt: now - 2 * hour,
      expiresAt: now + 46 * hour,
      issuedBy: DEFAULT_ADMIN_ACTOR,
    },
    {
      id: 'QAWMI-CPN-T02',
      code: 'T-85324',
      pathway: 'qawmi',
      role: 'teacher',
      status: 'active',
      createdAt: now - 3 * hour,
      expiresAt: now + 45 * hour,
      issuedBy: DEFAULT_ADMIN_ACTOR,
    },
    {
      id: 'QAWMI-CPN-T01',
      code: 'T-85310',
      pathway: 'qawmi',
      role: 'teacher',
      status: 'active',
      createdAt: now - 4 * hour,
      expiresAt: now + 44 * hour,
      issuedBy: DEFAULT_ADMIN_ACTOR,
    },
    {
      id: 'QAWMI-CPN-S02',
      code: 'S-85204',
      pathway: 'qawmi',
      role: 'student',
      status: 'active',
      createdAt: now - 5 * hour,
      expiresAt: now + 43 * hour,
      issuedBy: DEFAULT_ADMIN_ACTOR,
    },
    {
      id: 'QAWMI-CPN-T03',
      code: 'T-85090',
      pathway: 'qawmi',
      role: 'teacher',
      status: 'used',
      createdAt: now - 24 * hour,
      expiresAt: now + 24 * hour,
      usedAt: now - 10 * hour,
      issuedBy: DEFAULT_ADMIN_ACTOR,
    },
    {
      id: 'QAWMI-CPN-S03',
      code: 'S-85001',
      pathway: 'qawmi',
      role: 'student',
      status: 'used',
      createdAt: now - 28 * hour,
      expiresAt: now + 20 * hour,
      usedAt: now - 15 * hour,
      issuedBy: DEFAULT_ADMIN_ACTOR,
    },
    {
      id: 'QAWMI-CPN-T04',
      code: 'T-85011',
      pathway: 'qawmi',
      role: 'teacher',
      status: 'expired',
      createdAt: now - 72 * hour,
      expiresAt: now - 24 * hour,
      issuedBy: DEFAULT_ADMIN_ACTOR,
    },
    {
      id: 'QAWMI-CPN-S04',
      code: 'S-85044',
      pathway: 'qawmi',
      role: 'student',
      status: 'expired',
      createdAt: now - 80 * hour,
      expiresAt: now - 32 * hour,
      issuedBy: DEFAULT_ADMIN_ACTOR,
    },
  ];

  const pending: QawmiAdminPendingRegistration[] = [
    {
      id: 'QAWMI-PND-T01',
      role: 'teacher',
      pathway: 'qawmi',
      fullName: 'Maulana Yusuf Al-Qasemi',
      email: 'yusuf.qasemi@qawmi-madrasa.edu.bd',
      marhala: 'Mutawassitah (Middle Marhala)',
      assignedMarhalas: ['Ibtidaiyyah (Primary Marhala)', 'Mutawassitah (Middle Marhala)'],
      focusBranch: 'General / Kitab',
      primarySubject: 'Nahw & Sarf (Hidayatun Nahw / Kafiya)',
      couponCode: 'T-85381',
      submittedAt: now - 5 * hour,
      expiresAt: now + 43 * hour,
    },
    {
      id: 'QAWMI-PND-T02',
      role: 'teacher',
      pathway: 'qawmi',
      fullName: 'Mufti Nurul Islam Madani',
      email: 'nurul.madani@qawmi-madrasa.edu.bd',
      marhala: 'Takmil (Masters / Dawra-e-Hadith Marhala)',
      assignedMarhalas: ['Fazilat (Degree Marhala)', 'Takmil (Masters / Dawra-e-Hadith Marhala)'],
      focusBranch: 'Fiqh & Usul',
      primarySubject: 'Fiqh & Usul-e-Fiqh (Al-Hidayah / Nur al-Anwar)',
      couponCode: 'T-85392',
      submittedAt: now - 9 * hour,
      expiresAt: now + 39 * hour,
    },
    {
      id: 'QAWMI-PND-S01',
      role: 'student',
      pathway: 'qawmi',
      fullName: 'Hafiz Zubair Ahmad',
      email: 'zubair.ahmad@qawmi-student.edu.bd',
      marhala: 'Takmil (Masters / Dawra-e-Hadith Marhala)',
      focusBranch: 'Hadith & Tafsir',
      couponCode: 'S-85271',
      submittedAt: now - 7 * hour,
      expiresAt: now + 41 * hour,
    },
    {
      id: 'QAWMI-PND-S02',
      role: 'student',
      pathway: 'qawmi',
      fullName: 'Muhammad Bilal Hossain',
      email: 'bilal.hossain@qawmi-student.edu.bd',
      marhala: 'Maktab / Hifz / Nazera',
      focusBranch: 'Hifzul Quran',
      couponCode: 'S-85284',
      submittedAt: now - 11 * hour,
      expiresAt: now + 37 * hour,
    },
    {
      id: 'QAWMI-PND-S03',
      role: 'student',
      pathway: 'qawmi',
      fullName: 'Abu Bakr Siddique',
      email: 'abubakr.siddique@qawmi-student.edu.bd',
      marhala: 'Sanawiyyah Ulya (Higher Secondary Marhala)',
      focusBranch: 'Arabic & Adab',
      couponCode: 'S-85296',
      submittedAt: now - 15 * hour,
      expiresAt: now + 33 * hour,
    },
  ];

  const profiles: QawmiAdminUserProfile[] = [
    // Teachers
    {
      id: 'qawmi-teacher-demo-01',
      role: 'teacher',
      pathway: 'qawmi',
      fullName: 'Mufti Mahmudul Hasan',
      email: 'mahmudul.hasan@qawmi-madrasa.edu.bd',
      passwordHash: teacherHash,
      marhala: 'Takmil (Masters / Dawra-e-Hadith Marhala)',
      assignedMarhalas: [
        'Mutawassitah (Middle Marhala)',
        'Sanawiyyah Ulya (Higher Secondary Marhala)',
        'Takmil (Masters / Dawra-e-Hadith Marhala)',
      ],
      focusBranch: 'Hadith & Tafsir',
      primarySubject: 'Hadith & Tafsir',
      status: 'active',
      registrationType: 'coupon_auto',
      couponCode: 'T-85090',
      joinedAt: now - 36 * day,
      updatedAt: now - 2 * day,
    },
    {
      id: 'qawmi-teacher-02',
      role: 'teacher',
      pathway: 'qawmi',
      fullName: 'Mawlana Abdur Rahman Qasemi',
      email: 'abdur.rahman@qawmi-madrasa.edu.bd',
      passwordHash: teacherHash,
      marhala: 'Mutawassitah (Middle Marhala)',
      assignedMarhalas: ['Ibtidaiyyah (Primary Marhala)', 'Mutawassitah (Middle Marhala)'],
      focusBranch: 'Arabic & Adab',
      primarySubject: 'Nahw & Sarf / Arabic Grammar',
      status: 'active',
      registrationType: 'manual_admin',
      joinedAt: now - 58 * day,
      updatedAt: now - 4 * day,
    },
    {
      id: 'qawmi-teacher-03',
      role: 'teacher',
      pathway: 'qawmi',
      fullName: 'Qari Ismail Hossain',
      email: 'ismail.qari@qawmi-madrasa.edu.bd',
      passwordHash: teacherHash,
      marhala: 'Maktab / Hifz / Nazera',
      assignedMarhalas: ['Maktab / Hifz / Nazera', 'Ibtidaiyyah (Primary Marhala)'],
      focusBranch: 'Tajweed & Qiraat',
      primarySubject: 'Quran & Tajweed / Hifz',
      status: 'active',
      registrationType: 'coupon_auto',
      couponCode: 'T-84980',
      joinedAt: now - 48 * day,
      updatedAt: now - 3 * day,
    },
    {
      id: 'qawmi-teacher-04',
      role: 'teacher',
      pathway: 'qawmi',
      fullName: 'Mufti Ataullah Rahmani',
      email: 'ataullah.rahmani@qawmi-madrasa.edu.bd',
      passwordHash: teacherHash,
      marhala: 'Fazilat (Degree Marhala)',
      assignedMarhalas: ['Sanawiyyah Ulya (Higher Secondary Marhala)', 'Fazilat (Degree Marhala)'],
      focusBranch: 'Fiqh & Usul',
      primarySubject: 'Fiqh & Usul-e-Fiqh (Al-Hidayah / Nur al-Anwar)',
      status: 'active',
      registrationType: 'manual_admin',
      joinedAt: now - 25 * day,
      updatedAt: now - 1 * day,
    },

    // Students
    {
      id: 'qawmi-student-demo-01',
      role: 'student',
      pathway: 'qawmi',
      fullName: 'Tariqul Islam',
      email: 'tariqul.islam@qawmi-student.edu.bd',
      passwordHash: studentHash,
      marhala: 'Mutawassitah (Middle Marhala)',
      focusBranch: 'General / Kitab',
      status: 'active',
      registrationType: 'coupon_auto',
      couponCode: 'S-85001',
      joinedAt: now - 19 * day,
      updatedAt: now - 2 * day,
    },
    {
      id: 'qawmi-student-02',
      role: 'student',
      pathway: 'qawmi',
      fullName: 'Hafiz Anas Mahmud',
      email: 'anas.mahmud@qawmi-student.edu.bd',
      passwordHash: studentHash,
      marhala: 'Maktab / Hifz / Nazera',
      focusBranch: 'Hifzul Quran',
      status: 'active',
      registrationType: 'coupon_auto',
      couponCode: 'S-85012',
      joinedAt: now - 28 * day,
      updatedAt: now - 3 * day,
    },
    {
      id: 'qawmi-student-03',
      role: 'student',
      pathway: 'qawmi',
      fullName: 'Salman Al Farisi',
      email: 'salman.farisi@qawmi-student.edu.bd',
      passwordHash: studentHash,
      marhala: 'Takmil (Masters / Dawra-e-Hadith Marhala)',
      focusBranch: 'Hadith & Tafsir',
      status: 'active',
      registrationType: 'manual_admin',
      joinedAt: now - 42 * day,
      updatedAt: now - 4 * day,
    },
    {
      id: 'qawmi-student-04',
      role: 'student',
      pathway: 'qawmi',
      fullName: 'Usman Gani Siddiqui',
      email: 'usman.siddiqui@qawmi-student.edu.bd',
      passwordHash: studentHash,
      marhala: 'Sanawiyyah Ulya (Higher Secondary Marhala)',
      focusBranch: 'Fiqh & Usul',
      status: 'active',
      registrationType: 'coupon_auto',
      couponCode: 'S-85015',
      joinedAt: now - 22 * day,
      updatedAt: now - 5 * day,
    },
    {
      id: 'qawmi-student-05',
      role: 'student',
      pathway: 'qawmi',
      fullName: 'Ahmadullah Numani',
      email: 'ahmadullah.numani@qawmi-student.edu.bd',
      passwordHash: studentHash,
      marhala: 'Fazilat (Degree Marhala)',
      focusBranch: 'Hadith & Tafsir',
      status: 'active',
      registrationType: 'manual_admin',
      joinedAt: now - 31 * day,
      updatedAt: now - 2 * day,
    },
    {
      id: 'qawmi-student-06',
      role: 'student',
      pathway: 'qawmi',
      fullName: 'Abdullah Al Mamun',
      email: 'abdullah.mamun@qawmi-student.edu.bd',
      passwordHash: studentHash,
      marhala: 'Ibtidaiyyah (Primary Marhala)',
      focusBranch: 'Tajweed & Qiraat',
      status: 'active',
      registrationType: 'coupon_auto',
      couponCode: 'S-85018',
      joinedAt: now - 14 * day,
      updatedAt: now - 1 * day,
    },
    {
      id: 'qawmi-student-07',
      role: 'student',
      pathway: 'qawmi',
      fullName: 'Saeed Ahmad Talukdar',
      email: 'saeed.talukdar@qawmi-student.edu.bd',
      passwordHash: studentHash,
      marhala: 'Mutawassitah (Middle Marhala)',
      focusBranch: 'Arabic & Adab',
      status: 'suspended',
      registrationType: 'coupon_auto',
      couponCode: 'S-84920',
      joinedAt: now - 50 * day,
      updatedAt: now - 6 * day,
    },
  ];

  const notices: QawmiAdminNotice[] = [
    {
      id: 'QAWMI-NTC-03',
      pathway: 'qawmi',
      title: 'Urgent: Befaq Registration Form & Tazkiyah Verification Deadline',
      description:
        'Every candidate appearing in this year’s Wifaqul Madarisil Arabia (Befaq) board examination must verify their Marhala, Darajah roll entry, and Ustad endorsement at the Daftar-e-Talimat before Friday Jumu’ah.',
      audience: 'both',
      marhala: 'all',
      focusBranch: 'all',
      tag: 'Urgent',
      createdAt: now - 4 * hour,
      updatedAt: now - 4 * hour,
    },
    {
      id: 'QAWMI-NTC-01',
      pathway: 'qawmi',
      title: 'Befaq Central Markazi Imtihan Kitab Revision & Takrar Schedule',
      description:
        'All Qawmi Madrasa Talaba and Asatizah from Ibtidaiyyah through Takmil are notified that evening Takrar circles will take place daily after Maghrib in the Darul Hadith and main Jamaat halls. Nigran Ustads should verify Sabki and Kitab completion logs weekly.',
      audience: 'both',
      marhala: 'all',
      focusBranch: 'all',
      tag: 'Exam',
      createdAt: now - 6 * hour,
      updatedAt: now - 6 * hour,
    },
    {
      id: 'QAWMI-NTC-06',
      pathway: 'qawmi',
      title: 'Asatizah Council: Takrar & Oral Imtihan Marking Standards',
      description:
        'Internal notice for Qawmi Madrasa Ustads only: Please review the updated Ibarat reading, Tarkeeb accuracy, and Shifah (oral) examination marking rubrics in the Majlis-e-Ilmi room after Asr.',
      audience: 'teacher',
      marhala: 'all',
      focusBranch: 'all',
      tag: 'General',
      createdAt: now - 10 * hour,
      updatedAt: now - 10 * hour,
    },
    {
      id: 'QAWMI-NTC-07',
      pathway: 'qawmi',
      title: 'Takmil Dawra-e-Hadith: Sahih al-Bukhari Khatam Seminar',
      description:
        'All Takmil (Dawra-e-Hadith) Talaba specializing in Hadith & Tafsir are requested to submit their Sanad and Sharah preparation notebooks ahead of Thursday’s Khatam al-Bukhari Majlis in Darul Hadith.',
      audience: 'student',
      marhala: 'Takmil (Masters / Dawra-e-Hadith Marhala)',
      focusBranch: 'Hadith & Tafsir',
      tag: 'General',
      createdAt: now - 16 * hour,
      updatedAt: now - 16 * hour,
    },
    {
      id: 'QAWMI-NTC-08',
      pathway: 'qawmi',
      title: 'Annual Hifzul Quran Daur & Sabki Evaluation Schedule',
      description:
        'Maktab & Hifzul Quran students must complete their 5-Para Amukhta revision check with their Hifz Ustads prior to Monday morning’s Musabaqah selection round.',
      audience: 'student',
      marhala: 'Maktab / Hifz / Nazera',
      focusBranch: 'Hifzul Quran',
      tag: 'Exam',
      createdAt: now - 22 * hour,
      updatedAt: now - 22 * hour,
    },
  ];

  const activities: QawmiAdminActivityItem[] = [
    {
      id: 'QAWMI-ACT-01',
      pathway: 'qawmi',
      category: 'approval',
      summary:
        'New Mutawassitah General / Kitab teacher request queued for Maulana Yusuf Al-Qasemi (T-85381).',
      actorEmail: DEFAULT_ADMIN_ACTOR,
      createdAt: now - 2 * hour,
    },
    {
      id: 'QAWMI-ACT-02',
      pathway: 'qawmi',
      category: 'coupon',
      summary:
        'Issued active Teacher coupon T-85324 (48h validity) under Qawmi Madrasa Panel.',
      actorEmail: DEFAULT_ADMIN_ACTOR,
      createdAt: now - 3 * hour,
    },
    {
      id: 'QAWMI-ACT-03',
      pathway: 'qawmi',
      category: 'notice',
      summary:
        'Published Urgent notice: Befaq Registration Form & Tazkiyah Verification Deadline.',
      actorEmail: DEFAULT_ADMIN_ACTOR,
      createdAt: now - 4 * hour,
    },
    {
      id: 'QAWMI-ACT-04',
      pathway: 'qawmi',
      category: 'directory',
      summary:
        'Manually provisioned Fazilat Fiqh & Usul faculty account for Mufti Ataullah Rahmani.',
      actorEmail: DEFAULT_ADMIN_ACTOR,
      createdAt: now - 12 * hour,
    },
  ];

  return {
    coupons,
    pending,
    profiles,
    notices,
    activities,
    adminSeeded: true,
  };
}

function mergeAdminBaselineIfNeeded(store: QawmiAdminStore, now: number): boolean {
  if (store.adminSeeded) return false;

  const seed = createSeedStore(now);
  let mutated = false;

  for (const cpn of seed.coupons) {
    if (!store.coupons.some((c) => c.code.toUpperCase() === cpn.code.toUpperCase())) {
      store.coupons.push(cpn);
      mutated = true;
    }
  }
  for (const pnd of seed.pending) {
    if (
      !store.pending.some(
        (p) => p.id === pnd.id || p.email.toLowerCase() === pnd.email.toLowerCase()
      )
    ) {
      store.pending.push(pnd);
      mutated = true;
    }
  }
  for (const prof of seed.profiles) {
    if (
      !store.profiles.some(
        (p) => p.id === prof.id || p.email.toLowerCase() === prof.email.toLowerCase()
      )
    ) {
      store.profiles.push(prof);
      mutated = true;
    }
  }
  for (const ntc of seed.notices) {
    if (!store.notices.some((n) => n.id === ntc.id)) {
      store.notices.push(ntc);
      mutated = true;
    }
  }
  for (const act of seed.activities) {
    if (!store.activities.some((a) => a.id === act.id)) {
      store.activities.push(act);
      mutated = true;
    }
  }

  store.adminSeeded = true;
  mutated = true;
  return mutated;
}

function loadStore(now = Date.now()): QawmiAdminStore {
  let store: QawmiAdminStore | null = null;
  if (canUseLocalStorage()) {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as QawmiAdminStore;
        if (
          parsed &&
          Array.isArray(parsed.coupons) &&
          Array.isArray(parsed.pending) &&
          Array.isArray(parsed.profiles) &&
          Array.isArray(parsed.notices) &&
          Array.isArray(parsed.activities)
        ) {
          store = parsed;
        }
      } catch {
        store = null;
      }
    }
  } else {
    store = memoryStore;
  }

  if (!store) {
    store = createSeedStore(now);
    saveStore(store);
  }

  let mutated = mergeAdminBaselineIfNeeded(store, now);

  store.coupons = store.coupons.map((cpn) => {
    if (cpn.status === 'active' && cpn.expiresAt <= now) {
      mutated = true;
      return { ...cpn, status: 'expired' };
    }
    return cpn;
  });

  if (mutated) {
    saveStore(store);
  }

  return store;
}

function saveStore(store: QawmiAdminStore): void {
  if (canUseLocalStorage()) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } else {
    memoryStore = store;
  }
}

export function resetQawmiAdminStore(now = Date.now()): void {
  const seeded = createSeedStore(now);
  saveStore(seeded);
}

function appendActivity(
  store: QawmiAdminStore,
  category: QawmiAdminActivityItem['category'],
  summary: string,
  actorEmail?: string,
  now = Date.now()
): void {
  store.activities.unshift({
    id: `QAWMI-ACT-${now}-${Math.floor(Math.random() * 1000)}`,
    pathway: 'qawmi',
    category,
    summary,
    actorEmail: actorEmail || DEFAULT_ADMIN_ACTOR,
    createdAt: now,
  });
  if (store.activities.length > 80) {
    store.activities = store.activities.slice(0, 80);
  }
}

function csvEscape(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function extractCouponDigits(code: string): string {
  const parts = code.split('-');
  return parts[1] ?? code;
}

function syncQawmiAuthDatabaseOnApproval(
  profile: QawmiAdminUserProfile,
  now: number
): string | null {
  const db = loadDatabase(now);
  const emailLower = profile.email.toLowerCase();
  const regIdx = db.registrations.findIndex((r) => r.email.toLowerCase() === emailLower);
  let carriedHash: string | null = null;
  if (regIdx >= 0) {
    carriedHash = db.registrations[regIdx].passwordHash;
    db.registrations.splice(regIdx, 1);
  }

  const userIdx = db.users.findIndex((u) => u.email.toLowerCase() === emailLower);
  const effectiveHash = carriedHash || profile.passwordHash;
  if (userIdx === -1) {
    db.users.push({
      id: profile.id,
      role: profile.role,
      fullName: profile.fullName,
      email: profile.email,
      passwordHash: effectiveHash,
      mustChangePassword: false,
      preferredLanguage: 'en',
      createdAt: profile.joinedAt,
      educationStream: 'Bangladesh Madrasa Education',
      pathway: 'Qawmi',
    });
  } else {
    db.users[userIdx] = {
      ...db.users[userIdx],
      fullName: profile.fullName,
      passwordHash: effectiveHash,
    };
  }
  saveDatabase(db);
  return carriedHash;
}

function removePendingAuthRegistration(email: string, now: number): void {
  const db = loadDatabase(now);
  const emailLower = email.toLowerCase();
  const next = db.registrations.filter((r) => r.email.toLowerCase() !== emailLower);
  if (next.length !== db.registrations.length) {
    db.registrations = next;
    saveDatabase(db);
  }
}

function syncQawmiAuthUserUpdate(
  profile: QawmiAdminUserProfile,
  action: 'upsert' | 'remove',
  now: number
): void {
  const db = loadDatabase(now);
  const emailLower = profile.email.toLowerCase();
  const existingIdx = db.users.findIndex((u) => u.email.toLowerCase() === emailLower);

  if (action === 'remove' || profile.status === 'suspended') {
    if (existingIdx >= 0 && db.users[existingIdx].pathway === 'Qawmi') {
      db.users.splice(existingIdx, 1);
      saveDatabase(db);
    }
    return;
  }

  if (existingIdx >= 0) {
    db.users[existingIdx] = {
      ...db.users[existingIdx],
      fullName: profile.fullName,
      passwordHash: profile.passwordHash,
      educationStream: 'Bangladesh Madrasa Education',
      pathway: 'Qawmi',
    };
    saveDatabase(db);
  }
}

export const qawmiAdminService = {
  /**
   * Ensures the demo Qawmi Madrasa admin account exists in edura_multi_db_v1
   * without touching any NCTB, Cambridge/Edexcel, or Alia accounts.
   */
  prepareQawmiAdminForLogin(rawEmail: string, now = Date.now()): void {
    const email = rawEmail.trim().toLowerCase();
    const preset = getDemoQawmiAdminPreset();
    if (email !== preset.email) return;

    const db = loadDatabase(now);
    const existing = db.users.find(
      (u) => u.role === 'admin' && u.email.toLowerCase() === preset.email
    );
    if (!existing) {
      const account: UserAccount = {
        id: 'admin-qawmi',
        role: 'admin',
        fullName: preset.fullName,
        email: preset.email,
        phone: preset.phone,
        passwordHash: hashPassword(preset.password),
        mustChangePassword: false,
        preferredLanguage: 'en',
        createdAt: now - 30 * 24 * 60 * 60 * 1000,
        educationStream: 'Bangladesh Madrasa Education',
        pathway: preset.pathwayLabel,
      };
      db.users.push(account);
      saveDatabase(db);
    }
  },

  // --- OVERVIEW ---
  getOverviewMetrics(now = Date.now()): QawmiOverviewMetrics {
    const store = loadStore(now);
    const profiles = store.profiles.filter((p) => p.pathway === 'qawmi');
    const pending = store.pending.filter((p) => p.pathway === 'qawmi');
    const coupons = store.coupons.filter((c) => c.pathway === 'qawmi');

    return {
      activeTeachers: profiles.filter((p) => p.role === 'teacher' && p.status === 'active').length,
      activeStudents: profiles.filter((p) => p.role === 'student' && p.status === 'active').length,
      pendingApprovals: pending.length,
      activeCoupons: coupons.filter((c) => c.status === 'active' && c.expiresAt > now).length,
    };
  },

  listActivities(limit = 10, now = Date.now()): QawmiAdminActivityItem[] {
    const store = loadStore(now);
    return store.activities
      .filter((a) => a.pathway === 'qawmi')
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, limit);
  },

  // --- COUPONS ---
  listCoupons(
    filters: { status?: 'all' | CouponStatus; query?: string } = {},
    now = Date.now()
  ): QawmiAdminCoupon[] {
    const store = loadStore(now);
    const q = (filters.query ?? '').trim().toLowerCase();
    return store.coupons
      .filter((c) => c.pathway === 'qawmi')
      .filter((c) => {
        if (filters.status && filters.status !== 'all' && c.status !== filters.status) {
          return false;
        }
        if (q) {
          const hay = `${c.code} ${extractCouponDigits(c.code)} ${c.role} ${c.status}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => b.createdAt - a.createdAt);
  },

  generateCoupon(
    role: QawmiAdminRole,
    actorEmail?: string,
    now = Date.now()
  ): QawmiAdminCoupon {
    const store = loadStore(now);
    const existingDigits = new Set(store.coupons.map((c) => extractCouponDigits(c.code)));
    let digits = '';
    for (let attempt = 0; attempt < 500; attempt += 1) {
      const candidate = String(10000 + Math.floor(Math.random() * 90000));
      if (!existingDigits.has(candidate)) {
        digits = candidate;
        break;
      }
    }
    if (!digits) {
      digits = String((now % 90000) + 10000).slice(0, 5);
    }

    const prefix = role === 'teacher' ? 'T' : 'S';
    const code = `${prefix}-${digits}`;
    const coupon: QawmiAdminCoupon = {
      id: `QAWMI-CPN-${prefix}-${now}-${digits}`,
      code,
      pathway: 'qawmi',
      role,
      status: 'active',
      createdAt: now,
      expiresAt: now + FORTY_EIGHT_HOURS_MS,
      issuedBy: actorEmail || DEFAULT_ADMIN_ACTOR,
    };

    store.coupons.unshift(coupon);
    appendActivity(
      store,
      'coupon',
      `Generated ${role === 'teacher' ? 'Teacher' : 'Student'} coupon ${code} (48h validity) under Qawmi Madrasa Panel.`,
      actorEmail,
      now
    );
    saveStore(store);
    return coupon;
  },

  // --- USERS: PENDING APPROVALS ---
  listPending(role?: QawmiAdminRole, now = Date.now()): QawmiAdminPendingRegistration[] {
    const store = loadStore(now);
    return store.pending
      .filter((item) => item.pathway === 'qawmi')
      .filter((item) => (role ? item.role === role : true))
      .sort((a, b) => b.submittedAt - a.submittedAt);
  },

  editPending(
    pendingId: string,
    patch: {
      fullName: string;
      email: string;
      marhala: QawmiMarhala;
      focusBranch: QawmiFocusBranch;
      primarySubject?: string;
    },
    actorEmail?: string,
    now = Date.now()
  ): { ok: true; item: QawmiAdminPendingRegistration } | { ok: false; error: string } {
    const store = loadStore(now);
    const idx = store.pending.findIndex((p) => p.id === pendingId && p.pathway === 'qawmi');
    if (idx === -1) {
      return { ok: false, error: 'Pending application not found in Qawmi Madrasa.' };
    }

    const existing = store.pending[idx];
    const nameCheck = validateFullName(patch.fullName);
    if (!nameCheck.valid) return { ok: false, error: 'Please enter a valid full name.' };

    const emailCheck = validateEmail(patch.email);
    if (!emailCheck.valid) return { ok: false, error: 'Please enter a valid email address.' };

    if (!isValidMarhala(patch.marhala)) {
      return { ok: false, error: 'Please select a valid Qawmi Madrasa Marhala.' };
    }

    const focusCheck = normalizeFocusBranch(patch.focusBranch);
    if (!focusCheck.ok) {
      return { ok: false, error: focusCheck.error };
    }

    const primarySubject =
      existing.role === 'teacher' ? (patch.primarySubject ?? '').trim() : undefined;
    if (existing.role === 'teacher' && !primarySubject) {
      return { ok: false, error: 'Please enter a Primary Subject / Kitab for teacher applicants.' };
    }

    const updated: QawmiAdminPendingRegistration = {
      ...existing,
      fullName: patch.fullName.trim(),
      email: patch.email.trim().toLowerCase(),
      marhala: patch.marhala,
      assignedMarhalas:
        existing.role === 'teacher'
          ? Array.from(new Set([patch.marhala, ...(existing.assignedMarhalas ?? [])]))
          : existing.assignedMarhalas,
      focusBranch: focusCheck.focusBranch,
      primarySubject,
    };
    store.pending[idx] = updated;
    appendActivity(
      store,
      'approval',
      `Updated pending application details for ${updated.fullName} (${getShortMarhalaLabel(updated.marhala)} • ${updated.focusBranch}).`,
      actorEmail,
      now
    );
    saveStore(store);
    return { ok: true, item: updated };
  },

  approvePending(
    pendingId: string,
    actorEmail?: string,
    now = Date.now()
  ): { ok: true; profile: QawmiAdminUserProfile } | { ok: false; error: string } {
    const store = loadStore(now);
    const idx = store.pending.findIndex((p) => p.id === pendingId && p.pathway === 'qawmi');
    if (idx === -1) {
      return { ok: false, error: 'Pending application not found in Qawmi Madrasa.' };
    }

    const item = store.pending[idx];
    const duplicate = store.profiles.some(
      (p) => p.pathway === 'qawmi' && p.email.toLowerCase() === item.email.toLowerCase()
    );
    if (duplicate) {
      return {
        ok: false,
        error: `An account with email ${item.email} already exists in ${getQawmiPanelName()}.`,
      };
    }

    const profile: QawmiAdminUserProfile = {
      id: `QAWMI-USR-${item.role === 'teacher' ? 'T' : 'S'}${now % 100000}`,
      role: item.role,
      pathway: 'qawmi',
      fullName: item.fullName,
      email: item.email.toLowerCase(),
      passwordHash: hashPassword(item.role === 'teacher' ? 'Teacher@1234' : 'Student@1234'),
      marhala: item.marhala,
      assignedMarhalas:
        item.role === 'teacher'
          ? item.assignedMarhalas?.length
            ? item.assignedMarhalas
            : [item.marhala]
          : undefined,
      focusBranch: item.focusBranch,
      primarySubject: item.primarySubject,
      status: 'active',
      registrationType: 'coupon_auto',
      couponCode: item.couponCode,
      joinedAt: now,
      updatedAt: now,
    };

    const carriedHash = syncQawmiAuthDatabaseOnApproval(profile, now);
    if (carriedHash) {
      profile.passwordHash = carriedHash;
    }

    store.profiles.unshift(profile);
    store.pending.splice(idx, 1);

    store.coupons = store.coupons.map((c) =>
      c.pathway === 'qawmi' && c.code.toUpperCase() === item.couponCode.toUpperCase()
        ? { ...c, status: 'used', usedAt: now }
        : c
    );

    appendActivity(
      store,
      'approval',
      `Approved ${item.role === 'teacher' ? 'Teacher' : 'Student'} ${item.fullName} (${getShortMarhalaLabel(item.marhala)} • ${item.focusBranch} · ${item.couponCode}).`,
      actorEmail,
      now
    );
    saveStore(store);
    return { ok: true, profile };
  },

  rejectPending(
    pendingId: string,
    actorEmail?: string,
    now = Date.now()
  ): { ok: true } | { ok: false; error: string } {
    const store = loadStore(now);
    const idx = store.pending.findIndex((p) => p.id === pendingId && p.pathway === 'qawmi');
    if (idx === -1) {
      return { ok: false, error: 'Pending application not found in Qawmi Madrasa.' };
    }

    const [removed] = store.pending.splice(idx, 1);
    removePendingAuthRegistration(removed.email, now);
    appendActivity(
      store,
      'approval',
      `Rejected pending ${removed.role} application for ${removed.fullName} (${removed.couponCode}).`,
      actorEmail,
      now
    );
    saveStore(store);
    return { ok: true };
  },

  // --- USERS: DIRECTORY ---
  listDirectory(
    filters: {
      role?: QawmiAdminRole;
      query?: string;
      marhala?: 'all' | QawmiMarhala;
      focusBranch?: 'all' | QawmiFocusBranch;
      status?: 'all' | QawmiUserStatus;
      registrationType?: 'all' | QawmiRegistrationType;
    } = {},
    now = Date.now()
  ): QawmiAdminUserProfile[] {
    const store = loadStore(now);
    const q = (filters.query ?? '').trim().toLowerCase();
    return store.profiles
      .filter((p) => p.pathway === 'qawmi')
      .filter((p) => {
        if (filters.role && p.role !== filters.role) return false;
        if (filters.marhala && filters.marhala !== 'all' && p.marhala !== filters.marhala) {
          return false;
        }
        if (
          filters.focusBranch &&
          filters.focusBranch !== 'all' &&
          p.focusBranch !== filters.focusBranch
        ) {
          return false;
        }
        if (filters.status && filters.status !== 'all' && p.status !== filters.status) {
          return false;
        }
        if (
          filters.registrationType &&
          filters.registrationType !== 'all' &&
          p.registrationType !== filters.registrationType
        ) {
          return false;
        }
        if (q) {
          const hay = `${p.fullName} ${p.email} ${p.id} ${p.marhala} ${getShortMarhalaLabel(p.marhala)} ${p.focusBranch} ${p.primarySubject ?? ''} ${p.couponCode ?? ''}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => b.joinedAt - a.joinedAt);
  },

  updateUserAcademicInfo(
    userId: string,
    patch: {
      fullName: string;
      marhala: QawmiMarhala;
      focusBranch: QawmiFocusBranch;
      primarySubject?: string;
    },
    actorEmail?: string,
    now = Date.now()
  ): { ok: true; profile: QawmiAdminUserProfile } | { ok: false; error: string } {
    const store = loadStore(now);
    const idx = store.profiles.findIndex((p) => p.id === userId && p.pathway === 'qawmi');
    if (idx === -1) {
      return { ok: false, error: 'User profile not found in Qawmi Madrasa.' };
    }

    const existing = store.profiles[idx];
    const nameCheck = validateFullName(patch.fullName);
    if (!nameCheck.valid) return { ok: false, error: 'Please enter a valid full name.' };
    if (!isValidMarhala(patch.marhala)) {
      return { ok: false, error: 'Selected Marhala is invalid for Qawmi Madrasa.' };
    }

    const focusCheck = normalizeFocusBranch(patch.focusBranch);
    if (!focusCheck.ok) {
      return { ok: false, error: focusCheck.error };
    }

    const primarySubject =
      existing.role === 'teacher' ? (patch.primarySubject ?? '').trim() : undefined;
    if (existing.role === 'teacher' && !primarySubject) {
      return {
        ok: false,
        error: 'Primary Subject / Kitab cannot be empty for teacher accounts.',
      };
    }

    const updated: QawmiAdminUserProfile = {
      ...existing,
      fullName: patch.fullName.trim(),
      marhala: patch.marhala,
      assignedMarhalas:
        existing.role === 'teacher'
          ? Array.from(new Set([patch.marhala, ...(existing.assignedMarhalas ?? [])]))
          : existing.assignedMarhalas,
      focusBranch: focusCheck.focusBranch,
      primarySubject,
      updatedAt: now,
    };
    store.profiles[idx] = updated;
    syncQawmiAuthUserUpdate(updated, 'upsert', now);
    appendActivity(
      store,
      'directory',
      `Updated academic info for ${updated.fullName} (${getShortMarhalaLabel(updated.marhala)} • ${updated.focusBranch}${updated.primarySubject ? ` · ${updated.primarySubject}` : ''}).`,
      actorEmail,
      now
    );
    saveStore(store);
    return { ok: true, profile: updated };
  },

  resetUserPassword(
    userId: string,
    actorEmail?: string,
    now = Date.now(),
    customPassword?: string
  ): { ok: true; temporaryPassword: string; email: string } | { ok: false; error: string } {
    const store = loadStore(now);
    const idx = store.profiles.findIndex((p) => p.id === userId && p.pathway === 'qawmi');
    if (idx === -1) {
      return { ok: false, error: 'User profile not found in Qawmi Madrasa.' };
    }
    const temporaryPassword = customPassword
      ? customPassword.trim()
      : generateTemporaryPassword(12);
    if (customPassword !== undefined) {
      const pwCheck = validatePassword(temporaryPassword);
      if (!pwCheck.valid) {
        return { ok: false, error: 'Temporary password must be at least 8 characters long.' };
      }
    }
    const updated = {
      ...store.profiles[idx],
      passwordHash: hashPassword(temporaryPassword),
      updatedAt: now,
    };
    store.profiles[idx] = updated;
    syncQawmiAuthUserUpdate(updated, 'upsert', now);
    appendActivity(
      store,
      'security',
      `Reset password for ${updated.fullName} (${updated.email}).`,
      actorEmail,
      now
    );
    saveStore(store);
    return { ok: true, temporaryPassword, email: updated.email };
  },

  toggleUserStatus(
    userId: string,
    actorEmail?: string,
    now = Date.now()
  ): { ok: true; profile: QawmiAdminUserProfile } | { ok: false; error: string } {
    const store = loadStore(now);
    const idx = store.profiles.findIndex((p) => p.id === userId && p.pathway === 'qawmi');
    if (idx === -1) {
      return { ok: false, error: 'User profile not found in Qawmi Madrasa.' };
    }

    const nextStatus: QawmiUserStatus =
      store.profiles[idx].status === 'active' ? 'suspended' : 'active';
    const updated = {
      ...store.profiles[idx],
      status: nextStatus,
      updatedAt: now,
    };
    store.profiles[idx] = updated;
    syncQawmiAuthUserUpdate(updated, nextStatus === 'suspended' ? 'remove' : 'upsert', now);
    appendActivity(
      store,
      'directory',
      `${nextStatus === 'active' ? 'Activated' : 'Suspended'} account for ${updated.fullName}.`,
      actorEmail,
      now
    );
    saveStore(store);
    return { ok: true, profile: updated };
  },

  deleteUser(
    userId: string,
    actorEmail?: string,
    now = Date.now()
  ): { ok: true } | { ok: false; error: string } {
    const store = loadStore(now);
    const idx = store.profiles.findIndex((p) => p.id === userId && p.pathway === 'qawmi');
    if (idx === -1) {
      return { ok: false, error: 'User profile not found in Qawmi Madrasa.' };
    }
    const [removed] = store.profiles.splice(idx, 1);
    syncQawmiAuthUserUpdate(removed, 'remove', now);
    appendActivity(
      store,
      'directory',
      `Deleted ${removed.role} account ${removed.fullName} (${removed.email}).`,
      actorEmail,
      now
    );
    saveStore(store);
    return { ok: true };
  },

  bulkUpdateStatus(
    userIds: string[],
    status: QawmiUserStatus,
    actorEmail?: string,
    now = Date.now()
  ): number {
    const store = loadStore(now);
    const idSet = new Set(userIds);
    let count = 0;
    store.profiles = store.profiles.map((p) => {
      if (p.pathway === 'qawmi' && idSet.has(p.id) && p.status !== status) {
        count += 1;
        const next = { ...p, status, updatedAt: now };
        syncQawmiAuthUserUpdate(next, status === 'suspended' ? 'remove' : 'upsert', now);
        return next;
      }
      return p;
    });
    if (count > 0) {
      appendActivity(
        store,
        'directory',
        `Bulk updated ${count} Qawmi user(s) to ${status}.`,
        actorEmail,
        now
      );
      saveStore(store);
    }
    return count;
  },

  bulkDeleteUsers(userIds: string[], actorEmail?: string, now = Date.now()): number {
    const store = loadStore(now);
    const idSet = new Set(userIds);
    const toRemove = store.profiles.filter((p) => p.pathway === 'qawmi' && idSet.has(p.id));
    for (const removed of toRemove) {
      syncQawmiAuthUserUpdate(removed, 'remove', now);
    }
    const before = store.profiles.length;
    store.profiles = store.profiles.filter(
      (p) => !(p.pathway === 'qawmi' && idSet.has(p.id))
    );
    const removedCount = before - store.profiles.length;
    if (removedCount > 0) {
      appendActivity(
        store,
        'directory',
        `Bulk deleted ${removedCount} Qawmi user account(s).`,
        actorEmail,
        now
      );
      saveStore(store);
    }
    return removedCount;
  },

  exportDirectoryCsv(users: QawmiAdminUserProfile[]): string {
    const headers = [
      'ID',
      'Full Name',
      'Email',
      'Role',
      'Pathway',
      'Marhala',
      'Focus / Branch',
      'Primary Subject / Kitab',
      'Entry Source',
      'Status',
      'Joined Date',
    ];
    const rows = users.map((u) => [
      u.id,
      u.fullName,
      u.email,
      u.role === 'teacher' ? 'Teacher' : 'Student',
      'Qawmi Madrasa',
      u.marhala,
      u.focusBranch,
      u.primarySubject ?? '',
      u.registrationType === 'manual_admin' ? 'Manual' : 'Auto Coupon',
      u.status === 'active' ? 'Active' : 'Suspended',
      new Date(u.joinedAt).toISOString().slice(0, 10),
    ]);
    return [headers, ...rows].map((row) => row.map(csvEscape).join(',')).join('\n');
  },

  // --- USERS: MANUAL REGISTRATION ---
  createManualAccount(
    input: {
      role: QawmiAdminRole;
      fullName: string;
      email: string;
      temporaryPassword: string;
      marhala: QawmiMarhala;
      focusBranch: QawmiFocusBranch;
      primarySubject?: string;
    },
    actorEmail?: string,
    now = Date.now()
  ):
    | {
        ok: true;
        profile: QawmiAdminUserProfile;
        credentialsSummary: {
          pathwayLabel: string;
          roleLabel: string;
          fullName: string;
          email: string;
          temporaryPassword: string;
          marhala: string;
          focusBranch: string;
          primarySubject?: string;
        };
      }
    | { ok: false; error: string } {
    const nameCheck = validateFullName(input.fullName);
    if (!nameCheck.valid) {
      return { ok: false, error: 'Please enter a valid full name (at least 2 characters).' };
    }

    const emailCheck = validateEmail(input.email);
    if (!emailCheck.valid) return { ok: false, error: 'Please enter a valid email address.' };

    const pwCheck = validatePassword(input.temporaryPassword);
    if (!pwCheck.valid) {
      return { ok: false, error: 'Temporary password must be at least 8 characters long.' };
    }

    if (!isValidMarhala(input.marhala)) {
      return { ok: false, error: 'Please select a valid Qawmi Madrasa Marhala.' };
    }

    const focusCheck = normalizeFocusBranch(input.focusBranch);
    if (!focusCheck.ok) {
      return { ok: false, error: focusCheck.error };
    }

    const primarySubject =
      input.role === 'teacher' ? (input.primarySubject ?? '').trim() : undefined;
    if (input.role === 'teacher' && !primarySubject) {
      return {
        ok: false,
        error: 'Please enter a Primary Subject / Kitab for the teacher account.',
      };
    }

    const store = loadStore(now);
    const normalizedEmail = input.email.trim().toLowerCase();
    const duplicate = store.profiles.some(
      (p) => p.pathway === 'qawmi' && p.email.toLowerCase() === normalizedEmail
    );
    if (duplicate) {
      return {
        ok: false,
        error: `An account with email ${normalizedEmail} already exists in ${getQawmiPanelName()}.`,
      };
    }

    const profile: QawmiAdminUserProfile = {
      id: `QAWMI-USR-${input.role === 'teacher' ? 'T' : 'S'}${now % 100000}`,
      role: input.role,
      pathway: 'qawmi',
      fullName: input.fullName.trim(),
      email: normalizedEmail,
      passwordHash: hashPassword(input.temporaryPassword),
      marhala: input.marhala,
      assignedMarhalas: input.role === 'teacher' ? [input.marhala] : undefined,
      focusBranch: focusCheck.focusBranch,
      primarySubject,
      status: 'active',
      registrationType: 'manual_admin',
      joinedAt: now,
      updatedAt: now,
    };

    store.profiles.unshift(profile);
    appendActivity(
      store,
      'directory',
      `Manually provisioned active ${input.role === 'teacher' ? 'Teacher' : 'Student'} account for ${profile.fullName} (${getShortMarhalaLabel(profile.marhala)} • ${profile.focusBranch}).`,
      actorEmail,
      now
    );
    saveStore(store);

    return {
      ok: true,
      profile,
      credentialsSummary: {
        pathwayLabel: 'Qawmi Madrasa',
        roleLabel: input.role === 'teacher' ? 'Teacher' : 'Student',
        fullName: profile.fullName,
        email: profile.email,
        temporaryPassword: input.temporaryPassword,
        marhala: profile.marhala,
        focusBranch: profile.focusBranch,
        primarySubject: profile.primarySubject,
      },
    };
  },

  // --- NOTICES ---
  listNotices(
    filters: {
      audience?: 'all' | QawmiNoticeAudience;
      marhala?: 'all' | QawmiMarhala;
      focusBranch?: 'all' | QawmiFocusBranch;
      query?: string;
    } = {},
    now = Date.now()
  ): QawmiAdminNotice[] {
    const store = loadStore(now);
    const q = (filters.query ?? '').trim().toLowerCase();
    return store.notices
      .filter((n) => n.pathway === 'qawmi')
      .filter((n) => {
        if (filters.audience && filters.audience !== 'all' && n.audience !== filters.audience) {
          return false;
        }
        if (filters.marhala && filters.marhala !== 'all' && n.marhala !== filters.marhala) {
          return false;
        }
        if (
          filters.focusBranch &&
          filters.focusBranch !== 'all' &&
          n.focusBranch !== filters.focusBranch
        ) {
          return false;
        }
        if (q) {
          const hay = `${n.title} ${n.description} ${n.tag} ${n.audience} ${n.marhala} ${n.focusBranch}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => b.createdAt - a.createdAt);
  },

  createNotice(
    input: {
      title: string;
      description: string;
      audience: QawmiNoticeAudience;
      marhala: 'all' | QawmiMarhala;
      focusBranch?: 'all' | QawmiFocusBranch;
      tag: QawmiNoticeTag;
    },
    actorEmail?: string,
    now = Date.now()
  ): { ok: true; notice: QawmiAdminNotice } | { ok: false; error: string } {
    const title = input.title.trim();
    const description = input.description.trim();
    if (title.length < 3) {
      return { ok: false, error: 'Notice title must be at least 3 characters.' };
    }
    if (description.length < 10) {
      return { ok: false, error: 'Notice description must be at least 10 characters.' };
    }
    if (input.marhala !== 'all' && !isValidMarhala(input.marhala)) {
      return { ok: false, error: 'Selected Marhala is invalid for Qawmi Madrasa.' };
    }

    let resolvedFocus: 'all' | QawmiFocusBranch = 'all';
    if (input.focusBranch && input.focusBranch !== 'all') {
      if (!isValidFocusBranch(input.focusBranch)) {
        return { ok: false, error: 'Selected Focus / Branch is invalid for Qawmi Madrasa.' };
      }
      resolvedFocus = input.focusBranch;
    }

    const store = loadStore(now);
    const notice: QawmiAdminNotice = {
      id: `QAWMI-NTC-${now}-${Math.floor(Math.random() * 1000)}`,
      pathway: 'qawmi',
      title,
      description,
      audience: input.audience,
      marhala: input.marhala,
      focusBranch: resolvedFocus,
      tag: input.tag,
      createdAt: now,
      updatedAt: now,
    };
    store.notices.unshift(notice);
    appendActivity(
      store,
      'notice',
      `Published ${notice.tag} notice: ${notice.title}.`,
      actorEmail,
      now
    );
    saveStore(store);
    return { ok: true, notice };
  },

  updateNotice(
    noticeId: string,
    patch: {
      title: string;
      description: string;
      audience: QawmiNoticeAudience;
      marhala: 'all' | QawmiMarhala;
      focusBranch?: 'all' | QawmiFocusBranch;
      tag: QawmiNoticeTag;
    },
    actorEmail?: string,
    now = Date.now()
  ): { ok: true; notice: QawmiAdminNotice } | { ok: false; error: string } {
    const store = loadStore(now);
    const idx = store.notices.findIndex((n) => n.id === noticeId && n.pathway === 'qawmi');
    if (idx === -1) {
      return { ok: false, error: 'Notice not found in Qawmi Madrasa.' };
    }

    const title = patch.title.trim();
    const description = patch.description.trim();
    if (title.length < 3) {
      return { ok: false, error: 'Notice title must be at least 3 characters.' };
    }
    if (description.length < 10) {
      return { ok: false, error: 'Notice description must be at least 10 characters.' };
    }
    if (patch.marhala !== 'all' && !isValidMarhala(patch.marhala)) {
      return { ok: false, error: 'Selected Marhala is invalid for Qawmi Madrasa.' };
    }

    let resolvedFocus: 'all' | QawmiFocusBranch = 'all';
    if (patch.focusBranch && patch.focusBranch !== 'all') {
      if (!isValidFocusBranch(patch.focusBranch)) {
        return { ok: false, error: 'Selected Focus / Branch is invalid for Qawmi Madrasa.' };
      }
      resolvedFocus = patch.focusBranch;
    }

    const updated: QawmiAdminNotice = {
      ...store.notices[idx],
      title,
      description,
      audience: patch.audience,
      marhala: patch.marhala,
      focusBranch: resolvedFocus,
      tag: patch.tag,
      updatedAt: now,
    };
    store.notices[idx] = updated;
    appendActivity(
      store,
      'notice',
      `Updated notice: ${updated.title}.`,
      actorEmail,
      now
    );
    saveStore(store);
    return { ok: true, notice: updated };
  },

  deleteNotice(
    noticeId: string,
    actorEmail?: string,
    now = Date.now()
  ): { ok: true } | { ok: false; error: string } {
    const store = loadStore(now);
    const idx = store.notices.findIndex((n) => n.id === noticeId && n.pathway === 'qawmi');
    if (idx === -1) {
      return { ok: false, error: 'Notice not found in Qawmi Madrasa.' };
    }
    const [removed] = store.notices.splice(idx, 1);
    appendActivity(
      store,
      'notice',
      `Deleted notice: ${removed.title}.`,
      actorEmail,
      now
    );
    saveStore(store);
    return { ok: true };
  },

  // --- SECURITY & ADMIN PASSWORD ---
  updateAdminPassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
    now = Date.now()
  ): { ok: true } | { ok: false; error: string } {
    const db = loadDatabase(now);
    const idx = db.users.findIndex((u) => u.id === userId && u.role === 'admin');
    if (idx === -1) {
      return { ok: false, error: 'Admin account not found.' };
    }
    if (!verifyPassword(currentPassword, db.users[idx].passwordHash)) {
      return { ok: false, error: 'Current password is incorrect.' };
    }
    const pwCheck = validatePassword(newPassword);
    if (!pwCheck.valid) {
      return { ok: false, error: 'New password must be at least 8 characters long.' };
    }
    if (currentPassword === newPassword) {
      return { ok: false, error: 'New password must be different from your current password.' };
    }
    db.users[idx] = {
      ...db.users[idx],
      passwordHash: hashPassword(newPassword),
      mustChangePassword: false,
    };
    saveDatabase(db);

    const store = loadStore(now);
    appendActivity(
      store,
      'security',
      `Updated admin account password for ${db.users[idx].email}.`,
      db.users[idx].email,
      now
    );
    saveStore(store);
    return { ok: true };
  },

  recordSecurityActivity(
    summary: string,
    actorEmail?: string,
    now = Date.now()
  ): void {
    const store = loadStore(now);
    appendActivity(store, 'security', summary, actorEmail, now);
    saveStore(store);
  },
};
