import React from 'react';
import { Clock } from 'lucide-react';
import { DashboardShell } from './DashboardShell';
import { useI18n } from '../i18n';

export function PlaceholderModulePage({
  title,
  subtitle,
  icon: Icon = Clock,
}: {
  title: string;
  subtitle?: string;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  const { t } = useI18n();

  return (
    <DashboardShell title={title}>
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-10 max-w-2xl transition-colors">
        <div className="w-11 h-11 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center mb-5">
          <Icon className="w-5 h-5 text-slate-700 dark:text-slate-200" aria-hidden="true" />
        </div>
        <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
          {t.common.comingSoon}
        </p>
        <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mt-1.5">
          {title}
        </h2>
        <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
          {subtitle ?? t.common.comingSoonDesc}
        </p>
      </div>
    </DashboardShell>
  );
}
