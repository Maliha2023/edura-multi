import React from 'react';
import {
  ArrowRight,
  Bell,
  Clock,
  Ticket,
  UserPlus,
  Users,
} from 'lucide-react';
import {
  getInternationalPanelName,
  getInternationalPathwaySubTrack,
  getLevelsForPathway,
  type InternationalActivityItem,
  type InternationalOverviewMetrics,
  type InternationalPathway,
} from '../../services/internationalAdminService';
import type { InternationalAdminTab } from './InternationalAdminShell';
import { useDashboardLanguage } from '../../i18n/useDashboardLanguage';

interface InternationalOverviewTabProps {
  pathway: InternationalPathway;
  metrics: InternationalOverviewMetrics;
  activities: InternationalActivityItem[];
  onNavigateTab: (tab: InternationalAdminTab) => void;
}

const CATEGORY_LABELS: Record<InternationalActivityItem['category'], { en: string; bn: string }> = {
  coupon: { en: 'Coupon', bn: 'কুপন' },
  approval: { en: 'Approval', bn: 'অনুমোদন' },
  directory: { en: 'Directory', bn: 'ডিরেক্টরি' },
  notice: { en: 'Notice', bn: 'নোটিশ' },
  security: { en: 'Security', bn: 'নিরাপত্তা' },
};

