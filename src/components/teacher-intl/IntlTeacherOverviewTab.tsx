import React from 'react';
import {
  ArrowRight,
  Bell,
  BookOpen,
  Bot,
  CalendarClock,
  ClipboardCheck,
  Clock,
  Users,
} from 'lucide-react';
import type { IntlTeacherTabId } from './IntlTeacherShell';
import {
  getIntlTeacherBoardName,
  getIntlTeacherPathwayLabel,
  getShortLevelLabel,
  type InternationalAcademicLevel,
  type InternationalNotice,
  type IntlTeacherContext,
  type IntlTeacherModuleResource,
  type IntlTeacherRosterStudent,
  type IntlTeacherScheduleSession,
} from '../../services/internationalTeacherService';
import { useDashboardLanguage } from '../../i18n/useDashboardLanguage';

interface IntlTeacherOverviewTabProps {
  teacher: IntlTeacherContext;
  modules: IntlTeacherModuleResource[];
  roster: IntlTeacherRosterStudent[];
  officialNotices: InternationalNotice[];
  todaySchedule: IntlTeacherScheduleSession[];
  onNavigateTab: (tab: IntlTeacherTabId) => void;
  onOpenAiWithTopic: (topic: string, academicLevel: InternationalAcademicLevel) => void;
}

