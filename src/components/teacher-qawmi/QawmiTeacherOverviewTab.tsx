import React from 'react';
import {
  ArrowRight,
  Bell,
  BookOpen,
  CalendarClock,
  ClipboardCheck,
  Megaphone,
  Sparkles,
  Users,
} from 'lucide-react';
import {
  formatAssignedQawmiMarhalasSummary,
  formatQawmiTeacherContextBadge,
  getShortQawmiTeacherMarhalaLabel,
  type QawmiOfficialNotice,
  type QawmiTeacherContext,
  type QawmiTeacherMarhala,
  type QawmiTeacherModuleResource,
  type QawmiTeacherRosterStudent,
  type QawmiTeacherScheduleSession,
} from '../../services/qawmiTeacherService';
import type { QawmiTeacherTabId } from './QawmiTeacherShell';

interface QawmiTeacherOverviewTabProps {
  teacher: QawmiTeacherContext;
  modules: QawmiTeacherModuleResource[];
  roster: QawmiTeacherRosterStudent[];
  officialNotices: QawmiOfficialNotice[];
  todaySchedule: QawmiTeacherScheduleSession[];
  onNavigateTab: (tab: QawmiTeacherTabId) => void;
  onOpenAiWithTopic: (topic: string, marhala: QawmiTeacherMarhala) => void;
}

function formatRelativeDate(ts: number): string {
  const diffHours = Math.max(1, Math.round((Date.now() - ts) / (60 * 60 * 1000)));
  if (diffHours < 24) return `${diffHours}h ago`;
  const days = Math.round(diffHours / 24);
  return `${days}d ago`;
}

