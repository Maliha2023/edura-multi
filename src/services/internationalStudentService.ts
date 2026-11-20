import { loadDatabase, saveDatabase } from './storage';
import {
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
import type { AuthSession, UserAccount } from '../types/domain';
import { hashPassword, verifyPassword } from '../utils/crypto';
import { validateEmail, validateFullName, validatePassword } from '../utils/validation';

export type {
  InternationalAcademicLevel,
  InternationalAcademicTrack,
  InternationalNotice,
  InternationalNoticeTag,
  InternationalPathway,
  UpperAcademicTrack,
};

export interface IntlStudentContext {
  userId: string;
  fullName: string;
  email: string;
  pathway: InternationalPathway;
  academicLevel: InternationalAcademicLevel;
  academicTrack: InternationalAcademicTrack;
  registrationType: InternationalRegistrationType;
  couponCode?: string;
  joinedAt: number;
}

export interface IntlStudentLesson {
  id: string;
  title: string;
  keyTopic: string;
  durationMinutes: number;
  summary: string;
  examFocus: string;
}

export interface IntlStudentSubject {
  id: string;
  code: string;
  name: string;
  examBoardTag: string;
  category: 'Core' | 'Track Major' | 'Elective';
  description: string;
  lessons: IntlStudentLesson[];
}

export interface IntlDemoStudentPreset {
  pathway: InternationalPathway;
  fullName: string;
  email: string;
  password: string;
  academicLevel: InternationalAcademicLevel;
  academicTrack: InternationalAcademicTrack;
}

export interface IntlStudentCouponValidationResult {
  ok: boolean;
  coupon?: InternationalCoupon;
  message: string;
}

export interface IntlStudentRegistrationInput {
  pathway: InternationalPathway;
  couponCode: string;
  fullName: string;
  email: string;
  password: string;
  academicLevel: InternationalAcademicLevel;
  academicTrack?: InternationalAcademicTrack;
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

const ADMIN_STORE_KEY = 'edura_international_admin_workspace_v2';
const PROGRESS_STORAGE_KEY = 'edura_intl_student_progress_v1';
const FORTY_EIGHT_HOURS_MS = 48 * 60 * 60 * 1000;

let memoryProgressStore: Record<string, string[]> = {};

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

function loadProgressMap(): Record<string, string[]> {
  if (canUseLocalStorage()) {
    try {
      const raw = window.localStorage.getItem(PROGRESS_STORAGE_KEY);
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
    window.localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(map));
  } else {
    memoryProgressStore = map;
  }
}

export function getIntlStudentPathwayLabel(pathway: InternationalPathway): 'Cambridge' | 'Edexcel' {
  return pathway === 'cambridge' ? 'Cambridge' : 'Edexcel';
}

export function getIntlExamBoardName(pathway: InternationalPathway): string {
  return pathway === 'cambridge'
    ? 'Cambridge Assessment International Education (CAIE)'
    : 'Pearson Edexcel International';
}

export function formatIntlStudentContextBadge(
  pathway: InternationalPathway,
  academicLevel: InternationalAcademicLevel,
  academicTrack: InternationalAcademicTrack
): string {
  const pathwayLabel = getIntlStudentPathwayLabel(pathway);
  const shortLevel = getShortLevelLabel(academicLevel);
  const trackLabel = academicTrack || 'General';
  return `${pathwayLabel} • ${shortLevel} • ${trackLabel}`;
}

export function getDemoIntlStudentPreset(pathway: InternationalPathway): IntlDemoStudentPreset {
  if (pathway === 'cambridge') {
    return {
      pathway: 'cambridge',
      fullName: 'Ayaan Siddiqui',
      email: 'ayaan.s@cambridge-student.edu.bd',
      password: 'Student@1234',
      academicLevel: 'O Level / IGCSE (Grades 9–10)',
      academicTrack: 'Science',
    };
  }
  return {
    pathway: 'edexcel',
    fullName: 'Nusrat Jahan',
    email: 'nusrat.j@edexcel-student.edu.bd',
    password: 'Student@1234',
    academicLevel: 'International GCSE (Grades 9–10)',
    academicTrack: 'Business',
  };
}

export function getDemoIntlStudentCouponHint(
  pathway: InternationalPathway,
  now = Date.now()
): string {
  const store = readSharedIntlAdminStore(now);
  const active = store.coupons.find(
    (c) =>
      c.pathway === pathway &&
      c.role === 'student' &&
      c.status === 'active' &&
      c.expiresAt > now
  );
  if (active) return active.code;
  return pathway === 'cambridge' ? 'S-61488' : 'S-82903';
}

function makeLesson(
  prefix: string,
  idx: number,
  title: string,
  keyTopic: string,
  durationMinutes: number,
  summary: string,
  examFocus: string
): IntlStudentLesson {
  return {
    id: `${prefix}-L${idx}`,
    title,
    keyTopic,
    durationMinutes,
    summary,
    examFocus,
  };
}

export function getIntlSubjectsForStudent(
  pathway: InternationalPathway,
  academicLevel: InternationalAcademicLevel,
  academicTrack: InternationalAcademicTrack
): IntlStudentSubject[] {
  const isLower = academicLevel === LOWER_SECONDARY_LEVEL;
  const isAdvanced =
    academicLevel === 'A Level / IAL (Grades 11–12)' || academicLevel === 'IAL (Grades 11–12)';
  const boardTag = pathway === 'cambridge' ? 'Cambridge CAIE' : 'Pearson Edexcel';

  if (isLower) {
    if (pathway === 'cambridge') {
      return [
        {
          id: 'cam-ls-math',
          code: '0862',
          name: 'Cambridge Lower Secondary Mathematics',
          examBoardTag: 'Cambridge Checkpoint',
          category: 'Core',
          description:
            'Number sense, algebraic thinking, geometry, and probability aligned with Cambridge Lower Secondary Checkpoint.',
          lessons: [
            makeLesson(
              'cam-ls-math',
              1,
              'Linear Equations & Algebraic Expressions',
              'Algebra',
              30,
              'Simplify expressions, solve multi-step linear equations, and construct algebraic formulas from word problems.',
              'Checkpoint Paper 1 & 2'
            ),
            makeLesson(
              'cam-ls-math',
              2,
              'Angles, Polygons & Coordinate Transformations',
              'Geometry',
              35,
              'Calculate interior/exterior polygon angles and perform translations, reflections, and rotations on grids.',
              'Checkpoint Paper 2'
            ),
            makeLesson(
              'cam-ls-math',
              3,
              'Ratio, Percentage Change & Data Interpretation',
              'Statistics & Number',
              30,
              'Interpret compound percentages, stem-and-leaf plots, and experimental probability.',
              'Checkpoint Paper 1'
            ),
          ],
        },
        {
          id: 'cam-ls-eng',
          code: '0861',
          name: 'Cambridge Lower Secondary English',
          examBoardTag: 'Cambridge Checkpoint',
          category: 'Core',
          description:
            'Reading comprehension, writer’s effect analysis, and structured narrative and persuasive composition.',
          lessons: [
            makeLesson(
              'cam-ls-eng',
              1,
              'Analyzing Fiction & Writer’s Craft',
              'Reading Comprehension',
              30,
              'Identify figurative devices, narrative perspective, and implicit meaning in short prose extracts.',
              'Checkpoint Paper 1'
            ),
            makeLesson(
              'cam-ls-eng',
              2,
              'Structured Persuasive & Discursive Writing',
              'Directed Writing',
              35,
              'Organize balanced arguments with cohesive topic sentences, formal tone, and persuasive evidence.',
              'Checkpoint Paper 2'
            ),
            makeLesson(
              'cam-ls-eng',
              3,
              'Summary Skills & Precision Grammar',
              'Language Control',
              25,
              'Synthesize non-fiction points concisely while maintaining accurate punctuation and complex clauses.',
              'Checkpoint Paper 1'
            ),
          ],
        },
        {
          id: 'cam-ls-sci',
          code: '0893',
          name: 'Cambridge Lower Secondary Science',
          examBoardTag: 'Cambridge Checkpoint',
          category: 'Core',
          description:
            'Integrated Biology, Chemistry, Physics, and Scientific Enquiry preparing learners for IGCSE sciences.',
          lessons: [
            makeLesson(
              'cam-ls-sci',
              1,
              'Cell Structure, Respiration & Photosynthesis',
              'Biology',
              35,
              'Compare plant and animal cells, gas exchange pathways, and factors affecting photosynthesis rate.',
              'Checkpoint Paper 1'
            ),
            makeLesson(
              'cam-ls-sci',
              2,
              'Atomic Structure, Periodic Trends & Reactions',
              'Chemistry',
              35,
              'Explore electron shells, reactivity series displacement reactions, and neutralisation word equations.',
              'Checkpoint Paper 2'
            ),
            makeLesson(
              'cam-ls-sci',
              3,
              'Forces, Density & Energy Transfers',
              'Physics',
              30,
              'Calculate density and pressure, draw balanced force diagrams, and evaluate thermal energy conservation.',
              'Scientific Enquiry'
            ),
          ],
        },
        {
          id: 'cam-ls-comp',
          code: '0860',
          name: 'Computing & Global Perspectives',
          examBoardTag: 'Cambridge Lower Secondary',
          category: 'Elective',
          description:
            'Computational thinking, Python basics, and evidence-based research on global sustainability topics.',
          lessons: [
            makeLesson(
              'cam-ls-comp',
              1,
              'Algorithm Design, Flowcharts & Trace Tables',
              'Computational Thinking',
              30,
              'Break problems into modular steps using selection, iteration, and dry-run trace tables.',
              'Practical Challenge'
            ),
            makeLesson(
              'cam-ls-comp',
              2,
              'Evaluating Sources & Global Research Briefs',
              'Global Perspectives',
              25,
              'Assess bias, credibility, and local-to-global perspectives in structured research inquiries.',
              'Team Project'
            ),
          ],
        },
      ];
    }

    // Edexcel Grade 1–8
    return [
      {
        id: 'edx-ls-math',
        code: 'LMA11',
        name: 'Edexcel iLowerSecondary Mathematics',
        examBoardTag: 'Pearson iLowerSecondary',
        category: 'Core',
        description:
          'Structured progression in algebra, proportional reasoning, geometry, and statistics for Pearson iLowerSecondary.',
        lessons: [
          makeLesson(
            'edx-ls-math',
            1,
            'Sequences, Linear Graphs & Formula Rearrangement',
            'Algebra',
            30,
            'Find nth-term rules, plot y = mx + c graphs, and change the subject of linear formulas.',
            'iLowerSecondary Achievement Test'
          ),
          makeLesson(
            'edx-ls-math',
            2,
            'Pythagoras, Area of Compound Shapes & Scale Drawings',
            'Geometry & Measures',
            35,
            'Apply Pythagoras’ theorem to right-angled triangles and solve bearing and scale map problems.',
            'iLowerSecondary Achievement Test'
          ),
          makeLesson(
            'edx-ls-math',
            3,
            'Averages from Frequency Tables & Probability Trees',
            'Statistics',
            30,
            'Compute estimated mean from grouped data and evaluate combined event probabilities.',
            'Problem Solving Focus'
          ),
        ],
      },
      {
        id: 'edx-ls-eng',
        code: 'LEH11',
        name: 'Edexcel iLowerSecondary English',
        examBoardTag: 'Pearson iLowerSecondary',
        category: 'Core',
        description:
          'Active reading strategies, textual comparison, and purposeful writing for diverse audiences.',
        lessons: [
          makeLesson(
            'edx-ls-eng',
            1,
            'Inference, Tone & Non-Fiction Text Comparison',
            'Reading Analysis',
            30,
            'Compare how two writers present contrasting viewpoints using structural and lexical evidence.',
            'Section A Comprehension'
          ),
          makeLesson(
            'edx-ls-eng',
            2,
            'Descriptive & Transactional Composition',
            'Writing Craft',
            35,
            'Plan vivid descriptions and formal articles tailored to audience, purpose, and register.',
            'Section B Writing'
          ),
          makeLesson(
            'edx-ls-eng',
            3,
            'Sentence Variety, Cohesion & Proofreading',
            'Grammar & Punctuation',
            25,
            'Refine clauses, colons, semicolons, and paragraph transitions for high-band accuracy.',
            'Technical Accuracy'
          ),
        ],
      },
      {
        id: 'edx-ls-sci',
        code: 'LSC11',
        name: 'Edexcel iLowerSecondary Science',
        examBoardTag: 'Pearson iLowerSecondary',
        category: 'Core',
        description:
          'Foundational investigative science covering living systems, materials, and physical principles.',
        lessons: [
          makeLesson(
            'edx-ls-sci',
            1,
            'Human Organ Systems & Ecosystems',
            'Biology',
            35,
            'Trace digestion, circulatory transport, and interdependence within food webs.',
            'iLowerSecondary Science'
          ),
          makeLesson(
            'edx-ls-sci',
            2,
            'Acids, Metals & Chemical Formulae',
            'Chemistry',
            35,
            'Predict salt products from acid-metal and acid-carbonate reactions with balanced equations.',
            'iLowerSecondary Science'
          ),
          makeLesson(
            'edx-ls-sci',
            3,
            'Waves, Light Reflection & Simple Circuits',
            'Physics',
            30,
            'Construct series/parallel circuit diagrams and measure current, voltage, and refraction angles.',
            'Experimental Skills'
          ),
        ],
      },
      {
        id: 'edx-ls-comp',
        code: 'LCP11',
        name: 'Edexcel iLowerSecondary Computing',
        examBoardTag: 'Pearson iLowerSecondary',
        category: 'Elective',
        description:
          'Data representation, logical problem solving, and safe digital creation aligned with Pearson standards.',
        lessons: [
          makeLesson(
            'edx-ls-comp',
            1,
            'Binary Numbers, Logic Gates & Data Storage',
            'Computer Systems',
            30,
            'Convert between denary and binary and evaluate AND, OR, and NOT truth tables.',
            'Foundations of CS'
          ),
          makeLesson(
            'edx-ls-comp',
            2,
            'Structured Programming with Functions & Lists',
            'Programming',
            35,
            'Write clean modular routines using loops, conditionals, and indexed arrays.',
            'Applied Coding'
          ),
        ],
      },
    ];
  }

  // Upper levels: O Level / IGCSE / A Level (Cambridge) OR International GCSE / IAL (Edexcel)
  const coreSubjects: IntlStudentSubject[] =
    pathway === 'cambridge'
      ? [
          {
            id: isAdvanced ? 'cam-al-math' : 'cam-ig-math',
            code: isAdvanced ? '9709' : '0580',
            name: isAdvanced
              ? 'Cambridge International A Level Mathematics'
              : 'Cambridge IGCSE / O Level Mathematics',
            examBoardTag: isAdvanced ? 'CAIE A Level (9709)' : 'CAIE IGCSE (0580)',
            category: 'Core',
            description: isAdvanced
              ? 'Pure Mathematics 1 & 3, Mechanics, and Probability & Statistics aligned with CAIE 9709 past-paper schemes.'
              : 'Extended syllabus covering algebra, functions, trigonometry, vectors, and probability for Paper 2 & Paper 4.',
            lessons: isAdvanced
              ? [
                  makeLesson(
                    'cam-al-math',
                    1,
                    'Differentiation, Chain Rule & Stationary Points',
                    'Pure Math 1 (P1)',
                    45,
                    'Apply first and second derivatives to tangents, normals, and optimization problems.',
                    'Paper 1 (9709/12)'
                  ),
                  makeLesson(
                    'cam-al-math',
                    2,
                    'Integration by Parts, Substitution & Volumes',
                    'Pure Math 3 (P3)',
                    50,
                    'Evaluate definite integrals, differential equations, and volumes of revolution.',
                    'Paper 3 (9709/32)'
                  ),
                  makeLesson(
                    'cam-al-math',
                    3,
                    'Normal Distribution & Binomial Approximations',
                    'Probability & Statistics 1',
                    40,
                    'Standardize normal variables using Z-tables and apply continuity corrections.',
                    'Paper 5 (9709/52)'
                  ),
                ]
              : [
                  makeLesson(
                    'cam-ig-math',
                    1,
                    'Quadratics, Inequalities & Simultaneous Equations',
                    'Algebra & Graphs',
                    40,
                    'Solve quadratic equations by factorising, completing the square, and the quadratic formula.',
                    'Paper 2 & Paper 4'
                  ),
                  makeLesson(
                    'cam-ig-math',
                    2,
                    'Sine Rule, Cosine Rule & 3D Bearings',
                    'Trigonometry',
                    45,
                    'Solve non-right-angled triangle problems and calculate angles of elevation in 3D shapes.',
                    'Paper 4 Extended'
                  ),
                  makeLesson(
                    'cam-ig-math',
                    3,
                    'Cumulative Frequency, Histograms & Conditional Probability',
                    'Statistics & Probability',
                    40,
                    'Estimate medians and interquartile ranges from ogives and solve tree-diagram problems.',
                    'Paper 4 Extended'
                  ),
                ],
          },
          {
            id: isAdvanced ? 'cam-al-eng' : 'cam-ig-eng',
            code: isAdvanced ? '9093' : '1123',
            name: isAdvanced
              ? 'Cambridge A Level English Language'
              : 'Cambridge O Level / IGCSE English Language',
            examBoardTag: isAdvanced ? 'CAIE A Level (9093)' : 'CAIE O Level (1123)',
            category: 'Core',
            description:
              'Analytical reading, directed writing, register control, and concise summary technique for CAIE exam rubrics.',
            lessons: [
              makeLesson(
                'cam-eng',
                1,
                'Reading for Implicit Meaning & Writer’s Effect',
                'Reading Paper',
                35,
                'Select precise quotations and explain how lexical choices shape tone and reader response.',
                isAdvanced ? 'Paper 1 Passages' : 'Paper 1 Reading'
              ),
              makeLesson(
                'cam-eng',
                2,
                'Directed Writing: Reports, Speeches & Formal Letters',
                'Writing Paper',
                40,
                'Transform source points into purposeful text formats with clear audience awareness.',
                isAdvanced ? 'Paper 2 Writing' : 'Paper 2 Writing'
              ),
              makeLesson(
                'cam-eng',
                3,
                'Precision Summary & Cohesive Argument Structure',
                'Exam Technique',
                35,
                'Condense 15 content points into fluent own-words prose within strict word limits.',
                'Mark Scheme Band 1'
              ),
            ],
          },
        ]
      : [
          {
            id: isAdvanced ? 'edx-ial-math' : 'edx-ig-math',
            code: isAdvanced ? 'WMA11–14' : '4MA1',
            name: isAdvanced
              ? 'Pearson Edexcel IAL Mathematics'
              : 'Pearson Edexcel International GCSE Mathematics A',
            examBoardTag: isAdvanced ? 'Edexcel IAL (XMA01/YMA01)' : 'Edexcel Int. GCSE (4MA1)',
            category: 'Core',
            description: isAdvanced
              ? 'Modular Pure P1–P4, Mechanics M1, and Statistics S1 mapped directly to Pearson IAL unit mark schemes.'
              : 'Higher Tier (1H / 2H) mastery across algebra, calculus introduction, circle theorems, and statistics.',
            lessons: isAdvanced
              ? [
                  makeLesson(
                    'edx-ial-math',
                    1,
                    'Algebraic Fractions, Binomial Expansion & Radians',
                    'Pure Math P1/P2',
                    45,
                    'Expand (1 + ax)^n series, manipulate partial fractions, and solve trig equations in radians.',
                    'Unit WMA12'
                  ),
                  makeLesson(
                    'edx-ial-math',
                    2,
                    'Parametric Differentiation & Differential Equations',
                    'Pure Math P3/P4',
                    50,
                    'Find gradients of parametric curves and solve separable first-order differential equations.',
                    'Unit WMA14'
                  ),
                  makeLesson(
                    'edx-ial-math',
                    3,
                    'Kinematics, Connected Particles & Moments',
                    'Mechanics M1',
                    45,
                    'Resolve forces on inclined planes and analyze pulley systems using Newton’s Second Law.',
                    'Unit WME01'
                  ),
                ]
              : [
                  makeLesson(
                    'edx-ig-math',
                    1,
                    'Surds, Indices & Completing the Square',
                    'Number & Algebra',
                    40,
                    'Rationalise denominators, manipulate fractional indices, and locate turning points.',
                    'Paper 1H & 2H'
                  ),
                  makeLesson(
                    'edx-ig-math',
                    2,
                    'Circle Theorems, Vectors & Calculus Differentiation',
                    'Geometry & Calculus',
                    45,
                    'Construct geometric proofs, prove collinearity with vectors, and find stationary points.',
                    'Paper 2H Higher'
                  ),
                  makeLesson(
                    'edx-ig-math',
                    3,
                    'Histograms, Standard Form & Set Notation',
                    'Statistics & Sets',
                    35,
                    'Calculate frequency densities and solve three-set Venn diagram probability problems.',
                    'Paper 1H Higher'
                  ),
                ],
          },
          {
            id: isAdvanced ? 'edx-ial-eng' : 'edx-ig-eng',
            code: isAdvanced ? 'WEN01' : '4EA1',
            name: isAdvanced
              ? 'Pearson Edexcel IAL English Language'
              : 'Pearson Edexcel International GCSE English Language A',
            examBoardTag: isAdvanced ? 'Edexcel IAL (WEN01)' : 'Edexcel Int. GCSE (4EA1)',
            category: 'Core',
            description:
              'Non-fiction anthology analysis, comparative commentary, and transactional writing aligned with Pearson levels.',
            lessons: [
              makeLesson(
                'edx-eng',
                1,
                'Language & Structure Analysis in Anthology Texts',
                'Non-Fiction Reading',
                35,
                'Embed concise textual evidence and analyze pacing, syntax, and rhetorical shifts.',
                isAdvanced ? 'Unit 1 Context & Identity' : 'Paper 1 Section A'
              ),
              makeLesson(
                'edx-eng',
                2,
                'Transactional Writing: Articles, Reviews & Speeches',
                'Directed Composition',
                40,
                'Craft persuasive arguments with authoritative voice and structural cohesion.',
                isAdvanced ? 'Unit 2 Language in Transition' : 'Paper 1 Section B'
              ),
              makeLesson(
                'edx-eng',
                3,
                'Comparative Synthesis Across Unseen Extracts',
                'Comparison Essay',
                35,
                'Balance comparative discourse markers and evaluative commentary across two passages.',
                'AO3 Comparison'
              ),
            ],
          },
        ];

  // Track-specific subjects
  const scienceSubjects: IntlStudentSubject[] =
    pathway === 'cambridge'
      ? [
          {
            id: isAdvanced ? 'cam-al-phy' : 'cam-ig-phy',
            code: isAdvanced ? '9702' : '0625',
            name: isAdvanced ? 'Cambridge A Level Physics' : 'Cambridge IGCSE / O Level Physics',
            examBoardTag: isAdvanced ? 'CAIE A Level (9702)' : 'CAIE IGCSE (0625)',
            category: 'Track Major',
            description:
              'Mechanics, waves, electricity, fields, and experimental uncertainty analysis aligned with CAIE Papers 1, 2, 4 & Practical.',
            lessons: [
              makeLesson(
                'cam-phy',
                1,
                'Kinematics, Momentum & Forces Equilibrium',
                'Mechanics',
                45,
                'Interpret velocity-time graphs, apply conservation of momentum, and resolve coplanar forces.',
                isAdvanced ? 'Paper 2 (9702/22)' : 'Paper 4 Theory'
              ),
              makeLesson(
                'cam-phy',
                2,
                'Electric Circuits, Potential Dividers & Electromagnetism',
                'Electricity & Magnetism',
                45,
                'Analyze Kirchhoff’s laws, internal resistance, and electromagnetic induction.',
                isAdvanced ? 'Paper 2 & Paper 4' : 'Paper 2 MCQ & Paper 4'
              ),
              makeLesson(
                'cam-phy',
                3,
                'Waves, Superposition & Nuclear Physics',
                'Modern Physics',
                40,
                'Calculate diffraction grating wavelengths, half-life decay curves, and binding energy.',
                isAdvanced ? 'Paper 4 Structured' : 'Paper 6 ATP'
              ),
            ],
          },
          {
            id: isAdvanced ? 'cam-al-chem' : 'cam-ig-chem',
            code: isAdvanced ? '9701' : '0620',
            name: isAdvanced ? 'Cambridge A Level Chemistry' : 'Cambridge IGCSE / O Level Chemistry',
            examBoardTag: isAdvanced ? 'CAIE A Level (9701)' : 'CAIE IGCSE (0620)',
            category: 'Track Major',
            description:
              'Stoichiometry, chemical energetics, equilibrium, and organic reaction pathways with CAIE ATP & Paper 4 focus.',
            lessons: [
              makeLesson(
                'cam-chem',
                1,
                'Mole Calculations, Titration & Ideal Gas Equations',
                'Stoichiometry',
                40,
                'Determine empirical formulas, limiting reagents, and back-titration concentrations.',
                isAdvanced ? 'Paper 2 Structured' : 'Paper 4 Extended'
              ),
              makeLesson(
                'cam-chem',
                2,
                'Enthalpy Cycles, Kinetics & Le Chatelier’s Principle',
                'Physical Chemistry',
                45,
                'Apply Hess’s Law, Boltzmann distributions, and Kc/Kp equilibrium shifts.',
                isAdvanced ? 'Paper 2 & Paper 4' : 'Paper 4 Extended'
              ),
              makeLesson(
                'cam-chem',
                3,
                'Organic Functional Groups & Reaction Mechanisms',
                'Organic Chemistry',
                45,
                'Map alkanes, alkenes, alcohols, and carboxylic acids with diagnostic chemical tests.',
                isAdvanced ? 'Paper 4 Organic' : 'Paper 6 Practical'
              ),
            ],
          },
          {
            id: isAdvanced ? 'cam-al-cs' : 'cam-ig-cs',
            code: isAdvanced ? '9618' : '0478',
            name: isAdvanced ? 'Cambridge A Level Computer Science' : 'Cambridge IGCSE Computer Science',
            examBoardTag: isAdvanced ? 'CAIE A Level (9618)' : 'CAIE IGCSE (0478)',
            category: 'Elective',
            description:
              'Data representation, architecture, pseudocode algorithms, and relational databases.',
            lessons: [
              makeLesson(
                'cam-cs',
                1,
                'Binary, Hexadecimal, Two’s Complement & Compression',
                'Data Representation',
                35,
                'Convert signed integers and evaluate lossy vs lossless encoding trade-offs.',
                'Paper 1 Theory'
              ),
              makeLesson(
                'cam-cs',
                2,
                'Pseudocode Algorithms, Arrays & Trace Tables',
                'Problem Solving',
                45,
                'Design linear/binary search and bubble sort routines using official CAIE pseudocode.',
                'Paper 2 Algorithms'
              ),
            ],
          },
        ]
      : [
          {
            id: isAdvanced ? 'edx-ial-phy' : 'edx-ig-phy',
            code: isAdvanced ? 'WPH11–16' : '4PH1',
            name: isAdvanced ? 'Pearson Edexcel IAL Physics' : 'Pearson Edexcel International GCSE Physics',
            examBoardTag: isAdvanced ? 'Edexcel IAL Physics' : 'Edexcel Int. GCSE (4PH1)',
            category: 'Track Major',
            description:
              'Mechanics, materials, electricity, waves, and astrophysics structured around Pearson Edexcel command words.',
            lessons: [
              makeLesson(
                'edx-phy',
                1,
                'Projectiles, Work-Energy Theorem & Young Modulus',
                'Mechanics & Materials',
                45,
                'Resolve 2D projectile trajectories and calculate stress-strain stiffness from graphs.',
                isAdvanced ? 'Unit 1 (WPH11)' : 'Paper 1P & 2P'
              ),
              makeLesson(
                'edx-phy',
                2,
                'Current-Voltage Characteristics & Wave Optics',
                'Electricity & Waves',
                45,
                'Analyze ohmic/non-ohmic components, standing waves, and photoelectric thresholds.',
                isAdvanced ? 'Unit 2 (WPH12)' : 'Paper 1P'
              ),
              makeLesson(
                'edx-phy',
                3,
                'Radioactivity, Nuclear Fission & Astrophysics',
                'Nuclear & Space',
                40,
                'Apply Hubble’s law, stellar lifecycle stages, and nuclear decay equations.',
                isAdvanced ? 'Unit 5 (WPH15)' : 'Paper 2P'
              ),
            ],
          },
          {
            id: isAdvanced ? 'edx-ial-chem' : 'edx-ig-chem',
            code: isAdvanced ? 'WCH11–16' : '4CH1',
            name: isAdvanced ? 'Pearson Edexcel IAL Chemistry' : 'Pearson Edexcel International GCSE Chemistry',
            examBoardTag: isAdvanced ? 'Edexcel IAL Chemistry' : 'Edexcel Int. GCSE (4CH1)',
            category: 'Track Major',
            description:
              'Bonding, energetics, redox, and organic synthesis tailored to Pearson Edexcel structured mark schemes.',
            lessons: [
              makeLesson(
                'edx-chem',
                1,
                'Atomic Orbitals, Intermolecular Forces & Bonding',
                'Structure & Bonding',
                40,
                'Explain ionisation energy trends, VSEPR shapes, and hydrogen bonding anomalies.',
                isAdvanced ? 'Unit 1 (WCH11)' : 'Paper 1C'
              ),
              makeLesson(
                'edx-chem',
                2,
                'Energetics, Calorimetry & Redox Equilibria',
                'Physical Chemistry',
                45,
                'Calculate enthalpy changes from calorimetry data and balance ionic half-equations.',
                isAdvanced ? 'Unit 2 (WCH12)' : 'Paper 1C & 2C'
              ),
              makeLesson(
                'edx-chem',
                3,
                'Haloalkanes, Alcohols & Spectroscopy Analysis',
                'Organic Chemistry',
                45,
                'Interpret IR and mass spectra to identify organic structures and synthesis routes.',
                isAdvanced ? 'Unit 4 (WCH14)' : 'Paper 2C'
              ),
            ],
          },
        ];

  const businessSubjects: IntlStudentSubject[] =
    pathway === 'cambridge'
      ? [
          {
            id: isAdvanced ? 'cam-al-econ' : 'cam-ig-econ',
            code: isAdvanced ? '9708' : '0455',
            name: isAdvanced ? 'Cambridge A Level Economics' : 'Cambridge IGCSE / O Level Economics',
            examBoardTag: isAdvanced ? 'CAIE A Level (9708)' : 'CAIE IGCSE (0455)',
            category: 'Track Major',
            description:
              'Microeconomic price mechanism, elasticity, macroeconomic policy, and international trade evaluation.',
            lessons: [
              makeLesson(
                'cam-econ',
                1,
                'Demand, Supply & Price Elasticity Analysis',
                'Microeconomics',
                40,
                'Sketch shift diagrams and evaluate PED/PES impacts on total revenue and tax incidence.',
                isAdvanced ? 'Paper 2 Data Response' : 'Paper 2 Structured'
              ),
              makeLesson(
                'cam-econ',
                2,
                'Inflation, Unemployment & Monetary/Fiscal Policy',
                'Macroeconomics',
                45,
                'Evaluate AD/AS policy trade-offs and supply-side reforms for sustainable growth.',
                isAdvanced ? 'Paper 4 Essays' : 'Paper 2 Structured'
              ),
              makeLesson(
                'cam-econ',
                3,
                'Exchange Rates, Balance of Payments & Trade Blocs',
                'Global Economy',
                40,
                'Analyze comparative advantage, protectionism, and current account adjustments.',
                'CAIE Evaluation Marks'
              ),
            ],
          },
          {
            id: isAdvanced ? 'cam-al-acc' : 'cam-ig-acc',
            code: isAdvanced ? '9706' : '7707',
            name: isAdvanced ? 'Cambridge A Level Accounting' : 'Cambridge O Level / IGCSE Accounting',
            examBoardTag: isAdvanced ? 'CAIE A Level (9706)' : 'CAIE O Level (7707)',
            category: 'Track Major',
            description:
              'Double-entry bookkeeping, financial statements, ratio analysis, and cost/management accounting.',
            lessons: [
              makeLesson(
                'cam-acc',
                1,
                'Income Statements, Balance Sheets & Year-End Adjustments',
                'Financial Accounting',
                45,
                'Adjust accruals, prepayments, depreciation, and irrecoverable debts accurately.',
                'Paper 2 Structured'
              ),
              makeLesson(
                'cam-acc',
                2,
                'Liquidity, Profitability & Efficiency Ratios',
                'Ratio Interpretation',
                35,
                'Compute ROCE, current ratio, and inventory turnover to advise business stakeholders.',
                'Case Analysis'
              ),
              makeLesson(
                'cam-acc',
                3,
                'Break-Even Analysis & Cash Flow Budgeting',
                'Cost Accounting',
                40,
                'Prepare marginal costing statements and evaluate make-or-buy decisions.',
                isAdvanced ? 'Paper 3 Management' : 'Paper 2 Application'
              ),
            ],
          },
          {
            id: isAdvanced ? 'cam-al-bus' : 'cam-ig-bus',
            code: isAdvanced ? '9609' : '0450',
            name: isAdvanced ? 'Cambridge A Level Business' : 'Cambridge IGCSE Business Studies',
            examBoardTag: isAdvanced ? 'CAIE A Level (9609)' : 'CAIE IGCSE (0450)',
            category: 'Elective',
            description:
              'Enterprise strategy, marketing mix, operations efficiency, and case-study evaluation.',
            lessons: [
              makeLesson(
                'cam-bus',
                1,
                'Business Strategy, SWOT & Ansoff Matrix',
                'Strategy',
                35,
                'Apply strategic frameworks to real enterprise expansion scenarios.',
                'Paper 2 Case Study'
              ),
              makeLesson(
                'cam-bus',
                2,
                'Marketing Mix, Pricing & Product Life Cycle',
                'Marketing',
                35,
                'Justify promotion and distribution strategies for competitive markets.',
                'Paper 1 & Paper 2'
              ),
            ],
          },
        ]
      : [
          {
            id: isAdvanced ? 'edx-ial-bus' : 'edx-ig-bus',
            code: isAdvanced ? 'WBS11–14' : '4BS1',
            name: isAdvanced ? 'Pearson Edexcel IAL Business' : 'Pearson Edexcel International GCSE Business',
            examBoardTag: isAdvanced ? 'Edexcel IAL Business' : 'Edexcel Int. GCSE (4BS1)',
            category: 'Track Major',
            description:
              'Business activity, finance, marketing, and global strategy structured for Pearson context-based case exams.',
            lessons: [
              makeLesson(
                'edx-bus',
                1,
                'Market Research, Positioning & 4Ps Strategy',
                'Marketing & People',
                40,
                'Evaluate primary vs secondary research and link marketing tactics to case-study context.',
                isAdvanced ? 'Unit 1 (WBS11)' : 'Paper 1 Small Business'
              ),
              makeLesson(
                'edx-bus',
                2,
                'Cash Flow Forecasting, Break-Even & Sources of Finance',
                'Business Finance',
                45,
                'Diagnose cash shortfalls and recommend internal vs external financing options.',
                isAdvanced ? 'Unit 2 (WBS12)' : 'Paper 2 Large Business'
              ),
              makeLesson(
                'edx-bus',
                3,
                'Globalisation, Multinationals & Operations Quality',
                'Global Strategy',
                40,
                'Assess lean production, exchange-rate risk, and ethical supply chain decisions.',
                isAdvanced ? 'Unit 4 (WBS14)' : '12-Mark Evaluation'
              ),
            ],
          },
          {
            id: isAdvanced ? 'edx-ial-econ' : 'edx-ig-econ',
            code: isAdvanced ? 'WEC11–14' : '4EC1',
            name: isAdvanced ? 'Pearson Edexcel IAL Economics' : 'Pearson Edexcel International GCSE Economics',
            examBoardTag: isAdvanced ? 'Edexcel IAL Economics' : 'Edexcel Int. GCSE (4EC1)',
            category: 'Track Major',
            description:
              'Market failure, business economics, macroeconomic policy, and global trade aligned with Pearson mark schemes.',
            lessons: [
              makeLesson(
                'edx-econ',
                1,
                'Market Failure, Externalities & Government Intervention',
                'Microeconomics',
                40,
                'Analyze indirect taxes, subsidies, and minimum/maximum price diagrams.',
                isAdvanced ? 'Unit 1 (WEC11)' : 'Paper 1 Microeconomics'
              ),
              makeLesson(
                'edx-econ',
                2,
                'Aggregate Demand, Multiplier & Macroeconomic Objectives',
                'Macroeconomics',
                45,
                'Evaluate fiscal and monetary policy chains of reasoning with KAA + Evaluation.',
                isAdvanced ? 'Unit 2 (WEC12)' : 'Paper 2 Macroeconomics'
              ),
              makeLesson(
                'edx-econ',
                3,
                'Global Trade, Tariffs & Development Indicators',
                'Global Economy',
                40,
                'Compare HDI, Gini coefficient, and trade liberalisation effects on emerging economies.',
                isAdvanced ? 'Unit 4 (WEC14)' : 'Paper 2 Evaluation'
              ),
            ],
          },
          {
            id: isAdvanced ? 'edx-ial-acc' : 'edx-ig-acc',
            code: isAdvanced ? 'WAC11' : '4AC1',
            name: isAdvanced ? 'Pearson Edexcel IAL Accounting' : 'Pearson Edexcel International GCSE Accounting',
            examBoardTag: isAdvanced ? 'Edexcel IAL (WAC11)' : 'Edexcel Int. GCSE (4AC1)',
            category: 'Elective',
            description:
              'Control accounts, manufacturing accounts, and financial performance evaluation.',
            lessons: [
              makeLesson(
                'edx-acc',
                1,
                'Control Accounts, Suspense & Error Correction',
                'Accounting Systems',
                40,
                'Reconcile receivables/payables ledgers and journalize error corrections.',
                'Paper 1 Bookkeeping'
              ),
              makeLesson(
                'edx-acc',
                2,
                'Financial Statements of Sole Traders & Companies',
                'Financial Reporting',
                45,
                'Compile complete statements of profit/loss and financial position with notes.',
                'Paper 2 Statements'
              ),
            ],
          },
        ];

  const humanitiesSubjects: IntlStudentSubject[] = [
    {
      id: `${pathway}-hum-hist`,
      code: pathway === 'cambridge' ? (isAdvanced ? '9489' : '0470') : isAdvanced ? 'WHI01' : '4HI1',
      name: `${boardTag} Modern World History`,
      examBoardTag: boardTag,
      category: 'Track Major',
      description:
        'Source evaluation, causation essays, and twentieth-century international relations.',
      lessons: [
        makeLesson(
          `${pathway}-hist`,
          1,
          'Evaluating Primary Sources: Provenance & Utility',
          'Source Analysis',
          40,
          'Cross-reference historical sources and weigh reliability using historical context.',
          'Document Question'
        ),
        makeLesson(
          `${pathway}-hist`,
          2,
          'Interwar Diplomacy & Origins of Cold War Tensions',
          'International Relations',
          45,
          'Build sustained, balanced essays evaluating competing historical interpretations.',
          'Extended Essay'
        ),
      ],
    },
    {
      id: `${pathway}-hum-lit`,
      code: pathway === 'cambridge' ? (isAdvanced ? '9695' : '0475') : isAdvanced ? 'WET01' : '4ET1',
      name: `${boardTag} English Literature`,
      examBoardTag: boardTag,
      category: 'Track Major',
      description:
        'Close analysis of poetry, drama, and prose texts with critical contextual evaluation.',
      lessons: [
        makeLesson(
          `${pathway}-lit`,
          1,
          'Unseen Poetry: Form, Imagery & Voice Analysis',
          'Poetry',
          40,
          'Unpack meter, metaphor, and volta shifts to construct perceptive critical commentary.',
          'Unseen Paper'
        ),
        makeLesson(
          `${pathway}-lit`,
          2,
          'Drama & Prose Characterisation and Themes',
          'Set Texts',
          45,
          'Integrate dramatic methods and historical context seamlessly into essay paragraphs.',
          'Set Text Paper'
        ),
      ],
    },
    {
      id: `${pathway}-hum-gp`,
      code: pathway === 'cambridge' ? (isAdvanced ? '9239' : '0457') : '4GE1',
      name:
        pathway === 'cambridge'
          ? 'Cambridge Global Perspectives'
          : 'Pearson Edexcel Geography & Global Issues',
      examBoardTag: boardTag,
      category: 'Elective',
      description:
        'Critical inquiry, sustainability case studies, and evidence-backed argumentation.',
      lessons: [
        makeLesson(
          `${pathway}-gp`,
          1,
          'Evaluating Claims, Evidence & Counterarguments',
          'Critical Thinking',
          35,
          'Test reasoning flaws and synthesize global data into clear policy recommendations.',
          'Written Examination'
        ),
        makeLesson(
          `${pathway}-gp`,
          2,
          'Urbanisation, Climate Resilience & Development',
          'Global Case Studies',
          35,
          'Compare mitigation and adaptation strategies across developed and developing regions.',
          'Case Evaluation'
        ),
      ],
    },
  ];

  if (academicTrack === 'Science') {
    return [...coreSubjects, ...scienceSubjects];
  }
  if (academicTrack === 'Business') {
    return [...coreSubjects, ...businessSubjects];
  }
  if (academicTrack === 'Humanities') {
    return [...coreSubjects, ...humanitiesSubjects];
  }

  // Mixed / Custom track: combine core + cross-track flagship subjects
  return [
    ...coreSubjects,
    scienceSubjects[0],
    businessSubjects[0],
    humanitiesSubjects[1],
  ];
}

export const internationalStudentService = {
  validateIntlStudentCoupon(
    rawCode: string,
    pathway: InternationalPathway,
    now = Date.now()
  ): IntlStudentCouponValidationResult {
    const code = rawCode.trim().toUpperCase();
    const pathwayLabel = getIntlStudentPathwayLabel(pathway);

    if (!code) {
      return {
        ok: false,
        message: 'Please enter your Student coupon code (format: S-XXXXX).',
      };
    }

    if (code.startsWith('T-')) {
      return {
        ok: false,
        message:
          'This is a Teacher coupon (T-XXXXX). Student registration requires a Student coupon starting with S-.',
      };
    }

    if (!/^S-\d{5}$/.test(code)) {
      const sample = pathway === 'cambridge' ? 'S-61488' : 'S-82903';
      return {
        ok: false,
        message: `Invalid format. Enter a 5-digit Student coupon like ${sample}.`,
      };
    }

    const store = readSharedIntlAdminStore(now);
    const match = store.coupons.find((c) => c.code.toUpperCase() === code);

    if (!match) {
      return {
        ok: false,
        message: `Coupon ${code} was not found. Please check the code with your ${pathwayLabel} Admin.`,
      };
    }

    if (match.pathway !== pathway) {
      const ownerLabel = getIntlStudentPathwayLabel(match.pathway);
      return {
        ok: false,
        message: `Coupon ${code} belongs to ${ownerLabel}, not ${pathwayLabel}. Switch pathway above or enter a ${pathwayLabel} student coupon.`,
      };
    }

    if (match.role !== 'student') {
      return {
        ok: false,
        message: 'This coupon is not assigned to the Student role.',
      };
    }

    if (match.status === 'used') {
      return {
        ok: false,
        message: `Coupon ${code} has already been redeemed.`,
      };
    }

    if (match.status === 'expired' || match.expiresAt <= now) {
      return {
        ok: false,
        message: `Coupon ${code} has expired (48-hour window elapsed). Request a fresh coupon from your ${pathwayLabel} Admin.`,
      };
    }

    return {
      ok: true,
      coupon: match,
      message: `Valid ${pathwayLabel} student coupon verified.`,
    };
  },

  submitIntlStudentCouponRegistration(
    input: IntlStudentRegistrationInput,
    now = Date.now()
  ):
    | { ok: true; registration: InternationalPendingRegistration }
    | { ok: false; error: string } {
    const couponCheck = this.validateIntlStudentCoupon(input.couponCode, input.pathway, now);
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

    if (!isValidLevelForPathway(input.pathway, input.academicLevel)) {
      return {
        ok: false,
        error: `Please select a valid Academic Level for ${getIntlStudentPathwayLabel(input.pathway)}.`,
      };
    }

    const trackCheck = normalizeAcademicTrack(input.academicLevel, input.academicTrack);
    if (!trackCheck.ok) {
      return { ok: false, error: trackCheck.error };
    }

    const normalizedEmail = input.email.trim().toLowerCase();
    const store = readSharedIntlAdminStore(now);

    const existsInPending = store.pending.some(
      (p) => p.pathway === input.pathway && p.email.toLowerCase() === normalizedEmail
    );
    if (existsInPending) {
      return {
        ok: false,
        error: `An application for ${normalizedEmail} is already awaiting approval in ${getIntlStudentPathwayLabel(input.pathway)}.`,
      };
    }

    const existsInDirectory = store.profiles.some(
      (p) => p.pathway === input.pathway && p.email.toLowerCase() === normalizedEmail
    );
    if (existsInDirectory) {
      return {
        ok: false,
        error: `An account with ${normalizedEmail} already exists in ${getIntlStudentPathwayLabel(input.pathway)}. Try signing in instead.`,
      };
    }

    const registration: InternationalPendingRegistration = {
      id: `INTL-PND-${input.pathway.toUpperCase()}-S${now % 100000}`,
      role: 'student',
      pathway: input.pathway,
      fullName: input.fullName.trim(),
      email: normalizedEmail,
      academicLevel: input.academicLevel,
      academicTrack: trackCheck.track,
      couponCode: couponCheck.coupon.code,
      submittedAt: now,
      expiresAt: now + FORTY_EIGHT_HOURS_MS,
    };

    store.pending.unshift(registration);
    store.coupons = store.coupons.map((c) =>
      c.pathway === input.pathway && c.code.toUpperCase() === couponCheck.coupon!.code.toUpperCase()
        ? { ...c, status: 'used', usedAt: now }
        : c
    );
    store.activities.unshift({
      id: `INTL-ACT-${input.pathway.toUpperCase()}-${now}-${Math.floor(Math.random() * 1000)}`,
      pathway: input.pathway,
      category: 'approval',
      summary: `New ${getShortLevelLabel(registration.academicLevel)} (${registration.academicTrack}) student registration submitted by ${registration.fullName} (${registration.couponCode}).`,
      actorEmail: normalizedEmail,
      createdAt: now,
    });
    if (store.activities.length > 80) {
      store.activities = store.activities.slice(0, 80);
    }

    writeSharedIntlAdminStore(store);
    return { ok: true, registration };
  },

  /**
   * Synchronizes an active Cambridge/Edexcel student account into edura_multi_db_v1
   * so AuthContext.login() works seamlessly without touching authService.ts or NCTB data.
   */
  prepareIntlStudentAccountForLogin(
    rawEmail: string,
    rawPassword: string,
    pathway: InternationalPathway,
    now = Date.now()
  ): void {
    const email = rawEmail.trim().toLowerCase();
    if (!email) return;

    const store = readSharedIntlAdminStore(now);
    const preset = getDemoIntlStudentPreset(pathway);

    const directoryMatch = store.profiles.find(
      (p) => p.pathway === pathway && p.role === 'student' && p.email.toLowerCase() === email
    );

    if (directoryMatch && directoryMatch.status === 'suspended') {
      return;
    }

    const isPresetLogin = email === preset.email.toLowerCase();
    if (!directoryMatch && !isPresetLogin) {
      return;
    }

    const fullName = directoryMatch?.fullName ?? preset.fullName;
    const userId = directoryMatch?.id ?? `intl-student-${pathway}-demo`;
    const pathwaySubTrack = getInternationalPathwaySubTrack(pathway);

    const db = loadDatabase(now);
    const existingIdx = db.users.findIndex(
      (u) => u.role === 'student' && u.email.toLowerCase() === email
    );

    if (existingIdx === -1) {
      // Allow demo password ('Student@1234') for preset accounts OR verify against directory hash
      const passwordToStore =
        isPresetLogin && rawPassword === preset.password
          ? hashPassword(preset.password)
          : directoryMatch && verifyPassword(rawPassword, directoryMatch.passwordHash)
            ? directoryMatch.passwordHash
            : isPresetLogin
              ? hashPassword(preset.password)
              : directoryMatch?.passwordHash ?? hashPassword(preset.password);

      const account: UserAccount = {
        id: userId,
        role: 'student',
        fullName,
        email,
        passwordHash: passwordToStore,
        mustChangePassword: false,
        preferredLanguage: 'en',
        createdAt: directoryMatch?.joinedAt ?? now - 14 * 24 * 60 * 60 * 1000,
        educationStream: 'International Curriculum (English Medium)',
        pathway: pathwaySubTrack,
      };
      db.users.push(account);
      saveDatabase(db);
    }
  },

  resolveIntlStudentContext(
    session: AuthSession,
    profile?: Omit<UserAccount, 'passwordHash'> | null,
    now = Date.now()
  ): IntlStudentContext | null {
    if (session.role !== 'student') return null;

    const pathway =
      resolveInternationalPathway(session.selectedPathway) ??
      resolveInternationalPathway(profile?.pathway);
    if (!pathway) return null;

    const store = readSharedIntlAdminStore(now);
    const email = session.email.trim().toLowerCase();
    const match = store.profiles.find(
      (p) => p.pathway === pathway && p.role === 'student' && p.email.toLowerCase() === email
    );

    if (match) {
      return {
        userId: match.id,
        fullName: match.fullName,
        email: match.email,
        pathway: match.pathway,
        academicLevel: match.academicLevel,
        academicTrack: match.academicTrack,
        registrationType: match.registrationType,
        couponCode: match.couponCode,
        joinedAt: match.joinedAt,
      };
    }

    const preset = getDemoIntlStudentPreset(pathway);
    return {
      userId: session.userId,
      fullName: session.fullName || preset.fullName,
      email: session.email || preset.email,
      pathway,
      academicLevel: preset.academicLevel,
      academicTrack: preset.academicTrack,
      registrationType: 'coupon_auto',
      joinedAt: profile?.createdAt ?? session.loggedInAt,
    };
  },

  getCompletedLessonIds(userId: string, pathway: InternationalPathway): string[] {
    const map = loadProgressMap();
    return map[`${pathway}:${userId}`] ?? [];
  },

  toggleLessonCompleted(
    userId: string,
    pathway: InternationalPathway,
    lessonId: string
  ): string[] {
    const map = loadProgressMap();
    const key = `${pathway}:${userId}`;
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
    student: IntlStudentContext,
    filters: {
      query?: string;
      audience?: 'all' | 'student' | 'both';
      tag?: 'all' | InternationalNoticeTag;
    } = {},
    now = Date.now()
  ): InternationalNotice[] {
    const store = readSharedIntlAdminStore(now);
    const hour = 60 * 60 * 1000;

    // Baseline pathway-scoped student circulars (kept strictly inside student service
    // so internationalAdminService remains untouched while both pathways have rich notices)
    const baselineNotices: InternationalNotice[] = [
      {
        id: 'INTL-STU-CIRC-CAM-01',
        pathway: 'cambridge',
        title: 'Cambridge O Level / IGCSE Mock Past-Paper Clinic Schedule',
        description:
          'Timed Paper 2 and Paper 4 examiner-rubric workshops for Mathematics (0580), Physics (0625), and Economics (0455) begin Monday at 2:30 PM in the Academic Commons.',
        audience: 'student',
        academicLevel: 'O Level / IGCSE (Grades 9–10)',
        academicTrack: 'all',
        tag: 'Exam',
        createdAt: now - 18 * hour,
        updatedAt: now - 18 * hour,
      },
      {
        id: 'INTL-STU-CIRC-EDX-01',
        pathway: 'edexcel',
        title: 'Pearson Edexcel International GCSE & IAL Exam Timetable Release',
        description:
          'All Pearson Edexcel students should verify their registered paper tiers (Higher/Foundation) and unit codes with the Edexcel Coordinator before Friday 4:00 PM.',
        audience: 'both',
        academicLevel: 'all',
        academicTrack: 'all',
        tag: 'Exam',
        createdAt: now - 14 * hour,
        updatedAt: now - 14 * hour,
      },
      {
        id: 'INTL-STU-CIRC-EDX-02',
        pathway: 'edexcel',
        title: 'Edexcel International GCSE Business & Economics Case-Study Briefing',
        description:
          'Students in the Business track (4BS1 / 4EC1) are invited to a 12-mark evaluation technique clinic covering context-driven Pearson mark schemes this Wednesday.',
        audience: 'student',
        academicLevel: 'International GCSE (Grades 9–10)',
        academicTrack: 'Business',
        tag: 'General',
        createdAt: now - 22 * hour,
        updatedAt: now - 22 * hour,
      },
    ];

    const combined = [...store.notices, ...baselineNotices];
    const q = (filters.query ?? '').trim().toLowerCase();

    return combined
      .filter((n) => n.pathway === student.pathway)
      .filter((n) => n.audience === 'student' || n.audience === 'both')
      .filter((n) => n.academicLevel === 'all' || n.academicLevel === student.academicLevel)
      .filter((n) => {
        if (n.academicTrack === 'all') return true;
        return n.academicTrack === student.academicTrack;
      })
      .filter((n) => {
        if (filters.audience && filters.audience !== 'all' && n.audience !== filters.audience) {
          return false;
        }
        if (filters.tag && filters.tag !== 'all' && n.tag !== filters.tag) {
          return false;
        }
        if (q) {
          const hay = `${n.title} ${n.description} ${n.tag} ${n.academicLevel} ${n.academicTrack}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => b.createdAt - a.createdAt);
  },

  updateIntlStudentPassword(
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

    const store = readSharedIntlAdminStore(now);
    let updatedProfile = false;
    store.profiles = store.profiles.map((p) => {
      if (p.pathway === pathway && p.role === 'student' && p.email.toLowerCase() === normalizedEmail) {
        updatedProfile = true;
        return { ...p, passwordHash: nextHash, updatedAt: now };
      }
      return p;
    });
    if (updatedProfile) {
      writeSharedIntlAdminStore(store);
    }

    return { ok: true };
  },

  getLevelsForPathway,
};
