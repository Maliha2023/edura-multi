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

export interface AliaCoupon {
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

export interface AliaPendingRegistration {
  id: string;
  role: 'student' | 'teacher';
  pathway: AliaPathway;
  fullName: string;
  email: string;
  marhala: AliaMarhala;
  department: AliaDepartment;
  couponCode: string;
  submittedAt: number;
  expiresAt: number;
}

export interface AliaUserProfile {
  id: string;
  role: 'student' | 'teacher';
  pathway: AliaPathway;
  fullName: string;
  email: string;
  passwordHash: string;
  marhala: AliaMarhala;
  department: AliaDepartment;
  status: 'active' | 'suspended';
  registrationType: AliaRegistrationType;
  couponCode?: string;
  joinedAt: number;
  updatedAt?: number;
}

export interface AliaNotice {
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

export interface AliaActivityItem {
  id: string;
  pathway: AliaPathway;
  category: 'coupon' | 'approval' | 'directory' | 'notice' | 'security';
  summary: string;
  actorEmail: string;
  createdAt: number;
}

export interface AliaWorkspaceStore {
  coupons: AliaCoupon[];
  pending: AliaPendingRegistration[];
  profiles: AliaUserProfile[];
  notices: AliaNotice[];
  activities: AliaActivityItem[];
}

export interface AliaStudentContext {
  userId: string;
  fullName: string;
  email: string;
  pathway: AliaPathway;
  marhala: AliaMarhala;
  department: AliaDepartment;
  registrationType: AliaRegistrationType;
  couponCode?: string;
  joinedAt: number;
}

export interface AliaStudentLesson {
  id: string;
  title: string;
  keyTopic: string;
  durationMinutes: number;
  summary: string;
  examFocus: string;
}

export interface AliaStudentSubject {
  id: string;
  code: string;
  name: string;
  boardTag: string;
  category: 'Core' | 'Department Major' | 'Elective';
  description: string;
  lessons: AliaStudentLesson[];
}

export interface AliaDemoStudentPreset {
  pathway: AliaPathway;
  fullName: string;
  email: string;
  password: string;
  marhala: AliaMarhala;
  department: AliaDepartment;
}

export interface AliaStudentCouponValidationResult {
  ok: boolean;
  coupon?: AliaCoupon;
  message: string;
}

export interface AliaStudentRegistrationInput {
  couponCode: string;
  fullName: string;
  email: string;
  password: string;
  marhala: AliaMarhala;
  department: AliaDepartment;
}

export const ALIA_MARHALA_OPTIONS: AliaMarhala[] = [
  'Ebtedayee (Classes 1–5)',
  'Dakhil (Classes 6–10)',
  'Alim (Classes 11–12)',
  'Fazil (Degree / Pass)',
  'Kamil (Masters)',
];

const MARHALA_DEPARTMENT_MAP: Record<AliaMarhala, AliaDepartment[]> = {
  'Ebtedayee (Classes 1–5)': ['General', 'Hifzul Quran', 'Muzabbid Mahire Tajweed'],
  'Dakhil (Classes 6–10)': ['General', 'Science', 'Muzabbid Mahire Tajweed'],
  'Alim (Classes 11–12)': ['General', 'Science', 'Muzabbid Mahire Tajweed'],
  'Fazil (Degree / Pass)': ['Hadith & Tafsir', 'Fiqh & Usul', 'General'],
  'Kamil (Masters)': ['Hadith & Tafsir', 'Fiqh & Usul', 'General'],
};

const ALIA_STORE_KEY = 'edura_alia_admin_workspace_v1';
const ALIA_PROGRESS_STORAGE_KEY = 'edura_alia_student_progress_v1';
const FORTY_EIGHT_HOURS_MS = 48 * 60 * 60 * 1000;

let memoryAliaStore: AliaWorkspaceStore | null = null;
let memoryProgressStore: Record<string, string[]> = {};

function canUseLocalStorage(): boolean {
  try {
    return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
  } catch {
    return false;
  }
}

export function isAliaPathway(raw?: string | null): boolean {
  if (!raw) return false;
  const normalized = raw.trim().toLowerCase();
  return (
    normalized === 'alia' ||
    normalized === 'alia madrasa' ||
    normalized === 'alia_madrasa' ||
    normalized === 'alia panel'
  );
}

export function resolveAliaPathway(raw?: string | null): AliaPathway | null {
  return isAliaPathway(raw) ? 'alia' : null;
}

export function getAliaPathwayLabel(): string {
  return 'Alia Madrasa';
}

export function getAliaBoardName(): string {
  return 'Bangladesh Madrasa Education Board (BMEB)';
}

export function getDepartmentsForMarhala(marhala: AliaMarhala): AliaDepartment[] {
  return [...(MARHALA_DEPARTMENT_MAP[marhala] ?? ['General'])];
}

export function isValidMarhala(value: string): value is AliaMarhala {
  return (ALIA_MARHALA_OPTIONS as string[]).includes(value);
}

export function isValidDepartmentForMarhala(
  marhala: AliaMarhala,
  department: string
): department is AliaDepartment {
  return (getDepartmentsForMarhala(marhala) as string[]).includes(department);
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

export function formatAliaStudentContextBadge(
  marhala: AliaMarhala,
  department: AliaDepartment
): string {
  return `Alia Madrasa • ${getShortMarhalaLabel(marhala)} • ${department}`;
}

export function getDemoAliaStudentPreset(): AliaDemoStudentPreset {
  return {
    pathway: 'alia',
    fullName: 'Mahmudul Hasan',
    email: 'mahmudul.hasan@alia-student.edu.bd',
    password: 'Student@1234',
    marhala: 'Dakhil (Classes 6–10)',
    department: 'Science',
  };
}

function createInitialAliaStore(now: number): AliaWorkspaceStore {
  const hour = 60 * 60 * 1000;
  const day = 24 * hour;
  const demoPreset = getDemoAliaStudentPreset();
  const defaultStudentHash = hashPassword(demoPreset.password);

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
        id: 'ALIA-CPN-S02',
        code: 'S-74219',
        pathway: 'alia',
        role: 'student',
        status: 'active',
        createdAt: now - 1 * hour,
        expiresAt: now + 47 * hour,
        issuedBy: 'admin@alia-madrasa.edu.bd',
      },
      {
        id: 'ALIA-CPN-S03',
        code: 'S-74105',
        pathway: 'alia',
        role: 'student',
        status: 'used',
        createdAt: now - 30 * hour,
        expiresAt: now + 18 * hour,
        usedAt: now - 20 * hour,
        issuedBy: 'admin@alia-madrasa.edu.bd',
      },
      {
        id: 'ALIA-CPN-S04',
        code: 'S-74088',
        pathway: 'alia',
        role: 'student',
        status: 'expired',
        createdAt: now - 72 * hour,
        expiresAt: now - 24 * hour,
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
    ],
    pending: [
      {
        id: 'ALIA-PND-S01',
        role: 'student',
        pathway: 'alia',
        fullName: 'Saiful Islam',
        email: 'saiful.islam@alia-student.edu.bd',
        marhala: 'Alim (Classes 11–12)',
        department: 'General',
        couponCode: 'S-74105',
        submittedAt: now - 20 * hour,
        expiresAt: now + 28 * hour,
      },
    ],
    profiles: [
      {
        id: 'alia-student-demo-01',
        role: 'student',
        pathway: 'alia',
        fullName: demoPreset.fullName,
        email: demoPreset.email,
        passwordHash: defaultStudentHash,
        marhala: demoPreset.marhala,
        department: demoPreset.department,
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
        passwordHash: defaultStudentHash,
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
        passwordHash: defaultStudentHash,
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
        passwordHash: defaultStudentHash,
        marhala: 'Fazil (Degree / Pass)',
        department: 'Hadith & Tafsir',
        status: 'active',
        registrationType: 'coupon_auto',
        couponCode: 'S-74025',
        joinedAt: now - 40 * day,
      },
    ],
    notices: [
      {
        id: 'ALIA-NTC-01',
        pathway: 'alia',
        title: 'BMEB Dakhil & Alim Pre-Test Examination Schedule Published',
        description:
          'The Academic Council has finalized the upcoming Pre-Test examination timetable for all Alia Madrasa learners. Written papers for Quran Majeed & Tajweed, Hadith Sharif, and Arabic Grammar begin Sunday at 9:30 AM. Please collect your signed admit slip from the Madrasa Office by Thursday.',
        audience: 'both',
        marhala: 'all',
        department: 'all',
        tag: 'Exam',
        createdAt: now - 8 * hour,
        updatedAt: now - 8 * hour,
      },
      {
        id: 'ALIA-NTC-02',
        pathway: 'alia',
        title: 'Dakhil Science Practical Lab & Experiment Notebook Submission',
        description:
          'Dakhil Science department students must submit their completed Physics and Chemistry practical notebooks to the Science Laboratory coordinator before Wednesday 1:00 PM for internal BMEB practical evaluation.',
        audience: 'student',
        marhala: 'Dakhil (Classes 6–10)',
        department: 'Science',
        tag: 'Exam',
        createdAt: now - 18 * hour,
        updatedAt: now - 18 * hour,
      },
      {
        id: 'ALIA-NTC-03',
        pathway: 'alia',
        title: 'Annual Qira’at, Hifz & Arabic Elocution Competition Registration',
        description:
          'Registrations are now open for the inter-madrasa Qira’at (Tilawat with Tajweed), Hifzul Quran, and Arabic speech competition. Interested Alia students may enroll through their class Ustad by next Tuesday.',
        audience: 'student',
        marhala: 'all',
        department: 'all',
        tag: 'General',
        createdAt: now - 36 * hour,
        updatedAt: now - 36 * hour,
      },
      {
        id: 'ALIA-NTC-04',
        pathway: 'alia',
        title: 'Urgent: BMEB E-SIF Registration Verification & Photo Check',
        description:
          'All Alia Madrasa students are requested to verify the spelling of their name, father’s name, Marhala, and Department on the BMEB E-SIF board registration roster posted outside the Principal’s office before Friday 2:00 PM.',
        audience: 'both',
        marhala: 'all',
        department: 'all',
        tag: 'Urgent',
        createdAt: now - 5 * hour,
        updatedAt: now - 5 * hour,
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
    ],
    activities: [
      {
        id: 'ALIA-ACT-01',
        pathway: 'alia',
        category: 'notice',
        summary: 'Published BMEB E-SIF registration verification circular for Alia students and faculty.',
        actorEmail: 'admin@alia-madrasa.edu.bd',
        createdAt: now - 5 * hour,
      },
    ],
  };
}

function readAliaStore(now = Date.now()): AliaWorkspaceStore {
  if (canUseLocalStorage()) {
    const raw = window.localStorage.getItem(ALIA_STORE_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as AliaWorkspaceStore;
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
        // Re-seed below
      }
    }
    const seeded = createInitialAliaStore(now);
    window.localStorage.setItem(ALIA_STORE_KEY, JSON.stringify(seeded));
    return seeded;
  }

