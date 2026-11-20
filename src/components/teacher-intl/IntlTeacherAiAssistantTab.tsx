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
  getIntlTeacherBoardName,
  getIntlTeacherPathwayLabel,
  getLevelsForPathway,
  getShortLevelLabel,
  LOWER_SECONDARY_LEVEL,
  type InternationalAcademicLevel,
  type IntlTeacherContext,
} from '../../services/internationalTeacherService';
import { requestCurriculumAi } from '../../services/aiClient';
import { CopyResponseButton } from '../ai/CopyResponseButton';
import { FormattedAiMessage } from '../ai/FormattedAiMessage';
import { PromptLibraryBar } from '../ai/PromptLibraryBar';
import type { PromptTemplateItem } from '../../../lib/prompt-library';
import { useDashboardLanguage } from '../../i18n/useDashboardLanguage';

type IntlAssistantMode = 'lesson_plan' | 'past_paper' | 'mcq_quiz' | 'rubric';

interface AssistantMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  mode: IntlAssistantMode;
  academicLevel: InternationalAcademicLevel;
  isFallback?: boolean;
  timestamp: number;
}

interface IntlTeacherAiAssistantTabProps {
  teacher: IntlTeacherContext;
  initialTopic?: string | null;
  initialLevel?: InternationalAcademicLevel | null;
}

