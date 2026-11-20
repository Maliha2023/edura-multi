import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  BookOpen,
  Bot,
  CheckCircle2,
  Eye,
  EyeOff,
  FileText,
  Plus,
  Search,
  Trash2,
} from 'lucide-react';
import {
  ACADEMIC_TRACK_OPTIONS,
  getIntlTeacherPathwayLabel,
  getLevelsForPathway,
  getShortLevelLabel,
  INTL_TEACHER_MODULE_TYPES,
  LOWER_SECONDARY_LEVEL,
  type InternationalAcademicLevel,
  type InternationalAcademicTrack,
  type IntlTeacherContext,
  type IntlTeacherModuleResource,
  type IntlTeacherModuleType,
  type UpperAcademicTrack,
} from '../../services/internationalTeacherService';
import { useDashboardLanguage } from '../../i18n/useDashboardLanguage';

interface IntlTeacherClassesTabProps {
  teacher: IntlTeacherContext;
  modules: IntlTeacherModuleResource[];
  onCreateModule: (input: {
    academicLevel: InternationalAcademicLevel;
    academicTrack: InternationalAcademicTrack;
    title: string;
    type: IntlTeacherModuleType;
    summary: string;
    published: boolean;
  }) => { ok: true } | { ok: false; error: string };
  onTogglePublish: (moduleId: string) => void;
  onDeleteModule: (moduleId: string) => void;
  onDraftQuizForModule: (topic: string, academicLevel: InternationalAcademicLevel) => void;
}

