import { loadDatabase, saveDatabase } from './storage';
import type { AuthSession, UserAccount } from '../types/domain';
import { hashPassword, verifyPassword } from '../utils/crypto';
import { validateEmail, validateFullName, validatePassword } from '../utils/validation';

export type QawmiPathway = 'qawmi';

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

export type QawmiNoticeAudience = 'student' | 'teacher' | 'both';
export type QawmiNoticeTag = 'General' | 'Exam' | 'Urgent';
export type QawmiRegistrationType = 'coupon_auto' | 'manual_admin';

export interface QawmiCoupon {
  id: string;
  code: string;
  pathway: QawmiPathway;
  role: 'student' | 'teacher';
  status: 'active' | 'used' | 'expired';
  createdAt: number;
  expiresAt: number;
  usedAt?: number;
  issuedBy: string;
}

export interface QawmiPendingRegistration {
  id: string;
  role: 'student' | 'teacher';
  pathway: QawmiPathway;
  fullName: string;
  email: string;
  marhala: QawmiMarhala;
  focusBranch: QawmiFocusBranch;
  couponCode: string;
  submittedAt: number;
  expiresAt: number;
}

export interface QawmiUserProfile {
  id: string;
  role: 'student' | 'teacher';
  pathway: QawmiPathway;
  fullName: string;
  email: string;
  passwordHash: string;
  marhala: QawmiMarhala;
  focusBranch: QawmiFocusBranch;
  status: 'active' | 'suspended';
  registrationType: QawmiRegistrationType;
  couponCode?: string;
  joinedAt: number;
  updatedAt?: number;
}

