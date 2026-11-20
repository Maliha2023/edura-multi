# Edura Multi — Curriculum-Aware Prompt Library & Gemini Integration Specification

## 1. Architecture Overview

Edura Multi implements a centralized, strongly typed **Prompt Library** (`lib/prompt-library.ts`) paired with a server-side **Google Gemini API service** (`lib/llm-service.ts`) and a browser-safe **Curriculum Demo Fallback generator** (`lib/llm-fallback.ts`).

### Core Design Principles
- **Strict Pathway & Role Isolation:** Every prompt template and AI call is scoped to the active user role (`student` | `teacher`) and academic pathway (`bangla_version`, `english_version`, `cambridge`, `edexcel`, `alia`, `qawmi`), ensuring NCTB Srijonshil conventions, Cambridge/Edexcel command words, BMEB/IAU Alia terminology, and Dars-e-Nizami/Befaq Qawmi traditions never bleed across streams.
- **Zero-Secret Client Bundle:** `GEMINI_API_KEY` is accessed exclusively on the server via `process.env.GEMINI_API_KEY` inside `lib/llm-service.ts` (invoked by Express API routes in `server.ts`).
- **Resilient Demo Fallback:** If `GEMINI_API_KEY` is absent, invalid, rate-limited (`429`), or unreachable due to network errors, `lib/llm-service.ts` automatically returns a structured, curriculum-specific fallback response via `buildFallbackAiResponse()` so live evaluations and classroom demos never crash.

---

## 2. Prompt Schema & Helper Utilities (`lib/prompt-library.ts`)

### Template Schema (`PromptTemplateItem`)
| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | `string` | Unique identifier (e.g. `nctb-student-srijonshil-cq-prep`, `qawmi-teacher-dars-sabak-plan`). |
| `title` | `string` | Human-readable prompt title displayed in the UI Prompt Library selector. |
| `role` | `'student' \| 'teacher'` | Role scope controlling visibility in Student AI Tutor vs. Teacher AI Assistant. |
| `pathways` | `PathwayKey[] \| 'all'` | Applicable pathways (`bangla_version`, `english_version`, `cambridge`, `edexcel`, `alia`, `qawmi`) or universal `'all'`. |
| `category` | `PromptCategory` | One of 6 standardized pedagogical categories. |
| `description` | `string` | Concise summary of the template's pedagogical outcome. |
| `systemInstruction` | `string` | Curriculum- and role-aware system prompt passed to Gemini. |
| `userTemplate` | `string` | Editable user prompt supporting dynamic placeholder interpolation. |
| `recommendedMode` | `AiExecutionMode` | Optional workspace mode (`ask`, `summary`, `practice`, `lesson_plan`, `question_paper`, `cq_paper`, `past_paper`, `tarkeeb_sharah`, `mcq_quiz`, `mcq_oral_quiz`, `rubric`). |

### Dynamic Variable Interpolation
All `userTemplate` strings support five standardized placeholders resolved by `interpolatePrompt(template, vars)`:

- `{{pathway}}` — Normalized curriculum display name (e.g., `NCTB Bangla Version`, `Cambridge International (CAIE)`, `Alia Madrasa (BMEB / IAU)`, `Qawmi Madrasa (Dars-e-Nizami / Befaq)`).
- `{{level}}` — Active class, exam tier, or Marhala (e.g., `Class 10`, `O Level / IGCSE (Grades 9–10)`, `Dakhil`, `Mutawassitah`).
- `{{trackOrDept}}` — Active group, academic track, department, or focus branch (e.g., `Science`, `Business Studies`, `Hadith & Tafsir`, `General / Kitab`).
- `{{subject}}` — Active subject or Kitab (e.g., `Physics`, `Mathematics (0580)`, `Quran Majeed & Tajweed`, `Hidayatun Nahw`).
- `{{topic}}` — User-editable chapter, syllabus unit, or Kitab bab/topic.

### Query Helper (`getPromptsForContext`)
```ts
const prompts = getPromptsForContext({
  role: 'student',
  pathway: 'cambridge',
  category: 'Exam & Past-Paper / CQ Prep', // optional
});
```
Returns pathway-specific prompts sorted ahead of universal `'all'` prompts, strictly filtered by role and pathway.

