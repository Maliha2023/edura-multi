import { loadDatabase, saveDatabase } from './storage';
import type { AuthSession, UserAccount } from '../types/domain';
import { hashPassword, verifyPassword } from '../utils/crypto';
import { validateEmail, validateFullName, validatePassword } from '../utils/validation';

export type AliaPathway = 'alia';

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

export type AliaNoticeAudience = 'student' | 'teacher' | 'both';
export type AliaNoticeTag = 'General' | 'Exam' | 'Urgent';
export type AliaRegistrationType = 'coupon_auto' | 'manual_admin';
export type AliaAttendanceStatus = 'Present' | 'Late' | 'Absent';

export type AliaTeacherModuleType =
  | 'Lesson Notes'
  | 'Kitab / Chapter Guide'
  | 'Worksheet'
  | 'Board CQ Practice'
  | 'Syllabus Module';

export type AliaTeacherAnnouncementTag =
  | 'Study Update'
  | 'Homework'
  | 'Exam Prep'
  | 'Schedule Change';

export interface AliaCouponRecord {
  id: string;
  code: string;
  pathway: AliaPathway;
  role: 'student' | 'teacher';
  status: 'active' | 'used' | 'expired';
  createdAt: number;
  expiresAt: number;
  usedAt?: number;
  issuedBy: string;
}

