import type { AuthSession, CurriculumSubTrack, UserAccount } from '../types/domain';
import { hashPassword, verifyPassword } from '../utils/crypto';
import {
  normalizeCouponCode,
  validateEmail,
  validateFullName,
  validatePassword,
} from '../utils/validation';
import {
  adminNoticesService,
  type NoticeCategoryTag,
  type PathwayNotice,
} from './adminNoticesService';
import {
  adminUsersService,
  PENDING_EXPIRY_WINDOW_MS,
  type AcademicClassLevel,
  type AcademicGroup,
  type AdminUserPathway,
  type PathwayPendingRegistration,
  type PathwayUserProfile,
} from './adminUsersService';
import { COUPON_TTL_MS, couponService } from './couponService';
import { loadDatabase, saveDatabase } from './storage';

export type TeacherPathway = AdminUserPathway; // 'bangla_version' | 'english_version'
export type TeacherClassLevel = AcademicClassLevel; // 1..12
export type TeacherGroup = AcademicGroup; // 'Science' | 'Arts' | 'Commerce'

export const TEACHER_CLASS_LEVELS: TeacherClassLevel[] = [
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12,
];

export const TEACHER_GROUPS: TeacherGroup[] = ['Science', 'Arts', 'Commerce'];

export const TEACHER_SUBJECT_OPTIONS: string[] = [
  'Physics',
  'Mathematics',
  'Higher Mathematics',
  'Chemistry',
  'Biology',
  'English',
  'Bangla',
  'ICT',
  'Accounting',
  'Finance & Banking',
  'Economics',
  'History & Civics',
  'General Science',
];

export type TeacherResourceType =
  | 'Lecture Notes'
  | 'Worksheet'
  | 'Formula Sheet'
  | 'Practice Guide';

export type TeacherAnnouncementTag = 'Study Update' | 'Homework' | 'Exam Prep';
export type AttendanceStatus = 'Present' | 'Late' | 'Absent';

export interface TeacherCouponRecord {
  code: string;
  pathway: TeacherPathway;
  status: 'active' | 'used' | 'expired';
  createdAt: number;
  expiresAt: number;
  usedByEmail?: string;
}

export type TeacherCouponCheckResult =
  | { ok: true; coupon: TeacherCouponRecord }
  | {
      ok: false;
      reason:
        | 'invalid_format'
        | 'student_coupon'
        | 'not_found'
        | 'already_used'
        | 'expired'
        | 'pathway_mismatch';
      message: string;
    };

export interface TeacherRegistrationInput {
  pathway: TeacherPathway;
  couponCode: string;
  fullName: string;
  email: string;
  password: string;
  assignedClasses: TeacherClassLevel[];
  primarySubject: string;
  academicGroup: TeacherGroup | null;
}

export interface TeacherProfileContext {
  userId: string;
  fullName: string;
  email: string;
  pathway: TeacherPathway;
  assignedClasses: TeacherClassLevel[];
  primarySubject: string;
  academicGroup: TeacherGroup | null;
  registrationType: 'coupon_auto' | 'admin_manual';
  joinedAt: number;
}

export interface DemoTeacherPreset {
  pathway: TeacherPathway;
  pathwayLabel: CurriculumSubTrack;
  fullName: string;
  email: string;
  password: string;
  assignedClasses: TeacherClassLevel[];
  primarySubject: string;
  academicGroup: TeacherGroup | null;
}