---

## 3. Pathway & Category Matrix (32 Curated Prompts)

The library ships with **32 curated prompts** (16 Student + 16 Teacher) spanning six categories:
1. `Concept Explanation`
2. `Exam & Past-Paper / CQ Prep`
3. `Quiz & Assessment`
4. `Lesson / Dars Plan`
5. `Kitab / Tarkeeb & Sharah`
6. `Summary & Revision`

### 3.1 Student Prompts (`AI Study Tutor`)

| Pathway Group | Prompt IDs | Categories Covered | Pedagogical Focus |
| :--- | :--- | :--- | :--- |
| **NCTB (`bangla_version`, `english_version`)** | `nctb-student-concept-step-by-step`, `nctb-student-srijonshil-cq-prep`, `nctb-student-mcq-drill`, `nctb-student-chapter-revision` | Concept Explanation, Exam & Past-Paper / CQ Prep, Quiz & Assessment, Summary & Revision | NCTB textbook terminology (Bangla/English), Srijonshil CQ (`Uddipok + Ka/Kha/Ga/Gha`), Bahupadi MCQs, formula sheets. |
| **International (`cambridge`, `edexcel`)** | `intl-student-caie-concept-coach`, `intl-student-edexcel-spec-coach`, `intl-student-past-paper-practice`, `intl-student-paper1-mcq`, `intl-student-revision-sheet` | Concept Explanation, Exam & Past-Paper / CQ Prep, Quiz & Assessment, Summary & Revision | CAIE & Edexcel specification alignment, command words (`State`, `Calculate`, `Evaluate`), `[marks]` brackets, `M1/A1` mark schemes, Paper 1 distractor analysis. |
| **Alia Madrasa (`alia`)** | `alia-student-concept-arabic-terms`, `alia-student-bmeb-cq-prep`, `alia-student-marhala-revision` | Concept Explanation, Exam & Past-Paper / CQ Prep, Summary & Revision | BMEB & IAU Marhala (`Ebtedayee`–`Kamil`) concepts, Arabic/Bangla terms in parentheses, authentic Dalil references, BMEB CQ prep. |
| **Qawmi Madrasa (`qawmi`)** | `qawmi-student-tarkeeb-sharah`, `qawmi-student-befaq-imtihan-prep`, `qawmi-student-takrar-summary` | Kitab / Tarkeeb & Sharah, Exam & Past-Paper / CQ Prep, Summary & Revision | Dars-e-Nizami `Ibarat` reading, syntactic `Tarkeeb`, classical `Sharah`, Befaq / Al-Haiatul Ulya Imtihan practice, evening `Takrar` checklists. |
| **All Pathways** | `all-student-active-recall-check` | Quiz & Assessment | 5-question progressive active-recall self-check adapted to any active context. |

### 3.2 Teacher Prompts (`AI Teaching Assistant`)

