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
  UserCircle2,
  Users,
  X,
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useDashboardLanguage } from '../../i18n/useDashboardLanguage';
import {
  formatAssignedLevelsSummary,
  type IntlTeacherContext,
} from '../../services/internationalTeacherService';

export type IntlTeacherTabId =
  | 'overview'
  | 'classes'
  | 'roster'
  | 'ai-assistant'
  | 'notices'
  | 'profile';

interface IntlTeacherShellProps {
  teacher: IntlTeacherContext;
  activeTab: IntlTeacherTabId;
  onSelectTab: (tab: IntlTeacherTabId) => void;
  onLogout: () => void;
  noticeCount?: number;
  children: React.ReactNode;
}

const NAV_ITEMS: {
  id: IntlTeacherTabId;
  label: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  {
    id: 'overview',
    label: 'Dashboard',
    subtitle: 'Teaching snapshot & schedule',
    icon: LayoutDashboard,
  },
  {
    id: 'classes',
    label: 'My Classes & Modules',
    subtitle: 'Notes, worksheets & past papers',
    icon: BookOpen,
  },
  {
    id: 'roster',
    label: 'Student Roster & Progress',
    subtitle: 'Levels, tracks, marks & attendance',
    icon: Users,
  },
  {
    id: 'ai-assistant',
    label: 'AI Teaching Assistant',
    subtitle: 'Lesson plans, past papers & rubrics',
    icon: Bot,
  },
  {
    id: 'notices',
    label: 'Notices',
    subtitle: 'Official alerts & class updates',
    icon: Bell,
  },
  {
    id: 'profile',
    label: 'Profile & Settings',
    subtitle: 'Faculty credentials & security',
    icon: UserCircle2,
  },
];