export interface AliaPendingRecord {
  id: string;
  role: 'student' | 'teacher';
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

export interface AliaProfileRecord {
  id: string;
  role: 'student' | 'teacher';
  pathway: AliaPathway;
  fullName: string;
  email: string;
  passwordHash: string;
  marhala: AliaMarhala;
  assignedMarhalas?: AliaMarhala[];
  department: AliaDepartment;
  primarySubject?: string;
  status: 'active' | 'suspended';
  registrationType: AliaRegistrationType;
  couponCode?: string;
  joinedAt: number;
  updatedAt?: number;
}

export interface AliaOfficialNotice {
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

export interface AliaActivityLog {
  id: string;
  pathway: AliaPathway;
  category: 'coupon' | 'approval' | 'directory' | 'notice' | 'security';
  summary: string;
  actorEmail: string;
  createdAt: number;
}

interface AliaSharedStore {
  coupons: AliaCouponRecord[];
  pending: AliaPendingRecord[];
  profiles: AliaProfileRecord[];
  notices: AliaOfficialNotice[];
  activities: AliaActivityLog[];
}

export interface AliaTeacherContext {
  userId: string;
  fullName: string;
  email: string;
  pathway: AliaPathway;
  primarySubject: string;
  assignedMarhalas: AliaMarhala[];
  department: AliaDepartment;
  registrationType: AliaRegistrationType;
  couponCode?: string;
  joinedAt: number;
}

export interface AliaDemoTeacherPreset {
  pathway: AliaPathway;
  fullName: string;
  email: string;
  password: string;
  primarySubject: string;
  assignedMarhalas: AliaMarhala[];
  department: AliaDepartment;
}

export interface AliaTeacherModuleResource {
  id: string;
  pathway: AliaPathway;
  teacherEmail: string;
  subject: string;
  marhala: AliaMarhala;
  department: AliaDepartment;
  title: string;
  type: AliaTeacherModuleType;
  summary: string;
  published: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface AliaTeacherRosterStudent {
  id: string;
  fullName: string;
  email: string;
  marhala: AliaMarhala;
  department: AliaDepartment;
  status: 'active' | 'suspended';
  completedLessonsCount: number;
  totalRecommendedLessons: number;
  marks: number;
  attendanceRate: number;
  attendanceStatus: AliaAttendanceStatus;
  remarks: string;
}

export interface AliaTeacherScheduleSession {
  id: string;
  timeLabel: string;
  marhala: AliaMarhala;
  department: AliaDepartment;
  roomLabel: string;
  topic: string;
}

export interface AliaTeacherClassAnnouncement {
  id: string;
  pathway: AliaPathway;
  teacherName: string;
  teacherEmail: string;
  subject: string;
  marhala: AliaMarhala;
  department: AliaDepartment;
  title: string;
  message: string;
  tag: AliaTeacherAnnouncementTag;
  createdAt: number;
}

export interface AliaTeacherCouponValidationResult {
  ok: boolean;
  coupon?: AliaCouponRecord;
  message: string;
}

export interface AliaTeacherRegistrationInput {
  couponCode: string;
  fullName: string;
  email: string;
  password: string;
  assignedMarhalas: AliaMarhala[];
  primarySubject: string;
  department: AliaDepartment;
}

export const ALIA_TEACHER_MARHALA_OPTIONS: AliaMarhala[] = [
  'Ebtedayee (Classes 1–5)',
  'Dakhil (Classes 6–10)',
  'Alim (Classes 11–12)',
  'Fazil (Degree / Pass)',
  'Kamil (Masters)',
];

export const ALIA_ALL_DEPARTMENT_OPTIONS: AliaDepartment[] = [
  'General',
  'Science',
  'Muzabbid Mahire Tajweed',
  'Hifzul Quran',
  'Hadith & Tafsir',
  'Fiqh & Usul',
];

export const ALIA_TEACHER_PRIMARY_SUBJECTS: string[] = [
  'Hadith Sharif',
  'Quran Majeed & Tajweed',
  'Arabic Grammar & Literature',
  'Fiqh & Usul',
  'Islamic History',
  'Physics',
  'Mathematics',
  'ICT',
];

export const ALIA_TEACHER_MODULE_TYPES: AliaTeacherModuleType[] = [
  'Lesson Notes',
  'Kitab / Chapter Guide',
  'Worksheet',
  'Board CQ Practice',
  'Syllabus Module',
];

export const ALIA_TEACHER_ANNOUNCEMENT_TAGS: AliaTeacherAnnouncementTag[] = [
  'Study Update',
  'Homework',
  'Exam Prep',
  'Schedule Change',
];

const MARHALA_DEPARTMENTS: Record<AliaMarhala, AliaDepartment[]> = {
  'Ebtedayee (Classes 1–5)': ['General', 'Hifzul Quran', 'Muzabbid Mahire Tajweed'],
  'Dakhil (Classes 6–10)': ['General', 'Science', 'Muzabbid Mahire Tajweed'],
  'Alim (Classes 11–12)': ['General', 'Science', 'Muzabbid Mahire Tajweed'],
  'Fazil (Degree / Pass)': ['Hadith & Tafsir', 'Fiqh & Usul', 'General'],
  'Kamil (Masters)': ['Hadith & Tafsir', 'Fiqh & Usul', 'General'],
};

const ALIA_SHARED_STORE_KEY = 'edura_alia_admin_workspace_v1';
const ALIA_STUDENT_PROGRESS_KEY = 'edura_alia_student_progress_v1';
const ALIA_TEACHER_MODULES_KEY = 'edura_alia_teacher_modules_v1';
const ALIA_TEACHER_ASSESSMENTS_KEY = 'edura_alia_teacher_assessments_v1';
const ALIA_TEACHER_ANNOUNCEMENTS_KEY = 'edura_alia_teacher_announcements_v1';
const FORTY_EIGHT_HOURS_MS = 48 * 60 * 60 * 1000;

interface AssessmentOverride {
  marks: number;
  attendanceRate: number;
  attendanceStatus: AliaAttendanceStatus;
  remarks: string;
  updatedAt: number;
}

let memorySharedStore: AliaSharedStore | null = null;
let memoryModules: AliaTeacherModuleResource[] | null = null;
let memoryAssessments: Record<string, AssessmentOverride> = {};
let memoryAnnouncements: AliaTeacherClassAnnouncement[] | null = null;

function canUseLocalStorage(): boolean {
  try {
    return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
  } catch {
    return false;
  }
}

export function isAliaTeacherPathway(raw?: string | null): boolean {
  if (!raw) return false;
  const normalized = raw.trim().toLowerCase();
  return (
    normalized === 'alia' ||
    normalized === 'alia madrasa' ||
    normalized === 'alia_madrasa' ||
    normalized === 'alia panel'
  );
}

export function resolveAliaTeacherPathway(raw?: string | null): AliaPathway | null {
  return isAliaTeacherPathway(raw) ? 'alia' : null;
}

export function getAliaTeacherPathwayLabel(): string {
  return 'Alia Madrasa';
}

export function getAliaTeacherBoardName(): string {
  return 'Bangladesh Madrasah Education Board (BMEB)';
}

export function getShortAliaMarhalaLabel(marhala: AliaMarhala): string {
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

export function getDepartmentsForAliaMarhala(marhala: AliaMarhala): AliaDepartment[] {
  return [...(MARHALA_DEPARTMENTS[marhala] ?? ['General'])];
}

export function getDepartmentsForAssignedMarhalas(marhalas: AliaMarhala[]): AliaDepartment[] {
  if (!marhalas.length) return ['General'];
  const allowed = new Set<AliaDepartment>();
  for (const m of marhalas) {
    for (const dept of getDepartmentsForAliaMarhala(m)) {
      allowed.add(dept);
    }
  }
  return ALIA_ALL_DEPARTMENT_OPTIONS.filter((d) => allowed.has(d));
}

export function formatAssignedAliaMarhalasSummary(marhalas: AliaMarhala[]): string {
  if (!marhalas.length) return 'Dakhil';
  return marhalas.map(getShortAliaMarhalaLabel).join(', ');
}

export function formatAliaTeacherContextBadge(primarySubject: string): string {
  return `Alia Madrasa • ${primarySubject || 'Hadith Sharif'}`;
}

export function getDemoAliaTeacherPreset(): AliaDemoTeacherPreset {
  return {
    pathway: 'alia',
    fullName: 'Maulana Abdul Karim',
    email: 'abdul.karim@alia-teacher.edu.bd',
    password: 'Teacher@1234',
    primarySubject: 'Hadith Sharif',
    assignedMarhalas: ['Dakhil (Classes 6–10)', 'Alim (Classes 11–12)', 'Fazil (Degree / Pass)'],
    department: 'General',
  };
}

function createBaselineAliaStoreWithTeachers(now: number): AliaSharedStore {
  const hour = 60 * 60 * 1000;
  const day = 24 * hour;
  const teacherPreset = getDemoAliaTeacherPreset();
  const teacherHash = hashPassword(teacherPreset.password);
  const studentHash = hashPassword('Student@1234');

  return {
    coupons: [
      {
        id: 'ALIA-CPN-S01',
        code: 'S-74201',
        pathway: 'alia',
        role: 'student',
        status: 'active',
        createdAt: now - 3 * hour,
        expiresAt: now + 45 * hour,
        issuedBy: 'admin@alia-madrasa.edu.bd',
      },
      {
        id: 'ALIA-CPN-T01',
        code: 'T-74310',
        pathway: 'alia',
        role: 'teacher',
        status: 'active',
        createdAt: now - 4 * hour,
        expiresAt: now + 44 * hour,
        issuedBy: 'admin@alia-madrasa.edu.bd',
      },
      {
        id: 'ALIA-CPN-T02',
        code: 'T-74325',
        pathway: 'alia',
        role: 'teacher',
        status: 'active',
        createdAt: now - 2 * hour,
        expiresAt: now + 46 * hour,
        issuedBy: 'admin@alia-madrasa.edu.bd',
      },
      {
        id: 'ALIA-CPN-T03',
        code: 'T-74190',
        pathway: 'alia',
        role: 'teacher',
        status: 'used',
        createdAt: now - 26 * hour,
        expiresAt: now + 22 * hour,
        usedAt: now - 16 * hour,
        issuedBy: 'admin@alia-madrasa.edu.bd',
      },
      {
        id: 'ALIA-CPN-T04',
        code: 'T-74077',
        pathway: 'alia',
        role: 'teacher',
        status: 'expired',
        createdAt: now - 72 * hour,
        expiresAt: now - 24 * hour,
        issuedBy: 'admin@alia-madrasa.edu.bd',
      },
    ],
    pending: [
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
        submittedAt: now - 16 * hour,
        expiresAt: now + 32 * hour,
      },
    ],
    profiles: [
      {
        id: 'alia-teacher-demo-01',
        role: 'teacher',
        pathway: 'alia',
        fullName: teacherPreset.fullName,
        email: teacherPreset.email,
        passwordHash: teacherHash,
        marhala: 'Alim (Classes 11–12)',
        assignedMarhalas: teacherPreset.assignedMarhalas,
        department: teacherPreset.department,
        primarySubject: teacherPreset.primarySubject,
        status: 'active',
        registrationType: 'coupon_auto',
        couponCode: 'T-74010',
        joinedAt: now - 45 * day,
      },
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
      },
    ],
    notices: [
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
        id: 'ALIA-NTC-04',
        pathway: 'alia',
        title: 'Urgent: BMEB E-SIF Registration Verification & Photo Check',
        description:
          'All Alia Madrasa faculty and class Ustads must verify student Marhala and Department entries on the BMEB E-SIF registration roster before Friday 2:00 PM.',
        audience: 'both',
        marhala: 'all',
        department: 'all',
        tag: 'Urgent',
        createdAt: now - 5 * hour,
        updatedAt: now - 5 * hour,
      },
      {
        id: 'ALIA-NTC-06',
        pathway: 'alia',
        title: 'Faculty Moderation Meeting for Alim & Dakhil Answer Scripts',
        description:
          'Internal faculty circular: All Muhaddis and subject teachers are requested to attend the script moderation briefing in the Teachers’ Common Room on Saturday at 10:30 AM. Please bring sample CQ marking guides.',
        audience: 'teacher',
        marhala: 'all',
        department: 'all',
        tag: 'General',
        createdAt: now - 12 * hour,
        updatedAt: now - 12 * hour,
      },
      {
        id: 'ALIA-NTC-07',
        pathway: 'alia',
        title: 'BMEB Question Bank Submission Deadline for Dakhil & Alim Term Test',
        description:
          'Teachers Only: Submit two sealed sets of Creative Questions (CQ) and 30 MCQs per assigned Marhala to the Examination Controller by Tuesday 3:00 PM.',
        audience: 'teacher',
        marhala: 'all',
        department: 'all',
        tag: 'Exam',
        createdAt: now - 15 * hour,
        updatedAt: now - 15 * hour,
      },
      {
        id: 'ALIA-NTC-02',
        pathway: 'alia',
        title: 'Dakhil Science Practical Lab & Experiment Notebook Submission',
        description:
          'Student-only circular: Dakhil Science department students must submit their completed Physics and Chemistry practical notebooks before Wednesday.',
        audience: 'student',
        marhala: 'Dakhil (Classes 6–10)',
        department: 'Science',
        tag: 'Exam',
        createdAt: now - 18 * hour,
        updatedAt: now - 18 * hour,
      },
    ],
    activities: [],
  };
}

function ensureTeacherSeedsInSharedStore(store: AliaSharedStore, now: number): boolean {
  const hour = 60 * 60 * 1000;
  const day = 24 * hour;
  const preset = getDemoAliaTeacherPreset();
  let mutated = false;

  const ensureCoupon = (coupon: AliaCouponRecord) => {
    if (!store.coupons.some((c) => c.code.toUpperCase() === coupon.code.toUpperCase())) {
      store.coupons.push(coupon);
      mutated = true;
    }
  };

  ensureCoupon({
    id: 'ALIA-CPN-T01',
    code: 'T-74310',
    pathway: 'alia',
    role: 'teacher',
    status: 'active',
    createdAt: now - 4 * hour,
    expiresAt: now + 44 * hour,
    issuedBy: 'admin@alia-madrasa.edu.bd',
  });
  ensureCoupon({
    id: 'ALIA-CPN-T02',
    code: 'T-74325',
    pathway: 'alia',
    role: 'teacher',
    status: 'active',
    createdAt: now - 2 * hour,
    expiresAt: now + 46 * hour,
    issuedBy: 'admin@alia-madrasa.edu.bd',
  });
  ensureCoupon({
    id: 'ALIA-CPN-T03',
    code: 'T-74190',
    pathway: 'alia',
    role: 'teacher',
    status: 'used',
    createdAt: now - 26 * hour,
    expiresAt: now + 22 * hour,
    usedAt: now - 16 * hour,
    issuedBy: 'admin@alia-madrasa.edu.bd',
  });
  ensureCoupon({
    id: 'ALIA-CPN-T04',
    code: 'T-74077',
    pathway: 'alia',
    role: 'teacher',
    status: 'expired',
    createdAt: now - 72 * hour,
    expiresAt: now - 24 * hour,
    issuedBy: 'admin@alia-madrasa.edu.bd',
  });

  if (
    !store.profiles.some(
      (p) =>
        p.pathway === 'alia' &&
        p.role === 'teacher' &&
        p.email.toLowerCase() === preset.email.toLowerCase()
    )
  ) {
    store.profiles.push({
      id: 'alia-teacher-demo-01',
      role: 'teacher',
      pathway: 'alia',
      fullName: preset.fullName,
      email: preset.email,
      passwordHash: hashPassword(preset.password),
      marhala: 'Alim (Classes 11–12)',
      assignedMarhalas: preset.assignedMarhalas,
      department: preset.department,
      primarySubject: preset.primarySubject,
      status: 'active',
      registrationType: 'coupon_auto',
      couponCode: 'T-74010',
      joinedAt: now - 45 * day,
    });
    mutated = true;
  }

  // Ensure a Kamil student exists in roster for rich multi-marhala filtering
  if (!store.profiles.some((p) => p.pathway === 'alia' && p.marhala === 'Kamil (Masters)')) {
    store.profiles.push({
      id: 'alia-student-05',
      role: 'student',
      pathway: 'alia',
      fullName: 'Nusrat Jahan Mim',
      email: 'nusrat.mim@alia-student.edu.bd',
      passwordHash: hashPassword('Student@1234'),
      marhala: 'Kamil (Masters)',
      department: 'Fiqh & Usul',
      status: 'active',
      registrationType: 'coupon_auto',
      couponCode: 'S-74031',
      joinedAt: now - 52 * day,
    });
    mutated = true;
  }

  // Ensure Teachers-only exam notice exists
  if (!store.notices.some((n) => n.id === 'ALIA-NTC-07')) {
    store.notices.push({
      id: 'ALIA-NTC-07',
      pathway: 'alia',
      title: 'BMEB Question Bank Submission Deadline for Dakhil & Alim Term Test',
      description:
        'Teachers Only: Submit two sealed sets of Creative Questions (CQ) and 30 MCQs per assigned Marhala to the Examination Controller by Tuesday 3:00 PM.',
      audience: 'teacher',
      marhala: 'all',
      department: 'all',
      tag: 'Exam',
      createdAt: now - 15 * hour,
      updatedAt: now - 15 * hour,
    });
    mutated = true;
  }

  return mutated;
}

function readSharedAliaStore(now = Date.now()): AliaSharedStore {
  if (canUseLocalStorage()) {
    const raw = window.localStorage.getItem(ALIA_SHARED_STORE_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as AliaSharedStore;
        if (
          parsed &&
          Array.isArray(parsed.coupons) &&
          Array.isArray(parsed.pending) &&
          Array.isArray(parsed.profiles) &&
          Array.isArray(parsed.notices) &&
          Array.isArray(parsed.activities)
        ) {
          if (ensureTeacherSeedsInSharedStore(parsed, now)) {
            window.localStorage.setItem(ALIA_SHARED_STORE_KEY, JSON.stringify(parsed));
          }
          return parsed;
        }
      } catch {
        // Re-seed below
      }
    }
    const seeded = createBaselineAliaStoreWithTeachers(now);
    window.localStorage.setItem(ALIA_SHARED_STORE_KEY, JSON.stringify(seeded));
    return seeded;
  }