export interface QawmiNotice {
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

export interface QawmiActivityItem {
  id: string;
  pathway: QawmiPathway;
  category: 'coupon' | 'approval' | 'directory' | 'notice' | 'security';
  summary: string;
  actorEmail: string;
  createdAt: number;
}

export interface QawmiWorkspaceStore {
  coupons: QawmiCoupon[];
  pending: QawmiPendingRegistration[];
  profiles: QawmiUserProfile[];
  notices: QawmiNotice[];
  activities: QawmiActivityItem[];
}

export interface QawmiStudentContext {
  userId: string;
  fullName: string;
  email: string;
  pathway: QawmiPathway;
  marhala: QawmiMarhala;
  focusBranch: QawmiFocusBranch;
  registrationType: QawmiRegistrationType;
  couponCode?: string;
  joinedAt: number;
}

export interface QawmiStudentLesson {
  id: string;
  title: string;
  keyTopic: string;
  durationMinutes: number;
  summary: string;
  examFocus: string;
}

export interface QawmiStudentSubject {
  id: string;
  code: string;
  name: string;
  kitabTag: string;
  category: 'Core Kitab' | 'Focus Branch' | 'Tarbiyah & Adab';
  description: string;
  lessons: QawmiStudentLesson[];
}

export interface QawmiDemoStudentPreset {
  pathway: QawmiPathway;
  fullName: string;
  email: string;
  password: string;
  marhala: QawmiMarhala;
  focusBranch: QawmiFocusBranch;
}

export interface QawmiStudentCouponValidationResult {
  ok: boolean;
  coupon?: QawmiCoupon;
  message: string;
}

export interface QawmiStudentRegistrationInput {
  couponCode: string;
  fullName: string;
  email: string;
  password: string;
  marhala: QawmiMarhala;
  focusBranch?: QawmiFocusBranch | '';
}

export const QAWMI_MARHALA_OPTIONS: QawmiMarhala[] = [
  'Maktab / Hifz / Nazera',
  'Ibtidaiyyah (Primary Marhala)',
  'Mutawassitah (Middle Marhala)',
  'Sanawiyyah Ulya (Higher Secondary Marhala)',
  'Fazilat (Degree Marhala)',
  'Takmil (Masters / Dawra-e-Hadith Marhala)',
];

export const QAWMI_FOCUS_BRANCH_OPTIONS: QawmiFocusBranch[] = [
  'General / Kitab',
  'Hifzul Quran',
  'Tajweed & Qiraat',
  'Hadith & Tafsir',
  'Fiqh & Usul',
  'Arabic & Adab',
];

const QAWMI_STORE_KEY = 'edura_qawmi_workspace_v1';
const QAWMI_PROGRESS_STORAGE_KEY = 'edura_qawmi_student_progress_v1';
const FORTY_EIGHT_HOURS_MS = 48 * 60 * 60 * 1000;

let memoryQawmiStore: QawmiWorkspaceStore | null = null;
let memoryQawmiProgressStore: Record<string, string[]> = {};

function canUseLocalStorage(): boolean {
  try {
    return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
  } catch {
    return false;
  }
}

export function isQawmiPathway(raw?: string | null): boolean {
  if (!raw) return false;
  const normalized = raw.trim().toLowerCase();
  return (
    normalized === 'qawmi' ||
    normalized === 'qawmi madrasa' ||
    normalized === 'qawmi_madrasa' ||
    normalized === 'qawmi panel'
  );
}

export function resolveQawmiPathway(raw?: string | null): QawmiPathway | null {
  return isQawmiPathway(raw) ? 'qawmi' : null;
}

export function getQawmiPathwayLabel(): string {
  return 'Qawmi Madrasa';
}

export function getQawmiBoardName(): string {
  return 'Wifaqul Madarisil Arabia Bangladesh (Befaq / Dars-e-Nizami)';
}

export function isValidQawmiMarhala(value: string): value is QawmiMarhala {
  return (QAWMI_MARHALA_OPTIONS as string[]).includes(value);
}

export function isValidQawmiFocusBranch(value: string): value is QawmiFocusBranch {
  return (QAWMI_FOCUS_BRANCH_OPTIONS as string[]).includes(value);
}

export function getShortQawmiMarhalaLabel(marhala: QawmiMarhala): string {
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

export function formatQawmiStudentContextBadge(
  marhala: QawmiMarhala,
  focusBranch: QawmiFocusBranch
): string {
  return `Qawmi Madrasa • ${getShortQawmiMarhalaLabel(marhala)} • ${focusBranch}`;
}

export function getDemoQawmiStudentPreset(): QawmiDemoStudentPreset {
  return {
    pathway: 'qawmi',
    fullName: 'Tariqul Islam',
    email: 'tariqul.islam@qawmi-student.edu.bd',
    password: 'Student@1234',
    marhala: 'Mutawassitah (Middle Marhala)',
    focusBranch: 'General / Kitab',
  };
}

function createInitialQawmiStore(now: number): QawmiWorkspaceStore {
  const hour = 60 * 60 * 1000;
  const day = 24 * hour;
  const demoPreset = getDemoQawmiStudentPreset();
  const defaultStudentHash = hashPassword(demoPreset.password);

  return {
    coupons: [
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
        id: 'QAWMI-CPN-S02',
        code: 'S-85119',
        pathway: 'qawmi',
        role: 'student',
        status: 'active',
        createdAt: now - 1 * hour,
        expiresAt: now + 47 * hour,
        issuedBy: 'muhtamim@qawmi-madrasa.edu.bd',
      },
      {
        id: 'QAWMI-CPN-S03',
        code: 'S-85042',
        pathway: 'qawmi',
        role: 'student',
        status: 'used',
        createdAt: now - 26 * hour,
        expiresAt: now + 22 * hour,
        usedAt: now - 16 * hour,
        issuedBy: 'muhtamim@qawmi-madrasa.edu.bd',
      },
      {
        id: 'QAWMI-CPN-S04',
        code: 'S-85009',
        pathway: 'qawmi',
        role: 'student',
        status: 'expired',
        createdAt: now - 72 * hour,
        expiresAt: now - 24 * hour,
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
    ],
    pending: [
      {
        id: 'QAWMI-PND-S01',
        role: 'student',
        pathway: 'qawmi',
        fullName: 'Muhammad Zubair Ahmad',
        email: 'zubair.ahmad@qawmi-student.edu.bd',
        marhala: 'Sanawiyyah Ulya (Higher Secondary Marhala)',
        focusBranch: 'Arabic & Adab',
        couponCode: 'S-85042',
        submittedAt: now - 16 * hour,
        expiresAt: now + 32 * hour,
      },
    ],
    profiles: [
      {
        id: 'qawmi-student-demo-01',
        role: 'student',
        pathway: 'qawmi',
        fullName: demoPreset.fullName,
        email: demoPreset.email,
        passwordHash: defaultStudentHash,
        marhala: demoPreset.marhala,
        focusBranch: demoPreset.focusBranch,
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
        passwordHash: defaultStudentHash,
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
        passwordHash: defaultStudentHash,
        marhala: 'Takmil (Masters / Dawra-e-Hadith Marhala)',
        focusBranch: 'Hadith & Tafsir',
        status: 'active',
        registrationType: 'manual_admin',
        joinedAt: now - 42 * day,
      },
    ],
    notices: [
      {
        id: 'QAWMI-NTC-01',
        pathway: 'qawmi',
        title: 'Befaq Central Markazi Imtihan Kitab Revision & Takrar Schedule',
        description:
          'All Qawmi Madrasa Talaba from Ibtidaiyyah through Takmil are notified that the pre-Befaq Takrar (evening revision circles) will take place daily after Maghrib in the Darul Hadith and main Jamaat halls. Ensure all prescribed kitabs and Hifz Sabki logs are signed by your Nigran Ustad.',
        audience: 'both',
        marhala: 'all',
        focusBranch: 'all',
        tag: 'Exam',
        createdAt: now - 6 * hour,
        updatedAt: now - 6 * hour,
      },
      {
        id: 'QAWMI-NTC-02',
        pathway: 'qawmi',
        title: 'Mutawassitah Nahw & Sarf Tarkeeb Practical Workshop',
        description:
          'Mutawassitah (Middle Marhala) students studying Hidayatun Nahw and Ilmus Sighah will participate in an intensive Arabic sentence analysis (Tarkeeb) and verb-declension workshop on Thursday at 10:00 AM in Hall B.',
        audience: 'student',
        marhala: 'Mutawassitah (Middle Marhala)',
        focusBranch: 'all',
        tag: 'General',
        createdAt: now - 14 * hour,
        updatedAt: now - 14 * hour,
      },
      {
        id: 'QAWMI-NTC-03',
        pathway: 'qawmi',
        title: 'Urgent: Befaq Registration Form & Tazkiyah Verification Deadline',
        description:
          'Every candidate appearing in this year’s Wifaqul Madarisil Arabia (Befaq) board examination must verify their full name, father’s name, Marhala, and Darajah roll entry at the Daftar-e-Talimat before Friday Jumu’ah.',
        audience: 'both',
        marhala: 'all',
        focusBranch: 'all',
        tag: 'Urgent',
        createdAt: now - 4 * hour,
        updatedAt: now - 4 * hour,
      },
      {
        id: 'QAWMI-NTC-04',
        pathway: 'qawmi',
        title: 'Weekly Mashq-e-Qiraat & Hifz Daur Assessment',
        description:
          'Students enrolled in Maktab / Hifz / Nazera and Tajweed & Qiraat focus groups will present one full Juz Daur recitation with Makharij and Waqf precision before the Qiraat committee on Wednesday afternoon.',
        audience: 'student',
        marhala: 'all',
        focusBranch: 'all',
        tag: 'General',
        createdAt: now - 28 * hour,
        updatedAt: now - 28 * hour,
      },
      {
        id: 'QAWMI-NTC-05',
        pathway: 'qawmi',
        title: 'Dawra-e-Hadith (Takmil) Sahih al-Bukhari Khatam Seminar',
        description:
          'Takmil (Masters / Dawra-e-Hadith Marhala) students are requested to submit their Sanad chain notes and Mukhtalif al-Hadith summaries ahead of the senior Muhaddith colloquium.',
        audience: 'student',
        marhala: 'Takmil (Masters / Dawra-e-Hadith Marhala)',
        focusBranch: 'all',
        tag: 'Exam',
        createdAt: now - 20 * hour,
        updatedAt: now - 20 * hour,
      },
      {
        id: 'QAWMI-NTC-06',
        pathway: 'qawmi',
        title: 'Asatizah Council: Takrar & Oral Imtihan Marking Standards',
        description:
          'Internal notice for Qawmi Madrasa Ustads only: Please review oral Shifah marking rubrics in the Majlis-e-Ilmi room after Asr.',
        audience: 'teacher',
        marhala: 'all',
        focusBranch: 'all',
        tag: 'General',
        createdAt: now - 10 * hour,
        updatedAt: now - 10 * hour,
      },
    ],
    activities: [
      {
        id: 'QAWMI-ACT-01',
        pathway: 'qawmi',
        category: 'notice',
        summary: 'Published Befaq registration & Daftar-e-Talimat verification notice for Qawmi students.',
        actorEmail: 'muhtamim@qawmi-madrasa.edu.bd',
        createdAt: now - 4 * hour,
      },
    ],
  };
}

function readQawmiStore(now = Date.now()): QawmiWorkspaceStore {
  if (canUseLocalStorage()) {
    const raw = window.localStorage.getItem(QAWMI_STORE_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as QawmiWorkspaceStore;
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
        // Re-seed cleanly below
      }
    }
    const seeded = createInitialQawmiStore(now);
    window.localStorage.setItem(QAWMI_STORE_KEY, JSON.stringify(seeded));
    return seeded;
  }

  if (!memoryQawmiStore) {
    memoryQawmiStore = createInitialQawmiStore(now);
  }
  return memoryQawmiStore;
}

function writeQawmiStore(store: QawmiWorkspaceStore): void {
  if (canUseLocalStorage()) {
    window.localStorage.setItem(QAWMI_STORE_KEY, JSON.stringify(store));
  } else {
    memoryQawmiStore = store;
  }
}

function loadQawmiProgressMap(): Record<string, string[]> {
  if (canUseLocalStorage()) {
    try {
      const raw = window.localStorage.getItem(QAWMI_PROGRESS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Record<string, string[]>;
        if (parsed && typeof parsed === 'object') {
          return parsed;
        }
      }
    } catch {
      // Ignore parse failures
    }
    return {};
  }
  return memoryQawmiProgressStore;
}

function saveQawmiProgressMap(map: Record<string, string[]>): void {
  if (canUseLocalStorage()) {
    window.localStorage.setItem(QAWMI_PROGRESS_STORAGE_KEY, JSON.stringify(map));
  } else {
    memoryQawmiProgressStore = map;
  }
}

export function getDemoQawmiStudentCouponHint(now = Date.now()): string {
  const store = readQawmiStore(now);
  const active = store.coupons.find(
    (c) =>
      c.pathway === 'qawmi' &&
      c.role === 'student' &&
      c.status === 'active' &&
      c.expiresAt > now
  );
  return active ? active.code : 'S-85101';
}

function makeLesson(
  prefix: string,
  idx: number,
  title: string,
  keyTopic: string,
  durationMinutes: number,
  summary: string,
  examFocus: string
): QawmiStudentLesson {
  return {
    id: `${prefix}-L${idx}`,
    title,
    keyTopic,
    durationMinutes,
    summary,
    examFocus,
  };
}

function getFocusBranchKitabs(
  marhala: QawmiMarhala,
  focusBranch: QawmiFocusBranch
): QawmiStudentSubject[] {
  const shortMarhala = getShortQawmiMarhalaLabel(marhala);

  if (focusBranch === 'Hifzul Quran') {
    return [
      {
        id: 'qawmi-focus-hifz',
        code: 'QM-HFZ',
        name: 'Hifzul Quran, Sabak & Amukhta Cycle',
        kitabTag: `${shortMarhala} • Hifzul Quran`,
        category: 'Focus Branch',
        description:
          'Daily Sabak memorization, seven-day Sabki consolidation, and cumulative Amukhta (Manzil) mastery with Mutashabihat accuracy.',
        lessons: [
          makeLesson(
            'qawmi-focus-hifz',
            1,
            'Sabak, Sabki & Daily Amukhta Scheduling',
            'Hifz Discipline',
            35,
            'Structure morning Sabak targets alongside evening Sabki and continuous 30-Juz Manzil rotation.',
            'Oral Daur & Hustad Check'
          ),
          makeLesson(
            'qawmi-focus-hifz',
            2,
            'Mutashabihat (Similar Ayahs) Cross-Reference Drills',
            'Retention Precision',
            30,
            'Compare look-alike endings and transitions across Surahs Al-Baqarah, Al-A’raf, and Ash-Shu’ara.',
            'Befaq Hifz Oral Test'
          ),
          makeLesson(
            'qawmi-focus-hifz',
            3,
            'Waqf-e-Tam & Breath Control During Long Recitation',
            'Tartil & Waqf',
            25,
            'Practice clean pauses and smooth restarts (Ibtida) so Quranic sentence meanings stay unbroken.',
            'Qiraat & Hifz Practical'
          ),
        ],
      },
    ];
  }

  if (focusBranch === 'Tajweed & Qiraat') {
    return [
      {
        id: 'qawmi-focus-tajweed',
        code: 'QM-TJW',
        name: 'Ilmut Tajweed & Muqaddimah al-Jazariyyah',
        kitabTag: `${shortMarhala} • Tajweed & Qiraat`,
        category: 'Focus Branch',
        description:
          'Classical Tajweed mastery covering Makharij al-Huruf, Sifat Lazimah & Aridah, Madd counts, and Lahj-e-Arabi Qiraat cadence.',
        lessons: [
          makeLesson(
            'qawmi-focus-tajweed',
            1,
            'Al-Jazariyyah: 17 Makharij & Opposing Sifat',
            'Articulation Science',
            35,
            'Master Jahr vs Hams, Shiddah vs Rakhawah, and Isti’la letters through guided Surah recitation.',
            'Shifah (Oral) Examination'
          ),
          makeLesson(
            'qawmi-focus-tajweed',
            2,
            'Ahkam al-Ra, Lam al-Jalalah & Idgham Variants',
            'Applied Phonetics',
            30,
            'Identify Tafkheem and Tarqeeq conditions alongside Idgham Mutamathilayn, Mutajanisayn, and Mutaqaribayn.',
            'Befaq Tajweed Written'
          ),
          makeLesson(
            'qawmi-focus-tajweed',
            3,
            'Maqamat & Tartil Recitation Practice (Hafs an Asim)',
            'Qiraat Fluency',
            30,
            'Apply consistent 2, 4, and 6 Harakat Madd durations in measured Hadr and Tadwir recitations.',
            'Mashq-e-Qiraat Assessment'
          ),
        ],
      },
    ];
  }

  if (focusBranch === 'Hadith & Tafsir') {
    return [
      {
        id: 'qawmi-focus-hadith',
        code: 'QM-HDT',
        name: 'Usul al-Hadith, Rijal & Tafsir Methodology',
        kitabTag: `${shortMarhala} • Hadith & Tafsir`,
        category: 'Focus Branch',
        description:
          'Sanad verification, Mustalah al-Hadith terminology (Nukhbatul Fikar), and classical Tafsir comparison from Ibn Kathir & Jalalayn.',
        lessons: [
          makeLesson(
            'qawmi-focus-hadith',
            1,
            'Mustalah al-Hadith: Sahih, Hasan, Da’if & Shadh Criteria',
            'Nukhbatul Fikar',
            40,
            'Evaluate the five conditions of a Sahih Hadith and spot hidden defects (Ilal) in chains.',
            'Kitab Written & Oral'
          ),
          makeLesson(
            'qawmi-focus-hadith',
            2,
            'Tafsir bil-Ma’thur vs Juristic Deduction in Ayat al-Ahkam',
            'Usul al-Tafsir',
            35,
            'Trace how classical Mufassirun reconcile Asbab al-Nuzul with linguistic precision.',
            'Dars & Sharah Notes'
          ),
          makeLesson(
            'qawmi-focus-hadith',
            3,
            'Asma al-Rijal & Tabaqat of Tabi’in Narrators',
            'Narrator Criticism',
            35,
            'Analyze Jarh and Ta’dil terms used by Imam Bukhari, Yahya ibn Ma’in, and Ibn Hajar.',
            'Hadith Seminar'
          ),
        ],
      },
    ];
  }

  if (focusBranch === 'Fiqh & Usul') {
    return [
      {
        id: 'qawmi-focus-fiqh',
        code: 'QM-FQH',
        name: 'Hanafi Fiqh, Usul al-Fiqh & Faraid Calculation',
        kitabTag: `${shortMarhala} • Fiqh & Usul`,
        category: 'Focus Branch',
        description:
          'Structured study of Dars-e-Nizami Fiqh texts alongside Qawa’id Fiqhiyyah, Ilm al-Faraid (Siraji), and Fatwa adab.',
        lessons: [
          makeLesson(
            'qawmi-focus-fiqh',
            1,
            'Usul al-Shashi & Nur al-Anwar: Textual Implications',
            'Usul al-Fiqh',
            40,
            'Distinguish Ibarat al-Nass, Isharat al-Nass, Dalalat al-Nass, and Iqtidha al-Nass with proofs.',
            'Befaq Fiqh & Usul'
          ),
          makeLesson(
            'qawmi-focus-fiqh',
            2,
            'Siraji Inheritance Calculations: Asabah, Awl & Radd',
            'Ilm al-Faraid',
            40,
            'Solve estate distribution shares accurately step by step for primary and residuary heirs.',
            'Applied Problem Solving'
          ),
          makeLesson(
            'qawmi-focus-fiqh',
            3,
            'Radd al-Muhtar & Hidayah Commercial Contracts',
            'Mu’amalat',
            35,
            'Contrast Murabahah, Salam, Istisna, and valid Mudarabah partnerships.',
            'Case Discussion'
          ),
        ],
      },
    ];
  }

  if (focusBranch === 'Arabic & Adab') {
    return [
      {
        id: 'qawmi-focus-adab',
        code: 'QM-ADB',
        name: 'Arabic Insha, Balaghat & Classical Adab',
        kitabTag: `${shortMarhala} • Arabic & Adab`,
        category: 'Focus Branch',
        description:
          'Fluent Arabic writing (Insha), Mukhtarat & Maqamat literary analysis, and Durus al-Balaghat eloquence.',
        lessons: [
          makeLesson(
            'qawmi-focus-adab',
            1,
            'Durus al-Balaghat: Tashbih, Isti’arah & Kinayah',
            'Arabic Rhetoric',
            35,
            'Analyze classical metaphors in Quranic verses and pre-Islamic/Abbasid Arabic poetry.',
            'Balaghat Written Paper'
          ),
          makeLesson(
            'qawmi-focus-adab',
            2,
            'Al-Insha al-Arabi: Formal Essay & Muhadathah Fluency',
            'Arabic Composition',
            35,
            'Draft expressive Arabic essays using idiomatic connectors and faultless I’rab endings.',
            'Insha & Muhadathah'
          ),
          makeLesson(
            'qawmi-focus-adab',
            3,
            'Literary Commentary on Qasasun Nabiyyin & Mukhtarat',
            'Classical Prose',
            30,
            'Annotate rare Arabic vocabulary (Mufradat) and rhetorical parallelism in classic prose.',
            'Adab Oral & Written'
          ),
        ],
      },
    ];
  }

  return [];
}

export function getQawmiSubjectsForStudent(
  marhala: QawmiMarhala,
  focusBranch: QawmiFocusBranch
): QawmiStudentSubject[] {
  const focusExtras = getFocusBranchKitabs(marhala, focusBranch);

  if (marhala === 'Maktab / Hifz / Nazera') {
    return [
      {
        id: 'qawmi-mkt-qaida',
        code: 'MK-101',
        name: 'Quran Nazera, Noorani Qaida & Tajweed Foundations',
        kitabTag: 'Maktab / Nazera',
        category: 'Core Kitab',
        description:
          'Accurate letter recognition, Harakat & Tanween fluency, Makharij practice, and smooth Ampara/Quran Nazera recitation.',
        lessons: [
          makeLesson(
            'qawmi-mkt-qaida',
            1,
            'Huruf Tahajji, Makharij & Compound Letter Forms',
            'Noorani Foundation',
            25,
            'Pronounce all 29 Arabic letters cleanly from their exact articulation points without vowel drift.',
            'Daily Ustaz Shifah Check'
          ),
          makeLesson(
            'qawmi-mkt-qaida',
            2,
            'Noon Sakinah, Meem Sakinah & Madd Tabi’i',
            'Essential Tajweed',
            30,
            'Apply Ghunnah, Ikhfa, and Qalqalah accurately across Surah Al-Fatihah and Juz Amma.',
            'Nazera Oral Test'
          ),
          makeLesson(
            'qawmi-mkt-qaida',
            3,
            'Ampara Recitation & Essential Memorized Surahs',
            'Juz Amma Fluency',
            30,
            'Recite Surahs An-Naba through An-Nas smoothly with clear stopping signs.',
            'Maktab Monthly Assessment'
          ),
        ],
      },
      {
        id: 'qawmi-mkt-diniyat',
        code: 'MK-102',
        name: 'Talimul Islam & Masnoon Duas (Aqaid & Fiqh)',
        kitabTag: 'Maktab Diniyat',
        category: 'Core Kitab',
        description:
          'Practical Wudu, Salah posture & recitations, Five Pillars of Islam, and 40 daily Masnoon supplications.',
        lessons: [
          makeLesson(
            'qawmi-mkt-diniyat',
            1,
            'Iman-e-Mujmal, Iman-e-Mufassal & Kalimah',
            'Aqaid Basics',
            20,
            'Memorize core articles of faith with clear Bengali/English meanings.',
            'Oral Diniyat Exam'
          ),
          makeLesson(
            'qawmi-mkt-diniyat',
            2,
            'Practical Wudu, Ghusl & Complete Namaz Steps',
            'Fiqh of Ibadah',
            30,
            'Demonstrate Fard, Wajib, and Sunnah acts of Salah along with Thana, Tashahhud, and Dua-e-Qunoot.',
            'Practical Namaz Check'
          ),
          makeLesson(
            'qawmi-mkt-diniyat',
            3,
            'Daily Masnoon Duas & Adab with Parents and Ustads',
            'Tarbiyah & Duas',
            20,
            'Learn supplications for entering masjid, study, meals, and travel.',
            'Tarbiyah Evaluation'
          ),
        ],
      },
      ...focusExtras,
      {
        id: 'qawmi-mkt-tarbiyah',
        code: 'MK-103',
        name: 'Adab, Seerah Stories & Urdu/Bangla Literacy',
        kitabTag: 'Tarbiyah & Language',
        category: 'Tarbiyah & Adab',
        description:
          'Early Seerah narratives, cleanliness, truthfulness, and foundational Bangla, Urdu, and arithmetic handwriting.',
        lessons: [
          makeLesson(
            'qawmi-mkt-tarbiyah',
            1,
            'Childhood of the Prophet (PBUH) & Truthfulness',
            'Seerah & Akhlaq',
            25,
            'Reflect on Al-Amin character traits and everyday honesty in madrasa hostel and home life.',
            'Oral Storytelling'
          ),
          makeLesson(
            'qawmi-mkt-tarbiyah',
            2,
            'Arabic & Bangla Guided Dictation (Imla)',
            'Handwriting & Literacy',
            25,
            'Practice clean Naskh Arabic script alongside accurate Bangla reading.',
            'Notebook Check'
          ),
        ],
      },
    ];
  }

  if (marhala === 'Ibtidaiyyah (Primary Marhala)') {
    return [
      {
        id: 'qawmi-ibt-arabic',
        code: 'IB-201',
        name: 'Mizanus Sarf & Munshaib (Arabic Morphology)',
        kitabTag: 'Befaq Ibtidaiyyah',
        category: 'Core Kitab',
        description:
          'Mastery of Arabic verb conjugations (Gardans), triliteral roots, Abwab, and derived noun patterns.',
        lessons: [
          makeLesson(
            'qawmi-ibt-arabic',
            1,
            'Mizanus Sarf: Madi, Mudari & Amr Conjugation Tables',
            'Verbal Morphology',
            35,
            'Recite and write full 14-sighah active and passive verb tables effortlessly.',
            'Befaq Sarf Gardan Paper'
          ),
          makeLesson(
            'qawmi-ibt-arabic',
            2,
            'Munshaib: Six Abwab of Thulathi Mujarrad & Mazid Fih',
            'Root Classification',
            35,
            'Identify root letters (Fa, Ayn, Lam) and extra letters across common derived verb families.',
            'Sighah Identification'
          ),
          makeLesson(
            'qawmi-ibt-arabic',
            3,
            'Haft Aqsam (Seven Verb Categories: Sahih, Mithal, Ajwaf, Naqis)',
            'Weak Root Rules',
            30,
            'Distinguish sound roots from weak and doubled verbs in basic Quranic vocabulary.',
            'Ibtidaiyyah Oral & Written'
          ),
        ],
      },
      {
        id: 'qawmi-ibt-nahw',
        code: 'IB-202',
        name: 'Nahw Mir & Esho Arbi Shikhi (Introductory Syntax)',
        kitabTag: 'Befaq Ibtidaiyyah',
        category: 'Core Kitab',
        description:
          'Foundational Ism, Fi’l, and Harf classification, Murakkab Mufid, and simple Arabic reading passages.',
        lessons: [
          makeLesson(
            'qawmi-ibt-nahw',
            1,
            'Kalimah Parts (Ism, Fi’l, Harf) & Signs of Each',
            'Nahw Foundations',
            30,
            'Recognize nouns, verbs, and particles in short classical Arabic sentences.',
            'Befaq Nahw Paper'
          ),
          makeLesson(
            'qawmi-ibt-nahw',
            2,
            'Murakkab Idafi, Tawsifi & Jumlah Ismiyyah',
            'Phrase Structure',
            35,
            'Construct Mubtada-Khabar and Mudaf-Mudaf Ilayh phrases with accurate vowel endings.',
            'Tarkeeb Basics'
          ),
          makeLesson(
            'qawmi-ibt-nahw',
            3,
            'Esho Arbi Shikhi: Conversational Comprehension',
            'Arabic Reading',
            30,
            'Translate short Arabic stories and answer elementary questions in Arabic.',
            'Written Translation'
          ),
        ],
      },
      {
        id: 'qawmi-ibt-fiqh',
        code: 'IB-203',
        name: 'Beheshti Zewar & Noorul Idah Intro (Fiqh)',
        kitabTag: 'Befaq Ibtidaiyyah',
        category: 'Core Kitab',
        description:
          'Structured Hanafi rulings on cleanliness, Salah invalidators, Sajdah Sahw, fasting, and Zakah essentials.',
        lessons: [
          makeLesson(
            'qawmi-ibt-fiqh',
            1,
            'Ahkam of Taharah, Water Categories & Tayammum',
            'Purification Fiqh',
            30,
            'Determine valid water sources, Masah on Khuffayn, and causes requiring Tayammum.',
            'Befaq Diniyat & Fiqh'
          ),
          makeLesson(
            'qawmi-ibt-fiqh',
            2,
            'Shurut, Faraid, Wajibat & Sajdah Sahw in Salah',
            'Salah Rulings',
            35,
            'Understand when Sajdah Sahw is mandatory and how missed Raka’at are completed.',
            'Case Questions'
          ),
          makeLesson(
            'qawmi-ibt-fiqh',
            3,
            'Sawm (Fasting), Eid Prayers & Janazah Basics',
            'Ibadah Essentials',
            30,
            'Review fast invalidators, Fidyah/Kaffarah distinctions, and Janazah Takbirs.',
            'Board Short Questions'
          ),
        ],
      },
      ...focusExtras,
      {
        id: 'qawmi-ibt-seerah',
        code: 'IB-204',
        name: 'Qasasun Nabiyyin & General Studies (Math/Bangla)',
        kitabTag: 'Tarbiyah & General',
        category: 'Tarbiyah & Adab',
        description:
          'Qasasun Nabiyyin Part 1–2 Arabic prose alongside Ibtidaiyyah Bangla composition, Urdu primer, and Arithmetic.',
        lessons: [
          makeLesson(
            'qawmi-ibt-seerah',
            1,
            'Qasasun Nabiyyin: Story of Prophet Ibrahim (AS)',
            'Arabic Prose',
            30,
            'Read unvowelized lines with Ustad guidance and extract useful Arabic verb forms.',
            'Oral Reading & Meaning'
          ),
          makeLesson(
            'qawmi-ibt-seerah',
            2,
            'Bangla Essay & Arithmetic Unitary Problems',
            'General Studies',
            30,
            'Strengthen core calculation speed and clean Bangla essay structure for Befaq.',
            'Ibtidaiyyah General Paper'
          ),
        ],
      },
    ];
  }

  if (marhala === 'Mutawassitah (Middle Marhala)') {
    return [
      {
        id: 'qawmi-mut-nahw',
        code: 'MT-301',
        name: 'Hidayatun Nahw & Sharah Mi’at Amil',
        kitabTag: 'Befaq Mutawassitah',
        category: 'Core Kitab',
        description:
          'Comprehensive study of Arabic grammatical governors (Awamil), Marfu’at, Mansubat, Majrurat, and Tarkeeb mastery.',
        lessons: [
          makeLesson(
            'qawmi-mut-nahw',
            1,
            'Marfu’at: Fa’il, Na’ib Fa’il, Mubtada & Inna Khabar',
            'Hidayatun Nahw',
            40,
            'Diagram nominal and verbal sentences with complete Tarkeeb parsing of every word.',
            'Befaq Nahw & Tarkeeb'
          ),
          makeLesson(
            'qawmi-mut-nahw',
            2,
            'Mansubat: Five Maf’uls, Hal, Tamyiz & Istithna',
            'Case Assignment',
            40,
            'Distinguish Maf’ul Bihi, Mutlaq, Lahu, Fihi, and Ma’ahu inside classical Arabic examples.',
            'Syntax Analysis'
          ),
          makeLesson(
            'qawmi-mut-nahw',
            3,
            'Tawabi’ (Na’t, Atf, Tawkeed, Badal) & Ghayr Munsarif',
            'Advanced Syntax',
            35,
            'Identify the 9 causes preventing full declension (Asbab Man’ as-Sarf).',
            'Befaq Mutawassitah Exam'
          ),
        ],
      },
      {
        id: 'qawmi-mut-sarf',
        code: 'MT-302',
        name: 'Ilmus Sighah & Talilat (Advanced Sarf)',
        kitabTag: 'Befaq Mutawassitah',
        category: 'Core Kitab',
        description:
          'Phonological transformation rules (Talilat) for Ajwaf, Naqis, Lafif, and Mahmuz verbs in Arabic.',
        lessons: [
          makeLesson(
            'qawmi-mut-sarf',
            1,
            'Qawanin-e-Talil: Ajwaf & Naqis Vowel Shifts',
            'Ilmus Sighah',
            40,
            'Explain why قَوَلَ becomes قَالَ and يَقْوُلُ becomes يَقُولُ using step-by-step Sarf rules.',
            'Talil Derivation Paper'
          ),
          makeLesson(
            'qawmi-mut-sarf',
            2,
            'Mahmuz, Mudha’af & Idgham Conditions',
            'Morphophonology',
            35,
            'Apply Hamza assimilation and doubled-consonant rules across active and jussive forms.',
            'Sighah Parsing'
          ),
          makeLesson(
            'qawmi-mut-sarf',
            3,
            'Ism Ala, Tafdil, Zarf & Mubahagha Derivatives',
            'Nominal Patterns',
            30,
            'Derive nouns of instrument, superiority, and place from any triliteral root.',
            'Morphology Drill'
          ),
        ],
      },
      {
        id: 'qawmi-mut-fiqh',
        code: 'MT-303',
        name: 'Mukhtasar al-Quduri & Zadut Talibin',
        kitabTag: 'Befaq Mutawassitah',
        category: 'Core Kitab',
        description:
          'Foundational Hanafi Fiqh text (Al-Quduri) paired with Hadith memorization and translation in Zadut Talibin.',
        lessons: [
          makeLesson(
            'qawmi-mut-fiqh',
            1,
            'Al-Quduri: Kitab al-Taharah & Kitab as-Salah',
            'Hanafi Fiqh Text',
            40,
            'Translate concise classical Arabic Fiqh clauses and justify rulings from Imam Abu Hanifa’s school.',
            'Befaq Quduri Paper'
          ),
          makeLesson(
            'qawmi-mut-fiqh',
            2,
            'Al-Quduri: Kitab az-Zakah, as-Sawm & al-Hajj',
            'Ibadah Jurisprudence',
            40,
            'Understand Nisab exemptions, Dam vs Sadaqah in Hajj, and I’tikaf conditions.',
            'Written & Sharah'
          ),
          makeLesson(
            'qawmi-mut-fiqh',
            3,
            'Zadut Talibin: Selected Prophetic Traditions & Adab',
            'Introductory Hadith',
            35,
            'Translate short eloquent Hadiths accurately while highlighting Nahw connections.',
            'Translation & Meaning'
          ),
        ],
      },
      ...focusExtras,
      {
        id: 'qawmi-mut-adab',
        code: 'MT-304',
        name: 'Nafhatul Arab, Al-Qiraat ar-Rashidah & Tarbiyah',
        kitabTag: 'Adab & Tarbiyah',
        category: 'Tarbiyah & Adab',
        description:
          'Classical Arabic prose reading, moral character cultivation, Seerah of Khulafa, and Farsi/Urdu literary basics.',
        lessons: [
          makeLesson(
            'qawmi-mut-adab',
            1,
            'Nafhatul Arab: Historical Anecdotes & Moral Wisdom',
            'Arabic Literature',
            35,
            'Read unvowelized Arabic stories fluently and construct concise Arabic summaries.',
            'Oral Reading & Insha'
          ),
          makeLesson(
            'qawmi-mut-adab',
            2,
            'Talimul Muta’allim: Etiquette of Seeking Sacred Knowledge',
            'Tarbiyah',
            30,
            'Apply Imam Zarnuji’s advice on intention, respect for Ustads, and consistent Takrar.',
            'Character & Adab'
          ),
        ],
      },
    ];
  }

  if (marhala === 'Sanawiyyah Ulya (Higher Secondary Marhala)') {
    return [
      {
        id: 'qawmi-san-nahw',
        code: 'SN-401',
        name: 'Kafiyah ibn Hajib & Sharah Jami Selections',
        kitabTag: 'Befaq Sanawiyyah Ulya',
        category: 'Core Kitab',
        description:
          'Deep theoretical Arabic syntax examining grammatical causes (Ilal Nahwiyyah) and nuanced I’rab debates.',
        lessons: [
          makeLesson(
            'qawmi-san-nahw',
            1,
            'Mu’rab & Mabni Classification in Kafiyah',
            'Kafiyah Syntax',
            45,
            'Explain why nouns and mudari verbs accept I’rab while particles and past verbs remain fixed.',
            'Befaq Kafiyah Paper'
          ),
          makeLesson(
            'qawmi-san-nahw',
            2,
            'Amal of Verbs, Masadir & Asma al-Af’al',
            'Syntactic Governors',
            40,
            'Compare Basran and Kufan grammatical positions on Tanazu’ and Ishtighal.',
            'Sharah Debate Questions'
          ),
          makeLesson(
            'qawmi-san-nahw',
            3,
            'Al-Asma al-Mabniyyah: Pronouns, Relative & Conditional Nouns',
            'Clause Linking',
            40,
            'Parse complex relative clauses (Silah al-Mawsul) and conditional answers (Jawab al-Shart).',
            'Ibarah Reading & Tarkeeb'
          ),
        ],
      },
      {
        id: 'qawmi-san-fiqh',
        code: 'SN-402',
        name: 'Kanzud Daqaiq & Usulush Shashi',
        kitabTag: 'Befaq Sanawiyyah Ulya',
        category: 'Core Kitab',
        description:
          'Concise Hanafi manual Kanzud Daqaiq on contracts and family law alongside foundational Usul al-Fiqh.',
        lessons: [
          makeLesson(
            'qawmi-san-fiqh',
            1,
            'Kanzud Daqaiq: Kitab an-Nikah & Kitab at-Talaq',
            'Family Jurisprudence',
            45,
            'Decode Kanzud Daqaiq’s dense legal phrasing and differentiate Mahr, Khul’, and Iddah rulings.',
            'Befaq Kanz Paper'
          ),
          makeLesson(
            'qawmi-san-fiqh',
            2,
            'Kanzud Daqaiq: Kitab al-Buyu’ & Riba Prohibitions',
            'Commercial Fiqh',
            45,
            'Identify conditions of valid sale, Khiyar al-Shart, and Bay’ Fasid vs Batil.',
            'Analytical Jurisprudence'
          ),
          makeLesson(
            'qawmi-san-fiqh',
            3,
            'Usulush Shashi: Khass, Amm, Mushtarak & Mu’awwal',
            'Usul al-Fiqh',
            40,
            'Contrast absolute vs qualified expressions (Mutlaq & Muqayyad) in legal derivation.',
            'Usul Written Exam'
          ),
        ],
      },
      {
        id: 'qawmi-san-tafsir',
        code: 'SN-403',
        name: 'Tafsir Tarjama-e-Quran & Durus al-Balaghat',
        kitabTag: 'Befaq Sanawiyyah Ulya',
        category: 'Core Kitab',
        description:
          'Complete Quran translation commentary alongside Arabic rhetoric (Ma’ani, Bayan, Badi’) and Mantiq (Mirqat/Sharah Tahdhib).',
        lessons: [
          makeLesson(
            'qawmi-san-tafsir',
            1,
            'Word-by-Word Quran Translation & Coherence (Rabt al-Ayat)',
            'Quranic Exegesis',
            40,
            'Translate prescribed Juz fluently while connecting each ayah’s theme to the preceding passage.',
            'Befaq Quran Tarjama'
          ),
          makeLesson(
            'qawmi-san-tafsir',
            2,
            'Durus al-Balaghat: Qasr, Fasl, Wasl & Majaz Mursal',
            'Ilm al-Balaghat',
            40,
            'Spot rhetorical devices inside Quranic verses and classical Arabic odes.',
            'Balaghat Written'
          ),
        ],
      },
      ...focusExtras,
      {
        id: 'qawmi-san-mantiq',
        code: 'SN-404',
        name: 'Mantiq (Sharah Tahdhib) & Al-Maqamat Literary Prep',
        kitabTag: 'Logic & Adab',
        category: 'Tarbiyah & Adab',
        description:
          'Classical deductive logic (Tasawwur, Tasdiq, Qiyas) preparing students for Hidayah and Jalalayn.',
        lessons: [
          makeLesson(
            'qawmi-san-mantiq',
            1,
            'Kulliyat Khams, Hadd Tam & Rasm Naqis',
            'Concept Definition',
            35,
            'Evaluate real vs nominal definitions using genus (Jins) and differentia (Fasl).',
            'Mantiq Exam'
          ),
          makeLesson(
            'qawmi-san-mantiq',
            2,
            'Ashkal Arba’ah (Four Syllogistic Figures) & Validity Tests',
            'Deductive Logic',
            35,
            'Construct valid categorical syllogisms and convert propositions (Aks Mustawi).',
            'Logic Problem Set'
          ),
        ],
      },
    ];
  }

  if (marhala === 'Fazilat (Degree Marhala)') {
    return [
      {
        id: 'qawmi-faz-tafsir',
        code: 'FZ-501',
        name: 'Tafsir al-Jalalayn & Al-Fawz al-Kabir',
        kitabTag: 'Befaq Fazilat',
        category: 'Core Kitab',
        description:
          'Line-by-line mastery of Tafsir al-Jalalayn paired with Shah Waliullah’s five Quranic sciences in Al-Fawz al-Kabir.',
        lessons: [
          makeLesson(
            'qawmi-faz-tafsir',
            1,
            'Tafsir al-Jalalayn: Surah Al-Baqarah to An-Nisa',
            'Classical Tafsir',
            45,
            'Unpack Jalalayn’s ultra-concise I’rab pointers, Qira’at notes, and legal allusions.',
            'Befaq Jalalayn Paper'
          ),
          makeLesson(
            'qawmi-faz-tafsir',
            2,
            'Al-Fawz al-Kabir: Five Essential Sciences of the Quran',
            'Usul al-Tafsir',
            45,
            'Analyze Ahkam, Jadal, Ala’ullah, Ayyamullah, and Dhikr bil-Mawt themes.',
            'Structured Tafsir Essay'
          ),
          makeLesson(
            'qawmi-faz-tafsir',
            3,
            'Resolution of Apparent Naskh & Gharib al-Quran',
            'Quranic Hermeneutics',
            40,
            'Follow Shah Waliullah’s method harmonizing abrogated and continuing verses.',
            'Fazilat Written Exam'
          ),
        ],
      },
      {
        id: 'qawmi-faz-hadith',
        code: 'FZ-502',
        name: 'Mishkat al-Masabih & Nukhbatul Fikar',
        kitabTag: 'Befaq Fazilat',
        category: 'Core Kitab',
        description:
          'Gateway Hadith anthology Mishkat al-Masabih alongside Ibn Hajar’s authoritative Mustalah primer Nukhbatul Fikar.',
        lessons: [
          makeLesson(
            'qawmi-faz-hadith',
            1,
            'Mishkat: Kitab al-Iman, Ilm & Taharah (Three Tabaqat)',
            'Hadith Anthology',
            45,
            'Contrast Muttafaqun Alayh traditions with Sunan narrations across each chapter.',
            'Befaq Mishkat Paper 1 & 2'
          ),
          makeLesson(
            'qawmi-faz-hadith',
            2,
            'Nukhbatul Fikar: Khabar Ahad, Gharib, Aziz & Mashhur',
            'Usul al-Hadith',
            40,
            'Map narrator hierarchies and classify causes of rejection (Ta’n fir-Rawi).',
            'Hadith Terminology Test'
          ),
          makeLesson(
            'qawmi-faz-hadith',
            3,
            'Juridical Synthesis Across Madhhabs in Mishkat Chapters',
            'Fiqh al-Hadith',
            45,
            'Connect Hadith evidences to Hanafi principles in Salah, Zakah, and Buyu’.',
            'Oral & Written Exam'
          ),
        ],
      },
      {
        id: 'qawmi-faz-fiqh',
        code: 'FZ-503',
        name: 'Al-Hidayah (Volumes 1–4) & Nur al-Anwar',
        kitabTag: 'Befaq Fazilat',
        category: 'Core Kitab',
        description:
          'Comparative Hanafi legal reasoning in Al-Hidayah paired with Nur al-Anwar commentary on Al-Manar.',
        lessons: [
          makeLesson(
            'qawmi-faz-fiqh',
            1,
            'Al-Hidayah: Analytical Proofs (Dalil & Ilal) in Transactions',
            'Comparative Fiqh',
            45,
            'Trace Imam Marghinani’s arguments addressing Zufar, Shafi’i, and Sahibayn differences.',
            'Befaq Hidayah Paper'
          ),
          makeLesson(
            'qawmi-faz-fiqh',
            2,
            'Nur al-Anwar: Kitab, Sunnah, Ijma & Qiyas Conditions',
            'Legal Theory',
            45,
            'Evaluate Khabar al-Wahid criteria, continuity of Sunnah, and types of Ijma.',
            'Usul Written Exam'
          ),
          makeLesson(
            'qawmi-faz-fiqh',
            3,
            'Al-Aqidah al-Tahawiyyah: Mainstream Sunni Creed',
            'Aqidah & Kalam',
            35,
            'Study Imam al-Tahawi’s 105 statements with clarity on Tafwid and Tanzih.',
            'Aqidah Paper'
          ),
        ],
      },
      ...focusExtras,
    ];
  }

  // Takmil (Masters / Dawra-e-Hadith Marhala) — Al-Haiatul Ulya / Befaq Takmil
  return [
    {
      id: 'qawmi-tak-bukhari',
      code: 'TK-601',
      name: 'Sahih al-Bukhari & Tarajim al-Abwab',
      kitabTag: 'Dawra-e-Hadith (Takmil)',
      category: 'Core Kitab',
      description:
        'Full Dars-e-Nizami reading of Sahih al-Bukhari, exploring Imam Bukhari’s juristic chapter headings (Tarajim) and Mu’allaqat.',
      lessons: [
        makeLesson(
          'qawmi-tak-bukhari',
          1,
          'Kitab Bad’ al-Wahy & Kitab al-Iman (Tarajim Jurisprudence)',
          'Fiqh al-Bukhari',
          50,
          'Decipher the subtle connection between Imam Bukhari’s chapter titles, Quranic citations, and cited Hadiths.',
          'Haiatul Ulya Bukhari Paper 1'
        ),
        makeLesson(
          'qawmi-tak-bukhari',
          2,
          'Kitab as-Salah & Kitab al-Buyu’: Hanafi Reconciliation',
          'Comparative Hadith',
          50,
          'Reconcile Raf’ul Yadayn, Amin, and commercial chapters using Fath al-Bari and Fayd al-Bari.',
          'Haiatul Ulya Bukhari Paper 2'
        ),
        makeLesson(
          'qawmi-tak-bukhari',
          3,
          'Thulathiyyat al-Bukhari & Analysis of Mu’allaq Chains',
          'Sanad Research',
          40,
          'Trace all 22 three-link chains and distinguish Jazm vs Tamridh Mu’allaqat.',
          'Takmil Oral Viva'
        ),
      ],
    },
    {
      id: 'qawmi-tak-muslim',
      code: 'TK-602',
      name: 'Sahih Muslim & Jami’ al-Tirmidhi',
      kitabTag: 'Dawra-e-Hadith (Takmil)',
      category: 'Core Kitab',
      description:
        'Imam Muslim’s systematic chain arrangement (Muqaddimah) alongside Imam Tirmidhi’s comparative juristic notes.',
      lessons: [
        makeLesson(
          'qawmi-tak-muslim',
          1,
          'Muqaddimah Sahih Muslim: Three Tabaqat & Isnad Integrity',
          'Muslim Methodology',
          45,
          'Study Imam Muslim’s critique of Ma’an’an vs Mu’asharah and narrator reliability grading.',
          'Takmil Muslim Paper'
        ),
        makeLesson(
          'qawmi-tak-muslim',
          2,
          'Jami’ al-Tirmidhi: Hasan Sahih, Gharib & Fuqaha Opinions',
          'Comparative Sunan',
          45,
          'Interpret Imam Tirmidhi’s unique compound grading terms and Ma’amal-bi-hi rulings.',
          'Takmil Tirmidhi Paper'
        ),
        makeLesson(
          'qawmi-tak-muslim',
          3,
          'Shama’il al-Tirmidhi: Prophetic Character & Devotion',
          'Seerah & Shama’il',
          35,
          'Reflect on the noble manners, worship, and daily Sunnah of the Messenger of Allah (PBUH).',
          'Takmil Seminar'
        ),
      ],
    },
    {
      id: 'qawmi-tak-sunan',
      code: 'TK-603',
      name: 'Sunan Abi Dawud, An-Nasa’i, Ibn Majah & Tahawi',
      kitabTag: 'Dawra-e-Hadith (Takmil)',
      category: 'Core Kitab',
      description:
        'Ahkam Hadith collections (Abu Dawud, Nasa’i, Ibn Majah) and Imam Tahawi’s Sharah Ma’ani al-Athar.',
      lessons: [
        makeLesson(
          'qawmi-tak-sunan',
          1,
          'Sunan Abi Dawud: Risalah ila Ahl Makkah & Ahkam Chapters',
          'Legal Hadith',
          45,
          'Apply Abu Dawud’s silence rules (Ma Sakatu Anhu Fahuwa Salih) in Ahkam deductions.',
          'Haiatul Ulya Abu Dawud'
        ),
        makeLesson(
          'qawmi-tak-sunan',
          2,
          'Sharah Ma’ani al-Athar (Tahawi): Naskh & Tarjih Method',
          'Hanafi Evidences',
          50,
          'Trace Imam Tahawi’s four-tier analytical reconciliation: Naskh, Jam’, Tarjih, and Tasaqut.',
          'Takmil Tahawi Paper'
        ),
        makeLesson(
          'qawmi-tak-sunan',
          3,
          'Muwatta Imam Malik & Muwatta Imam Muhammad',
          'Early Hadith & Athar',
          40,
          'Compare Madani Amal traditions with Kufan Athar transmissions.',
          'Takmil Muwatta Exam'
        ),
      ],
    },
    ...focusExtras,
  ];
}

export const qawmiStudentService = {
  validateQawmiStudentCoupon(
    rawCode: string,
    now = Date.now()
  ): QawmiStudentCouponValidationResult {
    const code = rawCode.trim().toUpperCase();
    if (!code) {
      return {
        ok: false,
        message: 'Please enter your Qawmi Madrasa student coupon code (e.g., S-85101).',
      };
    }

    if (/^T-\d{5}$/.test(code)) {
      return {
        ok: false,
        message:
          'This code is a Teacher/Ustad coupon (T-XXXXX). Please enter a Student coupon starting with S- (e.g., S-85101).',
      };
    }

    if (!/^S-\d{5}$/.test(code)) {
      return {
        ok: false,
        message:
          'Invalid coupon format. Student coupons must follow the S-XXXXX format (e.g., S-85101).',
      };
    }

    const store = readQawmiStore(now);
    const match = store.coupons.find(
      (c) => c.pathway === 'qawmi' && c.code.toUpperCase() === code
    );

    if (!match) {
      return {
        ok: false,
        message:
          'Coupon not found in the Qawmi Madrasa portal. Verify the code with your Madrasa Nazim/Administrator.',
      };
    }

    if (match.role !== 'student') {
      return {
        ok: false,
        message: 'This coupon is not assigned for Qawmi Student enrollment.',
      };
    }

    if (match.status === 'used') {
      return {
        ok: false,
        message:
          'This student coupon has already been redeemed. Request a new S-XXXXX code from your Qawmi Madrasa Admin.',
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
      message: 'Valid Qawmi Madrasa student coupon verified.',
    };
  },

  submitQawmiStudentCouponRegistration(
    input: QawmiStudentRegistrationInput,
    now = Date.now()
  ): { ok: true; registration: QawmiPendingRegistration } | { ok: false; error: string } {
    const couponCheck = this.validateQawmiStudentCoupon(input.couponCode, now);
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

    if (!isValidQawmiMarhala(input.marhala)) {
      return { ok: false, error: 'Please select a valid Qawmi Madrasa Marhala / Stage.' };
    }

    const resolvedFocusBranch: QawmiFocusBranch =
      input.focusBranch && isValidQawmiFocusBranch(input.focusBranch)
        ? input.focusBranch
        : 'General / Kitab';

    const normalizedEmail = input.email.trim().toLowerCase();
    const store = readQawmiStore(now);

    const existsInPending = store.pending.some(
      (p) => p.pathway === 'qawmi' && p.email.toLowerCase() === normalizedEmail
    );
    if (existsInPending) {
      return {
        ok: false,
        error: `An application for ${normalizedEmail} is already awaiting approval in the Qawmi Madrasa queue.`,
      };
    }

    const existsInDirectory = store.profiles.some(
      (p) => p.pathway === 'qawmi' && p.email.toLowerCase() === normalizedEmail
    );
    if (existsInDirectory) {
      return {
        ok: false,
        error: `An account with ${normalizedEmail} already exists in Qawmi Madrasa. Try signing in instead.`,
      };
    }

    const registration: QawmiPendingRegistration = {
      id: `QAWMI-PND-S${now % 100000}`,
      role: 'student',
      pathway: 'qawmi',
      fullName: input.fullName.trim(),
      email: normalizedEmail,
      marhala: input.marhala,
      focusBranch: resolvedFocusBranch,
      couponCode: couponCheck.coupon.code,
      submittedAt: now,
      expiresAt: now + FORTY_EIGHT_HOURS_MS,
    };

    store.pending.unshift(registration);
    store.coupons = store.coupons.map((c) =>
      c.pathway === 'qawmi' && c.code.toUpperCase() === couponCheck.coupon!.code.toUpperCase()
        ? { ...c, status: 'used', usedAt: now }
        : c
    );
    store.activities.unshift({
      id: `QAWMI-ACT-${now}-${Math.floor(Math.random() * 1000)}`,
      pathway: 'qawmi',
      category: 'approval',
      summary: `New ${getShortQawmiMarhalaLabel(registration.marhala)} (${registration.focusBranch}) student registration submitted by ${registration.fullName} (${registration.couponCode}).`,
      actorEmail: normalizedEmail,
      createdAt: now,
    });
    if (store.activities.length > 80) {
      store.activities = store.activities.slice(0, 80);
    }

    writeQawmiStore(store);
    return { ok: true, registration };
  },

  /**
   * Synchronizes an active Qawmi Madrasa student account into edura_multi_db_v1
   * so AuthContext.login() works cleanly without touching authService.ts or any other pathways.
   */
  prepareQawmiStudentAccountForLogin(
    rawEmail: string,
    rawPassword: string,
    now = Date.now()
  ): void {
    const email = rawEmail.trim().toLowerCase();
    if (!email) return;

    const store = readQawmiStore(now);
    const preset = getDemoQawmiStudentPreset();

    const directoryMatch = store.profiles.find(
      (p) => p.pathway === 'qawmi' && p.role === 'student' && p.email.toLowerCase() === email
    );

    if (directoryMatch && directoryMatch.status === 'suspended') {
      return;
    }

    const isPresetLogin = email === preset.email.toLowerCase();
    if (!directoryMatch && !isPresetLogin) {
      return;
    }

    const fullName = directoryMatch?.fullName ?? preset.fullName;
    const userId = directoryMatch?.id ?? 'qawmi-student-demo-01';

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
        createdAt: directoryMatch?.joinedAt ?? now - 19 * 24 * 60 * 60 * 1000,
        educationStream: 'Bangladesh Madrasa Education',
        pathway: 'Qawmi',
      };
      db.users.push(account);
      saveDatabase(db);
    }
  },

