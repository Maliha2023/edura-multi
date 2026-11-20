import type { AuthSession, CurriculumSubTrack, StudentClass, UserAccount } from '../types/domain';
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

export type StudentPathway = AdminUserPathway; // 'bangla_version' | 'english_version'
export type StudentClassLevel = AcademicClassLevel; // 1..12
export type StudentGroup = AcademicGroup; // 'Science' | 'Arts' | 'Commerce'

export const STUDENT_CLASS_LEVELS: StudentClassLevel[] = [
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12,
];
export const STUDENT_GROUPS: StudentGroup[] = ['Science', 'Arts', 'Commerce'];

export interface StudentCouponRecord {
  code: string;
  pathway: StudentPathway;
  status: 'active' | 'used' | 'expired';
  createdAt: number;
  expiresAt: number;
  usedByEmail?: string;
}

export type StudentCouponCheckResult =
  | { ok: true; coupon: StudentCouponRecord }
  | {
      ok: false;
      reason:
        | 'invalid_format'
        | 'teacher_coupon'
        | 'not_found'
        | 'already_used'
        | 'expired'
        | 'pathway_mismatch';
      message: string;
    };

export interface StudentRegistrationInput {
  pathway: StudentPathway;
  couponCode: string;
  fullName: string;
  email: string;
  password: string;
  academicClass: StudentClassLevel;
  academicGroup: StudentGroup | null;
}

export interface StudentProfileContext {
  userId: string;
  fullName: string;
  email: string;
  pathway: StudentPathway;
  academicClass: StudentClassLevel;
  academicGroup: StudentGroup | null;
  registrationType: 'coupon_auto' | 'admin_manual';
  joinedAt: number;
}

export interface StudentLesson {
  id: string;
  title: string;
  durationMinutes: number;
  summary: string;
  keyTopic: string;
}

export interface StudentSubject {
  id: string;
  code: string;
  name: string;
  localTitle?: string;
  category: 'Core' | 'Group Major' | 'Elective';
  description: string;
  lessons: StudentLesson[];
}

export interface DemoStudentPreset {
  pathway: StudentPathway;
  pathwayLabel: CurriculumSubTrack;
  fullName: string;
  email: string;
  password: string;
  academicClass: StudentClassLevel;
  academicGroup: StudentGroup | null;
}

const ADMIN_USERS_STORAGE_KEY = 'edura_admin_users_workspace_v1';
const STUDENT_COUPONS_META_KEY = 'edura_student_coupons_meta_v1';
const STUDENT_CONTEXT_STORAGE_KEY = 'edura_student_context_v1';
const STUDENT_PROGRESS_STORAGE_KEY = 'edura_student_lesson_progress_v1';

let memoryStudentCoupons: string | null = null;
let memoryStudentContexts: string | null = null;
let memoryStudentProgress: string | null = null;

function canUseLocalStorage(): boolean {
  try {
    return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
  } catch {
    return false;
  }
}

export function resolveStudentPathway(
  raw?: string | null
): StudentPathway | null {
  if (!raw) return null;
  if (raw === 'bangla_version' || raw === 'Bangla Version') return 'bangla_version';
  if (raw === 'english_version' || raw === 'English Version') return 'english_version';
  return null;
}

export function getStudentPathwayLabel(pathway: StudentPathway): CurriculumSubTrack {
  return pathway === 'bangla_version' ? 'Bangla Version' : 'English Version';
}

export function isStudentGroupApplicable(academicClass: StudentClassLevel): boolean {
  return academicClass >= 9 && academicClass <= 12;
}

export function normalizeStudentGroup(
  academicClass: StudentClassLevel,
  group: StudentGroup | null | undefined
): StudentGroup | null {
  if (!isStudentGroupApplicable(academicClass)) return null;
  if (group === 'Science' || group === 'Arts' || group === 'Commerce') return group;
  return 'Science';
}

export function formatStudentContextBadge(
  pathway: StudentPathway,
  academicClass: StudentClassLevel,
  academicGroup: StudentGroup | null
): string {
  const pathwayName = getStudentPathwayLabel(pathway);
  if (isStudentGroupApplicable(academicClass) && academicGroup) {
    return `${pathwayName} • Class ${academicClass} • ${academicGroup}`;
  }
  return `${pathwayName} • Class ${academicClass}`;
}

export function getDemoStudentPreset(pathway: StudentPathway): DemoStudentPreset {
  if (pathway === 'english_version') {
    return {
      pathway: 'english_version',
      pathwayLabel: 'English Version',
      fullName: 'Ishan Rahman',
      email: 'ishan.ev@student.edu.bd',
      password: 'Student@1234',
      academicClass: 10,
      academicGroup: 'Science',
    };
  }
  return {
    pathway: 'bangla_version',
    pathwayLabel: 'Bangla Version',
    fullName: 'Nafisa Tasnim',
    email: 'nafisa.bv@student.edu.bd',
    password: 'Student@1234',
    academicClass: 9,
    academicGroup: 'Science',
  };
}

export function getDemoStudentCouponHint(pathway: StudentPathway): string {
  return pathway === 'english_version' ? 'S-66420' : 'S-55821';
}

function createSeedStudentCoupons(now = Date.now()): StudentCouponRecord[] {
  const hour = 60 * 60 * 1000;
  return [
    {
      code: 'S-55821',
      pathway: 'bangla_version',
      status: 'active',
      createdAt: now - 4 * hour,
      expiresAt: now + 44 * hour,
    },
    {
      code: 'S-55902',
      pathway: 'bangla_version',
      status: 'active',
      createdAt: now - 1 * hour,
      expiresAt: now + 47 * hour,
    },
    {
      code: 'S-66420',
      pathway: 'english_version',
      status: 'active',
      createdAt: now - 3 * hour,
      expiresAt: now + 45 * hour,
    },
    {
      code: 'S-66815',
      pathway: 'english_version',
      status: 'active',
      createdAt: now - 2 * hour,
      expiresAt: now + 46 * hour,
    },
    {
      code: 'S-30119',
      pathway: 'bangla_version',
      status: 'expired',
      createdAt: now - 52 * hour,
      expiresAt: now - 4 * hour,
    },
    {
      code: 'S-20815',
      pathway: 'bangla_version',
      status: 'used',
      createdAt: now - 8 * hour,
      expiresAt: now + 40 * hour,
    },
  ];
}