  if (!memorySharedStore) {
    memorySharedStore = createBaselineAliaStoreWithTeachers(now);
  } else {
    ensureTeacherSeedsInSharedStore(memorySharedStore, now);
  }
  return memorySharedStore;
}

function writeSharedAliaStore(store: AliaSharedStore): void {
  if (canUseLocalStorage()) {
    window.localStorage.setItem(ALIA_SHARED_STORE_KEY, JSON.stringify(store));
  } else {
    memorySharedStore = store;
  }
}

function createInitialTeacherModules(now: number): AliaTeacherModuleResource[] {
  const day = 24 * 60 * 60 * 1000;
  const preset = getDemoAliaTeacherPreset();
  return [
    {
      id: 'ALIA-MOD-01',
      pathway: 'alia',
      teacherEmail: preset.email,
      subject: 'Hadith Sharif',
      marhala: 'Alim (Classes 11–12)',
      department: 'General',
      title: 'Mishkat al-Masabih: Kitab al-Iman & Kitab al-Ilm Kitab Guide',
      type: 'Kitab / Chapter Guide',
      summary:
        'Line-by-line Arabic text commentary, narrator notes (Sanad), and BMEB Alim Board structured questions for Chapters 1–3.',
      published: true,
      createdAt: now - 3 * day,
      updatedAt: now - 3 * day,
    },
    {
      id: 'ALIA-MOD-02',
      pathway: 'alia',
      teacherEmail: preset.email,
      subject: 'Hadith Sharif',
      marhala: 'Dakhil (Classes 6–10)',
      department: 'General',
      title: 'Usul al-Hadith Classification Worksheet (Sahih, Hasan, Da’if)',
      type: 'Worksheet',
      summary:
        'Practice chart distinguishing Mutawatir, Mashhur, Aziz, and Gharib traditions with 15 BMEB MCQ drill questions.',
      published: true,
      createdAt: now - 2 * day,
      updatedAt: now - 2 * day,
    },
    {
      id: 'ALIA-MOD-03',
      pathway: 'alia',
      teacherEmail: preset.email,
      subject: 'Hadith Sharif',
      marhala: 'Fazil (Degree / Pass)',
      department: 'Hadith & Tafsir',
      title: 'Ilm al-Jarh wa al-Ta’dil Seminar Notes & Reading List',
      type: 'Lesson Notes',
      summary:
        'Draft lecture handout reviewing narrator grading terminology used by Imam Bukhari, Imam Muslim, and Imam Tirmidhi.',
      published: false,
      createdAt: now - 1 * day,
      updatedAt: now - 1 * day,
    },
  ];
}

