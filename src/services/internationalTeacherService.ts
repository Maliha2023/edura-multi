import { loadDatabase, saveDatabase } from './storage';
import {
  ACADEMIC_TRACK_OPTIONS,
  getInternationalPathwaySubTrack,
  getLevelsForPathway,
  getShortLevelLabel,
  internationalAdminService,
  isValidLevelForPathway,
  LOWER_SECONDARY_LEVEL,
  normalizeAcademicTrack,
  resolveInternationalPathway,
  type InternationalAcademicLevel,
  type InternationalAcademicTrack,
  type InternationalCoupon,
  type InternationalNotice,
  type InternationalNoticeTag,
  type InternationalPathway,
  type InternationalPendingRegistration,
  type InternationalRegistrationType,
  type InternationalUserProfile,
  type UpperAcademicTrack,
} from './internationalAdminService';
import { getIntlSubjectsForStudent } from './internationalStudentService';
import type { AuthSession, UserAccount } from '../types/domain';
import { hashPassword, verifyPassword } from '../utils/crypto';
import { validateEmail, validateFullName, validatePassword } from '../utils/validation';

export {
  ACADEMIC_TRACK_OPTIONS,
  LOWER_SECONDARY_LEVEL,
  getInternationalPathwaySubTrack,
  getLevelsForPathway,
  getShortLevelLabel,
  isValidLevelForPathway,
  resolveInternationalPathway,
};

export type {
  InternationalAcademicLevel,
  InternationalAcademicTrack,
  InternationalNotice,
  InternationalNoticeTag,
  InternationalPathway,
  UpperAcademicTrack,
};

export const INTL_TEACHER_PRIMARY_SUBJECTS = [
  'Mathematics',
  'Physics',
  'Chemistry',
  'Biology',
  'Computer Science',
  'Accounting',
  'Economics',
  'Business Studies',
  'English Language',
  'English Literature',
  'Global Perspectives',
] as const;

export type IntlTeacherModuleType =
  | 'Lecture Notes'
  | 'Worksheet'
  | 'Past-Paper Set'
  | 'Revision Guide';

export const INTL_TEACHER_MODULE_TYPES: IntlTeacherModuleType[] = [
  'Lecture Notes',
  'Worksheet',
  'Past-Paper Set',
  'Revision Guide',
];

export type IntlAttendanceStatus = 'Present' | 'Late' | 'Absent';

export type IntlTeacherAnnouncementTag = 'Study Update' | 'Homework' | 'Exam Prep';

export const INTL_TEACHER_ANNOUNCEMENT_TAGS: IntlTeacherAnnouncementTag[] = [
  'Study Update',
  'Homework',
  'Exam Prep',
];

export interface IntlTeacherContext {
  userId: string;
  fullName: string;
  email: string;
  pathway: InternationalPathway;
  assignedLevels: InternationalAcademicLevel[];
  primarySubject: string;
  academicTrack: InternationalAcademicTrack;
  registrationType: InternationalRegistrationType;
  couponCode?: string;
  joinedAt: number;
}

export interface IntlDemoTeacherPreset {
  pathway: InternationalPathway;
  fullName: string;
  email: string;
  password: string;
  primarySubject: string;
  assignedLevels: InternationalAcademicLevel[];
  academicTrack: InternationalAcademicTrack;
}

export interface IntlTeacherCouponValidationResult {
  ok: boolean;
  coupon?: InternationalCoupon;
  message: string;
}

export interface IntlTeacherRegistrationInput {
  pathway: InternationalPathway;
  couponCode: string;
  fullName: string;
  email: string;
  password: string;
  assignedLevels: InternationalAcademicLevel[];
  primarySubject: string;
  academicTrack?: InternationalAcademicTrack;
}

export interface IntlTeacherModuleResource {
  id: string;
  pathway: InternationalPathway;
  academicLevel: InternationalAcademicLevel;
  academicTrack: InternationalAcademicTrack;
  subject: string;
  title: string;
  type: IntlTeacherModuleType;
  summary: string;
  published: boolean;
  teacherName: string;
  createdAt: number;
  updatedAt: number;
}

export interface IntlStudentAssessmentRecord {
  marks: number;
  attendanceRate: number;
  attendanceStatus: IntlAttendanceStatus;
  remarks: string;
  updatedAt: number;
}

export interface IntlTeacherRosterStudent {
  id: string;
  fullName: string;
  email: string;
  pathway: InternationalPathway;
  academicLevel: InternationalAcademicLevel;
  academicTrack: InternationalAcademicTrack;
  status: 'active' | 'suspended';
  completedLessonsCount: number;
  totalRecommendedLessons: number;
  marks: number;
  attendanceRate: number;
  attendanceStatus: IntlAttendanceStatus;
  remarks: string;
  updatedAt: number;
}

export interface IntlTeacherClassAnnouncement {
  id: string;
  pathway: InternationalPathway;
  academicLevel: InternationalAcademicLevel;
  academicTrack: InternationalAcademicTrack;
  subject: string;
  title: string;
  message: string;
  tag: IntlTeacherAnnouncementTag;
  teacherName: string;
  createdAt: number;
}

export interface IntlTeacherScheduleSession {
  id: string;
  timeLabel: string;
  academicLevel: InternationalAcademicLevel;
  academicTrack: InternationalAcademicTrack;
  subject: string;
  topic: string;
  roomLabel: string;
}

interface InternationalAdminStoreSnapshot {
  coupons: InternationalCoupon[];
  pending: InternationalPendingRegistration[];
  profiles: InternationalUserProfile[];
  notices: InternationalNotice[];
  activities: {
    id: string;
    pathway: InternationalPathway;
    category: 'coupon' | 'approval' | 'directory' | 'notice' | 'security';
    summary: string;
    actorEmail: string;
    createdAt: number;
  }[];
}

