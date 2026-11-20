import React, { useState } from 'react';
import {
  Bell,
  BookOpen,
  GraduationCap,
  Languages,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  Sparkles,
  Sun,
  UserCircle2,
  Users,
  X,
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useDashboardLanguage } from '../../i18n/useDashboardLanguage';
import {
  formatAliaTeacherContextBadge,
  formatAssignedAliaMarhalasSummary,
  type AliaTeacherContext,
} from '../../services/aliaTeacherService';

export type AliaTeacherTabId =
  | 'overview'
  | 'classes'
  | 'roster'
  | 'ai-assistant'
  | 'notices'
  | 'profile';

interface AliaTeacherShellProps {
  teacher: AliaTeacherContext;
  activeTab: AliaTeacherTabId;
  onSelectTab: (tab: AliaTeacherTabId) => void;
  onLogout: () => void;
  noticeCount: number;
  children: React.ReactNode;
}

const NAV_ITEMS: {
  id: AliaTeacherTabId;
  label: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
}[] = [
  { id: 'overview', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'classes', label: 'My Classes & Modules', icon: BookOpen },
  { id: 'roster', label: 'Student Roster & Progress', icon: Users },
  { id: 'ai-assistant', label: 'AI Teaching Assistant', icon: Sparkles },
  { id: 'notices', label: 'Notices', icon: Bell },
  { id: 'profile', label: 'Profile & Settings', icon: UserCircle2 },
];

export function AliaTeacherShell({
  teacher,
  activeTab,
  onSelectTab,
  onLogout,
  noticeCount,
  children,
}: AliaTeacherShellProps) {
  const { theme, toggleTheme } = useTheme();
  const { toggleLanguage, toggleButtonLabel, t, td, formatDigits } = useDashboardLanguage();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const contextBadge = `${td('Alia Madrasa')} · ${td(teacher.primarySubject)}`;
  const marhalasSummary = formatAssignedAliaMarhalasSummary(teacher.assignedMarhalas)
    .split(', ')
    .map((m) => td(m))
    .join(', ');

  const handleNavClick = (tab: AliaTeacherTabId) => {
    onSelectTab(tab);
    setMobileMenuOpen(false);
  };

  const renderSidebarContent = () => (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800">
      {/* Brand + Alia Faculty Context */}
      <div className="p-5 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-teal-700 dark:bg-teal-600 text-white flex items-center justify-center shrink-0">
              <GraduationCap className="w-5 h-5" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                {td('Teacher Portal')}
              </p>
              <p className="text-[11px] font-medium text-teal-700 dark:text-teal-400 truncate">
                {td('Alia Madrasa Faculty')}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setMobileMenuOpen(false)}
            aria-label={td('Close navigation')}
            className="lg:hidden w-9 h-9 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        <div className="mt-4 px-3 py-2.5 rounded-xl bg-teal-50/80 dark:bg-teal-950/50 border border-teal-200/80 dark:border-teal-800/80">
          <p className="text-xs font-semibold text-teal-900 dark:text-teal-200 truncate">
            {contextBadge}
          </p>
          <p className="text-[11px] text-teal-800/80 dark:text-teal-300/80 mt-0.5 truncate">
            {marhalasSummary} · {td(teacher.department)}
          </p>
        </div>
      </div>

      {/* Navigation */}
      <nav aria-label="Alia Teacher Navigation" className="flex-1 p-3.5 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleNavClick(item.id)}
              aria-current={isActive ? 'page' : undefined}
              className={`w-full flex items-center justify-between gap-2.5 px-3.5 py-2.5 min-h-[44px] rounded-xl text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-teal-700 dark:bg-teal-600 text-white shadow-sm'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <span className="flex items-center gap-3 min-w-0">
                <Icon
                  className={`w-4 h-4 shrink-0 ${
                    isActive ? 'text-white' : 'text-slate-500 dark:text-slate-400'
                  }`}
                  aria-hidden="true"
                />
                <span className="truncate">{td(item.label)}</span>
              </span>
              {item.id === 'notices' && noticeCount > 0 && (
                <span
                  className={`px-2 py-0.5 text-[11px] font-semibold rounded-md tabular-nums ${
                    isActive
                      ? 'bg-white/20 text-white'
                      : 'bg-teal-100 dark:bg-teal-900/60 text-teal-800 dark:text-teal-300'
                  }`}
                >
                  {formatDigits(noticeCount)}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer Profile + Logout */}
      <div className="p-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
        <div className="flex items-center gap-3 px-2">
          <div className="w-9 h-9 rounded-full bg-slate-900 dark:bg-slate-700 text-white text-xs font-bold flex items-center justify-center shrink-0">
            {teacher.fullName
              .split(' ')
              .slice(0, 2)
              .map((part) => part[0]?.toUpperCase() ?? '')
              .join('')}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">
              {teacher.fullName}
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
              {teacher.email}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onLogout}
          className="w-full inline-flex items-center justify-center gap-2 px-3.5 py-2.5 min-h-[42px] rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/70 hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:border-rose-200 dark:hover:border-rose-800 text-slate-700 dark:text-slate-200 hover:text-rose-700 dark:hover:text-rose-300 text-xs font-semibold transition-colors"
        >
          <LogOut className="w-4 h-4" aria-hidden="true" />
          <span>{td('Log Out')}</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex transition-colors">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-72 shrink-0 sticky top-0 h-screen">
        {renderSidebarContent()}
      </aside>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-950/60"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative w-72 max-w-[85vw] h-full z-10">{renderSidebarContent()}</div>
        </div>
      )}

      {/* Main Content Column */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="sticky top-0 z-30 h-16 bg-white/95 dark:bg-slate-900/95 backdrop-blur border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label={td('Open navigation menu')}
              className="lg:hidden w-10 h-10 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <Menu className="w-5 h-5" aria-hidden="true" />
            </button>
            <div className="min-w-0">
              <p className="text-sm sm:text-base font-bold text-slate-900 dark:text-white truncate">
                {td(NAV_ITEMS.find((item) => item.id === activeTab)?.label ?? 'Dashboard')}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate hidden sm:block">
                {td('Bangladesh Madrasa Education · BMEB / IAU Curriculum')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <span className="hidden md:inline-flex items-center px-3 py-1.5 rounded-lg bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800 text-xs font-semibold text-teal-800 dark:text-teal-300">
              {contextBadge}
            </span>

            <button
              type="button"
              onClick={toggleTheme}
              aria-label={theme === 'dark' ? td('Switch to light mode') : td('Switch to dark mode')}
              className="w-10 h-10 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center transition-colors"
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400" aria-hidden="true" />
              ) : (
                <Moon className="w-4 h-4 text-slate-600" aria-hidden="true" />
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

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-6xl w-full mx-auto">{children}</main>
      </div>
    </div>
  );
}
