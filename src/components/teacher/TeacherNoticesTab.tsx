import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  Bell,
  CheckCircle2,
  Clock,
  Megaphone,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import type { NoticeCategoryTag, PathwayNotice } from '../../services/adminNoticesService';
import {
  getTeacherPathwayLabel,
  TEACHER_CLASS_LEVELS,
  TEACHER_GROUPS,
  type TeacherAnnouncementTag,
  type TeacherClassAnnouncement,
  type TeacherClassLevel,
  type TeacherGroup,
  type TeacherProfileContext,
} from '../../services/teacherService';
import { useDashboardLanguage } from '../../i18n/useDashboardLanguage';

interface TeacherNoticesTabProps {
  teacher: TeacherProfileContext;
  officialNotices: PathwayNotice[];
  classAnnouncements: TeacherClassAnnouncement[];
  onPostAnnouncement: (input: {
    academicClass: TeacherClassLevel;
    academicGroup: TeacherGroup | null;
    title: string;
    message: string;
    tag: TeacherAnnouncementTag;
  }) => { ok: true } | { ok: false; error: string };
  onDeleteAnnouncement: (announcementId: string) => void;
}

const ANNOUNCEMENT_TAGS: TeacherAnnouncementTag[] = ['Study Update', 'Homework', 'Exam Prep'];

