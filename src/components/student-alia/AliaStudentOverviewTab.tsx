import React from 'react';
import {
  ArrowRight,
  Bell,
  BookOpen,
  CheckCircle2,
  GraduationCap,
  Layers,
  Sparkles,
} from 'lucide-react';
import {
  formatAliaStudentContextBadge,
  getAliaBoardName,
  getShortMarhalaLabel,
  type AliaNotice,
  type AliaStudentContext,
  type AliaStudentSubject,
} from '../../services/aliaStudentService';
import type { AliaStudentTab } from './AliaStudentShell';
import { useDashboardLanguage } from '../../i18n/useDashboardLanguage';

interface AliaStudentOverviewTabProps {
  student: AliaStudentContext;
  subjects: AliaStudentSubject[];
  completedLessonIds: string[];
  notices: AliaNotice[];
  onNavigateTab: (tab: AliaStudentTab) => void;
  onStudySubjectWithTutor: (subjectName: string) => void;
}

function formatNoticeDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function AliaStudentOverviewTab({
  student,
  subjects,
  completedLessonIds,
  notices,
  onNavigateTab,
  onStudySubjectWithTutor,
}: AliaStudentOverviewTabProps) {
  const { dt, td, formatDigits, formatDate } = useDashboardLanguage();

  const totalLessons = subjects.reduce((sum, s) => sum + s.lessons.length, 0);
  const completedSet = new Set(completedLessonIds);
  const completedCount = subjects.reduce(
    (sum, s) => sum + s.lessons.filter((l) => completedSet.has(l.id)).length,
    0
  );
  const progressPercent = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;

  const shortMarhala = td(getShortMarhalaLabel(student.marhala));
  const marhalaLabel = td(student.marhala);
  const deptLabel = td(student.department);
  const contextBadge = formatAliaStudentContextBadge(student.marhala, student.department)
    .split(' • ')
    .map((part) => td(part))
    .join(' • ');
  const boardName = td(getAliaBoardName());
  const latestNotices = notices.slice(0, 3);

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-7">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="space-y-2 max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
              {boardName}
            </p>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
              {dt('Assalamu Alaikum, {name}', 'আসসালামু আলাইকুম, {name}', {
                name: student.fullName,
              })}
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              {dt(
                'Your {marhala} ({dept}) study workspace is organized around official Alia Madrasa textbooks, syllabus modules, official circulars, and guided AI study support.',
                'আপনার {marhala} ({dept}) স্টাডি ওয়ার্কস্পেসটি আলিয়া মাদরাসার পাঠ্যবই, সিলেবাস মডিউল, আনুষ্ঠানিক বিজ্ঞপ্তি এবং গাইডেড এআই স্টাডি সহায়তার সমন্বয়ে সাজানো হয়েছে।',
                { marhala: shortMarhala, dept: deptLabel }
              )}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => onNavigateTab('subjects')}
              className="inline-flex items-center gap-2 px-4 py-2.5 min-h-[42px] bg-emerald-700 hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white text-sm font-semibold rounded-xl transition-colors"
            >
              <BookOpen className="w-4 h-4" aria-hidden="true" />
              <span>{td('Open My Subjects')}</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigateTab('ai-tutor')}
              className="inline-flex items-center gap-2 px-4 py-2.5 min-h-[42px] bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 border border-slate-300 dark:border-slate-700 text-sm font-semibold rounded-xl transition-colors"
            >
              <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
              <span>{td('Ask AI Tutor')}</span>
            </button>
          </div>
        </div>

        {/* Overall Syllabus Progress Bar */}
        <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between text-xs sm:text-sm mb-2">
            <span className="font-medium text-slate-700 dark:text-slate-300">
              {dt('{marhala} Syllabus Progress ({dept})', '{marhala} সিলেবাস অগ্রগতি ({dept})', {
                marhala: shortMarhala,
                dept: deptLabel,
              })}
            </span>
            <span className="font-semibold text-emerald-700 dark:text-emerald-400 tabular-nums">
              {dt('{done} of {total} lessons completed ({pct}%)', '{total}টির মধ্যে {done}টি পাঠ সম্পন্ন ({pct}%)', {
                done: completedCount,
                total: totalLessons,
                pct: progressPercent,
              })}
            </span>
          </div>
          <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-600 dark:bg-emerald-500 rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </section>

      {/* 4 Summary Cards */}
      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              {td('Pathway & Marhala')}
            </p>
            <GraduationCap className="w-4 h-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
          </div>
          <p className="text-base font-bold text-slate-900 dark:text-white mt-2 truncate">
            {td('Alia')} • {shortMarhala}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 truncate">
            {marhalaLabel}
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              {td('Department / Stream')}
            </p>
            <Layers className="w-4 h-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
          </div>
          <p className="text-base font-bold text-slate-900 dark:text-white mt-2 truncate">
            {deptLabel}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 truncate">
            {contextBadge}
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              {td('Active Subjects')}
            </p>
            <BookOpen className="w-4 h-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1.5 tabular-nums">
            {formatDigits(subjects.length)}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 tabular-nums">
            {dt('{count} structured lessons', '{count}টি সাজানো পাঠ', { count: totalLessons })}
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              {td('Official Notices')}
            </p>
            <Bell className="w-4 h-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1.5 tabular-nums">
            {formatDigits(notices.length)}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {td('Alia Madrasa circulars')}
          </p>
        </div>
      </section>

      {/* Main Split: Priority Subjects + Latest Notices */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Priority Subjects */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {td('Continue Studying')}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {dt(
                  'Core & department subjects tailored for {marhala} ({dept})',
                  '{marhala} ({dept})-এর উপযোগী আবশ্যিক ও বিভাগীয় বিষয়সমূহ',
                  { marhala: shortMarhala, dept: deptLabel }
                )}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigateTab('subjects')}
              className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300"
            >
              <span>{td('View all')}</span>
              <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          </div>

          <div className="space-y-3">
            {subjects.slice(0, 4).map((subject) => {
              const doneInSubject = subject.lessons.filter((l) => completedSet.has(l.id)).length;
              const pct = Math.round((doneInSubject / Math.max(subject.lessons.length, 1)) * 100);
              return (
                <div
                  key={subject.id}
                  className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">
                        {subject.code}
                      </span>
                      <span className="text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
                        {td(subject.category)}
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                      {subject.name}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                      {dt('{done}/{total} lessons completed ({pct}%)', '{done}/{total}টি পাঠ সম্পন্ন ({pct}%)', {
                        done: doneInSubject,
                        total: subject.lessons.length,
                        pct,
                      })}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => onStudySubjectWithTutor(subject.name)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[36px] rounded-lg bg-white dark:bg-slate-900 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-semibold transition-colors"
                    >
                      <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>{td('Ask Tutor')}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Latest Alia Notices Preview */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 flex flex-col">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {td('Latest Alia Notices')}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {td('Official circulars from your Alia Madrasa Admin')}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigateTab('notices')}
              className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300"
            >
              <span>{td('All notices')}</span>
              <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          </div>

          {latestNotices.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center py-8 text-slate-500 dark:text-slate-400">
              <CheckCircle2 className="w-8 h-8 text-emerald-600/70 mb-2" aria-hidden="true" />
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                {td('No active circulars right now')}
              </p>
              <p className="text-xs mt-1">
                {td('New Alia Madrasa notices will appear here automatically.')}
              </p>
            </div>
          ) : (
            <div className="space-y-3 flex-1">
              {latestNotices.map((notice) => (
                <article
                  key={notice.id}
                  className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/60 space-y-1.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`text-[11px] font-semibold px-2 py-0.5 rounded-md border ${
                        notice.tag === 'Urgent'
                          ? 'bg-red-50 dark:bg-red-950/50 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800'
                          : notice.tag === 'Exam'
                            ? 'bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                            : 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                      }`}
                    >
                      {td(notice.tag)}
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      {formatDate(notice.createdAt, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white leading-snug">
                    {notice.title}
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                    {notice.description}
                  </p>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