export interface TeacherModuleResource {
  id: string;
  pathway: TeacherPathway;
  teacherId: string;
  academicClass: TeacherClassLevel;
  academicGroup: TeacherGroup | null;
  subject: string;
  title: string;
  resourceType: TeacherResourceType;
  summary: string;
  chapterTag: string;
  isPublished: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface TeacherStudentAssessment {
  studentId: string;
  pathway: TeacherPathway;
  marks: number; // 0..100
  attendanceRate: number; // 0..100
  attendanceStatus: AttendanceStatus;
  remarks: string;
  updatedAt: number;
}

export interface TeacherRosterStudent {
  id: string;
  fullName: string;
  email: string;
  pathway: TeacherPathway;
  academicClass: TeacherClassLevel;
  academicGroup: TeacherGroup | null;
  status: 'active' | 'suspended';
  completedLessonsCount: number;
  totalRecommendedLessons: number;
  marks: number;
  attendanceRate: number;
  attendanceStatus: AttendanceStatus;
  remarks: string;
  lastUpdatedAt: number;
}

export interface TeacherClassAnnouncement {
  id: string;
  pathway: TeacherPathway;
  teacherId: string;
  teacherName: string;
  academicClass: TeacherClassLevel;
  academicGroup: TeacherGroup | null;
  subject: string;
  title: string;
  message: string;
  tag: TeacherAnnouncementTag;
  createdAt: number;
}

export interface TeacherScheduleSession {
  id: string;
  timeSlot: string;
  academicClass: TeacherClassLevel;
  academicGroup: TeacherGroup | null;
  subject: string;
  topic: string;
  roomLabel: string;
  status: 'Completed' | 'Next Up' | 'Scheduled';
}

const ADMIN_USERS_STORAGE_KEY = 'edura_admin_users_workspace_v1';
const STUDENT_PROGRESS_STORAGE_KEY = 'edura_student_lesson_progress_v1';
const TEACHER_COUPONS_META_KEY = 'edura_teacher_coupons_meta_v1';
const TEACHER_CONTEXT_STORAGE_KEY = 'edura_teacher_context_v1';
const TEACHER_MODULES_STORAGE_KEY = 'edura_teacher_modules_v1';
const TEACHER_ASSESSMENTS_STORAGE_KEY = 'edura_teacher_assessments_v1';
const TEACHER_ANNOUNCEMENTS_STORAGE_KEY = 'edura_teacher_announcements_v1';

let memoryTeacherCoupons: string | null = null;
let memoryTeacherContexts: string | null = null;
let memoryTeacherModules: string | null = null;
let memoryTeacherAssessments: string | null = null;
let memoryTeacherAnnouncements: string | null = null;

function canUseLocalStorage(): boolean {
  try {
    return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
  } catch {
    return false;
  }
}

export function resolveTeacherPathway(raw?: string | null): TeacherPathway | null {
  if (!raw) return null;
  if (raw === 'bangla_version' || raw === 'Bangla Version') return 'bangla_version';
  if (raw === 'english_version' || raw === 'English Version') return 'english_version';
  return null;
}

export function getTeacherPathwayLabel(pathway: TeacherPathway): CurriculumSubTrack {
  return pathway === 'bangla_version' ? 'Bangla Version' : 'English Version';
}

export function hasSeniorSecondaryClass(classes: TeacherClassLevel[]): boolean {
  return classes.some((cls) => cls >= 9 && cls <= 12);
}

export function normalizeTeacherGroupForClasses(
  classes: TeacherClassLevel[],
  group: TeacherGroup | null | undefined
): TeacherGroup | null {
  if (!hasSeniorSecondaryClass(classes)) return null;
  if (group === 'Science' || group === 'Arts' || group === 'Commerce') return group;
  return 'Science';
}

export function formatTeacherContextBadge(
  pathway: TeacherPathway,
  primarySubject: string
): string {
  const pathwayLabel = getTeacherPathwayLabel(pathway);
  const subject = primarySubject.trim() || 'Faculty';
  return `${pathwayLabel} • ${subject}`;
}

export function formatAssignedClassesSummary(classes: TeacherClassLevel[]): string {
  if (classes.length === 0) return 'Unassigned';
  const sorted = Array.from(new Set(classes)).sort((a, b) => a - b);
  if (sorted.length === 1) return `Class ${sorted[0]}`;
  return `Classes ${sorted.join(', ')}`;
}

export function getDemoTeacherPreset(pathway: TeacherPathway): DemoTeacherPreset {
  if (pathway === 'english_version') {
    return {
      pathway: 'english_version',
      pathwayLabel: 'English Version',
      fullName: 'Rezaul Karim',
      email: 'rezaul.ev@school.edu.bd',
      password: 'Teacher@1234',
      assignedClasses: [9, 10],
      primarySubject: 'Mathematics',
      academicGroup: 'Science',
    };
  }
  return {
    pathway: 'bangla_version',
    pathwayLabel: 'Bangla Version',
    fullName: 'Kamrul Hasan',
    email: 'kamrul.bv@school.edu.bd',
    password: 'Teacher@1234',
    assignedClasses: [9, 10],
    primarySubject: 'Physics',
    academicGroup: 'Science',
  };
}

export function getDemoTeacherCouponHint(pathway: TeacherPathway): string {
  return pathway === 'english_version' ? 'T-77520' : 'T-44810';
}

function createSeedTeacherCoupons(now = Date.now()): TeacherCouponRecord[] {
  const hour = 60 * 60 * 1000;
  return [
    {
      code: 'T-44810',
      pathway: 'bangla_version',
      status: 'active',
      createdAt: now - 3 * hour,
      expiresAt: now + 45 * hour,
    },
    {
      code: 'T-44905',
      pathway: 'bangla_version',
      status: 'active',
      createdAt: now - 1 * hour,
      expiresAt: now + 47 * hour,
    },
    {
      code: 'T-77520',
      pathway: 'english_version',
      status: 'active',
      createdAt: now - 2 * hour,
      expiresAt: now + 46 * hour,
    },
    {
      code: 'T-77914',
      pathway: 'english_version',
      status: 'active',
      createdAt: now - 1 * hour,
      expiresAt: now + 47 * hour,
    },
    {
      code: 'T-30112',
      pathway: 'bangla_version',
      status: 'expired',
      createdAt: now - 54 * hour,
      expiresAt: now - 6 * hour,
    },
    {
      code: 'T-20911',
      pathway: 'bangla_version',
      status: 'used',
      createdAt: now - 10 * hour,
      expiresAt: now + 38 * hour,
    },
  ];
}

function loadTeacherCouponsMeta(now = Date.now()): TeacherCouponRecord[] {
  const raw = canUseLocalStorage()
    ? window.localStorage.getItem(TEACHER_COUPONS_META_KEY)
    : memoryTeacherCoupons;

  if (!raw) {
    const seeded = createSeedTeacherCoupons(now);
    saveTeacherCouponsMeta(seeded);
    return seeded;
  }

  try {
    const parsed = JSON.parse(raw) as TeacherCouponRecord[];
    if (!Array.isArray(parsed)) {
      const seeded = createSeedTeacherCoupons(now);
      saveTeacherCouponsMeta(seeded);
      return seeded;
    }
    return parsed;
  } catch {
    const seeded = createSeedTeacherCoupons(now);
    saveTeacherCouponsMeta(seeded);
    return seeded;
  }
}

function saveTeacherCouponsMeta(records: TeacherCouponRecord[]): void {
  const serialized = JSON.stringify(records);
  memoryTeacherCoupons = serialized;
  if (canUseLocalStorage()) {
    window.localStorage.setItem(TEACHER_COUPONS_META_KEY, serialized);
  }
}

function loadTeacherContexts(): Record<string, TeacherProfileContext> {
  const raw = canUseLocalStorage()
    ? window.localStorage.getItem(TEACHER_CONTEXT_STORAGE_KEY)
    : memoryTeacherContexts;
  if (!raw) return {};
  try {
    return JSON.parse(raw) as Record<string, TeacherProfileContext>;
  } catch {
    return {};
  }
}

function saveTeacherContexts(map: Record<string, TeacherProfileContext>): void {
  const serialized = JSON.stringify(map);
  memoryTeacherContexts = serialized;
  if (canUseLocalStorage()) {
    window.localStorage.setItem(TEACHER_CONTEXT_STORAGE_KEY, serialized);
  }
}

function createSeedTeacherModules(now = Date.now()): TeacherModuleResource[] {
  const day = 24 * 60 * 60 * 1000;
  return [
    {
      id: 'TMOD-BV-01',
      pathway: 'bangla_version',
      teacherId: 'USR-BV-T101',
      academicClass: 10,
      academicGroup: 'Science',
      subject: 'Physics',
      title: 'Chapter 3: Force, Momentum & Newton Laws — Board CQ Notes',
      resourceType: 'Lecture Notes',
      summary:
        'Step-by-step derivations of F = ma, conservation of linear momentum, and 4 solved SSC Bangla Version Creative Questions.',
      chapterTag: 'Ch. 03 · Force',
      isPublished: true,
      createdAt: now - 6 * day,
      updatedAt: now - 2 * day,
    },
    {
      id: 'TMOD-BV-02',
      pathway: 'bangla_version',
      teacherId: 'USR-BV-T101',
      academicClass: 9,
      academicGroup: 'Science',
      subject: 'Physics',
      title: 'Equations of Motion & Velocity-Time Graph Worksheet',
      resourceType: 'Worksheet',
      summary:
        '12 graded numerical problems covering uniform acceleration, free-fall motion, and slope/area graph interpretation.',
      chapterTag: 'Ch. 02 · Motion',
      isPublished: true,
      createdAt: now - 4 * day,
      updatedAt: now - 1 * day,
    },
    {
      id: 'TMOD-BV-03',
      pathway: 'bangla_version',
      teacherId: 'USR-BV-T101',
      academicClass: 10,
      academicGroup: 'Science',
      subject: 'Physics',
      title: 'Current Electricity & Equivalent Resistance Formula Sheet',
      resourceType: 'Formula Sheet',
      summary:
        'Compact revision reference for Ohm law, series/parallel combinations, electrical power, and domestic circuit safety.',
      chapterTag: 'Ch. 11 · Electricity',
      isPublished: false,
      createdAt: now - 1 * day,
      updatedAt: now - 1 * day,
    },
    {
      id: 'TMOD-EV-01',
      pathway: 'english_version',
      teacherId: 'USR-EV-T301',
      academicClass: 10,
      academicGroup: 'Science',
      subject: 'Mathematics',
      title: 'Chapter 9: Trigonometric Ratios & Identities Problem Pack',
      resourceType: 'Lecture Notes',
      summary:
        'Worked NCTB English Version board proofs, angle of elevation word problems, and marking scheme reminders.',
      chapterTag: 'Ch. 09 · Trigonometry',
      isPublished: true,
      createdAt: now - 5 * day,
      updatedAt: now - 2 * day,
    },
    {
      id: 'TMOD-EV-02',
      pathway: 'english_version',
      teacherId: 'USR-EV-T301',
      academicClass: 9,
      academicGroup: 'Science',
      subject: 'Mathematics',
      title: 'Algebraic Expressions & Factorization Drill Sheet',
      resourceType: 'Worksheet',
      summary:
        'Structured practice on remainder theorem, cubic identities, and rapid verification checks for mid-term preparation.',
      chapterTag: 'Ch. 03 · Algebra',
      isPublished: true,
      createdAt: now - 3 * day,
      updatedAt: now - 1 * day,
    },
  ];
}

function loadTeacherModules(now = Date.now()): TeacherModuleResource[] {
  const raw = canUseLocalStorage()
    ? window.localStorage.getItem(TEACHER_MODULES_STORAGE_KEY)
    : memoryTeacherModules;

  if (!raw) {
    const seeded = createSeedTeacherModules(now);
    saveTeacherModules(seeded);
    return seeded;
  }
  try {
    const parsed = JSON.parse(raw) as TeacherModuleResource[];
    if (!Array.isArray(parsed)) {
      const seeded = createSeedTeacherModules(now);
      saveTeacherModules(seeded);
      return seeded;
    }
    return parsed;
  } catch {
    const seeded = createSeedTeacherModules(now);
    saveTeacherModules(seeded);
    return seeded;
  }
}

function saveTeacherModules(modules: TeacherModuleResource[]): void {
  const serialized = JSON.stringify(modules);
  memoryTeacherModules = serialized;
  if (canUseLocalStorage()) {
    window.localStorage.setItem(TEACHER_MODULES_STORAGE_KEY, serialized);
  }
}

function createSeedAssessments(now = Date.now()): Record<string, TeacherStudentAssessment> {
  const day = 24 * 60 * 60 * 1000;
  return {
    'USR-BV-S201': {
      studentId: 'USR-BV-S201',
      pathway: 'bangla_version',
      marks: 88,
      attendanceRate: 94,
      attendanceStatus: 'Present',
      remarks: 'Consistent lab calculations and strong CQ diagrams.',
      updatedAt: now - 2 * day,
    },
    'USR-BV-S202': {
      studentId: 'USR-BV-S202',
      pathway: 'bangla_version',
      marks: 81,
      attendanceRate: 89,
      attendanceStatus: 'Present',
      remarks: 'Good participation in class problem reviews.',
      updatedAt: now - 3 * day,
    },
    'USR-BV-S203': {
      studentId: 'USR-BV-S203',
      pathway: 'bangla_version',
      marks: 91,
      attendanceRate: 96,
      attendanceStatus: 'Present',
      remarks: 'Neat homework submissions and punctual attendance.',
      updatedAt: now - 1 * day,
    },
    'USR-BV-S204': {
      studentId: 'USR-BV-S204',
      pathway: 'bangla_version',
      marks: 62,
      attendanceRate: 71,
      attendanceStatus: 'Absent',
      remarks: 'Needs revision support on core chapters.',
      updatedAt: now - 4 * day,
    },
    'USR-EV-S401': {
      studentId: 'USR-EV-S401',
      pathway: 'english_version',
      marks: 92,
      attendanceRate: 95,
      attendanceStatus: 'Present',
      remarks: 'Top scorer in Trigonometry quiz; Olympiad ready.',
      updatedAt: now - 1 * day,
    },
    'USR-EV-S402': {
      studentId: 'USR-EV-S402',
      pathway: 'english_version',
      marks: 84,
      attendanceRate: 91,
      attendanceStatus: 'Present',
      remarks: 'Clear analytical structure in written assignments.',
      updatedAt: now - 2 * day,
    },
    'USR-EV-S403': {
      studentId: 'USR-EV-S403',
      pathway: 'english_version',
      marks: 78,
      attendanceRate: 86,
      attendanceStatus: 'Late',
      remarks: 'Improving steadily on weekly worksheets.',
      updatedAt: now - 3 * day,
    },
  };
}

function loadAssessments(now = Date.now()): Record<string, TeacherStudentAssessment> {
  const raw = canUseLocalStorage()
    ? window.localStorage.getItem(TEACHER_ASSESSMENTS_STORAGE_KEY)
    : memoryTeacherAssessments;

  if (!raw) {
    const seeded = createSeedAssessments(now);
    saveAssessments(seeded);
    return seeded;
  }
  try {
    return JSON.parse(raw) as Record<string, TeacherStudentAssessment>;
  } catch {
    const seeded = createSeedAssessments(now);
    saveAssessments(seeded);
    return seeded;
  }
}

function saveAssessments(map: Record<string, TeacherStudentAssessment>): void {
  const serialized = JSON.stringify(map);
  memoryTeacherAssessments = serialized;
  if (canUseLocalStorage()) {
    window.localStorage.setItem(TEACHER_ASSESSMENTS_STORAGE_KEY, serialized);
  }
}

function createSeedAnnouncements(now = Date.now()): TeacherClassAnnouncement[] {
  const hour = 60 * 60 * 1000;
  return [
    {
      id: 'TANN-BV-01',
      pathway: 'bangla_version',
      teacherId: 'USR-BV-T101',
      teacherName: 'Kamrul Hasan',
      academicClass: 10,
      academicGroup: 'Science',
      subject: 'Physics',
      title: 'Practical Notebook Check — Vernier Calipers & Slide Calipers',
      message:
        'Please bring your signed Physics practical notebook and graph paper to Lab Room 204 before Sunday morning assembly.',
      tag: 'Homework',
      createdAt: now - 6 * hour,
    },
    {
      id: 'TANN-EV-01',
      pathway: 'english_version',
      teacherId: 'USR-EV-T301',
      teacherName: 'Rezaul Karim',
      academicClass: 10,
      academicGroup: 'Science',
      subject: 'Mathematics',
      title: 'Trigonometry Mock Quiz & Formula Revision Session',
      message:
        'A 25-minute board-style MCQ and short-proof drill on Chapter 9 will be held in Tuesday Period 2. Review identities beforehand.',
      tag: 'Exam Prep',
      createdAt: now - 5 * hour,
    },
  ];
}

function loadAnnouncements(now = Date.now()): TeacherClassAnnouncement[] {
  const raw = canUseLocalStorage()
    ? window.localStorage.getItem(TEACHER_ANNOUNCEMENTS_STORAGE_KEY)
    : memoryTeacherAnnouncements;

  if (!raw) {
    const seeded = createSeedAnnouncements(now);
    saveAnnouncements(seeded);
    return seeded;
  }
  try {
    const parsed = JSON.parse(raw) as TeacherClassAnnouncement[];
    if (!Array.isArray(parsed)) {
      const seeded = createSeedAnnouncements(now);
      saveAnnouncements(seeded);
      return seeded;
    }
    return parsed;
  } catch {
    const seeded = createSeedAnnouncements(now);
    saveAnnouncements(seeded);
    return seeded;
  }
}

function saveAnnouncements(list: TeacherClassAnnouncement[]): void {
  const serialized = JSON.stringify(list);
  memoryTeacherAnnouncements = serialized;
  if (canUseLocalStorage()) {
    window.localStorage.setItem(TEACHER_ANNOUNCEMENTS_STORAGE_KEY, serialized);
  }
}

interface SharedAdminUsersStore {
  pendingRegistrations: PathwayPendingRegistration[];
  profiles: PathwayUserProfile[];
}

function readSharedAdminUsersStore(pathway: TeacherPathway, now = Date.now()): SharedAdminUsersStore {
  // Ensure the adminUsersService store is initialized first without modifying adminUsersService.ts
  adminUsersService.listProfiles(pathway, now);
  if (canUseLocalStorage()) {
    const raw = window.localStorage.getItem(ADMIN_USERS_STORAGE_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as SharedAdminUsersStore;
        if (Array.isArray(parsed.pendingRegistrations) && Array.isArray(parsed.profiles)) {
          return parsed;
        }
      } catch {
        // fallback below
      }
    }
  }
  return {
    pendingRegistrations: [
      ...adminUsersService.listPending('bangla_version', now),
      ...adminUsersService.listPending('english_version', now),
    ],
    profiles: [
      ...adminUsersService.listProfiles('bangla_version', now),
      ...adminUsersService.listProfiles('english_version', now),
    ],
  };
}