function loadStudentCouponsMeta(now = Date.now()): StudentCouponRecord[] {
  const raw = canUseLocalStorage()
    ? window.localStorage.getItem(STUDENT_COUPONS_META_KEY)
    : memoryStudentCoupons;

  if (!raw) {
    const seeded = createSeedStudentCoupons(now);
    saveStudentCouponsMeta(seeded);
    return seeded;
  }

  try {
    const parsed = JSON.parse(raw) as StudentCouponRecord[];
    if (!Array.isArray(parsed)) {
      const seeded = createSeedStudentCoupons(now);
      saveStudentCouponsMeta(seeded);
      return seeded;
    }
    return parsed;
  } catch {
    const seeded = createSeedStudentCoupons(now);
    saveStudentCouponsMeta(seeded);
    return seeded;
  }
}

function saveStudentCouponsMeta(records: StudentCouponRecord[]): void {
  const serialized = JSON.stringify(records);
  if (canUseLocalStorage()) {
    window.localStorage.setItem(STUDENT_COUPONS_META_KEY, serialized);
  } else {
    memoryStudentCoupons = serialized;
  }
}

function loadStudentContexts(): Record<string, StudentProfileContext> {
  const raw = canUseLocalStorage()
    ? window.localStorage.getItem(STUDENT_CONTEXT_STORAGE_KEY)
    : memoryStudentContexts;
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as Record<string, StudentProfileContext>;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function saveStudentContexts(map: Record<string, StudentProfileContext>): void {
  const serialized = JSON.stringify(map);
  if (canUseLocalStorage()) {
    window.localStorage.setItem(STUDENT_CONTEXT_STORAGE_KEY, serialized);
  } else {
    memoryStudentContexts = serialized;
  }
}

function loadLessonProgressMap(): Record<string, string[]> {
  const raw = canUseLocalStorage()
    ? window.localStorage.getItem(STUDENT_PROGRESS_STORAGE_KEY)
    : memoryStudentProgress;
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as Record<string, string[]>;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function saveLessonProgressMap(map: Record<string, string[]>): void {
  const serialized = JSON.stringify(map);
  if (canUseLocalStorage()) {
    window.localStorage.setItem(STUDENT_PROGRESS_STORAGE_KEY, serialized);
  } else {
    memoryStudentProgress = serialized;
  }
}

export function resetStudentStores(now = Date.now()): void {
  saveStudentCouponsMeta(createSeedStudentCoupons(now));
  saveStudentContexts({});
  saveLessonProgressMap({});
}

interface SharedAdminUsersStore {
  pendingRegistrations: PathwayPendingRegistration[];
  profiles: PathwayUserProfile[];
}

function readSharedAdminUsersStore(pathway: StudentPathway, now = Date.now()): SharedAdminUsersStore {
  // Ensure the shared admin users store is initialized via existing service
  adminUsersService.listProfiles(pathway, now);
  if (canUseLocalStorage()) {
    const raw = window.localStorage.getItem(ADMIN_USERS_STORAGE_KEY);
    if (raw) {
      try {
        return JSON.parse(raw) as SharedAdminUsersStore;
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

// ============================================================================
// Curriculum Subject Catalog (NCTB Bangla Version & English Version, Class 1-12)
// ============================================================================

export function getSubjectsForStudent(
  pathway: StudentPathway,
  academicClass: StudentClassLevel,
  academicGroup: StudentGroup | null
): StudentSubject[] {
  const isBV = pathway === 'bangla_version';
  const group = normalizeStudentGroup(academicClass, academicGroup);

  const makeLesson = (
    prefix: string,
    index: number,
    title: string,
    durationMinutes: number,
    summary: string,
    keyTopic: string
  ): StudentLesson => ({
    id: `${prefix}-l${index}`,
    title,
    durationMinutes,
    summary,
    keyTopic,
  });

  // Classes 1–5 (Primary NCTB)
  if (academicClass <= 5) {
    return [
      {
        id: `cls${academicClass}-bangla`,
        code: 'BAN',
        name: isBV ? 'Amar Bangla Boi (Bangla)' : 'Bangla Language',
        localTitle: isBV ? 'আমার বাংলা বই' : undefined,
        category: 'Core',
        description: `Reading comprehension, short stories, poems, and sentence formation for Class ${academicClass}.`,
        lessons: [
          makeLesson(`c${academicClass}-ban`, 1, 'Reading Stories & Main Ideas', 25, 'Understand characters, settings, and moral lessons from NCTB prose.', 'Reading Comprehension'),
          makeLesson(`c${academicClass}-ban`, 2, 'Rhymes & Vocabulary Building', 20, 'Learn new words, opposites, and rhythm from classic rhymes.', 'Vocabulary'),
          makeLesson(`c${academicClass}-ban`, 3, 'Short Paragraph Writing', 30, 'Write 5–8 clear sentences about daily life and seasons of Bangladesh.', 'Composition'),
        ],
      },
      {
        id: `cls${academicClass}-english`,
        code: 'ENG',
        name: 'English for Today',
        category: 'Core',
        description: `Everyday conversations, phonics, grammar basics, and reading practice for Class ${academicClass}.`,
        lessons: [
          makeLesson(`c${academicClass}-eng`, 1, 'Greetings & Everyday Dialogues', 20, 'Practice polite questions, introductions, and classroom phrases.', 'Spoken English'),
          makeLesson(`c${academicClass}-eng`, 2, 'Nouns, Verbs & Simple Tenses', 25, 'Identify action words and form present and past sentences.', 'Grammar Basics'),
          makeLesson(`c${academicClass}-eng`, 3, 'Picture Story Comprehension', 25, 'Answer short questions based on illustrated passages.', 'Comprehension'),
        ],
      },
      {
        id: `cls${academicClass}-math`,
        code: 'MAT',
        name: isBV ? 'Elementary Mathematics (Prathomik Gonit)' : 'Elementary Mathematics',
        localTitle: isBV ? 'প্রাথমিক গণিত' : undefined,
        category: 'Core',
        description: `Number sense, arithmetic operations, fractions, and basic geometry for Class ${academicClass}.`,
        lessons: [
          makeLesson(`c${academicClass}-mat`, 1, 'Place Value & Four Operations', 30, 'Master addition, subtraction, multiplication, and division word problems.', 'Arithmetic'),
          makeLesson(`c${academicClass}-mat`, 2, 'Fractions & Decimals', 30, 'Compare fractions and solve everyday measurement problems.', 'Fractions'),
          makeLesson(`c${academicClass}-mat`, 3, 'Shapes, Perimeter & Time', 25, 'Recognize triangles, rectangles, and calculate time intervals.', 'Geometry'),
        ],
      },
      {
        id: `cls${academicClass}-sci`,
        code: 'SCI',
        name: isBV ? 'Elementary Science (Prathomik Biggan)' : 'Elementary Science',
        localTitle: isBV ? 'প্রাথমিক বিজ্ঞান' : undefined,
        category: 'Core',
        description: `Living things, weather, water cycle, and healthy habits tailored for Class ${academicClass}.`,
        lessons: [
          makeLesson(`c${academicClass}-sci`, 1, 'Plants, Animals & Habitats', 25, 'Observe how living organisms depend on air, water, and sunlight.', 'Ecosystems'),
          makeLesson(`c${academicClass}-sci`, 2, 'Matter, Water & Weather', 25, 'Explore states of matter and seasonal rainfall in Bangladesh.', 'Natural Science'),
          makeLesson(`c${academicClass}-sci`, 3, 'Balanced Diet & Hygiene', 20, 'Identify food groups and daily habits for staying healthy.', 'Health Science'),
        ],
      },
    ];
  }

  // Classes 6–8 (Junior Secondary NCTB)
  if (academicClass <= 8) {
    return [
      {
        id: `cls${academicClass}-math`,
        code: 'MAT',
        name: isBV ? 'Mathematics (Gonit)' : 'Mathematics',
        localTitle: isBV ? 'গণিত' : undefined,
        category: 'Core',
        description: `Algebraic expressions, ratios, linear equations, and Euclidean geometry for Class ${academicClass}.`,
        lessons: [
          makeLesson(`c${academicClass}-mat`, 1, 'Algebraic Formulas & Factorization', 35, 'Apply square and cube identities to simplify expressions.', 'Algebra'),
          makeLesson(`c${academicClass}-mat`, 2, 'Linear Equations & Word Problems', 35, 'Translate real-world problems into equations and solve step by step.', 'Equations'),
          makeLesson(`c${academicClass}-mat`, 3, 'Triangles, Circles & Theorems', 40, 'Prove congruence criteria and calculate angle properties.', 'Geometry'),
          makeLesson(`c${academicClass}-mat`, 4, 'Data Handling & Mean/Median', 30, 'Interpret frequency tables and bar charts accurately.', 'Statistics'),
        ],
      },
      {
        id: `cls${academicClass}-sci`,
        code: 'SCI',
        name: isBV ? 'General Science (Biggan)' : 'General Science',
        localTitle: isBV ? 'বিজ্ঞান' : undefined,
        category: 'Core',
        description: `Cell biology, force and motion, chemical reactions, and electricity for Class ${academicClass}.`,
        lessons: [
          makeLesson(`c${academicClass}-sci`, 1, 'Cell Structure & Plant Transport', 30, 'Compare plant and animal cells and understand osmosis and diffusion.', 'Cell Biology'),
          makeLesson(`c${academicClass}-sci`, 2, 'Atoms, Elements & Compounds', 35, 'Learn symbols, valency, and how simple chemical reactions balance.', 'Chemistry Basics'),
          makeLesson(`c${academicClass}-sci`, 3, 'Force, Gravity & Simple Machines', 35, 'Calculate weight, friction, and mechanical advantage.', 'Physics Basics'),
        ],
      },
      {
        id: `cls${academicClass}-eng`,
        code: 'ENG',
        name: 'English 1st & 2nd Paper',
        category: 'Core',
        description: `Reading comprehension, voice/narration grammar, and formal composition for Class ${academicClass}.`,
        lessons: [
          makeLesson(`c${academicClass}-eng`, 1, 'Seen Passage & Inference Skills', 30, 'Extract key ideas, synonyms, and context clues from NCTB units.', 'Comprehension'),
          makeLesson(`c${academicClass}-eng`, 2, 'Tense, Voice & Narration Rules', 35, 'Transform active/passive sentences and direct/indirect speech.', 'Grammar'),
          makeLesson(`c${academicClass}-eng`, 3, 'Formal Letters & Dialogue Writing', 30, 'Structure clear applications and contextual dialogues.', 'Writing'),
        ],
      },
      {
        id: `cls${academicClass}-ban`,
        code: 'BAN',
        name: isBV ? 'Bangla 1st & 2nd Paper' : 'Bangla Literature & Grammar',
        localTitle: isBV ? 'বাংলা সাহিত্য ও ব্যাকরণ' : undefined,
        category: 'Core',
        description: `Prose, poetry analysis, and Bangla grammar (Shondhi, Shomash, Karok) for Class ${academicClass}.`,
        lessons: [
          makeLesson(`c${academicClass}-ban`, 1, 'Prose & Poetry Creative Questions', 35, 'Master Knowledge, Comprehension, Application, and Higher-Order answers.', 'Creative Q&A'),
          makeLesson(`c${academicClass}-ban`, 2, 'Shondhi, Bivokti & Sentence Structure', 30, 'Practice key Bangla 2nd Paper grammar rules with examples.', 'Bangla Grammar'),
          makeLesson(`c${academicClass}-ban`, 3, 'Summary & Essay Composition', 30, 'Write concise Bhab-Shomprosharon and structured essays.', 'Composition'),
        ],
      },
      {
        id: `cls${academicClass}-ict`,
        code: 'ICT',
        name: 'Information & Communication Technology',
        category: 'Elective',
        description: `Digital literacy, spreadsheets, computer networks, and safe internet use for Class ${academicClass}.`,
        lessons: [
          makeLesson(`c${academicClass}-ict`, 1, 'Computer Networks & Topologies', 25, 'Compare LAN, WAN, routers, and star/ring network setups.', 'Networking'),
          makeLesson(`c${academicClass}-ict`, 2, 'Spreadsheet Formulas & Charts', 30, 'Use SUM, AVERAGE, and cell references to analyze marksheets.', 'Spreadsheets'),
          makeLesson(`c${academicClass}-ict`, 3, 'Cyber Safety & Digital Ethics', 20, 'Protect passwords, spot phishing, and respect digital copyright.', 'Cyber Security'),
        ],
      },
    ];
  }

  // Classes 9–12 (SSC 9-10 / HSC 11-12) — Core + Group Major Subjects
  const levelTag = academicClass <= 10 ? 'SSC' : 'HSC';

  const coreSubjects: StudentSubject[] = [
    {
      id: `cls${academicClass}-eng`,
      code: 'ENG',
      name: `${levelTag} English 1st & 2nd Paper`,
      category: 'Core',
      description: `Board-aligned reading comprehension, modifiers, connectors, and analytical essays for Class ${academicClass}.`,
      lessons: [
        makeLesson(`c${academicClass}-eng`, 1, 'Passage Analysis & Summary Writing', 35, 'Identify central themes and write crisp 1/3-length summaries.', 'Reading'),
        makeLesson(`c${academicClass}-eng`, 2, 'Completing Sentences & Modifiers', 35, 'Master conditionals, clauses, pre-modifiers, and post-modifiers.', 'Grammar'),
        makeLesson(`c${academicClass}-eng`, 3, 'Graph/Chart Interpretation & Essays', 40, 'Analyze statistical trends and compose high-scoring board essays.', 'Academic Writing'),
      ],
    },
    {
      id: `cls${academicClass}-ban`,
      code: 'BAN',
      name: isBV ? `${levelTag} Bangla 1st & 2nd Paper` : `${levelTag} Bangla`,
      localTitle: isBV ? 'বাংলা ১ম ও ২য় পত্র' : undefined,
      category: 'Core',
      description: `Selected NCTB prose, poetry, novel/drama, and board grammar preparation for Class ${academicClass}.`,
      lessons: [
        makeLesson(`c${academicClass}-ban`, 1, 'Creative Question (CQ) Structuring', 35, 'Structure Ka, Kha, Ga, and Gha answers for maximum board marks.', 'Literature CQ'),
        makeLesson(`c${academicClass}-ban`, 2, 'Shomash, Prottoy & Vakyo Prokoron', 35, 'Identify compound words and transform sentence forms accurately.', 'Grammar'),
        makeLesson(`c${academicClass}-ban`, 3, 'Report & Formal Application Writing', 30, 'Draft newspaper reports and official applications.', 'Composition'),
      ],
    },
    {
      id: `cls${academicClass}-ict`,
      code: 'ICT',
      name: `${levelTag} ICT`,
      category: 'Core',
      description:
        academicClass >= 11
          ? 'Number systems, digital logic gates, HTML/web design, C programming, and SQL databases.'
          : 'Digital Bangladesh, multimedia graphics, troubleshooting, and database fundamentals.',
      lessons:
        academicClass >= 11
          ? [
              makeLesson(`c${academicClass}-ict`, 1, 'Binary, Octal & Hexadecimal Conversions', 40, 'Convert between number bases and perform 2s complement subtraction.', 'Number Systems'),
              makeLesson(`c${academicClass}-ict`, 2, 'Boolean Algebra & Logic Gates', 40, 'Simplify truth tables using De Morgan theorems and NAND/NOR gates.', 'Digital Logic'),
              makeLesson(`c${academicClass}-ict`, 3, 'C Programming Loops & Arrays', 45, 'Trace flowcharts and write C programs for board practicals.', 'C Programming'),
            ]
          : [
              makeLesson(`c${academicClass}-ict`, 1, 'E-Services & Digital Systems', 30, 'Explore e-learning, e-governance, and digital communication workflows.', 'Digital Systems'),
              makeLesson(`c${academicClass}-ict`, 2, 'Database Tables & Queries', 35, 'Design primary keys, fields, and filter queries.', 'Databases'),
              makeLesson(`c${academicClass}-ict`, 3, 'Multimedia & Presentation Design', 30, 'Build clear educational presentations and graphic assets.', 'Multimedia'),
            ],
    },
  ];

  if (group === 'Science') {
    return [
      {
        id: `cls${academicClass}-phy`,
        code: 'PHY',
        name: isBV ? `${levelTag} Physics (Podarthobiggan)` : `${levelTag} Physics`,
        localTitle: isBV ? 'পদার্থবিজ্ঞান' : undefined,
        category: 'Group Major',
        description: `Mechanics, thermodynamics, waves, optics, and electricity for Class ${academicClass} Science.`,
        lessons: [
          makeLesson(`c${academicClass}-phy`, 1, 'Kinematics, Vectors & Laws of Motion', 45, 'Solve projectile motion, force equilibrium, and momentum problems.', 'Mechanics'),
          makeLesson(`c${academicClass}-phy`, 2, 'Work, Power & Conservation of Energy', 40, 'Analyze kinetic/potential energy transformations and efficiency.', 'Energy'),
          makeLesson(`c${academicClass}-phy`, 3, 'Current Electricity & Circuit Laws', 45, 'Apply Ohm law, Kirchhoff rules, and series/parallel resistance.', 'Electricity'),
          makeLesson(`c${academicClass}-phy`, 4, 'Reflection, Refraction & Lenses', 40, 'Draw ray diagrams and compute magnification formulas.', 'Optics'),
        ],
      },
      {
        id: `cls${academicClass}-che`,
        code: 'CHE',
        name: isBV ? `${levelTag} Chemistry (Roshayon)` : `${levelTag} Chemistry`,
        localTitle: isBV ? 'রসায়ন' : undefined,
        category: 'Group Major',
        description: `Atomic structure, periodic trends, stoichiometry, and organic chemistry for Class ${academicClass} Science.`,
        lessons: [
          makeLesson(`c${academicClass}-che`, 1, 'Atomic Orbitals & Periodic Trends', 40, 'Explain ionization energy, electronegativity, and electron configuration.', 'Atomic Theory'),
          makeLesson(`c${academicClass}-che`, 2, 'Chemical Bonding & Molecular Shapes', 40, 'Compare ionic, covalent, hydrogen bonding, and hybridization.', 'Bonding'),
          makeLesson(`c${academicClass}-che`, 3, 'Mole Concept & Stoichiometry', 45, 'Calculate limiting reagents, molarity, and titration concentrations.', 'Stoichiometry'),
          makeLesson(`c${academicClass}-che`, 4, 'Hydrocarbons & Functional Groups', 45, 'Master IUPAC naming and key organic reaction mechanisms.', 'Organic Chemistry'),
        ],
      },
      {
        id: `cls${academicClass}-bio`,
        code: 'BIO',
        name: isBV ? `${levelTag} Biology (Jibbiggan)` : `${levelTag} Biology`,
        localTitle: isBV ? 'জীববিজ্ঞান' : undefined,
        category: 'Group Major',
        description: `Cell division, plant physiology, human organ systems, and genetics for Class ${academicClass} Science.`,
        lessons: [
          makeLesson(`c${academicClass}-bio`, 1, 'Mitosis, Meiosis & Cell Cycle', 35, 'Compare stages of nuclear division and genetic variation.', 'Cell Division'),
          makeLesson(`c${academicClass}-bio`, 2, 'Photosynthesis & Cellular Respiration', 40, 'Trace light/dark reactions, glycolysis, and ATP yield.', 'Bioenergetics'),
          makeLesson(`c${academicClass}-bio`, 3, 'Human Circulation & Nervous System', 40, 'Understand cardiac cycle, blood groups, and reflex arcs.', 'Human Physiology'),
        ],
      },
      {
        id: `cls${academicClass}-hmath`,
        code: 'HMA',
        name: isBV ? `${levelTag} Higher Mathematics (Ucchotor Gonit)` : `${levelTag} Higher Mathematics`,
        localTitle: isBV ? 'উচ্চতর গণিত' : undefined,
        category: 'Group Major',
        description: `Trigonometry, coordinate geometry, calculus/functions, and probability for Class ${academicClass} Science.`,
        lessons: [
          makeLesson(`c${academicClass}-hma`, 1, 'Functions, Matrices & Polynomials', 45, 'Compute inverse functions, determinants, and remainder theorem.', 'Algebra'),
          makeLesson(`c${academicClass}-hma`, 2, 'Trigonometric Identities & Equations', 45, 'Prove compound angle identities and solve general solutions.', 'Trigonometry'),
          makeLesson(`c${academicClass}-hma`, 3, 'Straight Lines, Circles & Calculus', 50, 'Find slopes, tangents, derivatives, and definite integrals.', 'Coordinate & Calculus'),
        ],
      },
      ...coreSubjects,
    ];
  }

  if (group === 'Commerce') {
    return [
      {
        id: `cls${academicClass}-acc`,
        code: 'ACC',
        name: isBV ? `${levelTag} Accounting (Hishabbiggan)` : `${levelTag} Accounting`,
        localTitle: isBV ? 'হিসাববিজ্ঞান' : undefined,
        category: 'Group Major',
        description: `Double-entry bookkeeping, ledgers, trial balance, and financial statements for Class ${academicClass} Commerce.`,
        lessons: [
          makeLesson(`c${academicClass}-acc`, 1, 'Accounting Equation & Journal Entries', 40, 'Record transactions using Assets = Liabilities + Equity.', 'Double Entry'),
          makeLesson(`c${academicClass}-acc`, 2, 'Cash Book & Bank Reconciliation', 40, 'Prepare three-column cash books and reconcile bank balances.', 'Cash Control'),
          makeLesson(`c${academicClass}-acc`, 3, 'Income Statement & Balance Sheet', 45, 'Apply adjusting entries for depreciation and accrued expenses.', 'Financial Statements'),
        ],
      },
      {
        id: `cls${academicClass}-fin`,
        code: 'FIN',
        name: isBV ? `${levelTag} Finance & Banking` : `${levelTag} Finance & Banking`,
        localTitle: isBV ? 'ফিন্যান্স ও ব্যাংকিং' : undefined,
        category: 'Group Major',
        description: `Time value of money, capital budgeting, risk-return analysis, and commercial banking for Class ${academicClass}.`,
        lessons: [
          makeLesson(`c${academicClass}-fin`, 1, 'Time Value of Money (PV & FV)', 40, 'Calculate compounding, discounting, and effective annual rates.', 'Valuation'),
          makeLesson(`c${academicClass}-fin`, 2, 'Capital Budgeting (NPV & Payback)', 45, 'Evaluate investment projects using payback period and NPV.', 'Capital Budgeting'),
          makeLesson(`c${academicClass}-fin`, 3, 'Central Bank & Commercial Banking', 35, 'Examine Bangladesh Bank monetary policy and credit creation.', 'Banking'),
        ],
      },
      {
        id: `cls${academicClass}-bus`,
        code: 'BUS',
        name: `${levelTag} Business Organization & Management`,
        localTitle: isBV ? 'ব্যবসায় সংগঠন ও ব্যবস্থাপনা' : undefined,
        category: 'Group Major',
        description: `Business ownership structures, entrepreneurship, planning, and leadership principles for Class ${academicClass}.`,
        lessons: [
          makeLesson(`c${academicClass}-bus`, 1, 'Sole Proprietorship, Partnership & Companies', 35, 'Compare liability, capital formation, and legal registration.', 'Ownership Forms'),
          makeLesson(`c${academicClass}-bus`, 2, 'Principles of Management & Planning', 35, 'Apply Fayol management functions to real organizations.', 'Management'),
          makeLesson(`c${academicClass}-bus`, 3, 'Marketing Mix & E-Commerce in Bangladesh', 35, 'Analyze 4Ps strategy and digital retail operations.', 'Marketing'),
        ],
      },
      ...coreSubjects,
    ];
  }

  // Arts / Humanities Group
  return [
    {
      id: `cls${academicClass}-his`,
      code: 'HIS',
      name: isBV ? `${levelTag} History & World Civilization` : `${levelTag} History & World Civilization`,
      localTitle: isBV ? 'ইতিহাস ও বিশ্বসভ্যতা' : undefined,
      category: 'Group Major',
      description: `Ancient Bengal, Language Movement 1952, Liberation War 1971, and modern world history for Class ${academicClass} Arts.`,
      lessons: [
        makeLesson(`c${academicClass}-his`, 1, 'Ancient & Medieval Bengal Heritage', 35, 'Explore Pala, Sena, and Sultanate contributions to culture and governance.', 'Bengal History'),
        makeLesson(`c${academicClass}-his`, 2, 'Language Movement 1952 to 1971 Liberation War', 40, 'Analyze milestones of self-determination and independence.', 'National History'),
        makeLesson(`c${academicClass}-his`, 3, 'Industrial Revolution & United Nations', 35, 'Trace global economic shifts and international diplomacy.', 'World History'),
      ],
    },
    {
      id: `cls${academicClass}-civ`,
      code: 'CIV',
      name: isBV ? `${levelTag} Civics & Good Governance` : `${levelTag} Civics & Good Governance`,
      localTitle: isBV ? 'পৌরনীতি ও সুশাসন' : undefined,
      category: 'Group Major',
      description: `Constitution of Bangladesh, citizenship rights, parliamentary democracy, and public administration for Class ${academicClass}.`,
      lessons: [
        makeLesson(`c${academicClass}-civ`, 1, 'Citizenship, Rights & Duties', 35, 'Distinguish social, political, and economic rights in a democracy.', 'Citizenship'),
        makeLesson(`c${academicClass}-civ`, 2, 'Constitution & Organs of Government', 40, 'Review Legislature, Executive, and Judiciary checks and balances.', 'Constitutional Law'),
        makeLesson(`c${academicClass}-civ`, 3, 'Good Governance & E-Governance', 30, 'Identify pillars of transparency, accountability, and rule of law.', 'Governance'),
      ],
    },
    {
      id: `cls${academicClass}-eco`,
      code: 'ECO',
      name: isBV ? `${levelTag} Economics (Orthoniti)` : `${levelTag} Economics`,
      localTitle: isBV ? 'অর্থনীতি' : undefined,
      category: 'Group Major',
      description: `Demand & supply curves, elasticity, national income (GDP), and Bangladesh development economics for Class ${academicClass}.`,
      lessons: [
        makeLesson(`c${academicClass}-eco`, 1, 'Law of Demand, Supply & Equilibrium', 40, 'Interpret market equilibrium graphs and price shifts.', 'Microeconomics'),
        makeLesson(`c${academicClass}-eco`, 2, 'GDP, GNP & Inflation Indicators', 40, 'Measure national output and understand fiscal/monetary responses.', 'Macroeconomics'),
        makeLesson(`c${academicClass}-eco`, 3, 'Agriculture, RMG & Remittance Sectors', 35, 'Analyze growth drivers of the Bangladesh economy.', 'Development Economics'),
      ],
    },
    ...coreSubjects,
  ];
}

// ============================================================================
// Service Export
// ============================================================================

export const studentService = {
  /**
   * Validate a student coupon code against both the student pathway registry
   * and the main coupon database (including newly generated Admin S-XXXXX coupons).
   */
  validateStudentCoupon(
    rawCode: string,
    activePathway: StudentPathway,
    now = Date.now()
  ): StudentCouponCheckResult {
    const code = normalizeCouponCode(rawCode);
    if (!code) {
      return {
        ok: false,
        reason: 'invalid_format',
        message: 'Please enter your student coupon code (format: S-12345).',
      };
    }

    if (/^T-\d{5}$/.test(code)) {
      return {
        ok: false,
        reason: 'teacher_coupon',
        message: 'This is a Teacher coupon code. Please enter a Student coupon starting with S-.',
      };
    }

    if (!/^S-\d{5}$/.test(code)) {
      return {
        ok: false,
        reason: 'invalid_format',
        message: 'Invalid format. Student coupon codes must look like S-12345.',
      };
    }

    const metaList = loadStudentCouponsMeta(now);
    const metaMatch = metaList.find((c) => c.code === code);

    // Also inspect core coupon store (captures any new S-XXXXX generated by Admin Coupons!)
    const coreCoupons = couponService.listCoupons(now);
    const coreMatch = coreCoupons.find((c) => c.code === code);

    if (!metaMatch && !coreMatch) {
      return {
        ok: false,
        reason: 'not_found',
        message: `Coupon "${code}" was not found. Check the code or try demo coupon ${getDemoStudentCouponHint(activePathway)}.`,
      };
    }

    // Pathway check when coupon is explicitly bound to a pathway
    if (metaMatch && metaMatch.pathway !== activePathway) {
      const expectedLabel = getStudentPathwayLabel(metaMatch.pathway);
      const activeLabel = getStudentPathwayLabel(activePathway);
      return {
        ok: false,
        reason: 'pathway_mismatch',
        message: `Coupon "${code}" belongs to ${expectedLabel} and cannot be redeemed under ${activeLabel}.`,
      };
    }

    const effectiveStatus =
      metaMatch?.status === 'used' || coreMatch?.status === 'used'
        ? 'used'
        : metaMatch?.status === 'expired' || coreMatch?.status === 'expired'
          ? 'expired'
          : 'active';

    const effectiveExpiresAt = metaMatch?.expiresAt ?? coreMatch?.expiresAt ?? now + COUPON_TTL_MS;

    if (effectiveStatus === 'used') {
      return {
        ok: false,
        reason: 'already_used',
        message: `Coupon "${code}" has already been redeemed.`,
      };
    }

    if (effectiveStatus === 'expired' || now >= effectiveExpiresAt) {
      if (metaMatch && metaMatch.status !== 'expired') {
        metaMatch.status = 'expired';
        saveStudentCouponsMeta(metaList);
      }
      return {
        ok: false,
        reason: 'expired',
        message: `Coupon "${code}" has passed its 48-hour expiry window. Please request a fresh coupon from your admin.`,
      };
    }

    const resolvedRecord: StudentCouponRecord = metaMatch ?? {
      code: coreMatch!.code,
      pathway: activePathway,
      status: 'active',
      createdAt: coreMatch!.createdAt,
      expiresAt: coreMatch!.expiresAt,
    };

    return { ok: true, coupon: resolvedRecord };
  },

  /**
   * Submit a validated coupon-based student application directly into the Admin
   * Users -> Pending Approvals -> Student Pending queue (strictly pathway-scoped)
   * with a live 48-hour countdown window.
   */
  submitStudentCouponRegistration(
    input: StudentRegistrationInput,
    now = Date.now()
  ): { ok: true; registration: PathwayPendingRegistration } | { ok: false; error: string } {
    const couponCheck = this.validateStudentCoupon(input.couponCode, input.pathway, now);
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

    const normalizedEmail = input.email.trim().toLowerCase();
    const store = readSharedAdminUsersStore(input.pathway, now);

    const duplicatePending = store.pendingRegistrations.some(
      (r) => r.email.toLowerCase() === normalizedEmail
    );
    const duplicateProfile = store.profiles.some(
      (p) => p.email.toLowerCase() === normalizedEmail
    );
    if (duplicatePending || duplicateProfile) {
      return {
        ok: false,
        error: 'An account or pending registration already exists with this email address.',
      };
    }

    const normalizedGroup = normalizeStudentGroup(input.academicClass, input.academicGroup);
    const registrationId = `pend-${input.pathway === 'bangla_version' ? 'bv' : 'ev'}-s${Math.floor(
      1000 + Math.random() * 9000
    )}`;

    const record: PathwayPendingRegistration = {
      id: registrationId,
      pathway: input.pathway,
      role: 'student',
      fullName: input.fullName.trim(),
      email: normalizedEmail,
      academicClass: input.academicClass,
      academicGroup: normalizedGroup,
      couponCode: couponCheck.coupon.code,
      submittedAt: now,
      expiresAt: now + PENDING_EXPIRY_WINDOW_MS,
      passwordHash: hashPassword(input.password),
    };

    store.pendingRegistrations.unshift(record);
    writeSharedAdminUsersStore(store);

    // Mark coupon used in student coupon meta store
    const metaList = loadStudentCouponsMeta(now);
    const metaIdx = metaList.findIndex((c) => c.code === couponCheck.coupon.code);
    if (metaIdx >= 0) {
      metaList[metaIdx].status = 'used';
      metaList[metaIdx].usedByEmail = normalizedEmail;
    } else {
      metaList.unshift({
        ...couponCheck.coupon,
        status: 'used',
        usedByEmail: normalizedEmail,
      });
    }
    saveStudentCouponsMeta(metaList);

    // Also mark used in core coupon store if present there
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
   * Ensure active student directory accounts & demo students can log in smoothly
   * via standard email+password or 1-click demo login, syncing their exact
   * pathway, class (1-12), and group context without modifying Admin/Teacher auth.
   */
  prepareStudentAccountForLogin(
    rawEmail: string,
    password: string,
    selectedPathway: StudentPathway,
    now = Date.now()
  ): { synced: boolean; pathway?: StudentPathway } {
    const email = rawEmail.trim().toLowerCase();
    if (!email) return { synced: false };

    const db = loadDatabase(now);
    const store = readSharedAdminUsersStore(selectedPathway, now);

    // Match active student profile from the Admin Users directory (both pathways checked, preferring active pathway)
    const dirProfile =
      store.profiles.find(
        (p) => p.role === 'student' && p.pathway === selectedPathway && p.email.toLowerCase() === email
      ) ??
      store.profiles.find((p) => p.role === 'student' && p.email.toLowerCase() === email);

    if (dirProfile && dirProfile.status === 'active' && verifyPassword(password, dirProfile.passwordHash)) {
      const existing = db.users.find((u) => u.email.toLowerCase() === email);
      const mappedClass: StudentClass | undefined =
        dirProfile.academicClass >= 6 && dirProfile.academicClass <= 12
          ? (dirProfile.academicClass as StudentClass)
          : undefined;

      const userId = existing?.id ?? dirProfile.id;
      if (!existing) {
        const account: UserAccount = {
          id: dirProfile.id,
          role: 'student',
          fullName: dirProfile.fullName,
          email: dirProfile.email,
          passwordHash: dirProfile.passwordHash,
          mustChangePassword: false,
          preferredLanguage: 'en',
          createdAt: dirProfile.joinedAt,
          studentClass: mappedClass,
          educationStream: 'Bangladesh National Curriculum (NCTB)',
          pathway: dirProfile.academicGroup ?? getStudentPathwayLabel(dirProfile.pathway),
        };
        db.users.push(account);
        saveDatabase(db);
      } else {
        // Keep fast unified demo access without forced password-change blocker
        if (existing.mustChangePassword) {
          existing.mustChangePassword = false;
          saveDatabase(db);
        }
      }

      // Persist full Class 1-12 + Group + Pathway context for the Student Dashboard
      const contexts = loadStudentContexts();
      contexts[userId] = {
        userId,
        fullName: dirProfile.fullName,
        email: dirProfile.email,
        pathway: selectedPathway,
        academicClass: dirProfile.academicClass,
        academicGroup: normalizeStudentGroup(dirProfile.academicClass, dirProfile.academicGroup),
        registrationType: dirProfile.registrationType,
        joinedAt: dirProfile.joinedAt,
      };
      saveStudentContexts(contexts);
      return { synced: true, pathway: selectedPathway };
    }

    // Fallback for legacy seeded demo student (nafisa@student.edu.bd)
    const legacyUser = db.users.find(
      (u) => u.role === 'student' && u.email.toLowerCase() === email
    );
    if (legacyUser && verifyPassword(password, legacyUser.passwordHash)) {
      const contexts = loadStudentContexts();
      const cls = (legacyUser.studentClass ?? 10) as StudentClassLevel;
      const grp: StudentGroup | null =
        legacyUser.pathway === 'Science' ||
        legacyUser.pathway === 'Arts' ||
        legacyUser.pathway === 'Commerce'
          ? legacyUser.pathway
          : normalizeStudentGroup(cls, 'Science');
      contexts[legacyUser.id] = {
        userId: legacyUser.id,
        fullName: legacyUser.fullName,
        email: legacyUser.email,
        pathway: selectedPathway,
        academicClass: cls,
        academicGroup: grp,
        registrationType: 'coupon_auto',
        joinedAt: legacyUser.createdAt,
      };
      saveStudentContexts(contexts);
      return { synced: true, pathway: selectedPathway };
    }

    return { synced: false };
  },

  /**
   * Resolve the logged-in student's complete pathway/class/group context.
   * Returns null if the session is outside Phase 1 pathways (Bangla Version / English Version).
   */
  resolveStudentContext(
    session: AuthSession,
    profile: Omit<UserAccount, 'passwordHash'> | null,
    now = Date.now()
  ): StudentProfileContext | null {
    const resolvedPathway = resolveStudentPathway(session.selectedPathway ?? 'Bangla Version');
    if (!resolvedPathway) {
      return null;
    }

    const contexts = loadStudentContexts();
    const saved = contexts[session.userId];
    if (saved) {
      return {
        ...saved,
        fullName: session.fullName,
        email: session.email,
        pathway: resolvedPathway,
      };
    }

    // Look up in shared admin directory profiles
    const store = readSharedAdminUsersStore(resolvedPathway, now);
    const dirMatch = store.profiles.find(
      (p) => p.id === session.userId || p.email.toLowerCase() === session.email.toLowerCase()
    );
    if (dirMatch) {
      return {
        userId: session.userId,
        fullName: dirMatch.fullName,
        email: dirMatch.email,
        pathway: resolvedPathway,
        academicClass: dirMatch.academicClass,
        academicGroup: normalizeStudentGroup(dirMatch.academicClass, dirMatch.academicGroup),
        registrationType: dirMatch.registrationType,
        joinedAt: dirMatch.joinedAt,
      };
    }

    const cls = (profile?.studentClass ?? 10) as StudentClassLevel;
    const rawGroup = profile?.pathway;
    const group: StudentGroup | null =
      rawGroup === 'Science' || rawGroup === 'Arts' || rawGroup === 'Commerce'
        ? normalizeStudentGroup(cls, rawGroup)
        : normalizeStudentGroup(cls, 'Science');

    return {
      userId: session.userId,
      fullName: session.fullName,
      email: session.email,
      pathway: resolvedPathway,
      academicClass: cls,
      academicGroup: group,
      registrationType: 'coupon_auto',
      joinedAt: profile?.createdAt ?? session.loggedInAt,
    };
  },

  /**
   * Fetch notices strictly from the student's matching pathway admin
   * targeted to 'student' or 'both', and matching the student's Class & Group when specified.
   */
  listRelevantNotices(
    student: Pick<StudentProfileContext, 'pathway' | 'academicClass' | 'academicGroup'>,
    filters: {
      query?: string;
      audience?: 'all' | 'student' | 'both';
      tag?: 'all' | NoticeCategoryTag;
    } = {},
    now = Date.now()
  ): PathwayNotice[] {
    const pathwayNotices = adminNoticesService.listNotices(student.pathway, now);
    const q = (filters.query ?? '').trim().toLowerCase();

    return pathwayNotices.filter((notice) => {
      // Strictly exclude teacher-only notices
      if (notice.targetAudience === 'teacher') return false;

      // Enforce optional class scope
      if (notice.targetClass !== null && notice.targetClass !== student.academicClass) {
        return false;
      }

      // Enforce optional group scope
      if (notice.targetGroup !== null && notice.targetGroup !== student.academicGroup) {
        return false;
      }

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
   * Persistent lesson completion tracking per student.
   */
  getCompletedLessonIds(userId: string): string[] {
    const map = loadLessonProgressMap();
    return Array.isArray(map[userId]) ? map[userId] : [];
  },

  toggleLessonCompleted(userId: string, lessonId: string): string[] {
    const map = loadLessonProgressMap();
    const current = new Set(Array.isArray(map[userId]) ? map[userId] : []);
    if (current.has(lessonId)) {
      current.delete(lessonId);
    } else {
      current.add(lessonId);
    }
    const updated = Array.from(current);
    map[userId] = updated;
    saveLessonProgressMap(map);
    return updated;
  },

  /**
   * Direct password update for the logged-in student inside Profile & Settings.
   */
  updateStudentPassword(
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
      return { ok: false, error: 'Student account record was not found.' };
    }
    if (!verifyPassword(currentPassword, user.passwordHash)) {
      return { ok: false, error: 'Your current password is incorrect.' };
    }

    const nextHash = hashPassword(newPassword);
    user.passwordHash = nextHash;
    user.mustChangePassword = false;
    saveDatabase(db);

    // Keep shared directory hash synced if present
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