  resolveQawmiStudentContext(
    session: AuthSession,
    profile?: Omit<UserAccount, 'passwordHash'> | null,
    now = Date.now()
  ): QawmiStudentContext | null {
    if (session.role !== 'student') return null;

    const pathway =
      resolveQawmiPathway(session.selectedPathway) ?? resolveQawmiPathway(profile?.pathway);
    if (!pathway) return null;

    const store = readQawmiStore(now);
    const email = session.email.trim().toLowerCase();
    const match = store.profiles.find(
      (p) => p.pathway === 'qawmi' && p.role === 'student' && p.email.toLowerCase() === email
    );

    if (match) {
      return {
        userId: match.id,
        fullName: match.fullName,
        email: match.email,
        pathway: 'qawmi',
        marhala: match.marhala,
        focusBranch: match.focusBranch,
        registrationType: match.registrationType,
        couponCode: match.couponCode,
        joinedAt: match.joinedAt,
      };
    }

    const preset = getDemoQawmiStudentPreset();
    return {
      userId: session.userId,
      fullName: session.fullName || preset.fullName,
      email: session.email || preset.email,
      pathway: 'qawmi',
      marhala: preset.marhala,
      focusBranch: preset.focusBranch,
      registrationType: 'coupon_auto',
      joinedAt: profile?.createdAt ?? session.loggedInAt,
    };
  },