function loadModules(now = Date.now()): AliaTeacherModuleResource[] {
  if (canUseLocalStorage()) {
    const raw = window.localStorage.getItem(ALIA_TEACHER_MODULES_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as AliaTeacherModuleResource[];
        if (Array.isArray(parsed)) return parsed;
      } catch {
        // Fallback below
      }
    }
    const seeded = createInitialTeacherModules(now);
    window.localStorage.setItem(ALIA_TEACHER_MODULES_KEY, JSON.stringify(seeded));
    return seeded;
  }
  if (!memoryModules) {
    memoryModules = createInitialTeacherModules(now);
  }
  return memoryModules;
}

function saveModules(modules: AliaTeacherModuleResource[]): void {
  if (canUseLocalStorage()) {
    window.localStorage.setItem(ALIA_TEACHER_MODULES_KEY, JSON.stringify(modules));
  } else {
    memoryModules = modules;
  }
}

function loadAssessments(): Record<string, AssessmentOverride> {
  if (canUseLocalStorage()) {
    const raw = window.localStorage.getItem(ALIA_TEACHER_ASSESSMENTS_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as Record<string, AssessmentOverride>;
        if (parsed && typeof parsed === 'object') return parsed;
      } catch {
        // Ignore parse error
      }
    }
    return {};
  }
  return memoryAssessments;
}

