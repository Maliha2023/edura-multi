import React, { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  BookOpenCheck,
  Bot,
  ClipboardCheck,
  FileSpreadsheet,
  ListChecks,
  Loader2,
  RotateCcw,
  Send,
} from 'lucide-react';
import {
  getTeacherPathwayLabel,
  TEACHER_CLASS_LEVELS,
  type TeacherClassLevel,
  type TeacherProfileContext,
} from '../../services/teacherService';
import { requestCurriculumAi } from '../../services/aiClient';
import { CopyResponseButton } from '../ai/CopyResponseButton';
import { FormattedAiMessage } from '../ai/FormattedAiMessage';
import { PromptLibraryBar } from '../ai/PromptLibraryBar';
import type { PromptTemplateItem } from '../../../lib/prompt-library';
import { useDashboardLanguage } from '../../i18n/useDashboardLanguage';

type AssistantMode = 'lesson_plan' | 'question_paper' | 'mcq_quiz' | 'rubric';

interface AssistantMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  mode: AssistantMode;
  academicClass: TeacherClassLevel;
  isFallback?: boolean;
  timestamp: number;
}

interface TeacherAiAssistantTabProps {
  teacher: TeacherProfileContext;
  initialTopic?: string | null;
  initialClass?: TeacherClassLevel | null;
}