export function TeacherNoticesTab({
  teacher,
  officialNotices,
  classAnnouncements,
  onPostAnnouncement,
  onDeleteAnnouncement,
}: TeacherNoticesTabProps) {
  const { dt, td, formatDigits, formatDate: formatLocalizedDate } = useDashboardLanguage();
  const pathwayLabel = td(getTeacherPathwayLabel(teacher.pathway));

  // Official Admin Notices filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [audienceFilter, setAudienceFilter] = useState<'all' | 'teacher' | 'both'>('all');
  const [tagFilter, setTagFilter] = useState<'all' | NoticeCategoryTag>('all');
  const [readingNotice, setReadingNotice] = useState<PathwayNotice | null>(null);

  // Post Class Announcement form state
  const [annTitle, setAnnTitle] = useState('');
  const [annMessage, setAnnMessage] = useState('');
  const [annClass, setAnnClass] = useState<TeacherClassLevel>(teacher.assignedClasses[0] ?? 10);
  const [annGroup, setAnnGroup] = useState<TeacherGroup | 'all'>(
    teacher.academicGroup ?? 'all'
  );
  const [annTag, setAnnTag] = useState<TeacherAnnouncementTag>('Study Update');
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  const filteredOfficialNotices = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return officialNotices.filter((n) => {
      if (audienceFilter !== 'all' && n.targetAudience !== audienceFilter) return false;
      if (tagFilter !== 'all' && n.categoryTag !== tagFilter) return false;
      if (q) {
        const hay = `${n.title} ${n.description} ${n.categoryTag ?? ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [officialNotices, searchQuery, audienceFilter, tagFilter]);

  const handlePostSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    const res = onPostAnnouncement({
      academicClass: annClass,
      academicGroup: annClass >= 9 && annGroup !== 'all' ? annGroup : null,
      title: annTitle,
      message: annMessage,
      tag: annTag,
    });

    if (!res.ok) {
      setFormError(td(res.error));
      return;
    }

    setAnnTitle('');
    setAnnMessage('');
    setFormSuccess(
      dt(
        'Posted class announcement for {pathway} Class {cls}.',
        '{pathway} শ্রেণি {cls}-এর জন্য শ্রেণি ঘোষণা প্রকাশ করা হয়েছে।',
        { pathway: pathwayLabel, cls: formatDigits(annClass) }
      )
    );
  };

  const formatDate = (ts: number) =>
    formatLocalizedDate(ts, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

  return (
    <div className="space-y-6">
      {/* Official Pathway Admin Notices */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-5">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            {dt('Official Pathway Admin Notices', 'প্রাতিষ্ঠানিক বিভাগীয় অ্যাডমিন নোটিশ')}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {dt(
              'Announcements from {pathway} Admin targeted to Teachers or All Campus',
              '{pathway} অ্যাডমিনের পক্ষ থেকে শিক্ষক বা সকল ক্যাম্পাসের জন্য প্রকাশিত ঘোষণা',
              { pathway: pathwayLabel }
            )}
          </p>
        </div>

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
              placeholder={dt('Search official notices...', 'প্রাতিষ্ঠানিক নোটিশ খুঁজুন...')}
              aria-label={dt('Search official notices', 'প্রাতিষ্ঠানিক নোটিশ খুঁজুন')}
              className="w-full pl-10 pr-3.5 py-2 min-h-[42px] bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-600"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="inline-flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
              {(
                [
                  { id: 'all', label: dt('All', 'সকল') },
                  { id: 'teacher', label: dt('Teachers Only', 'শুধুমাত্র শিক্ষক') },
                  { id: 'both', label: dt('General (Both)', 'সাধারণ (উভয়)') },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setAudienceFilter(tab.id)}
                  className={`px-3 py-1.5 min-h-[34px] text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                    audienceFilter === tab.id
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <select
              aria-label={dt('Filter notices by category tag', 'ট্যাগ অনুযায়ী নোটিশ ফিল্টার করুন')}
              value={tagFilter}
              onChange={(e) => setTagFilter(e.target.value as 'all' | NoticeCategoryTag)}
              className="px-3 py-2 min-h-[40px] bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-600"
            >
              <option value="all">{dt('All Tags', 'সকল ট্যাগ')}</option>
              <option value="General">{td('General')}</option>
              <option value="Academic">{td('Academic')}</option>
              <option value="Urgent">{td('Urgent')}</option>
            </select>
          </div>
        </div>

        {filteredOfficialNotices.length === 0 ? (
          <div className="py-8 text-center space-y-1.5 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
            <Bell className="w-6 h-6 text-slate-400 mx-auto" aria-hidden="true" />
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              {dt('No matching official notices', 'মিলে যায় এমন কোনো প্রাতিষ্ঠানিক নোটিশ নেই')}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {dt(
                'Official notices published by {pathway} Admin for teachers will appear here.',
                'শিক্ষকদের জন্য {pathway} অ্যাডমিন কর্তৃক প্রকাশিত নোটিশ এখানে দেখা যাবে।',
                { pathway: pathwayLabel }
              )}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {filteredOfficialNotices.map((notice) => (
              <article
                key={notice.id}
                className="py-4 first:pt-1 last:pb-1 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="min-w-0 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <span className="font-semibold text-teal-700 dark:text-teal-400">
                      {notice.targetAudience === 'teacher'
                        ? dt('Teacher Notice', 'শিক্ষক নোটিশ')
                        : dt('General Notice', 'সাধারণ নোটিশ')}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span
                      className={
                        notice.categoryTag === 'Urgent'
                          ? 'font-semibold text-rose-700 dark:text-rose-400'
                          : notice.categoryTag === 'Academic'
                            ? 'font-semibold text-amber-700 dark:text-amber-400'
                            : 'font-medium text-slate-600 dark:text-slate-300'
                      }
                    >
                      {td(notice.categoryTag ?? 'General')}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="inline-flex items-center gap-1 tabular-nums">
                      <Clock className="w-3 h-3" aria-hidden="true" />
                      {formatDate(notice.updatedAt)}
                    </span>
                  </div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white leading-snug">
                    {notice.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                    {notice.description}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setReadingNotice(notice)}
                  className="px-3.5 py-2 min-h-[38px] text-xs font-semibold text-slate-800 dark:text-slate-100 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg transition-colors whitespace-nowrap shrink-0"
                >
                  {dt('Read Full Notice', 'সম্পূর্ণ নোটিশ পড়ুন')}
                </button>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* Post Class Announcement + Teacher Announcements Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <section className="lg:col-span-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              {dt('Post Class Announcement', 'শ্রেণির ঘোষণা প্রকাশ করুন')}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {dt(
                'Share study updates, homework reminders, or exam prep notices with your {pathway} classes',
                'আপনার {pathway} শ্রেণির শিক্ষার্থীদের সাথে পাঠের তথ্য, বাড়ির কাজের নির্দেশনা বা পরীক্ষার প্রস্তুতির বার্তা শেয়ার করুন',
                { pathway: pathwayLabel }
              )}
            </p>
          </div>

          {formError && (
            <div
              role="alert"
              className="flex items-start gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-red-900 dark:text-red-200 text-xs"
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
              <span>{formError}</span>
            </div>
          )}

          {formSuccess && (
            <div
              role="status"
              className="flex items-start gap-2 p-3 rounded-xl bg-teal-50 dark:bg-teal-950/50 border border-teal-200 dark:border-teal-800 text-teal-900 dark:text-teal-200 text-xs"
            >
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
              <span>{formSuccess}</span>
            </div>
          )}

          <form onSubmit={handlePostSubmit} className="space-y-4" noValidate>
            <div>
              <label
                htmlFor="teacher-ann-title"
                className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
              >
                {dt('Announcement Title', 'ঘোষণার শিরোনাম')}
              </label>
              <input
                id="teacher-ann-title"
                type="text"
                value={annTitle}
                onChange={(e) => setAnnTitle(e.target.value)}
                placeholder={dt(
                  'e.g. Lab Report Submission Deadline Extended',
                  'যেমন: ল্যাব রিপোর্ট জমার সময়সীমা বাড়ানো হয়েছে'
                )}
                className="w-full px-3.5 py-2.5 min-h-[42px] bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-600"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label
                  htmlFor="teacher-ann-class"
                  className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
                >
                  {dt('Class', 'শ্রেণি')}
                </label>
                <select
                  id="teacher-ann-class"
                  value={annClass}
                  onChange={(e) => setAnnClass(Number(e.target.value) as TeacherClassLevel)}
                  className="w-full px-3 py-2.5 min-h-[42px] bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-600"
                >
                  {TEACHER_CLASS_LEVELS.map((cls) => (
                    <option key={cls} value={cls}>
                      {dt('Class {cls}', 'শ্রেণি {cls}', { cls: formatDigits(cls) })}
                    </option>
                  ))}
                </select>
              </div>

              {annClass >= 9 && (
                <div>
                  <label
                    htmlFor="teacher-ann-group"
                    className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
                  >
                    {dt('Group', 'বিভাগ')}
                  </label>
                  <select
                    id="teacher-ann-group"
                    value={annGroup}
                    onChange={(e) => setAnnGroup(e.target.value as TeacherGroup | 'all')}
                    className="w-full px-3 py-2.5 min-h-[42px] bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-600"
                  >
                    <option value="all">{dt('All Groups', 'সকল বিভাগ')}</option>
                    {TEACHER_GROUPS.map((g) => (
                      <option key={g} value={g}>
                        {td(g)}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className={annClass >= 9 ? '' : 'sm:col-span-2'}>
                <label
                  htmlFor="teacher-ann-tag"
                  className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
                >
                  {dt('Tag', 'ট্যাগ')}
                </label>
                <select
                  id="teacher-ann-tag"
                  value={annTag}
                  onChange={(e) => setAnnTag(e.target.value as TeacherAnnouncementTag)}
                  className="w-full px-3 py-2.5 min-h-[42px] bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-600"
                >
                  {ANNOUNCEMENT_TAGS.map((tg) => (
                    <option key={tg} value={tg}>
                      {td(tg)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label
                htmlFor="teacher-ann-message"
                className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
              >
                {dt('Class Update Message', 'শ্রেণির হালনাগাদ বার্তা')}
              </label>
              <textarea
                id="teacher-ann-message"
                rows={3}
                value={annMessage}
                onChange={(e) => setAnnMessage(e.target.value)}
                placeholder={dt(
                  'Write clear instructions, chapter pages, or preparation notes for students...',
                  'শিক্ষার্থীদের জন্য স্পষ্ট নির্দেশনা, অধ্যায়ের পৃষ্ঠা নম্বর বা প্রস্তুতির নোট লিখুন...'
                )}
                className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-600"
              />
            </div>

            <button
              type="submit"
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 min-h-[44px] bg-teal-700 hover:bg-teal-800 dark:bg-teal-600 dark:hover:bg-teal-500 text-white text-sm font-semibold rounded-lg transition-colors"
            >
              <Megaphone className="w-4 h-4" aria-hidden="true" />
              <span>{dt('Post Class Announcement', 'শ্রেণির ঘোষণা প্রকাশ করুন')}</span>
            </button>
          </form>
        </section>

        <section className="lg:col-span-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {dt('Posted Class Announcements', 'প্রকাশিত শ্রেণির ঘোষণাসমূহ')}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {dt('Recent class updates shared under {pathway}', '{pathway}-এর অধীনে প্রকাশিত সাম্প্রতিক শ্রেণি আপডেট', {
                  pathway: pathwayLabel,
                })}
              </p>
            </div>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 tabular-nums">
              {dt('{count} posted', '{count}টি প্রকাশিত', { count: formatDigits(classAnnouncements.length) })}
            </span>
          </div>

          {classAnnouncements.length === 0 ? (
            <div className="py-8 text-center space-y-1.5 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                {dt('No class announcements yet', 'এখনও কোনো শ্রেণির ঘোষণা নেই')}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {dt(
                  'Use the composer on the left to share study updates with your students.',
                  'শিক্ষার্থীদের সাথে পড়াশোনার আপডেট শেয়ার করতে বাম পাশের ফর্মটি ব্যবহার করুন।'
                )}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {classAnnouncements.map((ann) => (
                <article key={ann.id} className="py-4 first:pt-1 last:pb-1 space-y-1.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                        <span className="font-semibold text-teal-700 dark:text-teal-400">
                          {td(ann.tag)}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="tabular-nums">
                          {dt('Class {cls}', 'শ্রেণি {cls}', { cls: formatDigits(ann.academicClass) })}
                          {ann.academicGroup ? ` · ${td(ann.academicGroup)}` : ''}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>{td(ann.subject)}</span>
                      </div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                        {ann.title}
                      </h4>
                    </div>

                    <button
                      type="button"
                      onClick={() => onDeleteAnnouncement(ann.id)}
                      aria-label={dt('Delete announcement {title}', 'ঘোষণা মুছে ফেলুন: {title}', {
                        title: ann.title,
                      })}
                      className="w-8 h-8 rounded-lg inline-flex items-center justify-center text-slate-400 hover:text-rose-700 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors shrink-0"
                    >
                      <Trash2 className="w-4 h-4" aria-hidden="true" />
                    </button>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    {ann.message}
                  </p>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Full Official Notice Reader Modal */}
      {readingNotice && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-[2px]"
          onClick={(e) => {
            if (e.target === e.currentTarget) setReadingNotice(null);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="teacher-notice-modal-title"
            className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl overflow-hidden"
          >
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold text-teal-700 dark:text-teal-400">
                  {dt('{pathway} Admin', '{pathway} অ্যাডমিন', { pathway: pathwayLabel })} ·{' '}
                  {readingNotice.targetAudience === 'teacher'
                    ? dt('Teachers Only', 'শুধুমাত্র শিক্ষক')
                    : dt('General Notice', 'সাধারণ নোটিশ')}
                </p>
                <h3
                  id="teacher-notice-modal-title"
                  className="text-lg font-bold text-slate-900 dark:text-white mt-1"
                >
                  {readingNotice.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setReadingNotice(null)}
                aria-label={dt('Close notice', 'নোটিশ বন্ধ করুন')}
                className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 shrink-0"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                {readingNotice.description}
              </p>
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span>{dt('Published {date}', 'প্রকাশিত: {date}', { date: formatDate(readingNotice.createdAt) })}</span>
                <button
                  type="button"
                  onClick={() => setReadingNotice(null)}
                  className="px-4 py-2 min-h-[38px] font-semibold text-slate-800 dark:text-slate-100 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg"
                >
                  {td('Close')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
