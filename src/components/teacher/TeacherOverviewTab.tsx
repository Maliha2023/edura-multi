import React from 'react';
import { ArrowRight, BookOpen, Bot, CalendarClock, Clock, FilePlus2, Users } from 'lucide-react';
import type { PathwayNotice } from '../../services/adminNoticesService';
import {
  formatAssignedClassesSummary,
  getTeacherPathwayLabel,
  getTodayScheduleForTeacher,
  type TeacherModuleResource,
  type TeacherProfileContext,
  type TeacherRosterStudent,
} from '../../services/teacherService';
import { useDashboardLanguage } from '../../i18n/useDashboardLanguage';
import type { TeacherTabId } from './TeacherShell';

interface TeacherOverviewTabProps {
  teacher: TeacherProfileContext;
  modules: TeacherModuleResource[];
  roster: TeacherRosterStudent[];
  notices: PathwayNotice[];
  onNavigateTab: (tab: TeacherTabId) => void;
  onOpenAssistantForTopic: (topic: string) => void;
}

export function TeacherOverviewTab({
  teacher,
  modules,
  roster,
  notices,
  onNavigateTab,
  onOpenAssistantForTopic,
}: TeacherOverviewTabProps) {
  const { dt, td, formatDigits, formatDate } = useDashboardLanguage();

  const pathwayLabel = getTeacherPathwayLabel(teacher.pathway);
  const localizedPathway = td(pathwayLabel);
  const assignedSummary = formatAssignedClassesSummary(teacher.assignedClasses);
  const localizedAssigned =
    teacher.assignedClasses.length > 0
      ? dt('Class {list}', 'শ্রেণি {list}', {
          list: formatDigits(teacher.assignedClasses.join(', ')),
        })
      : td(assignedSummary);
  const schedule = getTodayScheduleForTeacher(teacher);

  const activeStudentsCount = roster.filter((s) => s.status === 'active').length;
  const draftModulesCount = modules.filter((m) => !m.isPublished).length;
  const reviewNeededCount =
    draftModulesCount + roster.filter((s) => s.marks < 75 || s.attendanceStatus !== 'Present').length;

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-7">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="space-y-2 max-w-2xl">
            <p className="text-xs font-semibold text-teal-700 dark:text-teal-400">
              {td('Bangladesh National Curriculum (NCTB)')} · {localizedPathway} •{' '}
              {teacher.primarySubject}
            </p>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white text-balance">
              {dt('Welcome back, {name}', 'স্বাগতম, {name}', { name: teacher.fullName })}
            </h2>
            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 leading-relaxed">
              {dt(
                'Manage your {pathway} classes ({classes}), publish study modules, track student progress, and draft NCTB lesson materials.',
                'আপনার {pathway} শ্রেণিসমূহ ({classes}) পরিচালনা করুন, অধ্যয়ন মডিউল প্রকাশ করুন, শিক্ষার্থীর অগ্রগতি পর্যবেক্ষণ করুন এবং এনসিটিবি পাঠ উপকরণ তৈরি করুন।',
                { pathway: localizedPathway, classes: localizedAssigned }
              )}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => onNavigateTab('assistant')}
              className="inline-flex items-center gap-2 px-4 py-2.5 min-h-[44px] bg-teal-700 hover:bg-teal-800 dark:bg-teal-600 dark:hover:bg-teal-500 text-white text-sm font-semibold rounded-lg transition-colors whitespace-nowrap"
            >
              <Bot className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>{dt('Open AI Assistant', 'এআই অ্যাসিস্ট্যান্ট খুলুন')}</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigateTab('classes')}
              className="inline-flex items-center gap-2 px-4 py-2.5 min-h-[44px] bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 text-sm font-semibold rounded-lg transition-colors whitespace-nowrap"
            >
              <FilePlus2 className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>{dt('Manage Modules', 'মডিউল পরিচালনা')}</span>
            </button>
          </div>
        </div>
      </section>

      {/* 4 KPI Stat Cards */}
      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            {dt('Assigned Classes', 'নির্ধারিত শ্রেণিসমূহ')}
          </p>
          <p className="text-lg font-bold text-slate-900 dark:text-white mt-1.5 tabular-nums">
            {localizedAssigned}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {teacher.primarySubject}
            {teacher.academicGroup ? ` · ${td(teacher.academicGroup)}` : ''}
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            {dt('Active Students', 'সক্রিয় শিক্ষার্থী')}
          </p>
          <p className="text-lg font-bold text-slate-900 dark:text-white mt-1.5 tabular-nums">
            {dt('{count} {label}', '{count} জন {label}', {
              count: activeStudentsCount,
              label: activeStudentsCount === 1 ? td('Student') : td('Students'),
            })}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {dt('{count} total in {pathway} roster', '{pathway} তালিকায় মোট {count} জন', {
              count: roster.length,
              pathway: localizedPathway,
            })}
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            {dt('Pending Reviews', 'পর্যালোচনা অপেক্ষমাণ')}
          </p>
          <p className="text-lg font-bold text-slate-900 dark:text-white mt-1.5 tabular-nums">
            {dt('{count} {label}', '{count}টি {label}', {
              count: reviewNeededCount,
              label:
                reviewNeededCount === 1
                  ? dt('Item', 'বিষয়')
                  : dt('Items', 'বিষয়'),
            })}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {dt(
              '{count} unpublished modules · student follow-ups',
              '{count}টি অপ্রকাশিত মডিউল · শিক্ষার্থী পর্যবেক্ষণ',
              { count: draftModulesCount }
            )}
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            {dt('Pathway Notices', 'পাথওয়ে নোটিশ')}
          </p>
          <p className="text-lg font-bold text-slate-900 dark:text-white mt-1.5 tabular-nums">
            {dt('{count} {label}', '{count}টি {label}', {
              count: notices.length,
              label:
                notices.length === 1
                  ? dt('Notice', 'নোটিশ')
                  : td('Notices'),
            })}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {dt('Synced from {pathway} Admin', '{pathway} অ্যাডমিন থেকে সিঙ্ককৃত', {
              pathway: localizedPathway,
            })}
          </p>
        </div>
      </section>

      {/* Two-Column Split: Today's Class Schedule + Latest Notices Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <section className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {dt("Today's Class Schedule", 'আজকের ক্লাস সময়সূচি')}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {dt('{pathway} · {subject} faculty sessions', '{pathway} · {subject} শিক্ষক সেশন', {
                  pathway: localizedPathway,
                  subject: teacher.primarySubject,
                })}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigateTab('roster')}
              className="inline-flex items-center gap-1 text-xs font-semibold text-teal-700 dark:text-teal-400 hover:text-teal-800 dark:hover:text-teal-300 whitespace-nowrap"
            >
              <span>{dt('View roster', 'তালিকা দেখুন')}</span>
              <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {schedule.map((session) => (
              <div
                key={session.id}
                className="py-4 first:pt-1 last:pb-1 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <span className="inline-flex items-center gap-1 font-mono font-semibold text-slate-700 dark:text-slate-300 tabular-nums whitespace-nowrap">
                      <CalendarClock className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" aria-hidden="true" />
                      {formatDigits(session.timeSlot)}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span
                      className={
                        session.status === 'Next Up'
                          ? 'font-semibold text-teal-700 dark:text-teal-400 whitespace-nowrap'
                          : session.status === 'Completed'
                            ? 'text-slate-500 dark:text-slate-400 whitespace-nowrap'
                            : 'font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap'
                      }
                    >
                      {session.status === 'Next Up'
                        ? dt('Next Up', 'পরবর্তী')
                        : session.status === 'Scheduled'
                          ? dt('Scheduled', 'নির্ধারিত')
                          : td(session.status)}
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">
                    {session.topic}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {dt('Class {cls}', 'শ্রেণি {cls}', { cls: session.academicClass })}
                    {session.academicGroup ? ` (${td(session.academicGroup)})` : ''} ·{' '}
                    {session.roomLabel}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => onOpenAssistantForTopic(session.topic)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[36px] text-xs font-semibold text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/60 hover:bg-teal-100 dark:hover:bg-teal-900/60 border border-teal-200 dark:border-teal-800 rounded-lg transition-colors whitespace-nowrap shrink-0"
                >
                  <BookOpen className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>{dt('Prep Lesson', 'পাঠ প্রস্তুতি')}</span>
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
                {dt('Faculty announcements from {pathway} Admin', '{pathway} অ্যাডমিনের শিক্ষক বিজ্ঞপ্তি', {
                  pathway: localizedPathway,
                })}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigateTab('notices')}
              className="inline-flex items-center gap-1 text-xs font-semibold text-teal-700 dark:text-teal-400 hover:text-teal-800 dark:hover:text-teal-300 whitespace-nowrap"
            >
              <span>{td('View all')}</span>
              <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          </div>

          {notices.length === 0 ? (
            <div className="py-8 text-center space-y-1.5">
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                {dt('No notices published yet', 'এখনো কোনো নোটিশ প্রকাশিত হয়নি')}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {dt(
                  'Faculty updates from {pathway} Admin will appear here.',
                  '{pathway} অ্যাডমিন থেকে শিক্ষক আপডেট এখানে দেখা যাবে।',
                  { pathway: localizedPathway }
                )}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {notices.slice(0, 3).map((notice) => (
                <div key={notice.id} className="py-3.5 first:pt-1 last:pb-1 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
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
                    <span>
                      {notice.targetAudience === 'teacher'
                        ? dt('Teachers Only', 'শুধুমাত্র শিক্ষক')
                        : dt('All Campus', 'সকল ক্যাম্পাস')}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="inline-flex items-center gap-1 tabular-nums">
                      <Clock className="w-3 h-3" aria-hidden="true" />
                      {formatDate(notice.updatedAt, { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white leading-snug">
                    {notice.title}
                  </p>
                  <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                    {notice.description}
                  </p>
                </div>
              ))}
            </div>
          )}

          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
            <span className="inline-flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" aria-hidden="true" />
              <span>{dt('Need to notify your class?', 'আপনার শ্রেণিকে জানাতে চান?')}</span>
            </span>
            <button
              type="button"
              onClick={() => onNavigateTab('notices')}
              className="font-semibold text-teal-700 dark:text-teal-400 hover:underline underline-offset-4 whitespace-nowrap"
            >
              {dt('Post Class Announcement', 'শ্রেণি ঘোষণা পোস্ট করুন')}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