function writeSharedAdminUsersStore(store: SharedAdminUsersStore): void {
  if (canUseLocalStorage()) {
    window.localStorage.setItem(ADMIN_USERS_STORAGE_KEY, JSON.stringify(store));
  }
}

function readStudentLessonProgressMap(): Record<string, string[]> {
  if (!canUseLocalStorage()) return {};
  const raw = window.localStorage.getItem(STUDENT_PROGRESS_STORAGE_KEY);
  if (!raw) return {};
  try {
    return JSON.parse(raw) as Record<string, string[]>;
  } catch {
    return {};
  }
}

export function resetTeacherStores(now = Date.now()): void {
  saveTeacherCouponsMeta(createSeedTeacherCoupons(now));
  saveTeacherContexts({});
  saveTeacherModules(createSeedTeacherModules(now));
  saveAssessments(createSeedAssessments(now));
  saveAnnouncements(createSeedAnnouncements(now));
}

export function getTodayScheduleForTeacher(
  teacher: Pick<TeacherProfileContext, 'pathway' | 'assignedClasses' | 'primarySubject' | 'academicGroup'>
): TeacherScheduleSession[] {
  const classes =
    teacher.assignedClasses.length > 0 ? teacher.assignedClasses : ([10] as TeacherClassLevel[]);
  const primaryCls = classes[0];
  const secondaryCls = classes[1] ?? classes[0];
  const isEV = teacher.pathway === 'english_version';
  const wing = isEV ? 'EV Wing' : 'BV Wing';

  return [
    {
      id: 'sess-1',
      timeSlot: '08:30 AM – 09:15 AM',
      academicClass: primaryCls,
      academicGroup: primaryCls >= 9 ? teacher.academicGroup : null,
      subject: teacher.primarySubject,
      topic:
        teacher.primarySubject === 'Physics'
          ? 'Newton Laws & Momentum Numericals'
          : teacher.primarySubject === 'Mathematics'
            ? 'Trigonometric Identities & Proofs'
            : `${teacher.primarySubject} Core Concept Review`,
      roomLabel: `${wing} · Room 204`,
      status: 'Completed',
    },
    {
      id: 'sess-2',
      timeSlot: '10:15 AM – 11:00 AM',
      academicClass: secondaryCls,
      academicGroup: secondaryCls >= 9 ? teacher.academicGroup : null,
      subject: teacher.primarySubject,
      topic:
        teacher.primarySubject === 'Physics'
          ? 'Board CQ Stem Analysis & Graph Reading'
          : teacher.primarySubject === 'Mathematics'
            ? 'Board-Style Creative Question Workshop'
            : `${teacher.primarySubject} Guided Practice`,
      roomLabel: `${wing} · Room 302`,
      status: 'Next Up',
    },
    {
      id: 'sess-3',
      timeSlot: '12:00 PM – 12:45 PM',
      academicClass: primaryCls,
      academicGroup: primaryCls >= 9 ? teacher.academicGroup : null,
      subject: teacher.primarySubject,
      topic: 'Weekly Quiz Review & Student Feedback',
      roomLabel: `${wing} · Room 204`,
      status: 'Scheduled',
    },
  ];
}