export function TeacherAiAssistantTab({
  teacher,
  initialTopic,
  initialClass,
}: TeacherAiAssistantTabProps) {
  const { dt, td, formatDigits } = useDashboardLanguage();
  const defaultClass: TeacherClassLevel = initialClass ?? teacher.assignedClasses[0] ?? 10;
  const [selectedClass, setSelectedClass] = useState<TeacherClassLevel>(defaultClass);
  const [mode, setMode] = useState<AssistantMode>('lesson_plan');
  const [input, setInput] = useState(
    initialTopic
      ? `Draft a structured 45-minute NCTB classroom lesson plan for "${initialTopic}".`
      : ''
  );
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [activePromptId, setActivePromptId] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const threadEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (initialClass) {
      setSelectedClass(initialClass);
    }
  }, [initialClass]);

  useEffect(() => {
    if (initialTopic) {
      setInput(`Draft a structured 45-minute NCTB classroom lesson plan for "${initialTopic}".`);
    }
  }, [initialTopic]);

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [messages, isLoading]);

  const pathwayLabel = td(getTeacherPathwayLabel(teacher.pathway));
  const rawPathwayLabel = getTeacherPathwayLabel(teacher.pathway);
  const subjectLabel = td(teacher.primarySubject);

  const modeTabs: {
    id: AssistantMode;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    placeholder: string;
  }[] = [
    {
      id: 'lesson_plan',
      label: dt('Lesson Plan', 'পাঠ পরিকল্পনা'),
      icon: BookOpenCheck,
      placeholder: dt(
        'Enter a chapter or topic in {subject} for a 45-min lesson plan...',
        '৪৫ মিনিটের পাঠ পরিকল্পনার জন্য {subject} বিষয়ের একটি অধ্যায় বা বিষয় লিখুন...',
        { subject: subjectLabel }
      ),
    },
    {
      id: 'question_paper',
      label: dt('Board CQ Paper', 'বোর্ড সৃজনশীল প্রশ্ন'),
      icon: FileSpreadsheet,
      placeholder: dt(
        'Specify chapter & learning outcome to draft an NCTB Creative Question (CQ)...',
        'এনসিটিবি সৃজনশীল প্রশ্ন (CQ) তৈরি করতে অধ্যায় ও শিখনফল উল্লেখ করুন...'
      ),
    },
    {
      id: 'mcq_quiz',
      label: dt('MCQ Quiz', 'বহুনির্বাচনি কুইজ'),
      icon: ListChecks,
      placeholder: dt(
        'Enter a topic in {subject} to generate 5 board-aligned MCQs...',
        'বোর্ড-উপযোগী ৫টি বহুনির্বাচনি প্রশ্ন তৈরি করতে {subject} বিষয়ের একটি অধ্যায় লিখুন...',
        { subject: subjectLabel }
      ),
    },
    {
      id: 'rubric',
      label: dt('Grading Rubric', 'মূল্যায়ন রুব্রিক'),
      icon: ClipboardCheck,
      placeholder: dt(
        'Describe the assignment, lab report, or CQ task to build a grading rubric...',
        'মূল্যায়ন রুব্রিক তৈরি করতে অ্যাসাইনমেন্ট, ল্যাব রিপোর্ট বা সৃজনশীল কাজের বিবরণ লিখুন...'
      ),
    },
  ];

  const activeModeMeta = modeTabs.find((m) => m.id === mode) ?? modeTabs[0];

  const quickStarters: { label: string; mode: AssistantMode; prompt: string }[] = [
    {
      label: dt('45-min NCTB lesson plan', '৪৫ মিনিটের এনসিটিবি পাঠ পরিকল্পনা'),
      mode: 'lesson_plan',
      prompt: `Create a 45-minute NCTB ${rawPathwayLabel} Class ${selectedClass} lesson plan on a core chapter of ${teacher.primarySubject} with warm-up and board examples.`,
    },
    {
      label: dt('Board-style CQ (Srijonshil)', 'বোর্ড-ধাঁচের সৃজনশীল প্রশ্ন'),
      mode: 'question_paper',
      prompt: `Draft one complete NCTB board-style Creative Question (Ka, Kha, Ga, Gha — 10 marks) for Class ${selectedClass} ${teacher.primarySubject}.`,
    },
    {
      label: dt('5-question MCQ quiz', '৫টি প্রশ্নের বহুনির্বাচনি কুইজ'),
      mode: 'mcq_quiz',
      prompt: `Generate 5 NCTB Class ${selectedClass} ${teacher.primarySubject} MCQs with options A–D and a concise answer key.`,
    },
    {
      label: dt('Practical / CQ grading rubric', 'ব্যবহারিক / সৃজনশীল মূল্যায়ন রুব্রিক'),
      mode: 'rubric',
      prompt: `Build a 20-mark grading rubric for Class ${selectedClass} ${teacher.primarySubject} written assessments and practical notebooks.`,
    },
  ];

  const sendPrompt = async (promptText: string, activeMode: AssistantMode = mode) => {
    const trimmed = promptText.trim();
    if (!trimmed || isLoading) return;

    setErrorMsg(null);
    const userMsg: AssistantMessage = {
      id: `tusr-${Date.now()}`,
      role: 'user',
      text: trimmed,
      mode: activeMode,
      academicClass: selectedClass,
      timestamp: Date.now(),
    };

    const nextHistory = [...messages, userMsg];
    setMessages(nextHistory);
    setInput('');
    setIsLoading(true);

    try {
      const result = await requestCurriculumAi({
        endpoint: '/api/teacher/ai-assistant',
        role: 'teacher',
        pathway: teacher.pathway,
        level: `Class ${selectedClass}`,
        trackOrDept: selectedClass >= 9 ? teacher.academicGroup : 'General',
        subject: teacher.primarySubject,
        mode: activeMode,
        prompt: trimmed,
        promptId: activePromptId,
        payload: {
          pathway: teacher.pathway,
          subject: teacher.primarySubject,
          academicClass: selectedClass,
          academicGroup: selectedClass >= 9 ? teacher.academicGroup : null,
          mode: activeMode,
          prompt: trimmed,
          history: nextHistory.slice(-6).map((m) => ({ role: m.role, text: m.text })),
        },
      });

      const modelMsg: AssistantMessage = {
        id: `tmod-${Date.now()}`,
        role: 'model',
        text: result.reply,
        mode: activeMode,
        academicClass: selectedClass,
        isFallback: result.isFallback,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, modelMsg]);
      setActivePromptId(undefined);
    } catch {
      setErrorMsg(
        dt(
          'Network error while contacting the AI Teaching Assistant. Please try again.',
          'এআই শিক্ষণ সহকারীর সাথে যোগাযোগের সময় নেটওয়ার্ক ত্রুটি হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।'
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void sendPrompt(input, mode);
  };

  const classOptions =
    teacher.assignedClasses.length > 0 ? teacher.assignedClasses : TEACHER_CLASS_LEVELS;

  return (
    <div className="space-y-5">
      {/* Control Header */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              {td('AI Teaching Assistant')}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {dt(
                'NCTB faculty copilot scoped to {pathway} · {subject} · Class {cls}',
                '{pathway} · {subject} · শ্রেণি {cls}-এর জন্য এনসিটিবি শিক্ষক সহায়ক',
                {
                  pathway: pathwayLabel,
                  subject: subjectLabel,
                  cls: formatDigits(selectedClass),
                }
              )}
              {selectedClass >= 9 && teacher.academicGroup ? ` (${td(teacher.academicGroup)})` : ''}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="min-w-[160px]">
              <label htmlFor="assistant-class-select" className="sr-only">
                {dt('Select target class', 'নির্ধারিত শ্রেণি নির্বাচন করুন')}
              </label>
              <select
                id="assistant-class-select"
                value={selectedClass}
                onChange={(e) => setSelectedClass(Number(e.target.value) as TeacherClassLevel)}
                className="w-full px-3.5 py-2 min-h-[42px] bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-sm font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-600"
              >
                {classOptions.map((cls) => (
                  <option key={cls} value={cls}>
                    {dt('Class {cls}', 'শ্রেণি {cls}', { cls: formatDigits(cls) })} · {subjectLabel}
                  </option>
                ))}
              </select>
            </div>

            {messages.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setMessages([]);
                  setErrorMsg(null);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 min-h-[42px] text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors whitespace-nowrap"
              >
                <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{dt('New Draft', 'নতুন খসড়া')}</span>
              </button>
            )}
          </div>
        </div>

        {/* Mode Segmented Toggle */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
          <div
            role="radiogroup"
            aria-label={dt('Teaching assistant mode', 'শিক্ষণ সহায়কের ধরন')}
            className="inline-flex flex-wrap items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl"
          >
            {modeTabs.map((item) => {
              const Icon = item.icon;
              const active = mode === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => {
                    setMode(item.id);
                    setActivePromptId(undefined);
                  }}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-2 min-h-[38px] text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                    active
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <PromptLibraryBar
          role="teacher"
          pathway={teacher.pathway}
          level={`Class ${selectedClass}`}
          trackOrDept={selectedClass >= 9 ? teacher.academicGroup : 'General'}
          subject={teacher.primarySubject}
          accent="teal"
          onApplyPrompt={(interpolated, template: PromptTemplateItem) => {
            if (
              template.recommendedMode === 'lesson_plan' ||
              template.recommendedMode === 'question_paper' ||
              template.recommendedMode === 'mcq_quiz' ||
              template.recommendedMode === 'rubric'
            ) {
              setMode(template.recommendedMode);
            }
            setActivePromptId(template.id);
            setInput(interpolated);
          }}
        />
      </section>

      {/* Conversation Workspace */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden flex flex-col min-h-[460px]">
        <div className="flex-1 p-5 sm:p-6 space-y-4 overflow-y-auto max-h-[520px]">
          {messages.length === 0 ? (
            <div className="py-8 max-w-2xl mx-auto text-center space-y-5">
              <div className="w-12 h-12 rounded-2xl bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800 flex items-center justify-center mx-auto">
                <Bot className="w-6 h-6 text-teal-700 dark:text-teal-400" aria-hidden="true" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {dt(
                    'Draft NCTB Teaching Materials for {subject}',
                    '{subject} বিষয়ের জন্য এনসিটিবি শিক্ষণ উপকরণ তৈরি করুন',
                    { subject: subjectLabel }
                  )}
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {dt(
                    'Generate 45-minute lesson plans, Creative Question (CQ) papers, board-style MCQ quizzes, or grading rubrics tailored to {pathway}.',
                    '{pathway} অনুযায়ী ৪৫ মিনিটের পাঠ পরিকল্পনা, সৃজনশীল প্রশ্নপত্র, বোর্ড-উপযোগী বহুনির্বাচনি কুইজ অথবা মূল্যায়ন রুব্রিক তৈরি করুন।',
                    { pathway: pathwayLabel }
                  )}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-left">
                {quickStarters.map((starter) => (
                  <button
                    key={starter.label}
                    type="button"
                    onClick={() => {
                      setMode(starter.mode);
                      void sendPrompt(starter.prompt, starter.mode);
                    }}
                    className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/70 hover:bg-teal-50 dark:hover:bg-teal-950/50 border border-slate-200 dark:border-slate-700 hover:border-teal-300 dark:hover:border-teal-700 text-left transition-colors"
                  >
                    <p className="text-xs font-semibold text-slate-900 dark:text-white">
                      {starter.label}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                      {starter.prompt}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-teal-700 dark:bg-teal-600 text-white rounded-br-sm'
                      : 'bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-bl-sm'
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                    <p
                      className={`text-[11px] font-semibold flex items-center gap-1.5 ${
                        msg.role === 'user'
                          ? 'text-teal-100'
                          : 'text-teal-700 dark:text-teal-400'
                      }`}
                    >
                      <span>
                        {msg.role === 'user'
                          ? dt(
                              'You · Class {cls} {subject}',
                              'আপনি · শ্রেণি {cls} {subject}',
                              {
                                cls: formatDigits(msg.academicClass),
                                subject: subjectLabel,
                              }
                            )
                          : dt('{title} · {pathway}', '{title} · {pathway}', {
                              title: td('AI Teaching Assistant'),
                              pathway: pathwayLabel,
                            })}
                      </span>
                      {msg.role === 'model' && msg.isFallback && (
                        <span className="px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 text-[10px] font-semibold">
                          {dt('Demo Fallback', 'ডেমো ব্যাকআপ')}
                        </span>
                      )}
                    </p>
                    {msg.role === 'model' && <CopyResponseButton text={msg.text} />}
                  </div>
                  <FormattedAiMessage text={msg.text} isUser={msg.role === 'user'} />
                </div>
              </div>
            ))
          )}

          {isLoading && (
            <div className="flex justify-start">
              <div className="inline-flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-600 dark:text-slate-300">
                <Loader2 className="w-4 h-4 animate-spin text-teal-600 dark:text-teal-400" aria-hidden="true" />
                <span>
                  {dt(
                    'Drafting {mode} for Class {cls}...',
                    'শ্রেণি {cls}-এর জন্য {mode} তৈরি হচ্ছে...',
                    {
                      mode: activeModeMeta.label,
                      cls: formatDigits(selectedClass),
                    }
                  )}
                </span>
              </div>
            </div>
          )}

          {errorMsg && (
            <div
              role="alert"
              className="flex items-start gap-2.5 p-3.5 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-red-900 dark:text-red-200 text-xs"
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-700 dark:text-red-400" aria-hidden="true" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div ref={threadEndRef} />
        </div>

        <form
          onSubmit={handleFormSubmit}
          className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/70 flex items-center gap-2.5"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={activeModeMeta.placeholder}
            aria-label={dt('Enter teaching assistant prompt', 'শিক্ষণ সহায়কের জন্য প্রম্পট লিখুন')}
            disabled={isLoading}
            className="flex-1 px-3.5 py-2.5 min-h-[44px] bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-600"
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 min-h-[44px] bg-teal-700 hover:bg-teal-800 disabled:opacity-50 dark:bg-teal-600 dark:hover:bg-teal-500 text-white text-sm font-semibold rounded-xl transition-colors whitespace-nowrap shrink-0"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
            ) : (
              <Send className="w-4 h-4" aria-hidden="true" />
            )}
            <span>{dt('Generate', 'তৈরি করুন')}</span>
          </button>
        </form>
      </section>
    </div>
  );
}
