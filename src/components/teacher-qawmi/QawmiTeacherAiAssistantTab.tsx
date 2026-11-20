import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  BookOpenCheck,
  ClipboardList,
  FileText,
  HelpCircle,
  Loader2,
  Send,
  Sparkles,
  Trash2,
} from 'lucide-react';
import {
  QAWMI_TEACHER_MARHALA_OPTIONS,
  QAWMI_TEACHER_PRIMARY_SUBJECTS,
  getShortQawmiTeacherMarhalaLabel,
  type QawmiTeacherContext,
  type QawmiTeacherMarhala,
} from '../../services/qawmiTeacherService';
import { requestCurriculumAi } from '../../services/aiClient';
import { CopyResponseButton } from '../ai/CopyResponseButton';
import { FormattedAiMessage } from '../ai/FormattedAiMessage';
import { PromptLibraryBar } from '../ai/PromptLibraryBar';
import type { PromptTemplateItem } from '../../../lib/prompt-library';

type QawmiAiMode = 'lesson_plan' | 'tarkeeb_sharah' | 'mcq_oral_quiz' | 'rubric';

interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  mode: QawmiAiMode;
  text: string;
  isFallback?: boolean;
}

interface QawmiTeacherAiAssistantTabProps {
  teacher: QawmiTeacherContext;
  initialTopic?: string | null;
  initialMarhala?: QawmiTeacherMarhala | null;
}

const MODE_OPTIONS: {
  id: QawmiAiMode;
  label: string;
  description: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
}[] = [
  {
    id: 'lesson_plan',
    label: 'Dars / Lesson Plan',
    description: '45-min Dars-e-Nizami flow',
    icon: BookOpenCheck,
  },
  {
    id: 'tarkeeb_sharah',
    label: 'Tarkeeb & Sharah Notes',
    description: 'Ibarat, Tarkeeb & Dalil',
    icon: FileText,
  },
  {
    id: 'mcq_oral_quiz',
    label: 'MCQ / Oral Quiz',
    description: '5 Befaq MCQs + Shifah',
    icon: HelpCircle,
  },
  {
    id: 'rubric',
    label: 'Evaluation Rubric',
    description: 'Takrar & Imtihan bands',
    icon: ClipboardList,
  },
];