export const teacherService = {
  /**
   * Validate a teacher onboarding coupon code (T-XXXXX) strictly against the active pathway
   * (Bangla Version or English Version), checking format, role prefix, unused state, and 48h expiry.
   */
  validateTeacherCoupon(
    rawCode: string,
    pathway: TeacherPathway,
    now = Date.now()
  ): TeacherCouponCheckResult {
    const code = normalizeCouponCode(rawCode);
    if (!code) {
      return {
        ok: false,
        reason: 'invalid_format',
        message: 'Please enter a valid teacher coupon code (e.g. T-44810).',
      };
    }

    if (code.startsWith('S-')) {
      return {
        ok: false,
        reason: 'student_coupon',
        message:
          'This is a Student coupon code (S-XXXXX). Please enter a Teacher coupon starting with T-.',
      };
    }

    if (!/^T-\d{5}$/.test(code)) {
      return {
        ok: false,
        reason: 'invalid_format',
        message: 'Teacher coupon codes must follow the format T-XXXXX (5 digits).',
      };
    }

    // 1. Check dedicated pathway-scoped teacher coupon store
    const metaList = loadTeacherCouponsMeta(now);
    const metaMatch = metaList.find((c) => c.code === code);
    if (metaMatch) {
      if (metaMatch.pathway !== pathway) {
        const expectedLabel = getTeacherPathwayLabel(metaMatch.pathway);
        const currentLabel = getTeacherPathwayLabel(pathway);
        return {
          ok: false,
          reason: 'pathway_mismatch',
          message: `Coupon ${code} belongs to ${expectedLabel}, not ${currentLabel}. Please switch pathway or use a ${currentLabel} teacher coupon.`,
        };
      }
      if (metaMatch.status === 'used') {
        return {
          ok: false,
          reason: 'already_used',
          message: `Coupon ${code} has already been redeemed.`,
        };
      }
      if (metaMatch.status === 'expired' || now >= metaMatch.expiresAt) {
        return {
          ok: false,
          reason: 'expired',
          message: `Coupon ${code} has expired (48-hour redemption window elapsed). Request a fresh code from your pathway admin.`,
        };
      }
      return { ok: true, coupon: metaMatch };
    }

    // 2. Fallback to coupons dynamically generated in Admin -> Coupons
    const coreCoupons = couponService.listCoupons(now);
    const coreMatch = coreCoupons.find((c) => c.code === code && c.role === 'teacher');
    if (coreMatch) {
      if (coreMatch.status === 'used') {
        return {
          ok: false,
          reason: 'already_used',
          message: `Coupon ${code} has already been redeemed.`,
        };
      }
      if (coreMatch.status === 'expired' || now >= coreMatch.expiresAt) {
        return {
          ok: false,
          reason: 'expired',
          message: `Coupon ${code} has expired (48-hour redemption window elapsed).`,
        };
      }
      return {
        ok: true,
        coupon: {
          code: coreMatch.code,
          pathway,
          status: 'active',
          createdAt: coreMatch.createdAt,
          expiresAt: coreMatch.expiresAt || coreMatch.createdAt + COUPON_TTL_MS,
        },
      };
    }

    return {
      ok: false,
      reason: 'not_found',
      message: `Coupon ${code} was not found for ${getTeacherPathwayLabel(pathway)}. Double-check the 5-digit code.`,
    };
  },

  /**
   * Submit a new Teacher coupon registration directly into the matching pathway's
   * Admin Users -> Pending Approvals -> Teacher Pending queue with a 48h countdown.
   */
  submitTeacherCouponRegistration(
    input: TeacherRegistrationInput,
    now = Date.now()
  ): { ok: true; registration: PathwayPendingRegistration } | { ok: false; error: string } {
    const couponCheck = this.validateTeacherCoupon(input.couponCode, input.pathway, now);
    if (!couponCheck.ok) {
      return { ok: false, error: couponCheck.message };
    }

    const nameCheck = validateFullName(input.fullName);
    if (!nameCheck.valid) {
      return { ok: false, error: 'Please enter your full name (at least 2 characters).' };
    }

    const emailCheck = validateEmail(input.email);
    if (!emailCheck.valid) {
      return { ok: false, error: 'Please enter a valid email address.' };
    }

    const passCheck = validatePassword(input.password);
    if (!passCheck.valid) {
      return { ok: false, error: 'Password must be at least 8 characters long.' };
    }

    const uniqueClasses = Array.from(new Set(input.assignedClasses))
      .filter((c) => c >= 1 && c <= 12)
      .sort((a, b) => a - b) as TeacherClassLevel[];
    if (uniqueClasses.length === 0) {
      return { ok: false, error: 'Please select at least one assigned class (Class 1–12).' };
    }

    const subject = input.primarySubject.trim();
    if (!subject) {
      return { ok: false, error: 'Please select your primary subject or department.' };
    }

    const emailLower = input.email.trim().toLowerCase();
    const store = readSharedAdminUsersStore(input.pathway, now);

    const duplicateProfile = store.profiles.find((p) => p.email.toLowerCase() === emailLower);
    if (duplicateProfile) {
      return {
        ok: false,
        error: 'An account with this email already exists. Please use Demo Login instead.',
      };
    }

    const duplicatePending = store.pendingRegistrations.find(
      (p) => p.email.toLowerCase() === emailLower
    );
    if (duplicatePending) {
      return {
        ok: false,
        error: 'A pending registration for this email is already awaiting admin approval.',
      };
    }

    const primaryClass = uniqueClasses[0];
    const normalizedGroup = normalizeTeacherGroupForClasses(uniqueClasses, input.academicGroup);
    const registrationId = `pend-t-${input.pathway === 'bangla_version' ? 'bv' : 'ev'}-${now.toString(36)}`;

    const record: PathwayPendingRegistration = {
      id: registrationId,
      pathway: input.pathway,
      role: 'teacher',
      fullName: input.fullName.trim(),
      email: emailLower,
      academicClass: primaryClass,
      academicGroup: normalizedGroup,
      couponCode: couponCheck.coupon.code,
      submittedAt: now,
      expiresAt: now + PENDING_EXPIRY_WINDOW_MS,
      passwordHash: hashPassword(input.password),
    };

    // Enqueue into shared Admin Users pending queue (appears immediately in Teacher Pending!)
    store.pendingRegistrations.unshift(record);
    writeSharedAdminUsersStore(store);

    // Save extra teacher metadata (assignedClasses + primarySubject) keyed by email for post-approval sync
    const contexts = loadTeacherContexts();
    contexts[`email:${emailLower}`] = {
      userId: registrationId,
      fullName: record.fullName,
      email: emailLower,
      pathway: input.pathway,
      assignedClasses: uniqueClasses,
      primarySubject: subject,
      academicGroup: normalizedGroup,
      registrationType: 'coupon_auto',
      joinedAt: now,
    };
    saveTeacherContexts(contexts);

    // Mark teacher coupon as used in teacher coupon store
    const metaList = loadTeacherCouponsMeta(now);
    const idx = metaList.findIndex((c) => c.code === couponCheck.coupon.code);
    if (idx >= 0) {
      metaList[idx] = {
        ...metaList[idx],
        status: 'used',
        usedByEmail: emailLower,
      };
    } else {
      metaList.unshift({
        ...couponCheck.coupon,
        status: 'used',
        usedByEmail: emailLower,
      });
    }
    saveTeacherCouponsMeta(metaList);

    // Also mark used in core coupon store if present
    const db = loadDatabase(now);
    const coreCoupon = db.coupons.find((c) => c.code === couponCheck.coupon.code);
    if (coreCoupon && coreCoupon.status !== 'used') {
      coreCoupon.status = 'used';
      coreCoupon.usedAt = now;
      coreCoupon.usedByRegistrationId = registrationId;
      saveDatabase(db);
    }

    return { ok: true, registration: record };
  },

  /**
   * Ensure active teacher directory accounts & demo teachers can log in smoothly
   * via standard email+password or 1-click demo login, syncing their pathway,
   * assigned classes, and primary subject without altering Admin or Student auth.
   */
  prepareTeacherAccountForLogin(
    rawEmail: string,
    password: string,
    selectedPathway: TeacherPathway,
    now = Date.now()
  ): { synced: boolean; pathway?: TeacherPathway } {
    const email = rawEmail.trim().toLowerCase();
    if (!email) return { synced: false };

    const db = loadDatabase(now);
    const store = readSharedAdminUsersStore(selectedPathway, now);

    const dirProfile =
      store.profiles.find(
        (p) => p.role === 'teacher' && p.pathway === selectedPathway && p.email.toLowerCase() === email
      ) ??
      store.profiles.find((p) => p.role === 'teacher' && p.email.toLowerCase() === email);

    if (dirProfile && dirProfile.status === 'active' && verifyPassword(password, dirProfile.passwordHash)) {
      const existing = db.users.find((u) => u.email.toLowerCase() === email);
      const userId = existing?.id ?? dirProfile.id;

      const demoPreset = getDemoTeacherPreset(selectedPathway);
      const contexts = loadTeacherContexts();
      const pendingMeta = contexts[`email:${email}`];

      const defaultSubject =
        pendingMeta?.primarySubject ??
        (email === demoPreset.email
          ? demoPreset.primarySubject
          : dirProfile.academicGroup === 'Arts'
            ? 'History & Civics'
            : dirProfile.academicGroup === 'Commerce'
              ? 'Accounting'
              : selectedPathway === 'english_version'
                ? 'Mathematics'
                : 'Physics');

      const defaultClasses: TeacherClassLevel[] =
        pendingMeta?.assignedClasses ??
        (email === demoPreset.email
          ? demoPreset.assignedClasses
          : dirProfile.academicClass >= 9 && dirProfile.academicClass <= 10
            ? [9, 10]
            : [dirProfile.academicClass]);

      if (!existing) {
        const account: UserAccount = {
          id: dirProfile.id,
          role: 'teacher',
          fullName: dirProfile.fullName,
          email: dirProfile.email,
          passwordHash: dirProfile.passwordHash,
          mustChangePassword: false,
          preferredLanguage: 'en',
          createdAt: dirProfile.joinedAt,
          educationStream: 'Bangladesh National Curriculum (NCTB)',
          pathway: getTeacherPathwayLabel(selectedPathway),
        };
        db.users.push(account);
        saveDatabase(db);
      } else if (existing.mustChangePassword) {
        existing.mustChangePassword = false;
        saveDatabase(db);
      }

      contexts[userId] = {
        userId,
        fullName: dirProfile.fullName,
        email: dirProfile.email,
        pathway: selectedPathway,
        assignedClasses: defaultClasses,
        primarySubject: defaultSubject,
        academicGroup: normalizeTeacherGroupForClasses(defaultClasses, dirProfile.academicGroup),
        registrationType: dirProfile.registrationType,
        joinedAt: dirProfile.joinedAt,
      };
      saveTeacherContexts(contexts);
      return { synced: true, pathway: selectedPathway };
    }

    // Fallback for legacy seeded teacher in storage.ts
    const legacyTeacher = db.users.find(
      (u) => u.role === 'teacher' && u.email.toLowerCase() === email
    );
    if (legacyTeacher && verifyPassword(password, legacyTeacher.passwordHash)) {
      const contexts = loadTeacherContexts();
      const defaultClasses: TeacherClassLevel[] = [9, 10];
      contexts[legacyTeacher.id] = {
        userId: legacyTeacher.id,
        fullName: legacyTeacher.fullName,
        email: legacyTeacher.email,
        pathway: selectedPathway,
        assignedClasses: defaultClasses,
        primarySubject: selectedPathway === 'english_version' ? 'Mathematics' : 'Physics',
        academicGroup: 'Science',
        registrationType: 'coupon_auto',
        joinedAt: legacyTeacher.createdAt,
      };
      saveTeacherContexts(contexts);
      return { synced: true, pathway: selectedPathway };
    }

    return { synced: false };
  },

  /**
   * Resolve the logged-in teacher's complete pathway/classes/subject context.
   * Returns null if outside Phase 1 pathways (Bangla Version / English Version).
   */
  resolveTeacherContext(
    session: AuthSession,
    profile: Omit<UserAccount, 'passwordHash'> | null,
    now = Date.now()
  ): TeacherProfileContext | null {
    const resolvedPathway = resolveTeacherPathway(session.selectedPathway ?? 'Bangla Version');
    if (!resolvedPathway) return null;

    const contexts = loadTeacherContexts();
    const saved = contexts[session.userId];
    if (saved) {
      return {
        ...saved,
        fullName: session.fullName,
        email: session.email,
        pathway: resolvedPathway,
      };
    }

    const demoPreset = getDemoTeacherPreset(resolvedPathway);
    const store = readSharedAdminUsersStore(resolvedPathway, now);
    const dirMatch = store.profiles.find(
      (p) => p.id === session.userId || p.email.toLowerCase() === session.email.toLowerCase()
    );

    if (dirMatch) {
      const classes: TeacherClassLevel[] =
        dirMatch.email.toLowerCase() === demoPreset.email
          ? demoPreset.assignedClasses
          : [dirMatch.academicClass];
      return {
        userId: session.userId,
        fullName: dirMatch.fullName,
        email: dirMatch.email,
        pathway: resolvedPathway,
        assignedClasses: classes,
        primarySubject:
          dirMatch.email.toLowerCase() === demoPreset.email
            ? demoPreset.primarySubject
            : resolvedPathway === 'english_version'
              ? 'Mathematics'
              : 'Physics',
        academicGroup: normalizeTeacherGroupForClasses(classes, dirMatch.academicGroup),
        registrationType: dirMatch.registrationType,
        joinedAt: dirMatch.joinedAt,
      };
    }

    return {
      userId: session.userId,
      fullName: session.fullName,
      email: session.email,
      pathway: resolvedPathway,
      assignedClasses: demoPreset.assignedClasses,
      primarySubject: demoPreset.primarySubject,
      academicGroup: 'Science',
      registrationType: 'coupon_auto',
      joinedAt: profile?.createdAt ?? session.loggedInAt,
    };
  },

  /**
   * List pathway-isolated syllabus modules & study resources for the teacher.
   */
  listModules(
    pathway: TeacherPathway,
    filters: { academicClass?: TeacherClassLevel | 'all'; query?: string } = {},
    now = Date.now()
  ): TeacherModuleResource[] {
    const q = (filters.query ?? '').trim().toLowerCase();
    return loadTeacherModules(now)
      .filter((m) => m.pathway === pathway)
      .filter((m) => {
        if (filters.academicClass && filters.academicClass !== 'all') {
          if (m.academicClass !== filters.academicClass) return false;
        }
        if (q) {
          const hay = `${m.title} ${m.subject} ${m.chapterTag} ${m.summary} ${m.resourceType}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => b.updatedAt - a.updatedAt);
  },

  createModuleResource(
    teacher: Pick<TeacherProfileContext, 'userId' | 'pathway' | 'primarySubject'>,
    input: {
      academicClass: TeacherClassLevel;
      academicGroup: TeacherGroup | null;
      subject?: string;
      title: string;
      resourceType: TeacherResourceType;
      chapterTag: string;
      summary: string;
      isPublished: boolean;
    },
    now = Date.now()
  ): { ok: true; module: TeacherModuleResource } | { ok: false; error: string } {
    if (input.title.trim().length < 3) {
      return { ok: false, error: 'Please enter a resource title (at least 3 characters).' };
    }
    if (input.summary.trim().length < 10) {
      return { ok: false, error: 'Please add a short study description or lesson notes (at least 10 characters).' };
    }

    const modules = loadTeacherModules(now);
    const created: TeacherModuleResource = {
      id: `TMOD-${teacher.pathway === 'bangla_version' ? 'BV' : 'EV'}-${now.toString(36).toUpperCase()}`,
      pathway: teacher.pathway,
      teacherId: teacher.userId,
      academicClass: input.academicClass,
      academicGroup:
        input.academicClass >= 9 && input.academicClass <= 12 ? input.academicGroup : null,
      subject: input.subject?.trim() || teacher.primarySubject,
      title: input.title.trim(),
      resourceType: input.resourceType,
      chapterTag: input.chapterTag.trim() || `Class ${input.academicClass}`,
      summary: input.summary.trim(),
      isPublished: input.isPublished,
      createdAt: now,
      updatedAt: now,
    };

    modules.unshift(created);
    saveTeacherModules(modules);
    return { ok: true, module: created };
  },

  toggleModulePublished(
    pathway: TeacherPathway,
    moduleId: string,
    now = Date.now()
  ): TeacherModuleResource | null {
    const modules = loadTeacherModules(now);
    const target = modules.find((m) => m.id === moduleId && m.pathway === pathway);
    if (!target) return null;
    target.isPublished = !target.isPublished;
    target.updatedAt = now;
    saveTeacherModules(modules);
    return target;
  },

  deleteModuleResource(pathway: TeacherPathway, moduleId: string, now = Date.now()): boolean {
    const modules = loadTeacherModules(now);
    const next = modules.filter((m) => !(m.id === moduleId && m.pathway === pathway));
    if (next.length === modules.length) return false;
    saveTeacherModules(next);
    return true;
  },

  /**
   * List strictly pathway-isolated students for the teacher's roster, enriched with
   * lesson completion counts and editable marks/attendance records.
   */
  listPathwayStudentRoster(
    pathway: TeacherPathway,
    filters: {
      academicClass?: TeacherClassLevel | 'all';
      academicGroup?: TeacherGroup | 'all';
      query?: string;
    } = {},
    now = Date.now()
  ): TeacherRosterStudent[] {
    const profiles = adminUsersService
      .listProfiles(pathway, now)
      .filter((p) => p.role === 'student' && p.pathway === pathway);

    const progressMap = readStudentLessonProgressMap();
    const assessments = loadAssessments(now);
    const q = (filters.query ?? '').trim().toLowerCase();

    return profiles
      .map((student) => {
        const assessment = assessments[student.id];
        const completedCount = Array.isArray(progressMap[student.id])
          ? progressMap[student.id].length
          : student.academicClass >= 9
            ? 8
            : 5;
        const totalLessons = student.academicClass >= 9 ? 23 : 16;

        return {
          id: student.id,
          fullName: student.fullName,
          email: student.email,
          pathway: student.pathway,
          academicClass: student.academicClass,
          academicGroup: student.academicGroup,
          status: student.status,
          completedLessonsCount: Math.min(completedCount, totalLessons),
          totalRecommendedLessons: totalLessons,
          marks: assessment?.marks ?? 78,
          attendanceRate: assessment?.attendanceRate ?? 90,
          attendanceStatus: assessment?.attendanceStatus ?? 'Present',
          remarks: assessment?.remarks ?? 'On track with syllabus milestones.',
          lastUpdatedAt: assessment?.updatedAt ?? student.updatedAt,
        };
      })
      .filter((row) => {
        if (filters.academicClass && filters.academicClass !== 'all') {
          if (row.academicClass !== filters.academicClass) return false;
        }
        if (filters.academicGroup && filters.academicGroup !== 'all') {
          if (row.academicGroup !== filters.academicGroup) return false;
        }
        if (q) {
          const hay = `${row.fullName} ${row.email} ${row.id} class ${row.academicClass} ${row.academicGroup ?? ''}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      });
  },

  updateStudentAssessment(
    pathway: TeacherPathway,
    studentId: string,
    patch: {
      marks: number;
      attendanceRate: number;
      attendanceStatus: AttendanceStatus;
      remarks: string;
    },
    now = Date.now()
  ): { ok: true; assessment: TeacherStudentAssessment } | { ok: false; error: string } {
    // Enforce strict pathway isolation before saving marks/attendance
    const student = adminUsersService
      .listProfiles(pathway, now)
      .find((p) => p.id === studentId && p.role === 'student' && p.pathway === pathway);
    if (!student) {
      return {
        ok: false,
        error: 'Student record not found in your active pathway.',
      };
    }

    const marks = Math.round(Number(patch.marks));
    const attendanceRate = Math.round(Number(patch.attendanceRate));
    if (Number.isNaN(marks) || marks < 0 || marks > 100) {
      return { ok: false, error: 'Marks must be a number between 0 and 100.' };
    }
    if (Number.isNaN(attendanceRate) || attendanceRate < 0 || attendanceRate > 100) {
      return { ok: false, error: 'Attendance percentage must be between 0 and 100.' };
    }

    const map = loadAssessments(now);
    const updated: TeacherStudentAssessment = {
      studentId,
      pathway,
      marks,
      attendanceRate,
      attendanceStatus: patch.attendanceStatus,
      remarks: patch.remarks.trim(),
      updatedAt: now,
    };
    map[studentId] = updated;
    saveAssessments(map);
    return { ok: true, assessment: updated };
  },

  /**
   * Fetch official Admin notices strictly scoped to the teacher's pathway
   * targeted to 'teacher' or 'both' (strictly excluding 'student'-only notices).
   */
  listOfficialAdminNotices(
    pathway: TeacherPathway,
    filters: {
      query?: string;
      audience?: 'all' | 'teacher' | 'both';
      tag?: 'all' | NoticeCategoryTag;
    } = {},
    now = Date.now()
  ): PathwayNotice[] {
    const pathwayNotices = adminNoticesService.listNotices(pathway, now);
    const q = (filters.query ?? '').trim().toLowerCase();

    return pathwayNotices.filter((notice) => {
      if (notice.pathway !== pathway) return false;
      if (notice.targetAudience === 'student') return false;

      if (filters.audience && filters.audience !== 'all') {
        if (notice.targetAudience !== filters.audience) return false;
      }
      if (filters.tag && filters.tag !== 'all') {
        if (notice.categoryTag !== filters.tag) return false;
      }
      if (q) {
        const hay = `${notice.title} ${notice.description} ${notice.categoryTag ?? ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  },

  /**
   * Teacher Class Announcements (strictly scoped to the teacher's pathway).
   */
  listClassAnnouncements(pathway: TeacherPathway, now = Date.now()): TeacherClassAnnouncement[] {
    return loadAnnouncements(now)
      .filter((a) => a.pathway === pathway)
      .sort((a, b) => b.createdAt - a.createdAt);
  },

  postClassAnnouncement(
    teacher: Pick<TeacherProfileContext, 'userId' | 'fullName' | 'pathway' | 'primarySubject'>,
    input: {
      academicClass: TeacherClassLevel;
      academicGroup: TeacherGroup | null;
      title: string;
      message: string;
      tag: TeacherAnnouncementTag;
    },
    now = Date.now()
  ): { ok: true; announcement: TeacherClassAnnouncement } | { ok: false; error: string } {
    if (input.title.trim().length < 3) {
      return { ok: false, error: 'Please enter an announcement title (at least 3 characters).' };
    }
    if (input.message.trim().length < 10) {
      return { ok: false, error: 'Please enter announcement details (at least 10 characters).' };
    }

    const list = loadAnnouncements(now);
    const created: TeacherClassAnnouncement = {
      id: `TANN-${teacher.pathway === 'bangla_version' ? 'BV' : 'EV'}-${now.toString(36).toUpperCase()}`,
      pathway: teacher.pathway,
      teacherId: teacher.userId,
      teacherName: teacher.fullName,
      academicClass: input.academicClass,
      academicGroup:
        input.academicClass >= 9 && input.academicClass <= 12 ? input.academicGroup : null,
      subject: teacher.primarySubject,
      title: input.title.trim(),
      message: input.message.trim(),
      tag: input.tag,
      createdAt: now,
    };

    list.unshift(created);
    saveAnnouncements(list);
    return { ok: true, announcement: created };
  },

  deleteClassAnnouncement(
    pathway: TeacherPathway,
    announcementId: string,
    now = Date.now()
  ): boolean {
    const list = loadAnnouncements(now);
    const next = list.filter((a) => !(a.id === announcementId && a.pathway === pathway));
    if (next.length === list.length) return false;
    saveAnnouncements(next);
    return true;
  },

  /**
   * Direct password update for the logged-in teacher inside Profile & Settings.
   */
  updateTeacherPassword(
    userId: string,
    email: string,
    currentPassword: string,
    newPassword: string,
    confirmPassword: string,
    now = Date.now()
  ): { ok: true } | { ok: false; error: string } {
    if (!currentPassword.trim()) {
      return { ok: false, error: 'Please enter your current password.' };
    }
    const passCheck = validatePassword(newPassword);
    if (!passCheck.valid) {
      return { ok: false, error: 'New password must be at least 8 characters long.' };
    }
    if (newPassword !== confirmPassword) {
      return { ok: false, error: 'New password and confirmation do not match.' };
    }

    const db = loadDatabase(now);
    const user = db.users.find(
      (u) => u.id === userId || u.email.toLowerCase() === email.toLowerCase()
    );
    if (!user) {
      return { ok: false, error: 'Teacher account record was not found.' };
    }
    if (!verifyPassword(currentPassword, user.passwordHash)) {
      return { ok: false, error: 'Your current password is incorrect.' };
    }

    const nextHash = hashPassword(newPassword);
    user.passwordHash = nextHash;
    user.mustChangePassword = false;
    saveDatabase(db);

    if (canUseLocalStorage()) {
      const raw = window.localStorage.getItem(ADMIN_USERS_STORAGE_KEY);
      if (raw) {
        try {
          const parsed = JSON.parse(raw) as SharedAdminUsersStore;
          const profile = parsed.profiles.find(
            (p) => p.id === userId || p.email.toLowerCase() === email.toLowerCase()
          );
          if (profile) {
            profile.passwordHash = nextHash;
            profile.updatedAt = now;
            writeSharedAdminUsersStore(parsed);
          }
        } catch {
          // Ignore malformed store
        }
      }
    }

    return { ok: true };
  },
};
