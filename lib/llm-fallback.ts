import {
  getPathwayDisplayName,
  type AiExecutionMode,
  type PathwayKey,
  type PromptRole,
} from './prompt-library';

export interface FallbackBuildInput {
  role: PromptRole;
  pathway: PathwayKey | string;
  level?: string;
  trackOrDept?: string | null;
  subject?: string;
  mode?: AiExecutionMode | string;
  prompt: string;
  reason?: string;
}

function normalizePathwayKey(raw: string): PathwayKey {
  switch (raw) {
    case 'bangla_version':
    case 'english_version':
    case 'cambridge':
    case 'edexcel':
    case 'alia':
    case 'qawmi':
      return raw;
    default:
      return 'bangla_version';
  }
}

function extractFocusTopic(prompt: string, subject: string): string {
  const quoted = prompt.match(/"([^"]{3,80})"/);
  if (quoted?.[1]) return quoted[1].trim();
  const cleaned = prompt
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 72);
  return cleaned.length > 0 ? cleaned : `Core ${subject} Unit`;
}

export function buildFallbackAiResponse(input: FallbackBuildInput): string {
  const pathwayKey = normalizePathwayKey(input.pathway);
  const pathwayName = getPathwayDisplayName(pathwayKey);
  const level = input.level?.trim() || 'Core Level';
  const track = input.trackOrDept?.trim() || 'General';
  const subject = input.subject?.trim() || 'Core Subject';
  const mode = (input.mode || (input.role === 'teacher' ? 'lesson_plan' : 'ask')).toLowerCase();
  const topic = extractFocusTopic(input.prompt, subject);

  const scopeHeader = `**${pathwayName}** · ${level}${track ? ` (${track})` : ''} · **${subject}**`;

  if (input.role === 'teacher') {
    if (mode === 'question_paper' || mode === 'cq_paper') {
      return [
        `${scopeHeader}`,
        `### Board-Style Creative Question (CQ / Srijonshil) — ${topic}`,
        '',
        '**Uddipok (Stem):**',
        `During a classroom demonstration in ${subject} (${level}), students observe a practical scenario illustrating "${topic}". Two learners record contrasting observations and debate which underlying principle governs the outcome.`,
        '',
        '**Questions (10 Marks):**',
        '- **Ka (Knowledge — 1 Mark):** Define the primary term or principle associated with this scenario.',
        '- **Kha (Comprehension — 2 Marks):** Explain why the observed principle behaves differently under altered initial conditions.',
        '- **Ga (Application — 3 Marks):** Apply the core rule or method from your textbook to solve/analyze the first learner’s observation step by step.',
        '- **Gha (Higher-Order Thinking — 4 Marks):** Evaluate both learners’ arguments with evidence and justify the scientifically/textually accurate conclusion.',
        '',
        '**Examiner Marking Pointers:**',
        '- Award 1 mark for exact textbook definition; 2 marks for cause-and-effect clarity.',
        '- Award 3 marks for correct formula/dalil selection, substitution/citation, and final statement.',
        '- Award 4 marks for comparative reasoning backed by curriculum terminology.',
        '',
        '_Demo Fallback Mode: Structured curriculum preview generated locally while live Gemini API is unconfigured or rate-limited._',
      ].join('\n');
    }

    if (mode === 'past_paper') {
      return [
        `${scopeHeader}`,
        `### Past-Paper Structured Question (12 Marks) — ${topic}`,
        '',
        `**Question 1** _(Focus: ${subject})_`,
        `1. **(a) State** two defining characteristics of ${topic}. **[2]**`,
        `2. **(b) Explain** how changing the primary variable affects the system or argument in ${subject}. **[3]**`,
        `3. **(c) Calculate / Analyse** the intermediate outcome for a standard ${level} case study and show all working. **[4]**`,
        `4. **(d) Evaluate** one limitation of the standard model when applied in real-world contexts. **[3]**`,
        '',
        '**Mark Scheme Summary:**',
        '- **(a)** 1 mark per accurate specification definition (**B1 + B1**).',
        '- **(b)** **M1** for identifying causal factor; **A2** for clear linked explanation.',
        '- **(c)** **M1** correct method/formula; **M1** substitution; **A2** accurate result with units/justification.',
        '- **(d)** **AO3** valid contextual limitation supported by reasoning (**3 marks**).',
        '',
        '_Demo Fallback Mode: Structured curriculum preview generated locally while live Gemini API is unconfigured or rate-limited._',
      ].join('\n');
    }

    if (mode === 'tarkeeb_sharah') {
      return [
        `${scopeHeader}`,
        `### Ustad Tarkeeb, Ibarat & Sharah Notes — ${topic}`,
        '',
        '**1. Ibarat & Vocalization Focus:**',
        `- Emphasize accurate I’rab on key nouns and verbs within the ${subject} passage.`,
        '- Clarify classical Arabic/Persian technical expressions before reading the Sharah.',
        '',
        '**2. Syntactic Tarkeeb Breakdown:**',
        '- Identify the **Musnad Ilayhi** (Mubtada / Fa’il) and **Musnad** (Khabar / Fi’l) first.',
        '- Trace **Muta’alliq** links (Jar-Majrur) and **Sifah-Mawsuf** / **Mudaf-Mudaf Ilayhi** chains.',
        '',
        '**3. Sharah & Dalil Pointers:**',
        `- Connect the primary Qaidah/Mas’alah in ${subject} to classical Hashiyah commentary and authentic Dalil.`,
        '- Assign 10 minutes of evening peer Takrar focused on oral Ibarat reading without Harakat.',
        '',
        '_Demo Fallback Mode: Structured curriculum preview generated locally while live Gemini API is unconfigured or rate-limited._',
      ].join('\n');
    }

    if (mode === 'mcq_quiz' || mode === 'mcq_oral_quiz') {
      const hasOral = mode === 'mcq_oral_quiz';
      return [
        `${scopeHeader}`,
        `### ${hasOral ? '5 Befaq MCQs + 2 Shifah Viva Prompts' : '5-Question Curriculum MCQ Quiz'} — ${topic}`,
        '',
        `1. **Q1 (Recall):** Which foundational term best defines the core rule of ${topic} in ${subject}?`,
        '   A) Option Alpha  B) Option Beta  C) Option Gamma  D) Option Delta',
        `2. **Q2 (Comprehension):** Why is ${topic} essential in ${level} ${subject}?`,
        '   A) Primary Reason  B) Secondary Factor  C) Unrelated Aspect  D) Exception Case',
        '3. **Q3 (Application):** Applying the standard rule to a baseline case yields which outcome?',
        '   A) Result 1  B) Result 2  C) Result 3  D) Result 4',
        '4. **Q4 (Analysis):** Which pair of statements (i & ii) accurately holds true under standard conditions?',
        '   A) i only  B) i and ii  C) ii and iii  D) i, ii, and iii',
        '5. **Q5 (Evaluation):** Which conclusion best aligns with examiner/board standards?',
        '   A) Statement A  B) Statement B  C) Statement C  D) Statement D',
        '',
        '**Answer Key:** 1-A, 2-A, 3-B, 4-B, 5-C.',
        ...(hasOral
          ? [
              '',
              '**Shifah (Oral Viva) Prompts:**',
              `- **Viva 1:** Read the core ${subject} passage fluently and identify two grammatical/conceptual anchors.`,
              `- **Viva 2:** Summarize the main rule of ${topic} in 3 sentences with one supporting example/dalil.`,
            ]
          : []),
        '',
        '_Demo Fallback Mode: Structured curriculum preview generated locally while live Gemini API is unconfigured or rate-limited._',
      ].join('\n');
    }

    if (mode === 'rubric') {
      return [
        `${scopeHeader}`,
        `### Classroom Assessment Rubric — ${topic}`,
        '',
        pathwayKey === 'qawmi'
          ? '**Bands:** Mumtaz (90–100%) | Jayyid Jiddan (75–89%) | Jayyid (60–74%) | Maqbul (<60%)'
          : '**Bands:** Excellent (9–10) | Proficient (7–8) | Developing (5–6) | Needs Support (1–4)',
        '',
        `- **1. Conceptual / Textual Accuracy (30%):** Precise command of ${subject} principles without factual errors.`,
        '- **2. Method, Working & Dalil / Evidence (30%):** Clear step-by-step derivation or authentic textual citation.',
        `- **3. Curriculum Terminology (20%):** Accurate ${pathwayName} technical terms used consistently.`,
        '- **4. Structure & Presentation (20%):** Logical organization, clean formatting, and legible expression.',
        '',
        '_Demo Fallback Mode: Structured curriculum preview generated locally while live Gemini API is unconfigured or rate-limited._',
      ].join('\n');
    }

    // Default Teacher: lesson_plan
    return [
      `${scopeHeader}`,
      `### ${pathwayKey === 'qawmi' ? '45-Minute Dars-e-Nizami Sabak Plan' : 'Structured Classroom Lesson Plan'} — ${topic}`,
      '',
      `- **Learning Objectives:** Students in ${level} will define core principles of ${topic}, work through 1 guided example in ${subject}, and complete a formative exit check.`,
      '- **Warm-up / Previous Review (5 min):** Quick 3-question oral recap connecting prior syllabus knowledge.',
      `- **Core Instruction & Modeling (25 min):** Introduce "${topic}" using ${pathwayName} terminology, walk through an annotated board example, and highlight 2 common mistakes.`,
      '- **Guided Practice / Takrar (10 min):** Pair activity solving 2 progressive prompts with teacher circulation.',
      '- **Exit Assessment & Homework (5 min):** 1-minute written check + targeted textbook/kitab practice assignment.',
      '',
      '_Demo Fallback Mode: Structured curriculum preview generated locally while live Gemini API is unconfigured or rate-limited._',
    ].join('\n');
  }

  // STUDENT MODES
  if (mode === 'summary') {
    return [
      `${scopeHeader}`,
      `### Revision Summary Sheet — ${topic}`,
      '',
      '**1. Core Definitions & Principles:**',
      `- **Primary Concept:** "${topic}" forms a foundational building block in ${level} ${subject}.`,
      `- **Key Terminology:** Focus on exact ${pathwayName} terms required in board/examiner mark schemes.`,
      '',
      '**2. Essential Framework / Formula Checklist:**',
      '- Identify given conditions/premises first before selecting your formula, rule, or textual reference.',
      '- Verify units, grammatical endings, or citation accuracy at each step.',
      '',
      '**3. Three Exam Takeaways:**',
      '1. Always state the core definition or rule clearly before applying it.',
      '2. Show intermediate steps explicitly to secure method marks.',
      '3. Review common edge cases and exceptions prior to your next test.',
      '',
      '_Demo Fallback Mode: Structured curriculum preview generated locally while live Gemini API is unconfigured or rate-limited._',
    ].join('\n');
  }

  if (mode === 'practice') {
    return [
      `${scopeHeader}`,
      `### Practice Questions & Answer Key — ${topic}`,
      '',
      `1. **Question 1 (Foundational Recall):** Define the key principle behind "${topic}" in ${subject} and give one concrete example.`,
      `2. **Question 2 (Application):** How does the main rule of "${topic}" apply when a primary condition changes in a ${level} problem?`,
      `3. **Question 3 (Exam Challenge):** Analyze a multi-step scenario in ${subject} involving "${topic}" and justify your conclusion.`,
      '',
      '**Answer Key & Guidance:**',
      '- **Q1:** State the exact textbook/syllabus definition clearly and pair it with a standard classroom example.',
      '- **Q2:** Outline the cause-and-effect relationship step by step using appropriate technical terms.',
      '- **Q3:** Break the challenge into known inputs -> governing rule -> verified conclusion.',
      '',
      '_Demo Fallback Mode: Structured curriculum preview generated locally while live Gemini API is unconfigured or rate-limited._',
    ].join('\n');
  }

  // Default Student: ask / Concept Explanation
  return [
    `${scopeHeader}`,
    `### Step-by-Step Study Explanation — ${topic}`,
    '',
    '**1. Big Picture Intuition:**',
    `- In ${level} ${subject}, "${topic}" explains how core elements relate systematically within the ${pathwayName} syllabus.`,
    '',
    '**2. Step-by-Step Breakdown:**',
    '- **Step 1 — Identify the Core Rule:** Start with the exact definition and key technical terms.',
    '- **Step 2 — Walk Through a Concrete Example:** Apply the rule to a standard textbook or kitab case so every intermediate step is visible.',
    '- **Step 3 — Watch Common Traps:** Avoid skipping justification steps or mixing up closely related terms.',
    '',
    '**Quick Self-Check Tip:** Try explaining this concept aloud in 3 sentences without looking at your notes, then test yourself with 1 practice question.',
    '',
    '_Demo Fallback Mode: Structured curriculum preview generated locally while live Gemini API is unconfigured or rate-limited._',
  ].join('\n');
}
