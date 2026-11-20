import React, { useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  GraduationCap,
  Send,
  ShieldCheck,
  Users,
  X,
} from 'lucide-react';
import {
  adminNoticesService,
  canClassCarryGroupScope,
  canNoticeCarryAcademicScope,
  getNoticePathwayLabel,
  NOTICE_CLASSES,
  NOTICE_GROUPS,
  NOTICE_TAGS,
  type NoticeAudience,
  type NoticeCategoryTag,
  type NoticeClassLevel,
  type NoticeGroup,
  type NoticePathway,
  type PathwayNotice,
} from '../../services/adminNoticesService';
import { useDashboardLanguage } from '../../i18n/useDashboardLanguage';

interface NoticeComposerFormProps {
  pathway: NoticePathway;
  onNoticePublished: (notice: PathwayNotice) => void;
}

export function NoticeComposerForm({
  pathway,
  onNoticePublished,
}: NoticeComposerFormProps) {
  const { td, dt } = useDashboardLanguage();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [targetAudience, setTargetAudience] = useState<NoticeAudience>('both');
  const [targetClass, setTargetClass] = useState<NoticeClassLevel | 'all'>('all');
  const [targetGroup, setTargetGroup] = useState<NoticeGroup | 'all'>('all');
  const [categoryTag, setCategoryTag] = useState<NoticeCategoryTag | 'none'>('General');

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [publishedBanner, setPublishedBanner] = useState<string | null>(null);

  const pathwayLabel = td(getNoticePathwayLabel(pathway));
  const showAcademicScope = canNoticeCarryAcademicScope(targetAudience);
  const numericClass = targetClass === 'all' ? null : targetClass;
  const showGroupSelect = showAcademicScope && canClassCarryGroupScope(numericClass);

  const handleClassChange = (value: string) => {
    const nextClass = value === 'all' ? 'all' : (Number(value) as NoticeClassLevel);
    setTargetClass(nextClass);
    if (nextClass !== 'all' && !canClassCarryGroupScope(nextClass)) {
      setTargetGroup('all');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setPublishedBanner(null);

    const res = adminNoticesService.createNotice(pathway, {
      title,
      description,
      targetAudience,
      targetClass: showAcademicScope ? numericClass : null,
      targetGroup: showGroupSelect && targetGroup !== 'all' ? targetGroup : null,
      categoryTag: categoryTag === 'none' ? null : categoryTag,
    });

    if (!res.ok) {
      setErrorMsg(res.error);
      return;
    }

    setTitle('');
    setDescription('');
    setTargetAudience('both');
    setTargetClass('all');
    setTargetGroup('all');
    setCategoryTag('General');
    setPublishedBanner(
      dt('Published "{title}" to {pathway}.', '{pathway}-তে "{title}" প্রকাশিত হয়েছে।', {
        title: res.notice.title,
        pathway: pathwayLabel,
      })
    );
    onNoticePublished(res.notice);
  };

  const audienceOptions: {
    id: NoticeAudience;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }[] = [
    { id: 'teacher', label: dt('Teachers Only', 'শুধুমাত্র শিক্ষক'), icon: Users },
    { id: 'student', label: dt('Students Only', 'শুধুমাত্র শিক্ষার্থী'), icon: GraduationCap },
    { id: 'both', label: td('Both'), icon: Users },
  ];

  return (
    <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 transition-colors">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            {dt('Create Notice', 'নতুন নোটিশ তৈরি করুন')}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {dt(
              'Compose an announcement scoped strictly to the {pathway} panel.',
              'কেবলমাত্র {pathway} প্যানেলের জন্য একটি ঘোষণা লিখুন।',
              { pathway: pathwayLabel }
            )}
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 px-3 py-1 rounded-lg">
          <ShieldCheck className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          <span>{pathwayLabel}</span>
        </span>
      </div>

      <form onSubmit={handleSubmit} className="mt-5 space-y-5" noValidate>
        {publishedBanner && (
          <div
            role="status"
            className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 text-sm"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <CheckCircle2
                className="w-4 h-4 text-emerald-700 dark:text-emerald-400 shrink-0"
                aria-hidden="true"
              />
              <span>{publishedBanner}</span>
            </div>
            <button
              type="button"
              onClick={() => setPublishedBanner(null)}
              aria-label="Dismiss notification"
              className="p-1 rounded-md opacity-70 hover:opacity-100 shrink-0"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        )}

        {errorMsg && (
          <div
            role="alert"
            className="flex items-start gap-2.5 px-4 py-3 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-red-900 dark:text-red-200 text-sm"
          >
            <AlertCircle
              className="w-4 h-4 text-red-700 dark:text-red-400 shrink-0 mt-0.5"
              aria-hidden="true"
            />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Title & Category Tag */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          <div className="md:col-span-8">
            <label
              htmlFor="notice-title-input"
              className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
            >
              {dt('Notice Title', 'নোটিশের শিরোনাম')} <span className="text-red-600">*</span>
            </label>
            <input
              id="notice-title-input"
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={dt(
                'e.g. Half-Yearly Examination Routine Published',
                'যেমন: অর্ধবার্ষিক পরীক্ষার রুটিন প্রকাশিত হয়েছে'
              )}
              className="w-full px-3.5 py-2.5 min-h-[44px] bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-600"
            />
          </div>

          <div className="md:col-span-4">
            <label
              htmlFor="notice-tag-select"
              className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
            >
              {dt('Category / Tag (Optional)', 'বিভাগ / ট্যাগ (ঐচ্ছিক)')}
            </label>
            <select
              id="notice-tag-select"
              value={categoryTag}
              onChange={(e) => setCategoryTag(e.target.value as NoticeCategoryTag | 'none')}
              className="w-full px-3.5 py-2.5 min-h-[44px] bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-600"
            >
              <option value="none">{dt('No Tag', 'ট্যাগ নেই')}</option>
              {NOTICE_TAGS.map((tag) => (
                <option key={tag} value={tag}>
                  {td(tag)}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Description */}
        <div>
          <label
            htmlFor="notice-description-input"
            className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
          >
            {dt('Description', 'বিবরণ')} <span className="text-red-600">*</span>
          </label>
          <textarea
            id="notice-description-input"
            rows={4}
            required
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={dt(
              'Write the full announcement details, dates, timings, or instructions...',
              'ঘোষণার বিস্তারিত তথ্য, তারিখ, সময় বা নির্দেশনা লিখুন...'
            )}
            className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-600 leading-relaxed"
          />
        </div>

        {/* Target Audience & Optional Academic Scope */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-end">
          <div className="lg:col-span-6">
            <span className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              {dt('Target Audience', 'লক্ষ্যবর্গ')}
            </span>
            <div
              role="radiogroup"
              aria-label={dt('Target Audience', 'লক্ষ্যবর্গ')}
              className="inline-flex flex-wrap items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl w-full sm:w-auto"
            >
              {audienceOptions.map((opt) => {
                const Icon = opt.icon;
                const active = targetAudience === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => setTargetAudience(opt.id)}
                    className={`inline-flex items-center justify-center gap-1.5 px-3.5 py-2 min-h-[38px] rounded-lg text-xs font-semibold transition-colors whitespace-nowrap flex-1 sm:flex-initial ${
                      active
                        ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                    <span>{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {showAcademicScope && (
            <>
              <div className="lg:col-span-3">
                <label
                  htmlFor="notice-class-select"
                  className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
                >
                  {dt('Class Scope (Optional)', 'শ্রেণি পরিসর (ঐচ্ছিক)')}
                </label>
                <select
                  id="notice-class-select"
                  value={targetClass}
                  onChange={(e) => handleClassChange(e.target.value)}
                  className="w-full px-3.5 py-2 min-h-[42px] bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                >
                  <option value="all">{td('All Classes')}</option>
                  {NOTICE_CLASSES.map((cls) => (
                    <option key={cls} value={cls}>
                      {dt('Class {num}', 'শ্রেণি {num}', { num: cls })}
                    </option>
                  ))}
                </select>
              </div>

              {showGroupSelect && (
                <div className="lg:col-span-3">
                  <label
                    htmlFor="notice-group-select"
                    className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
                  >
                    {dt('Group (Class 9–12)', 'বিভাগ (শ্রেণি ৯–১২)')}
                  </label>
                  <select
                    id="notice-group-select"
                    value={targetGroup}
                    onChange={(e) => setTargetGroup(e.target.value as NoticeGroup | 'all')}
                    className="w-full px-3.5 py-2 min-h-[42px] bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  >
                    <option value="all">{dt('All Groups', 'সব বিভাগ')}</option>
                    {NOTICE_GROUPS.map((grp) => (
                      <option key={grp} value={grp}>
                        {td(grp)}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </>
          )}
        </div>

        <div className="pt-1 flex items-center justify-end">
          <button
            type="submit"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 min-h-[44px] bg-emerald-700 hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white text-sm font-semibold rounded-lg transition-colors whitespace-nowrap"
          >
            <Send className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>{td('Publish Notice')}</span>
          </button>
        </div>
      </form>
    </section>
  );
}