  if (!memoryAliaStore) {
    memoryAliaStore = createInitialAliaStore(now);
  }
  return memoryAliaStore;
}

function writeAliaStore(store: AliaWorkspaceStore): void {
  if (canUseLocalStorage()) {
    window.localStorage.setItem(ALIA_STORE_KEY, JSON.stringify(store));
  } else {
    memoryAliaStore = store;
  }
}

function loadProgressMap(): Record<string, string[]> {
  if (canUseLocalStorage()) {
    try {
      const raw = window.localStorage.getItem(ALIA_PROGRESS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Record<string, string[]>;
        if (parsed && typeof parsed === 'object') {
          return parsed;
        }
      }
    } catch {
      // Ignore parse errors
    }
    return {};
  }
  return memoryProgressStore;
}

function saveProgressMap(map: Record<string, string[]>): void {
  if (canUseLocalStorage()) {
    window.localStorage.setItem(ALIA_PROGRESS_STORAGE_KEY, JSON.stringify(map));
  } else {
    memoryProgressStore = map;
  }
}

export function getDemoAliaStudentCouponHint(now = Date.now()): string {
  const store = readAliaStore(now);
  const active = store.coupons.find(
    (c) =>
      c.pathway === 'alia' &&
      c.role === 'student' &&
      c.status === 'active' &&
      c.expiresAt > now
  );
  return active ? active.code : 'S-74201';
}

function makeLesson(
  prefix: string,
  idx: number,
  title: string,
  keyTopic: string,
  durationMinutes: number,
  summary: string,
  examFocus: string
): AliaStudentLesson {
  return {
    id: `${prefix}-L${idx}`,
    title,
    keyTopic,
    durationMinutes,
    summary,
    examFocus,
  };
}

export function getAliaSubjectsForStudent(
  marhala: AliaMarhala,
  department: AliaDepartment
): AliaStudentSubject[] {
  const shortMarhala = getShortMarhalaLabel(marhala);

  if (marhala === 'Ebtedayee (Classes 1–5)') {
    const core: AliaStudentSubject[] = [
      {
        id: 'alia-ebt-quran',
        code: 'EB-101',
        name: 'Quran Majeed & Tajweed',
        boardTag: 'BMEB Ebtedayee',
        category: 'Core',
        description:
          'Foundational Nazira recitation, Makharij al-Huruf, and essential short Surahs with proper Tajweed pronunciation.',
        lessons: [
          makeLesson(
            'alia-ebt-quran',
            1,
            'Makharij al-Huruf & Articulation Points',
            'Tajweed Foundations',
            25,
            'Practice the 17 primary articulation points for Arabic letters with clear phonetic distinction.',
            'Oral & Written Recitation'
          ),
          makeLesson(
            'alia-ebt-quran',
            2,
            'Rules of Noon Sakinah, Tanween & Madd',
            'Recitation Rules',
            30,
            'Identify Izhar, Idgham, Iqlab, and Ikhfa in Juz Amma verses with guided examples.',
            'Ebtedayee Board Exam'
          ),
          makeLesson(
            'alia-ebt-quran',
            3,
            'Selected Surahs from Juz Amma with Meaning',
            'Tafsir Basics',
            25,
            'Memorize Surah Al-Fil through Surah An-Nas along with simple Bangla/English word meanings.',
            'Short Question & Translation'
          ),
        ],
      },
      {
        id: 'alia-ebt-aqaid',
        code: 'EB-102',
        name: 'Aqaid & Fiqh',
        boardTag: 'BMEB Ebtedayee',
        category: 'Core',
        description:
          'Pillars of Iman and Islam, Taharah (purification), Salah steps, and everyday Islamic etiquette (Adab).',
        lessons: [
          makeLesson(
            'alia-ebt-aqaid',
            1,
            'Articles of Faith (Iman-e-Mufassal) & Kalimah',
            'Aqaid',
            25,
            'Understand the core tenets of Islamic belief with clear examples for young learners.',
            'Structured Questions'
          ),
          makeLesson(
            'alia-ebt-aqaid',
            2,
            'Wudu, Tayammum & Practical Steps of Salah',
            'Fiqh of Ibadah',
            30,
            'Review the Fard, Sunnah, and Mustahab acts of Wudu and the five daily prayers.',
            'Practical & Written'
          ),
          makeLesson(
            'alia-ebt-aqaid',
            3,
            'Respect for Parents, Teachers & Daily Masnoon Duas',
            'Akhlaq & Adab',
            20,
            'Memorize everyday Sunnah supplications and discuss moral conduct in madrasa and family life.',
            'Short Answer Section'
          ),
        ],
      },
      {
        id: 'alia-ebt-arabic',
        code: 'EB-103',
        name: 'Ad-Durusul Arabiyyah (Arabic Language)',
        boardTag: 'BMEB Ebtedayee',
        category: 'Core',
        description:
          'Basic Arabic vocabulary, simple nominal sentences, reading comprehension, and elementary handwriting.',
        lessons: [
          makeLesson(
            'alia-ebt-arabic',
            1,
            'Arabic Vocabulary, Gender & Demonstrative Pronouns',
            'Elementary Grammar',
            30,
            'Build everyday classroom and household sentences using Hadha, Hadhihi, Dhalika, and Tilka.',
            'Translation & Fill-in-Blanks'
          ),
          makeLesson(
            'alia-ebt-arabic',
            2,
            'Singular, Dual & Plural Forms in Simple Prose',
            'Sarf Basics',
            25,
            'Recognize Mufrad, Tathniyah, and Jam’ patterns in short Ebtedayee reading passages.',
            'Grammar Drill'
          ),
          makeLesson(
            'alia-ebt-arabic',
            3,
            'Short Arabic Dialogues & Comprehension',
            'Reading Practice',
            25,
            'Read simple conversational texts and answer comprehension questions in Arabic and Bangla.',
            'BMEB Paper 1'
          ),
        ],
      },
    ];

    const deptSpecific: AliaStudentSubject[] =
      department === 'Hifzul Quran'
        ? [
            {
              id: 'alia-ebt-hifz',
              code: 'EB-201',
              name: 'Hifzul Quran & Muraja’ah (Memorization)',
              boardTag: 'Ebtedayee Hifz',
              category: 'Department Major',
              description:
                'Structured Sabak (new lesson), Sabki (recent revision), and Amukhta (cumulative review) techniques.',
              lessons: [
                makeLesson(
                  'alia-ebt-hifz',
                  1,
                  'Sabak & Sabki Daily Memorization Cycle',
                  'Hifz Methodology',
                  35,
                  'Organize daily ayah targets with consistent breath control and rhythmic repetition.',
                  'Oral Hifz Assessment'
                ),
                makeLesson(
                  'alia-ebt-hifz',
                  2,
                  'Mutashabihat (Similar Verses) Mapping in Juz 28–30',
                  'Retention Accuracy',
                  30,
                  'Distinguish closely phrased verses across short and medium Surahs to prevent slips.',
                  'Viva Examination'
                ),
                makeLesson(
                  'alia-ebt-hifz',
                  3,
                  'Waqf (Pausing Signs) & Tartil Cadence',
                  'Recitation Fluency',
                  25,
                  'Apply mandatory and permissible stopping signs accurately during continuous recitation.',
                  'Recitation Test'
                ),
              ],
            },
          ]
        : department === 'Muzabbid Mahire Tajweed'
          ? [
              {
                id: 'alia-ebt-tajweed',
                code: 'EB-202',
                name: 'Ilmut Tajweed & Qira’at Practice',
                boardTag: 'Ebtedayee Muzabbid',
                category: 'Department Major',
                description:
                  'Dedicated training in Sifat al-Huruf, Ghunnah measurements, and melodic Tartil recitation.',
                lessons: [
                  makeLesson(
                    'alia-ebt-tajweed',
                    1,
                    'Sifat al-Huruf: Heavy (Tafkheem) vs Light (Tarqeeq)',
                    'Phonetics',
                    30,
                    'Distinguish Isti’la letters and rules of Ra and Lam in practical Quranic examples.',
                    'Tajweed Oral & Written'
                  ),
                  makeLesson(
                    'alia-ebt-tajweed',
                    2,
                    'Meem Sakinah & Qalqalah Degrees',
                    'Articulation Precision',
                    30,
                    'Apply Ikhfa Shafawi, Idgham Shafawi, and minor/major Qalqalah echoes accurately.',
                    'Muzabbid Practical'
                  ),
                  makeLesson(
                    'alia-ebt-tajweed',
                    3,
                    'Types of Madd (Original & Secondary Prolongations)',
                    'Madd Classification',
                    30,
                    'Count exact Harakat lengths for Madd Tabi’i, Muttasil, Munfasil, and Lazim.',
                    'BMEB Muzabbid Board'
                  ),
                ],
              },
            ]
          : [
              {
                id: 'alia-ebt-math',
                code: 'EB-104',
                name: 'Elementary Mathematics & General Studies',
                boardTag: 'BMEB Ebtedayee General',
                category: 'Department Major',
                description:
                  'Arithmetic operations, fractions, measurement, and introductory Bangla/English composition.',
                lessons: [
                  makeLesson(
                    'alia-ebt-math',
                    1,
                    'Fractions, Decimals & Word Problem Strategies',
                    'Arithmetic',
                    30,
                    'Solve multi-step unitary method and fraction problems aligned with Ebtedayee Class 5.',
                    'Written Math Paper'
                  ),
                  makeLesson(
                    'alia-ebt-math',
                    2,
                    'Basic Geometry: Triangles, Rectangles & Perimeter',
                    'Geometry',
                    25,
                    'Draw and measure basic geometric shapes using ruler and protractor.',
                    'Geometry Section'
                  ),
                  makeLesson(
                    'alia-ebt-math',
                    3,
                    'Bangla & English Guided Paragraph Writing',
                    'Language Skills',
                    25,
                    'Compose clear, grammatically accurate short paragraphs on everyday educational themes.',
                    'Language Paper'
                  ),
                ],
              },
            ];

    return [
      ...core,
      ...deptSpecific,
      {
        id: 'alia-ebt-eng',
        code: 'EB-105',
        name: 'English & Bangla Reading Skills',
        boardTag: 'BMEB Ebtedayee',
        category: 'Elective',
        description:
          'Foundational bilingual reading comprehension, sentence structure, and vocabulary building.',
        lessons: [
          makeLesson(
            'alia-ebt-eng',
            1,
            'Parts of Speech & Present/Past Tense Mastery',
            'English Grammar',
            25,
            'Form clear affirmative, negative, and interrogative sentences in everyday English.',
            'Grammar Section'
          ),
          makeLesson(
            'alia-ebt-eng',
            2,
            'Bangla Prose Comprehension & Correct Spelling',
            'Bangla Literature',
            25,
            'Identify main ideas from Ebtedayee Bangla chapters and practice accurate orthography.',
            'Comprehension'
          ),
          makeLesson(
            'alia-ebt-eng',
            3,
            'Bilingual Translation & Everyday Conversation',
            'Applied Communication',
            25,
            'Translate short functional sentences smoothly between Bangla and English.',
            'Translation Task'
          ),
        ],
      },
    ];
  }

  if (marhala === 'Dakhil (Classes 6–10)' || marhala === 'Alim (Classes 11–12)') {
    const isAlim = marhala === 'Alim (Classes 11–12)';
    const boardTag = isAlim ? 'BMEB Alim' : 'BMEB Dakhil';
    const prefix = isAlim ? 'alia-alim' : 'alia-dak';

    const coreSubjects: AliaStudentSubject[] = [
      {
        id: `${prefix}-quran`,
        code: isAlim ? 'AL-201' : 'DK-101',
        name: 'Quran Majeed & Tajweed',
        boardTag,
        category: 'Core',
        description: isAlim
          ? 'Surah Al-Baqarah & Aal-e-Imran translation, Tafsir commentary, Asbab al-Nuzul, and advanced Ulum al-Quran.'
          : 'Selected Surahs translation, contextual Tafsir, Shaan-e-Nuzul, and practical Tajweed rules for BMEB board exams.',
        lessons: [
          makeLesson(
            `${prefix}-quran`,
            1,
            isAlim
              ? 'Surah Al-Baqarah: Verses of Legislation & Tafsir Analysis'
              : 'Surah Al-Baqarah (Ruku 1–5): Translation & Core Themes',
            'Tafsir & Translation',
            40,
            'Analyze literal and contextual meanings, key Arabic root vocabulary, and practical life lessons.',
            `${shortMarhala} Paper 1 (CQ & Short)`
          ),
          makeLesson(
            `${prefix}-quran`,
            2,
            'Asbab al-Nuzul (Occasions of Revelation) & Makki/Madani Features',
            'Ulum al-Quran',
            35,
            'Compare stylistic hallmarks of Makki and Madani revelations with board-exam reference verses.',
            `${shortMarhala} Structured Questions`
          ),
          makeLesson(
            `${prefix}-quran`,
            3,
            'Applied Tajweed: Idgham, Madd Lazim & Waqf Rules',
            'Ilmut Tajweed',
            35,
            'Identify Tajweed rules inside prescribed board passages and justify each rule with examples.',
            `${shortMarhala} Tajweed Section`
          ),
        ],
      },
      {
        id: `${prefix}-hadith`,
        code: isAlim ? 'AL-202' : 'DK-102',
        name: 'Hadith Sharif',
        boardTag,
        category: 'Core',
        description: isAlim
          ? 'Mishkat al-Masabih selections, Mustalah al-Hadith (Usul), narrator biographies, and juristic deductions.'
          : 'Selected prophetic traditions on Iman, Ibadah, Mu’amalat, and foundational Hadith classification (Sahih, Hasan, Da’if).',
        lessons: [
          makeLesson(
            `${prefix}-hadith`,
            1,
            isAlim
              ? 'Mishkat al-Masabih: Kitab al-Iman & Kitab al-Ilm'
              : 'Selected Hadiths on Intention (Niyyah), Knowledge & Akhlaq',
            'Matn & Explanation',
            40,
            'Translate prescribed Hadith texts accurately and extract ethical and legal principles.',
            `${shortMarhala} Board Paper`
          ),
          makeLesson(
            `${prefix}-hadith`,
            2,
            'Usul al-Hadith: Sanad, Matn & Hadith Classification',
            'Hadith Sciences',
            35,
            'Differentiate Mutawatir, Mashhur, Aziz, and Gharib chains along with grading criteria.',
            `${shortMarhala} MCQ & Short`
          ),
          makeLesson(
            `${prefix}-hadith`,
            3,
            'Biographies of Major Companions & Sihah Sittah Compilers',
            'Rijal & History',
            30,
            'Summarize the scholarly contributions of Imam Bukhari, Imam Muslim, and key Sahaba narrators.',
            `${shortMarhala} Creative Questions`
          ),
        ],
      },
      {
        id: `${prefix}-arabic`,
        code: isAlim ? 'AL-203' : 'DK-103',
        name: 'Arabic Grammar & Literature (Al-Lughatul Arabiyyah)',
        boardTag,
        category: 'Core',
        description:
          'Al-Adabul Arabi prose & poetry comprehension paired with Nahw (syntax), Sarf (morphology), and Arabic composition.',
        lessons: [
          makeLesson(
            `${prefix}-arabic`,
            1,
            'Nahw Essentials: Jumlah Ismiyyah, Fi’liyyah & I’rab Signs',
            'Arabic Syntax (Nahw)',
            40,
            'Determine Raf’, Nasb, and Jarr case endings across Marfu’at, Mansubat, and Majrurat.',
            `${shortMarhala} Paper 2 Grammar`
          ),
          makeLesson(
            `${prefix}-arabic`,
            2,
            'Sarf Patterns: Thulathi Mujarrad & Mazid Fih Verb Forms',
            'Morphology (Sarf)',
            40,
            'Conjugate active/passive verbs and derive Ism Fa’il, Ism Maf’ul, and Masdar forms.',
            `${shortMarhala} Sarf Drill`
          ),
          makeLesson(
            `${prefix}-arabic`,
            3,
            'Al-Adabul Arabi Passage Analysis & Arabic Essay Writing',
            'Literature & Insha',
            35,
            'Draft structured Arabic paragraphs, formal applications, and literary appreciation responses.',
            `${shortMarhala} Paper 1 & 2`
          ),
        ],
      },
    ];

    let deptMajors: AliaStudentSubject[] = [];

    if (department === 'Science') {
      deptMajors = [
        {
          id: `${prefix}-physics`,
          code: isAlim ? 'AL-224' : 'DK-130',
          name: 'Physics',
          boardTag: `${boardTag} Science`,
          category: 'Department Major',
          description: isAlim
            ? 'Vectors, Newtonian mechanics, thermodynamics, electromagnetism, and modern physics for Alim Science.'
            : 'Motion, force, work-power-energy, optics, and current electricity aligned with BMEB Dakhil Science.',
          lessons: [
            makeLesson(
              `${prefix}-physics`,
              1,
              isAlim
                ? 'Vector Resolution, Projectile Motion & Rotational Dynamics'
                : 'Equations of Motion, Newton’s Laws & Momentum',
              'Mechanics',
              45,
              'Derive kinematics relations and solve multi-step numerical problems with free-body diagrams.',
              `${shortMarhala} Science CQ & MCQ`
            ),
            makeLesson(
              `${prefix}-physics`,
              2,
              isAlim
                ? 'Thermodynamic Laws, Entropy & Ideal Gas Processes'
                : 'Reflection, Refraction & Lens Formula Applications',
              isAlim ? 'Thermodynamics' : 'Optics & Waves',
              45,
              'Calculate efficiency, focal lengths, and ray-diagram magnifications with accurate SI units.',
              `${shortMarhala} Board Numericals`
            ),
            makeLesson(
              `${prefix}-physics`,
              3,
              'Ohm’s Law, Kirchhoff’s Circuits & Electromagnetic Induction',
              'Electricity & Magnetism',
              40,
              'Solve series-parallel resistor networks and evaluate power dissipation in circuit stems.',
              `${shortMarhala} Practical & Theory`
            ),
          ],
        },
        {
          id: `${prefix}-chemistry`,
          code: isAlim ? 'AL-225' : 'DK-131',
          name: 'Chemistry',
          boardTag: `${boardTag} Science`,
          category: 'Department Major',
          description: isAlim
            ? 'Qualitative & quantitative chemistry, chemical equilibrium, electrochemistry, and organic reaction pathways.'
            : 'Atomic structure, periodic trends, chemical bonding, stoichiometry, and hydrocarbons for Dakhil Science.',
          lessons: [
            makeLesson(
              `${prefix}-chemistry`,
              1,
              'Atomic Orbitals, Periodic Properties & Chemical Bonding',
              'Structure & Bonding',
              40,
              'Explain hybridization, electronegativity trends, and ionic vs covalent compound properties.',
              `${shortMarhala} Science Paper`
            ),
            makeLesson(
              `${prefix}-chemistry`,
              2,
              'Mole Concept, Stoichiometry & Acid-Base Titration',
              'Quantitative Chemistry',
              45,
              'Compute molarity, limiting reactants, and pH buffer values for board-style stems.',
              `${shortMarhala} Numericals & Lab`
            ),
            makeLesson(
              `${prefix}-chemistry`,
              3,
              'Hydrocarbons, Functional Groups & Reaction Mechanisms',
              'Organic Chemistry',
              45,
              'Distinguish alkanes, alkenes, alcohols, and carboxylic acids with confirmatory tests.',
              `${shortMarhala} Organic Section`
            ),
          ],
        },
        {
          id: `${prefix}-hmath`,
          code: isAlim ? 'AL-228' : 'DK-132',
          name: 'Higher Mathematics',
          boardTag: `${boardTag} Science`,
          category: 'Department Major',
          description: isAlim
            ? 'Matrices, straight lines, calculus differentiation/integration, and complex numbers for Alim Science.'
            : 'Sets & functions, algebraic polynomials, coordinate geometry, trigonometry, and binomial expansion.',
          lessons: [
            makeLesson(
              `${prefix}-hmath`,
              1,
              isAlim
                ? 'Matrices, Determinants & Straight-Line Coordinate Systems'
                : 'Functions, Remainder Theorem & Partial Fractions',
              'Algebra & Matrices',
              45,
              'Apply systematic algebraic transformations and verify domains, ranges, and matrix inverses.',
              `${shortMarhala} Higher Math Paper 1`
            ),
            makeLesson(
              `${prefix}-hmath`,
              2,
              isAlim
                ? 'Differentiation Rules, Tangents & Optimization Problems'
                : 'Trigonometric Identities, Radians & Height-Distance',
              isAlim ? 'Calculus' : 'Trigonometry',
              45,
              'Work through step-by-step proofs and applied maximum/minimum or elevation problems.',
              `${shortMarhala} Creative Questions`
            ),
            makeLesson(
              `${prefix}-hmath`,
              3,
              isAlim
                ? 'Indefinite/Definite Integration & Area Under Curves'
                : 'Binomial Expansion, Vectors & Probability Trees',
              isAlim ? 'Integral Calculus' : 'Vectors & Probability',
              45,
              'Evaluate integrals or vector collinearity proofs cleanly for full board-exam credit.',
              `${shortMarhala} Paper 2`
            ),
          ],
        },
      ];
    } else if (department === 'Muzabbid Mahire Tajweed') {
      deptMajors = [
        {
          id: `${prefix}-qiraat`,
          code: isAlim ? 'AL-241' : 'DK-141',
          name: 'Ilmul Qira’at & Tajweed (Muzabbid)',
          boardTag: `${boardTag} Muzabbid`,
          category: 'Department Major',
          description:
            'Advanced Qira’at Sab’ah principles, Al-Jazariyyah rules, Waqf & Ibtida precision, and applied recitation.',
          lessons: [
            makeLesson(
              `${prefix}-qiraat`,
              1,
              'Muqaddimah al-Jazariyyah: Makharij & Sifat Mastery',
              'Classical Tajweed Text',
              40,
              'Connect classical Jazariyyah couplets directly to articulation precision in Quranic Surahs.',
              `${shortMarhala} Muzabbid Paper 1`
            ),
            makeLesson(
              `${prefix}-qiraat`,
              2,
              'Riwayat Hafs an Asim & Comparative Qira’at Usul',
              'Qira’at Sciences',
              45,
              'Study Imamah, Imalah, Sakt, and Tashil rules with authentic transmission chains.',
              `${shortMarhala} Muzabbid Paper 2`
            ),
            makeLesson(
              `${prefix}-qiraat`,
              3,
              'Waqf & Ibtida (Pausing & Resuming) Meaning Preservation',
              'Applied Tilawat',
              35,
              'Distinguish Waqf Tam, Kafi, Hasan, and Qabih to uphold exact Quranic syntax.',
              'Practical Recitation Viva'
            ),
          ],
        },
        {
          id: `${prefix}-fiqh-muz`,
          code: isAlim ? 'AL-204' : 'DK-104',
          name: 'Al-Fiqh & Usul al-Fiqh',
          boardTag: `${boardTag} Muzabbid`,
          category: 'Department Major',
          description:
            'Islamic jurisprudence on worship, recitation rulings in Salah, and foundational principles of legal derivation.',
        lessons: [
            makeLesson(
              `${prefix}-fiqh-muz`,
              1,
              'Fiqh of Salah & Rulings on Recitation Errors (Zallatul Qari)',
              'Applied Fiqh',
              40,
              'Evaluate how minor and major pronunciation slips affect validity of congregational prayer.',
              `${shortMarhala} Fiqh Paper`
            ),
            makeLesson(
              `${prefix}-fiqh-muz`,
              2,
              'Primary Sources of Shariah: Quran, Sunnah, Ijma & Qiyas',
              'Usul al-Fiqh',
              35,
              'Outline the hierarchy of Islamic legal evidences with classical Hanafi examples.',
              `${shortMarhala} Structured Questions`
            ),
            makeLesson(
              `${prefix}-fiqh-muz`,
              3,
              'Zakah, Sawm & Social Ethics in Islamic Jurisprudence',
              'Ibadah & Mu’amalat',
              35,
              'Calculate Nisab thresholds and review key obligations and exemptions of fasting.',
              `${shortMarhala} Board Exam`
            ),
          ],
        },
      ];
    } else {
      // General Department (Dakhil & Alim)
      deptMajors = [
        {
          id: `${prefix}-fiqh`,
          code: isAlim ? 'AL-204' : 'DK-104',
          name: 'Al-Fiqh & Usul al-Fiqh',
          boardTag: `${boardTag} General`,
          category: 'Department Major',
          description: isAlim
            ? 'Al-Hidayah jurisprudence chapters paired with Usul al-Shashi principles of Islamic legal reasoning.'
            : 'Comprehensive Fiqh of Ibadah, family law, lawful trade (Buyu’), and introductory Usul al-Fiqh.',
          lessons: [
            makeLesson(
              `${prefix}-fiqh`,
              1,
              isAlim
                ? 'Al-Hidayah: Kitab al-Buyu’ (Contracts & Ethical Trade)'
                : 'Fiqh of Taharah, Salah, Zakah & Sawm',
              'Islamic Jurisprudence',
              40,
              'Analyze legal conditions, pillars (Arkan), and scholarly proofs from authentic texts.',
              `${shortMarhala} Fiqh Paper 1`
            ),
            makeLesson(
              `${prefix}-fiqh`,
              2,
              isAlim
                ? 'Usul al-Fiqh: Khass, Amm, Mushtarak & Qiyas Framework'
                : 'Principles of Shariah & Sources of Islamic Law',
              'Usul al-Fiqh',
              40,
              'Apply linguistic and juristic rules to interpret Quranic commands and prophetic traditions.',
              `${shortMarhala} Fiqh Paper 2`
            ),
            makeLesson(
              `${prefix}-fiqh`,
              3,
              'Islamic Family Law, Inheritance (Faraid) & Social Justice',
              'Mu’amalat & Faraid',
              40,
              'Work through foundational inheritance share calculations and rights within family contracts.',
              `${shortMarhala} Board Application`
            ),
          ],
        },
        {
          id: `${prefix}-history`,
          code: isAlim ? 'AL-209' : 'DK-109',
          name: 'Islamic History & Civilization',
          boardTag: `${boardTag} General`,
          category: 'Department Major',
          description:
            'Seerah of the Prophet (PBUH), Khulafa-e-Rashidun governance, and golden-age scientific and educational institutions.',
          lessons: [
            makeLesson(
              `${prefix}-history`,
              1,
              'Charter of Madinah & Prophetic Statecraft',
              'Early Islamic History',
              35,
              'Examine pluralism, civic treaties, and social welfare principles established in Madinah.',
              `${shortMarhala} Creative Questions`
            ),
            makeLesson(
              `${prefix}-history`,
              2,
              'Administrative Reforms of the Khulafa-e-Rashidun',
              'Caliphate Governance',
              35,
              'Review judicial independence, Baitul Mal finance, and provincial administration.',
              `${shortMarhala} Board Essay`
            ),
            makeLesson(
              `${prefix}-history`,
              3,
              'Contributions of Muslim Scholars & Bengal Madrasa Heritage',
              'Civilization & Heritage',
              35,
              'Trace intellectual advances in mathematics, medicine, and the history of Alia Madrasa education.',
              `${shortMarhala} Short & CQ`
            ),
          ],
        },
        {
          id: `${prefix}-balaghat`,
          code: isAlim ? 'AL-211' : 'DK-111',
          name: isAlim ? 'Balaghat & Mantiq (Rhetoric & Logic)' : 'General Mathematics & Science',
          boardTag: `${boardTag} General`,
          category: 'Department Major',
          description: isAlim
            ? 'Ilm al-Ma’ani, Bayan, and Badi’ Arabic eloquence alongside classical deductive logic.'
            : 'Algebra, geometry, statistics, and practical everyday science required for Dakhil General candidates.',
          lessons: [
            makeLesson(
              `${prefix}-balaghat`,
              1,
              isAlim
                ? 'Ilm al-Bayan: Tashbih, Isti’arah & Kinayah in Quranic Prose'
                : 'Algebraic Formulas, Linear Equations & Real Numbers',
              isAlim ? 'Arabic Rhetoric' : 'Algebra',
              40,
              isAlim
                ? 'Identify rhetorical metaphors and similes in classical Arabic poetry and Quranic verses.'
                : 'Factorize polynomials and solve real-world ratio and linear equation word problems.',
              `${shortMarhala} Board Exam`
            ),
            makeLesson(
              `${prefix}-balaghat`,
              2,
              isAlim
                ? 'Ilm al-Ma’ani: Khabar vs Insha Sentence Styles'
                : 'Geometry Theorems, Mensuration & Applied Statistics',
              isAlim ? 'Syntax & Meaning' : 'Geometry & Data',
              35,
              isAlim
                ? 'Analyze how sentence structure conveys emphasis, interrogation, and rhetorical elegance.'
                : 'Prove circle theorems and compute mean, median, and mode from grouped tables.',
              `${shortMarhala} Structured Paper`
            ),
            makeLesson(
              `${prefix}-balaghat`,
              3,
              isAlim
                ? 'Foundations of Mantiq: Tasawwur, Tasdiq & Syllogisms'
                : 'Everyday Physics, Human Health & Environmental Science',
              isAlim ? 'Classical Logic' : 'General Science',
              35,
              isAlim
                ? 'Construct valid categorical syllogisms and recognize logical fallacies cleanly.'
                : 'Connect nutrition, ecosystems, and basic electrical safety to structured board questions.',
              `${shortMarhala} MCQ & Short`
            ),
          ],
        },
      ];
    }

    const electives: AliaStudentSubject[] = [
      {
        id: `${prefix}-ict`,
        code: isAlim ? 'AL-240' : 'DK-140',
        name: 'ICT & English Academic Communication',
        boardTag,
        category: 'Elective',
        description:
          'Number systems, logic gates, web/database fundamentals, and academic English comprehension & writing.',
        lessons: [
          makeLesson(
            `${prefix}-ict`,
            1,
            'Binary/Hexadecimal Conversions & Digital Logic Gates',
            'ICT Systems',
            35,
            'Convert between number bases and build truth tables for AND, OR, NOT, NAND, and XOR gates.',
            `${shortMarhala} ICT Board Paper`
          ),
          makeLesson(
            `${prefix}-ict`,
            2,
            'HTML Structure, Database Keys & Cyber Ethics',
            'Web & Data',
            35,
            'Design clean HTML tables/forms and distinguish primary vs foreign keys in relational records.',
            `${shortMarhala} Practical & CQ`
          ),
          makeLesson(
            `${prefix}-ict`,
            3,
            'English Reading Summary, Grammar & Formal Composition',
            'English Paper 1 & 2',
            35,
            'Master connectors, modifiers, and concise academic essays for BMEB English examinations.',
            `${shortMarhala} English Board`
          ),
        ],
      },
    ];

    return [...coreSubjects, ...deptMajors, ...electives];
  }

  // Fazil (Degree / Pass) & Kamil (Masters) — Islamic Arabic University (IAU) / Alia Higher Studies
  const isKamil = marhala === 'Kamil (Masters)';
  const boardTag = isKamil ? 'IAU / Alia Kamil' : 'IAU / Alia Fazil';
  const prefix = isKamil ? 'alia-kam' : 'alia-faz';

  const coreHigher: AliaStudentSubject[] = [
    {
      id: `${prefix}-tafsir`,
      code: isKamil ? 'KM-401' : 'FZ-301',
      name: isKamil ? 'Tafsir al-Baydawi & Comparative Exegesis' : 'Tafsir al-Jalalayn & Ulum al-Quran',
      boardTag,
      category: 'Core',
      description: isKamil
        ? 'Advanced grammatical, theological, and juristic exegesis across classical Tafsir methodologies.'
        : 'Study of Tafsir al-Jalalayn, principles of Quranic interpretation, and Naskh/Muhkam-Mutashabih.',
      lessons: [
        makeLesson(
          `${prefix}-tafsir`,
          1,
          'Classical Exegesis Methodology: Tafsir bil-Ma’thur vs bil-Ra’y',
          'Usul al-Tafsir',
          45,
          'Compare narration-based and analytical Tafsir approaches with examples from Ibn Kathir and Baydawi.',
          `${shortMarhala} Honours/Pass Exam`
        ),
        makeLesson(
          `${prefix}-tafsir`,
          2,
          'Rhetorical Nuances & Legal Verses (Ayat al-Ahkam)',
          'Quranic Analysis',
          45,
          'Extract juristic rulings from key legislative verses while verifying Arabic syntax.',
          `${shortMarhala} Long Essay`
        ),
        makeLesson(
          `${prefix}-tafsir`,
          3,
          'Muhkam, Mutashabih & Rules of Context (Siyaq)',
          'Hermeneutics',
          40,
          'Analyze textual coherence and scholarly consensus in resolving apparent textual ambiguities.',
          `${shortMarhala} Viva & Written`
        ),
      ],
    },
    {
      id: `${prefix}-arabic-lit`,
      code: isKamil ? 'KM-402' : 'FZ-302',
      name: 'Classical & Modern Arabic Literature',
      boardTag,
      category: 'Core',
      description:
        'Advanced Arabic literary criticism, classical odes, Maqamat prose, and academic Arabic essay composition.',
      lessons: [
        makeLesson(
          `${prefix}-arabic-lit`,
          1,
          'Classical Arabic Poetry Analysis & Prosody (Ilm al-Arud)',
          'Literary Criticism',
          40,
          'Evaluate meter, metaphor, and socio-historical themes in Umayyad and Abbasid poetry.',
          `${shortMarhala} Literature Paper`
        ),
        makeLesson(
          `${prefix}-arabic-lit`,
          2,
          'Academic Arabic Composition & Research Writing Style',
          'Advanced Insha',
          40,
          'Compose well-cited Arabic essays using formal discourse markers and precise syntax.',
          `${shortMarhala} Paper 2`
        ),
        makeLesson(
          `${prefix}-arabic-lit`,
          3,
          'Translation of Classical Texts into Academic English & Bangla',
          'Applied Translation',
          35,
          'Preserve juristic and theological precision when rendering classical Arabic passages.',
          `${shortMarhala} Translation Exam`
        ),
      ],
    },
  ];

  let higherMajors: AliaStudentSubject[] = [];

  if (department === 'Hadith & Tafsir') {
    higherMajors = [
      {
        id: `${prefix}-bukhari`,
        code: isKamil ? 'KM-411' : 'FZ-311',
        name: isKamil ? 'Sahih al-Bukhari & Sahih Muslim' : 'Mishkat al-Masabih & Sunan Studies',
        boardTag: `${boardTag} Hadith`,
        category: 'Department Major',
        description: isKamil
          ? 'In-depth commentary on Sahih al-Bukhari Tarajim (chapter headings), Sahih Muslim Muqaddimah, and narrator critique.'
          : 'Comprehensive study of Mishkat al-Masabih chapters alongside Mustalah al-Hadith chains and grading.',
        lessons: [
          makeLesson(
            `${prefix}-bukhari`,
            1,
            isKamil
              ? 'Fiqh al-Bukhari: Chapter Headings & Legal Deductions'
              : 'Mishkat al-Masabih: Kitab al-Buyu’ & Kitab al-Nikah',
            'Hadith Commentary',
            50,
            'Trace how classical Muhaddithun derive legal principles directly from Hadith wording and chapters.',
            `${shortMarhala} Paper 1`
          ),
          makeLesson(
            `${prefix}-bukhari`,
            2,
            'Ilm al-Jarh wa al-Ta’dil (Narrator Evaluation Principles)',
            'Asma al-Rijal',
            45,
            'Apply classical narrator grading scales and analyze chain continuity (Ittisal al-Sanad).',
            `${shortMarhala} Paper 2`
          ),
          makeLesson(
            `${prefix}-bukhari`,
            3,
            'Reconciling Apparently Conflicting Hadiths (Mukhtalif al-Hadith)',
            'Usul al-Hadith',
            45,
            'Practice Jam’ (harmonization), Tarjih (preponderance), and Naskh methodologies.',
            `${shortMarhala} Seminar & Written`
          ),
        ],
      },
      {
        id: `${prefix}-tirmidhi`,
        code: isKamil ? 'KM-412' : 'FZ-312',
        name: isKamil ? 'Jami’ al-Tirmidhi & Comparative Sunan' : 'Usul al-Tafsir & Quranic Sciences',
        boardTag: `${boardTag} Hadith & Tafsir`,
        category: 'Department Major',
        description: isKamil
          ? 'Imam Tirmidhi’s grading terminology (Hasan Sahih), comparative Madhhab evidences, and Sunan Abu Dawud rulings.'
          : 'History of Quranic compilation, Qira’at transmission, and principles of authoritative Tafsir.',
        lessons: [
          makeLesson(
            `${prefix}-tirmidhi`,
            1,
            isKamil
              ? 'Imam Tirmidhi’s Unique Grading Terms & Juristic Notes'
              : 'Jam’ al-Quran: Compilation Across the Prophetic & Uthmanic Eras',
            isKamil ? 'Sunan Methodology' : 'History of Quran',
            45,
            'Examine primary historical documentation and methodological terminology accurately.',
            `${shortMarhala} Written Exam`
          ),
          makeLesson(
            `${prefix}-tirmidhi`,
            2,
            'Comparative Evidences Across the Four Sunni Schools',
            'Comparative Analysis',
            45,
            'Present Hanafi, Shafi’i, Maliki, and Hanbali Hadith evidences respectfully and objectively.',
            `${shortMarhala} Essay Question`
          ),
          makeLesson(
            `${prefix}-tirmidhi`,
            3,
            'Critical Reading of Classical Commentaries (Fath al-Bari & Sharh Nawawi)',
            'Research Skills',
            40,
            'Synthesize commentary notes into concise academic study briefs.',
            `${shortMarhala} Comprehensive Viva`
          ),
        ],
      },
    ];
  } else if (department === 'Fiqh & Usul') {
    higherMajors = [
      {
        id: `${prefix}-hidayah`,
        code: isKamil ? 'KM-421' : 'FZ-321',
        name: isKamil ? 'Al-Hidayah (Advanced) & Comparative Fiqh' : 'Al-Hidayah & Islamic Legal Maxims',
        boardTag: `${boardTag} Fiqh`,
        category: 'Department Major',
        description:
          'Detailed Hanafi jurisprudence across commercial transactions, Islamic finance, judiciary (Qada), and Qawa’id Fiqhiyyah.',
        lessons: [
          makeLesson(
            `${prefix}-hidayah`,
            1,
            'Five Universal Legal Maxims (Al-Qawa’id al-Fiqhiyyah)',
            'Legal Maxims',
            45,
            'Apply maxims such as Al-Umur bi-Maqasidiha and Al-Yaqin la Yazulu bil-Shakk to modern cases.',
            `${shortMarhala} Fiqh Paper 1`
          ),
          makeLesson(
            `${prefix}-hidayah`,
            2,
            'Islamic Commercial Contracts: Murabahah, Mudarabah & Ijarah',
            'Fiqh al-Mu’amalat',
            50,
            'Analyze Shariah compliance requirements, risk sharing, and prohibition of Riba and Gharar.',
            `${shortMarhala} Applied Jurisprudence`
          ),
          makeLesson(
            `${prefix}-hidayah`,
            3,
            'Comparative Fiqh Analysis & Contemporary Fatwa Etiquette',
            'Ifta & Methodology',
            45,
            'Structure balanced juristic opinions citing primary textual proofs and Maqasid al-Shariah.',
            `${shortMarhala} Case Paper`
          ),
        ],
      },
      {
        id: `${prefix}-usul`,
        code: isKamil ? 'KM-422' : 'FZ-322',
        name: 'Usul al-Fiqh & Maqasid al-Shariah',
        boardTag: `${boardTag} Usul`,
        category: 'Department Major',
        description:
          'Nur al-Anwar / Tawdih legal theory, Qiyas, Istihsan, Maslahah Mursalah, and higher objectives of Islamic law.',
        lessons: [
          makeLesson(
            `${prefix}-usul`,
            1,
            'Dilalat al-Alfaz: Ibarah, Isharah, Dalalah & Iqtida al-Nass',
            'Textual Derivation',
            45,
            'Distinguish the four Hanafi levels of textual implication with worked Quranic examples.',
            `${shortMarhala} Usul Paper`
          ),
          makeLesson(
            `${prefix}-usul`,
            2,
            'Qiyas (Analogical Reasoning), Illah & Istihsan',
            'Legal Reasoning',
            45,
            'Evaluate conditions of an effective legal cause (Illah) and juristic preference (Istihsan).',
            `${shortMarhala} Analytical Essay`
          ),
          makeLesson(
            `${prefix}-usul`,
            3,
            'Maqasid al-Shariah: Daruriyyat, Hajiyyat & Tahsiniyyat',
            'Objectives of Law',
            40,
            'Connect preservation of faith, life, intellect, lineage, and property to contemporary issues.',
            `${shortMarhala} Research Paper`
          ),
        ],
      },
    ];
  } else {
    // Fazil / Kamil General
    higherMajors = [
      {
        id: `${prefix}-islamic-studies`,
        code: isKamil ? 'KM-431' : 'FZ-331',
        name: 'Islamic Studies, Kalam & Contemporary Thought',
        boardTag: `${boardTag} General`,
        category: 'Department Major',
        description:
          'Islamic theology (Aqidah al-Tahawiyyah), ethics, socio-economic thought, and contemporary Muslim world studies.',
        lessons: [
          makeLesson(
            `${prefix}-islamic-studies`,
            1,
            'Aqidah al-Tahawiyyah & Sunni Theological Foundations',
            'Ilm al-Kalam',
            40,
            'Examine classical creed statements on divine attributes, revelation, and human responsibility.',
            `${shortMarhala} Theology Paper`
          ),
          makeLesson(
            `${prefix}-islamic-studies`,
            2,
            'Islamic Economics, Waqf Institutions & Social Welfare',
            'Socio-Economic Studies',
            45,
            'Evaluate how Zakah, Waqf, and ethical finance address poverty alleviation and education.',
            `${shortMarhala} Essay & Viva`
          ),
          makeLesson(
            `${prefix}-islamic-studies`,
            3,
            'Da’wah Methodology & Interfaith Dialogue Principles',
            'Contemporary Thought',
            40,
            'Apply Quranic principles of wisdom (Hikmah) and respectful academic engagement.',
            `${shortMarhala} Paper 2`
          ),
        ],
      },
      {
        id: `${prefix}-fiqh-gen`,
        code: isKamil ? 'KM-432' : 'FZ-332',
        name: 'Applied Fiqh & Islamic Heritage in South Asia',
        boardTag: `${boardTag} General`,
        category: 'Department Major',
        description:
          'Core jurisprudence essentials combined with the educational history of Alia Madrasas in Bangladesh.',
        lessons: [
          makeLesson(
            `${prefix}-fiqh-gen`,
            1,
            'Core Principles of Personal Law & Inheritance',
            'Applied Jurisprudence',
            40,
            'Review primary statutory and Shariah principles governing family welfare and inheritance.',
            `${shortMarhala} Written Exam`
          ),
          makeLesson(
            `${prefix}-fiqh-gen`,
            2,
            'Evolution of Alia Madrasa Curriculum in Bangladesh',
            'Educational History',
            40,
            'Trace the integration of classical Islamic sciences with modern disciplines in Bangladesh.',
            `${shortMarhala} Long Question`
          ),
          makeLesson(
            `${prefix}-fiqh-gen`,
            3,
            'Research Methodology & Academic Citation Standards',
            'Research Skills',
            35,
            'Structure literature reviews, Arabic/English footnotes, and thesis proposals cleanly.',
            `${shortMarhala} Research Module`
          ),
        ],
      },
    ];
  }

  return [
    ...coreHigher,
    ...higherMajors,
    {
      id: `${prefix}-eng-research`,
      code: isKamil ? 'KM-440' : 'FZ-340',
      name: 'Academic English & Digital Research Skills',
      boardTag,
      category: 'Elective',
      description:
        'Scholarly English reading, précis writing, and digital cataloguing of classical Islamic manuscripts and journals.',
      lessons: [
        makeLesson(
          `${prefix}-eng-research`,
          1,
          'Academic Essay Structure & Critical Reading in English',
          'English Proficiency',
          35,
          'Draft concise thesis-driven essays and summarize scholarly articles accurately.',
          `${shortMarhala} Compulsory English`
        ),
        makeLesson(
          `${prefix}-eng-research`,
          2,
          'Digital Hadith & Tafsir Databases for Academic Verification',
          'Digital Research',
          35,
          'Cross-check primary source citations, volume/page references, and bibliography formats.',
          'Research Practicum'
        ),
      ],
    },
  ];
}

export const aliaStudentService = {
  validateAliaStudentCoupon(
    rawCode: string,
    now = Date.now()
  ): AliaStudentCouponValidationResult {
    const code = rawCode.trim().toUpperCase();
    if (!code) {
      return {
        ok: false,
        message: 'Please enter your Alia Madrasa student coupon code (e.g., S-74201).',
      };
    }

    if (/^T-\d{5}$/.test(code)) {
      return {
        ok: false,
        message:
          'This code is a Teacher coupon (T-XXXXX). Please enter a Student coupon starting with S- (e.g., S-74201).',
      };
    }

    if (!/^S-\d{5}$/.test(code)) {
      return {
        ok: false,
        message: 'Invalid coupon format. Student coupons must follow the S-XXXXX format (e.g., S-74201).',
      };
    }

    const store = readAliaStore(now);
    const match = store.coupons.find(
      (c) => c.pathway === 'alia' && c.code.toUpperCase() === code
    );

    if (!match) {
      return {
        ok: false,
        message:
          'Coupon not found in the Alia Madrasa portal. Verify the code with your Alia Madrasa Administrator.',
      };
    }

    if (match.role !== 'student') {
      return {
        ok: false,
        message: 'This coupon is not assigned for Student enrollment.',
      };
    }

    if (match.status === 'used') {
      return {
        ok: false,
        message:
          'This student coupon has already been redeemed. Request a new S-XXXXX code from your Alia Madrasa Admin.',
      };
    }

    if (match.status === 'expired' || match.expiresAt <= now) {
      return {
        ok: false,
        message:
          'This student coupon has expired (48-hour validity window passed). Please request a fresh code.',
      };
    }

    return {
      ok: true,
      coupon: match,
      message: 'Valid Alia Madrasa student coupon verified.',
    };
  },

  submitAliaStudentCouponRegistration(
    input: AliaStudentRegistrationInput,
    now = Date.now()
  ): { ok: true; registration: AliaPendingRegistration } | { ok: false; error: string } {
    const couponCheck = this.validateAliaStudentCoupon(input.couponCode, now);
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

    const passwordCheck = validatePassword(input.password);
    if (!passwordCheck.valid) {
      return { ok: false, error: 'Password must be at least 8 characters long.' };
    }

    if (!isValidMarhala(input.marhala)) {
      return { ok: false, error: 'Please select a valid Alia Madrasa Marhala / Academic Level.' };
    }

    if (!isValidDepartmentForMarhala(input.marhala, input.department)) {
      return {
        ok: false,
        error: `Please select a valid Department / Stream for ${getShortMarhalaLabel(input.marhala)}.`,
      };
    }

    const normalizedEmail = input.email.trim().toLowerCase();
    const store = readAliaStore(now);

    const existsInPending = store.pending.some(
      (p) => p.pathway === 'alia' && p.email.toLowerCase() === normalizedEmail
    );
    if (existsInPending) {
      return {
        ok: false,
        error: `An application for ${normalizedEmail} is already awaiting approval in the Alia Madrasa queue.`,
      };
    }

    const existsInDirectory = store.profiles.some(
      (p) => p.pathway === 'alia' && p.email.toLowerCase() === normalizedEmail
    );
    if (existsInDirectory) {
      return {
        ok: false,
        error: `An account with ${normalizedEmail} already exists in Alia Madrasa. Try signing in instead.`,
      };
    }

    const registration: AliaPendingRegistration = {
      id: `ALIA-PND-S${now % 100000}`,
      role: 'student',
      pathway: 'alia',
      fullName: input.fullName.trim(),
      email: normalizedEmail,
      marhala: input.marhala,
      department: input.department,
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
      id: `ALIA-ACT-${now}-${Math.floor(Math.random() * 1000)}`,
      pathway: 'alia',
      category: 'approval',
      summary: `New ${getShortMarhalaLabel(registration.marhala)} (${registration.department}) student registration submitted by ${registration.fullName} (${registration.couponCode}).`,
      actorEmail: normalizedEmail,
      createdAt: now,
    });
    if (store.activities.length > 80) {
      store.activities = store.activities.slice(0, 80);
    }

    writeAliaStore(store);
    return { ok: true, registration };
  },