export function IntlTeacherClassesTab({
  teacher,
  modules,
  onCreateModule,
  onTogglePublish,
  onDeleteModule,
  onDraftQuizForModule,
}: IntlTeacherClassesTabProps) {
  const { dt, td, formatDigits } = useDashboardLanguage();
  const pathwayLabel = td(getIntlTeacherPathwayLabel(teacher.pathway));
  const pathwayLevels = getLevelsForPathway(teacher.pathway);
  const defaultLevel = teacher.assignedLevels[0] ?? pathwayLevels[1];

  const [title, setTitle] = useState('');
  const [academicLevel, setAcademicLevel] = useState<InternationalAcademicLevel>(defaultLevel);
  const [academicTrack, setAcademicTrack] = useState<UpperAcademicTrack>(
    teacher.academicTrack === 'General' ? 'Science' : teacher.academicTrack
  );
  const [resourceType, setResourceType] = useState<IntlTeacherModuleType>('Lecture Notes');
  const [summary, setSummary] = useState('');
  const [publishNow, setPublishNow] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  // Library filters
  const [searchQuery, setSearchQuery] = useState('');
  const [levelFilter, setLevelFilter] = useState<'all' | InternationalAcademicLevel>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft'>('all');

  const isLowerSelected = academicLevel === LOWER_SECONDARY_LEVEL;

  const filteredModules = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return modules.filter((mod) => {
      if (levelFilter !== 'all' && mod.academicLevel !== levelFilter) return false;
      if (statusFilter === 'published' && !mod.published) return false;
      if (statusFilter === 'draft' && mod.published) return false;
      if (q) {
        const hay = `${mod.title} ${mod.summary} ${mod.subject} ${mod.type} ${mod.academicLevel} ${mod.academicTrack}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [modules, searchQuery, levelFilter, statusFilter]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    const res = onCreateModule({
      academicLevel,
      academicTrack: isLowerSelected ? 'General' : academicTrack,
      title,
      type: resourceType,
      summary,
      published: publishNow,
    });

    if (!res.ok) {
      setFormError(td(res.error));
      return;
    }

    const trimmedTitle = title.trim();
    setTitle('');
    setSummary('');
    setFormSuccess(
      publishNow
        ? dt(
            'Published "{title}" to {pathway} · {level}.',
            '{pathway} · {level}-এ "{title}" প্রকাশ করা হয়েছে।',
            {
              title: trimmedTitle,
              pathway: pathwayLabel,
              level: td(getShortLevelLabel(academicLevel)),
            }
          )
        : dt(
            'Saved "{title}" as a draft module.',
            '"{title}" খসড়া মডিউল হিসেবে সংরক্ষণ করা হয়েছে।',
            { title: trimmedTitle }
          )
    );
  };

  return (
    <div className="space-y-6">
      {/* Publish New Syllabus Module Composer */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              {dt(
                'Publish Lesson Notes, Worksheets & Past-Paper Sets',
                'লেসন নোট, ওয়ার্কশিট ও পাস্ট-পেপার সেট প্রকাশ করুন'
              )}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {dt('Strictly scoped to {pathway} · {subject}', 'কেবল {pathway} · {subject}-এর জন্য', {
                pathway: pathwayLabel,
                subject: td(teacher.primarySubject),
              })}
            </p>
          </div>
          <span className="text-xs font-semibold text-teal-700 dark:text-teal-400">
            {dt('{pub} published · {total} total', '{pub}টি প্রকাশিত · মোট {total}টি', {
              pub: formatDigits(modules.filter((m) => m.published).length),
              total: formatDigits(modules.length),
            })}
          </span>
        </div>

        {formError && (
          <div
            role="alert"
            className="flex items-start gap-2.5 p-3 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-red-900 dark:text-red-200 text-xs"
          >
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
            <span>{formError}</span>
          </div>
        )}

        {formSuccess && (
          <div
            role="status"
            className="flex items-start gap-2.5 p-3 rounded-xl bg-teal-50 dark:bg-teal-950/50 border border-teal-200 dark:border-teal-800 text-teal-900 dark:text-teal-200 text-xs"
          >
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
            <span>{formSuccess}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            <div className="md:col-span-6">
              <label
                htmlFor="intl-module-title"
                className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
              >
                {dt('Module Title', 'মডিউলের শিরোনাম')}
              </label>
              <input
                id="intl-module-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={
                  teacher.pathway === 'cambridge'
                    ? dt(
                        'e.g. Paper 4 Extended — Vectors & Transformations Practice Set',
                        'যেমন: পেপার ৪ এক্সটেন্ডেড — ভেক্টর ও ট্রান্সফরমেশন অনুশীলন সেট'
                      )
                    : dt(
                        'e.g. Unit 2 (WPH12) — Waves & Photoelectric Effect Worksheet',
                        'যেমন: ইউনিট ২ (WPH12) — তরঙ্গ ও ফটোইলেকট্রিক প্রভাব ওয়ার্কশিট'
                      )
                }
                className="w-full px-3.5 py-2.5 min-h-[42px] bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-600"
              />
            </div>

            <div className="md:col-span-3">
              <label
                htmlFor="intl-module-level"
                className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
              >
                {dt('Academic Level', 'একাডেমিক স্তর')}
              </label>
              <select
                id="intl-module-level"
                value={academicLevel}
                onChange={(e) => setAcademicLevel(e.target.value as InternationalAcademicLevel)}
                className="w-full px-3 py-2.5 min-h-[42px] bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-600"
              >
                {pathwayLevels.map((lvl) => (
                  <option key={lvl} value={lvl}>
                    {td(lvl)}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-3">
              <label
                htmlFor="intl-module-type"
                className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
              >
                {dt('Resource Type', 'উপকরণের ধরন')}
              </label>
              <select
                id="intl-module-type"
                value={resourceType}
                onChange={(e) => setResourceType(e.target.value as IntlTeacherModuleType)}
                className="w-full px-3 py-2.5 min-h-[42px] bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-600"
              >
                {INTL_TEACHER_MODULE_TYPES.map((typeOption) => (
                  <option key={typeOption} value={typeOption}>
                    {td(typeOption)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
            {!isLowerSelected && (
              <div className="md:col-span-4">
                <label
                  htmlFor="intl-module-track"
                  className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
                >
                  {dt('Academic Track', 'একাডেমিক ট্র্যাক')}
                </label>
                <select
                  id="intl-module-track"
                  value={academicTrack}
                  onChange={(e) => setAcademicTrack(e.target.value as UpperAcademicTrack)}
                  className="w-full px-3 py-2.5 min-h-[42px] bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-600"
                >
                  {ACADEMIC_TRACK_OPTIONS.map((track) => (
                    <option key={track} value={track}>
                      {td(track)}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className={isLowerSelected ? 'md:col-span-12' : 'md:col-span-8'}>
              <label
                htmlFor="intl-module-summary"
                className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
              >
                {dt('Syllabus Scope & Student Instructions', 'সিলেবাসের পরিধি ও শিক্ষার্থীদের নির্দেশনা')}
              </label>
              <textarea
                id="intl-module-summary"
                rows={2}
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder={dt(
                  'Outline syllabus topics, past-paper variants, or submission instructions...',
                  'সিলেবাসের অধ্যায়, পাস্ট-পেপার ভ্যারিয়েন্ট বা জমা দেওয়ার নির্দেশনা লিখুন...'
                )}
                className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-600"
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
            <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={publishNow}
                onChange={(e) => setPublishNow(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-teal-700 focus:ring-teal-600"
              />
              <span>
                {dt(
                  'Publish immediately to {pathway} students',
                  '{pathway} শিক্ষার্থীদের জন্য তাৎক্ষণিকভাবে প্রকাশ করুন',
                  { pathway: pathwayLabel }
                )}
              </span>
            </label>

            <button
              type="submit"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 min-h-[42px] bg-teal-700 hover:bg-teal-800 dark:bg-teal-600 dark:hover:bg-teal-500 text-white text-sm font-semibold rounded-lg transition-colors whitespace-nowrap"
            >
              <Plus className="w-4 h-4" aria-hidden="true" />
              <span>
                {publishNow ? dt('Publish Module', 'মডিউল প্রকাশ করুন') : dt('Save Draft', 'খসড়া সংরক্ষণ করুন')}
              </span>
            </button>
          </div>
        </form>
      </section>

      {/* Module Library */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search
              className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden="true"
            />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={dt(
                'Search notes, worksheets, or past papers...',
                'নোট, ওয়ার্কশিট বা পাস্ট পেপার খুঁজুন...'
              )}
              aria-label={dt('Search syllabus modules', 'সিলেবাস মডিউল খুঁজুন')}
              className="w-full pl-10 pr-3.5 py-2 min-h-[42px] bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-600"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <select
              aria-label={dt('Filter modules by academic level', 'একাডেমিক স্তর অনুযায়ী মডিউল ফিল্টার করুন')}
              value={levelFilter}
              onChange={(e) =>
                setLevelFilter(e.target.value as 'all' | InternationalAcademicLevel)
              }
              className="px-3 py-2 min-h-[40px] bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-600"
            >
              <option value="all">{dt('All Academic Levels', 'সকল একাডেমিক স্তর')}</option>
              {pathwayLevels.map((lvl) => (
                <option key={lvl} value={lvl}>
                  {td(getShortLevelLabel(lvl))}
                </option>
              ))}
            </select>

            <div className="inline-flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
              {(
                [
                  { id: 'all', label: dt('All', 'সকল') },
                  { id: 'published', label: dt('Published', 'প্রকাশিত') },
                  { id: 'draft', label: dt('Draft', 'খসড়া') },
                ] as const
              ).map((status) => (
                <button
                  key={status.id}
                  type="button"
                  onClick={() => setStatusFilter(status.id)}
                  className={`px-3 py-1.5 min-h-[32px] text-xs font-semibold rounded-lg transition-colors ${
                    statusFilter === status.id
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {status.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {filteredModules.length === 0 ? (
          <div className="py-10 text-center space-y-1.5 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
            <BookOpen className="w-6 h-6 text-slate-400 mx-auto" aria-hidden="true" />
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              {dt('No syllabus modules match your filters', 'আপনার ফিল্টার অনুযায়ী কোনো সিলেবাস মডিউল পাওয়া যায়নি')}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {dt(
                'Publish a new module above or clear your search filter.',
                'উপরে একটি নতুন মডিউল প্রকাশ করুন অথবা সার্চ ফিল্টার মুছে ফেলুন।'
              )}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {filteredModules.map((mod) => (
              <article
                key={mod.id}
                className="py-4 first:pt-1 last:pb-1 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
              >
                <div className="min-w-0 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <span className="inline-flex items-center gap-1 font-semibold text-teal-700 dark:text-teal-400">
                      <FileText className="w-3.5 h-3.5" aria-hidden="true" />
                      {td(mod.type)}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="font-medium text-slate-700 dark:text-slate-300">
                      {td(getShortLevelLabel(mod.academicLevel))}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>{td(mod.academicTrack)}</span>
                    <span aria-hidden="true">·</span>
                    <span
                      className={
                        mod.published
                          ? 'font-semibold text-emerald-700 dark:text-emerald-400'
                          : 'font-semibold text-amber-700 dark:text-amber-400'
                      }
                    >
                      {mod.published ? dt('Published', 'প্রকাশিত') : dt('Draft', 'খসড়া')}
                    </span>
                  </div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white leading-snug">
                    {mod.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                    {mod.summary}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => onDraftQuizForModule(mod.title, mod.academicLevel)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[36px] text-xs font-semibold text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/60 hover:bg-teal-100 dark:hover:bg-teal-900/60 border border-teal-200 dark:border-teal-800 rounded-lg transition-colors whitespace-nowrap"
                  >
                    <Bot className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>{dt('Draft Quiz', 'কুইজ তৈরি করুন')}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onTogglePublish(mod.id)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[36px] text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors whitespace-nowrap"
                  >
                    {mod.published ? (
                      <>
                        <EyeOff className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>{dt('Unpublish', 'অপ্রকাশিত করুন')}</span>
                      </>
                    ) : (
                      <>
                        <Eye className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>{dt('Publish', 'প্রকাশ করুন')}</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => onDeleteModule(mod.id)}
                    aria-label={dt('Delete module {title}', 'মডিউল মুছে ফেলুন: {title}', {
                      title: mod.title,
                    })}
                    className="w-9 h-9 rounded-lg inline-flex items-center justify-center text-slate-400 hover:text-rose-700 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" aria-hidden="true" />
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
