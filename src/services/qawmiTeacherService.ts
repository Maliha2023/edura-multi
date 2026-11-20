import { loadDatabase, saveDatabase } from './storage';
import type { AuthSession, UserAccount } from '../types/domain';
import { hashPassword, verifyPassword } from '../utils/crypto';
import { validateEmail, validateFullName, validatePassword } from '../utils/validation';

export type QawmiTeacherPathway = 'qawmi';

export type QawmiTeacherMarhala =
  | 'Maktab / Hifz / Nazera'
  | 'Ibtidaiyyah (Primary Marhala)'
  | 'Mutawassitah (Middle Marhala)'
  | 'Sanawiyyah Ulya (Higher Secondary Marhala)'
  | 'Fazilat (Degree Marhala)'
  | 'Takmil (Masters / Dawra-e-Hadith Marhala)';

export type QawmiTeacherFocusBranch =
  | 'General / Kitab'
  | 'Hifzul Quran'
  | 'Tajweed & Qiraat'
  | 'Hadith & Tafsir'
  | 'Fiqh & Usul'
  | 'Arabic & Adab';

export type QawmiNoticeAudience = 'student' | 'teacher' | 'both';
export type QawmiNoticeTag = 'General' | 'Exam' | 'Urgent';
export type QawmiRegistrationType = 'coupon_auto' | 'manual_admin';
export type QawmiAttendanceStatus = 'Present' | 'Late' | 'Absent';

export type QawmiTeacherModuleType =
  | 'Dars Notes'
  | 'Kitab / Chapter Guide'
  | 'Sabak & Takrar Sheet'
  | 'Tarkeeb Practice'
  | 'Syllabus Module';

export type QawmiTeacherAnnouncementTag =
  | 'Dars Update'
  | 'Sabak Reminder'
  | 'Befaq Prep'
  | 'Schedule Change';

export interface QawmiCouponRecord {
  id: string;
  code: string;
  pathway: QawmiTeacherPathway;
  role: 'student' | 'teacher';
  status: 'active' | 'used' | 'expired';
  createdAt: number;
  expiresAt: number;
  usedAt?: number;
  issuedBy: string;
}

export interface QawmiPendingRecord {
  id: string;
  role: 'student' | 'teacher';
  pathway: QawmiTeacherPathway;
  fullName: string;
  email: string;
  marhala: QawmiTeacherMarhala;
  assignedMarhalas?: QawmiTeacherMarhala[];
  focusBranch: QawmiTeacherFocusBranch;
  primarySubject?: string;
  couponCode: string;
  submittedAt: number;
  expiresAt: number;
}

export interface QawmiProfileRecord {
  id: string;
  role: 'student' | 'teacher';
  pathway: QawmiTeacherPathway;
  fullName: string;
  email: string;
  passwordHash: string;
  marhala: QawmiTeacherMarhala;
  assignedMarhalas?: QawmiTeacherMarhala[];
  focusBranch: QawmiTeacherFocusBranch;
  primarySubject?: string;
  status: 'active' | 'suspended';
  registrationType: QawmiRegistrationType;
  couponCode?: string;
  joinedAt: number;
  updatedAt?: number;
}

export interface QawmiOfficialNotice {
  id: string;
  pathway: QawmiTeacherPathway;
  title: string;
  description: string;
  audience: QawmiNoticeAudience;
  marhala: 'all' | QawmiTeacherMarhala;
  focusBranch: 'all' | QawmiTeacherFocusBranch;
  tag: QawmiNoticeTag;
  createdAt: number;
  updatedAt: number;
}

export interface QawmiActivityLog {
  id: string;
  pathway: QawmiTeacherPathway;
  category: 'coupon' | 'approval' | 'directory' | 'notice' | 'security';
  summary: string;
  actorEmail: string;
  createdAt: number;
}

interface QawmiSharedStore {
  coupons: QawmiCouponRecord[];
  pending: QawmiPendingRecord[];
  profiles: QawmiProfileRecord[];
  notices: QawmiOfficialNotice[];
  activities: QawmiActivityLog[];
}

export interface QawmiTeacherContext {
  userId: string;
  fullName: string;
  email: string;
  pathway: QawmiTeacherPathway;
  primarySubject: string;
  assignedMarhalas: QawmiTeacherMarhala[];
  focusBranch: QawmiTeacherFocusBranch;
  registrationType: QawmiRegistrationType;
  couponCode?: string;
  joinedAt: number;
}

export interface QawmiDemoTeacherPreset {
  pathway: QawmiTeacherPathway;
  fullName: string;
  email: string;
  password: string;
  primarySubject: string;
  assignedMarhalas: QawmiTeacherMarhala[];
  focusBranch: QawmiTeacherFocusBranch;
}

