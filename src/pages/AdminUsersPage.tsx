import React, { useMemo, useState } from 'react';
import { Clock, ShieldAlert, UserPlus, Users } from 'lucide-react';
import { DashboardShell } from '../components/DashboardShell';
import { ManualRegistrationTab } from '../components/admin-users/ManualRegistrationTab';
import { PendingApprovalsTab } from '../components/admin-users/PendingApprovalsTab';
import { UserDirectoryTab } from '../components/admin-users/UserDirectoryTab';
import { useAuth } from '../context/AuthContext';
import { useDashboardLanguage } from '../i18n/useDashboardLanguage';
import {
  adminUsersService,
  getPathwayDisplayName,
  resolveAdminPathway,
} from '../services/adminUsersService';

type UsersSubTab = 'pending' | 'directory' | 'manual';

export function AdminUsersPage() {
  const { session } = useAuth();
  const { td, dt, formatDigits } = useDashboardLanguage();
  const [activeTab, setActiveTab] = useState<UsersSubTab>('pending');
  const [refreshTick, setRefreshTick] = useState(0);

  const activePathway = resolveAdminPathway(session?.selectedPathway);

  const pendingItems = useMemo(() => {
    void refreshTick;
    if (!activePathway) return [];
    return adminUsersService.listPending(activePathway);
  }, [activePathway, refreshTick]);

  const directoryProfiles = useMemo(() => {
    void refreshTick;
    if (!activePathway) return [];
    return adminUsersService.listProfiles(activePathway);
  }, [activePathway, refreshTick]);

  const handleDataChanged = () => {
    setRefreshTick((n) => n + 1);
  };

  if (!activePathway) {
    return (
      <DashboardShell title={td('Users')}>
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
                  'This Users management workspace is strictly scoped to the Bangla Version and English Version admin panels.',
                  'এই ব্যবহারকারী পরিচালনা প্যানেলটি কেবলমাত্র বাংলা ভার্সন এবং ইংরেজি ভার্সন অ্যাডমিন প্যানেলের জন্য সীমাবদ্ধ।'
                )}
              </p>
            </div>
          </div>
        </section>
      </DashboardShell>
    );
  }

  const pathwayLabel = td(getPathwayDisplayName(activePathway));

  const tabs: {
    id: UsersSubTab;
    label: string;
    count?: number;
    icon: React.ComponentType<{ className?: string }>;
  }[] = [
    {
      id: 'pending',
      label: 'Pending Approvals',
      count: pendingItems.length,
      icon: Clock,
    },
    {
      id: 'directory',
      label: 'User Directory',
      count: directoryProfiles.length,
      icon: Users,
    },
    {
      id: 'manual',
      label: 'Manual Registration',
      icon: UserPlus,
    },
  ];

  return (
    <DashboardShell title={td('Users')}>
      <div className="space-y-6">
        {/* Workspace Header & 3 Sub-Tab Navigation */}
        <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 transition-colors">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                {td('Users Management')}
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                {dt(
                  '{panel} · Strict pathway-isolated approvals, master directory, and manual account entry.',
                  '{panel} · পাথওয়ে-ভিত্তিক আবেদন অনুমোদন, মূল ডিরেক্টরি এবং ম্যানুয়াল অ্যাকাউন্ট নিবন্ধন।',
                  { panel: td(`${getPathwayDisplayName(activePathway)} Panel`) }
                )}
              </p>
            </div>
          </div>

          <div
            role="tablist"
            aria-label={td('Users workspace sections')}
            className="mt-5 pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center gap-2"
          >
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setActiveTab(tab.id)}
                  className={`inline-flex items-center gap-2 px-4 py-2.5 min-h-[42px] rounded-xl text-sm font-semibold transition-colors whitespace-nowrap tabular-nums ${
                    isActive
                      ? 'bg-emerald-700 dark:bg-emerald-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200/80 dark:hover:bg-slate-700/80 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span>{td(tab.label)}</span>
                  {typeof tab.count === 'number' && (
                    <span
                      className={`text-xs font-bold px-1.5 py-0.5 rounded-md tabular-nums ${
                        isActive
                          ? 'bg-emerald-800/70 dark:bg-emerald-700/80 text-emerald-50'
                          : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      {formatDigits(tab.count)}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </section>

        {/* Active Sub-Tab Panel */}
        {activeTab === 'pending' && (
          <PendingApprovalsTab
            pathway={activePathway}
            pendingItems={pendingItems}
            onDataChanged={handleDataChanged}
          />
        )}

        {activeTab === 'directory' && (
          <UserDirectoryTab
            pathway={activePathway}
            profiles={directoryProfiles}
            onDataChanged={handleDataChanged}
          />
        )}

        {activeTab === 'manual' && (
          <ManualRegistrationTab
            pathway={activePathway}
            onAccountCreated={handleDataChanged}
            onGoToDirectory={() => setActiveTab('directory')}
          />
        )}
      </div>
    </DashboardShell>
  );
}