function saveAssessments(map: Record<string, AssessmentOverride>): void {
  if (canUseLocalStorage()) {
    window.localStorage.setItem(ALIA_TEACHER_ASSESSMENTS_KEY, JSON.stringify(map));
  } else {
    memoryAssessments = map;
  }
}

function createInitialAnnouncements(now: number): AliaTeacherClassAnnouncement[] {
  const hour = 60 * 60 * 1000;
  const preset = getDemoAliaTeacherPreset();
  return [
    {
      id: 'ALIA-ANN-01',
      pathway: 'alia',
      teacherName: preset.fullName,
      teacherEmail: preset.email,
      subject: preset.primarySubject,
      marhala: 'Alim (Classes 11–12)',
      department: 'General',
      title: 'Mishkat al-Masabih Oral Translation & Sanad Review',
      message:
        'Please revise the first 8 Hadiths from Kitab al-Ilm before Tuesday’s class. We will practice BMEB Alim structured translation and juristic extraction.',
      tag: 'Study Update',
      createdAt: now - 10 * hour,
    },
    {
      id: 'ALIA-ANN-02',
      pathway: 'alia',
      teacherName: preset.fullName,
      teacherEmail: preset.email,
      subject: preset.primarySubject,
      marhala: 'Dakhil (Classes 6–10)',
      department: 'Science',
      title: 'Dakhil Hadith Sharif Pre-Test Homework Sheet',
      message:
        'Complete the 20-mark short question worksheet on Usul al-Hadith classifications and bring your signed notebook on Thursday morning.',
      tag: 'Homework',
      createdAt: now - 26 * hour,
    },
  ];
}

function loadAnnouncements(now = Date.now()): AliaTeacherClassAnnouncement[] {
  if (canUseLocalStorage()) {
    const raw = window.localStorage.getItem(ALIA_TEACHER_ANNOUNCEMENTS_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as AliaTeacherClassAnnouncement[];
        if (Array.isArray(parsed)) return parsed;
      } catch {
        // Fallback below
      }
    }
    const seeded = createInitialAnnouncements(now);
    window.localStorage.setItem(ALIA_TEACHER_ANNOUNCEMENTS_KEY, JSON.stringify(seeded));
    return seeded;
  }
  if (!memoryAnnouncements) {
    memoryAnnouncements = createInitialAnnouncements(now);
  }
  return memoryAnnouncements;
}

function saveAnnouncements(list: AliaTeacherClassAnnouncement[]): void {
  if (canUseLocalStorage()) {
    window.localStorage.setItem(ALIA_TEACHER_ANNOUNCEMENTS_KEY, JSON.stringify(list));
  } else {
    memoryAnnouncements = list;
  }
}

function getStudentCompletedLessonCount(userId: string): number {
  if (!canUseLocalStorage()) return 0;
  try {
    const raw = window.localStorage.getItem(ALIA_STUDENT_PROGRESS_KEY);
    if (!raw) return 0;
    const parsed = JSON.parse(raw) as Record<string, string[]>;
    const list = parsed[`alia:${userId}`];
    return Array.isArray(list) ? list.length : 0;
  } catch {
    return 0;
  }
}

export function getDemoAliaTeacherCouponHint(now = Date.now()): string {
  const store = readSharedAliaStore(now);
  const active = store.coupons.find(
    (c) =>
      c.pathway === 'alia' &&
      c.role === 'teacher' &&
      c.status === 'active' &&
      c.expiresAt > now
  );
  return active ? active.code : 'T-74310';
}

