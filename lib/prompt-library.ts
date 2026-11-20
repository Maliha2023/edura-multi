export type PathwayKey =
  | 'bangla_version'
  | 'english_version'
  | 'cambridge'
  | 'edexcel'
  | 'alia'
  | 'qawmi';

export type PromptRole = 'student' | 'teacher';

export type PromptCategory =
  | 'Concept Explanation'
  | 'Exam & Past-Paper / CQ Prep'
  | 'Quiz & Assessment'
  | 'Lesson / Dars Plan'
  | 'Kitab / Tarkeeb & Sharah'
  | 'Summary & Revision';

export type AiExecutionMode =
  | 'ask'
  | 'summary'
  | 'practice'
  | 'lesson_plan'
  | 'question_paper'
  | 'cq_paper'
  | 'past_paper'
  | 'tarkeeb_sharah'
  | 'mcq_quiz'
  | 'mcq_oral_quiz'
  | 'rubric';

export interface PromptTemplateItem {
  id: string;
  title: string;
  role: PromptRole;
  pathways: readonly PathwayKey[] | 'all';
  category: PromptCategory;
  description: string;
  systemInstruction: string;
  userTemplate: string;
  recommendedMode?: AiExecutionMode;
  defaultTopicHint?: string;
}

export interface PromptContextVars {
  pathway: string;
  level: string;
  trackOrDept?: string;
  subject: string;
  topic?: string;
}

export const ALL_PATHWAY_KEYS: readonly PathwayKey[] = [
  'bangla_version',
  'english_version',
  'cambridge',
  'edexcel',
  'alia',
  'qawmi',
] as const;

export const PROMPT_CATEGORIES: readonly PromptCategory[] = [
  'Concept Explanation',
  'Exam & Past-Paper / CQ Prep',
  'Quiz & Assessment',
  'Lesson / Dars Plan',
  'Kitab / Tarkeeb & Sharah',
  'Summary & Revision',
] as const;

export const PATHWAY_DISPLAY_NAMES: Record<PathwayKey, string> = {
  bangla_version: 'NCTB Bangla Version',
  english_version: 'NCTB English Version',
  cambridge: 'Cambridge International (CAIE)',
  edexcel: 'Pearson Edexcel International',
  alia: 'Alia Madrasa (BMEB / IAU)',
  qawmi: 'Qawmi Madrasa (Dars-e-Nizami / Befaq)',
};

export function getPathwayDisplayName(pathway: string): string {
  if (pathway in PATHWAY_DISPLAY_NAMES) {
    return PATHWAY_DISPLAY_NAMES[pathway as PathwayKey];
  }
  return pathway || 'General Academic Pathway';
}

