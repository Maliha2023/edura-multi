import React from 'react';
import { ArrowRight, Bell, BookOpen, Bot, CheckCircle2, Clock } from 'lucide-react';
import type { PathwayNotice } from '../../services/adminNoticesService';
import {
  formatStudentContextBadge,
  getStudentPathwayLabel,
  type StudentProfileContext,
  type StudentSubject,
} from '../../services/studentService';
import type { StudentTabId } from './StudentShell';
import { useDashboardLanguage } from '../../i18n/useDashboardLanguage';

interface StudentOverviewTabProps {
  student: StudentProfileContext;
  subjects: StudentSubject[];
  completedLessonIds: string[];
  notices: PathwayNotice[];
  onNavigateTab: (tab: StudentTabId) => void;
  onStartTutorWithSubject: (subjectName: string) => void;
}

export function StudentOverviewTab({
  student,
  subjects,
  completedLessonIds,
  notices,
  onNavigateTab,
  onStartTutorWithSubject,
}: StudentOverviewTabProps) {
  const { dt, td, formatDigits, formatDate } = useDashboardLanguage();

  const totalLessons = subjects.reduce((sum, subj) => sum + subj.lessons.length, 0);
  const completedCount = subjects.reduce(
    (sum, subj) => sum + subj.lessons.filter((l) => completedLessonIds.includes(l.id)).length,
    0
  );
  const completionPct = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;

  const pathwayLabel = getStudentPathwayLabel(student.pathway);
  const contextText = formatStudentContextBadge(
    student.pathway,
    student.academicClass,
    student.academicGroup
  );
  const latestNotices = notices.slice(0, 3);
  const featuredSubjects = subjects.slice(0, 3);

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-6 transition-colors">
        <div className="space-y-2 max-w-2xl">
          <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
            {td('Bangladesh National Curriculum (NCTB)')} · {td(contextText)}
          </p>
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight text-balance">
            {dt('Welcome back, {name}', 'স্বাগতম, {name}', { name: student.fullName })}
          </h2>
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 leading-relaxed">
            {dt(
              'Your subjects, study modules, AI Study Tutor, and school announcements are aligned to your {pathway} curriculum for Class {cls}{group}.',
              'আপনার বিষয়, পাঠ্য মডিউল, এআই স্টাডি টিউটর এবং বিদ্যালয়ের ঘোষণাসমূহ শ্রেণি {cls}{group}-এর {pathway} পাঠ্যক্রমের সাথে সমন্বিত।',
              {
                pathway: td(pathwayLabel),
                cls: student.academicClass,
                group: student.academicGroup ? ` (${td(student.academicGroup)})` : '',
              }
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => onNavigateTab('tutor')}
            className="inline-flex items-center gap-2 px-5 py-2.5 min-h-[44px] bg-emerald-700 hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white text-sm font-semibold rounded-lg transition-colors whitespace-nowrap"
          >
            <Bot className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>{td('Open AI Study Tutor')}</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigateTab('subjects')}
            className="inline-flex items-center gap-2 px-4 py-2.5 min-h-[44px] bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 text-sm font-semibold rounded-lg transition-colors whitespace-nowrap"
          >
            <BookOpen className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>{td('Browse Subjects')}</span>
          </button>
        </div>
      </section>

      {/* Pathway / Academic / Study Stats Row */}
      <section
        aria-label={dt('Academic summary', 'একাডেমিক সারসংক্ষেপ')}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            {td('Active Pathway')}
          </p>
          <p className="text-lg font-bold text-slate-900 dark:text-white mt-1.5">
            {td(pathwayLabel)}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {dt('NCTB Curriculum Track', 'এনসিটিবি পাঠ্যক্রম শাখা')}
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            {td('Academic Level')}
          </p>
          <p className="text-lg font-bold text-slate-900 dark:text-white mt-1.5 tabular-nums">
            {dt('Class {cls}', 'শ্রেণি {cls}', { cls: student.academicClass })}
            {student.academicGroup ? ` · ${td(student.academicGroup)}` : ''}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {student.academicClass >= 11
              ? dt('Higher Secondary (HSC)', 'উচ্চ মাধ্যমিক (এইচএসসি)')
              : student.academicClass >= 9
                ? dt('Secondary (SSC)', 'মাধ্যমিক (এসএসসি)')
                : student.academicClass >= 6
                  ? dt('Junior Secondary', 'নিম্ন মাধ্যমিক')
                  : dt('Primary Level', 'প্রাথমিক স্তর')}
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            {dt('Study Progress', 'পড়াশোনার অগ্রগতি')}
          </p>
          <p className="text-lg font-bold text-slate-900 dark:text-white mt-1.5 tabular-nums">
            {dt('{done} / {total} Lessons', '{done} / {total} পাঠ', {
              done: completedCount,
              total: totalLessons,
            })}
          </p>
          <div className="mt-2 flex items-center gap-2.5">
            <div className="flex-1 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-600 dark:bg-emerald-500 transition-all"
                style={{ width: `${completionPct}%` }}
              />
            </div>
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 tabular-nums">
              {formatDigits(completionPct)}%
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            {dt('Enrolled Subjects & Notices', 'নিবন্ধিত বিষয় ও নোটিশ')}
          </p>
          <p className="text-lg font-bold text-slate-900 dark:text-white mt-1.5 tabular-nums">
            {dt('{subjs} Subject(s) · {notices} Notice(s)', '{subjs}টি বিষয় · {notices}টি নোটিশ', {
              subjs: subjects.length,
              notices: notices.length,
            })}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {dt('Synced with {pathway} board', '{pathway} বোর্ডের সাথে সমন্বিত', {
              pathway: td(pathwayLabel),
            })}
          </p>
        </div>
      </section>

      {/* Two-Column Content: Subjects Quick Launch + Latest Relevant Notices */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Focus Subjects */}
        <section className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {td('Continue Studying')}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {dt(
                  'Priority subjects for Class {cls}{group}',
                  'শ্রেণি {cls}{group}-এর অগ্রাধিকার বিষয়সমূহ',
                  {
                    cls: student.academicClass,
                    group: student.academicGroup ? ` ${td(student.academicGroup)}` : '',
                  }
                )}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigateTab('subjects')}
              className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:underline whitespace-nowrap"
            >
              <span>
                {dt('All {count} subjects', 'সব {count}টি বিষয়', { count: subjects.length })}
              </span>
              <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {featuredSubjects.map((subject) => {
              const doneInSubject = subject.lessons.filter((l) =>
                completedLessonIds.includes(l.id)
              ).length;
              return (
                <div
                  key={subject.id}
                  className="py-4 first:pt-1 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                      <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">
                        {subject.code}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>{td(subject.category)}</span>
                      <span aria-hidden="true">·</span>
                      <span className="tabular-nums">
                        {dt('{done}/{total} completed', '{done}/{total} সম্পন্ন', {
                          done: doneInSubject,
                          total: subject.lessons.length,
                        })}
                      </span>
                    </div>
                    <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                      {subject.name}
                    </h4>
                    <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-1">
                      {subject.description}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => onStartTutorWithSubject(subject.name)}
                    className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 min-h-[38px] text-xs font-semibold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-950 border border-emerald-200 dark:border-emerald-800 rounded-lg transition-colors whitespace-nowrap shrink-0 self-start sm:self-center"
                  >
                    <Bot className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                    <span>{td('Ask Tutor')}</span>
                  </button>
                </div>
              );
            })}
          </div>
        </section>

        {/* Latest Relevant Notices Preview */}
        <section className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {td('Latest Notices')}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {dt('Announcements from {pathway} Admin', '{pathway} প্রশাসনের ঘোষণা', {
                  pathway: td(pathwayLabel),
                })}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigateTab('notices')}
              className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:underline whitespace-nowrap"
            >
              <span>{td('View all')}</span>
              <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          </div>

          {latestNotices.length === 0 ? (
            <div className="py-8 text-center">
              <Bell className="w-6 h-6 text-slate-400 mx-auto mb-2" aria-hidden="true" />
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                {td('No notices posted yet')}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {dt(
                  'New announcements for Class {cls} will appear here automatically.',
                  'শ্রেণি {cls}-এর নতুন ঘোষণাসমূহ স্বয়ংক্রিয়ভাবে এখানে প্রদর্শিত হবে।',
                  { cls: student.academicClass }
                )}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {latestNotices.map((notice) => (
                <article key={notice.id} className="py-3.5 first:pt-1 last:pb-0 space-y-1.5">
                  <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                    {notice.categoryTag && (
                      <>
                        <span
                          className={`font-semibold ${
                            notice.categoryTag === 'Urgent'
                              ? 'text-red-700 dark:text-red-400'
                              : notice.categoryTag === 'Academic'
                                ? 'text-amber-700 dark:text-amber-400'
                                : 'text-slate-600 dark:text-slate-300'
                          }`}
                        >
                          {td(notice.categoryTag)}
                        </span>
                        <span aria-hidden="true">·</span>
                      </>
                    )}
                    <span className="inline-flex items-center gap-1 tabular-nums">
                      <Clock className="w-3 h-3" aria-hidden="true" />
                      {formatDate(notice.createdAt, { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                  <h4 className="text-sm font-semibold text-slate-900 dark:text-white leading-snug">
                    {notice.title}
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                    {notice.description}
                  </p>
                </article>
              ))}
            </div>
          )}

          {completedCount > 0 && (
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-400 font-medium">
              <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span className="tabular-nums">
                {dt(
                  'You have completed {count} lesson(s) so far.',
                  'আপনি এ পর্যন্ত {count}টি পাঠ সম্পন্ন করেছেন।',
                  { count: completedCount }
                )}
              </span>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
