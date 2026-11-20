import React, { useMemo, useState } from 'react';
import { ShieldAlert } from 'lucide-react';
import { DashboardShell } from '../components/DashboardShell';
import { NoticeComposerForm } from '../components/admin-notices/NoticeComposerForm';
import { PublishedNoticesList } from '../components/admin-notices/PublishedNoticesList';
import { useAuth } from '../context/AuthContext';
import { useDashboardLanguage } from '../i18n/useDashboardLanguage';
import {
  adminNoticesService,
  getNoticePathwayLabel,
  resolveNoticePathway,
} from '../services/adminNoticesService';

export function AdminNoticesPage() {
  const { session } = useAuth();
  const { td, dt } = useDashboardLanguage();
  const [refreshTick, setRefreshTick] = useState(0);

  const activePathway = resolveNoticePathway(session?.selectedPathway);

  const notices = useMemo(() => {
    void refreshTick;
    if (!activePathway) return [];
    return adminNoticesService.listNotices(activePathway);
  }, [activePathway, refreshTick]);

  const handleRefresh = () => {
    setRefreshTick((n) => n + 1);
  };

  if (!activePathway) {
    return (
      <DashboardShell title={td('Notices')}>
        <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 max-w-2xl">
          <div className="flex items-start gap-3">
            <ShieldAlert
              className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5"
              aria-hidden="true"
            />
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {td('Pathway Scope Restriction')}
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                {dt(
                  'This Notices workspace is strictly scoped to the Bangla Version and English Version admin panels.',
                  'এই নোটিশ বিভাগটি কেবলমাত্র বাংলা ভার্সন এবং ইংরেজি ভার্সন অ্যাডমিন প্যানেলের জন্য সীমাবদ্ধ।'
                )}
              </p>
            </div>
          </div>
        </section>
      </DashboardShell>
    );
  }

  const panelName = td(`${getNoticePathwayLabel(activePathway)} Panel`);

  return (
    <DashboardShell title={td('Notices')}>
      <div className="space-y-6">
        {/* Workspace Header */}
        <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 transition-colors">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            {td('Notices & Announcements')}
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            {dt(
              '{panel} · Publish and manage pathway-isolated announcements for teachers and students.',
              '{panel} · শিক্ষক ও শিক্ষার্থীদের জন্য পাথওয়ে-ভিত্তিক ঘোষণা প্রকাশ ও পরিচালনা করুন।',
              { panel: panelName }
            )}
          </p>
        </section>

        {/* 1. Notice Composer Form */}
        <NoticeComposerForm pathway={activePathway} onNoticePublished={handleRefresh} />

        {/* 2. Published Notices Management List */}
        <PublishedNoticesList
          pathway={activePathway}
          notices={notices}
          onDataChanged={handleRefresh}
        />
      </div>
    </DashboardShell>
  );
}
