import { loadDatabase, saveDatabase } from './storage';
import type { CouponStatus, UserAccount } from '../types/domain';
import { hashPassword, verifyPassword } from '../utils/crypto';
import { validateEmail, validateFullName, validatePassword } from '../utils/validation';

export type AliaPathway = 'alia';
export type AliaAdminRole = 'teacher' | 'student';
export type AliaRegistrationType = 'coupon_auto' | 'manual_admin';
export type AliaUserStatus = 'active' | 'suspended';
export type AliaNoticeAudience = 'teacher' | 'student' | 'both';
export type AliaNoticeTag = 'General' | 'Exam' | 'Urgent';

export type AliaMarhala =
  | 'Ebtedayee (Classes 1–5)'
  | 'Dakhil (Classes 6–10)'
  | 'Alim (Classes 11–12)'
  | 'Fazil (Degree / Pass)'
  | 'Kamil (Masters)';

export type AliaDepartment =
  | 'General'
  | 'Science'
  | 'Muzabbid Mahire Tajweed'
  | 'Hifzul Quran'
  | 'Hadith & Tafsir'
  | 'Fiqh & Usul';

export const ALIA_MARHALAS: readonly AliaMarhala[] = [
  'Ebtedayee (Classes 1–5)',
  'Dakhil (Classes 6–10)',
  'Alim (Classes 11–12)',
  'Fazil (Degree / Pass)',
  'Kamil (Masters)',
] as const;

export const ALIA_ALL_DEPARTMENTS: readonly AliaDepartment[] = [
  'General',
  'Science',
  'Muzabbid Mahire Tajweed',
  'Hifzul Quran',
  'Hadith & Tafsir',
  'Fiqh & Usul',
] as const;

const MARHALA_DEPARTMENT_MAP: Record<AliaMarhala, readonly AliaDepartment[]> = {
  'Ebtedayee (Classes 1–5)': ['General', 'Hifzul Quran', 'Muzabbid Mahire Tajweed'],
  'Dakhil (Classes 6–10)': ['General', 'Science', 'Muzabbid Mahire Tajweed'],
  'Alim (Classes 11–12)': ['General', 'Science', 'Muzabbid Mahire Tajweed'],
  'Fazil (Degree / Pass)': ['Hadith & Tafsir', 'Fiqh & Usul', 'General'],
  'Kamil (Masters)': ['Hadith & Tafsir', 'Fiqh & Usul', 'General'],
};

export interface AliaAdminCoupon {
  id: string;
  code: string;
  pathway: AliaPathway;
  role: AliaAdminRole;
  status: CouponStatus;
  createdAt: number;
  expiresAt: number;
  usedAt?: number;
  issuedBy: string;
}

export interface AliaAdminPendingRegistration {
  id: string;
  role: AliaAdminRole;
  pathway: AliaPathway;
  fullName: string;
  email: string;
  marhala: AliaMarhala;
  assignedMarhalas?: AliaMarhala[];
  department: AliaDepartment;
  primarySubject?: string;
  couponCode: string;
  submittedAt: number;
  expiresAt: number;
}

export interface AliaAdminUserProfile {
  id: string;
  role: AliaAdminRole;
  pathway: AliaPathway;
  fullName: string;
  email: string;
  passwordHash: string;
  marhala: AliaMarhala;
  assignedMarhalas?: AliaMarhala[];
  department: AliaDepartment;
  primarySubject?: string;
  status: AliaUserStatus;
  registrationType: AliaRegistrationType;
  couponCode?: string;
  joinedAt: number;
  updatedAt?: number;
}

export interface AliaAdminNotice {
  id: string;
  pathway: AliaPathway;
  title: string;
  description: string;
  audience: AliaNoticeAudience;
  marhala: 'all' | AliaMarhala;
  department: 'all' | AliaDepartment;
  tag: AliaNoticeTag;
  createdAt: number;
  updatedAt: number;
}

export interface AliaAdminActivityItem {
  id: string;
  pathway: AliaPathway;
  category: 'coupon' | 'approval' | 'directory' | 'notice' | 'security';
  summary: string;
  actorEmail: string;
  createdAt: number;
}

export interface AliaOverviewMetrics {
  activeTeachers: number;
  activeStudents: number;
  pendingApprovals: number;
  activeCoupons: number;
}

interface AliaAdminStore {
  coupons: AliaAdminCoupon[];
  pending: AliaAdminPendingRegistration[];
  profiles: AliaAdminUserProfile[];
  notices: AliaAdminNotice[];
  activities: AliaAdminActivityItem[];
  adminSeeded?: boolean;
}

const STORAGE_KEY = 'edura_alia_admin_workspace_v1';
const FORTY_EIGHT_HOURS_MS = 48 * 60 * 60 * 1000;
const DEFAULT_ADMIN_ACTOR = 'admin@alia-madrasa.edu.bd';

let memoryStore: AliaAdminStore | null = null;

function canUseLocalStorage(): boolean {
  try {
    return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
  } catch {
    return false;
  }
}

export function resolveAliaAdminPathway(raw?: string | null): AliaPathway | null {
  if (!raw) return null;
  const normalized = raw.trim().toLowerCase();
  if (
    normalized === 'alia' ||
    normalized === 'alia madrasa' ||
    normalized === 'alia_madrasa' ||
    normalized === 'alia panel' ||
    normalized === 'alia madrasa panel'
  ) {
    return 'alia';
  }
  return null;
}

export function getAliaPanelName(): string {
  return 'Alia Madrasa Panel';
}

export function getAliaStreamLabel(): string {
  return 'Bangladesh Madrasa Education';
}

export function getAliaBoardLabel(): string {
  return 'Bangladesh Madrasah Education Board (BMEB)';
}

export interface AliaDemoAdminPreset {
  pathway: AliaPathway;
  pathwayLabel: 'Alia';
  panelName: string;
  quickAccessTitle: string;
  fullName: string;
  email: string;
  password: string;
  phone: string;
}