export interface QawmiTeacherModuleResource {
  id: string;
  pathway: QawmiTeacherPathway;
  teacherEmail: string;
  subject: string;
  marhala: QawmiTeacherMarhala;
  focusBranch: QawmiTeacherFocusBranch;
  title: string;
  type: QawmiTeacherModuleType;
  summary: string;
  published: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface QawmiTeacherRosterStudent {
  id: string;
  fullName: string;
  email: string;
  marhala: QawmiTeacherMarhala;
  focusBranch: QawmiTeacherFocusBranch;
  status: 'active' | 'suspended';
  completedLessonsCount: number;
  totalRecommendedLessons: number;
  marks: number;
  attendanceRate: number;
  attendanceStatus: QawmiAttendanceStatus;
  remarks: string;
}

export interface QawmiTeacherScheduleSession {
  id: string;
  timeLabel: string;
  marhala: QawmiTeacherMarhala;
  focusBranch: QawmiTeacherFocusBranch;
  roomLabel: string;
  topic: string;
}

export interface QawmiTeacherClassAnnouncement {
  id: string;
  pathway: QawmiTeacherPathway;
  teacherName: string;
  teacherEmail: string;
  subject: string;
  marhala: QawmiTeacherMarhala;
  focusBranch: QawmiTeacherFocusBranch;
  title: string;
  message: string;
  tag: QawmiTeacherAnnouncementTag;
  createdAt: number;
}

export interface QawmiTeacherCouponValidationResult {
  ok: boolean;
  coupon?: QawmiCouponRecord;
  message: string;
}

export interface QawmiTeacherRegistrationInput {
  couponCode: string;
  fullName: string;
  email: string;
  password: string;
  assignedMarhalas: QawmiTeacherMarhala[];
  primarySubject: string;
  focusBranch?: QawmiTeacherFocusBranch;
}

export const QAWMI_TEACHER_MARHALA_OPTIONS: QawmiTeacherMarhala[] = [
  'Maktab / Hifz / Nazera',
  'Ibtidaiyyah (Primary Marhala)',
  'Mutawassitah (Middle Marhala)',
  'Sanawiyyah Ulya (Higher Secondary Marhala)',
  'Fazilat (Degree Marhala)',
  'Takmil (Masters / Dawra-e-Hadith Marhala)',
];

export const QAWMI_TEACHER_FOCUS_OPTIONS: QawmiTeacherFocusBranch[] = [
  'General / Kitab',
  'Hifzul Quran',
  'Tajweed & Qiraat',
  'Hadith & Tafsir',
  'Fiqh & Usul',
  'Arabic & Adab',
];

export const QAWMI_TEACHER_PRIMARY_SUBJECTS: string[] = [
  'Hadith & Tafsir',
  'Nahw & Sarf / Arabic Grammar',
  'Fiqh & Usul-e-Fiqh',
  'Quran & Tajweed / Hifz',
  'Arabic Adab & Tarbiyah',
  'Aqidah & Mantiq / Balaghah',
];

export const QAWMI_TEACHER_MODULE_TYPES: QawmiTeacherModuleType[] = [
  'Dars Notes',
  'Kitab / Chapter Guide',
  'Sabak & Takrar Sheet',
  'Tarkeeb Practice',
  'Syllabus Module',
];

export const QAWMI_TEACHER_ANNOUNCEMENT_TAGS: QawmiTeacherAnnouncementTag[] = [
  'Dars Update',
  'Sabak Reminder',
  'Befaq Prep',
  'Schedule Change',
];

const QAWMI_SHARED_STORE_KEY = 'edura_qawmi_workspace_v1';
const QAWMI_STUDENT_PROGRESS_KEY = 'edura_qawmi_student_progress_v1';
const QAWMI_TEACHER_MODULES_KEY = 'edura_qawmi_teacher_modules_v1';
const QAWMI_TEACHER_ROSTER_META_KEY = 'edura_qawmi_teacher_roster_meta_v1';
const QAWMI_TEACHER_ANNOUNCEMENTS_KEY = 'edura_qawmi_teacher_announcements_v1';

const FORTY_EIGHT_HOURS_MS = 48 * 60 * 60 * 1000;

interface QawmiRosterMetaRecord {
  marks: number;
  attendanceRate: number;
  attendanceStatus: QawmiAttendanceStatus;
  remarks: string;
  updatedAt: number;
}

let memoryQawmiSharedStore: QawmiSharedStore | null = null;
let memoryQawmiStudentProgress: Record<string, string[]> = {};
let memoryQawmiTeacherModules: QawmiTeacherModuleResource[] | null = null;
let memoryQawmiRosterMeta: Record<string, QawmiRosterMetaRecord> | null = null;
let memoryQawmiAnnouncements: QawmiTeacherClassAnnouncement[] | null = null;

function canUseLocalStorage(): boolean {
  try {
    return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
  } catch {
    return false;
  }
}

export function isQawmiTeacherPathway(raw?: string | null): boolean {
  if (!raw) return false;
  const normalized = raw.trim().toLowerCase();
  return (
    normalized === 'qawmi' ||
    normalized === 'qawmi madrasa' ||
    normalized === 'qawmi_madrasa' ||
    normalized === 'qawmi panel'
  );
}

export function resolveQawmiTeacherPathway(raw?: string | null): QawmiTeacherPathway | null {
  return isQawmiTeacherPathway(raw) ? 'qawmi' : null;
}

export function getQawmiTeacherPathwayLabel(): string {
  return 'Qawmi Madrasa';
}

export function getQawmiTeacherBoardName(): string {
  return 'Wifaqul Madarisil Arabia Bangladesh (Befaq / Dars-e-Nizami)';
}

export function getShortQawmiTeacherMarhalaLabel(marhala: QawmiTeacherMarhala): string {
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

export function formatAssignedQawmiMarhalasSummary(marhalas: QawmiTeacherMarhala[]): string {
  if (!marhalas.length) return 'Mutawassitah';
  return marhalas.map(getShortQawmiTeacherMarhalaLabel).join(' · ');
}

export function formatQawmiTeacherContextBadge(primarySubject?: string): string {
  const cleanSubject = primarySubject?.trim() || 'Hadith & Tafsir';
  return `Qawmi Madrasa • ${cleanSubject}`;
}

export function getDemoQawmiTeacherPreset(): QawmiDemoTeacherPreset {
  return {
    pathway: 'qawmi',
    fullName: 'Mufti Mahmudul Hasan',
    email: 'mahmudul.hasan@qawmi-madrasa.edu.bd',
    password: 'Teacher@1234',
    primarySubject: 'Hadith & Tafsir',
    assignedMarhalas: [
      'Mutawassitah (Middle Marhala)',
      'Sanawiyyah Ulya (Higher Secondary Marhala)',
      'Takmil (Masters / Dawra-e-Hadith Marhala)',
    ],
    focusBranch: 'Hadith & Tafsir',
  };
}

function getRequiredSeedCoupons(now: number): QawmiCouponRecord[] {
  const hour = 60 * 60 * 1000;
  return [
    {
      id: 'QAWMI-CPN-S01',
      code: 'S-85101',
      pathway: 'qawmi',
      role: 'student',
      status: 'active',
      createdAt: now - 2 * hour,
      expiresAt: now + 46 * hour,
      issuedBy: 'muhtamim@qawmi-madrasa.edu.bd',
    },
    {
      id: 'QAWMI-CPN-T01',
      code: 'T-85310',
      pathway: 'qawmi',
      role: 'teacher',
      status: 'active',
      createdAt: now - 4 * hour,
      expiresAt: now + 44 * hour,
      issuedBy: 'muhtamim@qawmi-madrasa.edu.bd',
    },
    {
      id: 'QAWMI-CPN-T02',
      code: 'T-85324',
      pathway: 'qawmi',
      role: 'teacher',
      status: 'active',
      createdAt: now - 3 * hour,
      expiresAt: now + 45 * hour,
      issuedBy: 'muhtamim@qawmi-madrasa.edu.bd',
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
      issuedBy: 'muhtamim@qawmi-madrasa.edu.bd',
    },
    {
      id: 'QAWMI-CPN-T04',
      code: 'T-85011',
      pathway: 'qawmi',
      role: 'teacher',
      status: 'expired',
      createdAt: now - 72 * hour,
      expiresAt: now - 24 * hour,
      issuedBy: 'muhtamim@qawmi-madrasa.edu.bd',
    },
  ];
}

function getRequiredSeedTeachers(now: number): QawmiProfileRecord[] {
  const hour = 60 * 60 * 1000;
  const day = 24 * hour;
  const demo = getDemoQawmiTeacherPreset();
  const hash = hashPassword(demo.password);
  return [
    {
      id: 'qawmi-teacher-demo-01',
      role: 'teacher',
      pathway: 'qawmi',
      fullName: demo.fullName,
      email: demo.email,
      passwordHash: hash,
      marhala: 'Takmil (Masters / Dawra-e-Hadith Marhala)',
      assignedMarhalas: demo.assignedMarhalas,
      focusBranch: demo.focusBranch,
      primarySubject: demo.primarySubject,
      status: 'active',
      registrationType: 'coupon_auto',
      couponCode: 'T-85090',
      joinedAt: now - 36 * day,
    },
    {
      id: 'qawmi-teacher-02',
      role: 'teacher',
      pathway: 'qawmi',
      fullName: 'Mawlana Abdur Rahman Qasemi',
      email: 'abdur.rahman@qawmi-madrasa.edu.bd',
      passwordHash: hash,
      marhala: 'Mutawassitah (Middle Marhala)',
      assignedMarhalas: [
        'Ibtidaiyyah (Primary Marhala)',
        'Mutawassitah (Middle Marhala)',
      ],
      focusBranch: 'Arabic & Adab',
      primarySubject: 'Nahw & Sarf / Arabic Grammar',
      status: 'active',
      registrationType: 'manual_admin',
      joinedAt: now - 58 * day,
    },
  ];
}

function getRequiredSeedStudents(now: number): QawmiProfileRecord[] {
  const hour = 60 * 60 * 1000;
  const day = 24 * hour;
  const studentHash = hashPassword('Student@1234');
  return [
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
    },
  ];
}

function getRequiredSeedNotices(now: number): QawmiOfficialNotice[] {
  const hour = 60 * 60 * 1000;
  return [
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
  ];
}

function createInitialQawmiSharedStore(now: number): QawmiSharedStore {
  return {
    coupons: getRequiredSeedCoupons(now),
    pending: [],
    profiles: [...getRequiredSeedTeachers(now), ...getRequiredSeedStudents(now)],
    notices: getRequiredSeedNotices(now),
    activities: [
      {
        id: 'QAWMI-ACT-T01',
        pathway: 'qawmi',
        category: 'notice',
        summary: 'Published Asatizah Council Takrar & Oral Imtihan circular.',
        actorEmail: 'muhtamim@qawmi-madrasa.edu.bd',
        createdAt: now - 10 * 60 * 60 * 1000,
      },
    ],
  };
}

function reconcileQawmiSharedStore(existing: QawmiSharedStore, now: number): QawmiSharedStore {
  let mutated = false;
  const coupons = [...existing.coupons];
  const existingCouponCodes = new Set(coupons.map((c) => c.code.toUpperCase()));
  for (const seedCoupon of getRequiredSeedCoupons(now)) {
    if (!existingCouponCodes.has(seedCoupon.code.toUpperCase())) {
      coupons.push(seedCoupon);
      mutated = true;
    }
  }

  const profiles = [...existing.profiles];
  const existingEmails = new Set(profiles.map((p) => p.email.toLowerCase()));
  for (const seedProfile of [...getRequiredSeedTeachers(now), ...getRequiredSeedStudents(now)]) {
    if (!existingEmails.has(seedProfile.email.toLowerCase())) {
      profiles.push(seedProfile);
      mutated = true;
    }
  }

  const notices = [...existing.notices];
  const existingNoticeIds = new Set(notices.map((n) => n.id));
  for (const seedNotice of getRequiredSeedNotices(now)) {
    if (!existingNoticeIds.has(seedNotice.id)) {
      notices.push(seedNotice);
      mutated = true;
    }
  }

  const next: QawmiSharedStore = {
    ...existing,
    coupons,
    profiles,
    notices,
  };

  if (mutated && canUseLocalStorage()) {
    window.localStorage.setItem(QAWMI_SHARED_STORE_KEY, JSON.stringify(next));
  }
  return next;
}

function readQawmiSharedStore(now = Date.now()): QawmiSharedStore {
  if (canUseLocalStorage()) {
    const raw = window.localStorage.getItem(QAWMI_SHARED_STORE_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as QawmiSharedStore;
        if (
          parsed &&
          Array.isArray(parsed.coupons) &&
          Array.isArray(parsed.pending) &&
          Array.isArray(parsed.profiles) &&
          Array.isArray(parsed.notices) &&
          Array.isArray(parsed.activities)
        ) {
          return reconcileQawmiSharedStore(parsed, now);
        }
      } catch {
        // Re-seed below
      }
    }
    const seeded = createInitialQawmiSharedStore(now);
    window.localStorage.setItem(QAWMI_SHARED_STORE_KEY, JSON.stringify(seeded));
    return seeded;
  }