  /**
   * Synchronizes an active Alia Madrasa student account into edura_multi_db_v1
   * so AuthContext.login() works cleanly without touching authService.ts or other pathways.
   */
  prepareAliaStudentAccountForLogin(
    rawEmail: string,
    rawPassword: string,
    now = Date.now()
  ): void {
    const email = rawEmail.trim().toLowerCase();
    if (!email) return;

    const store = readAliaStore(now);
    const preset = getDemoAliaStudentPreset();

    const directoryMatch = store.profiles.find(
      (p) => p.pathway === 'alia' && p.role === 'student' && p.email.toLowerCase() === email
    );

    if (directoryMatch && directoryMatch.status === 'suspended') {
      return;
    }

    const isPresetLogin = email === preset.email.toLowerCase();
    if (!directoryMatch && !isPresetLogin) {
      return;
    }

    const fullName = directoryMatch?.fullName ?? preset.fullName;
    const userId = directoryMatch?.id ?? 'alia-student-demo-01';

    const db = loadDatabase(now);
    const existingIdx = db.users.findIndex(
      (u) => u.role === 'student' && u.email.toLowerCase() === email
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
        role: 'student',
        fullName,
        email,
        passwordHash: passwordToStore,
        mustChangePassword: false,
        preferredLanguage: 'en',
        createdAt: directoryMatch?.joinedAt ?? now - 21 * 24 * 60 * 60 * 1000,
        educationStream: 'Bangladesh Madrasa Education',
        pathway: 'Alia',
      };
      db.users.push(account);
      saveDatabase(db);
    }
  },

  resolveAliaStudentContext(
    session: AuthSession,
    profile?: Omit<UserAccount, 'passwordHash'> | null,
    now = Date.now()
  ): AliaStudentContext | null {
    if (session.role !== 'student') return null;

    const pathway =
      resolveAliaPathway(session.selectedPathway) ?? resolveAliaPathway(profile?.pathway);
    if (!pathway) return null;

    const store = readAliaStore(now);
    const email = session.email.trim().toLowerCase();
    const match = store.profiles.find(
      (p) => p.pathway === 'alia' && p.role === 'student' && p.email.toLowerCase() === email
    );

    if (match) {
      return {
        userId: match.id,
        fullName: match.fullName,
        email: match.email,
        pathway: 'alia',
        marhala: match.marhala,
        department: match.department,
        registrationType: match.registrationType,
        couponCode: match.couponCode,
        joinedAt: match.joinedAt,
      };
    }

    const preset = getDemoAliaStudentPreset();
    return {
      userId: session.userId,
      fullName: session.fullName || preset.fullName,
      email: session.email || preset.email,
      pathway: 'alia',
      marhala: preset.marhala,
      department: preset.department,
      registrationType: 'coupon_auto',
      joinedAt: profile?.createdAt ?? session.loggedInAt,
    };
  },

  getCompletedLessonIds(userId: string): string[] {
    const map = loadProgressMap();
    return map[`alia:${userId}`] ?? [];
  },

  toggleLessonCompleted(userId: string, lessonId: string): string[] {
    const map = loadProgressMap();
    const key = `alia:${userId}`;
    const current = new Set(map[key] ?? []);
    if (current.has(lessonId)) {
      current.delete(lessonId);
    } else {
      current.add(lessonId);
    }
    const next = Array.from(current);
    map[key] = next;
    saveProgressMap(map);
    return next;
  },

  listRelevantNotices(
    student: AliaStudentContext,
    filters: {
      query?: string;
      audience?: 'all' | 'student' | 'both';
      tag?: 'all' | AliaNoticeTag;
    } = {},
    now = Date.now()
  ): AliaNotice[] {
    const store = readAliaStore(now);
    const q = (filters.query ?? '').trim().toLowerCase();

    return store.notices
      .filter((n) => n.pathway === 'alia')
      .filter((n) => n.audience === 'student' || n.audience === 'both')
      .filter((n) => n.marhala === 'all' || n.marhala === student.marhala)
      .filter((n) => n.department === 'all' || n.department === student.department)
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

  listPendingRegistrations(now = Date.now()): AliaPendingRegistration[] {
    const store = readAliaStore(now);
    return store.pending.filter((p) => p.pathway === 'alia');
  },

  updateAliaStudentPassword(
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
      (u) => u.role === 'student' && u.email.toLowerCase() === normalizedEmail
    );

    if (userIdx === -1) {
      return { ok: false, error: 'Student account record could not be located.' };
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

    const store = readAliaStore(now);
    let updatedProfile = false;
    store.profiles = store.profiles.map((p) => {
      if (p.pathway === 'alia' && p.role === 'student' && p.email.toLowerCase() === normalizedEmail) {
        updatedProfile = true;
        return { ...p, passwordHash: nextHash, updatedAt: now };
      }
      return p;
    });
    if (updatedProfile) {
      writeAliaStore(store);
    }

    return { ok: true };
  },

  resetInMemoryStateForTests(): void {
    memoryAliaStore = null;
    memoryProgressStore = {};
  },
};
