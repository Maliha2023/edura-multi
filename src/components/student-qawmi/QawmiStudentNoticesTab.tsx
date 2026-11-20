import React, { useMemo, useState } from 'react';
import { Bell, Calendar, Search, X } from 'lucide-react';
import {
  qawmiStudentService,
  type QawmiNotice,
  type QawmiNoticeTag,
  type QawmiStudentContext,
} from '../../services/qawmiStudentService';
import { useDashboardLanguage } from '../../i18n/useDashboardLanguage';

interface QawmiStudentNoticesTabProps {
  student: QawmiStudentContext;
}

export function QawmiStudentNoticesTab({ student }: QawmiStudentNoticesTabProps) {
  const { dt, td, formatDate: formatLocalizedDate } = useDashboardLanguage();

  const [query, setQuery] = useState('');
  const [audienceFilter, setAudienceFilter] = useState<'all' | 'student' | 'both'>('all');
  const [tagFilter, setTagFilter] = useState<'all' | QawmiNoticeTag>('all');
  const [activeNotice, setActiveNotice] = useState<QawmiNotice | null>(null);

  const notices = useMemo(
    () =>
      qawmiStudentService.listRelevantNotices(student, {
        query,
        audience: audienceFilter,
        tag: tagFilter,
      }),
    [student, query, audienceFilter, tagFilter]
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
          {dt('Qawmi Madrasa Notices', 'কওমি মাদ্রাসা নোটিশসমূহ')}
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
          {dt(
            'Official announcements published by the Qawmi Madrasa Administration for {marhala} ({branch}).',
            '{marhala} ({branch})-এর জন্য কওমি মাদ্রাসা প্রশাসন কর্তৃক প্রকাশিত প্রাতিষ্ঠানিক বিজ্ঞপ্তি।',
            { marhala: td(student.marhala), branch: td(student.focusBranch) }
          )}
        </p>
      </div>

      {/* Filters Bar */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search
            className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2"
            aria-hidden="true"
          />
          <label htmlFor="qawmi-notices-search" className="sr-only">
            {dt('Search notices', 'নোটিশ খুঁজুন')}
          </label>
          <input
            id="qawmi-notices-search"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={dt('Search Qawmi Madrasa notices…', 'কওমি মাদ্রাসার নোটিশ খুঁজুন…')}
            className="w-full pl-10 pr-4 py-2 min-h-[42px] bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-600"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <label htmlFor="qawmi-notices-audience" className="sr-only">
            {dt('Filter by audience', 'লক্ষ্যবর্গ অনুযায়ী ফিল্টার')}
          </label>
          <select
            id="qawmi-notices-audience"
            value={audienceFilter}
            onChange={(e) => setAudienceFilter(e.target.value as 'all' | 'student' | 'both')}
            className="px-3.5 py-2 min-h-[42px] bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-600"
          >
            <option value="all">{td('All Audiences')}</option>
            <option value="student">{dt('Students Only', 'শুধুমাত্র শিক্ষার্থী')}</option>
            <option value="both">{dt('General (Both)', 'সাধারণ (উভয়)')}</option>
          </select>

          <label htmlFor="qawmi-notices-tag" className="sr-only">
            {dt('Filter by tag', 'ট্যাগ অনুযায়ী ফিল্টার')}
          </label>
          <select
            id="qawmi-notices-tag"
            value={tagFilter}
            onChange={(e) => setTagFilter(e.target.value as 'all' | QawmiNoticeTag)}
            className="px-3.5 py-2 min-h-[42px] bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-600"
          >
            <option value="all">{td('All Tags')}</option>
            <option value="General">{td('General')}</option>
            <option value="Exam">{td('Exam')}</option>
            <option value="Urgent">{td('Urgent')}</option>
          </select>
        </div>
      </section>

      {/* Notice Cards */}
      {notices.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-10 text-center">
          <Bell className="w-8 h-8 text-slate-400 mx-auto mb-3" aria-hidden="true" />
          <p className="text-base font-semibold text-slate-900 dark:text-white">
            {dt('No matching Qawmi notices', 'কোনো মিল থাকা কওমি নোটিশ পাওয়া যায়নি')}
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {dt(
              'Try clearing your search or selecting a different tag or audience filter.',
              'খোঁজার লেখা মুছে ফেলুন অথবা অন্য ট্যাগ বা লক্ষ্যবর্গ ফিল্টার নির্বাচন করুন।'
            )}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {notices.map((notice) => (
            <article
              key={notice.id}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 flex flex-col justify-between gap-4 hover:border-emerald-300 dark:hover:border-emerald-700 transition-colors"
            >
              <div className="space-y-2.5">
                <div className="flex items-center justify-between gap-2 flex-wrap text-xs">
                  <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                    <span
                      className={`font-semibold ${
                        notice.tag === 'Urgent'
                          ? 'text-red-700 dark:text-red-400'
                          : notice.tag === 'Exam'
                            ? 'text-amber-700 dark:text-amber-400'
                            : 'text-emerald-700 dark:text-emerald-400'
                      }`}
                    >
                      {td(notice.tag)}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>
                      {notice.audience === 'student'
                        ? dt('Students Only', 'শুধুমাত্র শিক্ষার্থী')
                        : dt('Students & Asatizah', 'শিক্ষার্থী ও আসাতিযা')}
                    </span>
                  </div>
                  <span className="inline-flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                    <Calendar className="w-3.5 h-3.5" aria-hidden="true" />
                    {formatLocalizedDate(notice.createdAt)}
                  </span>
                </div>

                <h2 className="text-base font-bold text-slate-900 dark:text-white leading-snug">
                  {notice.title}
                </h2>
                <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-3 leading-relaxed">
                  {notice.description}
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                <span className="text-xs text-slate-500 dark:text-slate-400 truncate">
                  {dt('Scope: {marhala}', 'পরিসর: {marhala}', {
                    marhala: notice.marhala === 'all' ? td('All Marhalas') : td(notice.marhala),
                  })}
                  {notice.focusBranch !== 'all' ? ` · ${td(notice.focusBranch)}` : ''}
                </span>
                <button
                  type="button"
                  onClick={() => setActiveNotice(notice)}
                  className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300 shrink-0 whitespace-nowrap"
                >
                  {dt('Read Full Notice', 'সম্পূর্ণ নোটিশ পড়ুন')}
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Full Notice Reader Modal */}
      {activeNotice && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-[2px]"
          onClick={(e) => {
            if (e.target === e.currentTarget) setActiveNotice(null);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="qawmi-notice-modal-title"
            className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl overflow-hidden"
          >
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                  {dt('Qawmi Madrasa Official Circular · {tag}', 'কওমি মাদ্রাসা প্রাতিষ্ঠানিক বিজ্ঞপ্তি · {tag}', {
                    tag: td(activeNotice.tag),
                  })}
                </p>
                <h2
                  id="qawmi-notice-modal-title"
                  className="text-lg font-bold text-slate-900 dark:text-white mt-1"
                >
                  {activeNotice.title}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setActiveNotice(null)}
                aria-label={dt('Close notice reader', 'নোটিশ পাঠক বন্ধ করুন')}
                className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                <span>
                  {dt('Published {date}', 'প্রকাশিত: {date}', {
                    date: formatLocalizedDate(activeNotice.createdAt),
                  })}
                </span>
                <span aria-hidden="true">·</span>
                <span>
                  {dt('Audience: {audience}', 'লক্ষ্যবর্গ: {audience}', {
                    audience:
                      activeNotice.audience === 'student'
                        ? dt('Students Only', 'শুধুমাত্র শিক্ষার্থী')
                        : dt('Students & Asatizah', 'শিক্ষার্থী ও আসাতিযা'),
                  })}
                </span>
                <span aria-hidden="true">·</span>
                <span>
                  {dt('Scope: {marhala}', 'পরিসর: {marhala}', {
                    marhala:
                      activeNotice.marhala === 'all'
                        ? td('All Marhalas')
                        : td(activeNotice.marhala),
                  })}
                </span>
              </div>
              <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                {activeNotice.description}
              </p>
            </div>
            <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 flex justify-end">
              <button
                type="button"
                onClick={() => setActiveNotice(null)}
                className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-semibold transition-colors"
              >
                {td('Close')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