  if (!memoryQawmiSharedStore) {
    memoryQawmiSharedStore = createInitialQawmiSharedStore(now);
  }
  return memoryQawmiSharedStore;
}

function writeQawmiSharedStore(store: QawmiSharedStore): void {
  if (canUseLocalStorage()) {
    window.localStorage.setItem(QAWMI_SHARED_STORE_KEY, JSON.stringify(store));
    return;
  }
  memoryQawmiSharedStore = store;
}

function readQawmiStudentProgressMap(): Record<string, string[]> {
  if (canUseLocalStorage()) {
    const raw = window.localStorage.getItem(QAWMI_STUDENT_PROGRESS_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as Record<string, string[]>;
        if (parsed && typeof parsed === 'object') return parsed;
      } catch {
        // Fallback below
      }
    }
    return {};
  }
  return memoryQawmiStudentProgress;
}

function createInitialTeacherModules(now: number): QawmiTeacherModuleResource[] {
  const hour = 60 * 60 * 1000;
  const demo = getDemoQawmiTeacherPreset();
  return [
    {
      id: 'QAWMI-TMOD-01',
      pathway: 'qawmi',
      teacherEmail: demo.email,
      subject: demo.primarySubject,
      marhala: 'Takmil (Masters / Dawra-e-Hadith Marhala)',
      focusBranch: 'Hadith & Tafsir',
      title: 'Sahih al-Bukhari: Kitab Bad’ al-Wahy Sanad & Sharah Notes',
      type: 'Dars Notes',
      summary:
        'Line-by-line Ibarat breakdown, Sanad chain notes from Imam al-Bukhari to Umar ibn al-Khattab (RA), and Fath al-Bari commentary pointers for Takmil students.',
      published: true,
      createdAt: now - 30 * hour,
      updatedAt: now - 30 * hour,
    },
    {
      id: 'QAWMI-TMOD-02',
      pathway: 'qawmi',
      teacherEmail: demo.email,
      subject: demo.primarySubject,
      marhala: 'Mutawassitah (Middle Marhala)',
      focusBranch: 'General / Kitab',
      title: 'Hidayatun Nahw: Awamil & Marfu’at Tarkeeb Drills',
      type: 'Tarkeeb Practice',
      summary:
        'Structured Arabic syntactic parsing exercises covering Mubtada, Khabar, Fa’il, and Na’ib Fa’il with model Tarkeeb diagrams for evening Takrar.',
      published: true,
      createdAt: now - 16 * hour,
      updatedAt: now - 16 * hour,
    },
    {
      id: 'QAWMI-TMOD-03',
      pathway: 'qawmi',
      teacherEmail: demo.email,
      subject: demo.primarySubject,
      marhala: 'Sanawiyyah Ulya (Higher Secondary Marhala)',
      focusBranch: 'Fiqh & Usul',
      title: 'Al-Hidayah & Nur al-Anwar: Kitab al-Taharah Masalah Sheet',
      type: 'Sabak & Takrar Sheet',
      summary:
        'Draft comparative Hanafi Dalil revision sheet pairing Hidayah rulings with Usul-e-Fiqh Qiyas definitions ahead of Befaq midterm Shifah testing.',
      published: false,
      createdAt: now - 5 * hour,
      updatedAt: now - 5 * hour,
    },
  ];
}

