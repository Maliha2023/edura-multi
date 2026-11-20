import React, { useEffect, useMemo, useState } from 'react';
import { BookMarked, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';
import {
  getPathwayDisplayName,
  getPromptsForContext,
  interpolatePrompt,
  type PathwayKey,
  type PromptCategory,
  type PromptRole,
  type PromptTemplateItem,
} from '../../../lib/prompt-library';
import { useDashboardLanguage } from '../../i18n/useDashboardLanguage';

interface PromptLibraryBarProps {
  role: PromptRole;
  pathway: PathwayKey;
  level: string;
  trackOrDept?: string | null;
  subject: string;
  accent?: 'emerald' | 'teal';
  onApplyPrompt: (interpolatedPrompt: string, template: PromptTemplateItem) => void;
}

export function PromptLibraryBar({
  role,
  pathway,
  level,
  trackOrDept,
  subject,
  accent = 'emerald',
  onApplyPrompt,
}: PromptLibraryBarProps) {
  const { td, dt, formatDigits } = useDashboardLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<PromptCategory | 'All'>('All');
  const [topic, setTopic] = useState('');

  const allContextPrompts = useMemo(
    () => getPromptsForContext({ role, pathway }),
    [role, pathway]
  );

  const availableCategories = useMemo(() => {
    const unique = Array.from(new Set(allContextPrompts.map((p) => p.category)));
    return unique;
  }, [allContextPrompts]);

  const filteredPrompts = useMemo(() => {
    return getPromptsForContext({
      role,
      pathway,
      category: selectedCategory,
    });
  }, [role, pathway, selectedCategory]);

  const [selectedPromptId, setSelectedPromptId] = useState<string>(
    filteredPrompts[0]?.id ?? ''
  );

  useEffect(() => {
    if (!filteredPrompts.some((p) => p.id === selectedPromptId)) {
      setSelectedPromptId(filteredPrompts[0]?.id ?? '');
    }
  }, [filteredPrompts, selectedPromptId]);

  const activeTemplate = useMemo(
    () => filteredPrompts.find((p) => p.id === selectedPromptId) ?? filteredPrompts[0],
    [filteredPrompts, selectedPromptId]
  );

  const focusRingClass =
    accent === 'teal' ? 'focus:ring-teal-600' : 'focus:ring-emerald-600';
  const buttonAccentClass =
    accent === 'teal'
      ? 'bg-teal-700 hover:bg-teal-800 dark:bg-teal-600 dark:hover:bg-teal-500 text-white'
      : 'bg-emerald-700 hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white';
  const badgeAccentClass =
    accent === 'teal'
      ? 'text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/50 border-teal-200 dark:border-teal-800'
      : 'text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800';

  const handleApply = () => {
    if (!activeTemplate) return;
    const resolvedTopic =
      topic.trim() || activeTemplate.defaultTopicHint || `Core ${subject} Unit`;
    const interpolated = interpolatePrompt(activeTemplate.userTemplate, {
      pathway,
      level,
      trackOrDept: trackOrDept?.trim() || 'General',
      subject,
      topic: resolvedTopic,
    });
    onApplyPrompt(interpolated, activeTemplate);
    setIsOpen(false);
  };

  return (
    <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          aria-expanded={isOpen}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors"
        >
          <BookMarked className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
          <span>
            {dt('Prompt Library ({count} Templates)', 'প্রম্পট লাইব্রেরি ({count}টি টেমপ্লেট)', {
              count: allContextPrompts.length,
            })}
          </span>
          {isOpen ? (
            <ChevronUp className="w-3.5 h-3.5" aria-hidden="true" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5" aria-hidden="true" />
          )}
        </button>

        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-[11px] font-medium ${badgeAccentClass}`}>
          <Sparkles className="w-3 h-3 shrink-0" aria-hidden="true" />
          <span>
            {td(getPathwayDisplayName(pathway))} · {td(level)} · {subject}
          </span>
        </span>
      </div>

      {isOpen && activeTemplate && (
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/60 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label
                htmlFor={`prompt-cat-${role}-${pathway}`}
                className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1"
              >
                {td('Category')}
              </label>
              <select
                id={`prompt-cat-${role}-${pathway}`}
                value={selectedCategory}
                onChange={(e) =>
                  setSelectedCategory(e.target.value as PromptCategory | 'All')
                }
                className={`w-full px-3 py-2 min-h-[38px] bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 ${focusRingClass}`}
              >
                <option value="All">
                  {td('All Categories')} ({formatDigits(allContextPrompts.length)})
                </option>
                {availableCategories.map((cat) => (
                  <option key={cat} value={cat}>
                    {td(cat)}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label
                htmlFor={`prompt-select-${role}-${pathway}`}
                className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1"
              >
                {td('Curated Prompt Template')}
              </label>
              <select
                id={`prompt-select-${role}-${pathway}`}
                value={activeTemplate.id}
                onChange={(e) => setSelectedPromptId(e.target.value)}
                className={`w-full px-3 py-2 min-h-[38px] bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 ${focusRingClass}`}
              >
                {filteredPrompts.map((item) => (
                  <option key={item.id} value={item.id}>
                    [{td(item.category)}] {item.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <p className="text-xs text-slate-600 dark:text-slate-400">
            {activeTemplate.description}
          </p>

          <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-end">
            <div className="flex-1">
              <label
                htmlFor={`prompt-topic-${role}-${pathway}`}
                className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1"
              >
                {td('Topic / Chapter / Kitab Bab (auto-populates template)')}
              </label>
              <input
                id={`prompt-topic-${role}-${pathway}`}
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder={
                  activeTemplate.defaultTopicHint ||
                  dt('Enter topic in {subject}...', '{subject}-এর বিষয় লিখুন...', { subject })
                }
                className={`w-full px-3 py-2 min-h-[38px] bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 ${focusRingClass}`}
              />
            </div>

            <button
              type="button"
              onClick={handleApply}
              className={`inline-flex items-center justify-center gap-1.5 px-4 py-2 min-h-[38px] rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${buttonAccentClass}`}
            >
              <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{td('Load Prompt into Editor')}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
