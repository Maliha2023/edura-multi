import React, { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  BookOpenCheck,
  Bot,
  HelpCircle,
  ListChecks,
  Loader2,
  RotateCcw,
  Send,
} from 'lucide-react';
import {
  formatStudentContextBadge,
  type StudentProfileContext,
  type StudentSubject,
} from '../../services/studentService';
import { requestCurriculumAi } from '../../services/aiClient';
import { CopyResponseButton } from '../ai/CopyResponseButton';
import { FormattedAiMessage } from '../ai/FormattedAiMessage';
import { PromptLibraryBar } from '../ai/PromptLibraryBar';
import type { PromptTemplateItem } from '../../../lib/prompt-library';
import { useDashboardLanguage } from '../../i18n/useDashboardLanguage';

type TutorMode = 'ask' | 'summary' | 'practice';

interface TutorMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  mode: TutorMode;
  subject: string;
  isFallback?: boolean;
  timestamp: number;
}

interface StudentAiTutorTabProps {
  student: StudentProfileContext;
  subjects: StudentSubject[];
  initialSubject?: string | null;
  initialTopic?: string | null;
}

export function StudentAiTutorTab({
  student,
  subjects,
  initialSubject,
  initialTopic,
}: StudentAiTutorTabProps) {
  const { dt, td } = useDashboardLanguage();
  const [selectedSubject, setSelectedSubject] = useState<string>(
    initialSubject || subjects[0]?.name || 'General Studies'
  );
  const [mode, setMode] = useState<TutorMode>('ask');
  const [input, setInput] = useState(
    initialTopic ? `Explain "${initialTopic}" step by step with an NCTB board exam example.` : ''
  );
  const [messages, setMessages] = useState<TutorMessage[]>([]);
  const [activePromptId, setActivePromptId] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const threadEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (initialSubject) {
      setSelectedSubject(initialSubject);
    }
  }, [initialSubject]);

  useEffect(() => {
    if (initialTopic) {
      setInput(`Explain "${initialTopic}" step by step with an NCTB board exam example.`);
    }
  }, [initialTopic]);

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [messages, isLoading]);

  const contextLabel = formatStudentContextBadge(
    student.pathway,
    student.academicClass,
    student.academicGroup
  );

  const quickPrompts: { label: string; mode: TutorMode; prompt: string }[] = [
    {
      label: dt('Explain core concepts', 'মূল ধারণা ব্যাখ্যা করুন'),
      mode: 'ask',
      prompt: `Explain the most important foundational concept in ${selectedSubject} for Class ${student.academicClass} with a simple example.`,
    },
    {
      label: dt('Chapter revision summary', 'অধ্যায়ের সংক্ষিপ্তসার'),
      mode: 'summary',
      prompt: `Create a concise revision summary of the key chapters and formulas in ${selectedSubject} for Class ${student.academicClass}.`,
    },
    {
      label: dt('3 board-style practice questions', '৩টি বোর্ড-মানের অনুশীলন প্রশ্ন'),
      mode: 'practice',
      prompt: `Give me 3 NCTB board-style practice questions for ${selectedSubject} (Class ${student.academicClass}) with step-by-step answers.`,
    },
  ];

  const sendPrompt = async (promptText: string, activeMode: TutorMode = mode) => {
    const trimmed = promptText.trim();
    if (!trimmed || isLoading) return;

    setErrorMsg(null);
    const userMsg: TutorMessage = {
      id: `usr-${Date.now()}`,
      role: 'user',
      text: trimmed,
      mode: activeMode,
      subject: selectedSubject,
      timestamp: Date.now(),
    };

    const nextHistory = [...messages, userMsg];
    setMessages(nextHistory);
    setInput('');
    setIsLoading(true);

    try {
      const result = await requestCurriculumAi({
        endpoint: '/api/student/ai-tutor',
        role: 'student',
        pathway: student.pathway,
        level: `Class ${student.academicClass}`,
        trackOrDept: student.academicGroup,
        subject: selectedSubject,
        mode: activeMode,
        prompt: trimmed,
        promptId: activePromptId,
        payload: {
          pathway: student.pathway,
          academicClass: student.academicClass,
          academicGroup: student.academicGroup,
          subject: selectedSubject,
          mode: activeMode,
          prompt: trimmed,
          history: messages.slice(-6).map((m) => ({ role: m.role, text: m.text })),
        },
      });

      const modelMsg: TutorMessage = {
        id: `ai-${Date.now()}`,
        role: 'model',
        text: result.reply,
        mode: activeMode,
        subject: selectedSubject,
        isFallback: result.isFallback,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, modelMsg]);
      setActivePromptId(undefined);
    } catch {
      setErrorMsg(
        dt(
          'Network error while connecting to the AI Study Tutor. Please try again.',
          'এআই স্টাডি টিউটরের সাথে সংযোগ করতে নেটওয়ার্ক ত্রুটি হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।'
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void sendPrompt(input, mode);
  };

  const modeTabs: {
    id: TutorMode;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }[] = [
    { id: 'ask', label: td('Ask a Question'), icon: HelpCircle },
    { id: 'summary', label: td('Generate Summary'), icon: BookOpenCheck },
    { id: 'practice', label: td('Practice Quiz'), icon: ListChecks },
  ];

  return (
    <div className="space-y-5">
      {/* Scope Controls Bar */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              {td('AI Study Tutor')}
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-0.5">
              {dt(
                'Curriculum-aware study support scoped to {context}.',
                '{context}-এর পাঠ্যক্রমভিত্তিক পড়াশোনার সহায়তা।',
                { context: td(contextLabel) }
              )}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="min-w-[210px]">
              <label htmlFor="tutor-subject-select" className="sr-only">
                {td('Select Subject')}
              </label>
              <select
                id="tutor-subject-select"
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="w-full px-3.5 py-2 min-h-[42px] bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-sm font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-600"
              >
                {subjects.map((subj) => (
                  <option key={subj.id} value={subj.name}>
                    {subj.name}
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
                <span>{td('New Session')}</span>
              </button>
            )}
          </div>
        </div>

        {/* Mode Segmented Toggle */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
          <div
            role="radiogroup"
            aria-label={td('Study mode')}
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
          role="student"
          pathway={student.pathway}
          level={`Class ${student.academicClass}`}
          trackOrDept={student.academicGroup}
          subject={selectedSubject}
          accent="emerald"
          onApplyPrompt={(interpolated, template: PromptTemplateItem) => {
            if (
              template.recommendedMode === 'ask' ||
              template.recommendedMode === 'summary' ||
              template.recommendedMode === 'practice'
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
            <div className="py-8 max-w-xl mx-auto text-center space-y-5">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center mx-auto">
                <Bot className="w-6 h-6 text-emerald-700 dark:text-emerald-400" aria-hidden="true" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {dt('Ask anything about {subject}', '{subject} সম্পর্কে যেকোনো প্রশ্ন করুন', {
                    subject: selectedSubject,
                  })}
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {dt(
                    'Get step-by-step explanations, chapter summaries, or board-style practice questions tailored to {context}.',
                    '{context}-এর উপযোগী ধাপে ধাপে ব্যাখ্যা, অধ্যায়ের সারসংক্ষেপ বা বোর্ড-মানের অনুশীলন প্রশ্ন পান।',
                    { context: td(contextLabel) }
                  )}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-left">
                {quickPrompts.map((qp) => (
                  <button
                    key={qp.label}
                    type="button"
                    onClick={() => {
                      setMode(qp.mode);
                      void sendPrompt(qp.prompt, qp.mode);
                    }}
                    className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/50 hover:border-emerald-400 dark:hover:border-emerald-600 transition-colors"
                  >
                    <p className="text-xs font-semibold text-slate-900 dark:text-white">
                      {qp.label}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                      {qp.prompt}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-emerald-700 dark:bg-emerald-600 text-white rounded-tr-xs'
                        : 'bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-tl-xs'
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                      <div
                        className={`text-[11px] font-medium flex items-center gap-1.5 ${
                          msg.role === 'user'
                            ? 'text-emerald-100'
                            : 'text-slate-500 dark:text-slate-400'
                        }`}
                      >
                        <span>
                          {msg.role === 'user' ? td('You') : td('AI Study Tutor')} · {msg.subject}
                        </span>
                        {msg.role === 'model' && msg.isFallback && (
                          <span className="px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 text-[10px] font-semibold">
                            {td('Demo Fallback')}
                          </span>
                        )}
                      </div>
                      {msg.role === 'model' && <CopyResponseButton text={msg.text} />}
                    </div>
                    <FormattedAiMessage text={msg.text} isUser={msg.role === 'user'} />
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex justify-start">
                  <div className="inline-flex items-center gap-2.5 px-4 py-3 rounded-2xl rounded-tl-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-sm text-slate-600 dark:text-slate-300">
                    <Loader2 className="w-4 h-4 animate-spin text-emerald-700 dark:text-emerald-400" aria-hidden="true" />
                    <span>
                      {dt('Preparing your {subject} explanation...', '{subject}-এর ব্যাখ্যা তৈরি হচ্ছে...', {
                        subject: selectedSubject,
                      })}
                    </span>
                  </div>
                </div>
              )}
              <div ref={threadEndRef} />
            </div>
          )}

          {errorMsg && (
            <div
              role="alert"
              className="flex items-start gap-2.5 p-3.5 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-red-900 dark:text-red-200 text-sm"
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-700 dark:text-red-400" aria-hidden="true" />
              <span>{errorMsg}</span>
            </div>
          )}
        </div>

        {/* Input Composer */}
        <form
          onSubmit={handleSubmit}
          className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/80 flex flex-col sm:flex-row gap-2.5"
        >
          <label htmlFor="ai-tutor-prompt-input" className="sr-only">
            {td('Ask your AI Study Tutor')}
          </label>
          <input
            id="ai-tutor-prompt-input"
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isLoading}
            placeholder={
              mode === 'summary'
                ? dt(
                    'Enter a chapter or topic in {subject} to summarize...',
                    'সারসংক্ষেপের জন্য {subject}-এর একটি অধ্যায় বা বিষয় লিখুন...',
                    { subject: selectedSubject }
                  )
                : mode === 'practice'
                  ? dt(
                      'Enter a topic in {subject} to generate practice questions...',
                      'অনুশীলন প্রশ্ন তৈরির জন্য {subject}-এর একটি বিষয় লিখুন...',
                      { subject: selectedSubject }
                    )
                  : dt('Ask a question about {subject}...', '{subject} সম্পর্কে প্রশ্ন করুন...', {
                      subject: selectedSubject,
                    })
            }
            className="flex-1 px-4 py-2.5 min-h-[44px] bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-600"
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 min-h-[44px] bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white text-sm font-semibold rounded-xl transition-colors whitespace-nowrap shrink-0"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
            ) : (
              <Send className="w-4 h-4" aria-hidden="true" />
            )}
            <span>{td('Send')}</span>
          </button>
        </form>
      </section>
    </div>
  );
}
