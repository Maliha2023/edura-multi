import React, { useState } from 'react';
import {
  Bell,
  BookOpen,
  Bot,
  GraduationCap,
  Languages,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  Sun,
  UserCircle,
  X,
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useDashboardLanguage } from '../../i18n/useDashboardLanguage';
import { getShortLevelLabel } from '../../services/internationalAdminService';
import {
  getIntlStudentPathwayLabel,
  type IntlStudentContext,
} from '../../services/internationalStudentService';

export type IntlStudentTabId = 'overview' | 'subjects' | 'tutor' | 'notices' | 'profile';

interface IntlStudentShellProps {
  student: IntlStudentContext;
  activeTab: IntlStudentTabId;
  onSelectTab: (tab: IntlStudentTabId) => void;
  noticeCount: number;
  onSignOut: () => void;
  children: React.ReactNode;
}

export function IntlStudentShell({
  student,
  activeTab,
  onSelectTab,
  noticeCount,
  onSignOut,
  children,
}: IntlStudentShellProps) {
  const { theme, toggleTheme } = useTheme();
  const { toggleLanguage, toggleButtonLabel, t, td, formatDigits } = useDashboardLanguage();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems: {
    id: IntlStudentTabId;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: number;
  }[] = [
    { id: 'overview', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'subjects', label: 'My Subjects', icon: BookOpen },
    { id: 'tutor', label: 'AI Study Tutor', icon: Bot },
    { id: 'notices', label: 'Notices', icon: Bell, badge: noticeCount },
    { id: 'profile', label: 'Profile & Settings', icon: UserCircle },
  ];

  const pathwayLabel = getIntlStudentPathwayLabel(student.pathway);
  const shortLevel = getShortLevelLabel(student.academicLevel);
  const localizedPathway = td(pathwayLabel);
  const localizedLevel = td(shortLevel);
  const localizedTrack = td(student.academicTrack);
  const contextBadge = `${localizedPathway} · ${localizedLevel} · ${localizedTrack}`;
  const activeNav = navItems.find((item) => item.id === activeTab) ?? navItems[0];

  const renderNavContent = () => (
    <>
      <div className="h-16 px-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-emerald-700 dark:bg-emerald-600 text-white flex items-center justify-center shrink-0">
            <GraduationCap className="w-5 h-5" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-slate-900 dark:text-white leading-tight truncate">
              {t.brand.name}
            </p>
            <p className="text-[11px] font-medium text-emerald-700 dark:text-emerald-400 truncate">
              {td(`${pathwayLabel} Student Portal`)}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setMobileMenuOpen(false)}
          aria-label={td('Close navigation menu')}
          className="lg:hidden w-9 h-9 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          <X className="w-5 h-5" aria-hidden="true" />
        </button>
      </div>

      {/* Academic Pathway Context Card */}
      <div className="px-4 pt-4 pb-2">
        <div className="rounded-xl border border-emerald-200 dark:border-emerald-800/80 bg-emerald-50/70 dark:bg-emerald-950/40 px-3.5 py-2.5">
          <p className="text-[11px] font-semibold text-emerald-800 dark:text-emerald-300">
            {td('International Curriculum')} · {localizedPathway}
          </p>
          <p className="text-xs font-semibold text-slate-900 dark:text-white mt-0.5 truncate">
            {localizedLevel} • {localizedTrack}
          </p>
        </div>
      </div>

      {/* Navigation Links */}
      <nav aria-label="International student navigation" className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                onSelectTab(item.id);
                setMobileMenuOpen(false);
              }}
              aria-current={isActive ? 'page' : undefined}
              className={`w-full flex items-center justify-between gap-3 px-3.5 py-2.5 min-h-[44px] rounded-xl text-sm font-medium transition-colors text-left ${
                isActive
                  ? 'bg-emerald-700 dark:bg-emerald-600 text-white font-semibold'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <span className="flex items-center gap-3 min-w-0">
                <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span className="truncate">{td(item.label)}</span>
              </span>
              {typeof item.badge === 'number' && item.badge > 0 && (
                <span
                  className={`text-xs font-semibold tabular-nums px-2 py-0.5 rounded-md ${
                    isActive
                      ? 'bg-white/20 text-white'
                      : 'bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {formatDigits(item.badge)}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Sidebar Footer: Profile & Logout */}
      <div className="p-4 border-t border-slate-200 dark:border-slate-800 space-y-3 shrink-0">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
            {student.fullName}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{student.email}</p>
        </div>
        <button
          type="button"
          onClick={onSignOut}
          className="w-full inline-flex items-center justify-center gap-2 px-3.5 py-2.5 min-h-[42px] bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/50 text-slate-800 dark:text-slate-200 hover:text-rose-700 dark:hover:text-rose-300 border border-slate-200 dark:border-slate-700 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap"
        >
          <LogOut className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span>{td('Log Out')}</span>
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
      {/* Desktop Left Sidebar */}
      <aside className="hidden lg:flex lg:flex-col w-72 shrink-0 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 sticky top-0 h-screen">
        {renderNavContent()}
      </aside>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-50 lg:hidden flex bg-slate-950/50 backdrop-blur-[1px]"
          onClick={(e) => {
            if (e.target === e.currentTarget) setMobileMenuOpen(false);
          }}
        >
          <aside className="w-72 max-w-[85vw] h-full bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col">
            {renderNavContent()}
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="h-16 px-4 sm:px-6 lg:px-8 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4 sticky top-0 z-30 transition-colors">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label={td('Open navigation menu')}
              className="lg:hidden w-10 h-10 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 shrink-0"
            >
              <Menu className="w-5 h-5" aria-hidden="true" />
            </button>
            <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white truncate">
              {td(activeNav.label)}
            </h1>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <span className="hidden sm:inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 whitespace-nowrap">
              {contextBadge}
            </span>

            <button
              type="button"
              onClick={toggleTheme}
              aria-label={theme === 'dark' ? td('Switch to light mode') : td('Switch to dark mode')}
              className="w-10 h-10 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center justify-center transition-colors shrink-0"
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4" aria-hidden="true" />
              ) : (
                <Moon className="w-4 h-4" aria-hidden="true" />
              )}
            </button>

            <button
              type="button"
              onClick={toggleLanguage}
              aria-label={t.common.languageToggleLabel}
              className="inline-flex items-center gap-1.5 px-3 h-10 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 text-xs sm:text-sm font-medium transition-colors whitespace-nowrap shrink-0"
            >
              <Languages className="w-4 h-4 text-emerald-700 dark:text-emerald-400" aria-hidden="true" />
              <span>{toggleButtonLabel}</span>
            </button>
          </div>
        </header>

        <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
