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
  getQawmiBoardName,
  getShortQawmiMarhalaLabel,
  type QawmiNotice,
  type QawmiStudentContext,
  type QawmiStudentSubject,
} from '../../services/qawmiStudentService';
import { useDashboardLanguage } from '../../i18n/useDashboardLanguage';
import type { QawmiStudentTab } from './QawmiStudentShell';

interface QawmiStudentOverviewTabProps {
  student: QawmiStudentContext;
  subjects: QawmiStudentSubject[];
  completedLessonIds: string[];
  notices: QawmiNotice[];
  onNavigateTab: (tab: QawmiStudentTab) => void;
  onStudySubjectWithTutor: (subjectName: string) => void;
}

export function QawmiStudentOverviewTab({
  student,
  subjects,
  completedLessonIds,
  notices,
  onNavigateTab,
  onStudySubjectWithTutor,
}: QawmiStudentOverviewTabProps) {
  const { dt, td, formatDigits, formatDate } = useDashboardLanguage();

  const totalLessons = subjects.reduce((sum, s) => sum + s.lessons.length, 0);
  const completedSet = new Set(completedLessonIds);
  const completedCount = subjects.reduce(
    (sum, s) => sum + s.lessons.filter((l) => completedSet.has(l.id)).length,
    0
  );
  const progressPercent = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;

  const shortMarhala = getShortQawmiMarhalaLabel(student.marhala);
  const boardName = getQawmiBoardName();
  const latestNotices = notices.slice(0, 3);
  const localizedMarhala = td(shortMarhala);
  const localizedFullMarhala = td(student.marhala);
  const localizedFocus = td(student.focusBranch);

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-7">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="space-y-2 max-w-2xl">
            <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
              {td(boardName)}
            </p>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
              {dt('Assalamu Alaikum, {name}', 'আসসালামু আলাইকুম, {name}', {
                name: student.fullName,
              })}
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              {dt(
                'Your {marhala} ({branch}) study workspace is tailored around Dars-e-Nizami kitabs, structured Takrar modules, Qawmi announcements, and guided AI study support.',
                'আপনার {marhala} ({branch}) অধ্যয়ন ওয়ার্কস্পেস দরসে নিজামী কিতাব, সুবিন্যস্ত তাকরার মডিউল, কওমি বিজ্ঞপ্তি ও এআই স্টাডি সহায়তার জন্য সাজানো হয়েছে।',
                { marhala: localizedMarhala, branch: localizedFocus }
              )}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => onNavigateTab('subjects')}
              className="inline-flex items-center gap-2 px-4 py-2.5 min-h-[42px] bg-emerald-700 hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white text-sm font-semibold rounded-xl transition-colors whitespace-nowrap"
            >
              <BookOpen className="w-4 h-4" aria-hidden="true" />
              <span>{dt('Open My Subjects', 'আমার কিতাব ও বিষয় খুলুন')}</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigateTab('ai-tutor')}
              className="inline-flex items-center gap-2 px-4 py-2.5 min-h-[42px] bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 border border-slate-300 dark:border-slate-700 text-sm font-semibold rounded-xl transition-colors whitespace-nowrap"
            >
              <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
              <span>{dt('Ask AI Tutor', 'এআই টিউটরকে জিজ্ঞাসা করুন')}</span>
            </button>
          </div>
        </div>

        {/* Overall Kitab Progress Bar */}
        <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between text-xs sm:text-sm mb-2">
            <span className="font-medium text-slate-700 dark:text-slate-300">
              {dt(
                '{marhala} Kitab & Lesson Progress ({branch})',
                '{marhala} কিতাব ও পাঠের অগ্রগতি ({branch})',
                { marhala: localizedMarhala, branch: localizedFocus }
              )}
            </span>
            <span className="font-semibold text-emerald-700 dark:text-emerald-400 tabular-nums">
              {dt(
                '{completed} of {total} lessons completed ({percent}%)',
                '{total}টি পাঠের মধ্যে {completed}টি সম্পন্ন ({percent}%)',
                {
                  completed: completedCount,
                  total: totalLessons,
                  percent: progressPercent,
                }
              )}
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
              {dt('Pathway & Marhala', 'পাথওয়ে ও মারহালা')}
            </p>
            <GraduationCap className="w-4 h-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
          </div>
          <p className="text-base font-bold text-slate-900 dark:text-white mt-2 truncate">
            {dt('Qawmi • {marhala}', 'কওমি • {marhala}', { marhala: localizedMarhala })}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 truncate">
            {localizedFullMarhala}
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              {td('Focus Branch')}
            </p>
            <Layers className="w-4 h-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
          </div>
          <p className="text-base font-bold text-slate-900 dark:text-white mt-2 truncate">
            {localizedFocus}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 truncate">
            {localizedMarhala} • {localizedFocus}
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              {dt('Active Kitabs', 'সক্রিয় কিতাবসমূহ')}
            </p>
            <BookOpen className="w-4 h-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1.5 tabular-nums">
            {formatDigits(subjects.length)}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 tabular-nums">
            {dt('{count} structured lessons', '{count}টি সুবিন্যস্ত পাঠ', {
              count: totalLessons,
            })}
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              {dt('Official Notices', 'প্রাতিষ্ঠানিক নোটিশ')}
            </p>
            <Bell className="w-4 h-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1.5 tabular-nums">
            {formatDigits(notices.length)}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {dt('Qawmi Madrasa circulars', 'কওমি মাদ্রাসার বিজ্ঞপ্তি')}
          </p>
        </div>
      </section>

      {/* Main Split: Priority Kitabs + Latest Qawmi Notices */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Priority Kitabs */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {dt('Continue Studying', 'পড়াশোনা চালিয়ে যান')}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {dt(
                  'Core kitabs & modules tailored for {marhala} ({branch})',
                  '{marhala} ({branch})-এর জন্য নির্ধারিত মূল কিতাব ও মডিউল',
                  { marhala: localizedMarhala, branch: localizedFocus }
                )}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigateTab('subjects')}
              className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300 whitespace-nowrap"
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
                    <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                      <span className="font-mono font-semibold text-slate-700 dark:text-slate-200">
                        {subject.code}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="font-medium text-emerald-700 dark:text-emerald-400">
                        {td(subject.category)}
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                      {subject.name}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                      {dt(
                        '{done}/{total} lessons completed ({percent}%)',
                        '{total}টির মধ্যে {done}টি পাঠ সম্পন্ন ({percent}%)',
                        {
                          done: doneInSubject,
                          total: subject.lessons.length,
                          percent: pct,
                        }
                      )}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => onStudySubjectWithTutor(subject.name)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[36px] rounded-lg bg-white dark:bg-slate-900 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-semibold transition-colors whitespace-nowrap"
                    >
                      <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>{dt('Ask Tutor', 'টিউটরকে জিজ্ঞাসা করুন')}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Latest Qawmi Notices Preview */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 flex flex-col">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {dt('Latest Qawmi Notices', 'সর্বশেষ কওমি নোটিশ')}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {dt(
                  'Official announcements from Qawmi Madrasa Administration',
                  'কওমি মাদ্রাসা প্রশাসন থেকে প্রকাশিত প্রাতিষ্ঠানিক বিজ্ঞপ্তি'
                )}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigateTab('notices')}
              className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300 whitespace-nowrap"
            >
              <span>{dt('All notices', 'সব নোটিশ')}</span>
              <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          </div>

          {latestNotices.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center py-8 text-slate-500 dark:text-slate-400">
              <CheckCircle2 className="w-8 h-8 text-emerald-600/70 mb-2" aria-hidden="true" />
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                {dt('No active circulars right now', 'এই মুহূর্তে কোনো সক্রিয় বিজ্ঞপ্তি নেই')}
              </p>
              <p className="text-xs mt-1">
                {dt(
                  'New Qawmi Madrasa notices will appear here automatically.',
                  'কওমি মাদ্রাসার নতুন নোটিশ স্বয়ংক্রিয়ভাবে এখানে দেখা যাবে।'
                )}
              </p>
            </div>
          ) : (
            <div className="space-y-3 flex-1">
              {latestNotices.map((notice) => (
                <article
                  key={notice.id}
                  className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/60 space-y-1.5"
                >
                  <div className="flex items-center justify-between gap-2 text-xs">
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
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      {formatDate(notice.createdAt)}
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