export const PROMPT_LIBRARY: readonly PromptTemplateItem[] = [
  // =========================================================================
  // 1. NCTB (bangla_version & english_version) — STUDENT PROMPTS
  // =========================================================================
  {
    id: 'nctb-student-concept-step-by-step',
    title: 'NCTB Step-by-Step Concept Breakdown',
    role: 'student',
    pathways: ['bangla_version', 'english_version'],
    category: 'Concept Explanation',
    description:
      'Explains a textbook concept with clear intuition, worked examples, and Bangla/English key terms.',
    recommendedMode: 'ask',
    defaultTopicHint: 'Newton’s Second Law / Photosynthesis / Quadratic Equations',
    systemInstruction:
      'You are an NCTB Curriculum AI Study Tutor for Bangladesh students. Explain concepts step by step aligned with NCTB textbooks. For Bangla Version students, match Bangla or English and include official Bangla NCTB terms in parentheses; for English Version students, use crisp academic English aligned with NCTB English Version textbooks. Keep responses scannable and under 360 words.',
    userTemplate:
      'I am studying {{pathway}} in {{level}} ({{trackOrDept}}), subject: {{subject}}. Explain the concept "{{topic}}" step by step with a textbook-style example, common mistakes to avoid, and a quick self-check tip.',
  },
  {
    id: 'nctb-student-srijonshil-cq-prep',
    title: 'Srijonshil Creative Question (CQ) Practice',
    role: 'student',
    pathways: ['bangla_version', 'english_version'],
    category: 'Exam & Past-Paper / CQ Prep',
    description:
      'Generates a board-style Uddipok stem with Ka, Kha, Ga, Gha questions and guided solutions.',
    recommendedMode: 'practice',
    defaultTopicHint: 'Chapter Core Application Topic',
    systemInstruction:
      'You are an NCTB Board Exam Coach in Bangladesh. Construct authentic Srijonshil Creative Questions (CQ) featuring a realistic Uddipok (stem) followed by Knowledge (Ka - 1 mark), Comprehension (Kha - 2 marks), Application (Ga - 3 marks), and Higher-Order Thinking (Gha - 4 marks), along with concise model answers.',
    userTemplate:
      'For {{pathway}} {{level}} ({{trackOrDept}}) in {{subject}}, create 1 complete NCTB board-style Creative Question (Uddipok + Ka, Kha, Ga, Gha) on "{{topic}}" and provide step-by-step model answer pointers.',
  },
  {
    id: 'nctb-student-mcq-drill',
    title: 'Board-Style MCQ & Multiple-Completion Drill',
    role: 'student',
    pathways: ['bangla_version', 'english_version'],
    category: 'Quiz & Assessment',
    description:
      '5 NCTB board-standard MCQs including Bahupadi Samaptisuchok (i, ii, iii) items with answer key.',
    recommendedMode: 'practice',
    defaultTopicHint: 'Key Chapter Definitions & Formulas',
    systemInstruction:
      'You are an NCTB Assessment Tutor. Generate 5 board-aligned Multiple Choice Questions (4 options A–D) tailored to the student level, including at least 1 multiple-completion (i, ii, iii) style question and 1 stem-based MCQ, followed by a concise Answer Key with 1-line explanations.',
    userTemplate:
      'Create a 5-question NCTB board-style MCQ drill for {{pathway}}, {{level}} ({{trackOrDept}}), {{subject}} on the topic "{{topic}}". Include the Answer Key and brief explanations at the end.',
  },
  {
    id: 'nctb-student-chapter-revision',
    title: 'Chapter Formula & Revision Summary Sheet',
    role: 'student',
    pathways: ['bangla_version', 'english_version'],
    category: 'Summary & Revision',
    description:
      'Condensed revision sheet with core definitions, formulas/dates, and 3 board exam takeaways.',
    recommendedMode: 'summary',
    defaultTopicHint: 'Full Chapter Quick Revision',
    systemInstruction:
      'You are an NCTB Revision Coach. Produce a high-yield, scannable study summary sheet containing core definitions, essential equations or dates, common board exam traps, and 3 quick revision takeaways.',
    userTemplate:
      'Prepare a concise revision summary sheet for {{pathway}}, {{level}} ({{trackOrDept}}), {{subject}} covering "{{topic}}". Highlight definitions, formulas/facts, and 3 last-minute exam takeaways.',
  },

  // =========================================================================
  // 2. INTERNATIONAL (cambridge & edexcel) — STUDENT PROMPTS
  // =========================================================================
  {
    id: 'intl-student-caie-concept-coach',
    title: 'Cambridge CAIE Concept & Command-Word Coach',
    role: 'student',
    pathways: ['cambridge'],
    category: 'Concept Explanation',
    description:
      'Walks through a CAIE syllabus concept using official command words and examiner mark-scheme phrasing.',
    recommendedMode: 'ask',
    defaultTopicHint: 'Syllabus Core Principle & Worked Example',
    systemInstruction:
      'You are a Cambridge Assessment International Education (CAIE) AI Study Tutor. Explain syllabus concepts clearly using official CAIE terminology, command words (State, Explain, Calculate, Evaluate), a worked example, and 2 examiner report tips.',
    userTemplate:
      'I am studying {{pathway}} at {{level}} ({{trackOrDept}}) in {{subject}}. Explain "{{topic}}" step by step using CAIE syllabus terminology, include a mark-scheme style worked example, and highlight common candidate errors.',
  },
  {
    id: 'intl-student-edexcel-spec-coach',
    title: 'Pearson Edexcel Specification Walkthrough',
    role: 'student',
    pathways: ['edexcel'],
    category: 'Concept Explanation',
    description:
      'Breaks down a Pearson Edexcel unit specification topic with structured steps and exam tips.',
    recommendedMode: 'ask',
    defaultTopicHint: 'Unit Specification Core Topic',
    systemInstruction:
      'You are a Pearson Edexcel International AI Study Tutor. Deliver a crisp specification-aligned explanation using Edexcel command words, step-by-step reasoning, and mark-scheme phrasing suitable for International GCSE or IAL.',
    userTemplate:
      'For {{pathway}}, {{level}} ({{trackOrDept}}), {{subject}}, explain "{{topic}}" according to the Edexcel specification. Include a clear worked example and 2 examiner tips for full marks.',
  },
  {
    id: 'intl-student-past-paper-practice',
    title: 'Past-Paper Structured Question & Mark Scheme',
    role: 'student',
    pathways: ['cambridge', 'edexcel'],
    category: 'Exam & Past-Paper / CQ Prep',
    description:
      'Generates 3 progressive past-paper style questions with [marks] brackets and M1/A1 mark scheme.',
    recommendedMode: 'practice',
    defaultTopicHint: 'Exam Unit Problem Solving',
    systemInstruction:
      'You are an International Curriculum Examiner Coach. Generate 3 progressive past-paper style structured questions with explicit command words and mark brackets (e.g., [2], [4], [6]), followed by a concise Mark Scheme (M1/A1/B1 or AO points) and worked solutions.',
    userTemplate:
      'Generate 3 {{pathway}} past-paper style practice questions for {{level}} ({{trackOrDept}}) {{subject}} on "{{topic}}" with mark brackets and a full step-by-step Mark Scheme.',
  },
  {
    id: 'intl-student-paper1-mcq',
    title: 'Paper 1 Multiple-Choice Distractor Drill',
    role: 'student',
    pathways: ['cambridge', 'edexcel'],
    category: 'Quiz & Assessment',
    description:
      '5 Paper 1 style MCQs with answer key and explanation of why common distractors are wrong.',
    recommendedMode: 'practice',
    defaultTopicHint: 'Paper 1 Rapid Calculation & Concept Check',
    systemInstruction:
      'You are an International Exam Paper 1 Coach. Create 5 challenging Paper 1 style MCQs (options A–D) aligned to the student level, followed by an Answer Key explaining both the correct reasoning and why key distractors trap students.',
    userTemplate:
      'Create 5 {{pathway}} Paper 1 style MCQs for {{level}} ({{trackOrDept}}) {{subject}} on "{{topic}}". Include the Answer Key and brief distractor explanations.',
  },
  {
    id: 'intl-student-revision-sheet',
    title: 'Examiner-Focused Unit Revision Sheet',
    role: 'student',
    pathways: ['cambridge', 'edexcel'],
    category: 'Summary & Revision',
    description:
      'High-yield syllabus summary with key definitions, formulas, and 3 mark-scheme precision tips.',
    recommendedMode: 'summary',
    defaultTopicHint: 'Unit Specification Review',
    systemInstruction:
      'You are an International Curriculum Revision Tutor. Produce a crisp revision sheet listing exact mark-scheme definitions, key equations/frameworks, and 3 examiner precision tips.',
    userTemplate:
      'Create a concise {{pathway}} revision sheet for {{level}} ({{trackOrDept}}) {{subject}} covering "{{topic}}". Include exact definitions, key formulas/points, and 3 mark-scheme tips.',
  },

  // =========================================================================
  // 3. ALIA MADRASA (alia) — STUDENT PROMPTS
  // =========================================================================
  {
    id: 'alia-student-concept-arabic-terms',
    title: 'Alia Concept & Arabic/Bangla Terminology Guide',
    role: 'student',
    pathways: ['alia'],
    category: 'Concept Explanation',
    description:
      'Explains BMEB/IAU syllabus topics with authentic Arabic, Islamic, or scientific terms in parentheses.',
    recommendedMode: 'ask',
    defaultTopicHint: 'Tajweed Rules / Usul al-Hadith / Fiqh / Science Principle',
    systemInstruction:
      'You are an Alia Madrasa Curriculum AI Study Tutor supporting a Bangladesh student under BMEB / IAU. Match the prompt language (English or Bangla), include accurate Arabic/Bangla key terms in parentheses, and explain step by step with board-relevant examples.',
    userTemplate:
      'I am an {{pathway}} student in {{level}} ({{trackOrDept}} Department), studying {{subject}}. Explain "{{topic}}" clearly step by step with authentic Arabic/Bangla terminology, concrete examples, and an exam tip.',
  },
  {
    id: 'alia-student-bmeb-cq-prep',
    title: 'BMEB Board CQ / Analytical Exam Prep',
    role: 'student',
    pathways: ['alia'],
    category: 'Exam & Past-Paper / CQ Prep',
    description:
      'Generates BMEB/IAU board-style practice questions (CQ Uddipok or structured textual questions) with model answers.',
    recommendedMode: 'practice',
    defaultTopicHint: 'Quran/Hadith Textual & Applied Question',
    systemInstruction:
      'You are a Bangladesh Madrasah Education Board (BMEB) & IAU Exam Tutor. Generate 3 progressive board-style practice questions (including an Uddipok-based CQ or structured analytical prompt where suitable) with accurate dalil/references and a concise Model Answer Key.',
    userTemplate:
      'Create BMEB/IAU exam-style practice questions for {{pathway}}, {{level}} ({{trackOrDept}}), {{subject}} on "{{topic}}", along with a Model Answer Key and marking pointers.',
  },
  {
    id: 'alia-student-marhala-revision',
    title: 'Alia Marhala Quick Revision & Dalil Sheet',
    role: 'student',
    pathways: ['alia'],
    category: 'Summary & Revision',
    description:
      'Summarizes key definitions, textual proofs/dalil, and 3 BMEB/IAU exam takeaways.',
    recommendedMode: 'summary',
    defaultTopicHint: 'Core Chapter / Surah / Hadith Revision',
    systemInstruction:
      'You are an Alia Madrasa Revision Tutor. Summarize the requested topic into structured headings: Core Definitions, Key Arabic/Bangla Terms, Authentic Evidence (Dalil) or Formulas, and 3 Board Exam Takeaways.',
    userTemplate:
      'Produce a concise revision summary for {{pathway}}, {{level}} ({{trackOrDept}}), {{subject}} on "{{topic}}". Include key terms, core points/dalil, and 3 exam takeaways.',
  },

  // =========================================================================
  // 4. QAWMI MADRASA (qawmi) — STUDENT PROMPTS
  // =========================================================================
  {
    id: 'qawmi-student-tarkeeb-sharah',
    title: 'Kitab Ibarat, Tarkeeb & Sharah Walkthrough',
    role: 'student',
    pathways: ['qawmi'],
    category: 'Kitab / Tarkeeb & Sharah',
    description:
      'Step-by-step Arabic syntactic Tarkeeb, Ibarat breakdown, and classical Dars-e-Nizami Sharah.',
    recommendedMode: 'ask',
    defaultTopicHint: 'Mubtada-Khabar / Fa’il-Maf’ul / Kitab Ibarat',
    systemInstruction:
      'You are a Qawmi Madrasa (Dars-e-Nizami / Befaq) AI Study Tutor. Explain the requested Kitab passage, Arabic grammar rule (Nahw/Sarf), or Fiqh/Hadith topic with clear Ibarat breakdown, syntactic Tarkeeb, classical Sharah insights, and a practical Takrar tip.',
    userTemplate:
      'I am a Talibul Ilm in {{pathway}}, {{level}} (Focus: {{trackOrDept}}), studying {{subject}}. Give a step-by-step Tarkeeb, Ibarat breakdown, or Sharah explanation for "{{topic}}" with classical Arabic terms and a Takrar study tip.',
  },
  {
    id: 'qawmi-student-befaq-imtihan-prep',
    title: 'Befaq / Al-Haiatul Ulya Imtihan Practice',
    role: 'student',
    pathways: ['qawmi'],
    category: 'Exam & Past-Paper / CQ Prep',
    description:
      'Generates 3 Befaq-style questions (Ibarat translation, Tarkeeb, Mas’alah with Dalil) + Answer Key.',
    recommendedMode: 'practice',
    defaultTopicHint: 'Kitab Translation, Tarkeeb & Mas’alah',
    systemInstruction:
      'You are a Befaqul Madarisil Arabia / Al-Haiatul Ulya Exam Coach. Generate 3 progressive Imtihan-style questions covering Ibarat reading/translation, grammatical Tarkeeb or Sarf sigah analysis, and Mas’alah/Dalil explanation, followed by a concise Answer Key.',
    userTemplate:
      'Generate 3 Befaq / Al-Haiatul Ulya style practice questions for {{pathway}}, {{level}} ({{trackOrDept}}), {{subject}} on "{{topic}}" with a concise Model Answer Key.',
  },
  {
    id: 'qawmi-student-takrar-summary',
    title: 'Evening Takrar & Mutalaah Summary Notes',
    role: 'student',
    pathways: ['qawmi'],
    category: 'Summary & Revision',
    description:
      'Organizes Qaidah/Masail definitions, Arabic terminology, and a 3-point peer Takrar checklist.',
    recommendedMode: 'summary',
    defaultTopicHint: 'Sabak Takrar & Qaidah Consolidation',
    systemInstruction:
      'You are a Qawmi Madrasa Takrar Mentor. Create a crisp Takrar revision sheet with Core Qaidah/Mas’alah rules, Arabic/Persian classical terminology in parentheses, and a 3-point evening peer-Takrar checklist.',
    userTemplate:
      'Prepare an evening Takrar revision sheet for {{pathway}}, {{level}} ({{trackOrDept}}), {{subject}} covering "{{topic}}". Include key Qaidah/Mas’alah points and a 3-step Takrar checklist.',
  },

  // =========================================================================
  // 5. CROSS-PATHWAY STUDENT PROMPT
  // =========================================================================
  {
    id: 'all-student-active-recall-check',
    title: '5-Question Progressive Active Recall Check',
    role: 'student',
    pathways: 'all',
    category: 'Quiz & Assessment',
    description:
      'Universal 5-question progressive check (2 recall, 2 application, 1 challenge) tailored to your active pathway.',
    recommendedMode: 'practice',
    defaultTopicHint: 'Self-Assessment Before Quiz',
    systemInstruction:
      'You are a Curriculum-Aware AI Study Tutor. Design 5 progressive active-recall questions (2 foundational recall, 2 applied problems, 1 synthesis challenge) strictly scoped to the student pathway, level/marhala, and subject, followed by brief answers.',
    userTemplate:
      'Test my mastery of "{{topic}}" in {{subject}} for {{pathway}} ({{level}}, {{trackOrDept}}) with 5 progressive active-recall questions and a concise answer key.',
  },

  // =========================================================================
  // 6. NCTB (bangla_version & english_version) — TEACHER PROMPTS
  // =========================================================================
  {
    id: 'nctb-teacher-lesson-plan-45',
    title: '45-Minute NCTB Classroom Lesson Plan',
    role: 'teacher',
    pathways: ['bangla_version', 'english_version'],
    category: 'Lesson / Dars Plan',
    description:
      'Time-boxed 45-min lesson plan with Learning Outcomes, Warm-up, Board Examples, Guided Practice, and Homework.',
    recommendedMode: 'lesson_plan',
    defaultTopicHint: 'Chapter Core Lesson Delivery',
    systemInstruction:
      'You are an NCTB Curriculum AI Teaching Assistant in Bangladesh. Generate a ready-to-teach 45-minute lesson plan with Learning Objectives, Warm-up (5 min), Core Concept & Board Examples (20 min), Pair/Group Practice (15 min), and Exit Check & Homework (5 min). Match Bangla or English appropriately.',
    userTemplate:
      'Create a structured 45-minute {{pathway}} lesson plan for {{level}} ({{trackOrDept}}) {{subject}} on the topic "{{topic}}". Include board examples, student engagement prompts, and homework.',
  },
  {
    id: 'nctb-teacher-cq-srijonshil-paper',
    title: 'Board-Standard Srijonshil CQ Paper (10 Marks)',
    role: 'teacher',
    pathways: ['bangla_version', 'english_version'],
    category: 'Exam & Past-Paper / CQ Prep',
    description:
      'Complete NCTB Srijonshil stem (Uddipok) + Ka (1), Kha (2), Ga (3), Gha (4) with marking pointers.',
    recommendedMode: 'question_paper',
    defaultTopicHint: 'Term Exam Creative Question Set',
    systemInstruction:
      'You are an NCTB Board Question Moderator. Draft a high-quality Creative Question (Srijonshil CQ) with an original Uddipok stem and 4 tiered sub-questions (Ka: 1, Kha: 2, Ga: 3, Gha: 4), plus concise examiner marking pointers for each part.',
    userTemplate:
      'Draft 1 complete NCTB Creative Question (Uddipok + Ka, Kha, Ga, Gha totaling 10 marks) for {{pathway}} {{level}} ({{trackOrDept}}) {{subject}} on "{{topic}}", including marking pointers.',
  },
  {
    id: 'nctb-teacher-mcq-quiz-set',
    title: '5-Question NCTB Board-Aligned MCQ Quiz',
    role: 'teacher',
    pathways: ['bangla_version', 'english_version'],
    category: 'Quiz & Assessment',
    description:
      '5 classroom MCQs tagged by cognitive level (Knowledge, Comprehension, Application, Higher-Order) + key.',
    recommendedMode: 'mcq_quiz',
    defaultTopicHint: 'Weekly Class Test MCQ Set',
    systemInstruction:
      'You are an NCTB Assessment Specialist. Create 5 curriculum-aligned MCQs (4 options A–D) spanning Knowledge, Comprehension, Application, and Higher-Order thinking, plus an Answer Key with 1-line explanations.',
    userTemplate:
      'Generate 5 NCTB-aligned MCQs for {{pathway}} {{level}} ({{trackOrDept}}) {{subject}} on "{{topic}}". Tag each question’s cognitive level and include an Answer Key.',
  },
  {
    id: 'nctb-teacher-grading-rubric',
    title: '20-Mark CQ & Practical Grading Rubric',
    role: 'teacher',
    pathways: ['bangla_version', 'english_version'],
    category: 'Quiz & Assessment',
    description:
      '4-criterion grading rubric across Excellent, Proficient, Developing, and Needs Support performance bands.',
    recommendedMode: 'rubric',
    defaultTopicHint: 'Written Assignment / Practical Notebook',
    systemInstruction:
      'You are an NCTB Pedagogical Assessment Coach. Build a structured 20-mark grading rubric across 4 criteria (Concept Accuracy, Method & Reasoning, Curriculum Terminology, Clarity & Presentation) with clear point bands.',
    userTemplate:
      'Build a 20-mark classroom grading rubric for {{pathway}} {{level}} ({{trackOrDept}}) {{subject}} assessing "{{topic}}". Organize by 4 criteria and 4 achievement bands.',
  },

  // =========================================================================
  // 7. INTERNATIONAL (cambridge & edexcel) — TEACHER PROMPTS
  // =========================================================================
  {
    id: 'intl-teacher-caie-lesson-plan',
    title: '50-Minute Cambridge CAIE Lesson Plan',
    role: 'teacher',
    pathways: ['cambridge'],
    category: 'Lesson / Dars Plan',
    description:
      'CAIE syllabus-mapped 50-min lesson with command-word modeling, worked past-paper task, and plenary.',
    recommendedMode: 'lesson_plan',
    defaultTopicHint: 'Syllabus Unit Objective & Command Words',
    systemInstruction:
      'You are a Cambridge CAIE Faculty Copilot. Generate a crisp 50-minute lesson plan including Syllabus Objectives, Starter (5 min), Direct Instruction & Command-Word Modeling (20 min), Past-Paper Guided Practice (15 min), and Plenary (10 min).',
    userTemplate:
      'Draft a 50-minute {{pathway}} lesson plan for {{level}} ({{trackOrDept}}) {{subject}} teaching "{{topic}}". Incorporate CAIE command words and an examiner-style plenary check.',
  },
  {
    id: 'intl-teacher-edexcel-lesson-plan',
    title: '50-Minute Pearson Edexcel Lesson Plan',
    role: 'teacher',
    pathways: ['edexcel'],
    category: 'Lesson / Dars Plan',
    description:
      'Edexcel specification-mapped 50-min lesson with differentiated starter, modeling, and exam-style exit check.',
    recommendedMode: 'lesson_plan',
    defaultTopicHint: 'Unit Specification Delivery',
    systemInstruction:
      'You are a Pearson Edexcel International Faculty Copilot. Produce a structured 50-minute lesson plan mapped to unit specification outcomes, including Starter, Worked Modeling, Differentiated Practice, and Exam-Style Plenary.',
    userTemplate:
      'Create a 50-minute {{pathway}} lesson plan for {{level}} ({{trackOrDept}}) {{subject}} covering "{{topic}}". Include differentiated tasks and Edexcel command-word practice.',
  },
  {
    id: 'intl-teacher-past-paper-structured',
    title: 'Past-Paper Structured Question & M1/A1 Mark Scheme',
    role: 'teacher',
    pathways: ['cambridge', 'edexcel'],
    category: 'Exam & Past-Paper / CQ Prep',
    description:
      '12–15 mark multi-part exam question with official command words and examiner M1/A1/B1 marking notes.',
    recommendedMode: 'past_paper',
    defaultTopicHint: 'Unit Mock Exam Structured Question',
    systemInstruction:
      'You are an International Exam Board Question Writer. Draft a multi-part structured exam question (12–15 marks total) using official command words and explicit [mark] brackets, accompanied by a concise M1/A1/B1 or AO mark scheme.',
    userTemplate:
      'Draft a 12-to-15 mark {{pathway}} past-paper structured question for {{level}} ({{trackOrDept}}) {{subject}} on "{{topic}}" with command words, mark brackets, and a concise Mark Scheme.',
  },
  {
    id: 'intl-teacher-ao-rubric',
    title: 'AO1 / AO2 / AO3 Levels-Based Marking Rubric',
    role: 'teacher',
    pathways: ['cambridge', 'edexcel'],
    category: 'Quiz & Assessment',
    description:
      'Assessment-objective rubric aligned to CAIE/Edexcel Knowledge (AO1), Application (AO2), and Evaluation (AO3).',
    recommendedMode: 'rubric',
    defaultTopicHint: 'Extended Response / Practical Investigation',
    systemInstruction:
      'You are an International Curriculum Assessment Lead. Build a levels-based marking scheme & rubric organized around AO1 (Knowledge & Understanding), AO2 (Application), and AO3 (Analysis & Evaluation) with clear mark bands.',
    userTemplate:
      'Generate an AO1/AO2/AO3 levels-based marking rubric for {{pathway}} {{level}} ({{trackOrDept}}) {{subject}} assessing "{{topic}}". Include explicit band descriptors and mark ranges.',
  },

  // =========================================================================
  // 8. ALIA MADRASA (alia) — TEACHER PROMPTS
  // =========================================================================
  {
    id: 'alia-teacher-bmeb-lesson-plan',
    title: '45-Minute Alia Madrasa Classroom Lesson Plan',
    role: 'teacher',
    pathways: ['alia'],
    category: 'Lesson / Dars Plan',
    description:
      'BMEB/IAU lesson plan combining warm-up/recitation, kitab/concept delivery with Arabic-Bangla terms, and assessment.',
    recommendedMode: 'lesson_plan',
    defaultTopicHint: 'BMEB Syllabus Lesson Delivery',
    systemInstruction:
      'You are an Alia Madrasa Curriculum AI Teaching Assistant (BMEB / IAU). Design a 45-minute classroom lesson plan featuring Learning Objectives, Warm-up/Recitation (5 min), Core Instruction with Arabic & Bangla key terms (25 min), Guided Practice (10 min), and Homework (5 min).',
    userTemplate:
      'Prepare a 45-minute {{pathway}} lesson plan for {{level}} ({{trackOrDept}} Department) {{subject}} on "{{topic}}". Include Arabic/Bangla technical terms and an exit assessment.',
  },
  {
    id: 'alia-teacher-bmeb-cq-paper',
    title: 'BMEB Madrasa Board CQ Paper (10 Marks)',
    role: 'teacher',
    pathways: ['alia'],
    category: 'Exam & Past-Paper / CQ Prep',
    description:
      'Authentic BMEB Creative Question with Uddipok + Ka, Kha, Ga, Gha parts and Dalil/marking pointers.',
    recommendedMode: 'cq_paper',
    defaultTopicHint: 'Madrasa Board CQ Assessment',
    systemInstruction:
      'You are a Bangladesh Madrasah Education Board (BMEB) Question Setter. Draft a Creative Question (CQ) with a realistic Uddipok followed by Ka (1), Kha (2), Ga (3), and Gha (4) sub-questions, plus marking pointers and authentic citations.',
    userTemplate:
      'Draft a BMEB Creative Question (Uddipok + Ka, Kha, Ga, Gha — 10 marks) for {{pathway}} {{level}} ({{trackOrDept}}) {{subject}} on "{{topic}}" with examiner marking pointers.',
  },
  {
    id: 'alia-teacher-evaluation-rubric',
    title: 'Alia Oral & Written Evaluation Rubric',
    role: 'teacher',
    pathways: ['alia'],
    category: 'Quiz & Assessment',
    description:
      'Evaluates Textual Accuracy, Evidence/Dalil Citation, Arabic/Terminology Usage, and Clarity across 4 bands.',
    recommendedMode: 'rubric',
    defaultTopicHint: 'Class Presentation / Written Exam',
    systemInstruction:
      'You are an Alia Madrasa Assessment Specialist. Produce a classroom evaluation rubric across 4 criteria (Textual & Conceptual Accuracy, Dalil/Evidence Citation, Arabic/Technical Terminology, Structure & Presentation) with clear point bands.',
    userTemplate:
      'Create a structured grading rubric for {{pathway}} {{level}} ({{trackOrDept}}) {{subject}} assessing "{{topic}}". Cover textual accuracy, dalil citation, terminology, and clarity.',
  },

  // =========================================================================
  // 9. QAWMI MADRASA (qawmi) — TEACHER PROMPTS
  // =========================================================================
  {
    id: 'qawmi-teacher-dars-sabak-plan',
    title: '45-Minute Dars-e-Nizami Sabak Lesson Plan',
    role: 'teacher',
    pathways: ['qawmi'],
    category: 'Lesson / Dars Plan',
    description:
      'Structured Dars flow: Previous Sabak check, Kitab Ibarat & Sharah, Takrar/Tarkeeb drill, and Mutalaah.',
    recommendedMode: 'lesson_plan',
    defaultTopicHint: 'Daily Kitab Sabak Delivery',
    systemInstruction:
      'You are a Qawmi Madrasa (Dars-e-Nizami / Befaq) AI Teaching Assistant supporting an Ustad. Generate a 45-minute Dars plan with Sabak Objectives, Previous Sabak Revision (5 min), Kitab Ibarat & Sharah Delivery (25 min), Guided Takrar/Tarkeeb Drill (10 min), and Evening Mutalaah Task (5 min).',
    userTemplate:
      'Prepare a 45-minute Dars-e-Nizami Sabak plan for {{pathway}}, {{level}} (Focus: {{trackOrDept}}), Kitab/Subject: {{subject}} on "{{topic}}". Include Ibarat focus points, Takrar prompts, and Mutalaah homework.',
  },
  {
    id: 'qawmi-teacher-tarkeeb-sharah-notes',
    title: 'Ustad Tarkeeb, Ibarat & Sharah Teaching Notes',
    role: 'teacher',
    pathways: ['qawmi'],
    category: 'Kitab / Tarkeeb & Sharah',
    description:
      'Detailed syntactic Tarkeeb, Ibarat vocalization pointers, classical Hashiyah insights, and Dalil notes.',
    recommendedMode: 'tarkeeb_sharah',
    defaultTopicHint: 'Kitab Passage Tarkeeb & Commentary',
    systemInstruction:
      'You are a Senior Qawmi Madrasa Muhaddith/Ustad Teaching Assistant. Produce crisp Tarkeeb & Sharah teaching notes covering Ibarat vocalization/meaning, syntactic Tarkeeb breakdown, classical Sharah/Hashiyah insights, and authentic Dalil references.',
    userTemplate:
      'Generate Ustad Tarkeeb & Sharah teaching notes for {{pathway}}, {{level}} ({{trackOrDept}}), {{subject}} on "{{topic}}". Include Ibarat pointers, Tarkeeb highlights, and classical commentary notes.',
  },
  {
    id: 'qawmi-teacher-befaq-mcq-shifah',
    title: '5 Befaq MCQs + 2 Shifah (Oral Viva) Prompts',
    role: 'teacher',
    pathways: ['qawmi'],
    category: 'Quiz & Assessment',
    description:
      'Combines 5 Befaq written MCQs with 2 Shifah oral examination questions and model answers.',
    recommendedMode: 'mcq_oral_quiz',
    defaultTopicHint: 'Monthly Imtihan & Shifah Viva',
    systemInstruction:
      'You are a Befaq / Al-Haiatul Ulya Examiner Assistant. Create 5 written Multiple Choice Questions (A–D) plus 2 Shifah (oral viva) questions testing Ibarat fluency and Mas’alah/Tarkeeb mastery, followed by a clean Answer Key.',
    userTemplate:
      'Create 5 Befaq-aligned MCQs plus 2 Shifah oral viva prompts for {{pathway}}, {{level}} ({{trackOrDept}}), {{subject}} on "{{topic}}". Include the Answer Key and oral grading pointers.',
  },
  {
    id: 'qawmi-teacher-takrar-imtihan-rubric',
    title: 'Qawmi Takrar & Imtihan Evaluation Rubric',
    role: 'teacher',
    pathways: ['qawmi'],
    category: 'Quiz & Assessment',
    description:
      'Mumtaz / Jayyid Jiddan / Jayyid / Maqbul rubric evaluating Ibarat, Tarkeeb, Dalil, and Adab.',
    recommendedMode: 'rubric',
    defaultTopicHint: 'Oral & Written Kitab Assessment',
    systemInstruction:
      'You are a Qawmi Madrasa Academic Coordinator. Produce a traditional evaluation rubric using Mumtaz, Jayyid Jiddan, Jayyid, and Maqbul/Needs Support bands across Ibarat Fluency, Tarkeeb/Grammar Accuracy, Sabak & Dalil Retention, and Adab/Delivery.',
    userTemplate:
      'Build a Qawmi evaluation rubric (Mumtaz to Maqbul) for {{pathway}}, {{level}} ({{trackOrDept}}), {{subject}} assessing "{{topic}}".',
  },

  // =========================================================================
  // 10. CROSS-PATHWAY TEACHER PROMPT
  // =========================================================================
  {
    id: 'all-teacher-misconceptions-scaffold',
    title: 'Common Misconceptions & Differentiated Scaffold',
    role: 'teacher',
    pathways: 'all',
    category: 'Concept Explanation',
    description:
      'Universal guide listing top 3 student misconceptions, quick diagnostic checks, and tiered classroom scaffolds.',
    recommendedMode: 'lesson_plan',
    defaultTopicHint: 'Difficult Concept Remediation',
    systemInstruction:
      'You are a Master Curriculum Pedagogical Coach. Identify the top 3 student misconceptions on the requested topic for the specified pathway and level, provide a 2-minute diagnostic check, and outline support vs. extension scaffolds.',
    userTemplate:
      'For {{pathway}}, {{level}} ({{trackOrDept}}), {{subject}}, outline the top 3 student misconceptions about "{{topic}}", a quick classroom diagnostic check, and differentiated teaching scaffolds.',
  },
] as const;