export function IntlTeacherOverviewTab({
  teacher,
  modules,
  roster,
  officialNotices,
  todaySchedule,
  onNavigateTab,
  onOpenAiWithTopic,
}: IntlTeacherOverviewTabProps) {
  const { dt, td, formatDigits, formatDate: formatLocalizedDate } = useDashboardLanguage();
  const pathwayLabel = td(getIntlTeacherPathwayLabel(teacher.pathway));
  const boardName = td(getIntlTeacherBoardName(teacher.pathway));
  const subjectLabel = td(teacher.primarySubject);
  const trackLabel = td(teacher.academicTrack);
  const levelsSummary = teacher.assignedLevels.map((lvl) => td(getShortLevelLabel(lvl))).join(', ');
  const activeStudentsCount = roster.filter((s) => s.status === 'active').length;
  const draftModulesCount = modules.filter((m) => !m.published).length;
  const pendingReviewsCount =
    draftModulesCount + roster.filter((s) => s.marks < 80 || s.attendanceRate < 85).length;

  const latestNotices = officialNotices.slice(0, 3);

  const formatDate = (ts: number) =>
    formatLocalizedDate(ts, {
      month: 'short',
      day: 'numeric',
    });

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <section className="bg-slate-900 dark:bg-slate-900 text-white rounded-2xl p-6 sm:p-8 border border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-2 max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-wider text-teal-300">
            {boardName} · {subjectLabel}
          </p>
          <h2 className="text-2xl sm:text-3xl font-bold leading-tight">
            {dt('Welcome back, {name}', 'স্বাগতম, {name}', { name: teacher.fullName })}
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            {dt(
              'Your teaching workspace is strictly scoped to {pathway} ({levels} · {track} track). Publish past-paper modules, track candidate progress, or draft exam-aligned lessons with AI.',
              'আপনার শিক্ষণ কর্মক্ষেত্র কেবল {pathway} ({levels} · {track} ট্র্যাক)-এর জন্য নির্ধারিত। পাস্ট-পেপার মডিউল প্রকাশ করুন, শিক্ষার্থীর অগ্রগতি দেখুন অথবা এআই দিয়ে পাঠ তৈরি করুন।',
              {
                pathway: pathwayLabel,
                levels: levelsSummary,
                track: trackLabel,
              }
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => onNavigateTab('classes')}
            className="inline-flex items-center gap-2 px-4 py-2.5 min-h-[44px] bg-teal-600 hover:bg-teal-500 text-white text-sm font-semibold rounded-xl transition-colors whitespace-nowrap"
          >
            <BookOpen className="w-4 h-4" aria-hidden="true" />
            <span>{dt('Manage Modules', 'মডিউল পরিচালনা')}</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigateTab('ai-assistant')}
            className="inline-flex items-center gap-2 px-4 py-2.5 min-h-[44px] bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 text-sm font-semibold rounded-xl transition-colors whitespace-nowrap"
          >
            <Bot className="w-4 h-4 text-teal-300" aria-hidden="true" />
            <span>{dt('Open AI Assistant', 'এআই সহায়ক খুলুন')}</span>
          </button>
        </div>
      </section>

      {/* 4 Compact Stat Cards */}
      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              {dt('Assigned Levels', 'নির্ধারিত স্তরসমূহ')}
            </p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1.5 tabular-nums">
              {formatDigits(teacher.assignedLevels.length)}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-1">
              {levelsSummary}
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 flex items-center justify-center shrink-0">
            <BookOpen className="w-5 h-5" aria-hidden="true" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              {dt('Active Students', 'সক্রিয় শিক্ষার্থী')}
            </p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1.5 tabular-nums">
              {formatDigits(activeStudentsCount)}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {dt('In {pathway} roster', '{pathway} তালিকায়', { pathway: pathwayLabel })}
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 flex items-center justify-center shrink-0">
            <Users className="w-5 h-5" aria-hidden="true" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              {dt('Pending Reviews', 'অপেক্ষমাণ পর্যালোচনা')}
            </p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1.5 tabular-nums">
              {formatDigits(pendingReviewsCount)}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {dt('Draft modules & check-ins', 'খসড়া মডিউল ও অগ্রগতি যাচাই')}
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0">
            <ClipboardCheck className="w-5 h-5" aria-hidden="true" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              {dt('Pathway Notices', 'বিভাগীয় নোটিশ')}
            </p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1.5 tabular-nums">
              {formatDigits(officialNotices.length)}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {dt('Official {pathway} alerts', '{pathway} প্রাতিষ্ঠানিক বার্তা', {
                pathway: pathwayLabel,
              })}
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0">
            <Bell className="w-5 h-5" aria-hidden="true" />
          </div>
        </div>
      </section>

      {/* Main Split: Today's Schedule (7) + Official Admin Notices Preview (5) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <section className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {dt("Today's Class Schedule", 'আজকের ক্লাস সময়সূচি')}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {dt('Upcoming {pathway} sessions for {subject}', '{subject}-এর আসন্ন {pathway} ক্লাসসমূহ', {
                  pathway: pathwayLabel,
                  subject: subjectLabel,
                })}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigateTab('classes')}
              className="text-xs font-semibold text-teal-700 dark:text-teal-400 hover:underline inline-flex items-center gap-1 whitespace-nowrap"
            >
              <span>{dt('All Modules', 'সকল মডিউল')}</span>
              <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {todaySchedule.map((session) => (
              <div
                key={session.id}
                className="py-4 first:pt-1 last:pb-1 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <span className="inline-flex items-center gap-1 font-semibold text-teal-700 dark:text-teal-400 tabular-nums">
                      <CalendarClock className="w-3.5 h-3.5" aria-hidden="true" />
                      {formatDigits(session.timeLabel)}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="font-medium text-slate-700 dark:text-slate-300">
                      {td(getShortLevelLabel(session.academicLevel))}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>{td(session.academicTrack)}</span>
                    <span aria-hidden="true">·</span>
                    <span>{session.roomLabel}</span>
                  </div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">
                    {session.topic}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => onOpenAiWithTopic(session.topic, session.academicLevel)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[36px] text-xs font-semibold text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/60 hover:bg-teal-100 dark:hover:bg-teal-900/60 border border-teal-200 dark:border-teal-800 rounded-lg transition-colors whitespace-nowrap shrink-0"
                >
                  <Bot className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>{dt('Prep Lesson', 'পাঠ প্রস্তুত করুন')}</span>
                </button>
              </div>
            ))}
          </div>
        </section>

        <section className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {dt('Latest Official Notices', 'সর্বশেষ প্রাতিষ্ঠানিক নোটিশ')}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {dt('From {pathway} Admin for Faculty', 'শিক্ষকদের জন্য {pathway} অ্যাডমিনের পক্ষ থেকে', {
                  pathway: pathwayLabel,
                })}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigateTab('notices')}
              className="text-xs font-semibold text-teal-700 dark:text-teal-400 hover:underline inline-flex items-center gap-1 whitespace-nowrap"
            >
              <span>{dt('View All', 'সব দেখুন')}</span>
              <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          </div>

          {latestNotices.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500 dark:text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
              {dt('No official {pathway} admin notices right now.', 'এই মুহূর্তে কোনো প্রাতিষ্ঠানিক {pathway} অ্যাডমিন নোটিশ নেই।', {
                pathway: pathwayLabel,
              })}
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {latestNotices.map((notice) => (
                <article key={notice.id} className="py-3.5 first:pt-1 last:pb-1 space-y-1">
                  <div className="flex items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <span
                      className={
                        notice.tag === 'Urgent'
                          ? 'font-semibold text-rose-700 dark:text-rose-400'
                          : notice.tag === 'Exam'
                            ? 'font-semibold text-amber-700 dark:text-amber-400'
                            : 'font-semibold text-teal-700 dark:text-teal-400'
                      }
                    >
                      {td(notice.tag)}
                    </span>
                    <span className="inline-flex items-center gap-1 tabular-nums">
                      <Clock className="w-3 h-3" aria-hidden="true" />
                      {formatDate(notice.updatedAt)}
                    </span>
                  </div>
                  <h4 className="text-sm font-semibold text-slate-900 dark:text-white leading-snug">
                    {notice.title}
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2">
                    {notice.description}
                  </p>
                </article>
              ))}
            </div>
          )}

          <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => onNavigateTab('notices')}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 min-h-[42px] bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 text-xs font-semibold rounded-lg transition-colors"
            >
              <span>{dt('Post Class Announcement', 'শ্রেণির ঘোষণা প্রকাশ করুন')}</span>
              <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