  getCompletedLessonIds(userId: string): string[] {
    const map = loadQawmiProgressMap();
    return map[`qawmi:${userId}`] ?? [];
  },

  toggleLessonCompleted(userId: string, lessonId: string): string[] {
    const map = loadQawmiProgressMap();
    const key = `qawmi:${userId}`;
    const current = new Set(map[key] ?? []);
    if (current.has(lessonId)) {
      current.delete(lessonId);
    } else {
      current.add(lessonId);
    }
    const next = Array.from(current);
    map[key] = next;
    saveQawmiProgressMap(map);
    return next;
  },

  listRelevantNotices(
    student: QawmiStudentContext,
    filters: {
      query?: string;
      audience?: 'all' | 'student' | 'both';
      tag?: 'all' | QawmiNoticeTag;
    } = {},
    now = Date.now()
  ): QawmiNotice[] {
    const store = readQawmiStore(now);
    const q = (filters.query ?? '').trim().toLowerCase();

    return store.notices
      .filter((n) => n.pathway === 'qawmi')
      .filter((n) => n.audience === 'student' || n.audience === 'both')
      .filter((n) => n.marhala === 'all' || n.marhala === student.marhala)
      .filter((n) => n.focusBranch === 'all' || n.focusBranch === student.focusBranch)
      .filter((n) => {
        if (filters.audience && filters.audience !== 'all' && n.audience !== filters.audience) {
          return false;
        }
        if (filters.tag && filters.tag !== 'all' && n.tag !== filters.tag) {
          return false;
        }
        if (q) {
          const hay =
            `${n.title} ${n.description} ${n.tag} ${n.marhala} ${n.focusBranch}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => b.createdAt - a.createdAt);
  },

  listPendingRegistrations(now = Date.now()): QawmiPendingRegistration[] {
    const store = readQawmiStore(now);
    return store.pending.filter((p) => p.pathway === 'qawmi');
  },

  updateQawmiStudentPassword(
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
      return { ok: false, error: 'Qawmi student account record could not be located.' };
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

    const store = readQawmiStore(now);
    let updatedProfile = false;
    store.profiles = store.profiles.map((p) => {
      if (p.pathway === 'qawmi' && p.role === 'student' && p.email.toLowerCase() === normalizedEmail) {
        updatedProfile = true;
        return { ...p, passwordHash: nextHash, updatedAt: now };
      }
      return p;
    });
    if (updatedProfile) {
      writeQawmiStore(store);
    }

    return { ok: true };
  },

  resetInMemoryStateForTests(): void {
    memoryQawmiStore = null;
    memoryQawmiProgressStore = {};
  },
};
