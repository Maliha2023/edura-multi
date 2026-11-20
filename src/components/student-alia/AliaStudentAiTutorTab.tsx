import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  BookOpen,
  HelpCircle,
  ListChecks,
  Loader2,
  Send,
  Sparkles,
  Trash2,
} from 'lucide-react';
import {
  formatAliaStudentContextBadge,
  getShortMarhalaLabel,
  type AliaStudentContext,
  type AliaStudentSubject,
} from '../../services/aliaStudentService';
import { requestCurriculumAi } from '../../services/aiClient';
import { CopyResponseButton } from '../ai/CopyResponseButton';
import { FormattedAiMessage } from '../ai/FormattedAiMessage';
import { PromptLibraryBar } from '../ai/PromptLibraryBar';
import type { PromptTemplateItem } from '../../../lib/prompt-library';
import { useDashboardLanguage } from '../../i18n/useDashboardLanguage';

export type AliaTutorMode = 'ask' | 'summary' | 'practice';

interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  mode: AliaTutorMode;
  subject: string;
  isFallback?: boolean;
}

interface AliaStudentAiTutorTabProps {
  student: AliaStudentContext;
  subjects: AliaStudentSubject[];
  initialSubject?: string;
  initialPrompt?: string;
  initialMode?: AliaTutorMode;
  onClearPreset?: () => void;
}