function readTeacherModules(now = Date.now()): QawmiTeacherModuleResource[] {
  if (canUseLocalStorage()) {
    const raw = window.localStorage.getItem(QAWMI_TEACHER_MODULES_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as QawmiTeacherModuleResource[];
        if (Array.isArray(parsed)) return parsed;
      } catch {
        // Re-seed below
      }
    }
    const seeded = createInitialTeacherModules(now);
    window.localStorage.setItem(QAWMI_TEACHER_MODULES_KEY, JSON.stringify(seeded));
    return seeded;
  }
  if (!memoryQawmiTeacherModules) {
    memoryQawmiTeacherModules = createInitialTeacherModules(now);
  }
  return memoryQawmiTeacherModules;
}

function writeTeacherModules(modules: QawmiTeacherModuleResource[]): void {
  if (canUseLocalStorage()) {
    window.localStorage.setItem(QAWMI_TEACHER_MODULES_KEY, JSON.stringify(modules));
    return;
  }
  memoryQawmiTeacherModules = modules;
}

function createInitialRosterMeta(now: number): Record<string, QawmiRosterMetaRecord> {
  return {
    'tariqul.islam@qawmi-student.edu.bd': {
      marks: 91,
      attendanceRate: 96,
      attendanceStatus: 'Present',
      remarks: 'Consistent Tarkeeb accuracy and active participation in Maghrib Takrar.',
      updatedAt: now - 6 * 60 * 60 * 1000,
    },
    'anas.mahmud@qawmi-student.edu.bd': {
      marks: 94,
      attendanceRate: 98,
      attendanceStatus: 'Present',
      remarks: 'Strong Sabak & Amukhta retention with clear Makharij in Hifz Daur.',
      updatedAt: now - 10 * 60 * 60 * 1000,
    },
    'salman.farisi@qawmi-student.edu.bd': {
      marks: 89,
      attendanceRate: 94,
      attendanceStatus: 'Present',
      remarks: 'Detailed Bukhari Sanad notes; ready for Takmil Muhaddith colloquium.',
      updatedAt: now - 14 * 60 * 60 * 1000,
    },
    'usman.siddiqui@qawmi-student.edu.bd': {
      marks: 78,
      attendanceRate: 86,
      attendanceStatus: 'Late',
      remarks: 'Needs extra evening Takrar practice on Usul-e-Fiqh Mabahith.',
      updatedAt: now - 18 * 60 * 60 * 1000,
    },
    'ahmadullah.numani@qawmi-student.edu.bd': {
      marks: 87,
      attendanceRate: 93,
      attendanceStatus: 'Present',
      remarks: 'Clear Tafsir al-Jalalayn translation and Asbab al-Nuzul recall.',
      updatedAt: now - 22 * 60 * 60 * 1000,
    },
    'abdullah.mamun@qawmi-student.edu.bd': {
      marks: 84,
      attendanceRate: 90,
      attendanceStatus: 'Present',
      remarks: 'Improving Tajweed Waqf rules; keep daily Sabki review steady.',
      updatedAt: now - 26 * 60 * 60 * 1000,
    },
  };
}

function readRosterMeta(now = Date.now()): Record<string, QawmiRosterMetaRecord> {
  if (canUseLocalStorage()) {
    const raw = window.localStorage.getItem(QAWMI_TEACHER_ROSTER_META_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as Record<string, QawmiRosterMetaRecord>;
        if (parsed && typeof parsed === 'object') return parsed;
      } catch {
        // Re-seed below
      }
    }
    const seeded = createInitialRosterMeta(now);
    window.localStorage.setItem(QAWMI_TEACHER_ROSTER_META_KEY, JSON.stringify(seeded));
    return seeded;
  }
  if (!memoryQawmiRosterMeta) {
    memoryQawmiRosterMeta = createInitialRosterMeta(now);
  }
  return memoryQawmiRosterMeta;
}

