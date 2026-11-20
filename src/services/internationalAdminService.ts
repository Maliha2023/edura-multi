import { loadDatabase, saveDatabase } from './storage';
import type { CouponStatus, CurriculumSubTrack, UserAccount } from '../types/domain';
import { hashPassword, verifyPassword } from '../utils/crypto';
import { validateEmail, validateFullName, validatePassword } from '../utils/validation';

export type InternationalPathway = 'cambridge' | 'edexcel';
export type InternationalRole = 'teacher' | 'student';
export type InternationalRegistrationType = 'coupon_auto' | 'admin_manual';
export type InternationalUserStatus = 'active' | 'suspended';
export type InternationalNoticeAudience = 'teacher' | 'student' | 'both';
export type InternationalNoticeTag = 'General' | 'Exam' | 'Urgent';

export const LOWER_SECONDARY_LEVEL = 'Grade 1–8 (Primary / Lower Secondary)' as const;

export type CambridgeAcademicLevel =
  | typeof LOWER_SECONDARY_LEVEL
  | 'O Level / IGCSE (Grades 9–10)'
  | 'A Level / IAL (Grades 11–12)';

export type EdexcelAcademicLevel =
  | typeof LOWER_SECONDARY_LEVEL
  | 'International GCSE (Grades 9–10)'
  | 'IAL (Grades 11–12)';

export type InternationalAcademicLevel = CambridgeAcademicLevel | EdexcelAcademicLevel;

export const ACADEMIC_TRACK_OPTIONS = [
  'Science',
  'Business',
  'Humanities',
  'Mixed / Custom',
] as const;

export type UpperAcademicTrack = (typeof ACADEMIC_TRACK_OPTIONS)[number];
export type InternationalAcademicTrack = 'General' | UpperAcademicTrack;

export interface InternationalCoupon {
  id: string;
  code: string;
  digits: string;
  role: InternationalRole;
  pathway: InternationalPathway;
  status: CouponStatus;
  createdAt: number;
  expiresAt: number;
  usedAt?: number;
}

export interface InternationalPendingRegistration {
  id: string;
  role: InternationalRole;
  pathway: InternationalPathway;
  fullName: string;
  email: string;
  academicLevel: InternationalAcademicLevel;
  academicTrack: InternationalAcademicTrack;
  primarySubject?: string;
  couponCode: string;
  submittedAt: number;
  expiresAt: number;
}

export interface InternationalUserProfile {
  id: string;
  role: InternationalRole;
  pathway: InternationalPathway;
  fullName: string;
  email: string;
  academicLevel: InternationalAcademicLevel;
  academicTrack: InternationalAcademicTrack;
  primarySubject?: string;
  registrationType: InternationalRegistrationType;
  status: InternationalUserStatus;
  couponCode?: string;
  passwordHash: string;
  joinedAt: number;
  updatedAt: number;
}

export interface InternationalNotice {
  id: string;
  pathway: InternationalPathway;
  title: string;
  description: string;
  audience: InternationalNoticeAudience;
  academicLevel: 'all' | InternationalAcademicLevel;
  academicTrack: 'all' | UpperAcademicTrack;
  tag: InternationalNoticeTag;
  createdAt: number;
  updatedAt: number;
}

export interface InternationalActivityItem {
  id: string;
  pathway: InternationalPathway;
  category: 'coupon' | 'approval' | 'directory' | 'notice' | 'security';
  summary: string;
  actorEmail: string;
  createdAt: number;
}

export interface InternationalOverviewMetrics {
  activeTeachers: number;
  activeStudents: number;
  pendingApprovals: number;
  activeCoupons: number;
}

export interface InternationalDemoAdminPreset {
  pathway: InternationalPathway;
  pathwayLabel: CurriculumSubTrack;
  panelName: string;
  fullName: string;
  email: string;
  password: string;
  phone: string;
}

interface InternationalAdminStore {
  coupons: InternationalCoupon[];
  pending: InternationalPendingRegistration[];
  profiles: InternationalUserProfile[];
  notices: InternationalNotice[];
  activities: InternationalActivityItem[];
}

const STORAGE_KEY = 'edura_international_admin_workspace_v2';
const FORTY_EIGHT_HOURS_MS = 48 * 60 * 60 * 1000;

let memoryStore: InternationalAdminStore | null = null;

function canUseLocalStorage(): boolean {
  try {
    return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
  } catch {
    return false;
  }
}

export function resolveInternationalPathway(
  raw?: string | null
): InternationalPathway | null {
  if (!raw) return null;
  const normalized = raw.trim().toLowerCase();
  if (normalized === 'cambridge' || normalized === 'cambridge panel') {
    return 'cambridge';
  }
  if (normalized === 'edexcel' || normalized === 'edexcel panel') {
    return 'edexcel';
  }
  return null;
}

export function getInternationalPathwaySubTrack(
  pathway: InternationalPathway
): CurriculumSubTrack {
  return pathway === 'cambridge' ? 'Cambridge' : 'Edexcel';
}

export function getInternationalPanelName(pathway: InternationalPathway): string {
  return pathway === 'cambridge' ? 'Cambridge Panel' : 'Edexcel Panel';
}

export function getLevelsForPathway(
  pathway: InternationalPathway
): readonly InternationalAcademicLevel[] {
  return pathway === 'cambridge'
    ? ([
        LOWER_SECONDARY_LEVEL,
        'O Level / IGCSE (Grades 9–10)',
        'A Level / IAL (Grades 11–12)',
      ] as const)
    : ([
        LOWER_SECONDARY_LEVEL,
        'International GCSE (Grades 9–10)',
        'IAL (Grades 11–12)',
      ] as const);
}

export function getShortLevelLabel(level: InternationalAcademicLevel): string {
  if (level === LOWER_SECONDARY_LEVEL) return 'Grade 1–8';
  if (level === 'O Level / IGCSE (Grades 9–10)') return 'O Level / IGCSE';
  if (level === 'A Level / IAL (Grades 11–12)') return 'A Level / IAL';
  if (level === 'International GCSE (Grades 9–10)') return 'International GCSE';
  return 'IAL';
}

export function levelRequiresTrack(level: string): boolean {
  return level !== LOWER_SECONDARY_LEVEL && level !== 'all';
}

export function isValidLevelForPathway(
  pathway: InternationalPathway,
  level: string
): level is InternationalAcademicLevel {
  return (getLevelsForPathway(pathway) as readonly string[]).includes(level);
}

export function isValidUpperTrack(track: string): track is UpperAcademicTrack {
  return (ACADEMIC_TRACK_OPTIONS as readonly string[]).includes(track);
}

export function normalizeAcademicTrack(
  level: InternationalAcademicLevel,
  rawTrack?: string
): { ok: true; track: InternationalAcademicTrack } | { ok: false; error: string } {
  if (!levelRequiresTrack(level)) {
    return { ok: true, track: 'General' };
  }
  if (rawTrack && isValidUpperTrack(rawTrack)) {
    return { ok: true, track: rawTrack };
  }
  return {
    ok: false,
    error: `Please select an Academic Track / Stream (${ACADEMIC_TRACK_OPTIONS.join(', ')}) for ${getShortLevelLabel(level)}.`,
  };
}

