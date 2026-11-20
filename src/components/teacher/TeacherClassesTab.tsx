import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  BookOpen,
  Bot,
  CheckCircle2,
  Eye,
  EyeOff,
  FilePlus2,
  Search,
  Trash2,
} from 'lucide-react';
import {
  getTeacherPathwayLabel,
  TEACHER_CLASS_LEVELS,
  TEACHER_GROUPS,
  type TeacherClassLevel,
  type TeacherGroup,
  type TeacherModuleResource,
  type TeacherProfileContext,
  type TeacherResourceType,
} from '../../services/teacherService';
import { useDashboardLanguage } from '../../i18n/useDashboardLanguage';

interface TeacherClassesTabProps {
  teacher: TeacherProfileContext;
  modules: TeacherModuleResource[];
  onCreateModule: (input: {
    academicClass: TeacherClassLevel;
    academicGroup: TeacherGroup | null;
    title: string;
    resourceType: TeacherResourceType;
    chapterTag: string;
    summary: string;
    isPublished: boolean;
  }) => { ok: true } | { ok: false; error: string };
  onTogglePublished: (moduleId: string) => void;
  onDeleteModule: (moduleId: string) => void;
  onGenerateWithAi: (topic: string, academicClass: TeacherClassLevel) => void;
}

const RESOURCE_TYPES: TeacherResourceType[] = [
  'Lecture Notes',
  'Worksheet',
  'Formula Sheet',
  'Practice Guide',
];