export function QawmiTeacherOverviewTab({
  teacher,
  modules,
  roster,
  officialNotices,
  todaySchedule,
  onNavigateTab,
  onOpenAiWithTopic,
}: QawmiTeacherOverviewTabProps) {
  const activeStudentsCount = roster.filter((s) => s.status === 'active').length;
  const draftModulesCount = modules.filter((m) => !m.published).length;
  const lowAttendanceOrMarksCount = roster.filter(
    (s) => s.marks < 80 || s.attendanceRate < 88
  ).length;
  const pendingReviewsCount = draftModulesCount + lowAttendanceOrMarksCount;

  const stats = [
    {
      label: 'Assigned Marhalas',
      value: String(teacher.assignedMarhalas.length),
      subtext: formatAssignedQawmiMarhalasSummary(teacher.assignedMarhalas),
      icon: BookOpen,
      tone: 'bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-800',
    },
    {
      label: 'Active Students',
      value: String(activeStudentsCount),
      subtext: `Across ${roster.length} Qawmi Madrasa Talaba`,
      icon: Users,
      tone: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
    },
    {
      label: 'Pending Reviews',
      value: String(pendingReviewsCount),
      subtext: `${draftModulesCount} draft module${draftModulesCount === 1 ? '' : 's'} · ${lowAttendanceOrMarksCount} check-ins`,
      icon: ClipboardCheck,
      tone: 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
    },
    {
      label: 'Pathway Notices',
      value: String(officialNotices.length),
      subtext: 'Official Qawmi Madrasa circulars',
      icon: Bell,
      tone: 'bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <section className="rounded-2xl bg-slate-900 dark:bg-slate-900 border border-slate-800 text-white p-6 sm:p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-2.5 max-w-2xl">
          <p className="text-xs font-semibold tracking-wide text-teal-300">
            {formatQawmiTeacherContextBadge(teacher.primarySubject)} · {teacher.focusBranch}
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Assalamu Alaikum, {teacher.fullName}
          </h1>
          <p className="text-sm text-slate-300 leading-relaxed">
            Manage your Dars-e-Nizami kitab notes and Sabak sheets, track Talaba progress across{' '}
            {formatAssignedQawmiMarhalasSummary(teacher.assignedMarhalas)}, and prepare Befaq-aligned
            Tarkeeb &amp; Sharah teaching guides.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => onNavigateTab('ai-assistant')}
            className="inline-flex items-center gap-2 px-4 py-2.5 min-h-[44px] rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-sm font-semibold transition-colors whitespace-nowrap"
          >
            <Sparkles className="w-4 h-4" aria-hidden="true" />
            <span>Open AI Assistant</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigateTab('classes')}
            className="inline-flex items-center gap-2 px-4 py-2.5 min-h-[44px] rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-white text-sm font-semibold transition-colors whitespace-nowrap"
          >
            <span>Publish Module</span>
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      </section>

      {/* 4 Stat Cards */}
      <section
        aria-label="Qawmi Teacher Summary Metrics"
        className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4"
      >
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 flex items-start justify-between gap-3"
            >
              <div className="min-w-0">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  {stat.label}
                </p>
                <p className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white mt-1.5 tabular-nums">
                  {stat.value}
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 truncate">
                  {stat.subtext}
                </p>
              </div>
              <div
                className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${stat.tone}`}
              >
                <Icon className="w-5 h-5" aria-hidden="true" />
              </div>
            </div>
          );
        })}
      </section>

      {/* Two-Column Schedule + Latest Notices */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Today's Dars & Class Schedule */}
        <section className="lg:col-span-7 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6">
          <div className="flex items-center justify-between gap-3 mb-5">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Today&apos;s Dars &amp; Class Schedule
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Qawmi Madrasa Dars sessions for {teacher.primarySubject}
              </p>
            </div>
            <CalendarClock className="w-5 h-5 text-teal-600 dark:text-teal-400" aria-hidden="true" />
          </div>

          <div className="space-y-3">
            {todaySchedule.map((session) => (
              <div
                key={session.id}
                className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="font-semibold text-teal-700 dark:text-teal-300 tabular-nums">
                      {session.timeLabel}
                    </span>
                    <span className="text-slate-400">·</span>
                    <span className="font-medium text-slate-700 dark:text-slate-200">
                      {getShortQawmiTeacherMarhalaLabel(session.marhala)} ({session.focusBranch})
                    </span>
                    <span className="text-slate-400">·</span>
                    <span className="text-slate-500 dark:text-slate-400">{session.roomLabel}</span>
                  </div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">
                    {session.topic}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => onOpenAiWithTopic(session.topic, session.marhala)}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2 min-h-[38px] rounded-lg bg-white dark:bg-slate-900 border border-teal-200 dark:border-teal-800 hover:bg-teal-50 dark:hover:bg-teal-950/60 text-teal-700 dark:text-teal-300 text-xs font-semibold transition-colors whitespace-nowrap shrink-0"
                >
                  <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Prep Dars</span>
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* Latest Official Notices */}
        <section className="lg:col-span-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 flex flex-col justify-between gap-5">
          <div>
            <div className="flex items-center justify-between gap-3 mb-5">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Latest Qawmi Admin Notices
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Circulars scoped to Asatizah &amp; Faculty
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigateTab('notices')}
                className="text-xs font-semibold text-teal-700 dark:text-teal-400 hover:underline underline-offset-4 whitespace-nowrap"
              >
                View All
              </button>
            </div>

            <div className="space-y-3">
              {officialNotices.slice(0, 3).map((notice) => (
                <div
                  key={notice.id}
                  className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-1.5"
                >
                  <div className="flex items-center justify-between gap-2 text-[11px]">
                    <span
                      className={`px-2 py-0.5 rounded font-semibold ${
                        notice.tag === 'Urgent'
                          ? 'bg-rose-100 dark:bg-rose-950/70 text-rose-800 dark:text-rose-300'
                          : notice.tag === 'Exam'
                            ? 'bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300'
                            : 'bg-teal-100 dark:bg-teal-950/70 text-teal-800 dark:text-teal-300'
                      }`}
                    >
                      {notice.tag}
                    </span>
                    <span className="text-slate-500 dark:text-slate-400">
                      {notice.audience === 'teacher' ? 'Teachers Only' : 'All Members'} ·{' '}
                      {formatRelativeDate(notice.createdAt)}
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white leading-snug">
                    {notice.title}
                  </p>
                  <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2">
                    {notice.description}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={() => onNavigateTab('notices')}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 min-h-[44px] rounded-xl bg-teal-50 dark:bg-teal-950/60 hover:bg-teal-100 dark:hover:bg-teal-900/60 border border-teal-200 dark:border-teal-800 text-teal-800 dark:text-teal-200 text-xs font-semibold transition-colors whitespace-nowrap"
          >
            <Megaphone className="w-4 h-4" aria-hidden="true" />
            <span>Post Class Announcement</span>
          </button>
        </section>
      </div>
    </div>
  );
}
