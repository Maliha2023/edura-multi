import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { generateAiResponse } from './lib/llm-service';
import { getPromptById, interpolatePrompt, type PromptRole } from './lib/prompt-library';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

type TutorMode = 'ask' | 'summary' | 'practice';

interface TutorRequestBody {
  pathway?: string;
  academicClass?: number;
  academicGroup?: string | null;
  subject?: string;
  mode?: TutorMode;
  prompt?: string;
  promptId?: string;
  systemInstruction?: string;
  history?: { role: 'user' | 'model'; text: string }[];
}

function buildTutorSystemInstruction(body: TutorRequestBody): string {
  const pathwayLabel =
    body.pathway === 'english_version' ? 'English Version (NCTB)' : 'Bangla Version (NCTB)';
  const classNum = typeof body.academicClass === 'number' ? body.academicClass : 10;
  const groupText = body.academicGroup ? ` (${body.academicGroup} Group)` : '';
  const subjectText = body.subject?.trim() || 'General Studies';
  const mode: TutorMode =
    body.mode === 'summary' || body.mode === 'practice' ? body.mode : 'ask';

  const modeGuidance =
    mode === 'summary'
      ? 'Provide a clear, structured study summary with key definitions, formulas/dates if applicable, and 3 quick revision takeaways.'
      : mode === 'practice'
        ? 'Generate 3 progressive practice questions (short conceptual + board-style MCQ/problem) tailored to this NCTB level, followed by a concise Answer Key & Step-by-Step Solution section.'
        : 'Answer the student question clearly step by step using age-appropriate NCTB textbook concepts, concrete examples, and a brief check-for-understanding tip.';

  const languageGuidance =
    body.pathway === 'bangla_version'
      ? 'Match the language of the student question (Bangla or English). When answering in English for a Bangla Version student, include helpful Bangla NCTB key terms in parentheses where appropriate.'
      : 'Respond in clear academic English aligned with NCTB English Version textbooks.';

  return [
    `You are an NCTB Curriculum AI Study Tutor for a Bangladesh student in ${pathwayLabel}, Class ${classNum}${groupText}, currently studying ${subjectText}.`,
    languageGuidance,
    modeGuidance,
    'Keep formatting clean and scannable with short paragraphs and bullet points. Stay focused on academic learning and keep responses concise (under 350 words unless a worked solution requires slightly more).',
  ].join(' ');
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  app.post('/api/ai/generate', async (req, res) => {
    const body = (req.body ?? {}) as {
      role?: PromptRole;
      pathway?: string;
      level?: string;
      trackOrDept?: string | null;
      subject?: string;
      topic?: string;
      mode?: string;
      prompt?: string;
      promptId?: string;
      systemInstruction?: string;
      history?: { role: 'user' | 'model'; text: string }[];
    };

    const role: PromptRole = body.role === 'teacher' ? 'teacher' : 'student';
    const pathway = body.pathway?.trim() || 'bangla_version';
    const template = body.promptId ? getPromptById(body.promptId) : undefined;
    const rawPrompt = typeof body.prompt === 'string' ? body.prompt.trim() : '';
    const prompt =
      rawPrompt ||
      (template
        ? interpolatePrompt(template.userTemplate, {
            pathway,
            level: body.level?.trim() || 'Core Level',
            trackOrDept: body.trackOrDept?.trim() || 'General',
            subject: body.subject?.trim() || 'Core Subject',
            topic: body.topic?.trim() || template.defaultTopicHint || 'Core Syllabus Foundations',
          })
        : '');

    if (!prompt) {
      res.status(400).json({ error: 'Please enter a prompt or select a Prompt Library template.' });
      return;
    }

    const result = await generateAiResponse({
      role,
      pathway,
      level: body.level,
      trackOrDept: body.trackOrDept,
      subject: body.subject,
      mode: body.mode || template?.recommendedMode,
      prompt,
      promptId: body.promptId,
      systemInstruction: body.systemInstruction || template?.systemInstruction,
      history: body.history,
    });

    res.json({
      reply: result.text,
      isFallback: result.isFallback,
      fallbackReason: result.fallbackReason,
      model: result.model,
      notice: result.notice,
    });
  });

  app.post('/api/student/ai-tutor', async (req, res) => {
    const body = (req.body ?? {}) as TutorRequestBody;
    const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : '';

    if (!prompt) {
      res.status(400).json({ error: 'Please enter a study question or topic first.' });
      return;
    }

    const template = body.promptId ? getPromptById(body.promptId) : undefined;
    const systemInstruction =
      body.systemInstruction?.trim() ||
      template?.systemInstruction ||
      buildTutorSystemInstruction(body);

    const result = await generateAiResponse({
      role: 'student',
      pathway: body.pathway || 'bangla_version',
      level: typeof body.academicClass === 'number' ? `Class ${body.academicClass}` : 'Class 10',
      trackOrDept: body.academicGroup,
      subject: body.subject || 'General Studies',
      mode: body.mode || template?.recommendedMode || 'ask',
      prompt,
      promptId: body.promptId,
      systemInstruction,
      history: body.history,
    });

    res.json({
      reply: result.text,
      isFallback: result.isFallback,
      fallbackReason: result.fallbackReason,
      model: result.model,
      notice: result.notice,
    });
  });

  type TeacherAssistantMode = 'lesson_plan' | 'question_paper' | 'mcq_quiz' | 'rubric';

  interface TeacherAssistantRequestBody {
    pathway?: string;
    subject?: string;
    academicClass?: number;
    academicGroup?: string | null;
    mode?: TeacherAssistantMode;
    prompt?: string;
    promptId?: string;
    systemInstruction?: string;
    history?: { role: 'user' | 'model'; text: string }[];
  }

  function buildTeacherAssistantSystemInstruction(body: TeacherAssistantRequestBody): string {
    const pathwayLabel =
      body.pathway === 'english_version' ? 'English Version (NCTB)' : 'Bangla Version (NCTB)';
    const classNum = typeof body.academicClass === 'number' ? body.academicClass : 10;
    const groupText = body.academicGroup ? ` (${body.academicGroup} Group)` : '';
    const subjectText = body.subject?.trim() || 'General Studies';
    const mode: TeacherAssistantMode =
      body.mode === 'question_paper' || body.mode === 'mcq_quiz' || body.mode === 'rubric'
        ? body.mode
        : 'lesson_plan';

    const modeGuidance =
      mode === 'lesson_plan'
        ? 'Generate a structured 45-minute NCTB classroom lesson plan with Learning Objectives, Warm-up (5 min), Core Instruction & Board Examples (25 min), Guided Practice (10 min), Exit Assessment & Homework (5 min).'
        : mode === 'question_paper'
          ? 'Draft an NCTB board-style Creative Question (CQ / Srijonshil) paper with a clear stem (Uddipok) followed by Knowledge (Ka - 1 mark), Comprehension (Kha - 2 marks), Application (Ga - 3 marks), and Higher-Order Thinking (Gha - 4 marks), plus concise marking pointers.'
          : mode === 'mcq_quiz'
            ? 'Create 5 NCTB board-aligned Multiple Choice Questions (4 options A–D each) mixing conceptual and application difficulty, followed by a clean Answer Key with brief 1-line explanations.'
            : 'Produce an actionable NCTB classroom grading rubric organized by 4 assessment criteria (Concept Accuracy, Method/Steps, Curriculum Terminology, Presentation) across Excellent, Proficient, Developing, and Needs Support bands with point allocations.';

    const languageGuidance =
      body.pathway === 'bangla_version'
        ? 'Write clearly for a Bangla Version NCTB faculty member. Match the teacher prompt language (Bangla or English); if responding in English, include official Bangla NCTB terms in parentheses where helpful.'
        : 'Write in crisp, formal academic English aligned with Bangladesh NCTB English Version textbooks and board exam standards.';

    return [
      `You are an NCTB Curriculum AI Teaching Assistant helping a Bangladesh teacher in ${pathwayLabel} teaching ${subjectText} for Class ${classNum}${groupText}.`,
      languageGuidance,
      modeGuidance,
      'Format cleanly with scannable headings, bullet points, and clear marks or time allocations so the teacher can use it directly in class. Keep output focused and practical (under 450 words).',
    ].join(' ');
  }

  app.post('/api/teacher/ai-assistant', async (req, res) => {
    const body = (req.body ?? {}) as TeacherAssistantRequestBody;
    const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : '';

    if (!prompt) {
      res.status(400).json({ error: 'Please enter a topic, chapter, or teaching request first.' });
      return;
    }

    const template = body.promptId ? getPromptById(body.promptId) : undefined;
    const systemInstruction =
      body.systemInstruction?.trim() ||
      template?.systemInstruction ||
      buildTeacherAssistantSystemInstruction(body);

    const result = await generateAiResponse({
      role: 'teacher',
      pathway: body.pathway || 'bangla_version',
      level: typeof body.academicClass === 'number' ? `Class ${body.academicClass}` : 'Class 10',
      trackOrDept: body.academicGroup,
      subject: body.subject || 'General Studies',
      mode: body.mode || template?.recommendedMode || 'lesson_plan',
      prompt,
      promptId: body.promptId,
      systemInstruction,
      history: body.history,
    });

    res.json({
      reply: result.text,
      isFallback: result.isFallback,
      fallbackReason: result.fallbackReason,
      model: result.model,
      notice: result.notice,
    });
  });

  interface IntlTutorRequestBody {
    pathway?: string;
    academicLevel?: string;
    academicTrack?: string;
    subject?: string;
    mode?: TutorMode;
    prompt?: string;
    promptId?: string;
    systemInstruction?: string;
    history?: { role: 'user' | 'model'; text: string }[];
  }

  function buildIntlTutorSystemInstruction(body: IntlTutorRequestBody): string {
    const isEdexcel = body.pathway === 'edexcel';
    const boardName = isEdexcel
      ? 'Pearson Edexcel International'
      : 'Cambridge Assessment International Education (CAIE)';
    const levelText = body.academicLevel?.trim() || (isEdexcel ? 'International GCSE (Grades 9–10)' : 'O Level / IGCSE (Grades 9–10)');
    const trackText = body.academicTrack?.trim() || 'General';
    const subjectText = body.subject?.trim() || 'Mathematics';
    const mode: TutorMode =
      body.mode === 'summary' || body.mode === 'practice' ? body.mode : 'ask';

    const modeGuidance =
      mode === 'summary'
        ? `Produce a structured ${boardName} revision sheet with core definitions, essential equations/frameworks, and 3 examiner mark-scheme tips.`
        : mode === 'practice'
          ? `Generate 3 progressive ${boardName} past-paper style questions with command words and mark allocations (e.g. [2], [4], [6]), followed by a concise Mark Scheme & Worked Solution section.`
          : `Answer clearly step by step using official ${boardName} syllabus terminology, worked examples, and a quick examiner check tip.`;

    return [
      `You are an International Curriculum AI Study Tutor for a student studying ${boardName} at ${levelText} (${trackText} track), currently focused on ${subjectText}.`,
      modeGuidance,
      'Respond in crisp academic English. Keep formatting clean and scannable with short paragraphs and bullet points, under 360 words unless a worked solution needs slightly more.',
    ].join(' ');
  }

  app.post('/api/student-intl/ai-tutor', async (req, res) => {
    const body = (req.body ?? {}) as IntlTutorRequestBody;
    const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : '';

    if (!prompt) {
      res.status(400).json({ error: 'Please enter a study question or syllabus topic first.' });
      return;
    }

    const template = body.promptId ? getPromptById(body.promptId) : undefined;
    const systemInstruction =
      body.systemInstruction?.trim() ||
      template?.systemInstruction ||
      buildIntlTutorSystemInstruction(body);

    const result = await generateAiResponse({
      role: 'student',
      pathway: body.pathway === 'edexcel' ? 'edexcel' : 'cambridge',
      level: body.academicLevel || 'O Level / IGCSE (Grades 9–10)',
      trackOrDept: body.academicTrack || 'General',
      subject: body.subject || 'Mathematics',
      mode: body.mode || template?.recommendedMode || 'ask',
      prompt,
      promptId: body.promptId,
      systemInstruction,
      history: body.history,
    });

    res.json({
      reply: result.text,
      isFallback: result.isFallback,
      fallbackReason: result.fallbackReason,
      model: result.model,
      notice: result.notice,
    });
  });

  type IntlTeacherAssistantMode = 'lesson_plan' | 'past_paper' | 'mcq_quiz' | 'rubric';

  interface IntlTeacherAssistantRequestBody {
    pathway?: string;
    subject?: string;
    academicLevel?: string;
    academicTrack?: string;
    mode?: IntlTeacherAssistantMode;
    prompt?: string;
    promptId?: string;
    systemInstruction?: string;
    history?: { role: 'user' | 'model'; text: string }[];
  }

  function buildIntlTeacherAssistantSystemInstruction(
    body: IntlTeacherAssistantRequestBody
  ): string {
    const isEdexcel = body.pathway === 'edexcel';
    const boardName = isEdexcel
      ? 'Pearson Edexcel International'
      : 'Cambridge Assessment International Education (CAIE)';
    const levelText =
      body.academicLevel?.trim() ||
      (isEdexcel ? 'International GCSE (Grades 9–10)' : 'O Level / IGCSE (Grades 9–10)');
    const trackText = body.academicTrack?.trim() || 'General';
    const subjectText = body.subject?.trim() || 'Mathematics';
    const mode: IntlTeacherAssistantMode =
      body.mode === 'past_paper' || body.mode === 'mcq_quiz' || body.mode === 'rubric'
        ? body.mode
        : 'lesson_plan';

    const modeGuidance =
      mode === 'lesson_plan'
        ? `Generate a structured 50-minute ${boardName} classroom lesson plan with Syllabus Learning Objectives, Starter Activity (5 min), Core Concept Delivery & Exam Command-Word Examples (25 min), Guided Past-Paper Practice (15 min), and Plenary / Homework (5 min).`
        : mode === 'past_paper'
          ? `Draft a multi-part ${boardName} past-paper style structured question (10–15 marks total) using official exam command words (e.g., State, Explain, Calculate, Deduce, Evaluate) with explicit mark brackets [2], [3], [4] and concise examiner marking notes.`
          : mode === 'mcq_quiz'
            ? `Create 5 ${boardName} Paper 1 style Multiple Choice Questions (4 options A–D each) mixing recall, calculation, and application difficulty, followed by an Answer Key with brief 1-line distractor explanations.`
            : `Produce an official-style ${boardName} Marking Scheme & Assessment Rubric detailing M1/A1/B1 or Level-band descriptors across Knowledge (AO1), Application (AO2), and Analysis/Evaluation (AO3) with explicit point allocations.`;

    return [
      `You are an International Curriculum AI Teaching Assistant supporting a faculty member teaching ${boardName} ${subjectText} at ${levelText} (${trackText} track).`,
      modeGuidance,
      'Respond in crisp, formal academic English. Format with clean headings, bullet points, and explicit mark/time allocations ready for immediate classroom use (under 450 words).',
    ].join(' ');
  }

  app.post('/api/teacher-intl/ai-assistant', async (req, res) => {
    const body = (req.body ?? {}) as IntlTeacherAssistantRequestBody;
    const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : '';

    if (!prompt) {
      res.status(400).json({ error: 'Please enter a syllabus topic or teaching request first.' });
      return;
    }

    const template = body.promptId ? getPromptById(body.promptId) : undefined;
    const systemInstruction =
      body.systemInstruction?.trim() ||
      template?.systemInstruction ||
      buildIntlTeacherAssistantSystemInstruction(body);

    const result = await generateAiResponse({
      role: 'teacher',
      pathway: body.pathway === 'edexcel' ? 'edexcel' : 'cambridge',
      level: body.academicLevel || 'O Level / IGCSE (Grades 9–10)',
      trackOrDept: body.academicTrack || 'General',
      subject: body.subject || 'Mathematics',
      mode: body.mode || template?.recommendedMode || 'lesson_plan',
      prompt,
      promptId: body.promptId,
      systemInstruction,
      history: body.history,
    });

    res.json({
      reply: result.text,
      isFallback: result.isFallback,
      fallbackReason: result.fallbackReason,
      model: result.model,
      notice: result.notice,
    });
  });

  interface AliaTutorRequestBody {
    marhala?: string;
    department?: string;
    subject?: string;
    mode?: TutorMode;
    prompt?: string;
    promptId?: string;
    systemInstruction?: string;
    history?: { role: 'user' | 'model'; text: string }[];
  }

  function buildAliaTutorSystemInstruction(body: AliaTutorRequestBody): string {
    const marhalaText = body.marhala?.trim() || 'Dakhil (Classes 6–10)';
    const deptText = body.department?.trim() || 'General';
    const subjectText = body.subject?.trim() || 'Quran Majeed & Tajweed';
    const mode: TutorMode =
      body.mode === 'summary' || body.mode === 'practice' ? body.mode : 'ask';

    const modeGuidance =
      mode === 'summary'
        ? 'Provide a clear, structured BMEB / IAU Alia Madrasa revision sheet with key definitions, authentic Arabic/Islamic or scientific terminology, and 3 quick board-exam takeaways.'
        : mode === 'practice'
          ? 'Generate 3 progressive BMEB / IAU Alia Madrasa exam-style practice questions (short conceptual + structured / CQ style) tailored to this Marhala and Department, followed by a concise Answer Key & Marking Notes section.'
          : 'Answer the student question clearly step by step using authentic Alia Madrasa syllabus concepts, accurate Arabic/Islamic or scientific terms, concrete examples, and a quick exam tip.';

    return [
      `You are an Alia Madrasa Curriculum AI Study Tutor supporting a Bangladesh student in ${marhalaText}, ${deptText} Department (Bangladesh Madrasa Education Board / Islamic Arabic University), studying ${subjectText}.`,
      'Match the student prompt language (English or Bangla) and include helpful official Arabic/Bangla key terms in parentheses where appropriate.',
      modeGuidance,
      'Keep formatting clean and scannable with short paragraphs and bullet points, under 360 words unless a worked solution requires slightly more.',
    ].join(' ');
  }

  app.post('/api/student-alia/ai-tutor', async (req, res) => {
    const body = (req.body ?? {}) as AliaTutorRequestBody;
    const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : '';

    if (!prompt) {
      res.status(400).json({ error: 'Please enter an Alia Madrasa study question or topic first.' });
      return;
    }

    const template = body.promptId ? getPromptById(body.promptId) : undefined;
    const systemInstruction =
      body.systemInstruction?.trim() ||
      template?.systemInstruction ||
      buildAliaTutorSystemInstruction(body);

    const result = await generateAiResponse({
      role: 'student',
      pathway: 'alia',
      level: body.marhala || 'Dakhil (Classes 6–10)',
      trackOrDept: body.department || 'General',
      subject: body.subject || 'Quran Majeed & Tajweed',
      mode: body.mode || template?.recommendedMode || 'ask',
      prompt,
      promptId: body.promptId,
      systemInstruction,
      history: body.history,
    });

    res.json({
      reply: result.text,
      isFallback: result.isFallback,
      fallbackReason: result.fallbackReason,
      model: result.model,
      notice: result.notice,
    });
  });

  type AliaTeacherAssistantMode = 'lesson_plan' | 'cq_paper' | 'mcq_quiz' | 'rubric';

  interface AliaTeacherAssistantRequestBody {
    marhala?: string;
    department?: string;
    subject?: string;
    mode?: AliaTeacherAssistantMode;
    prompt?: string;
    promptId?: string;
    systemInstruction?: string;
    history?: { role: 'user' | 'model'; text: string }[];
  }

  function buildAliaTeacherAssistantSystemInstruction(
    body: AliaTeacherAssistantRequestBody
  ): string {
    const marhalaText = body.marhala?.trim() || 'Alim (Classes 11–12)';
    const deptText = body.department?.trim() || 'General';
    const subjectText = body.subject?.trim() || 'Hadith Sharif';
    const mode: AliaTeacherAssistantMode =
      body.mode === 'cq_paper' || body.mode === 'mcq_quiz' || body.mode === 'rubric'
        ? body.mode
        : 'lesson_plan';

    const modeGuidance =
      mode === 'lesson_plan'
        ? 'Generate a structured 45-minute Bangladesh Madrasah Education Board (BMEB / IAU) Alia Madrasa lesson plan with Learning Objectives, Recitation/Warm-up (5 min), Core Kitab / Concept Instruction with Arabic & Bangla key terms (25 min), Guided Practice (10 min), and Exit Assessment & Homework (5 min).'
        : mode === 'cq_paper'
          ? 'Draft a Bangladesh Madrasah Education Board (BMEB) Creative Question (CQ / Srijonshil) paper with a realistic Uddipok followed by Knowledge (Ka - 1 mark), Comprehension (Kha - 2 marks), Application (Ga - 3 marks), and Higher-Order Thinking (Gha - 4 marks), plus concise examiner marking pointers.'
          : mode === 'mcq_quiz'
            ? 'Create 5 BMEB / IAU Alia Madrasa aligned Multiple Choice Questions (4 options A–D each) mixing recall, textual understanding, and application difficulty, followed by a clean Answer Key with brief 1-line explanations.'
            : 'Produce an actionable Alia Madrasa classroom grading rubric organized by 4 assessment criteria (Textual & Conceptual Accuracy, Evidence/Dalil & Citation, Arabic/Terminology Usage, Clarity & Structure) across Excellent, Proficient, Developing, and Needs Support bands with point allocations.';

    return [
      `You are an Alia Madrasa Curriculum AI Teaching Assistant helping a Bangladesh Madrasa faculty member teaching ${subjectText} for ${marhalaText} (${deptText} Department) under the Bangladesh Madrasah Education Board (BMEB) and Islamic Arabic University (IAU).`,
      'Match the teacher prompt language (English or Bangla) and include authentic Arabic/Bangla technical terms in parentheses where helpful.',
      modeGuidance,
      'Format cleanly with scannable headings, bullet points, and explicit mark or time allocations ready for direct classroom use (under 450 words).',
    ].join(' ');
  }

  app.post('/api/teacher-alia/ai-assistant', async (req, res) => {
    const body = (req.body ?? {}) as AliaTeacherAssistantRequestBody;
    const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : '';

    if (!prompt) {
      res.status(400).json({ error: 'Please enter an Alia Madrasa topic or teaching request first.' });
      return;
    }

    const template = body.promptId ? getPromptById(body.promptId) : undefined;
    const systemInstruction =
      body.systemInstruction?.trim() ||
      template?.systemInstruction ||
      buildAliaTeacherAssistantSystemInstruction(body);

    const result = await generateAiResponse({
      role: 'teacher',
      pathway: 'alia',
      level: body.marhala || 'Alim (Classes 11–12)',
      trackOrDept: body.department || 'General',
      subject: body.subject || 'Hadith Sharif',
      mode: body.mode || template?.recommendedMode || 'lesson_plan',
      prompt,
      promptId: body.promptId,
      systemInstruction,
      history: body.history,
    });

    res.json({
      reply: result.text,
      isFallback: result.isFallback,
      fallbackReason: result.fallbackReason,
      model: result.model,
      notice: result.notice,
    });
  });

  interface QawmiTutorRequestBody {
    marhala?: string;
    focusBranch?: string;
    subject?: string;
    mode?: TutorMode;
    prompt?: string;
    promptId?: string;
    systemInstruction?: string;
    history?: { role: 'user' | 'model'; text: string }[];
  }

  function buildQawmiTutorSystemInstruction(body: QawmiTutorRequestBody): string {
    const marhalaText = body.marhala?.trim() || 'Mutawassitah (Middle Marhala)';
    const focusText = body.focusBranch?.trim() || 'General / Kitab';
    const subjectText = body.subject?.trim() || 'Nahw & Sarf (Hidayatun Nahw / Ilmus Sarf)';
    const mode: TutorMode =
      body.mode === 'summary' || body.mode === 'practice' ? body.mode : 'ask';

    const modeGuidance =
      mode === 'summary'
        ? 'Provide a structured Dars-e-Nizami / Befaq Kitab takrar revision sheet with core Qaidah/Masalah definitions, Arabic grammatical or Fiqh terms in parentheses, and 3 key Befaq exam takeaways.'
        : mode === 'practice'
          ? 'Generate 3 progressive Befaq / Al-Haiatul Ulya style practice questions (Ibarat & Tarkeeb or Masalah-Dalil conceptual questions) tailored to this Marhala and Focus Branch, followed by a concise Model Answer Key.'
          : 'Answer clearly step by step using authentic Dars-e-Nizami methodology (including Tarkeeb, Ibarat breakdown, Masalah with Dalil, or Hifz/Tajweed makhraj guidance where relevant), plus a concise takrar study tip.';

    return [
      `You are a Qawmi Madrasa AI Study Tutor supporting a Bangladesh student (Talibul Ilm) in ${marhalaText}, Focus Branch: ${focusText} (Dars-e-Nizami / Befaqul Madarisil Arabia syllabus), studying ${subjectText}.`,
      'Match the student prompt language (English or Bangla) and include helpful Arabic/Persian classical terms in parentheses where appropriate.',
      modeGuidance,
      'Keep formatting clean and scannable with short paragraphs and bullet points, under 360 words unless a worked grammatical Tarkeeb or Fiqh breakdown requires slightly more.',
    ].join(' ');
  }

  app.post('/api/student-qawmi/ai-tutor', async (req, res) => {
    const body = (req.body ?? {}) as QawmiTutorRequestBody;
    const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : '';

    if (!prompt) {
      res.status(400).json({ error: 'Please enter a Qawmi Madrasa study question or kitab topic first.' });
      return;
    }

    const template = body.promptId ? getPromptById(body.promptId) : undefined;
    const systemInstruction =
      body.systemInstruction?.trim() ||
      template?.systemInstruction ||
      buildQawmiTutorSystemInstruction(body);

    const result = await generateAiResponse({
      role: 'student',
      pathway: 'qawmi',
      level: body.marhala || 'Mutawassitah (Middle Marhala)',
      trackOrDept: body.focusBranch || 'General / Kitab',
      subject: body.subject || 'Nahw & Sarf',
      mode: body.mode || template?.recommendedMode || 'ask',
      prompt,
      promptId: body.promptId,
      systemInstruction,
      history: body.history,
    });

    res.json({
      reply: result.text,
      isFallback: result.isFallback,
      fallbackReason: result.fallbackReason,
      model: result.model,
      notice: result.notice,
    });
  });

  type QawmiTeacherAssistantMode =
    | 'lesson_plan'
    | 'tarkeeb_sharah'
    | 'mcq_oral_quiz'
    | 'rubric';

  interface QawmiTeacherAssistantRequestBody {
    marhala?: string;
    focusBranch?: string;
    subject?: string;
    mode?: QawmiTeacherAssistantMode;
    prompt?: string;
    promptId?: string;
    systemInstruction?: string;
    history?: { role: 'user' | 'model'; text: string }[];
  }

  function buildQawmiTeacherAssistantSystemInstruction(
    body: QawmiTeacherAssistantRequestBody
  ): string {
    const marhalaText = body.marhala?.trim() || 'Mutawassitah (Middle Marhala)';
    const focusText = body.focusBranch?.trim() || 'General / Kitab';
    const subjectText = body.subject?.trim() || 'Hadith & Tafsir';
    const mode: QawmiTeacherAssistantMode =
      body.mode === 'tarkeeb_sharah' ||
      body.mode === 'mcq_oral_quiz' ||
      body.mode === 'rubric'
        ? body.mode
        : 'lesson_plan';

    const modeGuidance =
      mode === 'lesson_plan'
        ? 'Generate a structured 45-minute Dars-e-Nizami / Befaq Qawmi Madrasa lesson plan with Sabak Objectives, Previous Sabak Revision (5 min), Kitab Ibarat & Sharah Delivery with Arabic/Persian terminology (25 min), Guided Takrar / Tarkeeb Drill (10 min), and Evening Mutalaah & Homework (5 min).'
        : mode === 'tarkeeb_sharah'
          ? 'Produce crisp Tarkeeb & Sharah commentary notes covering the Arabic/Kitab Ibarat breakdown, grammatical/syntactic Tarkeeb analysis, classical commentary insights, and authentic Dalil references.'
          : mode === 'mcq_oral_quiz'
            ? 'Create 5 Befaq / Al-Haiatul Ulya aligned Multiple Choice Questions (4 options A–D each) plus 2 Shifah (oral) viva questions, followed by a clean Answer Key with brief 1-line explanations.'
            : 'Produce an actionable Qawmi Madrasa evaluation rubric organized by 4 assessment criteria (Ibarat Fluency, Tarkeeb & Grammatical Accuracy, Sabak Retention & Dalil Citation, Adab & Oral Delivery) across Mumtaz, Jayyid Jiddan, Jayyid, and Maqbul/Needs Support bands with point allocations.';

    return [
      `You are a Qawmi Madrasa Curriculum AI Teaching Assistant supporting a Bangladesh Ustad teaching ${subjectText} for ${marhalaText} (Focus Branch: ${focusText}) under the Dars-e-Nizami / Wifaqul Madarisil Arabia Bangladesh (Befaq) and Al-Haiatul Ulya traditions.`,
      'Match the teacher prompt language (English or Bangla) and include authentic Arabic/classical terms in parentheses where helpful.',
      modeGuidance,
      'Format cleanly with scannable headings, bullet points, and explicit mark or time allocations ready for direct Dars and Takrar use (under 450 words).',
    ].join(' ');
  }

  app.post('/api/teacher-qawmi/ai-assistant', async (req, res) => {
    const body = (req.body ?? {}) as QawmiTeacherAssistantRequestBody;
    const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : '';

    if (!prompt) {
      res
        .status(400)
        .json({ error: 'Please enter a Qawmi Madrasa Kitab topic or Dars request first.' });
      return;
    }

    const template = body.promptId ? getPromptById(body.promptId) : undefined;
    const systemInstruction =
      body.systemInstruction?.trim() ||
      template?.systemInstruction ||
      buildQawmiTeacherAssistantSystemInstruction(body);

    const result = await generateAiResponse({
      role: 'teacher',
      pathway: 'qawmi',
      level: body.marhala || 'Mutawassitah (Middle Marhala)',
      trackOrDept: body.focusBranch || 'General / Kitab',
      subject: body.subject || 'Hadith & Tafsir',
      mode: body.mode || template?.recommendedMode || 'lesson_plan',
      prompt,
      promptId: body.promptId,
      systemInstruction,
      history: body.history,
    });

    res.json({
      reply: result.text,
      isFallback: result.isFallback,
      fallbackReason: result.fallbackReason,
      model: result.model,
      notice: result.notice,
    });
  });

  if (!IS_PRODUCTION) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Edura Multi server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