export function QawmiTeacherAiAssistantTab({
  teacher,
  initialTopic,
  initialMarhala,
}: QawmiTeacherAiAssistantTabProps) {
  const [selectedMarhala, setSelectedMarhala] = useState<QawmiTeacherMarhala>(
    initialMarhala ?? teacher.assignedMarhalas[0] ?? 'Mutawassitah (Middle Marhala)'
  );
  const [selectedSubject, setSelectedSubject] = useState<string>(teacher.primarySubject);
  const [mode, setMode] = useState<QawmiAiMode>('lesson_plan');
  const [prompt, setPrompt] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [activePromptId, setActivePromptId] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (initialMarhala) {
      setSelectedMarhala(initialMarhala);
    }
    if (initialTopic) {
      setPrompt(`Prepare a structured Qawmi Madrasa Dars guide for: ${initialTopic}`);
    }
  }, [initialTopic, initialMarhala]);

  const shortMarhala = getShortQawmiTeacherMarhalaLabel(selectedMarhala);

  const quickStarters: { title: string; mode: QawmiAiMode; text: string }[] = [
    {
      title: `${shortMarhala} 45-Min Dars Plan`,
      mode: 'lesson_plan',
      text: `Create a 45-minute Dars-e-Nizami lesson plan for ${shortMarhala} (${selectedSubject}) covering Sabak review, Ibarat reading, key Arabic terminology, and evening Takrar tasks.`,
    },
    {
      title: 'Ibarat, Tarkeeb & Sharah Notes',
      mode: 'tarkeeb_sharah',
      text: `Prepare concise Tarkeeb & Sharah commentary notes for ${shortMarhala} (${selectedSubject}) highlighting Arabic syntax, classical commentary pointers, and Dalil references.`,
    },
    {
      title: '5 Befaq MCQs + Shifah Oral Prompts',
      mode: 'mcq_oral_quiz',
      text: `Draft 5 Befaq-aligned MCQs plus 2 Shifah (oral) viva questions for ${shortMarhala} (${selectedSubject}) with an answer key and brief explanations.`,
    },
    {
      title: 'Takrar & Imtihan Evaluation Rubric',
      mode: 'rubric',
      text: `Build a clear Qawmi Madrasa evaluation rubric for ${shortMarhala} (${selectedSubject}) grading Ibarat fluency, Tarkeeb accuracy, Sabak retention, and Dalil precision.`,
    },
  ];

  const sendPrompt = async (overrideText?: string, overrideMode?: QawmiAiMode) => {
    const cleanPrompt = (overrideText ?? prompt).trim();
    const activeMode = overrideMode ?? mode;
    if (!cleanPrompt || loading) return;

    setErrorMsg(null);
    setLoading(true);
    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      mode: activeMode,
      text: cleanPrompt,
    };
    setMessages((prev) => [...prev, userMsg]);
    setPrompt('');

    try {
      const result = await requestCurriculumAi({
        endpoint: '/api/teacher-qawmi/ai-assistant',
        role: 'teacher',
        pathway: 'qawmi',
        level: selectedMarhala,
        trackOrDept: teacher.focusBranch,
        subject: selectedSubject,
        mode: activeMode,
        prompt: cleanPrompt,
        promptId: activePromptId,
        payload: {
          marhala: selectedMarhala,
          focusBranch: teacher.focusBranch,
          subject: selectedSubject,
          mode: activeMode,
          prompt: cleanPrompt,
          history: messages.slice(-6).map((m) => ({ role: m.role, text: m.text })),
        },
      });

      setMessages((prev) => [
        ...prev,
        {
          id: `m-${Date.now()}`,
          role: 'model',
          mode: activeMode,
          text: result.reply,
          isFallback: result.isFallback,
        },
      ]);
      setActivePromptId(undefined);
    } catch {
      setErrorMsg('Network error contacting the Qawmi Madrasa AI Teaching Assistant.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void sendPrompt();
  };

  return (
    <div className="space-y-6">
      {/* Header + Marhala/Kitab Controls */}
      <section className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800 text-teal-700 dark:text-teal-300 flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5" aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Qawmi Madrasa AI Teaching Assistant
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Tailored to Dars-e-Nizami, Befaqul Madarisil Arabia &amp; Al-Haiatul Ulya teaching
                standards
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 lg:w-[460px]">
            <div>
              <label
                htmlFor="qawmi-ai-marhala"
                className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1"
              >
                Target Marhala
              </label>
              <select
                id="qawmi-ai-marhala"
                value={selectedMarhala}
                onChange={(e) => setSelectedMarhala(e.target.value as QawmiTeacherMarhala)}
                className="w-full px-3 py-2 min-h-[40px] bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-600"
              >
                {QAWMI_TEACHER_MARHALA_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="qawmi-ai-subject"
                className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1"
              >
                Kitab / Subject Area
              </label>
              <select
                id="qawmi-ai-subject"
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="w-full px-3 py-2 min-h-[40px] bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-600"
              >
                {QAWMI_TEACHER_PRIMARY_SUBJECTS.map((subj) => (
                  <option key={subj} value={subj}>
                    {subj}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* 4 Mode Radio Tabs */}
        <div
          role="radiogroup"
          aria-label="Qawmi AI Teaching Assistant Mode"
          className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3"
        >
          {MODE_OPTIONS.map((item) => {
            const Icon = item.icon;
            const active = mode === item.id;
            return (
              <button
                key={item.id}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setMode(item.id)}
                className={`p-3.5 rounded-xl border text-left transition-colors flex items-start gap-3 ${
                  active
                    ? 'bg-teal-50 dark:bg-teal-950/60 border-teal-500 dark:border-teal-500 text-teal-950 dark:text-teal-100'
                    : 'bg-slate-50/70 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Icon
                  className={`w-4 h-4 mt-0.5 shrink-0 ${
                    active ? 'text-teal-700 dark:text-teal-300' : 'text-slate-500 dark:text-slate-400'
                  }`}
                  aria-hidden="true"
                />
                <div className="min-w-0">
                  <p className="text-xs font-bold leading-snug">{item.label}</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    {item.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        <PromptLibraryBar
          role="teacher"
          pathway="qawmi"
          level={selectedMarhala}
          trackOrDept={teacher.focusBranch}
          subject={selectedSubject}
          accent="teal"
          onApplyPrompt={(interpolated, template: PromptTemplateItem) => {
            if (
              template.recommendedMode === 'lesson_plan' ||
              template.recommendedMode === 'tarkeeb_sharah' ||
              template.recommendedMode === 'mcq_oral_quiz' ||
              template.recommendedMode === 'rubric'
            ) {
              setMode(template.recommendedMode);
            }
            setActivePromptId(template.id);
            setPrompt(interpolated);
          }}
        />
      </section>

      {/* Conversation & Quick Prompts */}
      <section className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 space-y-5">
        {messages.length === 0 ? (
          <div className="space-y-4">
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Quick Dars-e-Nizami Teaching Starters ({shortMarhala} · {selectedSubject})
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {quickStarters.map((starter) => (
                <button
                  key={starter.title}
                  type="button"
                  onClick={() => {
                    setMode(starter.mode);
                    setPrompt(starter.text);
                  }}
                  className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800/50 hover:border-teal-400 dark:hover:border-teal-600 hover:bg-teal-50/40 dark:hover:bg-teal-950/30 text-left transition-colors space-y-1"
                >
                  <p className="text-xs font-bold text-slate-900 dark:text-white">
                    {starter.title}
                  </p>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    {starter.text}
                  </p>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Generated Dars &amp; Evaluation Materials
              </p>
              <button
                type="button"
                onClick={() => {
                  setMessages([]);
                  setErrorMsg(null);
                }}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-rose-600 dark:hover:text-rose-400"
              >
                <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Clear Session</span>
              </button>
            </div>

            <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`p-4 rounded-xl text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-teal-700 text-white ml-8 sm:ml-16'
                      : 'bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 mr-4 sm:mr-12'
                  }`}
                >
                  {msg.role === 'model' && (
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                      <span className="text-[11px] font-semibold text-teal-700 dark:text-teal-400 flex items-center gap-1.5">
                        <span>Qawmi AI Teaching Assistant</span>
                        {msg.isFallback && (
                          <span className="px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 text-[10px] font-semibold">
                            Demo Fallback
                          </span>
                        )}
                      </span>
                      <CopyResponseButton text={msg.text} />
                    </div>
                  )}
                  <FormattedAiMessage text={msg.text} isUser={msg.role === 'user'} />
                </div>
              ))}
              {loading && (
                <div className="flex items-center gap-2 text-xs text-teal-700 dark:text-teal-300 px-2 py-1">
                  <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                  <span>Preparing Qawmi Madrasa teaching material...</span>
                </div>
              )}
            </div>
          </div>
        )}

        {errorMsg && (
          <div
            role="alert"
            className="flex items-start gap-2.5 p-3.5 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-red-900 dark:text-red-200 text-xs"
          >
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-800"
        >
          <label
            htmlFor="qawmi-ai-prompt"
            className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
          >
            Kitab Bab, Tarkeeb Passage, or Befaq Teaching Prompt
          </label>
          <div className="flex flex-col sm:flex-row gap-3">
            <textarea
              id="qawmi-ai-prompt"
              rows={2}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={`Ask for a ${shortMarhala} (${selectedSubject}) Dars plan, Tarkeeb & Sharah notes, MCQ/Shifah quiz, or evaluation rubric...`}
              className="flex-1 px-3.5 py-2.5 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-600 resize-none"
            />
            <button
              type="submit"
              disabled={loading || !prompt.trim()}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 min-h-[44px] rounded-xl bg-teal-700 hover:bg-teal-800 dark:bg-teal-600 dark:hover:bg-teal-500 disabled:opacity-50 text-white text-sm font-semibold transition-colors shrink-0 sm:self-end whitespace-nowrap"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
              ) : (
                <Send className="w-4 h-4" aria-hidden="true" />
              )}
              <span>Generate</span>
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