export function InternationalOverviewTab({
  pathway,
  metrics,
  activities,
  onNavigateTab,
}: InternationalOverviewTabProps) {
  const { td, dt, formatDigits, formatDateTime, isBangla } = useDashboardLanguage();
  const panelName = td(getInternationalPanelName(pathway));
  const pathwayTitle = td(getInternationalPathwaySubTrack(pathway));
  const levels = getLevelsForPathway(pathway).map((lvl) => td(lvl));

  const statCards = [
    {
      label: dt('Active Teachers', 'সক্রিয় শিক্ষক'),
      value: metrics.activeTeachers,
      caption: dt('{pathway} faculty directory', '{pathway} শিক্ষক ডিরেক্টরি', {
        pathway: pathwayTitle,
      }),
      actionTab: 'users' as InternationalAdminTab,
    },
    {
      label: dt('Active Students', 'সক্রিয় শিক্ষার্থী'),
      value: metrics.activeStudents,
      caption: levels.join(' & '),
      actionTab: 'users' as InternationalAdminTab,
    },
    {
      label: dt('Pending Approvals', 'অপেক্ষমাণ অনুমোদন'),
      value: metrics.pendingApprovals,
      caption: dt('48h verification queue', '৪৮ ঘণ্টার যাচাই সারি'),
      actionTab: 'users' as InternationalAdminTab,
    },
    {
      label: dt('Active Coupons', 'সক্রিয় কুপন'),
      value: metrics.activeCoupons,
      caption: dt('Unused T- / S- codes', 'অব্যবহৃত T- / S- কোড'),
      actionTab: 'coupons' as InternationalAdminTab,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        <div className="space-y-1.5 max-w-2xl">
          <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
            {dt('International Curriculum (English Medium)', 'আন্তর্জাতিক শিক্ষাক্রম (ইংলিশ মিডিয়াম)')} ·{' '}
            {panelName}
          </p>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white text-balance">
            {dt('{pathway} Administration Overview', '{pathway} প্রশাসনিক সারসংক্ষেপ', {
              pathway: pathwayTitle,
            })}
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            {dt(
              'Manage {pathway} onboarding coupons, review {levels} faculty and student registrations, publish pathway notices, and maintain isolated directory records.',
              '{pathway} অনবোর্ডিং কুপন পরিচালনা করুন, {levels} শিক্ষক ও শিক্ষার্থী নিবন্ধন পর্যালোচনা করুন, পাথওয়ে নোটিশ প্রকাশ করুন এবং পৃথক ডিরেক্টরি সংরক্ষণ করুন।',
              {
                pathway: pathwayTitle,
                levels: levels.join(isBangla ? ' ও ' : ' and '),
              }
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => onNavigateTab('coupons')}
            className="inline-flex items-center gap-2 px-4 py-2.5 min-h-[42px] bg-emerald-700 hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white text-sm font-semibold rounded-lg transition-colors whitespace-nowrap"
          >
            <Ticket className="w-4 h-4" aria-hidden="true" />
            <span>{dt('Issue Coupons', 'কুপন তৈরি করুন')}</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigateTab('users')}
            className="inline-flex items-center gap-2 px-4 py-2.5 min-h-[42px] bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 text-sm font-semibold rounded-lg transition-colors whitespace-nowrap"
          >
            <Users className="w-4 h-4" aria-hidden="true" />
            <span>{dt('Manage Users', 'ব্যবহারকারী পরিচালনা')}</span>
          </button>
        </div>
      </section>

      {/* 4 Pathway-Scoped KPI Stat Cards */}
      <section
        aria-label={dt('{pathway} key metrics', '{pathway} মূল পরিসংখ্যান', { pathway: pathwayTitle })}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        {statCards.map((card) => (
          <button
            key={card.label}
            type="button"
            onClick={() => onNavigateTab(card.actionTab)}
            className="text-left bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-emerald-300 dark:hover:border-emerald-700 rounded-2xl p-5 transition-colors space-y-2"
          >
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              {card.label}
            </p>
            <p className="text-3xl font-bold text-slate-900 dark:text-white font-mono tabular-nums">
              {formatDigits(card.value)}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
              {card.caption}
            </p>
          </button>
        ))}
      </section>

      {/* Recent Activity Feed + Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <section className="lg:col-span-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {dt('Recent {pathway} Activity', 'সাম্প্রতিক {pathway} কার্যক্রম', {
                  pathway: pathwayTitle,
                })}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {dt('Audit log scoped strictly to {panel}', 'শুধুমাত্র {panel}-এর অডিট লগ', {
                  panel: panelName,
                })}
              </p>
            </div>
            <span className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
              {dt('{count} recent', '{count}টি সাম্প্রতিক', { count: activities.length })}
            </span>
          </div>

          {activities.length === 0 ? (
            <div className="py-10 text-center space-y-1.5">
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                {dt('No recent activity logged yet', 'এখনো কোনো সাম্প্রতিক কার্যক্রম নেই')}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {dt(
                  'Coupon issuances, approvals, and published notices will appear here.',
                  'কুপন তৈরি, অনুমোদন এবং প্রকাশিত নোটিশ এখানে দেখা যাবে।'
                )}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {activities.map((item) => (
                <div key={item.id} className="py-3.5 first:pt-1 last:pb-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                      {isBangla
                        ? CATEGORY_LABELS[item.category].bn
                        : CATEGORY_LABELS[item.category].en}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="inline-flex items-center gap-1 font-mono tabular-nums">
                      <Clock className="w-3 h-3" aria-hidden="true" />
                      {formatDateTime(item.createdAt)}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="truncate">{item.actorEmail}</span>
                  </div>
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                    {item.summary}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="lg:col-span-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              {dt('Quick Admin Workflows', 'দ্রুত অ্যাডমিন কার্যক্রম')}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {dt('Direct shortcuts for {pathway} operations', '{pathway} পরিচালনার সরাসরি শর্টকাট', {
                pathway: pathwayTitle,
              })}
            </p>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {[
              {
                title: dt('Review Pending Approvals', 'অপেক্ষমাণ অনুমোদন পর্যালোচনা'),
                subtitle: dt('{count} waiting verification', '{count} জন যাচাইয়ের অপেক্ষায়', {
                  count: metrics.pendingApprovals,
                }),
                icon: UserPlus,
                tab: 'users' as InternationalAdminTab,
              },
              {
                title: dt('Generate Onboarding Coupons', 'অনবোর্ডিং কুপন তৈরি করুন'),
                subtitle: dt('48-hour Teacher & Student codes', '৪৮ ঘণ্টার শিক্ষক ও শিক্ষার্থী কোড'),
                icon: Ticket,
                tab: 'coupons' as InternationalAdminTab,
              },
              {
                title: dt('Publish Pathway Notice', 'পাথওয়ে নোটিশ প্রকাশ করুন'),
                subtitle: dt(
                  'Notify {pathway} teachers & students',
                  '{pathway} শিক্ষক ও শিক্ষার্থীদের জানান',
                  { pathway: pathwayTitle }
                ),
                icon: Bell,
                tab: 'notices' as InternationalAdminTab,
              },
            ].map((action) => {
              const Icon = action.icon;
              return (
                <button
                  key={action.title}
                  type="button"
                  onClick={() => onNavigateTab(action.tab)}
                  className="w-full py-3.5 first:pt-1 last:pb-1 flex items-center justify-between gap-3 text-left group"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <Icon
                      className="w-4 h-4 text-emerald-700 dark:text-emerald-400 shrink-0 mt-0.5"
                      aria-hidden="true"
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900 dark:text-white group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">
                        {action.title}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {action.subtitle}
                      </p>
                    </div>
                  </div>
                  <ArrowRight
                    className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 shrink-0 transition-colors"
                    aria-hidden="true"
                  />
                </button>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