export function IntlTeacherShell({
  teacher,
  activeTab,
  onSelectTab,
  onLogout,
  noticeCount = 0,
  children,
}: IntlTeacherShellProps) {
  const { theme, toggleTheme } = useTheme();
  const { toggleLanguage, toggleButtonLabel, t, td, formatDigits } = useDashboardLanguage();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const pathwayLabel = teacher.pathway === 'cambridge' ? td('Cambridge') : td('Edexcel');
  const contextBadge = `${pathwayLabel} · ${td(teacher.primarySubject)}`;
  const levelsSummary = formatAssignedLevelsSummary(teacher.assignedLevels)
    .split(', ')
    .map((lvl) => td(lvl))
    .join(', ');
  const activeMeta = NAV_ITEMS.find((item) => item.id === activeTab) ?? NAV_ITEMS[0];

  const handleSelect = (tab: IntlTeacherTabId) => {
    onSelectTab(tab);
    setMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex transition-colors">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:flex-col w-72 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 shrink-0">
        <div className="h-16 px-5 flex items-center gap-3 border-b border-slate-200 dark:border-slate-800">
          <div className="w-9 h-9 rounded-lg bg-teal-700 dark:bg-teal-600 text-white flex items-center justify-center shrink-0">
            <GraduationCap className="w-5 h-5" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-slate-900 dark:text-white leading-tight truncate">
              {t.brand.name}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
              {td('International Faculty')}
            </p>
          </div>
        </div>

        {/* Pathway & Subject Identity */}
        <div className="px-4 py-3.5 border-b border-slate-200 dark:border-slate-800">
          <div className="px-3 py-2.5 rounded-xl bg-teal-50/90 dark:bg-teal-950/60 border border-teal-200/80 dark:border-teal-800/80">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-teal-800 dark:text-teal-300">
              {td('Teacher Portal')}
            </p>
            <p className="text-xs font-bold text-slate-900 dark:text-white mt-0.5 truncate">
              {contextBadge}
            </p>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5 truncate">
              {levelsSummary} · {td(teacher.academicTrack)}
            </p>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto" aria-label="Teacher navigation">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelect(item.id)}
                className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 min-h-[44px] rounded-xl text-left text-sm font-medium transition-colors ${
                  active
                    ? 'bg-teal-50 dark:bg-teal-950/70 text-teal-800 dark:text-teal-300 font-semibold'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80'
                }`}
              >
                <span className="flex items-center gap-3 min-w-0">
                  <Icon
                    className={`w-4 h-4 shrink-0 ${
                      active
                        ? 'text-teal-700 dark:text-teal-400'
                        : 'text-slate-500 dark:text-slate-400'
                    }`}
                    aria-hidden="true"
                  />
                  <span className="truncate">{td(item.label)}</span>
                </span>
                {item.id === 'notices' && noticeCount > 0 && (
                  <span className="text-xs font-semibold text-teal-700 dark:text-teal-300 tabular-nums">
                    {formatDigits(noticeCount)}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
          <div className="px-2">
            <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
              {teacher.fullName}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
              {teacher.email}
            </p>
          </div>
          <button
            type="button"
            onClick={onLogout}
            className="w-full inline-flex items-center justify-center gap-2 px-3 py-2.5 min-h-[42px] bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 text-sm font-medium rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" aria-hidden="true" />
            <span>{td('Log Out')}</span>
          </button>
        </div>
      </aside>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-50 lg:hidden flex"
          onClick={(e) => {
            if (e.target === e.currentTarget) setMobileMenuOpen(false);
          }}
        >
          <div className="w-72 max-w-[85vw] bg-white dark:bg-slate-900 h-full shadow-2xl border-r border-slate-200 dark:border-slate-800 flex flex-col">
            <div className="h-16 px-4 flex items-center justify-between border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-teal-700 text-white flex items-center justify-center shrink-0">
                  <GraduationCap className="w-4 h-4" aria-hidden="true" />
                </div>
                <span className="text-sm font-bold text-slate-900 dark:text-white truncate">
                  {t.brand.name}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                aria-label={td('Close navigation menu')}
                className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>

            <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800">
              <p className="text-xs font-semibold text-teal-800 dark:text-teal-300 truncate">
                {contextBadge}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                {levelsSummary}
              </p>
            </div>

            <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const active = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelect(item.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 min-h-[44px] rounded-xl text-sm font-medium transition-colors ${
                      active
                        ? 'bg-teal-50 dark:bg-teal-950/70 text-teal-800 dark:text-teal-300 font-semibold'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
                    <span className="truncate">{td(item.label)}</span>
                  </button>
                );
              })}
            </nav>

            <div className="p-4 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={onLogout}
                className="w-full inline-flex items-center justify-center gap-2 px-3 py-2.5 min-h-[42px] bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm font-medium rounded-lg"
              >
                <LogOut className="w-4 h-4" aria-hidden="true" />
                <span>{td('Log Out')}</span>
              </button>
            </div>
          </div>
          <div className="flex-1 bg-slate-950/50" />
        </div>
      )}

      {/* Main Column */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label={td('Open navigation menu')}
              className="lg:hidden w-10 h-10 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 shrink-0"
            >
              <Menu className="w-5 h-5" aria-hidden="true" />
            </button>
            <div className="min-w-0">
              <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-tight truncate">
                {td(activeMeta.label)}
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate hidden sm:block">
                {td(activeMeta.subtitle)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <span className="hidden md:inline-flex items-center px-3 py-1.5 rounded-lg bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800 text-xs font-semibold text-teal-800 dark:text-teal-300 whitespace-nowrap">
              {contextBadge}
            </span>

            <button
              type="button"
              onClick={toggleTheme}
              aria-label={theme === 'dark' ? td('Switch to light mode') : td('Switch to dark mode')}
              title={theme === 'dark' ? td('Switch to light mode') : td('Switch to dark mode')}
              className="w-10 h-10 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center justify-center transition-colors"
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400" aria-hidden="true" />
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
              <Languages className="w-4 h-4 text-teal-700 dark:text-teal-400" aria-hidden="true" />
              <span>{toggleButtonLabel}</span>
            </button>
          </div>
        </header>

        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6 sm:py-8 max-w-6xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