export function TeacherClassesTab({
  teacher,
  modules,
  onCreateModule,
  onTogglePublished,
  onDeleteModule,
  onGenerateWithAi,
}: TeacherClassesTabProps) {
  const { dt, td } = useDashboardLanguage();

  const pathwayLabel = getTeacherPathwayLabel(teacher.pathway);
  const localizedPathway = td(pathwayLabel);

  const [classFilter, setClassFilter] = useState<TeacherClassLevel | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Add Module / Study Resource form state
  const defaultClass: TeacherClassLevel = teacher.assignedClasses[0] ?? 10;
  const [title, setTitle] = useState('');
  const [academicClass, setAcademicClass] = useState<TeacherClassLevel>(defaultClass);
  const [academicGroup, setAcademicGroup] = useState<TeacherGroup>(
    teacher.academicGroup ?? 'Science'
  );
  const [resourceType, setResourceType] = useState<TeacherResourceType>('Lecture Notes');
  const [chapterTag, setChapterTag] = useState('');
  const [summary, setSummary] = useState('');
  const [isPublished, setIsPublished] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  const filteredModules = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return modules.filter((m) => {
      if (classFilter !== 'all' && m.academicClass !== classFilter) return false;
      if (q) {
        const hay = `${m.title} ${m.chapterTag} ${m.summary} ${m.resourceType} ${m.subject}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [modules, classFilter, searchQuery]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    const res = onCreateModule({
      academicClass,
      academicGroup: academicClass >= 9 ? academicGroup : null,
      title,
      resourceType,
      chapterTag,
      summary,
      isPublished,
    });

    if (!res.ok) {
      setFormError(res.error);
      return;
    }

    setTitle('');
    setChapterTag('');
    setSummary('');
    setFormSuccess(
      isPublished
        ? dt(
            'Published study resource for {pathway} Class {cls}.',
            '{pathway} শ্রেণি {cls}-এর জন্য অধ্যয়ন উপকরণ প্রকাশিত হয়েছে।',
            { pathway: localizedPathway, cls: academicClass }
          )
        : dt(
            'Saved draft resource for {pathway} Class {cls}.',
            '{pathway} শ্রেণি {cls}-এর জন্য খসড়া উপকরণ সংরক্ষিত হয়েছে।',
            { pathway: localizedPathway, cls: academicClass }
          )
    );
  };

  const publishedCount = modules.filter((m) => m.isPublished).length;
  const draftCount = modules.filter((m) => !m.isPublished).length;

  return (
    <div className="space-y-6">
      {/* Add Lesson Material / Study Resource Composer */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              {dt(
                'Publish Lesson Material or Study Resource',
                'পাঠ উপকরণ বা অধ্যয়ন রিসোর্স প্রকাশ করুন'
              )}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {dt('Scoped to {pathway} · {subject} syllabus modules', '{pathway} · {subject} পাঠ্যক্রম মডিউল', {
                pathway: localizedPathway,
                subject: teacher.primarySubject,
              })}
            </p>
          </div>
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400 tabular-nums">
            {dt('{pub} published · {draft} drafts', '{pub}টি প্রকাশিত · {draft}টি খসড়া', {
              pub: publishedCount,
              draft: draftCount,
            })}
          </span>
        </div>

        {formError && (
          <div
            role="alert"
            className="flex items-start gap-2.5 p-3.5 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-red-900 dark:text-red-200 text-sm"
          >
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-700 dark:text-red-400" aria-hidden="true" />
            <span>{td(formError)}</span>
          </div>
        )}

        {formSuccess && (
          <div
            role="status"
            className="flex items-start gap-2.5 p-3.5 rounded-xl bg-teal-50 dark:bg-teal-950/50 border border-teal-200 dark:border-teal-800 text-teal-900 dark:text-teal-200 text-sm"
          >
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-teal-700 dark:text-teal-400" aria-hidden="true" />
            <span>{formSuccess}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            <div className="md:col-span-6">
              <label
                htmlFor="teacher-module-title"
                className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
              >
                {dt('Module / Resource Title', 'মডিউল / উপকরণের শিরোনাম')}
              </label>
              <input
                id="teacher-module-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={dt(
                  'e.g. Chapter 4: Work, Power & Energy CQ Notes',
                  'যেমন: অধ্যায় ৪: কাজ, ক্ষমতা ও শক্তি সৃজনশীল নোট'
                )}
                className="w-full px-3.5 py-2.5 min-h-[42px] bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-600"
              />
            </div>

            <div className="md:col-span-3">
              <label
                htmlFor="teacher-module-class"
                className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
              >
                {dt('Target Class', 'নির্ধারিত শ্রেণি')}
              </label>
              <select
                id="teacher-module-class"
                value={academicClass}
                onChange={(e) => setAcademicClass(Number(e.target.value) as TeacherClassLevel)}
                className="w-full px-3 py-2.5 min-h-[42px] bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-600"
              >
                {TEACHER_CLASS_LEVELS.map((cls) => (
                  <option key={cls} value={cls}>
                    {dt('Class {cls}', 'শ্রেণি {cls}', { cls })}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-3">
              <label
                htmlFor="teacher-module-type"
                className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
              >
                {dt('Resource Type', 'উপকরণের ধরন')}
              </label>
              <select
                id="teacher-module-type"
                value={resourceType}
                onChange={(e) => setResourceType(e.target.value as TeacherResourceType)}
                className="w-full px-3 py-2.5 min-h-[42px] bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-600"
              >
                {RESOURCE_TYPES.map((rt) => (
                  <option key={rt} value={rt}>
                    {td(rt)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            <div className={academicClass >= 9 ? 'md:col-span-4' : 'md:col-span-6'}>
              <label
                htmlFor="teacher-module-chapter"
                className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
              >
                {dt('Chapter / Unit Label', 'অধ্যায় / ইউনিট')}
              </label>
              <input
                id="teacher-module-chapter"
                type="text"
                value={chapterTag}
                onChange={(e) => setChapterTag(e.target.value)}
                placeholder={dt('e.g. Ch. 04 · Energy', 'যেমন: অধ্যায় ০৪ · শক্তি')}
                className="w-full px-3.5 py-2.5 min-h-[42px] bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-600"
              />
            </div>

            {academicClass >= 9 && (
              <div className="md:col-span-3">
                <label
                  htmlFor="teacher-module-group"
                  className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
                >
                  {dt('Academic Group', 'বিভাগ')}
                </label>
                <select
                  id="teacher-module-group"
                  value={academicGroup}
                  onChange={(e) => setAcademicGroup(e.target.value as TeacherGroup)}
                  className="w-full px-3 py-2.5 min-h-[42px] bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-600"
                >
                  {TEACHER_GROUPS.map((g) => (
                    <option key={g} value={g}>
                      {td(g)}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className={academicClass >= 9 ? 'md:col-span-5 flex items-end' : 'md:col-span-6 flex items-end'}>
              <label className="inline-flex items-center gap-2.5 px-3.5 py-2.5 min-h-[42px] rounded-lg bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 cursor-pointer w-full">
                <input
                  type="checkbox"
                  checked={isPublished}
                  onChange={(e) => setIsPublished(e.target.checked)}
                  className="w-4 h-4 rounded accent-teal-600"
                />
                <span>
                  {dt('Publish immediately for {pathway} students', '{pathway} শিক্ষার্থীদের জন্য তাৎক্ষণিক প্রকাশ করুন', {
                    pathway: localizedPathway,
                  })}
                </span>
              </label>
            </div>
          </div>

          <div>
            <label
              htmlFor="teacher-module-summary"
              className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
            >
              {dt('Lesson Notes & Study Instructions', 'পাঠের নোট ও অধ্যয়ন নির্দেশনা')}
            </label>
            <textarea
              id="teacher-module-summary"
              rows={3}
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder={dt(
                'Summarize key formulas, textbook page numbers, worked examples, or practice homework for students...',
                'মূল সূত্র, পাঠ্যবইয়ের পৃষ্ঠা নম্বর, সমাধানকৃত উদাহরণ বা অনুশীলনী বাড়ির কাজ লিখুন...'
              )}
              className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-600"
            />
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              className="inline-flex items-center gap-2 px-5 py-2.5 min-h-[44px] bg-teal-700 hover:bg-teal-800 dark:bg-teal-600 dark:hover:bg-teal-500 text-white text-sm font-semibold rounded-lg transition-colors whitespace-nowrap"
            >
              <FilePlus2 className="w-4 h-4" aria-hidden="true" />
              <span>
                {isPublished
                  ? dt('Publish Resource', 'উপকরণ প্রকাশ করুন')
                  : dt('Save Draft', 'খসড়া সংরক্ষণ')}
              </span>
            </button>
          </div>
        </form>
      </section>

      {/* Syllabus Modules & Materials Library */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              {dt('My Syllabus Modules & Resources', 'আমার পাঠ্যক্রম মডিউল ও উপকরণসমূহ')}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {dt('Materials shared with {pathway} learners', '{pathway} শিক্ষার্থীদের সাথে শেয়ারকৃত উপকরণ', {
                pathway: localizedPathway,
              })}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative">
              <Search
                className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                aria-hidden="true"
              />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={dt('Search modules...', 'মডিউল খুঁজুন...')}
                aria-label={dt('Search syllabus modules', 'পাঠ্যক্রম মডিউল খুঁজুন')}
                className="pl-9 pr-3 py-2 min-h-[40px] w-52 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-600"
              />
            </div>

            <select
              aria-label={dt('Filter modules by class', 'শ্রেণি অনুযায়ী মডিউল ফিল্টার')}
              value={classFilter}
              onChange={(e) =>
                setClassFilter(
                  e.target.value === 'all' ? 'all' : (Number(e.target.value) as TeacherClassLevel)
                )
              }
              className="px-3 py-2 min-h-[40px] bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-600"
            >
              <option value="all">{td('All Classes')}</option>
              {TEACHER_CLASS_LEVELS.map((cls) => (
                <option key={cls} value={cls}>
                  {dt('Class {cls}', 'শ্রেণি {cls}', { cls })}
                </option>
              ))}
            </select>
          </div>
        </div>

        {filteredModules.length === 0 ? (
          <div className="py-10 text-center space-y-1.5 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
            <BookOpen className="w-6 h-6 text-slate-400 mx-auto" aria-hidden="true" />
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              {dt('No matching syllabus modules', 'কোনো মিল থাকা মডিউল পাওয়া যায়নি')}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {dt(
                'Publish a new lesson resource above or adjust your class filter.',
                'উপরে নতুন পাঠ উপকরণ প্রকাশ করুন অথবা শ্রেণি ফিল্টার পরিবর্তন করুন।'
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
                    <span className="font-semibold text-teal-700 dark:text-teal-400">
                      {td(mod.resourceType)}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="tabular-nums">
                      {dt('Class {cls}', 'শ্রেণি {cls}', { cls: mod.academicClass })}
                      {mod.academicGroup ? ` · ${td(mod.academicGroup)}` : ''}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>{mod.chapterTag}</span>
                    <span aria-hidden="true">·</span>
                    <span
                      className={
                        mod.isPublished
                          ? 'font-semibold text-emerald-700 dark:text-emerald-400'
                          : 'font-semibold text-amber-700 dark:text-amber-400'
                      }
                    >
                      {mod.isPublished ? td('Published') : dt('Draft', 'খসড়া')}
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white leading-snug">
                    {mod.title}
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed max-w-3xl">
                    {mod.summary}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => onGenerateWithAi(mod.title, mod.academicClass)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[36px] text-xs font-semibold text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/60 hover:bg-teal-100 dark:hover:bg-teal-900/60 border border-teal-200 dark:border-teal-800 rounded-lg transition-colors whitespace-nowrap"
                  >
                    <Bot className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>{dt('Draft Quiz', 'কুইজ তৈরি')}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onTogglePublished(mod.id)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[36px] text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors whitespace-nowrap"
                  >
                    {mod.isPublished ? (
                      <>
                        <EyeOff className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>{dt('Unpublish', 'অপ্রকাশিত করুন')}</span>
                      </>
                    ) : (
                      <>
                        <Eye className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>{td('Publish')}</span>
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeleteModule(mod.id)}
                    aria-label={dt('Delete module {title}', 'মডিউল {title} মুছুন', {
                      title: mod.title,
                    })}
                    className="inline-flex items-center justify-center w-9 h-9 text-slate-500 dark:text-slate-400 hover:text-rose-700 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition-colors"
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
