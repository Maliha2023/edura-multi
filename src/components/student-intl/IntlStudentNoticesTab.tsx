import React, { useMemo, useState } from 'react';
import { Bell, Clock, Search, X } from 'lucide-react';
import { getShortLevelLabel } from '../../services/internationalAdminService';
import {
  formatIntlStudentContextBadge,
  getIntlStudentPathwayLabel,
  internationalStudentService,
  type InternationalNotice,
  type InternationalNoticeTag,
  type IntlStudentContext,
} from '../../services/internationalStudentService';
import { useDashboardLanguage } from '../../i18n/useDashboardLanguage';

interface IntlStudentNoticesTabProps {
  student: IntlStudentContext;
}

const INTL_NOTICE_TAGS: readonly InternationalNoticeTag[] = ['General', 'Exam', 'Urgent'] as const;

function formatNoticeScope(notice: InternationalNotice): string | null {
  const parts: string[] = [];
  if (notice.academicLevel !== 'all') {
    parts.push(getShortLevelLabel(notice.academicLevel));
  }
  if (notice.academicTrack !== 'all') {
    parts.push(notice.academicTrack);
  }
  return parts.length > 0 ? parts.join(' • ') : null;
}

export function IntlStudentNoticesTab({ student }: IntlStudentNoticesTabProps) {
  const { dt, td, formatDate, formatDateTime } = useDashboardLanguage();

  const [query, setQuery] = useState('');
  const [audienceFilter, setAudienceFilter] = useState<'all' | 'student' | 'both'>('all');
  const [tagFilter, setTagFilter] = useState<'all' | InternationalNoticeTag>('all');
  const [selectedNotice, setSelectedNotice] = useState<InternationalNotice | null>(null);

  const pathwayLabel = td(getIntlStudentPathwayLabel(student.pathway));
  const contextLabel = formatIntlStudentContextBadge(
    student.pathway,
    student.academicLevel,
    student.academicTrack
  )
    .split(' · ')
    .map((part) => td(part))
    .join(' · ');

  const renderNoticeScope = (notice: InternationalNotice): string | null => {
    const raw = formatNoticeScope(notice);
    if (!raw) return null;
    return raw
      .split(' • ')
      .map((part) => td(part))
      .join(' • ');
  };

  const filteredNotices = useMemo(
    () =>
      internationalStudentService.listRelevantNotices(student, {
        query,
        audience: audienceFilter,
        tag: tagFilter,
      }),
    [student, query, audienceFilter, tagFilter]
  );

  return (
    <div className="space-y-5">
      {/* Search & Filter Controls */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            {td('Pathway Notices & Announcements')}
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">
            {dt(
              'Official notices from {pathway} Admin relevant to {context}.',
              '{context}-এর জন্য প্রাসঙ্গিক {pathway} অ্যাডমিনের আনুষ্ঠানিক বিজ্ঞপ্তি।',
              { pathway: pathwayLabel, context: contextLabel }
            )}
          </p>
        </div>

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search
              className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden="true"
            />
            <label htmlFor="intl-student-notices-search" className="sr-only">
              {td('Search notices')}
            </label>
            <input
              id="intl-student-notices-search"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={td('Search announcements by keyword...')}
              className="w-full pl-10 pr-4 py-2 min-h-[42px] bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-600"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div
              role="group"
              aria-label={td('Filter notices by audience')}
              className="inline-flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl"
            >
              {(
                [
                  { id: 'all', label: 'All' },
                  { id: 'student', label: 'Students Only' },
                  { id: 'both', label: 'General (Both)' },
                ] as const
              ).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setAudienceFilter(item.id)}
                  className={`px-3 py-1.5 min-h-[34px] text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                    audienceFilter === item.id
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {td(item.label)}
                </button>
              ))}
            </div>

            <select
              aria-label={td('Filter by notice category tag')}
              value={tagFilter}
              onChange={(e) => setTagFilter(e.target.value as 'all' | InternationalNoticeTag)}
              className="px-3 py-2 min-h-[40px] bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-600"
            >
              <option value="all">{td('All Tags')}</option>
              {INTL_NOTICE_TAGS.map((tag) => (
                <option key={tag} value={tag}>
                  {td(tag)}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {/* Notice List */}
      {filteredNotices.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl px-6 py-14 text-center space-y-2">
          <Bell className="w-7 h-7 text-slate-400 mx-auto" aria-hidden="true" />
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
            {td('No matching notices found')}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {dt(
              'Try clearing your search or category filters to see all notices for {context}.',
              '{context}-এর সব বিজ্ঞপ্তি দেখতে অনুসন্ধান বা ক্যাটাগরি ফিল্টার পরিষ্কার করুন।',
              { context: contextLabel }
            )}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredNotices.map((notice) => {
            const scope = renderNoticeScope(notice);
            return (
              <article
                key={notice.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-start justify-between gap-4 transition-colors"
              >
                <div className="space-y-2 min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                      {notice.audience === 'student'
                        ? td('Student Notice')
                        : td('General Notice')}
                    </span>
                    {scope && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span>{scope}</span>
                      </>
                    )}
                    <span aria-hidden="true">·</span>
                    <span
                      className={`font-semibold ${
                        notice.tag === 'Urgent'
                          ? 'text-red-700 dark:text-red-400'
                          : notice.tag === 'Exam'
                            ? 'text-amber-700 dark:text-amber-400'
                            : 'text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      {td(notice.tag)}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="inline-flex items-center gap-1 tabular-nums">
                      <Clock className="w-3 h-3" aria-hidden="true" />
                      {formatDate(notice.createdAt, {
                        dateStyle: 'medium',
                      })}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-slate-900 dark:text-white leading-snug">
                    {notice.title}
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
                    {notice.description}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedNotice(notice)}
                  className="inline-flex items-center justify-center px-3.5 py-2 min-h-[38px] text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors whitespace-nowrap shrink-0 self-start"
                >
                  {td('Read Full Notice')}
                </button>
              </article>
            );
          })}
        </div>
      )}

      {/* Full Read View Modal */}
      {selectedNotice && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-[2px] overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedNotice(null);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="intl-student-notice-read-title"
            className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl overflow-hidden my-auto"
          >
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                  {dt('{pathway} Announcement', '{pathway} বিজ্ঞপ্তি', { pathway: pathwayLabel })}{' '}
                  · {td(selectedNotice.tag)}
                </p>
                <h3
                  id="intl-student-notice-read-title"
                  className="text-lg font-bold text-slate-900 dark:text-white mt-1"
                >
                  {selectedNotice.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedNotice(null)}
                aria-label={td('Close notice')}
                className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 shrink-0"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                <span>
                  {td('Published')}{' '}
                  {formatDateTime(selectedNotice.createdAt, {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  })}
                </span>
                {renderNoticeScope(selectedNotice) && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span>
                      {td('Scope')}: {renderNoticeScope(selectedNotice)}
                    </span>
                  </>
                )}
              </div>

              <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed whitespace-pre-line">
                {selectedNotice.description}
              </p>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => setSelectedNotice(null)}
                  className="px-4 py-2 min-h-[40px] bg-emerald-700 hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white text-sm font-semibold rounded-lg transition-colors"
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
