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
  ALIA_MARHALAS,
  getAliaPanelName,
  getAliaStreamLabel,
  getShortMarhalaLabel,
  type AliaAdminActivityItem,
  type AliaOverviewMetrics,
} from '../../services/aliaAdminService';
import type { AliaAdminTab } from './AliaAdminShell';
import { useDashboardLanguage } from '../../i18n/useDashboardLanguage';

interface AliaOverviewTabProps {
  metrics: AliaOverviewMetrics;
  activities: AliaAdminActivityItem[];
  onNavigateTab: (tab: AliaAdminTab) => void;
}

const CATEGORY_LABELS: Record<
  AliaAdminActivityItem['category'],
  { en: string; bn: string }
> = {
  coupon: { en: 'Coupon', bn: 'কুপন' },
  approval: { en: 'Approval', bn: 'অনুমোদন' },
  directory: { en: 'Directory', bn: 'ডিরেক্টরি' },
  notice: { en: 'Notice', bn: 'নোটিশ' },
  security: { en: 'Security', bn: 'নিরাপত্তা' },
};

export function AliaOverviewTab({
  metrics,
  activities,
  onNavigateTab,
}: AliaOverviewTabProps) {
  const { td, dt, formatDigits, formatDateTime } = useDashboardLanguage();
  const panelName = td(getAliaPanelName());
  const streamLabel = td(getAliaStreamLabel());
  const marhalaSummary = ALIA_MARHALAS.map((m) => td(getShortMarhalaLabel(m))).join(' · ');

  const statCards = [
    {
      label: dt('Active Teachers', 'সক্রিয় শিক্ষক'),
      value: metrics.activeTeachers,
      caption: dt('Alia Madrasa faculty directory', 'আলিয়া মাদ্রাসা শিক্ষক ডিরেক্টরি'),
      actionTab: 'users' as AliaAdminTab,
    },
    {
      label: dt('Active Students', 'সক্রিয় শিক্ষার্থী'),
      value: metrics.activeStudents,
      caption: marhalaSummary,
      actionTab: 'users' as AliaAdminTab,
    },
    {
      label: td('Pending Approvals'),
      value: metrics.pendingApprovals,
      caption: dt('48h verification queue', '৪৮ ঘণ্টার যাচাইকরণ তালিকা'),
      actionTab: 'users' as AliaAdminTab,
    },
    {
      label: dt('Active Coupons', 'সক্রিয় কুপন'),
      value: metrics.activeCoupons,
      caption: dt('Unused T- / S- codes', 'অব্যবহৃত T- / S- কোডসমূহ'),
      actionTab: 'coupons' as AliaAdminTab,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        <div className="space-y-1.5 max-w-2xl">
          <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
            {streamLabel} · {panelName}
          </p>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white text-balance">
            {dt('Alia Madrasa Administration Overview', 'আলিয়া মাদ্রাসা প্রশাসন সারসংক্ষেপ')}
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            {dt(
              'Manage Alia Madrasa onboarding coupons, review {marhalas} faculty and student registrations, publish official notices, and maintain isolated directory records.',
              'আলিয়া মাদ্রাসা অনবোর্ডিং কুপন পরিচালনা করুন, {marhalas} স্তরের শিক্ষক ও শিক্ষার্থী নিবন্ধন পর্যালোচনা করুন, প্রাতিষ্ঠানিক নোটিশ প্রকাশ করুন এবং পৃথক ডিরেক্টরি সংরক্ষণ করুন।',
              { marhalas: marhalaSummary }
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
            <span>{dt('Issue Coupons', 'কুপন ইস্যু করুন')}</span>
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
        aria-label={dt('Alia Madrasa key metrics', 'আলিয়া মাদ্রাসার মূল পরিসংখ্যান')}
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
                {dt('Recent Alia Madrasa Activity', 'আলিয়া মাদ্রাসার সাম্প্রতিক কার্যক্রম')}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {dt('Audit log scoped strictly to {panel}', 'শুধুমাত্র {panel}-এর অডিট লগ', {
                  panel: panelName,
                })}
              </p>
            </div>
            <span className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
              {dt('{count} recent', 'সাম্প্রতিক {count}টি', { count: activities.length })}
            </span>
          </div>

          {activities.length === 0 ? (
            <div className="py-10 text-center space-y-1.5">
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                {dt('No recent activity logged yet', 'এখনো কোনো সাম্প্রতিক কার্যক্রম নথিভুক্ত হয়নি')}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {dt(
                  'Coupon issuances, approvals, and published notices will appear here.',
                  'কুপন ইস্যু, অনুমোদন এবং প্রকাশিত নোটিশ এখানে দেখা যাবে।'
                )}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {activities.map((item) => (
                <div key={item.id} className="py-3.5 first:pt-1 last:pb-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                      {dt(
                        CATEGORY_LABELS[item.category].en,
                        CATEGORY_LABELS[item.category].bn
                      )}
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
              {dt(
                'Direct shortcuts for Alia Madrasa operations',
                'আলিয়া মাদ্রাসা পরিচালনার সরাসরি শর্টকাট'
              )}
            </p>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {[
              {
                title: dt('Review Pending Approvals', 'অপেক্ষমাণ অনুমোদন পর্যালোচনা'),
                subtitle: dt('{count} waiting verification', '{count}টি যাচাইয়ের অপেক্ষায়', {
                  count: metrics.pendingApprovals,
                }),
                icon: UserPlus,
                tab: 'users' as AliaAdminTab,
              },
              {
                title: dt('Generate Onboarding Coupons', 'অনবোর্ডিং কুপন তৈরি'),
                subtitle: dt(
                  '48-hour Teacher & Student codes',
                  '৪৮ ঘণ্টার শিক্ষক ও শিক্ষার্থী কোড'
                ),
                icon: Ticket,
                tab: 'coupons' as AliaAdminTab,
              },
              {
                title: dt('Publish Pathway Notice', 'পাথওয়ে নোটিশ প্রকাশ'),
                subtitle: dt(
                  'Notify Alia teachers & students',
                  'আলিয়া শিক্ষক ও শিক্ষার্থীদের জানান'
                ),
                icon: Bell,
                tab: 'notices' as AliaAdminTab,
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