export function getDemoAliaAdminPreset(): AliaDemoAdminPreset {
  return {
    pathway: 'alia',
    pathwayLabel: 'Alia',
    panelName: 'Alia Madrasa Panel',
    quickAccessTitle: 'Quick Alia Panel Access',
    fullName: 'Alia Madrasa Admin',
    email: 'admin.alia@example.com',
    password: 'Admin@1234',
    phone: '01710000103',
  };
}

export function getShortMarhalaLabel(marhala: AliaMarhala): string {
  switch (marhala) {
    case 'Ebtedayee (Classes 1–5)':
      return 'Ebtedayee';
    case 'Dakhil (Classes 6–10)':
      return 'Dakhil';
    case 'Alim (Classes 11–12)':
      return 'Alim';
    case 'Fazil (Degree / Pass)':
      return 'Fazil';
    case 'Kamil (Masters)':
      return 'Kamil';
  }
}

export function getDepartmentsForMarhala(marhala: AliaMarhala): readonly AliaDepartment[] {
  return MARHALA_DEPARTMENT_MAP[marhala] ?? ['General'];
}

export function isValidMarhala(value: string): value is AliaMarhala {
  return (ALIA_MARHALAS as readonly string[]).includes(value);
}

export function isValidDepartment(value: string): value is AliaDepartment {
  return (ALIA_ALL_DEPARTMENTS as readonly string[]).includes(value);
}

export function isValidDepartmentForMarhala(
  marhala: AliaMarhala,
  department: string
): department is AliaDepartment {
  return (getDepartmentsForMarhala(marhala) as readonly string[]).includes(department);
}

export function normalizeDepartmentForMarhala(
  marhala: AliaMarhala,
  rawDepartment?: string
): { ok: true; department: AliaDepartment } | { ok: false; error: string } {
  const allowed = getDepartmentsForMarhala(marhala);
  if (rawDepartment && isValidDepartmentForMarhala(marhala, rawDepartment)) {
    return { ok: true, department: rawDepartment };
  }
  return {
    ok: false,
    error: `Please select a valid Department / Stream for ${getShortMarhalaLabel(marhala)} (${allowed.join(', ')}).`,
  };
}

export function formatAliaAcademicDisplay(item: {
  role: AliaAdminRole;
  marhala: AliaMarhala;
  department: AliaDepartment;
  primarySubject?: string;
}): { marhalaShort: string; detail: string } {
  const marhalaShort = getShortMarhalaLabel(item.marhala);
  if (item.role === 'teacher' && item.primarySubject?.trim()) {
    return {
      marhalaShort,
      detail: `${item.department} · ${item.primarySubject.trim()}`,
    };
  }
  return {
    marhalaShort,
    detail: item.department,
  };
}