interface IntlTeacherWorkspaceStore {
  modules: IntlTeacherModuleResource[];
  announcements: IntlTeacherClassAnnouncement[];
  assessments: Record<string, IntlStudentAssessmentRecord>;
  assignedLevelsByKey: Record<string, InternationalAcademicLevel[]>;
}

const ADMIN_STORE_KEY = 'edura_international_admin_workspace_v2';
const STUDENT_PROGRESS_KEY = 'edura_intl_student_progress_v1';
const TEACHER_STORE_KEY = 'edura_intl_teacher_workspace_v1';
const FORTY_EIGHT_HOURS_MS = 48 * 60 * 60 * 1000;

let memoryTeacherStore: IntlTeacherWorkspaceStore | null = null;

function canUseLocalStorage(): boolean {
  try {
    return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
  } catch {
    return false;
  }
}

function readSharedIntlAdminStore(now = Date.now()): InternationalAdminStoreSnapshot {
  // Ensure the shared store is seeded via internationalAdminService before reading
  internationalAdminService.listCoupons('cambridge', {}, now);
  if (canUseLocalStorage()) {
    const raw = window.localStorage.getItem(ADMIN_STORE_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as InternationalAdminStoreSnapshot;
        if (
          parsed &&
          Array.isArray(parsed.coupons) &&
          Array.isArray(parsed.pending) &&
          Array.isArray(parsed.profiles) &&
          Array.isArray(parsed.notices) &&
          Array.isArray(parsed.activities)
        ) {
          return parsed;
        }
      } catch {
        // Fallback below
      }
    }
  }
  return {
    coupons: [
      ...internationalAdminService.listCoupons('cambridge', {}, now),
      ...internationalAdminService.listCoupons('edexcel', {}, now),
    ],
    pending: [
      ...internationalAdminService.listPending('cambridge', undefined, now),
      ...internationalAdminService.listPending('edexcel', undefined, now),
    ],
    profiles: [
      ...internationalAdminService.listDirectory('cambridge', {}, now),
      ...internationalAdminService.listDirectory('edexcel', {}, now),
    ],
    notices: [
      ...internationalAdminService.listNotices('cambridge', {}, now),
      ...internationalAdminService.listNotices('edexcel', {}, now),
    ],
    activities: [],
  };
}

function writeSharedIntlAdminStore(store: InternationalAdminStoreSnapshot): void {
  if (canUseLocalStorage()) {
    window.localStorage.setItem(ADMIN_STORE_KEY, JSON.stringify(store));
  }
}

