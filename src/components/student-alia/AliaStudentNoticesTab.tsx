import React, { useMemo, useState } from 'react';
import { Bell, Calendar, Search, X } from 'lucide-react';
import {
  aliaStudentService,
  type AliaNotice,
  type AliaNoticeTag,
  type AliaStudentContext,
} from '../../services/aliaStudentService';
import { useDashboardLanguage } from '../../i18n/useDashboardLanguage';

interface AliaStudentNoticesTabProps {
  student: AliaStudentContext;
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function AliaStudentNoticesTab({ student }: AliaStudentNoticesTabProps) {
  const { dt, td, formatDate: formatLocalizedDate } = useDashboardLanguage();

  const [query, setQuery] = useState('');
  const [audienceFilter, setAudienceFilter] = useState<'all' | 'student' | 'both'>('all');
  const [tagFilter, setTagFilter] = useState<'all' | AliaNoticeTag>('all');
  const [activeNotice, setActiveNotice] = useState<AliaNotice | null>(null);

  const notices = useMemo(
    () =>
      aliaStudentService.listRelevantNotices(student, {
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
          {td('Alia Madrasa Notices')}
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
          {dt(
            'Official circulars published by the Alia Madrasa Administration for {marhala} ({dept}).',
            '{marhala} ({dept})-এর জন্য আলিয়া মাদরাসা প্রশাসনের প্রকাশিত আনুষ্ঠানিক বিজ্ঞপ্তি।',
            { marhala: td(student.marhala), dept: td(student.department) }
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
          <label htmlFor="alia-notices-search" className="sr-only">
            {td('Search notices')}
          </label>
          <input
            id="alia-notices-search"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={td('Search Alia Madrasa circulars…')}
            className="w-full pl-10 pr-4 py-2 min-h-[42px] bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-600"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <label htmlFor="alia-notices-audience" className="sr-only">
            {td('Filter by audience')}
          </label>
          <select
            id="alia-notices-audience"
            value={audienceFilter}
            onChange={(e) => setAudienceFilter(e.target.value as 'all' | 'student' | 'both')}
            className="px-3.5 py-2 min-h-[42px] bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-600"
          >
            <option value="all">{td('All Audiences')}</option>
            <option value="student">{td('Students Only')}</option>
            <option value="both">{td('General (Both)')}</option>
          </select>

          <label htmlFor="alia-notices-tag" className="sr-only">
            {td('Filter by tag')}
          </label>
          <select
            id="alia-notices-tag"
            value={tagFilter}
            onChange={(e) => setTagFilter(e.target.value as 'all' | AliaNoticeTag)}
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
            {td('No matching Alia notices')}
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {td('Try clearing your search or selecting a different tag or audience filter.')}
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
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-md border ${
                        notice.tag === 'Urgent'
                          ? 'bg-red-50 dark:bg-red-950/50 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800'
                          : notice.tag === 'Exam'
                            ? 'bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                            : 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                      }`}
                    >
                      {td(notice.tag)}
                    </span>
                    <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                      {notice.audience === 'student'
                        ? td('Students Only')
                        : td('Students & Faculty')}
                    </span>
                  </div>
                  <span className="inline-flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                    <Calendar className="w-3.5 h-3.5" aria-hidden="true" />
                    {formatLocalizedDate(notice.createdAt, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
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
                  {td('Scope')}: {notice.marhala === 'all' ? td('All Marhalas') : td(notice.marhala)}
                  {notice.department !== 'all' ? ` · ${td(notice.department)}` : ''}
                </span>
                <button
                  type="button"
                  onClick={() => setActiveNotice(notice)}
                  className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300 shrink-0"
                >
                  {td('Read Full Notice')}
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
            aria-labelledby="alia-notice-modal-title"
            className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl overflow-hidden"
          >
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                  {td('Alia Madrasa Official Circular')} · {td(activeNotice.tag)}
                </p>
                <h2
                  id="alia-notice-modal-title"
                  className="text-lg font-bold text-slate-900 dark:text-white mt-1"
                >
                  {activeNotice.title}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setActiveNotice(null)}
                aria-label={td('Close notice reader')}
                className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                <span>
                  {td('Published')}{' '}
                  {formatLocalizedDate(activeNotice.createdAt, {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </span>
                <span>•</span>
                <span>
                  {td('Audience')}:{' '}
                  {activeNotice.audience === 'student'
                    ? td('Students Only')
                    : td('Students & Faculty')}
                </span>
                <span>•</span>
                <span>
                  {td('Scope')}:{' '}
                  {activeNotice.marhala === 'all' ? td('All Marhalas') : td(activeNotice.marhala)}
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