function writeRosterMeta(meta: Record<string, QawmiRosterMetaRecord>): void {
  if (canUseLocalStorage()) {
    window.localStorage.setItem(QAWMI_TEACHER_ROSTER_META_KEY, JSON.stringify(meta));
    return;
  }
  memoryQawmiRosterMeta = meta;
}

function createInitialAnnouncements(now: number): QawmiTeacherClassAnnouncement[] {
  const hour = 60 * 60 * 1000;
  const demo = getDemoQawmiTeacherPreset();
  return [
    {
      id: 'QAWMI-ANN-01',
      pathway: 'qawmi',
      teacherName: demo.fullName,
      teacherEmail: demo.email,
      subject: demo.primarySubject,
      marhala: 'Takmil (Masters / Dawra-e-Hadith Marhala)',
      focusBranch: 'Hadith & Tafsir',
      title: 'Tomorrow’s Sahih al-Bukhari Dars & Sanad Revision',
      message:
        'Takmil students should prepare the opening 5 Hadiths of Kitab al-Iman with Fath al-Bari commentary notes before Fajr Takrar.',
      tag: 'Dars Update',
      createdAt: now - 5 * hour,
    },
    {
      id: 'QAWMI-ANN-02',
      pathway: 'qawmi',
      teacherName: demo.fullName,
      teacherEmail: demo.email,
      subject: demo.primarySubject,
      marhala: 'Mutawassitah (Middle Marhala)',
      focusBranch: 'General / Kitab',
      title: 'Maghrib Takrar: Hidayatun Nahw Tarkeeb Oral Check',
      message:
        'Bring your Hidayatun Nahw copybooks after Maghrib for oral Ibarat reading and Mubtada-Khabar Tarkeeb review ahead of Befaq monthly test.',
      tag: 'Befaq Prep',
      createdAt: now - 18 * hour,
    },
  ];
}

function readAnnouncements(now = Date.now()): QawmiTeacherClassAnnouncement[] {
  if (canUseLocalStorage()) {
    const raw = window.localStorage.getItem(QAWMI_TEACHER_ANNOUNCEMENTS_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as QawmiTeacherClassAnnouncement[];
        if (Array.isArray(parsed)) return parsed;
      } catch {
        // Re-seed below
      }
    }
    const seeded = createInitialAnnouncements(now);
    window.localStorage.setItem(QAWMI_TEACHER_ANNOUNCEMENTS_KEY, JSON.stringify(seeded));
    return seeded;
  }
  if (!memoryQawmiAnnouncements) {
    memoryQawmiAnnouncements = createInitialAnnouncements(now);
  }
  return memoryQawmiAnnouncements;
}

function writeAnnouncements(items: QawmiTeacherClassAnnouncement[]): void {
  if (canUseLocalStorage()) {
    window.localStorage.setItem(QAWMI_TEACHER_ANNOUNCEMENTS_KEY, JSON.stringify(items));
    return;
  }
  memoryQawmiAnnouncements = items;
}

function expireCouponsAndPending(store: QawmiSharedStore, now: number): QawmiSharedStore {
  let changed = false;
  const coupons = store.coupons.map((coupon) => {
    if (coupon.status === 'active' && coupon.expiresAt <= now) {
      changed = true;
      return { ...coupon, status: 'expired' as const };
    }
    return coupon;
  });
  const pending = store.pending.filter((item) => {
    if (item.expiresAt <= now) {
      changed = true;
      return false;
    }
    return true;
  });
  if (!changed) return store;
  const next = { ...store, coupons, pending };
  writeQawmiSharedStore(next);
  return next;
}

export function getDemoQawmiTeacherCouponHint(): string {
  const store = expireCouponsAndPending(readQawmiSharedStore(), Date.now());
  const active = store.coupons.find(
    (c) => c.pathway === 'qawmi' && c.role === 'teacher' && c.status === 'active'
  );
  return active?.code ?? 'T-85310';
}