| Pathway Group | Prompt IDs | Categories Covered | Pedagogical Focus |
| :--- | :--- | :--- | :--- |
| **NCTB (`bangla_version`, `english_version`)** | `nctb-teacher-lesson-plan-45`, `nctb-teacher-cq-srijonshil-paper`, `nctb-teacher-mcq-quiz-set`, `nctb-teacher-grading-rubric` | Lesson / Dars Plan, Exam & Past-Paper / CQ Prep, Quiz & Assessment | 45-min classroom lesson flow, 10-mark Srijonshil CQ authoring, cognitive-tagged MCQs, 20-mark grading rubrics. |
| **International (`cambridge`, `edexcel`)** | `intl-teacher-caie-lesson-plan`, `intl-teacher-edexcel-lesson-plan`, `intl-teacher-past-paper-structured`, `intl-teacher-ao-rubric` | Lesson / Dars Plan, Exam & Past-Paper / CQ Prep, Quiz & Assessment | 50-min spec-mapped lessons, 12–15 mark structured past-paper drafting, `AO1/AO2/AO3` levels-based marking schemes. |
| **Alia Madrasa (`alia`)** | `alia-teacher-bmeb-lesson-plan`, `alia-teacher-bmeb-cq-paper`, `alia-teacher-evaluation-rubric` | Lesson / Dars Plan, Exam & Past-Paper / CQ Prep, Quiz & Assessment | 45-min BMEB/IAU lesson plans with recitation/warm-up, Madrasa Board CQ papers, Dalil & terminology evaluation rubrics. |
| **Qawmi Madrasa (`qawmi`)** | `qawmi-teacher-dars-sabak-plan`, `qawmi-teacher-tarkeeb-sharah-notes`, `qawmi-teacher-befaq-mcq-shifah`, `qawmi-teacher-takrar-imtihan-rubric` | Lesson / Dars Plan, Kitab / Tarkeeb & Sharah, Quiz & Assessment | 45-min `Sabak` & `Mutalaah` plans, Ustad `Tarkeeb`/`Hashiyah` notes, 5 Befaq MCQs + 2 `Shifah` oral viva prompts, `Mumtaz`–`Maqbul` rubrics. |
| **All Pathways** | `all-teacher-misconceptions-scaffold` | Concept Explanation | Top 3 misconceptions, 2-minute diagnostic check, and differentiated support/extension scaffolds. |

---

## 4. Sample System Instructions & Interpolated Templates

### Example 1 — NCTB Student (`bangla_version`, Class 10 Science, Physics)
- **Prompt ID:** `nctb-student-srijonshil-cq-prep`
- **System Instruction:**
  > You are an NCTB Board Exam Coach in Bangladesh. Construct authentic Srijonshil Creative Questions (CQ) featuring a realistic Uddipok (stem) followed by Knowledge (Ka - 1 mark), Comprehension (Kha - 2 marks), Application (Ga - 3 marks), and Higher-Order Thinking (Gha - 4 marks), along with concise model answers.
- **Interpolated User Prompt:**
  > For NCTB Bangla Version Class 10 (Science) in Physics, create 1 complete NCTB board-style Creative Question (Uddipok + Ka, Kha, Ga, Gha) on "Newton's Second Law" and provide step-by-step model answer pointers.

### Example 2 — Qawmi Teacher (`qawmi`, Mutawassitah, General / Kitab, Hidayatun Nahw)
- **Prompt ID:** `qawmi-teacher-tarkeeb-sharah-notes`
- **System Instruction:**
  > You are a Senior Qawmi Madrasa Muhaddith/Ustad Teaching Assistant. Produce crisp Tarkeeb & Sharah teaching notes covering Ibarat vocalization/meaning, syntactic Tarkeeb breakdown, classical Sharah/Hashiyah insights, and authentic Dalil references.
- **Interpolated User Prompt:**
  > Generate Ustad Tarkeeb & Sharah teaching notes for Qawmi Madrasa (Dars-e-Nizami / Befaq), Mutawassitah (Middle Marhala) (General / Kitab), Hidayatun Nahw on "Bab-ul-Maf'ul Bihi". Include Ibarat pointers, Tarkeeb highlights, and classical commentary notes.

---

## 5. Gemini API & Safe Fallback Behavior (`lib/llm-service.ts`)

1. **Primary Execution:**
   - Endpoint (`POST /api/ai/generate` and all pathway-scoped `/api/student*/ai-tutor` and `/api/teacher*/ai-assistant` routes) invokes `generateAiResponse()` in `lib/llm-service.ts`.
   - Uses `@google/genai` SDK (`GoogleGenAI`) with `process.env.GEMINI_API_KEY`, model `'gemini-4-hydrogen'`, `thinkingConfig: { thinkingLevel: ThinkingLevel.LOW }`, and the active curriculum `systemInstruction`.
2. **Graceful Demo Fallback:**
   - Missing `GEMINI_API_KEY`, invalid key (`400`/`403`), quota/rate-limit (`429`), empty model output, or network errors are caught cleanly without crashing the endpoint.
   - `buildFallbackAiResponse()` returns structured, markdown-formatted curriculum guidance tagged with `isFallback: true` so the UI displays a clean **Demo Fallback** badge alongside the **Copy Response** action.