export function IntlTeacherAiAssistantTab({
  teacher,
  initialTopic,
  initialLevel,
}: IntlTeacherAiAssistantTabProps) {
  const { dt, td } = useDashboardLanguage();
  const pathwayLevels = getLevelsForPathway(teacher.pathway);
  const levelOptions =
    teacher.assignedLevels.length > 0 ? teacher.assignedLevels : pathwayLevels;
  const defaultLevel = initialLevel ?? levelOptions[0] ?? pathwayLevels[1];

  const [selectedLevel, setSelectedLevel] = useState<InternationalAcademicLevel>(defaultLevel);
  const [mode, setMode] = useState<IntlAssistantMode>('lesson_plan');
  const [input, setInput] = useState(
    initialTopic
      ? `Draft a structured ${getIntlTeacherPathwayLabel(teacher.pathway)} classroom lesson plan for "${initialTopic}".`
      : ''
  );
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [activePromptId, setActivePromptId] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const threadEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (initialLevel) {
      setSelectedLevel(initialLevel);
    }
  }, [initialLevel]);

  useEffect(() => {
    if (initialTopic) {
      setInput(
        `Draft a structured ${getIntlTeacherPathwayLabel(teacher.pathway)} classroom lesson plan for "${initialTopic}".`
      );
    }
  }, [initialTopic, teacher.pathway]);

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [messages, isLoading]);

  const rawPathwayLabel = getIntlTeacherPathwayLabel(teacher.pathway);
  const pathwayLabel = td(rawPathwayLabel);
  const boardName = td(getIntlTeacherBoardName(teacher.pathway));
  const subjectLabel = td(teacher.primarySubject);
  const shortLevel = getShortLevelLabel(selectedLevel);
  const shortLevelLabel = td(shortLevel);
  const effectiveTrack =
    selectedLevel === LOWER_SECONDARY_LEVEL ? 'General' : teacher.academicTrack;
  const effectiveTrackLabel = td(effectiveTrack);

  const modeTabs: {
    id: IntlAssistantMode;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    placeholder: string;
  }[] = [
    {
      id: 'lesson_plan',
      label: dt('Lesson Plan', 'পাঠ পরিকল্পনা'),
      icon: BookOpenCheck,
      placeholder: dt(
        'Enter a {pathway} syllabus topic in {subject} for a 50-min lesson plan...',
        '৫০ মিনিটের পাঠ পরিকল্পনার জন্য {subject} বিষয়ের একটি {pathway} সিলেবাস অধ্যায় লিখুন...',
        { pathway: pathwayLabel, subject: subjectLabel }
      ),
    },
    {
      id: 'past_paper',
      label: dt('Past-Paper Structured Questions', 'পাস্ট-পেপার কাঠামোবদ্ধ প্রশ্ন'),
      icon: FileSpreadsheet,
      placeholder: dt(
        'Specify syllabus unit to draft {pathway} past-paper structured questions with command words...',
        'কমান্ড শব্দসহ {pathway} পাস্ট-পেপার কাঠামোবদ্ধ প্রশ্ন তৈরি করতে সিলেবাসের ইউনিট উল্লেখ করুন...',
        { pathway: pathwayLabel }
      ),
    },
    {
      id: 'mcq_quiz',
      label: dt('MCQ Quiz', 'বহুনির্বাচনি কুইজ'),
      icon: ListChecks,
      placeholder: dt(
        'Enter a topic in {subject} to generate 5 {pathway}-style Paper 1 MCQs...',
        '{pathway}-ধাঁচের ৫টি পেপার ১ বহুনির্বাচনি প্রশ্ন তৈরি করতে {subject} বিষয়ের একটি অধ্যায় লিখুন...',
        { subject: subjectLabel, pathway: pathwayLabel }
      ),
    },
    {
      id: 'rubric',
      label: dt('Marking Scheme / Rubric', 'মার্কিং স্কিম / রুব্রিক'),
      icon: ClipboardCheck,
      placeholder: dt(
        'Describe the exam question, coursework, or practical lab to generate a {pathway} marking scheme...',
        '{pathway} মার্কিং স্কিম তৈরি করতে পরীক্ষার প্রশ্ন, কোর্সওয়ার্ক বা ল্যাব কাজের বিবরণ লিখুন...',
        { pathway: pathwayLabel }
      ),
    },
  ];

  const activeModeMeta = modeTabs.find((m) => m.id === mode) ?? modeTabs[0];

  const quickStarters: { label: string; mode: IntlAssistantMode; prompt: string }[] =
    teacher.pathway === 'cambridge'
      ? [
          {
            label: dt('50-min CAIE lesson plan', '৫০ মিনিটের কেমব্রিজ পাঠ পরিকল্পনা'),
            mode: 'lesson_plan',
            prompt: `Create a 50-minute Cambridge CAIE ${shortLevel} lesson plan for ${teacher.primarySubject} including learning objectives, worked past-paper examples, and exit check.`,
          },
          {
            label: dt('CAIE Paper 2/4 structured question', 'CAIE পেপার ২/৪ কাঠামোবদ্ধ প্রশ্ন'),
            mode: 'past_paper',
            prompt: `Draft a multi-part Cambridge ${shortLevel} ${teacher.primarySubject} past-paper structured question (12 marks total) using official CAIE command words and M1/A1 mark allocations.`,
          },
          {
            label: dt('5-question Paper 1 MCQ drill', '৫টি প্রশ্নের পেপার ১ বহুনির্বাচনি অনুশীলন'),
            mode: 'mcq_quiz',
            prompt: `Generate 5 Cambridge CAIE ${shortLevel} ${teacher.primarySubject} Paper 1 multiple-choice questions (A–D) with common distractor notes and an answer key.`,
          },
          {
            label: dt('CAIE Marking Scheme & Rubric', 'CAIE মার্কিং স্কিম ও রুব্রিক'),
            mode: 'rubric',
            prompt: `Build an official-style Cambridge ${shortLevel} ${teacher.primarySubject} marking scheme rubric (AO1 Knowledge, AO2 Application, AO3 Analysis/Evaluation) for a 15-mark assessment.`,
          },
        ]
      : [
          {
            label: dt('50-min Edexcel lesson plan', '৫০ মিনিটের এডেক্সেল পাঠ পরিকল্পনা'),
            mode: 'lesson_plan',
            prompt: `Create a 50-minute Pearson Edexcel ${shortLevel} lesson plan for ${teacher.primarySubject} aligned with unit specification objectives and exam command words.`,
          },
          {
            label: dt('Edexcel past-paper structured set', 'এডেক্সেল পাস্ট-পেপার কাঠামোবদ্ধ সেট'),
            mode: 'past_paper',
            prompt: `Draft a multi-part Pearson Edexcel ${shortLevel} ${teacher.primarySubject} past-paper structured question (12 marks) with command words ("State", "Calculate", "Explain", "Evaluate").`,
          },
          {
            label: dt('5-question Edexcel MCQ quiz', '৫টি প্রশ্নের এডেক্সেল বহুনির্বাচনি কুইজ'),
            mode: 'mcq_quiz',
            prompt: `Generate 5 Pearson Edexcel ${shortLevel} ${teacher.primarySubject} multiple-choice questions (A–D) with a concise examiner answer key.`,
          },
          {
            label: dt('Edexcel Marking Scheme / Rubric', 'এডেক্সেল মার্কিং স্কিম / রুব্রিক'),
            mode: 'rubric',
            prompt: `Build a Pearson Edexcel ${shortLevel} ${teacher.primarySubject} levels-based marking scheme and practical assessment rubric with clear mark bands.`,
          },
        ];

  const sendPrompt = async (promptText: string, activeMode: IntlAssistantMode = mode) => {
    const trimmed = promptText.trim();
    if (!trimmed || isLoading) return;

    setErrorMsg(null);
    const userMsg: AssistantMessage = {
      id: `itusr-${Date.now()}`,
      role: 'user',
      text: trimmed,
      mode: activeMode,
      academicLevel: selectedLevel,
      timestamp: Date.now(),
    };

    const nextHistory = [...messages, userMsg];
    setMessages(nextHistory);
    setInput('');
    setIsLoading(true);

    try {
      const result = await requestCurriculumAi({
        endpoint: '/api/teacher-intl/ai-assistant',
        role: 'teacher',
        pathway: teacher.pathway,
        level: selectedLevel,
        trackOrDept: effectiveTrack,
        subject: teacher.primarySubject,
        mode: activeMode,
        prompt: trimmed,
        promptId: activePromptId,
        payload: {
          pathway: teacher.pathway,
          subject: teacher.primarySubject,
          academicLevel: selectedLevel,
          academicTrack: effectiveTrack,
          mode: activeMode,
          prompt: trimmed,
          history: nextHistory.slice(-6).map((m) => ({ role: m.role, text: m.text })),
        },
      });

      const modelMsg: AssistantMessage = {
        id: `itmod-${Date.now()}`,
        role: 'model',
        text: result.reply,
        mode: activeMode,
        academicLevel: selectedLevel,
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
                '{board} copilot scoped to {pathway} · {subject} · {level} ({track})',
                '{pathway} · {subject} · {level} ({track})-এর জন্য {board} শিক্ষক সহায়ক',
                {
                  board: boardName,
                  pathway: pathwayLabel,
                  subject: subjectLabel,
                  level: shortLevelLabel,
                  track: effectiveTrackLabel,
                }
              )}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="min-w-[230px]">
              <label htmlFor="intl-assistant-level-select" className="sr-only">
                {dt(
                  'Select target academic level and subject',
                  'নির্ধারিত একাডেমিক স্তর ও বিষয় নির্বাচন করুন'
                )}
              </label>
              <select
                id="intl-assistant-level-select"
                value={selectedLevel}
                onChange={(e) =>
                  setSelectedLevel(e.target.value as InternationalAcademicLevel)
                }
                className="w-full px-3.5 py-2 min-h-[42px] bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-sm font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-600"
              >
                {pathwayLevels.map((lvl) => (
                  <option key={lvl} value={lvl}>
                    {td(getShortLevelLabel(lvl))} · {subjectLabel}
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

        {/* 4 Mode Segmented Toggle */}
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
          level={selectedLevel}
          trackOrDept={effectiveTrack}
          subject={teacher.primarySubject}
          accent="teal"
          onApplyPrompt={(interpolated, template: PromptTemplateItem) => {
            if (
              template.recommendedMode === 'lesson_plan' ||
              template.recommendedMode === 'past_paper' ||
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
                    'Draft {pathway} Teaching Materials for {subject}',
                    '{subject} বিষয়ের জন্য {pathway} শিক্ষণ উপকরণ তৈরি করুন',
                    { pathway: pathwayLabel, subject: subjectLabel }
                  )}
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {dt(
                    'Generate exam-aligned lesson plans, past-paper structured questions, MCQ quizzes, or marking schemes tailored to {board}.',
                    '{board} অনুযায়ী পরীক্ষার পাঠ পরিকল্পনা, পাস্ট-পেপার কাঠামোবদ্ধ প্রশ্ন, বহুনির্বাচনি কুইজ বা মার্কিং স্কিম তৈরি করুন।',
                    { board: boardName }
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
                          ? dt('You · {level} {subject}', 'আপনি · {level} {subject}', {
                              level: td(getShortLevelLabel(msg.academicLevel)),
                              subject: subjectLabel,
                            })
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
                <Loader2
                  className="w-4 h-4 animate-spin text-teal-600 dark:text-teal-400"
                  aria-hidden="true"
                />
                <span>
                  {dt('Drafting {mode} for {level}...', '{level}-এর জন্য {mode} তৈরি হচ্ছে...', {
                    mode: activeModeMeta.label,
                    level: shortLevelLabel,
                  })}
                </span>
              </div>
            </div>
          )}

          {errorMsg && (
            <div
              role="alert"
              className="flex items-start gap-2.5 p-3.5 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-red-900 dark:text-red-200 text-xs"
            >
              <AlertCircle
                className="w-4 h-4 shrink-0 mt-0.5 text-red-700 dark:text-red-400"
                aria-hidden="true"
              />
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