export const qawmiTeacherService = {
  validateCoupon(rawCode: string, now = Date.now()): QawmiTeacherCouponValidationResult {
    const code = rawCode.trim().toUpperCase();
    if (!code) {
      return { ok: false, message: 'Please enter your Qawmi Madrasa teacher coupon code.' };
    }
    if (code.startsWith('S-')) {
      return {
        ok: false,
        message:
          'This is a student coupon (S-XXXXX). Teacher onboarding under Qawmi Madrasa requires a T-XXXXX teacher coupon.',
      };
    }
    if (!/^T-[A-Z0-9]{4,8}$/.test(code)) {
      return {
        ok: false,
        message: 'Invalid coupon format. Enter a Qawmi Madrasa teacher code like T-85310.',
      };
    }

    const store = expireCouponsAndPending(readQawmiSharedStore(now), now);
    const match = store.coupons.find(
      (c) => c.pathway === 'qawmi' && c.code.toUpperCase() === code
    );

    if (!match) {
      return {
        ok: false,
        message:
          'Coupon not found in the Qawmi Madrasa pathway. Please verify the T-XXXXX code from your Qawmi Madrasa Administrator.',
      };
    }
    if (match.role !== 'teacher') {
      return {
        ok: false,
        message: 'This coupon is not assigned to a Qawmi Madrasa teacher role.',
      };
    }
    if (match.status === 'used') {
      return {
        ok: false,
        message: 'This Qawmi Madrasa teacher coupon has already been redeemed.',
      };
    }
    if (match.status === 'expired' || match.expiresAt <= now) {
      return {
        ok: false,
        message: 'This coupon has passed its 48-hour validity window. Request a new T-XXXXX code.',
      };
    }

    return {
      ok: true,
      coupon: match,
      message: `Coupon ${match.code} verified for Qawmi Madrasa Teacher registration.`,
    };
  },

  submitCouponRegistration(
    input: QawmiTeacherRegistrationInput,
    now = Date.now()
  ): { ok: true; registration: QawmiPendingRecord } | { ok: false; error: string } {
    const couponCheck = this.validateCoupon(input.couponCode, now);
    if (!couponCheck.ok || !couponCheck.coupon) {
      return { ok: false, error: couponCheck.message };
    }

    const nameCheck = validateFullName(input.fullName);
    if (!nameCheck.valid) {
      return { ok: false, error: 'Please enter a valid full name (at least 2 characters).' };
    }

    const emailCheck = validateEmail(input.email);
    if (!emailCheck.valid) {
      return { ok: false, error: 'Please enter a valid institutional or personal email address.' };
    }

    const passwordCheck = validatePassword(input.password);
    if (!passwordCheck.valid) {
      return { ok: false, error: 'Password must be at least 8 characters long.' };
    }

    const assignedMarhalas = Array.from(new Set(input.assignedMarhalas)).filter((m) =>
      QAWMI_TEACHER_MARHALA_OPTIONS.includes(m)
    );
    if (assignedMarhalas.length === 0) {
      return { ok: false, error: 'Select at least one Qawmi Madrasa Marhala you teach.' };
    }

    const primarySubject = input.primarySubject.trim();
    if (!primarySubject) {
      return { ok: false, error: 'Please select your primary Kitab / Subject area.' };
    }

    const focusBranch: QawmiTeacherFocusBranch =
      input.focusBranch && QAWMI_TEACHER_FOCUS_OPTIONS.includes(input.focusBranch)
        ? input.focusBranch
        : 'General / Kitab';

    const cleanEmail = input.email.trim().toLowerCase();
    const cleanName = input.fullName.trim();

    const store = expireCouponsAndPending(readQawmiSharedStore(now), now);
    const duplicate =
      store.profiles.some((p) => p.email.toLowerCase() === cleanEmail) ||
      store.pending.some((p) => p.email.toLowerCase() === cleanEmail);
    if (duplicate) {
      return {
        ok: false,
        error: 'An account or pending Qawmi Madrasa registration already exists for this email.',
      };
    }

    const primaryMarhala = assignedMarhalas[0];

    const pendingRecord: QawmiPendingRecord = {
      id: `QAWMI-PND-T-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
      role: 'teacher',
      pathway: 'qawmi',
      fullName: cleanName,
      email: cleanEmail,
      marhala: primaryMarhala,
      assignedMarhalas,
      focusBranch,
      primarySubject,
      couponCode: couponCheck.coupon.code,
      submittedAt: now,
      expiresAt: now + FORTY_EIGHT_HOURS_MS,
    };

    const nextCoupons = store.coupons.map((c) =>
      c.id === couponCheck.coupon!.id
        ? { ...c, status: 'used' as const, usedAt: now }
        : c
    );

    const nextStore: QawmiSharedStore = {
      ...store,
      coupons: nextCoupons,
      pending: [pendingRecord, ...store.pending],
      activities: [
        {
          id: `QAWMI-ACT-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
          pathway: 'qawmi',
          category: 'approval',
          summary: `Qawmi Teacher ${cleanName} (${primarySubject}) submitted coupon ${couponCheck.coupon.code} for 48h approval.`,
          actorEmail: cleanEmail,
          createdAt: now,
        },
        ...store.activities,
      ],
    };

    writeQawmiSharedStore(nextStore);

    // Sync pending registration into Edura Auth DB so login shows Pending Admin Approval state accurately
    const db = loadDatabase(now);
    const existingRegIdx = db.registrations.findIndex(
      (r) => r.email.toLowerCase() === cleanEmail
    );
    const pendingAuthRecord = {
      id: pendingRecord.id,
      role: 'teacher' as const,
      couponCode: couponCheck.coupon.code,
      preferredLanguage: 'en' as const,
      fullName: cleanName,
      email: cleanEmail,
      passwordHash: hashPassword(input.password),
      educationStream: 'Bangladesh Madrasa Education' as const,
      pathway: 'Qawmi',
      status: 'pending' as const,
      submittedAt: now,
      editHistory: [],
    };
    if (existingRegIdx >= 0) {
      db.registrations[existingRegIdx] = pendingAuthRecord;
    } else {
      db.registrations.push(pendingAuthRecord);
    }
    saveDatabase(db);

    return { ok: true, registration: pendingRecord };
  },

  prepareQawmiTeacherAccountForLogin(
    identifier: string,
    plainPassword: string,
    now = Date.now()
  ): void {
    const cleanId = identifier.trim().toLowerCase();
    if (!cleanId) return;

    const store = expireCouponsAndPending(readQawmiSharedStore(now), now);
    const preset = getDemoQawmiTeacherPreset();

    const activeTeacher = store.profiles.find(
      (p) =>
        p.pathway === 'qawmi' &&
        p.role === 'teacher' &&
        p.email.toLowerCase() === cleanId
    );
    if (activeTeacher && activeTeacher.status === 'suspended') {
      return;
    }

    const isPresetLogin = cleanId === preset.email.toLowerCase();
    if (!activeTeacher && !isPresetLogin) {
      return;
    }

    const fullName = activeTeacher?.fullName ?? preset.fullName;
    const userId = activeTeacher?.id ?? 'qawmi-teacher-demo-01';

    const db = loadDatabase(now);
    const existingIdx = db.users.findIndex(
      (u) => u.role === 'teacher' && u.email.toLowerCase() === cleanId
    );

    if (existingIdx === -1) {
      const passwordToStore =
        isPresetLogin && plainPassword === preset.password
          ? hashPassword(preset.password)
          : activeTeacher && verifyPassword(plainPassword, activeTeacher.passwordHash)
            ? activeTeacher.passwordHash
            : activeTeacher?.passwordHash ?? hashPassword(preset.password);

      const account: UserAccount = {
        id: userId,
        role: 'teacher',
        fullName,
        email: activeTeacher?.email ?? preset.email,
        passwordHash: passwordToStore,
        mustChangePassword: false,
        preferredLanguage: 'en',
        createdAt: activeTeacher?.joinedAt ?? now - 36 * 24 * 60 * 60 * 1000,
        educationStream: 'Bangladesh Madrasa Education',
        pathway: 'Qawmi',
      };
      db.users.push(account);
      saveDatabase(db);
    } else if (activeTeacher && db.users[existingIdx].passwordHash !== activeTeacher.passwordHash) {
      db.users[existingIdx] = {
        ...db.users[existingIdx],
        passwordHash: activeTeacher.passwordHash,
      };
      saveDatabase(db);
    }
  },

  resolveQawmiTeacherContext(
    session: AuthSession | null,
    profile?: Omit<UserAccount, 'passwordHash'> | null
  ): QawmiTeacherContext | null {
    if (!session || session.role !== 'teacher') return null;
    if (!isQawmiTeacherPathway(session.selectedPathway)) return null;

    const store = readQawmiSharedStore();
    const emailLower = session.email.toLowerCase();
    const matched = store.profiles.find(
      (p) =>
        p.pathway === 'qawmi' &&
        p.role === 'teacher' &&
        p.email.toLowerCase() === emailLower
    );

    const demo = getDemoQawmiTeacherPreset();
    const assignedMarhalas: QawmiTeacherMarhala[] =
      matched?.assignedMarhalas && matched.assignedMarhalas.length > 0
        ? matched.assignedMarhalas
        : matched?.marhala
          ? [matched.marhala]
          : [...demo.assignedMarhalas];

    return {
      userId: matched?.id ?? session.userId,
      fullName: matched?.fullName ?? session.fullName ?? demo.fullName,
      email: matched?.email ?? session.email,
      pathway: 'qawmi',
      primarySubject: matched?.primarySubject ?? demo.primarySubject,
      assignedMarhalas,
      focusBranch: matched?.focusBranch ?? demo.focusBranch,
      registrationType: matched?.registrationType ?? 'coupon_auto',
      couponCode: matched?.couponCode,
      joinedAt: matched?.joinedAt ?? profile?.createdAt ?? Date.now(),
    };
  },

  getTodaySchedule(teacher: QawmiTeacherContext): QawmiTeacherScheduleSession[] {
    const primary = teacher.assignedMarhalas[0] ?? 'Mutawassitah (Middle Marhala)';
    const secondary = teacher.assignedMarhalas[1] ?? 'Sanawiyyah Ulya (Higher Secondary Marhala)';
    const tertiary = teacher.assignedMarhalas[2] ?? 'Takmil (Masters / Dawra-e-Hadith Marhala)';

    return [
      {
        id: 'qawmi-sched-01',
        timeLabel: '08:15 AM – 09:05 AM',
        marhala: primary,
        focusBranch: teacher.focusBranch,
        roomLabel: 'Darul Hadith Hall 1',
        topic: `${teacher.primarySubject}: Morning Sabak & Ibarat Reading`,
      },
      {
        id: 'qawmi-sched-02',
        timeLabel: '10:30 AM – 11:20 AM',
        marhala: secondary,
        focusBranch: teacher.focusBranch,
        roomLabel: 'Kitab Khana Hall B',
        topic: `${teacher.primarySubject}: Sharah Commentary & Masalah Analysis`,
      },
      {
        id: 'qawmi-sched-03',
        timeLabel: '06:15 PM – 07:10 PM',
        marhala: tertiary,
        focusBranch: teacher.focusBranch,
        roomLabel: 'Majlis-e-Ilmi Circle',
        topic: `${teacher.primarySubject}: Evening Takrar & Befaq Shifah Drill`,
      },
    ];
  },

  listModules(): QawmiTeacherModuleResource[] {
    return readTeacherModules()
      .filter((m) => m.pathway === 'qawmi')
      .sort((a, b) => b.updatedAt - a.updatedAt);
  },

  createModule(
    teacher: QawmiTeacherContext,
    input: {
      marhala: QawmiTeacherMarhala;
      focusBranch: QawmiTeacherFocusBranch;
      title: string;
      type: QawmiTeacherModuleType;
      summary: string;
      published: boolean;
    },
    now = Date.now()
  ): { ok: true; module: QawmiTeacherModuleResource } | { ok: false; error: string } {
    const title = input.title.trim();
    const summary = input.summary.trim();
    if (title.length < 3) {
      return { ok: false, error: 'Please enter a descriptive module or kitab guide title.' };
    }
    if (summary.length < 8) {
      return {
        ok: false,
        error: 'Please enter Dars notes or Sabak coverage details (at least 8 characters).',
      };
    }

    const focusBranch = QAWMI_TEACHER_FOCUS_OPTIONS.includes(input.focusBranch)
      ? input.focusBranch
      : 'General / Kitab';

    const newModule: QawmiTeacherModuleResource = {
      id: `QAWMI-TMOD-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
      pathway: 'qawmi',
      teacherEmail: teacher.email,
      subject: teacher.primarySubject,
      marhala: input.marhala,
      focusBranch,
      title,
      type: input.type,
      summary,
      published: input.published,
      createdAt: now,
      updatedAt: now,
    };

    const next = [newModule, ...readTeacherModules(now)];
    writeTeacherModules(next);
    return { ok: true, module: newModule };
  },

  toggleModulePublished(moduleId: string, now = Date.now()): QawmiTeacherModuleResource[] {
    const next = readTeacherModules(now).map((mod) =>
      mod.id === moduleId ? { ...mod, published: !mod.published, updatedAt: now } : mod
    );
    writeTeacherModules(next);
    return next;
  },

  deleteModule(moduleId: string): QawmiTeacherModuleResource[] {
    const next = readTeacherModules().filter((mod) => mod.id !== moduleId);
    writeTeacherModules(next);
    return next;
  },

  listStudentRoster(): QawmiTeacherRosterStudent[] {
    const store = readQawmiSharedStore();
    const progressMap = readQawmiStudentProgressMap();
    const metaMap = readRosterMeta();

    return store.profiles
      .filter((p) => p.pathway === 'qawmi' && p.role === 'student')
      .map((student) => {
        const emailLower = student.email.toLowerCase();
        const completed = progressMap[emailLower] ?? [];
        const meta = metaMap[emailLower];
        const fallbackLessons = student.marhala === 'Takmil (Masters / Dawra-e-Hadith Marhala)' ? 5 : 4;

        return {
          id: student.id,
          fullName: student.fullName,
          email: student.email,
          marhala: student.marhala,
          focusBranch: student.focusBranch,
          status: student.status,
          completedLessonsCount: Math.max(completed.length, meta ? fallbackLessons : 0),
          totalRecommendedLessons: 11,
          marks: meta?.marks ?? 82,
          attendanceRate: meta?.attendanceRate ?? 90,
          attendanceStatus: meta?.attendanceStatus ?? 'Present',
          remarks: meta?.remarks ?? 'Active Qawmi Madrasa Talibul Ilm.',
        };
      })
      .sort((a, b) => a.fullName.localeCompare(b.fullName));
  },

  updateStudentAssessment(
    studentId: string,
    patch: {
      marks: number;
      attendanceRate: number;
      attendanceStatus: QawmiAttendanceStatus;
      remarks: string;
    },
    now = Date.now()
  ): { ok: true; student: QawmiTeacherRosterStudent } | { ok: false; error: string } {
    if (!Number.isFinite(patch.marks) || patch.marks < 0 || patch.marks > 100) {
      return { ok: false, error: 'Marks must be a valid number between 0 and 100.' };
    }
    if (
      !Number.isFinite(patch.attendanceRate) ||
      patch.attendanceRate < 0 ||
      patch.attendanceRate > 100
    ) {
      return { ok: false, error: 'Attendance rate must be between 0 and 100%.' };
    }

    const roster = this.listStudentRoster();
    const target = roster.find((s) => s.id === studentId);
    if (!target) {
      return { ok: false, error: 'Student record not found in the Qawmi Madrasa roster.' };
    }

    const metaMap = readRosterMeta(now);
    metaMap[target.email.toLowerCase()] = {
      marks: Math.round(patch.marks),
      attendanceRate: Math.round(patch.attendanceRate),
      attendanceStatus: patch.attendanceStatus,
      remarks: patch.remarks.trim() || 'Reviewed by Ustad.',
      updatedAt: now,
    };
    writeRosterMeta(metaMap);

    const updated = this.listStudentRoster().find((s) => s.id === studentId)!;
    return { ok: true, student: updated };
  },

  listOfficialNotices(): QawmiOfficialNotice[] {
    const store = readQawmiSharedStore();
    return store.notices
      .filter(
        (notice) =>
          notice.pathway === 'qawmi' &&
          (notice.audience === 'teacher' || notice.audience === 'both')
      )
      .sort((a, b) => b.createdAt - a.createdAt);
  },

  listClassAnnouncements(): QawmiTeacherClassAnnouncement[] {
    return readAnnouncements()
      .filter((a) => a.pathway === 'qawmi')
      .sort((a, b) => b.createdAt - a.createdAt);
  },

  postClassAnnouncement(
    teacher: QawmiTeacherContext,
    input: {
      marhala: QawmiTeacherMarhala;
      focusBranch: QawmiTeacherFocusBranch;
      title: string;
      message: string;
      tag: QawmiTeacherAnnouncementTag;
    },
    now = Date.now()
  ): { ok: true; announcement: QawmiTeacherClassAnnouncement } | { ok: false; error: string } {
    const title = input.title.trim();
    const message = input.message.trim();
    if (title.length < 3) {
      return { ok: false, error: 'Please enter a class announcement title.' };
    }
    if (message.length < 8) {
      return {
        ok: false,
        error: 'Please enter clear Dars, Sabak, or exam reminder instructions for students.',
      };
    }

    const focusBranch = QAWMI_TEACHER_FOCUS_OPTIONS.includes(input.focusBranch)
      ? input.focusBranch
      : 'General / Kitab';

    const announcement: QawmiTeacherClassAnnouncement = {
      id: `QAWMI-ANN-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
      pathway: 'qawmi',
      teacherName: teacher.fullName,
      teacherEmail: teacher.email,
      subject: teacher.primarySubject,
      marhala: input.marhala,
      focusBranch,
      title,
      message,
      tag: input.tag,
      createdAt: now,
    };

    const next = [announcement, ...readAnnouncements(now)];
    writeAnnouncements(next);
    return { ok: true, announcement };
  },

  deleteClassAnnouncement(announcementId: string): QawmiTeacherClassAnnouncement[] {
    const next = readAnnouncements().filter((a) => a.id !== announcementId);
    writeAnnouncements(next);
    return next;
  },

  updateTeacherPassword(
    email: string,
    currentPassword: string,
    newPassword: string,
    confirmPassword: string
  ): { ok: true } | { ok: false; error: string } {
    const cleanEmail = email.trim().toLowerCase();
    const store = readQawmiSharedStore();
    const profileIdx = store.profiles.findIndex(
      (p) =>
        p.pathway === 'qawmi' &&
        p.role === 'teacher' &&
        p.email.toLowerCase() === cleanEmail
    );
    if (profileIdx < 0) {
      return { ok: false, error: 'Qawmi Madrasa teacher profile not found.' };
    }

    const teacherProfile = store.profiles[profileIdx];
    if (!verifyPassword(currentPassword, teacherProfile.passwordHash)) {
      return { ok: false, error: 'Current password is incorrect.' };
    }

    const pwCheck = validatePassword(newPassword);
    if (!pwCheck.valid) {
      return { ok: false, error: 'New password must be at least 8 characters long.' };
    }
    if (newPassword !== confirmPassword) {
      return { ok: false, error: 'New password and confirmation do not match.' };
    }

    const updatedHash = hashPassword(newPassword);
    store.profiles[profileIdx] = {
      ...teacherProfile,
      passwordHash: updatedHash,
      updatedAt: Date.now(),
    };
    writeQawmiSharedStore(store);

    const db = loadDatabase();
    const authIdx = db.users.findIndex((u) => u.email.toLowerCase() === cleanEmail);
    if (authIdx >= 0) {
      db.users[authIdx] = {
        ...db.users[authIdx],
        passwordHash: updatedHash,
      };
      saveDatabase(db);
    }

    return { ok: true };
  },

  resetQawmiTeacherMemoryStoresForTest(): void {
    memoryQawmiSharedStore = null;
    memoryQawmiStudentProgress = {};
    memoryQawmiTeacherModules = null;
    memoryQawmiRosterMeta = null;
    memoryQawmiAnnouncements = null;
  },
};