export const aliaTeacherService = {
  validateCoupon(rawCode: string, now = Date.now()): AliaTeacherCouponValidationResult {
    const code = rawCode.trim().toUpperCase();
    if (!code) {
      return {
        ok: false,
        message: 'Please enter your Alia Madrasa teacher coupon code (e.g., T-74310).',
      };
    }

    if (/^S-\d{5}$/.test(code)) {
      return {
        ok: false,
        message:
          'This code is a Student coupon (S-XXXXX). Please enter a Teacher coupon starting with T- (e.g., T-74310).',
      };
    }

    if (!/^T-\d{5}$/.test(code)) {
      return {
        ok: false,
        message: 'Invalid coupon format. Teacher coupons must follow the T-XXXXX format (e.g., T-74310).',
      };
    }

    const store = readSharedAliaStore(now);
    const match = store.coupons.find(
      (c) => c.pathway === 'alia' && c.code.toUpperCase() === code
    );

    if (!match) {
      return {
        ok: false,
        message:
          'Coupon not found in the Alia Madrasa portal. Please verify the code with your Alia Madrasa Administrator.',
      };
    }

    if (match.role !== 'teacher') {
      return {
        ok: false,
        message: 'This coupon is not assigned for Teacher enrollment.',
      };
    }

    if (match.status === 'used') {
      return {
        ok: false,
        message:
          'This teacher coupon has already been redeemed. Request a new T-XXXXX code from your Alia Madrasa Admin.',
      };
    }

    if (match.status === 'expired' || match.expiresAt <= now) {
      return {
        ok: false,
        message:
          'This teacher coupon has expired (48-hour validity window passed). Please request a fresh code.',
      };
    }

    return {
      ok: true,
      coupon: match,
      message: 'Valid Alia Madrasa teacher coupon verified.',
    };
  },

  submitCouponRegistration(
    input: AliaTeacherRegistrationInput,
    now = Date.now()
  ): { ok: true; registration: AliaPendingRecord } | { ok: false; error: string } {
    const couponCheck = this.validateCoupon(input.couponCode, now);
    if (!couponCheck.ok || !couponCheck.coupon) {
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

    const validMarhalas = Array.from(
      new Set(
        input.assignedMarhalas.filter((m) =>
          (ALIA_TEACHER_MARHALA_OPTIONS as string[]).includes(m)
        )
      )
    );
    if (validMarhalas.length === 0) {
      return { ok: false, error: 'Please select at least one assigned Alia Marhala.' };
    }

    const subject = input.primarySubject.trim();
    if (!subject) {
      return { ok: false, error: 'Please select your primary teaching subject.' };
    }

    const allowedDepartments = getDepartmentsForAssignedMarhalas(validMarhalas);
    if (!allowedDepartments.includes(input.department)) {
      return {
        ok: false,
        error: `Please select a valid Department / Stream for ${formatAssignedAliaMarhalasSummary(validMarhalas)}.`,
      };
    }

    const normalizedEmail = input.email.trim().toLowerCase();
    const store = readSharedAliaStore(now);

    if (
      store.pending.some(
        (p) => p.pathway === 'alia' && p.email.toLowerCase() === normalizedEmail
      )
    ) {
      return {
        ok: false,
        error: `A faculty application for ${normalizedEmail} is already awaiting approval in the Alia Madrasa queue.`,
      };
    }

    if (
      store.profiles.some(
        (p) => p.pathway === 'alia' && p.email.toLowerCase() === normalizedEmail
      )
    ) {
      return {
        ok: false,
        error: `An account with ${normalizedEmail} already exists in Alia Madrasa. Try signing in instead.`,
      };
    }

    const registration: AliaPendingRecord = {
      id: `ALIA-PND-T${now % 100000}`,
      role: 'teacher',
      pathway: 'alia',
      fullName: input.fullName.trim(),
      email: normalizedEmail,
      marhala: validMarhalas[0],
      assignedMarhalas: validMarhalas,
      department: input.department,
      primarySubject: subject,
      couponCode: couponCheck.coupon.code,
      submittedAt: now,
      expiresAt: now + FORTY_EIGHT_HOURS_MS,
    };

    store.pending.unshift(registration);
    store.coupons = store.coupons.map((c) =>
      c.pathway === 'alia' && c.code.toUpperCase() === couponCheck.coupon!.code.toUpperCase()
        ? { ...c, status: 'used', usedAt: now }
        : c
    );
    store.activities.unshift({
      id: `ALIA-ACT-T-${now}-${Math.floor(Math.random() * 1000)}`,
      pathway: 'alia',
      category: 'approval',
      summary: `New Alia Madrasa teacher application submitted by ${registration.fullName} (${registration.primarySubject} · ${formatAssignedAliaMarhalasSummary(validMarhalas)} · ${registration.couponCode}).`,
      actorEmail: normalizedEmail,
      createdAt: now,
    });
    if (store.activities.length > 80) {
      store.activities = store.activities.slice(0, 80);
    }

    writeSharedAliaStore(store);
    return { ok: true, registration };
  },

  /**
   * Synchronizes an active Alia Madrasa teacher account into edura_multi_db_v1
   * so AuthContext.login() works cleanly without modifying authService.ts or other pathways.
   */
  prepareAliaTeacherAccountForLogin(
    rawEmail: string,
    rawPassword: string,
    now = Date.now()
  ): void {
    const email = rawEmail.trim().toLowerCase();
    if (!email) return;

    const store = readSharedAliaStore(now);
    const preset = getDemoAliaTeacherPreset();

    const directoryMatch = store.profiles.find(
      (p) => p.pathway === 'alia' && p.role === 'teacher' && p.email.toLowerCase() === email
    );

    if (directoryMatch && directoryMatch.status === 'suspended') {
      return;
    }

    const isPresetLogin = email === preset.email.toLowerCase();
    if (!directoryMatch && !isPresetLogin) {
      return;
    }

    const fullName = directoryMatch?.fullName ?? preset.fullName;
    const userId = directoryMatch?.id ?? 'alia-teacher-demo-01';

    const db = loadDatabase(now);
    const existingIdx = db.users.findIndex(
      (u) => u.role === 'teacher' && u.email.toLowerCase() === email
    );

    if (existingIdx === -1) {
      const passwordToStore =
        isPresetLogin && rawPassword === preset.password
          ? hashPassword(preset.password)
          : directoryMatch && verifyPassword(rawPassword, directoryMatch.passwordHash)
            ? directoryMatch.passwordHash
            : directoryMatch?.passwordHash ?? hashPassword(preset.password);

      const account: UserAccount = {
        id: userId,
        role: 'teacher',
        fullName,
        email,
        passwordHash: passwordToStore,
        mustChangePassword: false,
        preferredLanguage: 'en',
        createdAt: directoryMatch?.joinedAt ?? now - 45 * 24 * 60 * 60 * 1000,
        educationStream: 'Bangladesh Madrasa Education',
        pathway: 'Alia',
      };
      db.users.push(account);
      saveDatabase(db);
    }
  },

  resolveAliaTeacherContext(
    session: AuthSession,
    profile?: Omit<UserAccount, 'passwordHash'> | null,
    now = Date.now()
  ): AliaTeacherContext | null {
    if (session.role !== 'teacher') return null;

    const pathway =
      resolveAliaTeacherPathway(session.selectedPathway) ??
      resolveAliaTeacherPathway(profile?.pathway);
    if (!pathway) return null;

    const store = readSharedAliaStore(now);
    const email = session.email.trim().toLowerCase();
    const match = store.profiles.find(
      (p) => p.pathway === 'alia' && p.role === 'teacher' && p.email.toLowerCase() === email
    );
    const preset = getDemoAliaTeacherPreset();

    if (match) {
      const assigned =
        match.assignedMarhalas && match.assignedMarhalas.length > 0
          ? match.assignedMarhalas
          : [match.marhala];
      return {
        userId: match.id,
        fullName: match.fullName,
        email: match.email,
        pathway: 'alia',
        primarySubject: match.primarySubject || preset.primarySubject,
        assignedMarhalas: assigned,
        department: match.department,
        registrationType: match.registrationType,
        couponCode: match.couponCode,
        joinedAt: match.joinedAt,
      };
    }

    return {
      userId: session.userId,
      fullName: session.fullName || preset.fullName,
      email: session.email || preset.email,
      pathway: 'alia',
      primarySubject: preset.primarySubject,
      assignedMarhalas: preset.assignedMarhalas,
      department: preset.department,
      registrationType: 'coupon_auto',
      joinedAt: profile?.createdAt ?? session.loggedInAt,
    };
  },

  listModules(now = Date.now()): AliaTeacherModuleResource[] {
    return loadModules(now)
      .filter((m) => m.pathway === 'alia')
      .sort((a, b) => b.updatedAt - a.updatedAt);
  },

  createModule(
    teacher: AliaTeacherContext,
    input: {
      marhala: AliaMarhala;
      department: AliaDepartment;
      title: string;
      type: AliaTeacherModuleType;
      summary: string;
      published: boolean;
    },
    now = Date.now()
  ): { ok: true; module: AliaTeacherModuleResource } | { ok: false; error: string } {
    const title = input.title.trim();
    const summary = input.summary.trim();
    if (title.length < 3) {
      return { ok: false, error: 'Module title must be at least 3 characters long.' };
    }
    if (summary.length < 10) {
      return {
        ok: false,
        error: 'Please enter a brief syllabus scope or kitab guide summary (at least 10 characters).',
      };
    }
    if (!getDepartmentsForAliaMarhala(input.marhala).includes(input.department)) {
      return {
        ok: false,
        error: `Department "${input.department}" is not valid for ${getShortAliaMarhalaLabel(input.marhala)}.`,
      };
    }

    const created: AliaTeacherModuleResource = {
      id: `ALIA-MOD-${now}-${Math.floor(Math.random() * 1000)}`,
      pathway: 'alia',
      teacherEmail: teacher.email,
      subject: teacher.primarySubject,
      marhala: input.marhala,
      department: input.department,
      title,
      type: input.type,
      summary,
      published: input.published,
      createdAt: now,
      updatedAt: now,
    };

    const next = [created, ...loadModules(now)];
    saveModules(next);
    return { ok: true, module: created };
  },

  toggleModulePublished(moduleId: string, now = Date.now()): AliaTeacherModuleResource[] {
    const next = loadModules(now).map((m) =>
      m.id === moduleId ? { ...m, published: !m.published, updatedAt: now } : m
    );
    saveModules(next);
    return next.filter((m) => m.pathway === 'alia').sort((a, b) => b.updatedAt - a.updatedAt);
  },

  deleteModule(moduleId: string, now = Date.now()): AliaTeacherModuleResource[] {
    const next = loadModules(now).filter((m) => m.id !== moduleId);
    saveModules(next);
    return next.filter((m) => m.pathway === 'alia').sort((a, b) => b.updatedAt - a.updatedAt);
  },

  listStudentRoster(now = Date.now()): AliaTeacherRosterStudent[] {
    const store = readSharedAliaStore(now);
    const overrides = loadAssessments();

    const defaultScores: Record<
      string,
      { marks: number; attendanceRate: number; attendanceStatus: AliaAttendanceStatus; remarks: string; completed: number; total: number }
    > = {
      'alia-student-demo-01': {
        marks: 88,
        attendanceRate: 94,
        attendanceStatus: 'Present',
        remarks: 'Strong performance in Dakhil Hadith & Science coursework.',
        completed: 6,
        total: 21,
      },
      'alia-student-02': {
        marks: 84,
        attendanceRate: 91,
        attendanceStatus: 'Present',
        remarks: 'Consistent Mishkat al-Masabih translation and Arabic syntax.',
        completed: 9,
        total: 18,
      },
      'alia-student-03': {
        marks: 78,
        attendanceRate: 86,
        attendanceStatus: 'Late',
        remarks: 'Good Hifz revision pace; needs closer Tajweed review.',
        completed: 5,
        total: 15,
      },
      'alia-student-04': {
        marks: 92,
        attendanceRate: 96,
        attendanceStatus: 'Present',
        remarks: 'Excellent Usul al-Hadith seminar presentation.',
        completed: 11,
        total: 14,
      },
      'alia-student-05': {
        marks: 86,
        attendanceRate: 89,
        attendanceStatus: 'Present',
        remarks: 'Thoughtful comparative Fiqh legal maxims essay.',
        completed: 8,
        total: 14,
      },
    };

    return store.profiles
      .filter((p) => p.pathway === 'alia' && p.role === 'student')
      .map((student) => {
        const defaults = defaultScores[student.id] ?? {
          marks: 82,
          attendanceRate: 90,
          attendanceStatus: 'Present' as AliaAttendanceStatus,
          remarks: 'Steady Alia Madrasa progress.',
          completed: 4,
          total: 15,
        };
        const liveCompleted = getStudentCompletedLessonCount(student.id);
        const override = overrides[student.id];

        return {
          id: student.id,
          fullName: student.fullName,
          email: student.email,
          marhala: student.marhala,
          department: student.department,
          status: student.status,
          completedLessonsCount: Math.max(defaults.completed, liveCompleted),
          totalRecommendedLessons: defaults.total,
          marks: override ? override.marks : defaults.marks,
          attendanceRate: override ? override.attendanceRate : defaults.attendanceRate,
          attendanceStatus: override ? override.attendanceStatus : defaults.attendanceStatus,
          remarks: override ? override.remarks : defaults.remarks,
        };
      });
  },

  updateStudentAssessment(
    studentId: string,
    patch: {
      marks: number;
      attendanceRate: number;
      attendanceStatus: AliaAttendanceStatus;
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
      return { ok: false, error: 'Attendance rate must be a valid percentage between 0 and 100.' };
    }

    const map = loadAssessments();
    map[studentId] = {
      marks: Math.round(patch.marks),
      attendanceRate: Math.round(patch.attendanceRate),
      attendanceStatus: patch.attendanceStatus,
      remarks: patch.remarks.trim(),
      updatedAt: now,
    };
    saveAssessments(map);
    return { ok: true };
  },

  getTodaySchedule(teacher: AliaTeacherContext): AliaTeacherScheduleSession[] {
    const subj = teacher.primarySubject;
    const primaryMarhala = teacher.assignedMarhalas[0] ?? 'Dakhil (Classes 6–10)';
    const secondMarhala = teacher.assignedMarhalas[1] ?? 'Alim (Classes 11–12)';
    const thirdMarhala = teacher.assignedMarhalas[2] ?? 'Fazil (Degree / Pass)';

    return [
      {
        id: 'ALIA-SCH-01',
        timeLabel: '09:00 AM – 09:45 AM',
        marhala: primaryMarhala,
        department: getDepartmentsForAliaMarhala(primaryMarhala)[0],
        roomLabel: 'Madrasa Hall A-102',
        topic: `${subj}: Kitab Reading & BMEB Short-Question Review`,
      },
      {
        id: 'ALIA-SCH-02',
        timeLabel: '10:30 AM – 11:15 AM',
        marhala: secondMarhala,
        department: getDepartmentsForAliaMarhala(secondMarhala).includes(teacher.department)
          ? teacher.department
          : getDepartmentsForAliaMarhala(secondMarhala)[0],
        roomLabel: 'Senior Academic Room B-204',
        topic: `${subj}: Creative Question (CQ) Stem Practice & Commentary`,
      },
      {
        id: 'ALIA-SCH-03',
        timeLabel: '12:00 PM – 12:45 PM',
        marhala: thirdMarhala,
        department: getDepartmentsForAliaMarhala(thirdMarhala)[0],
        roomLabel: 'Darul Hadith Seminar Hall',
        topic: `${subj}: Classical Text Analysis & Viva Preparation`,
      },
    ];
  },

  listOfficialNotices(
    filters: {
      query?: string;
      audience?: 'all' | 'teacher' | 'both';
      tag?: 'all' | AliaNoticeTag;
    } = {},
    now = Date.now()
  ): AliaOfficialNotice[] {
    const store = readSharedAliaStore(now);
    const q = (filters.query ?? '').trim().toLowerCase();

    return store.notices
      .filter((n) => n.pathway === 'alia')
      .filter((n) => n.audience === 'teacher' || n.audience === 'both')
      .filter((n) => {
        if (filters.audience && filters.audience !== 'all' && n.audience !== filters.audience) {
          return false;
        }
        if (filters.tag && filters.tag !== 'all' && n.tag !== filters.tag) {
          return false;
        }
        if (q) {
          const hay = `${n.title} ${n.description} ${n.tag} ${n.marhala} ${n.department}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => b.createdAt - a.createdAt);
  },

  listClassAnnouncements(now = Date.now()): AliaTeacherClassAnnouncement[] {
    return loadAnnouncements(now)
      .filter((a) => a.pathway === 'alia')
      .sort((a, b) => b.createdAt - a.createdAt);
  },

  postClassAnnouncement(
    teacher: AliaTeacherContext,
    input: {
      marhala: AliaMarhala;
      department: AliaDepartment;
      title: string;
      message: string;
      tag: AliaTeacherAnnouncementTag;
    },
    now = Date.now()
  ): { ok: true; announcement: AliaTeacherClassAnnouncement } | { ok: false; error: string } {
    const title = input.title.trim();
    const message = input.message.trim();
    if (title.length < 3) {
      return { ok: false, error: 'Announcement title must be at least 3 characters long.' };
    }
    if (message.length < 10) {
      return { ok: false, error: 'Please write a clear class update (at least 10 characters).' };
    }
    if (!getDepartmentsForAliaMarhala(input.marhala).includes(input.department)) {
      return {
        ok: false,
        error: `Department "${input.department}" is not valid for ${getShortAliaMarhalaLabel(input.marhala)}.`,
      };
    }

    const created: AliaTeacherClassAnnouncement = {
      id: `ALIA-ANN-${now}-${Math.floor(Math.random() * 1000)}`,
      pathway: 'alia',
      teacherName: teacher.fullName,
      teacherEmail: teacher.email,
      subject: teacher.primarySubject,
      marhala: input.marhala,
      department: input.department,
      title,
      message,
      tag: input.tag,
      createdAt: now,
    };

    const next = [created, ...loadAnnouncements(now)];
    saveAnnouncements(next);
    return { ok: true, announcement: created };
  },

  deleteClassAnnouncement(announcementId: string, now = Date.now()): AliaTeacherClassAnnouncement[] {
    const next = loadAnnouncements(now).filter((a) => a.id !== announcementId);
    saveAnnouncements(next);
    return next.filter((a) => a.pathway === 'alia').sort((a, b) => b.createdAt - a.createdAt);
  },

  listPendingTeacherApplications(now = Date.now()): AliaPendingRecord[] {
    const store = readSharedAliaStore(now);
    return store.pending.filter((p) => p.pathway === 'alia' && p.role === 'teacher');
  },

  updateTeacherPassword(
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
    if (currentPassword === newPassword) {
      return { ok: false, error: 'New password must be different from your current password.' };
    }

    const normalizedEmail = email.trim().toLowerCase();
    const db = loadDatabase(now);
    const userIdx = db.users.findIndex(
      (u) => u.role === 'teacher' && u.email.toLowerCase() === normalizedEmail
    );
    if (userIdx === -1) {
      return { ok: false, error: 'Teacher account record could not be located.' };
    }
    if (!verifyPassword(currentPassword, db.users[userIdx].passwordHash)) {
      return { ok: false, error: 'Current password is incorrect.' };
    }

    const nextHash = hashPassword(newPassword);
    db.users[userIdx] = {
      ...db.users[userIdx],
      passwordHash: nextHash,
      mustChangePassword: false,
    };
    saveDatabase(db);

    const store = readSharedAliaStore(now);
    let updatedProfile = false;
    store.profiles = store.profiles.map((p) => {
      if (p.pathway === 'alia' && p.role === 'teacher' && p.email.toLowerCase() === normalizedEmail) {
        updatedProfile = true;
        return { ...p, passwordHash: nextHash, updatedAt: now };
      }
      return p;
    });
    if (updatedProfile) {
      writeSharedAliaStore(store);
    }

    return { ok: true };
  },

  resetInMemoryStateForTests(): void {
    memorySharedStore = null;
    memoryModules = null;
    memoryAssessments = {};
    memoryAnnouncements = null;
  },
};