export function formatAcademicDisplay(item: {
  role: InternationalRole;
  academicLevel: InternationalAcademicLevel;
  academicTrack: InternationalAcademicTrack;
  primarySubject?: string;
}): { levelShort: string; detail: string } {
  const levelShort = getShortLevelLabel(item.academicLevel);
  const trackLabel = item.academicTrack === 'General' ? 'General' : item.academicTrack;
  if (item.role === 'teacher' && item.primarySubject?.trim()) {
    return {
      levelShort,
      detail: `${trackLabel} · ${item.primarySubject.trim()}`,
    };
  }
  return {
    levelShort,
    detail: trackLabel,
  };
}

export function getSubjectSuggestionsForPathway(
  pathway: InternationalPathway,
  level: InternationalAcademicLevel
): readonly string[] {
  if (!levelRequiresTrack(level)) {
    return [
      'Mathematics',
      'English Language',
      'General Science',
      'Computing & ICT',
      'Global Perspectives',
      'Social Studies',
    ];
  }
  if (pathway === 'cambridge') {
    return [
      'Mathematics (0580 / 9709)',
      'Physics (0625 / 9702)',
      'Chemistry (0620 / 9701)',
      'Computer Science (0478 / 9618)',
      'Economics (0455 / 9708)',
      'Accounting (7707 / 9706)',
      'English Language (1123)',
    ];
  }
  return [
    'Further Mathematics (IAL)',
    'Physics (4PH1 / WPH11)',
    'Chemistry (4CH1 / WCH11)',
    'Biology (4BI1 / WBI11)',
    'Accounting & Business (4AC1)',
    'Economics (4EC1 / WEC11)',
    'English Literature (4ET1)',
  ];
}