export function AliaStudentAiTutorTab({
  student,
  subjects,
  initialSubject,
  initialPrompt,
  initialMode,
  onClearPreset,
}: AliaStudentAiTutorTabProps) {
  const { dt, td } = useDashboardLanguage();

  const [selectedSubject, setSelectedSubject] = useState<string>(
    initialSubject || subjects[0]?.name || 'Quran Majeed & Tajweed'
  );
  const [mode, setMode] = useState<AliaTutorMode>(initialMode || 'ask');
  const [prompt, setPrompt] = useState<string>(initialPrompt || '');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [activePromptId, setActivePromptId] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (initialSubject) setSelectedSubject(initialSubject);
    if (initialMode) setMode(initialMode);
    if (initialPrompt) setPrompt(initialPrompt);
    if (initialSubject || initialPrompt || initialMode) {
      onClearPreset?.();
    }
  }, [initialSubject, initialPrompt, initialMode, onClearPreset]);

  const rawShortMarhala = getShortMarhalaLabel(student.marhala);
  const shortMarhala = td(rawShortMarhala);
  const deptLabel = td(student.department);
  const contextBadge = formatAliaStudentContextBadge(student.marhala, student.department)
    .split(' • ')
    .map((part) => td(part))
    .join(' • ');

  const quickPrompts: { label: string; mode: AliaTutorMode; text: string }[] = [
    {
      label: td('Explain a Core Concept'),
      mode: 'ask',
      text: `Explain a key ${rawShortMarhala} ${selectedSubject} concept step by step with clear examples and Arabic/board terminology.`,
    },
    {
      label: td('Generate Revision Summary'),
      mode: 'summary',
      text: `Generate a structured BMEB ${rawShortMarhala} (${student.department}) revision summary for ${selectedSubject} with key definitions and exam tips.`,
    },
    {
      label: td('BMEB Board Practice Quiz'),
      mode: 'practice',
      text: `Create 3 BMEB ${rawShortMarhala}-style practice questions (short + structured) for ${selectedSubject} with an Answer Key.`,
    },
  ];

  const handleSend = async (overridePrompt?: string, overrideMode?: AliaTutorMode) => {
    const activePrompt = (overridePrompt ?? prompt).trim();
    const activeMode = overrideMode ?? mode;
    if (!activePrompt || loading) return;

    setErrorMsg(null);
    const userMessage: ChatMessage = {
      id: `usr-${Date.now()}`,
      role: 'user',
      text: activePrompt,
      mode: activeMode,
      subject: selectedSubject,
    };

    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    if (!overridePrompt) setPrompt('');
    setLoading(true);

    try {
      const result = await requestCurriculumAi({
        endpoint: '/api/student-alia/ai-tutor',
        role: 'student',
        pathway: 'alia',
        level: student.marhala,
        trackOrDept: student.department,
        subject: selectedSubject,
        mode: activeMode,
        prompt: activePrompt,
        promptId: activePromptId,
        payload: {
          marhala: student.marhala,
          department: student.department,
          subject: selectedSubject,
          mode: activeMode,
          prompt: activePrompt,
          history: nextMessages.slice(-6).map((m) => ({ role: m.role, text: m.text })),
        },
      });

      setMessages((prev) => [
        ...prev,
        {
          id: `mdl-${Date.now()}`,
          role: 'model',
          text: result.reply,
          mode: activeMode,
          subject: selectedSubject,
          isFallback: result.isFallback,
        },
      ]);
      setActivePromptId(undefined);
    } catch {
      setErrorMsg(
        td('Network error contacting the Alia AI Study Tutor. Please check your connection.')
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
              <h1 className="text-xl font-bold text-slate-900 dark:text-white">
                {td('Alia Madrasa AI Study Tutor')}
              </h1>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              {dt(
                'Tailored to {context} · BMEB & IAU syllabus concepts, Tafsir/Hadith terminology, and exam preparation.',
                '{context}-এর উপযোগী · বিএমইবি ও ইসলামি আরবি বিশ্ববিদ্যালয় সিলেবাস, তাফসীর/হাদিস পরিভাষা এবং পরীক্ষার প্রস্তুতি।',
                { context: contextBadge }
              )}
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <label htmlFor="alia-tutor-subject" className="sr-only">
              {td('Select Subject')}
            </label>
            <select
              id="alia-tutor-subject"
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="px-3.5 py-2 min-h-[42px] bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-600"
            >
              {subjects.map((subj) => (
                <option key={subj.id} value={subj.name}>
                  {subj.name} ({subj.code})
                </option>
              ))}
            </select>
            {messages.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setMessages([]);
                  setErrorMsg(null);
                }}
                aria-label={td('Clear conversation')}
                className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[42px] rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                <span className="hidden sm:inline">{td('Clear')}</span>
              </button>
            )}
          </div>
        </div>

        {/* 3 Mode Tabs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {[
            {
              id: 'ask' as AliaTutorMode,
              label: td('Ask a Question'),
              desc: td('Step-by-step syllabus explanation'),
              icon: HelpCircle,
            },
            {
              id: 'summary' as AliaTutorMode,
              label: td('Generate Summary'),
              desc: td('Key terms, verses & takeaways'),
              icon: BookOpen,
            },
            {
              id: 'practice' as AliaTutorMode,
              label: td('Practice Quiz'),
              desc: td('BMEB exam questions & key'),
              icon: ListChecks,
            },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = mode === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setMode(tab.id)}
                className={`p-3.5 rounded-xl border text-left transition-colors ${
                  active
                    ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-400 dark:border-emerald-700'
                    : 'bg-slate-50/70 dark:bg-slate-950/50 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Icon
                    className={`w-4 h-4 ${
                      active
                        ? 'text-emerald-700 dark:text-emerald-400'
                        : 'text-slate-500 dark:text-slate-400'
                    }`}
                  />
                  <span
                    className={`text-sm font-semibold ${
                      active
                        ? 'text-emerald-900 dark:text-emerald-200'
                        : 'text-slate-800 dark:text-slate-200'
                    }`}
                  >
                    {tab.label}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{tab.desc}</p>
              </button>
            );
          })}
        </div>

        {/* Quick Prompt Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {quickPrompts.map((qp) => (
            <button
              key={qp.label}
              type="button"
              onClick={() => {
                setMode(qp.mode);
                setPrompt(qp.text);
              }}
              className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 hover:border-emerald-300 dark:hover:border-emerald-700 text-left transition-colors"
            >
              <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                {qp.label}
              </p>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 line-clamp-2">
                {qp.text}
              </p>
            </button>
          ))}
        </div>

        <PromptLibraryBar
          role="student"
          pathway="alia"
          level={student.marhala}
          trackOrDept={student.department}
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
            setPrompt(interpolated);
          }}
        />
      </section>

      {/* Conversation Workspace */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden flex flex-col">
        <div className="p-5 sm:p-6 space-y-4 min-h-[280px] max-h-[480px] overflow-y-auto">
          {messages.length === 0 ? (
            <div className="h-full min-h-[220px] flex flex-col items-center justify-center text-center max-w-md mx-auto">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 flex items-center justify-center mb-3">
                <Sparkles className="w-6 h-6" aria-hidden="true" />
              </div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {dt('Ready for {subject}', '{subject}-এর জন্য প্রস্তুত', {
                  subject: selectedSubject,
                })}
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1.5 leading-relaxed">
                {dt(
                  'Ask about Tajweed rules, Nahw & Sarf grammar, Hadith terminology, Fiqh principles, or {dept} board exam problems.',
                  'তাজবীদ নিয়ম, নাহু ও সরফ ব্যাকরণ, হাদিসের পরিভাষা, ফিকহ নীতিমালা বা {dept} বোর্ড পরীক্ষার সমস্যা সম্পর্কে প্রশ্ন করুন।',
                  { dept: deptLabel }
                )}
              </p>
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
                      ? 'bg-emerald-700 text-white'
                      : 'bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200'
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                    <p
                      className={`text-[11px] font-semibold flex items-center gap-1.5 ${
                        msg.role === 'user'
                          ? 'text-emerald-100'
                          : 'text-emerald-700 dark:text-emerald-400'
                      }`}
                    >
                      <span>
                        {msg.role === 'user'
                          ? `${td('You')} · ${msg.subject}`
                          : `${td('Alia AI Tutor')} · ${msg.subject}`}
                      </span>
                      {msg.role === 'model' && msg.isFallback && (
                        <span className="px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 text-[10px] font-semibold">
                          {td('Demo Fallback')}
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

          {loading && (
            <div className="flex justify-start">
              <div className="inline-flex items-center gap-2 px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-600 dark:text-slate-300">
                <Loader2 className="w-4 h-4 animate-spin text-emerald-600" aria-hidden="true" />
                <span>
                  {dt('Preparing {marhala} study guidance…', '{marhala} অধ্যয়নের দিকনির্দেশনা তৈরি হচ্ছে…', {
                    marhala: shortMarhala,
                  })}
                </span>
              </div>
            </div>
          )}
        </div>

        {errorMsg && (
          <div
            role="alert"
            className="mx-5 mb-4 flex items-start gap-2.5 p-3.5 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-xs sm:text-sm text-red-900 dark:text-red-200"
          >
            <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            void handleSend();
          }}
          className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/60 flex flex-col sm:flex-row gap-2.5"
        >
          <label htmlFor="alia-tutor-prompt" className="sr-only">
            {td('Ask your Alia Madrasa study question')}
          </label>
          <input
            id="alia-tutor-prompt"
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={dt('Ask about {subject} ({marhala})…', '{subject} ({marhala}) সম্পর্কে প্রশ্ন করুন…', {
              subject: selectedSubject,
              marhala: shortMarhala,
            })}
            className="flex-1 px-4 py-2.5 min-h-[44px] bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-600"
          />
          <button
            type="submit"
            disabled={loading || !prompt.trim()}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 min-h-[44px] bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors shrink-0"
          >
            <Send className="w-4 h-4" aria-hidden="true" />
            <span>{td('Send')}</span>
          </button>
        </form>
      </section>
    </div>
  );
}