export function getAliaSubjectSuggestions(
  marhala: AliaMarhala,
  department: AliaDepartment
): readonly string[] {
  if (department === 'Science') {
    return [
      'Physics',
      'Chemistry',
      'Biology',
      'Higher Mathematics',
      'Mathematics',
      'ICT',
      'Quran Majeed & Tajweed',
    ];
  }
  if (department === 'Hifzul Quran' || department === 'Muzabbid Mahire Tajweed') {
    return [
      'Quran Majeed & Tajweed',
      'Hifzul Quran & Tahfeez Practice',
      'Ilmul Qira’at & Jazariyyah',
      'Arabic Grammar & Literature',
      'Fiqh & Usul',
    ];
  }
  if (marhala === 'Fazil (Degree / Pass)' || marhala === 'Kamil (Masters)' || department === 'Hadith & Tafsir' || department === 'Fiqh & Usul') {
    return [
      'Hadith Sharif (Sahihayn & Mishkat)',
      'Tafsir & Ulum al-Quran',
      'Fiqh & Usul al-Fiqh',
      'Arabic Literature & Balaghat',
      'Islamic History & Culture',
    ];
  }
  return [
    'Hadith Sharif',
    'Quran Majeed & Tajweed',
    'Arabic Grammar & Literature',
    'Fiqh & Usul',
    'Islamic History',
    'English',
    'Bangla',
    'ICT',
  ];
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

export function getAliaUserInitials(fullName: string): string {
  const parts = fullName
    .trim()
    .split(/\s+/)
    .filter(
      (p) =>
        p &&
        !/^(dr\.|prof\.|mr\.|ms\.|mrs\.|maulana|ustad|ustadha|hafez|mufti)$/i.test(p)
    );
  if (parts.length === 0) {
    const raw = fullName.trim().split(/\s+/).filter(Boolean);
    return (raw[0]?.[0] ?? 'A').toUpperCase();
  }
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function createSeedStore(now = Date.now()): AliaAdminStore {
  const hour = 60 * 60 * 1000;
  const day = 24 * hour;
  const studentHash = hashPassword('Student@1234');
  const teacherHash = hashPassword('Teacher@1234');

  const coupons: AliaAdminCoupon[] = [
    {
      id: 'ALIA-CPN-T01',
      code: 'T-74310',
      pathway: 'alia',
      role: 'teacher',
      status: 'active',
      createdAt: now - 2 * hour,
      expiresAt: now + 46 * hour,
      issuedBy: DEFAULT_ADMIN_ACTOR,
    },
    {
      id: 'ALIA-CPN-S01',
      code: 'S-74201',
      pathway: 'alia',
      role: 'student',
      status: 'active',
      createdAt: now - 3 * hour,
      expiresAt: now + 45 * hour,
      issuedBy: DEFAULT_ADMIN_ACTOR,
    },
    {
      id: 'ALIA-CPN-T02',
      code: 'T-74325',
      pathway: 'alia',
      role: 'teacher',
      status: 'active',
      createdAt: now - 4 * hour,
      expiresAt: now + 44 * hour,
      issuedBy: DEFAULT_ADMIN_ACTOR,
    },
    {
      id: 'ALIA-CPN-S02',
      code: 'S-74219',
      pathway: 'alia',
      role: 'student',
      status: 'active',
      createdAt: now - 5 * hour,
      expiresAt: now + 43 * hour,
      issuedBy: DEFAULT_ADMIN_ACTOR,
    },
    {
      id: 'ALIA-CPN-T03',
      code: 'T-74190',
      pathway: 'alia',
      role: 'teacher',
      status: 'used',
      createdAt: now - 16 * hour,
      expiresAt: now + 32 * hour,
      usedAt: now - 10 * hour,
      issuedBy: DEFAULT_ADMIN_ACTOR,
    },
    {
      id: 'ALIA-CPN-S03',
      code: 'S-74105',
      pathway: 'alia',
      role: 'student',
      status: 'used',
      createdAt: now - 20 * hour,
      expiresAt: now + 28 * hour,
      usedAt: now - 12 * hour,
      issuedBy: DEFAULT_ADMIN_ACTOR,
    },
    {
      id: 'ALIA-CPN-T04',
      code: 'T-74077',
      pathway: 'alia',
      role: 'teacher',
      status: 'expired',
      createdAt: now - 60 * hour,
      expiresAt: now - 12 * hour,
      issuedBy: DEFAULT_ADMIN_ACTOR,
    },
    {
      id: 'ALIA-CPN-S04',
      code: 'S-74088',
      pathway: 'alia',
      role: 'student',
      status: 'expired',
      createdAt: now - 72 * hour,
      expiresAt: now - 24 * hour,
      issuedBy: DEFAULT_ADMIN_ACTOR,
    },
  ];

  const pending: AliaAdminPendingRegistration[] = [
    {
      id: 'ALIA-PND-T01',
      role: 'teacher',
      pathway: 'alia',
      fullName: 'Ustadha Mariam Siddiqua',
      email: 'mariam.siddiqua@alia-teacher.edu.bd',
      marhala: 'Alim (Classes 11–12)',
      assignedMarhalas: ['Dakhil (Classes 6–10)', 'Alim (Classes 11–12)'],
      department: 'General',
      primarySubject: 'Arabic Grammar & Literature',
      couponCode: 'T-74190',
      submittedAt: now - 6 * hour,
      expiresAt: now + 42 * hour,
    },
    {
      id: 'ALIA-PND-T02',
      role: 'teacher',
      pathway: 'alia',
      fullName: 'Mufti Habibur Rahman',
      email: 'habibur.rahman@alia-teacher.edu.bd',
      marhala: 'Fazil (Degree / Pass)',
      assignedMarhalas: ['Fazil (Degree / Pass)', 'Kamil (Masters)'],
      department: 'Fiqh & Usul',
      primarySubject: 'Fiqh & Usul al-Fiqh',
      couponCode: 'T-74418',
      submittedAt: now - 9 * hour,
      expiresAt: now + 39 * hour,
    },
    {
      id: 'ALIA-PND-S01',
      role: 'student',
      pathway: 'alia',
      fullName: 'Saiful Islam',
      email: 'saiful.islam@alia-student.edu.bd',
      marhala: 'Alim (Classes 11–12)',
      department: 'General',
      couponCode: 'S-74105',
      submittedAt: now - 8 * hour,
      expiresAt: now + 40 * hour,
    },
    {
      id: 'ALIA-PND-S02',
      role: 'student',
      pathway: 'alia',
      fullName: 'Nusayba Tasnim',
      email: 'nusayba.t@alia-student.edu.bd',
      marhala: 'Dakhil (Classes 6–10)',
      department: 'Science',
      couponCode: 'S-74402',
      submittedAt: now - 11 * hour,
      expiresAt: now + 37 * hour,
    },
    {
      id: 'ALIA-PND-S03',
      role: 'student',
      pathway: 'alia',
      fullName: 'Yusuf Al-Amin',
      email: 'yusuf.alamin@alia-student.edu.bd',
      marhala: 'Fazil (Degree / Pass)',
      department: 'Hadith & Tafsir',
      couponCode: 'S-74459',
      submittedAt: now - 14 * hour,
      expiresAt: now + 34 * hour,
    },
  ];

  const profiles: AliaAdminUserProfile[] = [
    // Teachers
    {
      id: 'alia-teacher-demo-01',
      role: 'teacher',
      pathway: 'alia',
      fullName: 'Maulana Abdul Karim',
      email: 'abdul.karim@alia-teacher.edu.bd',
      passwordHash: teacherHash,
      marhala: 'Alim (Classes 11–12)',
      assignedMarhalas: [
        'Dakhil (Classes 6–10)',
        'Alim (Classes 11–12)',
        'Fazil (Degree / Pass)',
      ],
      department: 'General',
      primarySubject: 'Hadith Sharif',
      status: 'active',
      registrationType: 'coupon_auto',
      couponCode: 'T-74010',
      joinedAt: now - 45 * day,
      updatedAt: now - 3 * day,
    },
    {
      id: 'alia-teacher-02',
      role: 'teacher',
      pathway: 'alia',
      fullName: 'Dr. Shafiqul Islam Nadvi',
      email: 'shafiqul.nadvi@alia-teacher.edu.bd',
      passwordHash: teacherHash,
      marhala: 'Kamil (Masters)',
      assignedMarhalas: ['Fazil (Degree / Pass)', 'Kamil (Masters)'],
      department: 'Hadith & Tafsir',
      primarySubject: 'Tafsir & Ulum al-Quran',
      status: 'active',
      registrationType: 'manual_admin',
      joinedAt: now - 32 * day,
      updatedAt: now - 2 * day,
    },
    {
      id: 'alia-teacher-03',
      role: 'teacher',
      pathway: 'alia',
      fullName: 'Farhana Yasmin',
      email: 'farhana.science@alia-teacher.edu.bd',
      passwordHash: teacherHash,
      marhala: 'Dakhil (Classes 6–10)',
      assignedMarhalas: ['Dakhil (Classes 6–10)', 'Alim (Classes 11–12)'],
      department: 'Science',
      primarySubject: 'Physics',
      status: 'active',
      registrationType: 'manual_admin',
      joinedAt: now - 18 * day,
      updatedAt: now - 1 * day,
    },
    {
      id: 'alia-teacher-04',
      role: 'teacher',
      pathway: 'alia',
      fullName: 'Qari Mahmudullah',
      email: 'mahmudullah.qari@alia-teacher.edu.bd',
      passwordHash: teacherHash,
      marhala: 'Ebtedayee (Classes 1–5)',
      assignedMarhalas: ['Ebtedayee (Classes 1–5)', 'Dakhil (Classes 6–10)'],
      department: 'Muzabbid Mahire Tajweed',
      primarySubject: 'Quran Majeed & Tajweed',
      status: 'active',
      registrationType: 'coupon_auto',
      couponCode: 'T-73982',
      joinedAt: now - 27 * day,
      updatedAt: now - 4 * day,
    },

    // Students
    {
      id: 'alia-student-demo-01',
      role: 'student',
      pathway: 'alia',
      fullName: 'Mahmudul Hasan',
      email: 'mahmudul.hasan@alia-student.edu.bd',
      passwordHash: studentHash,
      marhala: 'Dakhil (Classes 6–10)',
      department: 'Science',
      status: 'active',
      registrationType: 'coupon_auto',
      couponCode: 'S-74011',
      joinedAt: now - 21 * day,
      updatedAt: now - 2 * day,
    },
    {
      id: 'alia-student-02',
      role: 'student',
      pathway: 'alia',
      fullName: 'Sumaiya Akter',
      email: 'sumaiya.akter@alia-student.edu.bd',
      passwordHash: studentHash,
      marhala: 'Alim (Classes 11–12)',
      department: 'General',
      status: 'active',
      registrationType: 'coupon_auto',
      couponCode: 'S-74018',
      joinedAt: now - 16 * day,
      updatedAt: now - 1 * day,
    },
    {
      id: 'alia-student-03',
      role: 'student',
      pathway: 'alia',
      fullName: 'Abdullah Al Noman',
      email: 'abdullah.noman@alia-student.edu.bd',
      passwordHash: studentHash,
      marhala: 'Ebtedayee (Classes 1–5)',
      department: 'Hifzul Quran',
      status: 'active',
      registrationType: 'manual_admin',
      joinedAt: now - 30 * day,
      updatedAt: now - 3 * day,
    },
    {
      id: 'alia-student-04',
      role: 'student',
      pathway: 'alia',
      fullName: 'Tahmidur Rahman',
      email: 'tahmidur.rahman@alia-student.edu.bd',
      passwordHash: studentHash,
      marhala: 'Fazil (Degree / Pass)',
      department: 'Hadith & Tafsir',
      status: 'active',
      registrationType: 'coupon_auto',
      couponCode: 'S-74025',
      joinedAt: now - 40 * day,
      updatedAt: now - 5 * day,
    },
    {
      id: 'alia-student-05',
      role: 'student',
      pathway: 'alia',
      fullName: 'Nusrat Jahan Mim',
      email: 'nusrat.mim@alia-student.edu.bd',
      passwordHash: studentHash,
      marhala: 'Kamil (Masters)',
      department: 'Fiqh & Usul',
      status: 'active',
      registrationType: 'coupon_auto',
      couponCode: 'S-74031',
      joinedAt: now - 52 * day,
      updatedAt: now - 4 * day,
    },
    {
      id: 'alia-student-06',
      role: 'student',
      pathway: 'alia',
      fullName: 'Tariqul Islam Tareq',
      email: 'tariqul.tareq@alia-student.edu.bd',
      passwordHash: studentHash,
      marhala: 'Dakhil (Classes 6–10)',
      department: 'Muzabbid Mahire Tajweed',
      status: 'suspended',
      registrationType: 'coupon_auto',
      couponCode: 'S-73915',
      joinedAt: now - 34 * day,
      updatedAt: now - 6 * day,
    },
  ];

  const notices: AliaAdminNotice[] = [
    {
      id: 'ALIA-NTC-04',
      pathway: 'alia',
      title: 'Urgent: BMEB E-SIF Registration Verification & Photo Check',
      description:
        'All Alia Madrasa faculty and class Ustads must verify student Marhala and Department entries on the BMEB E-SIF registration roster posted outside the Principal’s office before Friday 2:00 PM.',
      audience: 'both',
      marhala: 'all',
      department: 'all',
      tag: 'Urgent',
      createdAt: now - 5 * hour,
      updatedAt: now - 5 * hour,
    },
    {
      id: 'ALIA-NTC-01',
      pathway: 'alia',
      title: 'BMEB Dakhil & Alim Pre-Test Examination Schedule Published',
      description:
        'The Academic Council has finalized the upcoming Pre-Test examination timetable for all Alia Madrasa learners. Written papers for Quran Majeed & Tajweed, Hadith Sharif, and Arabic Grammar begin Sunday at 9:30 AM.',
      audience: 'both',
      marhala: 'all',
      department: 'all',
      tag: 'Exam',
      createdAt: now - 8 * hour,
      updatedAt: now - 8 * hour,
    },
    {
      id: 'ALIA-NTC-06',
      pathway: 'alia',
      title: 'Faculty Moderation Meeting for Alim & Dakhil Answer Scripts',
      description:
        'Internal faculty circular: All Muhaddis and subject teachers are requested to attend the script moderation briefing in the Teachers’ Common Room on Saturday at 10:30 AM.',
      audience: 'teacher',
      marhala: 'all',
      department: 'all',
      tag: 'General',
      createdAt: now - 12 * hour,
      updatedAt: now - 12 * hour,
    },
    {
      id: 'ALIA-NTC-02',
      pathway: 'alia',
      title: 'Dakhil Science Practical Lab & Experiment Notebook Submission',
      description:
        'Dakhil Science department students must submit their completed Physics and Chemistry practical notebooks to the Science Laboratory coordinator before Wednesday 1:00 PM.',
      audience: 'student',
      marhala: 'Dakhil (Classes 6–10)',
      department: 'Science',
      tag: 'Exam',
      createdAt: now - 18 * hour,
      updatedAt: now - 18 * hour,
    },
    {
      id: 'ALIA-NTC-05',
      pathway: 'alia',
      title: 'Fazil Hadith & Tafsir Research Colloquium Seminar',
      description:
        'Fazil (Degree / Pass) Hadith & Tafsir students are invited to attend the Mishkat al-Masabih Sanad & Matn analysis seminar in the Senior Library Hall this Thursday at 11:00 AM.',
      audience: 'student',
      marhala: 'Fazil (Degree / Pass)',
      department: 'Hadith & Tafsir',
      tag: 'General',
      createdAt: now - 24 * hour,
      updatedAt: now - 24 * hour,
    },
  ];

  const activities: AliaAdminActivityItem[] = [
    {
      id: 'ALIA-ACT-01',
      pathway: 'alia',
      category: 'approval',
      summary:
        'New Alim General faculty application queued for Ustadha Mariam Siddiqua (T-74190).',
      actorEmail: DEFAULT_ADMIN_ACTOR,
      createdAt: now - 2 * hour,
    },
    {
      id: 'ALIA-ACT-02',
      pathway: 'alia',
      category: 'coupon',
      summary: 'Issued active Teacher coupon T-74310 (48h validity) under Alia Madrasa Panel.',
      actorEmail: DEFAULT_ADMIN_ACTOR,
      createdAt: now - 3 * hour,
    },
    {
      id: 'ALIA-ACT-03',
      pathway: 'alia',
      category: 'notice',
      summary:
        'Published Urgent notice: BMEB E-SIF Registration Verification & Photo Check.',
      actorEmail: DEFAULT_ADMIN_ACTOR,
      createdAt: now - 5 * hour,
    },
    {
      id: 'ALIA-ACT-04',
      pathway: 'alia',
      category: 'directory',
      summary:
        'Manually provisioned active Kamil Hadith & Tafsir faculty account for Dr. Shafiqul Islam Nadvi.',
      actorEmail: DEFAULT_ADMIN_ACTOR,
      createdAt: now - 14 * hour,
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

function mergeAdminBaselineIfNeeded(store: AliaAdminStore, now: number): boolean {
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

function loadStore(now = Date.now()): AliaAdminStore {
  let store: AliaAdminStore | null = null;
  if (canUseLocalStorage()) {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as AliaAdminStore;
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

function saveStore(store: AliaAdminStore): void {
  if (canUseLocalStorage()) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } else {
    memoryStore = store;
  }
}

export function resetAliaAdminStore(now = Date.now()): void {
  const seeded = createSeedStore(now);
  saveStore(seeded);
}

function appendActivity(
  store: AliaAdminStore,
  category: AliaAdminActivityItem['category'],
  summary: string,
  actorEmail?: string,
  now = Date.now()
): void {
  store.activities.unshift({
    id: `ALIA-ACT-${now}-${Math.floor(Math.random() * 1000)}`,
    pathway: 'alia',
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

export const aliaAdminService = {
  /**
   * Ensures the demo Alia Madrasa admin account exists in edura_multi_db_v1
   * without modifying storage.ts or any NCTB / International / Qawmi accounts.
   */
  prepareAliaAdminForLogin(rawEmail: string, now = Date.now()): void {
    const email = rawEmail.trim().toLowerCase();
    const preset = getDemoAliaAdminPreset();
    if (email !== preset.email) return;

    const db = loadDatabase(now);
    const existing = db.users.find(
      (u) => u.role === 'admin' && u.email.toLowerCase() === preset.email
    );
    if (!existing) {
      const account: UserAccount = {
        id: 'admin-alia',
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
  getOverviewMetrics(now = Date.now()): AliaOverviewMetrics {
    const store = loadStore(now);
    const profiles = store.profiles.filter((p) => p.pathway === 'alia');
    const pending = store.pending.filter((p) => p.pathway === 'alia');
    const coupons = store.coupons.filter((c) => c.pathway === 'alia');

    return {
      activeTeachers: profiles.filter((p) => p.role === 'teacher' && p.status === 'active').length,
      activeStudents: profiles.filter((p) => p.role === 'student' && p.status === 'active').length,
      pendingApprovals: pending.length,
      activeCoupons: coupons.filter((c) => c.status === 'active' && c.expiresAt > now).length,
    };
  },

  listActivities(limit = 10, now = Date.now()): AliaAdminActivityItem[] {
    const store = loadStore(now);
    return store.activities
      .filter((a) => a.pathway === 'alia')
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, limit);
  },

  // --- COUPONS ---
  listCoupons(
    filters: { status?: 'all' | CouponStatus; query?: string } = {},
    now = Date.now()
  ): AliaAdminCoupon[] {
    const store = loadStore(now);
    const q = (filters.query ?? '').trim().toLowerCase();
    return store.coupons
      .filter((c) => c.pathway === 'alia')
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
    role: AliaAdminRole,
    actorEmail?: string,
    now = Date.now()
  ): AliaAdminCoupon {
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
    const coupon: AliaAdminCoupon = {
      id: `ALIA-CPN-${prefix}-${now}-${digits}`,
      code,
      pathway: 'alia',
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
      `Generated ${role === 'teacher' ? 'Teacher' : 'Student'} coupon ${code} (48h validity) under Alia Madrasa Panel.`,
      actorEmail,
      now
    );
    saveStore(store);
    return coupon;
  },

  // --- USERS: PENDING APPROVALS ---
  listPending(role?: AliaAdminRole, now = Date.now()): AliaAdminPendingRegistration[] {
    const store = loadStore(now);
    return store.pending
      .filter((item) => item.pathway === 'alia')
      .filter((item) => (role ? item.role === role : true))
      .sort((a, b) => b.submittedAt - a.submittedAt);
  },

  editPending(
    pendingId: string,
    patch: {
      fullName: string;
      email: string;
      marhala: AliaMarhala;
      department: AliaDepartment;
      primarySubject?: string;
    },
    actorEmail?: string,
    now = Date.now()
  ): { ok: true; item: AliaAdminPendingRegistration } | { ok: false; error: string } {
    const store = loadStore(now);
    const idx = store.pending.findIndex((p) => p.id === pendingId && p.pathway === 'alia');
    if (idx === -1) {
      return { ok: false, error: 'Pending application not found in Alia Madrasa.' };
    }

    const existing = store.pending[idx];
    const nameCheck = validateFullName(patch.fullName);
    if (!nameCheck.valid) return { ok: false, error: 'Please enter a valid full name.' };

    const emailCheck = validateEmail(patch.email);
    if (!emailCheck.valid) return { ok: false, error: 'Please enter a valid email address.' };

    if (!isValidMarhala(patch.marhala)) {
      return { ok: false, error: 'Please select a valid Alia Madrasa Marhala.' };
    }

    const deptCheck = normalizeDepartmentForMarhala(patch.marhala, patch.department);
    if (!deptCheck.ok) {
      return { ok: false, error: deptCheck.error };
    }

    const primarySubject =
      existing.role === 'teacher' ? (patch.primarySubject ?? '').trim() : undefined;
    if (existing.role === 'teacher' && !primarySubject) {
      return { ok: false, error: 'Please enter a Primary Subject for teacher applicants.' };
    }

    const updated: AliaAdminPendingRegistration = {
      ...existing,
      fullName: patch.fullName.trim(),
      email: patch.email.trim().toLowerCase(),
      marhala: patch.marhala,
      assignedMarhalas:
        existing.role === 'teacher'
          ? Array.from(new Set([patch.marhala, ...(existing.assignedMarhalas ?? [])]))
          : existing.assignedMarhalas,
      department: deptCheck.department,
      primarySubject,
    };
    store.pending[idx] = updated;
    appendActivity(
      store,
      'approval',
      `Updated pending application details for ${updated.fullName} (${getShortMarhalaLabel(updated.marhala)} • ${updated.department}).`,
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
  ): { ok: true; profile: AliaAdminUserProfile } | { ok: false; error: string } {
    const store = loadStore(now);
    const idx = store.pending.findIndex((p) => p.id === pendingId && p.pathway === 'alia');
    if (idx === -1) {
      return { ok: false, error: 'Pending application not found in Alia Madrasa.' };
    }

    const item = store.pending[idx];
    const duplicate = store.profiles.some(
      (p) => p.pathway === 'alia' && p.email.toLowerCase() === item.email.toLowerCase()
    );
    if (duplicate) {
      return {
        ok: false,
        error: `An account with email ${item.email} already exists in ${getAliaPanelName()}.`,
      };
    }

    const profile: AliaAdminUserProfile = {
      id: `ALIA-USR-${item.role === 'teacher' ? 'T' : 'S'}${now % 100000}`,
      role: item.role,
      pathway: 'alia',
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
      department: item.department,
      primarySubject: item.primarySubject,
      status: 'active',
      registrationType: 'coupon_auto',
      couponCode: item.couponCode,
      joinedAt: now,
      updatedAt: now,
    };

    store.profiles.unshift(profile);
    store.pending.splice(idx, 1);

    store.coupons = store.coupons.map((c) =>
      c.pathway === 'alia' && c.code.toUpperCase() === item.couponCode.toUpperCase()
        ? { ...c, status: 'used', usedAt: now }
        : c
    );

    appendActivity(
      store,
      'approval',
      `Approved ${item.role === 'teacher' ? 'Teacher' : 'Student'} ${item.fullName} (${getShortMarhalaLabel(item.marhala)} • ${item.department} · ${item.couponCode}).`,
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
    const idx = store.pending.findIndex((p) => p.id === pendingId && p.pathway === 'alia');
    if (idx === -1) {
      return { ok: false, error: 'Pending application not found in Alia Madrasa.' };
    }

    const [removed] = store.pending.splice(idx, 1);
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
      role?: AliaAdminRole;
      query?: string;
      marhala?: 'all' | AliaMarhala;
      department?: 'all' | AliaDepartment;
      status?: 'all' | AliaUserStatus;
      registrationType?: 'all' | AliaRegistrationType;
    } = {},
    now = Date.now()
  ): AliaAdminUserProfile[] {
    const store = loadStore(now);
    const q = (filters.query ?? '').trim().toLowerCase();
    return store.profiles
      .filter((p) => p.pathway === 'alia')
      .filter((p) => {
        if (filters.role && p.role !== filters.role) return false;
        if (filters.marhala && filters.marhala !== 'all' && p.marhala !== filters.marhala) {
          return false;
        }
        if (
          filters.department &&
          filters.department !== 'all' &&
          p.department !== filters.department
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
          const hay = `${p.fullName} ${p.email} ${p.id} ${p.marhala} ${getShortMarhalaLabel(p.marhala)} ${p.department} ${p.primarySubject ?? ''} ${p.couponCode ?? ''}`.toLowerCase();
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
      marhala: AliaMarhala;
      department: AliaDepartment;
      primarySubject?: string;
    },
    actorEmail?: string,
    now = Date.now()
  ): { ok: true; profile: AliaAdminUserProfile } | { ok: false; error: string } {
    const store = loadStore(now);
    const idx = store.profiles.findIndex((p) => p.id === userId && p.pathway === 'alia');
    if (idx === -1) {
      return { ok: false, error: 'User profile not found in Alia Madrasa.' };
    }

    const existing = store.profiles[idx];
    const nameCheck = validateFullName(patch.fullName);
    if (!nameCheck.valid) return { ok: false, error: 'Please enter a valid full name.' };
    if (!isValidMarhala(patch.marhala)) {
      return { ok: false, error: 'Selected Marhala is invalid for Alia Madrasa.' };
    }

    const deptCheck = normalizeDepartmentForMarhala(patch.marhala, patch.department);
    if (!deptCheck.ok) {
      return { ok: false, error: deptCheck.error };
    }

    const primarySubject =
      existing.role === 'teacher' ? (patch.primarySubject ?? '').trim() : undefined;
    if (existing.role === 'teacher' && !primarySubject) {
      return { ok: false, error: 'Primary Subject cannot be empty for teacher accounts.' };
    }

    const updated: AliaAdminUserProfile = {
      ...existing,
      fullName: patch.fullName.trim(),
      marhala: patch.marhala,
      assignedMarhalas:
        existing.role === 'teacher'
          ? Array.from(new Set([patch.marhala, ...(existing.assignedMarhalas ?? [])]))
          : existing.assignedMarhalas,
      department: deptCheck.department,
      primarySubject,
      updatedAt: now,
    };
    store.profiles[idx] = updated;
    appendActivity(
      store,
      'directory',
      `Updated academic info for ${updated.fullName} (${getShortMarhalaLabel(updated.marhala)} • ${updated.department}${updated.primarySubject ? ` · ${updated.primarySubject}` : ''}).`,
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
    const idx = store.profiles.findIndex((p) => p.id === userId && p.pathway === 'alia');
    if (idx === -1) {
      return { ok: false, error: 'User profile not found in Alia Madrasa.' };
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
    store.profiles[idx] = {
      ...store.profiles[idx],
      passwordHash: hashPassword(temporaryPassword),
      updatedAt: now,
    };
    appendActivity(
      store,
      'security',
      `Reset password for ${store.profiles[idx].fullName} (${store.profiles[idx].email}).`,
      actorEmail,
      now
    );
    saveStore(store);
    return { ok: true, temporaryPassword, email: store.profiles[idx].email };
  },

  toggleUserStatus(
    userId: string,
    actorEmail?: string,
    now = Date.now()
  ): { ok: true; profile: AliaAdminUserProfile } | { ok: false; error: string } {
    const store = loadStore(now);
    const idx = store.profiles.findIndex((p) => p.id === userId && p.pathway === 'alia');
    if (idx === -1) {
      return { ok: false, error: 'User profile not found in Alia Madrasa.' };
    }

    const nextStatus: AliaUserStatus =
      store.profiles[idx].status === 'active' ? 'suspended' : 'active';
    store.profiles[idx] = {
      ...store.profiles[idx],
      status: nextStatus,
      updatedAt: now,
    };
    appendActivity(
      store,
      'directory',
      `${nextStatus === 'active' ? 'Activated' : 'Suspended'} account for ${store.profiles[idx].fullName}.`,
      actorEmail,
      now
    );
    saveStore(store);
    return { ok: true, profile: store.profiles[idx] };
  },

  deleteUser(
    userId: string,
    actorEmail?: string,
    now = Date.now()
  ): { ok: true } | { ok: false; error: string } {
    const store = loadStore(now);
    const idx = store.profiles.findIndex((p) => p.id === userId && p.pathway === 'alia');
    if (idx === -1) {
      return { ok: false, error: 'User profile not found in Alia Madrasa.' };
    }
    const [removed] = store.profiles.splice(idx, 1);
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
    status: AliaUserStatus,
    actorEmail?: string,
    now = Date.now()
  ): number {
    const store = loadStore(now);
    const idSet = new Set(userIds);
    let count = 0;
    store.profiles = store.profiles.map((p) => {
      if (p.pathway === 'alia' && idSet.has(p.id) && p.status !== status) {
        count += 1;
        return { ...p, status, updatedAt: now };
      }
      return p;
    });
    if (count > 0) {
      appendActivity(
        store,
        'directory',
        `Bulk updated ${count} Alia user(s) to ${status}.`,
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
    const before = store.profiles.length;
    store.profiles = store.profiles.filter(
      (p) => !(p.pathway === 'alia' && idSet.has(p.id))
    );
    const removedCount = before - store.profiles.length;
    if (removedCount > 0) {
      appendActivity(
        store,
        'directory',
        `Bulk deleted ${removedCount} Alia user account(s).`,
        actorEmail,
        now
      );
      saveStore(store);
    }
    return removedCount;
  },

  exportDirectoryCsv(users: AliaAdminUserProfile[]): string {
    const headers = [
      'ID',
      'Full Name',
      'Email',
      'Role',
      'Pathway',
      'Marhala',
      'Department / Stream',
      'Primary Subject',
      'Entry Source',
      'Status',
      'Joined Date',
    ];
    const rows = users.map((u) => [
      u.id,
      u.fullName,
      u.email,
      u.role === 'teacher' ? 'Teacher' : 'Student',
      'Alia Madrasa',
      u.marhala,
      u.department,
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
      role: AliaAdminRole;
      fullName: string;
      email: string;
      temporaryPassword: string;
      marhala: AliaMarhala;
      department: AliaDepartment;
      primarySubject?: string;
    },
    actorEmail?: string,
    now = Date.now()
  ):
    | {
        ok: true;
        profile: AliaAdminUserProfile;
        credentialsSummary: {
          pathwayLabel: string;
          roleLabel: string;
          fullName: string;
          email: string;
          temporaryPassword: string;
          marhala: string;
          department: string;
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
      return { ok: false, error: 'Please select a valid Alia Madrasa Marhala.' };
    }

    const deptCheck = normalizeDepartmentForMarhala(input.marhala, input.department);
    if (!deptCheck.ok) {
      return { ok: false, error: deptCheck.error };
    }

    const primarySubject =
      input.role === 'teacher' ? (input.primarySubject ?? '').trim() : undefined;
    if (input.role === 'teacher' && !primarySubject) {
      return { ok: false, error: 'Please enter a Primary Subject for the teacher account.' };
    }

    const store = loadStore(now);
    const normalizedEmail = input.email.trim().toLowerCase();
    const duplicate = store.profiles.some(
      (p) => p.pathway === 'alia' && p.email.toLowerCase() === normalizedEmail
    );
    if (duplicate) {
      return {
        ok: false,
        error: `An account with email ${normalizedEmail} already exists in ${getAliaPanelName()}.`,
      };
    }

    const profile: AliaAdminUserProfile = {
      id: `ALIA-USR-${input.role === 'teacher' ? 'T' : 'S'}${now % 100000}`,
      role: input.role,
      pathway: 'alia',
      fullName: input.fullName.trim(),
      email: normalizedEmail,
      passwordHash: hashPassword(input.temporaryPassword),
      marhala: input.marhala,
      assignedMarhalas: input.role === 'teacher' ? [input.marhala] : undefined,
      department: deptCheck.department,
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
      `Manually provisioned active ${input.role === 'teacher' ? 'Teacher' : 'Student'} account for ${profile.fullName} (${getShortMarhalaLabel(profile.marhala)} • ${profile.department}).`,
      actorEmail,
      now
    );
    saveStore(store);

    return {
      ok: true,
      profile,
      credentialsSummary: {
        pathwayLabel: 'Alia Madrasa',
        roleLabel: input.role === 'teacher' ? 'Teacher' : 'Student',
        fullName: profile.fullName,
        email: profile.email,
        temporaryPassword: input.temporaryPassword,
        marhala: profile.marhala,
        department: profile.department,
        primarySubject: profile.primarySubject,
      },
    };
  },

  // --- NOTICES ---
  listNotices(
    filters: {
      audience?: 'all' | AliaNoticeAudience;
      marhala?: 'all' | AliaMarhala;
      department?: 'all' | AliaDepartment;
      query?: string;
    } = {},
    now = Date.now()
  ): AliaAdminNotice[] {
    const store = loadStore(now);
    const q = (filters.query ?? '').trim().toLowerCase();
    return store.notices
      .filter((n) => n.pathway === 'alia')
      .filter((n) => {
        if (filters.audience && filters.audience !== 'all' && n.audience !== filters.audience) {
          return false;
        }
        if (filters.marhala && filters.marhala !== 'all' && n.marhala !== filters.marhala) {
          return false;
        }
        if (
          filters.department &&
          filters.department !== 'all' &&
          n.department !== filters.department
        ) {
          return false;
        }
        if (q) {
          const hay = `${n.title} ${n.description} ${n.tag} ${n.audience} ${n.marhala} ${n.department}`.toLowerCase();
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
      audience: AliaNoticeAudience;
      marhala: 'all' | AliaMarhala;
      department?: 'all' | AliaDepartment;
      tag: AliaNoticeTag;
    },
    actorEmail?: string,
    now = Date.now()
  ): { ok: true; notice: AliaAdminNotice } | { ok: false; error: string } {
    const title = input.title.trim();
    const description = input.description.trim();
    if (title.length < 3) {
      return { ok: false, error: 'Notice title must be at least 3 characters.' };
    }
    if (description.length < 10) {
      return { ok: false, error: 'Notice description must be at least 10 characters.' };
    }
    if (input.marhala !== 'all' && !isValidMarhala(input.marhala)) {
      return { ok: false, error: 'Selected Marhala is invalid for Alia Madrasa.' };
    }

    let resolvedDept: 'all' | AliaDepartment = 'all';
    if (input.department && input.department !== 'all') {
      if (input.marhala !== 'all') {
        if (!isValidDepartmentForMarhala(input.marhala, input.department)) {
          return {
            ok: false,
            error: `Department "${input.department}" does not belong to ${getShortMarhalaLabel(input.marhala)}.`,
          };
        }
        resolvedDept = input.department;
      } else if (isValidDepartment(input.department)) {
        resolvedDept = input.department;
      }
    }

    const store = loadStore(now);
    const notice: AliaAdminNotice = {
      id: `ALIA-NTC-${now}-${Math.floor(Math.random() * 1000)}`,
      pathway: 'alia',
      title,
      description,
      audience: input.audience,
      marhala: input.marhala,
      department: resolvedDept,
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
      audience: AliaNoticeAudience;
      marhala: 'all' | AliaMarhala;
      department?: 'all' | AliaDepartment;
      tag: AliaNoticeTag;
    },
    actorEmail?: string,
    now = Date.now()
  ): { ok: true; notice: AliaAdminNotice } | { ok: false; error: string } {
    const store = loadStore(now);
    const idx = store.notices.findIndex((n) => n.id === noticeId && n.pathway === 'alia');
    if (idx === -1) {
      return { ok: false, error: 'Notice not found in Alia Madrasa.' };
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
      return { ok: false, error: 'Selected Marhala is invalid for Alia Madrasa.' };
    }

    let resolvedDept: 'all' | AliaDepartment = 'all';
    if (patch.department && patch.department !== 'all') {
      if (patch.marhala !== 'all') {
        if (!isValidDepartmentForMarhala(patch.marhala, patch.department)) {
          return {
            ok: false,
            error: `Department "${patch.department}" does not belong to ${getShortMarhalaLabel(patch.marhala)}.`,
          };
        }
        resolvedDept = patch.department;
      } else if (isValidDepartment(patch.department)) {
        resolvedDept = patch.department;
      }
    }

    const updated: AliaAdminNotice = {
      ...store.notices[idx],
      title,
      description,
      audience: patch.audience,
      marhala: patch.marhala,
      department: resolvedDept,
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
    const idx = store.notices.findIndex((n) => n.id === noticeId && n.pathway === 'alia');
    if (idx === -1) {
      return { ok: false, error: 'Notice not found in Alia Madrasa.' };
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