export function getDemoInternationalAdminPreset(
  pathway: InternationalPathway
): InternationalDemoAdminPreset {
  if (pathway === 'cambridge') {
    return {
      pathway: 'cambridge',
      pathwayLabel: 'Cambridge',
      panelName: 'Cambridge Panel',
      fullName: 'Cambridge Academic Admin',
      email: 'admin.cambridge@example.com',
      password: 'Admin@1234',
      phone: '01710000101',
    };
  }
  return {
    pathway: 'edexcel',
    pathwayLabel: 'Edexcel',
    panelName: 'Edexcel Panel',
    fullName: 'Edexcel Academic Admin',
    email: 'admin.edexcel@example.com',
    password: 'Admin@1234',
    phone: '01710000102',
  };
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

function createSeedStore(now = Date.now()): InternationalAdminStore {
  const hour = 60 * 60 * 1000;
  const day = 24 * hour;
  const defaultHash = hashPassword('IntlUser@2026');

  const coupons: InternationalCoupon[] = [
    // Cambridge Coupons
    {
      id: 'INTL-CPN-CAM-01',
      code: 'T-61204',
      digits: '61204',
      role: 'teacher',
      pathway: 'cambridge',
      status: 'active',
      createdAt: now - 3 * hour,
      expiresAt: now + 45 * hour,
    },
    {
      id: 'INTL-CPN-CAM-02',
      code: 'S-61488',
      digits: '61488',
      role: 'student',
      pathway: 'cambridge',
      status: 'active',
      createdAt: now - 5 * hour,
      expiresAt: now + 43 * hour,
    },
    {
      id: 'INTL-CPN-CAM-03',
      code: 'T-61029',
      digits: '61029',
      role: 'teacher',
      pathway: 'cambridge',
      status: 'used',
      createdAt: now - 16 * hour,
      expiresAt: now + 32 * hour,
      usedAt: now - 12 * hour,
    },
    {
      id: 'INTL-CPN-CAM-04',
      code: 'S-60912',
      digits: '60912',
      role: 'student',
      pathway: 'cambridge',
      status: 'expired',
      createdAt: now - 54 * hour,
      expiresAt: now - 6 * hour,
    },

    // Edexcel Coupons
    {
      id: 'INTL-CPN-EDX-01',
      code: 'T-82419',
      digits: '82419',
      role: 'teacher',
      pathway: 'edexcel',
      status: 'active',
      createdAt: now - 2 * hour,
      expiresAt: now + 46 * hour,
    },
    {
      id: 'INTL-CPN-EDX-02',
      code: 'S-82903',
      digits: '82903',
      role: 'student',
      pathway: 'edexcel',
      status: 'active',
      createdAt: now - 6 * hour,
      expiresAt: now + 42 * hour,
    },
    {
      id: 'INTL-CPN-EDX-03',
      code: 'S-82055',
      digits: '82055',
      role: 'student',
      pathway: 'edexcel',
      status: 'used',
      createdAt: now - 20 * hour,
      expiresAt: now + 28 * hour,
      usedAt: now - 14 * hour,
    },
    {
      id: 'INTL-CPN-EDX-04',
      code: 'T-81770',
      digits: '81770',
      role: 'teacher',
      pathway: 'edexcel',
      status: 'expired',
      createdAt: now - 60 * hour,
      expiresAt: now - 12 * hour,
    },
  ];

  const pending: InternationalPendingRegistration[] = [
    // Cambridge Pending
    {
      id: 'INTL-PND-CAM-T1',
      role: 'teacher',
      pathway: 'cambridge',
      fullName: 'Dr. Ananya Sen',
      email: 'ananya.sen@cambridge-faculty.edu.bd',
      academicLevel: 'A Level / IAL (Grades 11–12)',
      academicTrack: 'Science',
      primarySubject: 'Physics (9702)',
      couponCode: 'T-61311',
      submittedAt: now - 4 * hour,
      expiresAt: now + 44 * hour,
    },
    {
      id: 'INTL-PND-CAM-S1',
      role: 'student',
      pathway: 'cambridge',
      fullName: 'Zayan Mahmud',
      email: 'zayan.m@cambridge-student.edu.bd',
      academicLevel: 'O Level / IGCSE (Grades 9–10)',
      academicTrack: 'Science',
      couponCode: 'S-61592',
      submittedAt: now - 7 * hour,
      expiresAt: now + 41 * hour,
    },
    {
      id: 'INTL-PND-CAM-S2',
      role: 'student',
      pathway: 'cambridge',
      fullName: 'Raisa Chowdhury',
      email: 'raisa.c@cambridge-student.edu.bd',
      academicLevel: 'A Level / IAL (Grades 11–12)',
      academicTrack: 'Business',
      couponCode: 'S-61740',
      submittedAt: now - 10 * hour,
      expiresAt: now + 38 * hour,
    },
    {
      id: 'INTL-PND-CAM-S3',
      role: 'student',
      pathway: 'cambridge',
      fullName: 'Aarav Rahman',
      email: 'aarav.r@cambridge-student.edu.bd',
      academicLevel: LOWER_SECONDARY_LEVEL,
      academicTrack: 'General',
      couponCode: 'S-61805',
      submittedAt: now - 12 * hour,
      expiresAt: now + 36 * hour,
    },

    // Edexcel Pending
    {
      id: 'INTL-PND-EDX-T1',
      role: 'teacher',
      pathway: 'edexcel',
      fullName: 'Tariqul Islam',
      email: 'tariqul.islam@edexcel-faculty.edu.bd',
      academicLevel: 'IAL (Grades 11–12)',
      academicTrack: 'Science',
      primarySubject: 'Further Mathematics (IAL)',
      couponCode: 'T-82644',
      submittedAt: now - 3 * hour,
      expiresAt: now + 45 * hour,
    },
    {
      id: 'INTL-PND-EDX-S1',
      role: 'student',
      pathway: 'edexcel',
      fullName: 'Maliha Hossain',
      email: 'maliha.h@edexcel-student.edu.bd',
      academicLevel: 'International GCSE (Grades 9–10)',
      academicTrack: 'Science',
      couponCode: 'S-82781',
      submittedAt: now - 8 * hour,
      expiresAt: now + 40 * hour,
    },
    {
      id: 'INTL-PND-EDX-S2',
      role: 'student',
      pathway: 'edexcel',
      fullName: 'Zaid Al-Mamun',
      email: 'zaid.m@edexcel-student.edu.bd',
      academicLevel: LOWER_SECONDARY_LEVEL,
      academicTrack: 'General',
      couponCode: 'S-82819',
      submittedAt: now - 11 * hour,
      expiresAt: now + 37 * hour,
    },
  ];

  const profiles: InternationalUserProfile[] = [
    // Cambridge Directory
    {
      id: 'INTL-USR-CAM-T1',
      role: 'teacher',
      pathway: 'cambridge',
      fullName: 'Prof. Farzad Karim',
      email: 'farzad.karim@cambridge-faculty.edu.bd',
      academicLevel: 'A Level / IAL (Grades 11–12)',
      academicTrack: 'Science',
      primarySubject: 'Mathematics (9709)',
      registrationType: 'coupon_auto',
      status: 'active',
      couponCode: 'T-61029',
      passwordHash: defaultHash,
      joinedAt: now - 24 * day,
      updatedAt: now - 2 * day,
    },
    {
      id: 'INTL-USR-CAM-T2',
      role: 'teacher',
      pathway: 'cambridge',
      fullName: 'Nadia Rahman',
      email: 'nadia.rahman@cambridge-faculty.edu.bd',
      academicLevel: 'O Level / IGCSE (Grades 9–10)',
      academicTrack: 'Science',
      primarySubject: 'Chemistry (0620)',
      registrationType: 'admin_manual',
      status: 'active',
      passwordHash: defaultHash,
      joinedAt: now - 15 * day,
      updatedAt: now - 3 * day,
    },
    {
      id: 'INTL-USR-CAM-T3',
      role: 'teacher',
      pathway: 'cambridge',
      fullName: 'Farhana Yasmin',
      email: 'farhana.y@cambridge-faculty.edu.bd',
      academicLevel: LOWER_SECONDARY_LEVEL,
      academicTrack: 'General',
      primarySubject: 'English Language',
      registrationType: 'admin_manual',
      status: 'active',
      passwordHash: defaultHash,
      joinedAt: now - 8 * day,
      updatedAt: now - 1 * day,
    },
    {
      id: 'INTL-USR-CAM-S1',
      role: 'student',
      pathway: 'cambridge',
      fullName: 'Ayaan Siddiqui',
      email: 'ayaan.s@cambridge-student.edu.bd',
      academicLevel: 'O Level / IGCSE (Grades 9–10)',
      academicTrack: 'Science',
      registrationType: 'coupon_auto',
      status: 'active',
      couponCode: 'S-60541',
      passwordHash: defaultHash,
      joinedAt: now - 19 * day,
      updatedAt: now - 1 * day,
    },
    {
      id: 'INTL-USR-CAM-S2',
      role: 'student',
      pathway: 'cambridge',
      fullName: 'Tasnima Kabir',
      email: 'tasnima.k@cambridge-student.edu.bd',
      academicLevel: 'A Level / IAL (Grades 11–12)',
      academicTrack: 'Mixed / Custom',
      registrationType: 'admin_manual',
      status: 'active',
      passwordHash: defaultHash,
      joinedAt: now - 11 * day,
      updatedAt: now - 2 * day,
    },
    {
      id: 'INTL-USR-CAM-S3',
      role: 'student',
      pathway: 'cambridge',
      fullName: 'Shafin Ahmed',
      email: 'shafin.a@cambridge-student.edu.bd',
      academicLevel: 'O Level / IGCSE (Grades 9–10)',
      academicTrack: 'Business',
      registrationType: 'coupon_auto',
      status: 'suspended',
      couponCode: 'S-60218',
      passwordHash: defaultHash,
      joinedAt: now - 31 * day,
      updatedAt: now - 5 * day,
    },
    {
      id: 'INTL-USR-CAM-S4',
      role: 'student',
      pathway: 'cambridge',
      fullName: 'Inaya Karim',
      email: 'inaya.k@cambridge-student.edu.bd',
      academicLevel: LOWER_SECONDARY_LEVEL,
      academicTrack: 'General',
      registrationType: 'admin_manual',
      status: 'active',
      passwordHash: defaultHash,
      joinedAt: now - 6 * day,
      updatedAt: now - 1 * day,
    },

    // Edexcel Directory
    {
      id: 'INTL-USR-EDX-T1',
      role: 'teacher',
      pathway: 'edexcel',
      fullName: 'Dr. Mahbub Alam',
      email: 'mahbub.alam@edexcel-faculty.edu.bd',
      academicLevel: 'IAL (Grades 11–12)',
      academicTrack: 'Science',
      primarySubject: 'Physics (WPH11)',
      registrationType: 'admin_manual',
      status: 'active',
      passwordHash: defaultHash,
      joinedAt: now - 28 * day,
      updatedAt: now - 4 * day,
    },
    {
      id: 'INTL-USR-EDX-T2',
      role: 'teacher',
      pathway: 'edexcel',
      fullName: 'Sadia Afrin',
      email: 'sadia.afrin@edexcel-faculty.edu.bd',
      academicLevel: 'International GCSE (Grades 9–10)',
      academicTrack: 'Humanities',
      primarySubject: 'English Literature (4ET1)',
      registrationType: 'coupon_auto',
      status: 'active',
      couponCode: 'T-81904',
      passwordHash: defaultHash,
      joinedAt: now - 14 * day,
      updatedAt: now - 1 * day,
    },
    {
      id: 'INTL-USR-EDX-T3',
      role: 'teacher',
      pathway: 'edexcel',
      fullName: 'Kamrul Hasan',
      email: 'kamrul.h@edexcel-faculty.edu.bd',
      academicLevel: LOWER_SECONDARY_LEVEL,
      academicTrack: 'General',
      primarySubject: 'Lower Secondary Science',
      registrationType: 'admin_manual',
      status: 'active',
      passwordHash: defaultHash,
      joinedAt: now - 7 * day,
      updatedAt: now - 1 * day,
    },
    {
      id: 'INTL-USR-EDX-S1',
      role: 'student',
      pathway: 'edexcel',
      fullName: 'Rehan Chowdhury',
      email: 'rehan.c@edexcel-student.edu.bd',
      academicLevel: 'IAL (Grades 11–12)',
      academicTrack: 'Mixed / Custom',
      registrationType: 'coupon_auto',
      status: 'active',
      couponCode: 'S-82055',
      passwordHash: defaultHash,
      joinedAt: now - 18 * day,
      updatedAt: now - 2 * day,
    },
    {
      id: 'INTL-USR-EDX-S2',
      role: 'student',
      pathway: 'edexcel',
      fullName: 'Nusrat Jahan',
      email: 'nusrat.j@edexcel-student.edu.bd',
      academicLevel: 'International GCSE (Grades 9–10)',
      academicTrack: 'Business',
      registrationType: 'admin_manual',
      status: 'active',
      passwordHash: defaultHash,
      joinedAt: now - 9 * day,
      updatedAt: now - 1 * day,
    },
    {
      id: 'INTL-USR-EDX-S3',
      role: 'student',
      pathway: 'edexcel',
      fullName: 'Fardeen Zaman',
      email: 'fardeen.z@edexcel-student.edu.bd',
      academicLevel: 'International GCSE (Grades 9–10)',
      academicTrack: 'Science',
      registrationType: 'coupon_auto',
      status: 'suspended',
      couponCode: 'S-81402',
      passwordHash: defaultHash,
      joinedAt: now - 26 * day,
      updatedAt: now - 6 * day,
    },
    {
      id: 'INTL-USR-EDX-S4',
      role: 'student',
      pathway: 'edexcel',
      fullName: 'Sara Islam',
      email: 'sara.i@edexcel-student.edu.bd',
      academicLevel: LOWER_SECONDARY_LEVEL,
      academicTrack: 'General',
      registrationType: 'coupon_auto',
      status: 'active',
      couponCode: 'S-81509',
      passwordHash: defaultHash,
      joinedAt: now - 5 * day,
      updatedAt: now - 1 * day,
    },
  ];

  const notices: InternationalNotice[] = [
    // Cambridge Notices
    {
      id: 'INTL-NTC-CAM-01',
      pathway: 'cambridge',
      title: 'May/June Cambridge CAIE Exam Entry Verification',
      description:
        'All O Level / IGCSE and A Level / IAL candidates must confirm their syllabus component codes with the Cambridge coordinator by Thursday 3:00 PM.',
      audience: 'both',
      academicLevel: 'all',
      academicTrack: 'all',
      tag: 'Exam',
      createdAt: now - 12 * hour,
      updatedAt: now - 12 * hour,
    },
    {
      id: 'INTL-NTC-CAM-02',
      pathway: 'cambridge',
      title: 'A Level Practical Paper 3 Lab Moderation Schedule',
      description:
        'Physics (9702) and Chemistry (9701) instructors are requested to submit laboratory apparatus checklists ahead of next week’s mock practical assessment.',
      audience: 'teacher',
      academicLevel: 'A Level / IAL (Grades 11–12)',
      academicTrack: 'Science',
      tag: 'Urgent',
      createdAt: now - 30 * hour,
      updatedAt: now - 30 * hour,
    },
    {
      id: 'INTL-NTC-CAM-03',
      pathway: 'cambridge',
      title: 'Cambridge Lower Secondary Checkpoint Science Fair',
      description:
        'All Grade 1–8 students participating in the Lower Secondary exhibition should submit project poster titles to their homeroom advisor by Sunday.',
      audience: 'student',
      academicLevel: LOWER_SECONDARY_LEVEL,
      academicTrack: 'all',
      tag: 'General',
      createdAt: now - 40 * hour,
      updatedAt: now - 40 * hour,
    },

    // Edexcel Notices
    {
      id: 'INTL-NTC-EDX-01',
      pathway: 'edexcel',
      title: 'Pearson Edexcel IAL Modular Cash-In Window Open',
      description:
        'IAL candidates planning January/May unit cash-in should submit their unit codes (WMA11–WMA14, WPH11–WPH16) through the Edexcel Exams Desk before Friday.',
      audience: 'student',
      academicLevel: 'IAL (Grades 11–12)',
      academicTrack: 'Science',
      tag: 'Exam',
      createdAt: now - 9 * hour,
      updatedAt: now - 9 * hour,
    },
    {
      id: 'INTL-NTC-EDX-02',
      pathway: 'edexcel',
      title: 'Edexcel Faculty Marking Standardization Briefing',
      description:
        'All Grade 1–8, International GCSE, and IAL faculty members will meet in Seminar Room B on Tuesday at 11:00 AM to align mock grade boundaries with Pearson rubrics.',
      audience: 'teacher',
      academicLevel: 'all',
      academicTrack: 'all',
      tag: 'General',
      createdAt: now - 26 * hour,
      updatedAt: now - 26 * hour,
    },
  ];

  const activities: InternationalActivityItem[] = [
    // Cambridge Activity
    {
      id: 'INTL-ACT-CAM-01',
      pathway: 'cambridge',
      category: 'approval',
      summary: 'New A Level / IAL Science faculty application queued for Dr. Ananya Sen (T-61311).',
      actorEmail: 'admin.cambridge@example.com',
      createdAt: now - 4 * hour,
    },
    {
      id: 'INTL-ACT-CAM-02',
      pathway: 'cambridge',
      category: 'coupon',
      summary: 'Issued active Teacher coupon T-61204 (48h validity) under Cambridge Panel.',
      actorEmail: 'admin.cambridge@example.com',
      createdAt: now - 3 * hour,
    },
    {
      id: 'INTL-ACT-CAM-03',
      pathway: 'cambridge',
      category: 'notice',
      summary: 'Published Exam notice: May/June Cambridge CAIE Exam Entry Verification.',
      actorEmail: 'admin.cambridge@example.com',
      createdAt: now - 12 * hour,
    },

    // Edexcel Activity
    {
      id: 'INTL-ACT-EDX-01',
      pathway: 'edexcel',
      category: 'coupon',
      summary: 'Issued active Teacher coupon T-82419 (48h validity) under Edexcel Panel.',
      actorEmail: 'admin.edexcel@example.com',
      createdAt: now - 2 * hour,
    },
    {
      id: 'INTL-ACT-EDX-02',
      pathway: 'edexcel',
      category: 'approval',
      summary: 'New IAL Science faculty application queued for Tariqul Islam (T-82644).',
      actorEmail: 'admin.edexcel@example.com',
      createdAt: now - 3 * hour,
    },
    {
      id: 'INTL-ACT-EDX-03',
      pathway: 'edexcel',
      category: 'notice',
      summary: 'Published Exam notice: Pearson Edexcel IAL Modular Cash-In Window Open.',
      actorEmail: 'admin.edexcel@example.com',
      createdAt: now - 9 * hour,
    },
  ];

  return { coupons, pending, profiles, notices, activities };
}

function loadStore(now = Date.now()): InternationalAdminStore {
  let store: InternationalAdminStore | null = null;
  if (canUseLocalStorage()) {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as InternationalAdminStore;
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

  let mutated = false;
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

function saveStore(store: InternationalAdminStore): void {
  if (canUseLocalStorage()) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } else {
    memoryStore = store;
  }
}

export function resetInternationalAdminStore(now = Date.now()): void {
  const seeded = createSeedStore(now);
  saveStore(seeded);
}

function appendActivity(
  store: InternationalAdminStore,
  pathway: InternationalPathway,
  category: InternationalActivityItem['category'],
  summary: string,
  actorEmail?: string,
  now = Date.now()
): void {
  const fallbackActor = getDemoInternationalAdminPreset(pathway).email;
  store.activities.unshift({
    id: `INTL-ACT-${pathway.toUpperCase()}-${now}-${Math.floor(Math.random() * 1000)}`,
    pathway,
    category,
    summary,
    actorEmail: actorEmail || fallbackActor,
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

export function getInternationalUserInitials(fullName: string): string {
  const parts = fullName
    .trim()
    .split(/\s+/)
    .filter((p) => p && !/^(dr\.|prof\.|mr\.|ms\.|mrs\.)$/i.test(p));
  if (parts.length === 0) {
    const raw = fullName.trim().split(/\s+/).filter(Boolean);
    return (raw[0]?.[0] ?? 'U').toUpperCase();
  }
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export const internationalAdminService = {
  /**
   * Ensures demo Cambridge/Edexcel admin accounts exist in edura_multi_db_v1
   * without touching storage.ts or any NCTB admin account.
   */
  prepareInternationalAdminForLogin(
    rawEmail: string,
    pathway: InternationalPathway,
    now = Date.now()
  ): void {
    const email = rawEmail.trim().toLowerCase();
    const preset = getDemoInternationalAdminPreset(pathway);
    if (email !== preset.email) return;

    const db = loadDatabase(now);
    const existing = db.users.find(
      (u) => u.role === 'admin' && u.email.toLowerCase() === preset.email
    );
    if (!existing) {
      const account: UserAccount = {
        id: `admin-intl-${pathway}`,
        role: 'admin',
        fullName: preset.fullName,
        email: preset.email,
        phone: preset.phone,
        passwordHash: hashPassword(preset.password),
        mustChangePassword: false,
        preferredLanguage: 'en',
        createdAt: now - 30 * 24 * 60 * 60 * 1000,
        educationStream: 'International Curriculum (English Medium)',
        pathway: preset.pathwayLabel,
      };
      db.users.push(account);
      saveDatabase(db);
    }
  },

  // --- OVERVIEW ---
  getOverviewMetrics(pathway: InternationalPathway, now = Date.now()): InternationalOverviewMetrics {
    const store = loadStore(now);
    const profiles = store.profiles.filter((p) => p.pathway === pathway);
    const pending = store.pending.filter((p) => p.pathway === pathway);
    const coupons = store.coupons.filter((c) => c.pathway === pathway);

    return {
      activeTeachers: profiles.filter((p) => p.role === 'teacher' && p.status === 'active').length,
      activeStudents: profiles.filter((p) => p.role === 'student' && p.status === 'active').length,
      pendingApprovals: pending.length,
      activeCoupons: coupons.filter((c) => c.status === 'active' && c.expiresAt > now).length,
    };
  },

  listActivities(
    pathway: InternationalPathway,
    limit = 10,
    now = Date.now()
  ): InternationalActivityItem[] {
    const store = loadStore(now);
    return store.activities
      .filter((a) => a.pathway === pathway)
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, limit);
  },

  // --- COUPONS ---
  listCoupons(
    pathway: InternationalPathway,
    filters: { status?: 'all' | CouponStatus; query?: string } = {},
    now = Date.now()
  ): InternationalCoupon[] {
    const store = loadStore(now);
    const q = (filters.query ?? '').trim().toLowerCase();
    return store.coupons
      .filter((c) => c.pathway === pathway)
      .filter((c) => {
        if (filters.status && filters.status !== 'all' && c.status !== filters.status) {
          return false;
        }
        if (q) {
          const hay = `${c.code} ${c.digits} ${c.role} ${c.status}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => b.createdAt - a.createdAt);
  },

  generateCoupon(
    pathway: InternationalPathway,
    role: InternationalRole,
    actorEmail?: string,
    now = Date.now()
  ): InternationalCoupon {
    const store = loadStore(now);
    const existingDigits = new Set(store.coupons.map((c) => c.digits));
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
    const coupon: InternationalCoupon = {
      id: `INTL-CPN-${pathway.toUpperCase()}-${now}-${digits}`,
      code,
      digits,
      role,
      pathway,
      status: 'active',
      createdAt: now,
      expiresAt: now + FORTY_EIGHT_HOURS_MS,
    };

    store.coupons.unshift(coupon);
    appendActivity(
      store,
      pathway,
      'coupon',
      `Generated ${role === 'teacher' ? 'Teacher' : 'Student'} coupon ${code} (48h validity).`,
      actorEmail,
      now
    );
    saveStore(store);
    return coupon;
  },

  // --- USERS: PENDING APPROVALS ---
  listPending(
    pathway: InternationalPathway,
    role?: InternationalRole,
    now = Date.now()
  ): InternationalPendingRegistration[] {
    const store = loadStore(now);
    return store.pending
      .filter((item) => item.pathway === pathway)
      .filter((item) => (role ? item.role === role : true))
      .sort((a, b) => b.submittedAt - a.submittedAt);
  },

  editPending(
    pathway: InternationalPathway,
    pendingId: string,
    patch: {
      fullName: string;
      email: string;
      academicLevel: InternationalAcademicLevel;
      academicTrack?: InternationalAcademicTrack;
      primarySubject?: string;
    },
    actorEmail?: string,
    now = Date.now()
  ): { ok: true; item: InternationalPendingRegistration } | { ok: false; error: string } {
    const store = loadStore(now);
    const idx = store.pending.findIndex((p) => p.id === pendingId && p.pathway === pathway);
    if (idx === -1) {
      return { ok: false, error: 'Pending application not found in this pathway.' };
    }

    const existing = store.pending[idx];
    const nameCheck = validateFullName(patch.fullName);
    if (!nameCheck.valid) return { ok: false, error: 'Please enter a valid full name.' };

    const emailCheck = validateEmail(patch.email);
    if (!emailCheck.valid) return { ok: false, error: 'Please enter a valid email address.' };

    if (!isValidLevelForPathway(pathway, patch.academicLevel)) {
      return {
        ok: false,
        error: 'Selected academic level does not match this curriculum pathway.',
      };
    }

    const trackCheck = normalizeAcademicTrack(patch.academicLevel, patch.academicTrack);
    if (!trackCheck.ok) {
      return { ok: false, error: trackCheck.error };
    }

    const primarySubject =
      existing.role === 'teacher' ? (patch.primarySubject ?? '').trim() : undefined;
    if (existing.role === 'teacher' && !primarySubject) {
      return { ok: false, error: 'Please enter a Primary Subject for teacher applicants.' };
    }

    const updated: InternationalPendingRegistration = {
      ...existing,
      fullName: patch.fullName.trim(),
      email: patch.email.trim().toLowerCase(),
      academicLevel: patch.academicLevel,
      academicTrack: trackCheck.track,
      primarySubject,
    };
    store.pending[idx] = updated;
    appendActivity(
      store,
      pathway,
      'approval',
      `Updated pending application details for ${updated.fullName} (${getShortLevelLabel(updated.academicLevel)} • ${updated.academicTrack}).`,
      actorEmail,
      now
    );
    saveStore(store);
    return { ok: true, item: updated };
  },

  approvePending(
    pathway: InternationalPathway,
    pendingId: string,
    actorEmail?: string,
    now = Date.now()
  ): { ok: true; profile: InternationalUserProfile } | { ok: false; error: string } {
    const store = loadStore(now);
    const idx = store.pending.findIndex((p) => p.id === pendingId && p.pathway === pathway);
    if (idx === -1) {
      return { ok: false, error: 'Pending application not found in this pathway.' };
    }

    const item = store.pending[idx];
    const duplicate = store.profiles.some(
      (p) => p.pathway === pathway && p.email.toLowerCase() === item.email.toLowerCase()
    );
    if (duplicate) {
      return {
        ok: false,
        error: `An account with email ${item.email} already exists in ${getInternationalPanelName(pathway)}.`,
      };
    }

    const profile: InternationalUserProfile = {
      id: `INTL-USR-${pathway.toUpperCase()}-${item.role === 'teacher' ? 'T' : 'S'}${now % 100000}`,
      role: item.role,
      pathway,
      fullName: item.fullName,
      email: item.email.toLowerCase(),
      academicLevel: item.academicLevel,
      academicTrack: item.academicTrack,
      primarySubject: item.primarySubject,
      registrationType: 'coupon_auto',
      status: 'active',
      couponCode: item.couponCode,
      passwordHash: hashPassword('IntlApproved@2026'),
      joinedAt: now,
      updatedAt: now,
    };

    store.profiles.unshift(profile);
    store.pending.splice(idx, 1);

    store.coupons = store.coupons.map((c) =>
      c.pathway === pathway && c.code.toUpperCase() === item.couponCode.toUpperCase()
        ? { ...c, status: 'used', usedAt: now }
        : c
    );

    appendActivity(
      store,
      pathway,
      'approval',
      `Approved ${item.role === 'teacher' ? 'Teacher' : 'Student'} ${item.fullName} (${getShortLevelLabel(item.academicLevel)} • ${item.academicTrack} · ${item.couponCode}).`,
      actorEmail,
      now
    );
    saveStore(store);
    return { ok: true, profile };
  },

  rejectPending(
    pathway: InternationalPathway,
    pendingId: string,
    actorEmail?: string,
    now = Date.now()
  ): { ok: true } | { ok: false; error: string } {
    const store = loadStore(now);
    const idx = store.pending.findIndex((p) => p.id === pendingId && p.pathway === pathway);
    if (idx === -1) {
      return { ok: false, error: 'Pending application not found in this pathway.' };
    }

    const [removed] = store.pending.splice(idx, 1);
    appendActivity(
      store,
      pathway,
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
    pathway: InternationalPathway,
    filters: {
      role?: InternationalRole;
      query?: string;
      academicLevel?: 'all' | InternationalAcademicLevel;
      academicTrack?: 'all' | UpperAcademicTrack;
      status?: 'all' | InternationalUserStatus;
      registrationType?: 'all' | InternationalRegistrationType;
    } = {},
    now = Date.now()
  ): InternationalUserProfile[] {
    const store = loadStore(now);
    const q = (filters.query ?? '').trim().toLowerCase();
    return store.profiles
      .filter((p) => p.pathway === pathway)
      .filter((p) => {
        if (filters.role && p.role !== filters.role) return false;
        if (
          filters.academicLevel &&
          filters.academicLevel !== 'all' &&
          p.academicLevel !== filters.academicLevel
        ) {
          return false;
        }
        if (
          filters.academicTrack &&
          filters.academicTrack !== 'all' &&
          p.academicTrack !== filters.academicTrack
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
          const hay = `${p.fullName} ${p.email} ${p.id} ${p.academicLevel} ${getShortLevelLabel(p.academicLevel)} ${p.academicTrack} ${p.primarySubject ?? ''} ${p.couponCode ?? ''}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => b.joinedAt - a.joinedAt);
  },

  updateUserAcademicInfo(
    pathway: InternationalPathway,
    userId: string,
    patch: {
      fullName: string;
      academicLevel: InternationalAcademicLevel;
      academicTrack?: InternationalAcademicTrack;
      primarySubject?: string;
    },
    actorEmail?: string,
    now = Date.now()
  ): { ok: true; profile: InternationalUserProfile } | { ok: false; error: string } {
    const store = loadStore(now);
    const idx = store.profiles.findIndex((p) => p.id === userId && p.pathway === pathway);
    if (idx === -1) {
      return { ok: false, error: 'User profile not found in this pathway.' };
    }

    const existing = store.profiles[idx];
    const nameCheck = validateFullName(patch.fullName);
    if (!nameCheck.valid) return { ok: false, error: 'Please enter a valid full name.' };
    if (!isValidLevelForPathway(pathway, patch.academicLevel)) {
      return { ok: false, error: 'Selected academic level is invalid for this pathway.' };
    }

    const trackCheck = normalizeAcademicTrack(patch.academicLevel, patch.academicTrack);
    if (!trackCheck.ok) {
      return { ok: false, error: trackCheck.error };
    }

    const primarySubject =
      existing.role === 'teacher' ? (patch.primarySubject ?? '').trim() : undefined;
    if (existing.role === 'teacher' && !primarySubject) {
      return { ok: false, error: 'Primary Subject cannot be empty for teacher accounts.' };
    }

    const updated: InternationalUserProfile = {
      ...existing,
      fullName: patch.fullName.trim(),
      academicLevel: patch.academicLevel,
      academicTrack: trackCheck.track,
      primarySubject,
      updatedAt: now,
    };
    store.profiles[idx] = updated;
    appendActivity(
      store,
      pathway,
      'directory',
      `Updated academic info for ${updated.fullName} (${getShortLevelLabel(updated.academicLevel)} • ${updated.academicTrack}${updated.primarySubject ? ` · ${updated.primarySubject}` : ''}).`,
      actorEmail,
      now
    );
    saveStore(store);
    return { ok: true, profile: updated };
  },

  resetUserPassword(
    pathway: InternationalPathway,
    userId: string,
    actorEmail?: string,
    now = Date.now(),
    customPassword?: string
  ): { ok: true; temporaryPassword: string; email: string } | { ok: false; error: string } {
    const store = loadStore(now);
    const idx = store.profiles.findIndex((p) => p.id === userId && p.pathway === pathway);
    if (idx === -1) {
      return { ok: false, error: 'User profile not found in this pathway.' };
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
      pathway,
      'security',
      `Reset password for ${store.profiles[idx].fullName} (${store.profiles[idx].email}).`,
      actorEmail,
      now
    );
    saveStore(store);
    return { ok: true, temporaryPassword, email: store.profiles[idx].email };
  },

  toggleUserStatus(
    pathway: InternationalPathway,
    userId: string,
    actorEmail?: string,
    now = Date.now()
  ): { ok: true; profile: InternationalUserProfile } | { ok: false; error: string } {
    const store = loadStore(now);
    const idx = store.profiles.findIndex((p) => p.id === userId && p.pathway === pathway);
    if (idx === -1) {
      return { ok: false, error: 'User profile not found in this pathway.' };
    }

    const nextStatus: InternationalUserStatus =
      store.profiles[idx].status === 'active' ? 'suspended' : 'active';
    store.profiles[idx] = {
      ...store.profiles[idx],
      status: nextStatus,
      updatedAt: now,
    };
    appendActivity(
      store,
      pathway,
      'directory',
      `${nextStatus === 'active' ? 'Activated' : 'Suspended'} account for ${store.profiles[idx].fullName}.`,
      actorEmail,
      now
    );
    saveStore(store);
    return { ok: true, profile: store.profiles[idx] };
  },

  deleteUser(
    pathway: InternationalPathway,
    userId: string,
    actorEmail?: string,
    now = Date.now()
  ): { ok: true } | { ok: false; error: string } {
    const store = loadStore(now);
    const idx = store.profiles.findIndex((p) => p.id === userId && p.pathway === pathway);
    if (idx === -1) {
      return { ok: false, error: 'User profile not found in this pathway.' };
    }
    const [removed] = store.profiles.splice(idx, 1);
    appendActivity(
      store,
      pathway,
      'directory',
      `Deleted ${removed.role} account ${removed.fullName} (${removed.email}).`,
      actorEmail,
      now
    );
    saveStore(store);
    return { ok: true };
  },

  bulkUpdateStatus(
    pathway: InternationalPathway,
    userIds: string[],
    status: InternationalUserStatus,
    actorEmail?: string,
    now = Date.now()
  ): number {
    const store = loadStore(now);
    const idSet = new Set(userIds);
    let count = 0;
    store.profiles = store.profiles.map((p) => {
      if (p.pathway === pathway && idSet.has(p.id) && p.status !== status) {
        count += 1;
        return { ...p, status, updatedAt: now };
      }
      return p;
    });
    if (count > 0) {
      appendActivity(
        store,
        pathway,
        'directory',
        `Bulk updated ${count} user(s) to ${status}.`,
        actorEmail,
        now
      );
      saveStore(store);
    }
    return count;
  },

  bulkDeleteUsers(
    pathway: InternationalPathway,
    userIds: string[],
    actorEmail?: string,
    now = Date.now()
  ): number {
    const store = loadStore(now);
    const idSet = new Set(userIds);
    const before = store.profiles.length;
    store.profiles = store.profiles.filter(
      (p) => !(p.pathway === pathway && idSet.has(p.id))
    );
    const removedCount = before - store.profiles.length;
    if (removedCount > 0) {
      appendActivity(
        store,
        pathway,
        'directory',
        `Bulk deleted ${removedCount} user account(s).`,
        actorEmail,
        now
      );
      saveStore(store);
    }
    return removedCount;
  },

  exportDirectoryCsv(users: InternationalUserProfile[]): string {
    const headers = [
      'ID',
      'Full Name',
      'Email',
      'Role',
      'Pathway',
      'Academic Level',
      'Academic Track / Stream',
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
      getInternationalPathwaySubTrack(u.pathway),
      u.academicLevel,
      u.academicTrack,
      u.primarySubject ?? '',
      u.registrationType === 'admin_manual' ? 'Manual' : 'Auto Coupon',
      u.status === 'active' ? 'Active' : 'Suspended',
      new Date(u.joinedAt).toISOString().slice(0, 10),
    ]);
    return [headers, ...rows].map((row) => row.map(csvEscape).join(',')).join('\n');
  },

  // --- USERS: MANUAL REGISTRATION ---
  createManualAccount(
    pathway: InternationalPathway,
    input: {
      role: InternationalRole;
      fullName: string;
      email: string;
      temporaryPassword: string;
      academicLevel: InternationalAcademicLevel;
      academicTrack?: InternationalAcademicTrack;
      primarySubject?: string;
    },
    actorEmail?: string,
    now = Date.now()
  ):
    | {
        ok: true;
        profile: InternationalUserProfile;
        credentialsSummary: {
          pathwayLabel: string;
          roleLabel: string;
          fullName: string;
          email: string;
          temporaryPassword: string;
          academicLevel: string;
          academicTrack: string;
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

    if (!isValidLevelForPathway(pathway, input.academicLevel)) {
      return { ok: false, error: 'Selected academic level does not belong to this pathway.' };
    }

    const trackCheck = normalizeAcademicTrack(input.academicLevel, input.academicTrack);
    if (!trackCheck.ok) {
      return { ok: false, error: trackCheck.error };
    }

    const primarySubject =
      input.role === 'teacher' ? (input.primarySubject ?? '').trim() : undefined;
    if (input.role === 'teacher' && !primarySubject) {
      return { ok: false, error: 'Please enter a Primary Subject for the teacher account.' };
    }

    const store = loadStore(now);
    const normalizedEmail = input.email.trim().toLowerCase();
    const duplicate = store.profiles.some(
      (p) => p.pathway === pathway && p.email.toLowerCase() === normalizedEmail
    );
    if (duplicate) {
      return {
        ok: false,
        error: `An account with email ${normalizedEmail} already exists in ${getInternationalPanelName(pathway)}.`,
      };
    }

    const profile: InternationalUserProfile = {
      id: `INTL-USR-${pathway.toUpperCase()}-${input.role === 'teacher' ? 'T' : 'S'}${now % 100000}`,
      role: input.role,
      pathway,
      fullName: input.fullName.trim(),
      email: normalizedEmail,
      academicLevel: input.academicLevel,
      academicTrack: trackCheck.track,
      primarySubject,
      registrationType: 'admin_manual',
      status: 'active',
      passwordHash: hashPassword(input.temporaryPassword),
      joinedAt: now,
      updatedAt: now,
    };

    store.profiles.unshift(profile);
    appendActivity(
      store,
      pathway,
      'directory',
      `Manually provisioned active ${input.role === 'teacher' ? 'Teacher' : 'Student'} account for ${profile.fullName} (${getShortLevelLabel(profile.academicLevel)} • ${profile.academicTrack}).`,
      actorEmail,
      now
    );
    saveStore(store);

    return {
      ok: true,
      profile,
      credentialsSummary: {
        pathwayLabel: getInternationalPathwaySubTrack(pathway),
        roleLabel: input.role === 'teacher' ? 'Teacher' : 'Student',
        fullName: profile.fullName,
        email: profile.email,
        temporaryPassword: input.temporaryPassword,
        academicLevel: profile.academicLevel,
        academicTrack: profile.academicTrack,
        primarySubject: profile.primarySubject,
      },
    };
  },

  // --- NOTICES ---
  listNotices(
    pathway: InternationalPathway,
    filters: {
      audience?: 'all' | InternationalNoticeAudience;
      academicLevel?: 'all' | InternationalAcademicLevel;
      academicTrack?: 'all' | UpperAcademicTrack;
      query?: string;
    } = {},
    now = Date.now()
  ): InternationalNotice[] {
    const store = loadStore(now);
    const q = (filters.query ?? '').trim().toLowerCase();
    return store.notices
      .filter((n) => n.pathway === pathway)
      .filter((n) => {
        if (filters.audience && filters.audience !== 'all' && n.audience !== filters.audience) {
          return false;
        }
        if (
          filters.academicLevel &&
          filters.academicLevel !== 'all' &&
          n.academicLevel !== filters.academicLevel
        ) {
          return false;
        }
        if (
          filters.academicTrack &&
          filters.academicTrack !== 'all' &&
          n.academicTrack !== filters.academicTrack
        ) {
          return false;
        }
        if (q) {
          const hay = `${n.title} ${n.description} ${n.tag} ${n.audience} ${n.academicLevel} ${n.academicTrack}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => b.createdAt - a.createdAt);
  },

  createNotice(
    pathway: InternationalPathway,
    input: {
      title: string;
      description: string;
      audience: InternationalNoticeAudience;
      academicLevel: 'all' | InternationalAcademicLevel;
      academicTrack?: 'all' | UpperAcademicTrack;
      tag: InternationalNoticeTag;
    },
    actorEmail?: string,
    now = Date.now()
  ): { ok: true; notice: InternationalNotice } | { ok: false; error: string } {
    const title = input.title.trim();
    const description = input.description.trim();
    if (title.length < 3) {
      return { ok: false, error: 'Notice title must be at least 3 characters.' };
    }
    if (description.length < 10) {
      return { ok: false, error: 'Notice description must be at least 10 characters.' };
    }
    if (input.academicLevel !== 'all' && !isValidLevelForPathway(pathway, input.academicLevel)) {
      return { ok: false, error: 'Selected academic level does not match this pathway.' };
    }

    const resolvedTrack: 'all' | UpperAcademicTrack =
      input.academicLevel !== 'all' &&
      levelRequiresTrack(input.academicLevel) &&
      input.academicTrack &&
      input.academicTrack !== 'all' &&
      isValidUpperTrack(input.academicTrack)
        ? input.academicTrack
        : 'all';

    const store = loadStore(now);
    const notice: InternationalNotice = {
      id: `INTL-NTC-${pathway.toUpperCase()}-${now}-${Math.floor(Math.random() * 1000)}`,
      pathway,
      title,
      description,
      audience: input.audience,
      academicLevel: input.academicLevel,
      academicTrack: resolvedTrack,
      tag: input.tag,
      createdAt: now,
      updatedAt: now,
    };
    store.notices.unshift(notice);
    appendActivity(
      store,
      pathway,
      'notice',
      `Published ${notice.tag} notice: ${notice.title}.`,
      actorEmail,
      now
    );
    saveStore(store);
    return { ok: true, notice };
  },

  updateNotice(
    pathway: InternationalPathway,
    noticeId: string,
    patch: {
      title: string;
      description: string;
      audience: InternationalNoticeAudience;
      academicLevel: 'all' | InternationalAcademicLevel;
      academicTrack?: 'all' | UpperAcademicTrack;
      tag: InternationalNoticeTag;
    },
    actorEmail?: string,
    now = Date.now()
  ): { ok: true; notice: InternationalNotice } | { ok: false; error: string } {
    const store = loadStore(now);
    const idx = store.notices.findIndex((n) => n.id === noticeId && n.pathway === pathway);
    if (idx === -1) {
      return { ok: false, error: 'Notice not found in this pathway.' };
    }
    const title = patch.title.trim();
    const description = patch.description.trim();
    if (title.length < 3) {
      return { ok: false, error: 'Notice title must be at least 3 characters.' };
    }
    if (description.length < 10) {
      return { ok: false, error: 'Notice description must be at least 10 characters.' };
    }
    if (patch.academicLevel !== 'all' && !isValidLevelForPathway(pathway, patch.academicLevel)) {
      return { ok: false, error: 'Selected academic level does not match this pathway.' };
    }

    const resolvedTrack: 'all' | UpperAcademicTrack =
      patch.academicLevel !== 'all' &&
      levelRequiresTrack(patch.academicLevel) &&
      patch.academicTrack &&
      patch.academicTrack !== 'all' &&
      isValidUpperTrack(patch.academicTrack)
        ? patch.academicTrack
        : 'all';

    const updated: InternationalNotice = {
      ...store.notices[idx],
      title,
      description,
      audience: patch.audience,
      academicLevel: patch.academicLevel,
      academicTrack: resolvedTrack,
      tag: patch.tag,
      updatedAt: now,
    };
    store.notices[idx] = updated;
    appendActivity(
      store,
      pathway,
      'notice',
      `Updated notice: ${updated.title}.`,
      actorEmail,
      now
    );
    saveStore(store);
    return { ok: true, notice: updated };
  },

  deleteNotice(
    pathway: InternationalPathway,
    noticeId: string,
    actorEmail?: string,
    now = Date.now()
  ): { ok: true } | { ok: false; error: string } {
    const store = loadStore(now);
    const idx = store.notices.findIndex((n) => n.id === noticeId && n.pathway === pathway);
    if (idx === -1) {
      return { ok: false, error: 'Notice not found in this pathway.' };
    }
    const [removed] = store.notices.splice(idx, 1);
    appendActivity(
      store,
      pathway,
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
    pathway: InternationalPathway,
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
      pathway,
      'security',
      `Updated admin account password for ${db.users[idx].email}.`,
      db.users[idx].email,
      now
    );
    saveStore(store);
    return { ok: true };
  },

  recordSecurityActivity(
    pathway: InternationalPathway,
    summary: string,
    actorEmail?: string,
    now = Date.now()
  ): void {
    const store = loadStore(now);
    appendActivity(store, pathway, 'security', summary, actorEmail, now);
    saveStore(store);
  },
};