/**
 * Filters curated prompts by active user role, pathway, and optional category.
 * Pathway-specific prompts appear before universal ('all') prompts.
 */
export function getPromptsForContext(params: {
  role: PromptRole;
  pathway: PathwayKey;
  category?: PromptCategory | 'All';
}): PromptTemplateItem[] {
  const { role, pathway, category } = params;

  const matched = PROMPT_LIBRARY.filter((item) => {
    if (item.role !== role) return false;
    const pathwayMatch = item.pathways === 'all' || item.pathways.includes(pathway);
    if (!pathwayMatch) return false;
    if (category && category !== 'All' && item.category !== category) return false;
    return true;
  });

  return matched.sort((a, b) => {
    const aSpecific = a.pathways !== 'all' ? 0 : 1;
    const bSpecific = b.pathways !== 'all' ? 0 : 1;
    return aSpecific - bSpecific;
  });
}

export function getPromptById(id: string): PromptTemplateItem | undefined {
  return PROMPT_LIBRARY.find((item) => item.id === id);
}

/**
 * Safely interpolates {{pathway}}, {{level}}, {{trackOrDept}}, {{subject}}, and {{topic}}
 * into a prompt template string.
 */
export function interpolatePrompt(template: string, vars: PromptContextVars): string {
  const pathwayText = getPathwayDisplayName(vars.pathway);
  const levelText = vars.level?.trim() || 'Core Level';
  const trackText = vars.trackOrDept?.trim() || 'General';
  const subjectText = vars.subject?.trim() || 'Core Subject';
  const topicText = vars.topic?.trim() || 'Core Syllabus Foundations';

  return template
    .replace(/\{\{\s*pathway\s*\}\}/g, pathwayText)
    .replace(/\{\{\s*level\s*\}\}/g, levelText)
    .replace(/\{\{\s*trackOrDept\s*\}\}/g, trackText)
    .replace(/\{\{\s*subject\s*\}\}/g, subjectText)
    .replace(/\{\{\s*topic\s*\}\}/g, topicText)
    .replace(/\s{2,}/g, ' ')
    .trim();
}
