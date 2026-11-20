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
import { getShortLevelLabel } from '../../services/internationalAdminService';
import {
  formatIntlStudentContextBadge,
  getIntlStudentPathwayLabel,
  type IntlStudentContext,
  type IntlStudentSubject,
} from '../../services/internationalStudentService';
import { requestCurriculumAi } from '../../services/aiClient';
import { CopyResponseButton } from '../ai/CopyResponseButton';
import { FormattedAiMessage } from '../ai/FormattedAiMessage';
import { PromptLibraryBar } from '../ai/PromptLibraryBar';
import type { PromptTemplateItem } from '../../../lib/prompt-library';
import { useDashboardLanguage } from '../../i18n/useDashboardLanguage';

type IntlTutorMode = 'ask' | 'summary' | 'practice';

interface IntlTutorMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  mode: IntlTutorMode;
  subject: string;
  isFallback?: boolean;
  timestamp: number;
}

interface IntlStudentAiTutorTabProps {
  student: IntlStudentContext;
  subjects: IntlStudentSubject[];
  initialSubject?: string | null;
  initialTopic?: string | null;
}

export function IntlStudentAiTutorTab({
  student,
  subjects,
  initialSubject,
  initialTopic,
}: IntlStudentAiTutorTabProps) {
  const { dt, td } = useDashboardLanguage();

  const pathwayLabel = td(getIntlStudentPathwayLabel(student.pathway));
  const shortLevel = td(getShortLevelLabel(student.academicLevel));
  const examStyleLabel =
    student.pathway === 'cambridge'
      ? 'Cambridge CAIE past-paper'
      : 'Pearson Edexcel past-paper';
  const examStyleDisplay = td(examStyleLabel);

  const [selectedSubject, setSelectedSubject] = useState<string>(
    initialSubject || subjects[0]?.name || `${pathwayLabel} Mathematics`
  );
  const [mode, setMode] = useState<IntlTutorMode>('ask');
  const [input, setInput] = useState(
    initialTopic
      ? `Explain "${initialTopic}" step by step with a ${examStyleLabel} worked example.`
      : ''
  );
  const [messages, setMessages] = useState<IntlTutorMessage[]>([]);
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
      setInput(
        `Explain "${initialTopic}" step by step with a ${examStyleLabel} worked example.`
      );
    }
  }, [initialTopic, examStyleLabel]);

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [messages, isLoading]);

  const contextLabel = formatIntlStudentContextBadge(
    student.pathway,
    student.academicLevel,
    student.academicTrack
  )
    .split(' · ')
    .map((part) => td(part))
    .join(' · ');

  const activeSubjectObj = subjects.find((s) => s.name === selectedSubject);
  const subjectCodeSuffix = activeSubjectObj ? ` (${activeSubjectObj.code})` : '';

  const quickPrompts: { label: string; mode: IntlTutorMode; prompt: string }[] = [
    {
      label: td('Explain core syllabus concept'),
      mode: 'ask',
      prompt: `Explain the highest-yield foundational topic in ${selectedSubject}${subjectCodeSuffix} for ${getIntlStudentPathwayLabel(student.pathway)} ${getShortLevelLabel(student.academicLevel)} with a clear mark-scheme worked example.`,
    },
    {
      label: td('Syllabus revision sheet'),
      mode: 'summary',
      prompt: `Create a concise ${getIntlStudentPathwayLabel(student.pathway)} ${getShortLevelLabel(student.academicLevel)} revision summary for ${selectedSubject}${subjectCodeSuffix} covering key definitions, formulas, and examiner tips.`,
    },
    {
      label: td('3 past-paper practice questions'),
      mode: 'practice',
      prompt: `Generate 3 ${examStyleLabel} questions for ${selectedSubject}${subjectCodeSuffix} (${getShortLevelLabel(student.academicLevel)}) with mark allocations and a step-by-step mark scheme.`,
    },
  ];

  const sendPrompt = async (promptText: string, activeMode: IntlTutorMode = mode) => {
    const trimmed = promptText.trim();
    if (!trimmed || isLoading) return;

    setErrorMsg(null);
    const userMsg: IntlTutorMessage = {
      id: `intl-usr-${Date.now()}`,
      role: 'user',
      text: trimmed,
      mode: activeMode,
      subject: selectedSubject,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const result = await requestCurriculumAi({
        endpoint: '/api/student-intl/ai-tutor',
        role: 'student',
        pathway: student.pathway,
        level: student.academicLevel,
        trackOrDept: student.academicTrack,
        subject: `${selectedSubject}${subjectCodeSuffix}`,
        mode: activeMode,
        prompt: trimmed,
        promptId: activePromptId,
        payload: {
          pathway: student.pathway,
          academicLevel: student.academicLevel,
          academicTrack: student.academicTrack,
          subject: `${selectedSubject}${subjectCodeSuffix}`,
          mode: activeMode,
          prompt: trimmed,
          history: messages.slice(-6).map((m) => ({ role: m.role, text: m.text })),
        },
      });

      const modelMsg: IntlTutorMessage = {
        id: `intl-ai-${Date.now()}`,
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
        td('Network error while connecting to the AI Study Tutor. Please try again.')
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
    id: IntlTutorMode;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }[] = [
    { id: 'ask', label: td('Ask a Question'), icon: HelpCircle },
    { id: 'summary', label: td('Generate Summary'), icon: BookOpenCheck },
    { id: 'practice', label: td('Past-Paper Practice'), icon: ListChecks },
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
                'Syllabus-aware study guidance and mark-scheme coaching for {context}.',
                '{context}-এর জন্য সিলেবাস-ভিত্তিক পড়াশোনার দিকনির্দেশনা ও মার্ক-স্কিম কোচিং।',
                { context: contextLabel }
              )}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="min-w-[230px]">
              <label htmlFor="intl-tutor-subject-select" className="sr-only">
                {td('Select subject')}
              </label>
              <select
                id="intl-tutor-subject-select"
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="w-full px-3.5 py-2 min-h-[42px] bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-sm font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-600"
              >
                {subjects.map((subj) => (
                  <option key={subj.id} value={subj.name}>
                    {subj.code} · {subj.name}
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
          level={student.academicLevel}
          trackOrDept={student.academicTrack}
          subject={`${selectedSubject}${subjectCodeSuffix}`}
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
                  {dt('Study {subject} with AI Tutor', 'এআই টিউটরের সাথে {subject} অধ্যয়ন করুন', {
                    subject: selectedSubject,
                  })}
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {dt(
                    'Get step-by-step explanations, examiner revision notes, or {examStyle} practice questions tailored to {context}.',
                    '{context}-এর উপযোগী ধাপে ধাপে ব্যাখ্যা, পরীক্ষকের রিভিশন নোট অথবা {examStyle} অনুশীলন প্রশ্ন পান।',
                    { examStyle: examStyleDisplay, context: contextLabel }
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
                          {msg.role === 'user'
                            ? td('You')
                            : dt('{pathway} AI Study Tutor', '{pathway} এআই স্টাডি টিউটর', {
                                pathway: pathwayLabel,
                              })}{' '}
                          · {msg.subject}
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
                    <Loader2
                      className="w-4 h-4 animate-spin text-emerald-700 dark:text-emerald-400"
                      aria-hidden="true"
                    />
                    <span>
                      {dt(
                        'Preparing your {subject} response...',
                        'আপনার {subject} উত্তর তৈরি হচ্ছে...',
                        { subject: selectedSubject }
                      )}
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
              <AlertCircle
                className="w-4 h-4 shrink-0 mt-0.5 text-red-700 dark:text-red-400"
                aria-hidden="true"
              />
              <span>{errorMsg}</span>
            </div>
          )}
        </div>

        {/* Input Composer */}
        <form
          onSubmit={handleSubmit}
          className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/80 flex flex-col sm:flex-row gap-2.5"
        >
          <label htmlFor="intl-ai-tutor-prompt-input" className="sr-only">
            {td('Ask your AI Study Tutor')}
          </label>
          <input
            id="intl-ai-tutor-prompt-input"
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isLoading}
            placeholder={
              mode === 'summary'
                ? dt(
                    'Enter a syllabus unit in {subject} to summarize...',
                    'সারাংশ পেতে {subject}-এর একটি সিলেবাস অধ্যায় লিখুন...',
                    { subject: selectedSubject }
                  )
                : mode === 'practice'
                  ? dt(
                      'Enter a topic in {subject} for {examStyle} questions...',
                      '{examStyle} প্রশ্নের জন্য {subject}-এর একটি বিষয় লিখুন...',
                      { subject: selectedSubject, examStyle: examStyleDisplay }
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