function readStudentProgressMap(): Record<string, string[]> {
  if (!canUseLocalStorage()) return {};
  try {
    const raw = window.localStorage.getItem(STUDENT_PROGRESS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, string[]>;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function createInitialTeacherStore(now = Date.now()): IntlTeacherWorkspaceStore {
  const day = 24 * 60 * 60 * 1000;
  return {
    modules: [
      {
        id: 'INTL-MOD-CAM-1',
        pathway: 'cambridge',
        academicLevel: 'A Level / IAL (Grades 11–12)',
        academicTrack: 'Science',
        subject: 'Mathematics (9709)',
        title: 'Pure Math 1 (9709/12) — Differentiation & Stationary Points',
        type: 'Lecture Notes',
        summary:
          'Worked CAIE mark-scheme examples for chain rule, tangents, normals, and second-derivative turning point tests.',
        published: true,
        teacherName: 'Prof. Farzad Karim',
        createdAt: now - 3 * day,
        updatedAt: now - 2 * day,
      },
      {
        id: 'INTL-MOD-CAM-2',
        pathway: 'cambridge',
        academicLevel: 'O Level / IGCSE (Grades 9–10)',
        academicTrack: 'Science',
        subject: 'Mathematics (0580)',
        title: 'IGCSE Paper 4 Extended — Past-Paper Trigonometry & Vectors Drill',
        type: 'Past-Paper Set',
        summary:
          'Curated 2021–2024 May/June variant 22 questions on Sine/Cosine Rule, 3D bearings, and vector geometry.',
        published: true,
        teacherName: 'Prof. Farzad Karim',
        createdAt: now - 2 * day,
        updatedAt: now - day,
      },
      {
        id: 'INTL-MOD-CAM-3',
        pathway: 'cambridge',
        academicLevel: 'A Level / IAL (Grades 11–12)',
        academicTrack: 'Science',
        subject: 'Mathematics (9709)',
        title: 'Probability & Statistics 1 (9709/52) — Normal Distribution Z-Table Pack',
        type: 'Revision Guide',
        summary:
          'Step-by-step continuity correction checklist and binomial-to-normal approximation practice problems.',
        published: false,
        teacherName: 'Prof. Farzad Karim',
        createdAt: now - day,
        updatedAt: now - 12 * 60 * 60 * 1000,
      },
      {
        id: 'INTL-MOD-EDX-1',
        pathway: 'edexcel',
        academicLevel: 'IAL (Grades 11–12)',
        academicTrack: 'Science',
        subject: 'Physics (WPH11)',
        title: 'IAL Unit 1 (WPH11) — Mechanics, Projectiles & Young Modulus Pack',
        type: 'Lecture Notes',
        summary:
          'Pearson Edexcel command-word guidance covering 2D projectile vectors, moments, and stress-strain graphs.',
        published: true,
        teacherName: 'Dr. Mahbub Alam',
        createdAt: now - 4 * day,
        updatedAt: now - 2 * day,
      },
      {
        id: 'INTL-MOD-EDX-2',
        pathway: 'edexcel',
        academicLevel: 'International GCSE (Grades 9–10)',
        academicTrack: 'Science',
        subject: 'Physics (4PH1)',
        title: 'Int. GCSE Paper 1P & 2P — Electric Circuits & Wave Optics Worksheet',
        type: 'Worksheet',
        summary:
          'Structured calculation set on Ohm’s Law, I–V graphs, Snell’s Law refraction, and total internal reflection.',
        published: true,
        teacherName: 'Dr. Mahbub Alam',
        createdAt: now - 2 * day,
        updatedAt: now - day,
      },
      {
        id: 'INTL-MOD-EDX-3',
        pathway: 'edexcel',
        academicLevel: 'IAL (Grades 11–12)',
        academicTrack: 'Science',
        subject: 'Physics (WPH11)',
        title: 'Unit 3 Practical Skills (WPH13) — Uncertainty & Percentage Error Guide',
        type: 'Past-Paper Set',
        summary:
          'Annotated examiner mark schemes for experimental uncertainty propagation and gradient error-bar plots.',
        published: false,
        teacherName: 'Dr. Mahbub Alam',
        createdAt: now - day,
        updatedAt: now - 8 * 60 * 60 * 1000,
      },
    ],
    announcements: [
      {
        id: 'INTL-ANN-CAM-1',
        pathway: 'cambridge',
        academicLevel: 'A Level / IAL (Grades 11–12)',
        academicTrack: 'Science',
        subject: 'Mathematics (9709)',
        title: 'Paper 1 (9709/12) Timed Mock Script Submission',
        message:
          'Please bring your worked May/June 2023 Paper 12 scripts to Thursday’s seminar. We will review M1/A1 method-mark deductions together.',
        tag: 'Exam Prep',
        teacherName: 'Prof. Farzad Karim',
        createdAt: now - 20 * 60 * 60 * 1000,
      },
      {
        id: 'INTL-ANN-CAM-2',
        pathway: 'cambridge',
        academicLevel: 'O Level / IGCSE (Grades 9–10)',
        academicTrack: 'Science',
        subject: 'Mathematics (0580)',
        title: 'Trigonometry & Bearings Practice Sheet Posted',
        message:
          'Complete Questions 1–8 from the new IGCSE Paper 4 Past-Paper Set before Sunday. Show full 3-significant-figure working.',
        tag: 'Homework',
        teacherName: 'Prof. Farzad Karim',
        createdAt: now - 3 * day,
      },
      {
        id: 'INTL-ANN-EDX-1',
        pathway: 'edexcel',
        academicLevel: 'IAL (Grades 11–12)',
        academicTrack: 'Science',
        subject: 'Physics (WPH11)',
        title: 'Unit 1 (WPH11) Kinematics & Materials Lab Check-in',
        message:
          'Upload your Young Modulus wire-extension data tables before Wednesday’s practical workshop. Include micrometer uncertainty readings.',
        tag: 'Homework',
        teacherName: 'Dr. Mahbub Alam',
        createdAt: now - 18 * 60 * 60 * 1000,
      },
      {
        id: 'INTL-ANN-EDX-2',
        pathway: 'edexcel',
        academicLevel: 'International GCSE (Grades 9–10)',
        academicTrack: 'Science',
        subject: 'Physics (4PH1)',
        title: 'Paper 1P Formula Sheet & Command Words Briefing',
        message:
          'Review the difference between "Explain", "Deduce", and "Calculate" in Pearson Edexcel Physics mark schemes ahead of next week’s quiz.',
        tag: 'Study Update',
        teacherName: 'Dr. Mahbub Alam',
        createdAt: now - 2 * day,
      },
    ],
    assessments: {
      'cambridge:INTL-STU-CAM-01': {
        marks: 91,
        attendanceRate: 96,
        attendanceStatus: 'Present',
        remarks: 'Consistent A* working in IGCSE Paper 4 algebra and structured physics problems.',
        updatedAt: now - day,
      },
      'cambridge:INTL-STU-CAM-02': {
        marks: 86,
        attendanceRate: 92,
        attendanceStatus: 'Present',
        remarks: 'Strong Pure Math 1 calculus setup; double-check boundary limits on integration.',
        updatedAt: now - 2 * day,
      },
      'cambridge:INTL-STU-CAM-03': {
        marks: 84,
        attendanceRate: 95,
        attendanceStatus: 'Present',
        remarks: 'Active participation in Checkpoint problem-solving labs.',
        updatedAt: now - 2 * day,
      },
      'cambridge:INTL-STU-CAM-04': {
        marks: 72,
        attendanceRate: 78,
        attendanceStatus: 'Late',
        remarks: 'Needs revision on structured exam timing and completing homework sets.',
        updatedAt: now - 4 * day,
      },
      'edexcel:INTL-STU-EDX-01': {
        marks: 89,
        attendanceRate: 94,
        attendanceStatus: 'Present',
        remarks: 'Clear WPH11 vector resolution and thorough uncertainty calculations.',
        updatedAt: now - day,
      },
      'edexcel:INTL-STU-EDX-02': {
        marks: 87,
        attendanceRate: 95,
        attendanceStatus: 'Present',
        remarks: 'Well-structured International GCSE case evaluation and data interpretation.',
        updatedAt: now - 2 * day,
      },
      'edexcel:INTL-STU-EDX-03': {
        marks: 83,
        attendanceRate: 91,
        attendanceStatus: 'Present',
        remarks: 'Steady iLowerSecondary progress in investigative science.',
        updatedAt: now - 3 * day,
      },
      'edexcel:INTL-STU-EDX-04': {
        marks: 70,
        attendanceRate: 76,
        attendanceStatus: 'Absent',
        remarks: 'Missed practical lab session; follow up on circuit worksheet submission.',
        updatedAt: now - 5 * day,
      },
    },
    assignedLevelsByKey: {
      'cambridge:farzad.karim@cambridge-faculty.edu.bd': [
        'O Level / IGCSE (Grades 9–10)',
        'A Level / IAL (Grades 11–12)',
      ],
      'edexcel:mahbub.alam@edexcel-faculty.edu.bd': [
        'International GCSE (Grades 9–10)',
        'IAL (Grades 11–12)',
      ],
    },
  };
}

function loadTeacherStore(now = Date.now()): IntlTeacherWorkspaceStore {
  if (canUseLocalStorage()) {
    const raw = window.localStorage.getItem(TEACHER_STORE_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as IntlTeacherWorkspaceStore;
        if (
          parsed &&
          Array.isArray(parsed.modules) &&
          Array.isArray(parsed.announcements) &&
          parsed.assessments &&
          typeof parsed.assessments === 'object'
        ) {
          return {
            modules: parsed.modules,
            announcements: parsed.announcements,
            assessments: parsed.assessments,
            assignedLevelsByKey: parsed.assignedLevelsByKey ?? {},
          };
        }
      } catch {
        // Reset cleanly if corrupted
      }
    }
    const seeded = createInitialTeacherStore(now);
    window.localStorage.setItem(TEACHER_STORE_KEY, JSON.stringify(seeded));
    return seeded;
  }

  if (!memoryTeacherStore) {
    memoryTeacherStore = createInitialTeacherStore(now);
  }
  return memoryTeacherStore;
}

function saveTeacherStore(store: IntlTeacherWorkspaceStore): void {
  if (canUseLocalStorage()) {
    window.localStorage.setItem(TEACHER_STORE_KEY, JSON.stringify(store));
  } else {
    memoryTeacherStore = store;
  }
}

export function getIntlTeacherPathwayLabel(pathway: InternationalPathway): 'Cambridge' | 'Edexcel' {
  return pathway === 'cambridge' ? 'Cambridge' : 'Edexcel';
}

export function getIntlTeacherBoardName(pathway: InternationalPathway): string {
  return pathway === 'cambridge'
    ? 'Cambridge Assessment International Education (CAIE)'
    : 'Pearson Edexcel International';
}

export function formatIntlTeacherContextBadge(
  pathway: InternationalPathway,
  primarySubject: string
): string {
  return `${getIntlTeacherPathwayLabel(pathway)} • ${primarySubject}`;
}

export function hasUpperAcademicLevel(levels: InternationalAcademicLevel[]): boolean {
  return levels.some((level) => level !== LOWER_SECONDARY_LEVEL);
}

function resolveTrackValue(
  level: InternationalAcademicLevel,
  track?: InternationalAcademicTrack
): InternationalAcademicTrack {
  const res = normalizeAcademicTrack(level, track);
  if (res.ok) return res.track;
  return level === LOWER_SECONDARY_LEVEL ? 'General' : 'Science';
}

export function formatAssignedLevelsSummary(levels: InternationalAcademicLevel[]): string {
  if (!levels.length) return 'Not Assigned';
  return levels.map((lvl) => getShortLevelLabel(lvl)).join(', ');
}

export function getDemoIntlTeacherPreset(pathway: InternationalPathway): IntlDemoTeacherPreset {
  if (pathway === 'cambridge') {
    return {
      pathway: 'cambridge',
      fullName: 'Prof. Farzad Karim',
      email: 'farzad.karim@cambridge-faculty.edu.bd',
      password: 'Teacher@1234',
      primarySubject: 'Mathematics (9709)',
      assignedLevels: [
        'O Level / IGCSE (Grades 9–10)',
        'A Level / IAL (Grades 11–12)',
      ],
      academicTrack: 'Science',
    };
  }
  return {
    pathway: 'edexcel',
    fullName: 'Dr. Mahbub Alam',
    email: 'mahbub.alam@edexcel-faculty.edu.bd',
    password: 'Teacher@1234',
    primarySubject: 'Physics (WPH11)',
    assignedLevels: ['International GCSE (Grades 9–10)', 'IAL (Grades 11–12)'],
    academicTrack: 'Science',
  };
}

export function getDemoIntlTeacherCouponHint(
  pathway: InternationalPathway,
  now = Date.now()
): string {
  const store = readSharedIntlAdminStore(now);
  const active = store.coupons.find(
    (c) =>
      c.pathway === pathway &&
      c.role === 'teacher' &&
      c.status === 'active' &&
      c.expiresAt > now
  );
  if (active) return active.code;
  return pathway === 'cambridge' ? 'T-61204' : 'T-82419';
}

function deterministicSeedAssessment(student: InternationalUserProfile, now: number): IntlStudentAssessmentRecord {
  let hash = 0;
  for (let i = 0; i < student.id.length; i += 1) {
    hash = (hash * 31 + student.id.charCodeAt(i)) % 1000;
  }
  const marks = 76 + (hash % 20);
  const attendanceRate = 84 + (hash % 15);
  return {
    marks,
    attendanceRate,
    attendanceStatus: student.status === 'active' ? 'Present' : 'Late',
    remarks: 'Steady engagement across syllabus topics.',
    updatedAt: now - 24 * 60 * 60 * 1000,
  };
}

export const internationalTeacherService = {
  validateCoupon(
    rawCode: string,
    pathway: InternationalPathway,
    now = Date.now()
  ): IntlTeacherCouponValidationResult {
    const normalized = rawCode.trim().toUpperCase();
    if (!normalized) {
      return {
        ok: false,
        message: 'Please enter your teacher coupon code (e.g. T-61204).',
      };
    }

    if (/^S-\d{5}$/.test(normalized)) {
      return {
        ok: false,
        message:
          'This is a Student coupon code (S-XXXXX). Teachers must use a T-XXXXX teacher invite coupon.',
      };
    }

    if (!/^T-\d{5}$/.test(normalized)) {
      return {
        ok: false,
        message:
          'Invalid coupon format. Teacher coupons must start with T- followed by 5 digits (e.g. T-61204).',
      };
    }

    const store = readSharedIntlAdminStore(now);
    const coupon = store.coupons.find((c) => c.code.toUpperCase() === normalized);
    if (!coupon) {
      return {
        ok: false,
        message:
          'Coupon code not found. Please verify the T-XXXXX code issued by your Cambridge or Edexcel Admin.',
      };
    }

    if (coupon.role !== 'teacher') {
      return {
        ok: false,
        message:
          'This coupon is not assigned to the Teacher role. Please enter a T-XXXXX teacher coupon.',
      };
    }

    if (coupon.pathway !== pathway) {
      const couponPathwayLabel = getIntlTeacherPathwayLabel(coupon.pathway);
      const currentPathwayLabel = getIntlTeacherPathwayLabel(pathway);
      return {
        ok: false,
        message: `This coupon belongs to the ${couponPathwayLabel} pathway and cannot be redeemed under ${currentPathwayLabel}.`,
      };
    }

    if (coupon.status === 'used') {
      return {
        ok: false,
        message:
          'This teacher coupon has already been used. Please request a fresh T-XXXXX invite from your Admin.',
      };
    }

    if (coupon.status === 'expired' || coupon.expiresAt <= now) {
      return {
        ok: false,
        message:
          'This teacher coupon has expired (48-hour validity window). Please request a new coupon from your Admin.',
      };
    }

    return {
      ok: true,
      coupon,
      message: `${getIntlTeacherPathwayLabel(pathway)} teacher coupon verified.`,
    };
  },

  submitCouponRegistration(
    input: IntlTeacherRegistrationInput,
    now = Date.now()
  ): { ok: true; registration: InternationalPendingRegistration } | { ok: false; error: string } {
    const couponCheck = this.validateCoupon(input.couponCode, input.pathway, now);
    if (!couponCheck.ok || !couponCheck.coupon) {
      return { ok: false, error: couponCheck.message };
    }

    const nameRes = validateFullName(input.fullName);
    if (!nameRes.valid) {
      return { ok: false, error: 'Please enter your full name (at least 2 characters).' };
    }

    const emailRes = validateEmail(input.email);
    if (!emailRes.valid) {
      return { ok: false, error: 'Please enter a valid faculty email address.' };
    }

    const passwordRes = validatePassword(input.password);
    if (!passwordRes.valid) {
      return { ok: false, error: 'Password must be at least 8 characters long.' };
    }

    const uniqueLevels = Array.from(new Set(input.assignedLevels)).filter((lvl) =>
      isValidLevelForPathway(input.pathway, lvl)
    );
    if (uniqueLevels.length === 0) {
      return {
        ok: false,
        error: `Please select at least one assigned academic level for ${getIntlTeacherPathwayLabel(input.pathway)}.`,
      };
    }

    const cleanSubject = input.primarySubject.trim();
    if (cleanSubject.length < 2) {
      return { ok: false, error: 'Please select or enter your primary teaching subject.' };
    }

    const needsUpperTrack = hasUpperAcademicLevel(uniqueLevels);
    let resolvedTrack: InternationalAcademicTrack = 'General';
    if (needsUpperTrack) {
      if (
        !input.academicTrack ||
        !ACADEMIC_TRACK_OPTIONS.includes(input.academicTrack as UpperAcademicTrack)
      ) {
        return {
          ok: false,
          error:
            'Please select an Academic Track (Science, Business, Humanities, or Mixed / Custom) for upper secondary / A Level classes.',
        };
      }
      resolvedTrack = input.academicTrack;
    }

    const cleanEmail = input.email.trim().toLowerCase();
    const store = readSharedIntlAdminStore(now);

    const emailExists =
      store.profiles.some(
        (p) => p.pathway === input.pathway && p.email.toLowerCase() === cleanEmail
      ) ||
      store.pending.some(
        (p) => p.pathway === input.pathway && p.email.toLowerCase() === cleanEmail
      );

    if (emailExists) {
      return {
        ok: false,
        error: 'An account or pending faculty registration with this email already exists in this pathway.',
      };
    }

    // Order assigned levels cleanly by pathway hierarchy and pick highest as primary Admin queue level
    const pathwayOrder = getLevelsForPathway(input.pathway);
    const orderedLevels = pathwayOrder.filter((lvl) => uniqueLevels.includes(lvl));
    const primaryLevel = orderedLevels[orderedLevels.length - 1];

    const registration: InternationalPendingRegistration = {
      id: `INTL-PND-TCH-${Math.floor(10000 + Math.random() * 90000)}`,
      role: 'teacher',
      pathway: input.pathway,
      fullName: input.fullName.trim(),
      email: cleanEmail,
      academicLevel: primaryLevel,
      academicTrack: resolveTrackValue(primaryLevel, resolvedTrack),
      primarySubject: cleanSubject,
      couponCode: couponCheck.coupon.code,
      submittedAt: now,
      expiresAt: now + FORTY_EIGHT_HOURS_MS,
    };

    const nextCoupons = store.coupons.map((c) =>
      c.id === couponCheck.coupon!.id
        ? { ...c, status: 'used' as const, usedAt: now }
        : c
    );

    const nextStore: InternationalAdminStoreSnapshot = {
      ...store,
      coupons: nextCoupons,
      pending: [registration, ...store.pending],
      activities: [
        {
          id: `INTL-ACT-${now}-${Math.floor(Math.random() * 1000)}`,
          pathway: input.pathway,
          category: 'approval' as const,
          summary: `Teacher ${registration.fullName} (${cleanSubject} · ${formatAssignedLevelsSummary(orderedLevels)}) submitted coupon ${registration.couponCode} for approval`,
          actorEmail: cleanEmail,
          createdAt: now,
        },
        ...store.activities,
      ].slice(0, 40),
    };
    writeSharedIntlAdminStore(nextStore);

    // Save multi-level assignment so it persists after admin approval
    const teacherStore = loadTeacherStore(now);
    teacherStore.assignedLevelsByKey[`${input.pathway}:${cleanEmail}`] = orderedLevels;
    saveTeacherStore(teacherStore);

    return { ok: true, registration };
  },

  prepareIntlTeacherAccountForLogin(
    emailInput: string,
    rawPassword: string,
    pathway: InternationalPathway,
    now = Date.now()
  ): void {
    const cleanEmail = emailInput.trim().toLowerCase();
    if (!cleanEmail || !rawPassword) return;

    const demoPreset = getDemoIntlTeacherPreset(pathway);
    const adminStore = readSharedIntlAdminStore(now);
    const profile = adminStore.profiles.find(
      (p) =>
        p.pathway === pathway &&
        p.role === 'teacher' &&
        p.email.toLowerCase() === cleanEmail
    );

    const isDemoMatch =
      cleanEmail === demoPreset.email.toLowerCase() && rawPassword === demoPreset.password;

    if (!profile && !isDemoMatch) return;
    if (profile && profile.status === 'suspended') return;

    const passwordMatchesProfile =
      profile &&
      (verifyPassword(rawPassword, profile.passwordHash) || isDemoMatch);

    if (!passwordMatchesProfile && !isDemoMatch) return;

    const db = loadDatabase();
    const existing = db.users.find((u) => u.email.toLowerCase() === cleanEmail);
    const subTrack = getInternationalPathwaySubTrack(pathway);

    if (existing) {
      if (existing.role === 'teacher') {
        existing.mustChangePassword = false;
        existing.educationStream = 'International Curriculum (English Medium)';
        existing.pathway = subTrack;
        if (profile) {
          existing.fullName = profile.fullName;
          existing.passwordHash = isDemoMatch ? hashPassword(rawPassword) : profile.passwordHash;
        }
        delete db.loginLocks[cleanEmail];
        saveDatabase(db);
      }
      return;
    }

    const syncedUser: UserAccount = {
      id: profile?.id ?? `intl-tch-${pathway}-${Date.now()}`,
      role: 'teacher',
      fullName: profile?.fullName ?? demoPreset.fullName,
      email: cleanEmail,
      phone: pathway === 'cambridge' ? '+8801711005101' : '+8801711005201',
      passwordHash: isDemoMatch
        ? hashPassword(rawPassword)
        : profile?.passwordHash ?? hashPassword(rawPassword),
      mustChangePassword: false,
      preferredLanguage: 'en',
      educationStream: 'International Curriculum (English Medium)',
      pathway: subTrack,
      createdAt: profile?.joinedAt ?? now,
    };

    db.users.push(syncedUser);
    saveDatabase(db);
  },

  resolveIntlTeacherContext(
    session: AuthSession | null,
    now = Date.now()
  ): IntlTeacherContext | null {
    if (!session || session.role !== 'teacher') return null;

    const cleanEmail = session.email.trim().toLowerCase();
    const adminStore = readSharedIntlAdminStore(now);
    const teacherStore = loadTeacherStore(now);

    let pathway = resolveInternationalPathway(session.selectedPathway);
    if (!pathway) {
      const matched = adminStore.profiles.find(
        (p) => p.role === 'teacher' && p.email.toLowerCase() === cleanEmail
      );
      pathway = matched?.pathway ?? null;
    }
    if (!pathway) return null;

    const profile = adminStore.profiles.find(
      (p) =>
        p.pathway === pathway &&
        p.role === 'teacher' &&
        p.email.toLowerCase() === cleanEmail
    );

    const demoPreset = getDemoIntlTeacherPreset(pathway);
    const storedLevels = teacherStore.assignedLevelsByKey[`${pathway}:${cleanEmail}`];
    const assignedLevels: InternationalAcademicLevel[] =
      storedLevels && storedLevels.length > 0
        ? storedLevels
        : cleanEmail === demoPreset.email.toLowerCase()
          ? demoPreset.assignedLevels
          : profile
            ? [profile.academicLevel]
            : demoPreset.assignedLevels;

    return {
      userId: session.userId,
      fullName: profile?.fullName ?? session.fullName,
      email: cleanEmail,
      pathway,
      assignedLevels,
      primarySubject: profile?.primarySubject ?? demoPreset.primarySubject,
      academicTrack: profile?.academicTrack ?? demoPreset.academicTrack,
      registrationType: profile?.registrationType ?? 'admin_manual',
      couponCode: profile?.couponCode,
      joinedAt: profile?.joinedAt ?? session.loggedInAt,
    };
  },

  listModules(pathway: InternationalPathway, now = Date.now()): IntlTeacherModuleResource[] {
    const store = loadTeacherStore(now);
    return store.modules
      .filter((m) => m.pathway === pathway)
      .sort((a, b) => b.updatedAt - a.updatedAt);
  },

  createModuleResource(
    input: {
      pathway: InternationalPathway;
      academicLevel: InternationalAcademicLevel;
      academicTrack?: InternationalAcademicTrack;
      subject: string;
      title: string;
      type: IntlTeacherModuleType;
      summary: string;
      published: boolean;
      teacherName: string;
    },
    now = Date.now()
  ): { ok: true; module: IntlTeacherModuleResource } | { ok: false; error: string } {
    if (!isValidLevelForPathway(input.pathway, input.academicLevel)) {
      return { ok: false, error: 'Selected academic level does not match your curriculum pathway.' };
    }
    const cleanTitle = input.title.trim();
    if (cleanTitle.length < 3) {
      return { ok: false, error: 'Please enter a module title (at least 3 characters).' };
    }
    const cleanSummary = input.summary.trim();
    if (cleanSummary.length < 8) {
      return {
        ok: false,
        error: 'Please enter a brief module description (at least 8 characters).',
      };
    }

    const track = resolveTrackValue(input.academicLevel, input.academicTrack);
    const created: IntlTeacherModuleResource = {
      id: `INTL-MOD-${input.pathway.toUpperCase()}-${now}-${Math.floor(Math.random() * 900 + 100)}`,
      pathway: input.pathway,
      academicLevel: input.academicLevel,
      academicTrack: track,
      subject: input.subject.trim() || 'General Studies',
      title: cleanTitle,
      type: input.type,
      summary: cleanSummary,
      published: input.published,
      teacherName: input.teacherName,
      createdAt: now,
      updatedAt: now,
    };

    const store = loadTeacherStore(now);
    store.modules = [created, ...store.modules];
    saveTeacherStore(store);

    return { ok: true, module: created };
  },

  toggleModulePublished(
    pathway: InternationalPathway,
    moduleId: string,
    now = Date.now()
  ): { ok: true; published: boolean } | { ok: false; error: string } {
    const store = loadTeacherStore(now);
    const target = store.modules.find((m) => m.id === moduleId && m.pathway === pathway);
    if (!target) {
      return { ok: false, error: 'Module not found in this pathway.' };
    }
    target.published = !target.published;
    target.updatedAt = now;
    saveTeacherStore(store);
    return { ok: true, published: target.published };
  },

  deleteModuleResource(
    pathway: InternationalPathway,
    moduleId: string,
    now = Date.now()
  ): boolean {
    const store = loadTeacherStore(now);
    const before = store.modules.length;
    store.modules = store.modules.filter((m) => !(m.id === moduleId && m.pathway === pathway));
    if (store.modules.length === before) return false;
    saveTeacherStore(store);
    return true;
  },

  listPathwayStudentRoster(
    pathway: InternationalPathway,
    now = Date.now()
  ): IntlTeacherRosterStudent[] {
    const adminStore = readSharedIntlAdminStore(now);
    const teacherStore = loadTeacherStore(now);
    const progressMap = readStudentProgressMap();

    const students = adminStore.profiles.filter(
      (p) => p.pathway === pathway && p.role === 'student'
    );

    return students
      .map((student) => {
        const subjects = getIntlSubjectsForStudent(
          pathway,
          student.academicLevel,
          student.academicTrack
        );
        const totalRecommendedLessons = subjects.reduce((acc, s) => acc + s.lessons.length, 0);
        const progressKey = `${pathway}:${student.email.toLowerCase()}`;
        const completedIds = progressMap[progressKey] ?? [];
        const validLessonIds = new Set(subjects.flatMap((s) => s.lessons.map((l) => l.id)));
        const trackedCount = completedIds.filter((id) => validLessonIds.has(id)).length;
        const seededBaseline =
          trackedCount > 0
            ? trackedCount
            : Math.min(totalRecommendedLessons, student.status === 'active' ? 5 : 2);

        const assessmentKey = `${pathway}:${student.id}`;
        const assessment =
          teacherStore.assessments[assessmentKey] ?? deterministicSeedAssessment(student, now);

        return {
          id: student.id,
          fullName: student.fullName,
          email: student.email,
          pathway: student.pathway,
          academicLevel: student.academicLevel,
          academicTrack: student.academicTrack,
          status: student.status,
          completedLessonsCount: seededBaseline,
          totalRecommendedLessons: Math.max(1, totalRecommendedLessons),
          marks: assessment.marks,
          attendanceRate: assessment.attendanceRate,
          attendanceStatus: assessment.attendanceStatus,
          remarks: assessment.remarks,
          updatedAt: assessment.updatedAt,
        };
      })
      .sort((a, b) => a.fullName.localeCompare(b.fullName));
  },

  updateStudentAssessment(
    pathway: InternationalPathway,
    studentId: string,
    patch: {
      marks: number;
      attendanceRate: number;
      attendanceStatus: IntlAttendanceStatus;
      remarks: string;
    },
    now = Date.now()
  ): { ok: true } | { ok: false; error: string } {
    if (!Number.isFinite(patch.marks) || patch.marks < 0 || patch.marks > 100) {
      return { ok: false, error: 'Marks must be a valid number between 0 and 100.' };
    }
    if (
      !Number.isFinite(patch.attendanceRate) ||
      patch.attendanceRate < 0 ||
      patch.attendanceRate > 100
    ) {
      return { ok: false, error: 'Attendance percentage must be between 0 and 100.' };
    }

    const adminStore = readSharedIntlAdminStore(now);
    const exists = adminStore.profiles.some(
      (p) => p.id === studentId && p.pathway === pathway && p.role === 'student'
    );
    if (!exists) {
      return { ok: false, error: 'Student was not found in your active curriculum pathway.' };
    }

    const teacherStore = loadTeacherStore(now);
    teacherStore.assessments[`${pathway}:${studentId}`] = {
      marks: Math.round(patch.marks),
      attendanceRate: Math.round(patch.attendanceRate),
      attendanceStatus: patch.attendanceStatus,
      remarks: patch.remarks.trim(),
      updatedAt: now,
    };
    saveTeacherStore(teacherStore);

    return { ok: true };
  },

  listOfficialAdminNotices(
    pathway: InternationalPathway,
    now = Date.now()
  ): InternationalNotice[] {
    const adminStore = readSharedIntlAdminStore(now);
    return adminStore.notices
      .filter((n) => n.pathway === pathway && (n.audience === 'teacher' || n.audience === 'both'))
      .sort((a, b) => b.updatedAt - a.updatedAt);
  },

  listClassAnnouncements(
    pathway: InternationalPathway,
    now = Date.now()
  ): IntlTeacherClassAnnouncement[] {
    const store = loadTeacherStore(now);
    return store.announcements
      .filter((a) => a.pathway === pathway)
      .sort((a, b) => b.createdAt - a.createdAt);
  },

  postClassAnnouncement(
    input: {
      pathway: InternationalPathway;
      academicLevel: InternationalAcademicLevel;
      academicTrack?: InternationalAcademicTrack;
      subject: string;
      title: string;
      message: string;
      tag: IntlTeacherAnnouncementTag;
      teacherName: string;
    },
    now = Date.now()
  ): { ok: true; announcement: IntlTeacherClassAnnouncement } | { ok: false; error: string } {
    if (!isValidLevelForPathway(input.pathway, input.academicLevel)) {
      return { ok: false, error: 'Selected academic level does not match your pathway.' };
    }
    const cleanTitle = input.title.trim();
    if (cleanTitle.length < 3) {
      return { ok: false, error: 'Please enter an announcement title (at least 3 characters).' };
    }
    const cleanMessage = input.message.trim();
    if (cleanMessage.length < 10) {
      return {
        ok: false,
        error: 'Please enter a clear announcement message (at least 10 characters).',
      };
    }

    const created: IntlTeacherClassAnnouncement = {
      id: `INTL-ANN-${input.pathway.toUpperCase()}-${now}-${Math.floor(Math.random() * 900 + 100)}`,
      pathway: input.pathway,
      academicLevel: input.academicLevel,
      academicTrack: resolveTrackValue(input.academicLevel, input.academicTrack),
      subject: input.subject.trim() || 'General Studies',
      title: cleanTitle,
      message: cleanMessage,
      tag: input.tag,
      teacherName: input.teacherName,
      createdAt: now,
    };

    const store = loadTeacherStore(now);
    store.announcements = [created, ...store.announcements];
    saveTeacherStore(store);

    return { ok: true, announcement: created };
  },

  deleteClassAnnouncement(
    pathway: InternationalPathway,
    announcementId: string,
    now = Date.now()
  ): boolean {
    const store = loadTeacherStore(now);
    const before = store.announcements.length;
    store.announcements = store.announcements.filter(
      (a) => !(a.id === announcementId && a.pathway === pathway)
    );
    if (store.announcements.length === before) return false;
    saveTeacherStore(store);
    return true;
  },

  getTodaySchedule(teacher: IntlTeacherContext): IntlTeacherScheduleSession[] {
    const levels =
      teacher.assignedLevels.length > 0
        ? teacher.assignedLevels
        : getLevelsForPathway(teacher.pathway).slice(1);
    const firstLevel = levels[0];
    const secondLevel = levels[1] ?? levels[0];
    const boardShort = teacher.pathway === 'cambridge' ? 'CAIE' : 'Pearson Edexcel';

    return [
      {
        id: 'intl-sess-1',
        timeLabel: '09:00 – 09:50',
        academicLevel: firstLevel,
        academicTrack: resolveTrackValue(firstLevel, teacher.academicTrack),
        subject: teacher.primarySubject,
        topic:
          teacher.pathway === 'cambridge'
            ? `${getShortLevelLabel(firstLevel)} Core Concept Lecture & Structured Exam Technique`
            : `${getShortLevelLabel(firstLevel)} Unit Specification Walkthrough & Command Words`,
        roomLabel: `${boardShort} Room 302`,
      },
      {
        id: 'intl-sess-2',
        timeLabel: '11:15 – 12:05',
        academicLevel: secondLevel,
        academicTrack: resolveTrackValue(secondLevel, teacher.academicTrack),
        subject: teacher.primarySubject,
        topic:
          teacher.pathway === 'cambridge'
            ? 'Past-Paper Timed Drill & CAIE Mark-Scheme Review'
            : 'Modular Past-Paper Structured Questions & Marking Rubric',
        roomLabel: `${boardShort} Lab 104`,
      },
      {
        id: 'intl-sess-3',
        timeLabel: '14:00 – 14:45',
        academicLevel: firstLevel,
        academicTrack: resolveTrackValue(firstLevel, teacher.academicTrack),
        subject: teacher.primarySubject,
        topic: 'Small-Group Office Hours & Candidate Assessment Feedback',
        roomLabel: 'Faculty Seminar Hall B',
      },
    ];
  },

  updateTeacherPassword(
    userId: string,
    email: string,
    pathway: InternationalPathway,
    currentPassword: string,
    newPassword: string,
    confirmPassword: string,
    now = Date.now()
  ): { ok: true } | { ok: false; error: string } {
    if (!currentPassword.trim()) {
      return { ok: false, error: 'Please enter your current password.' };
    }
    const pwdCheck = validatePassword(newPassword);
    if (!pwdCheck.valid) {
      return { ok: false, error: 'New password must be at least 8 characters long.' };
    }
    if (newPassword !== confirmPassword) {
      return { ok: false, error: 'New password and confirmation do not match.' };
    }

    const cleanEmail = email.trim().toLowerCase();
    const db = loadDatabase();
    const user = db.users.find(
      (u) => u.id === userId || u.email.toLowerCase() === cleanEmail
    );
    if (!user) {
      return { ok: false, error: 'Unable to locate your faculty account.' };
    }

    if (!verifyPassword(currentPassword, user.passwordHash)) {
      return { ok: false, error: 'Current password is incorrect.' };
    }

    const nextHash = hashPassword(newPassword);
    user.passwordHash = nextHash;
    user.mustChangePassword = false;
    saveDatabase(db);

    const adminStore = readSharedIntlAdminStore(now);
    const profile = adminStore.profiles.find(
      (p) => p.pathway === pathway && p.role === 'teacher' && p.email.toLowerCase() === cleanEmail
    );
    if (profile) {
      profile.passwordHash = nextHash;
      profile.updatedAt = now;
      writeSharedIntlAdminStore(adminStore);
    }

    return { ok: true };
  },
};
