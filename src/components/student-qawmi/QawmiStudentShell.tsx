import React, { useState } from 'react';
import {
  Bell,
  BookOpen,
  Languages,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  Sparkles,
  Sun,
  UserCircle2,
  X,
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useDashboardLanguage } from '../../i18n/useDashboardLanguage';
import {
  formatQawmiStudentContextBadge,
  getQawmiBoardName,
  type QawmiStudentContext,
} from '../../services/qawmiStudentService';

export type QawmiStudentTab = 'overview' | 'subjects' | 'ai-tutor' | 'notices' | 'profile';

interface QawmiStudentShellProps {
  student: QawmiStudentContext;
  activeTab: QawmiStudentTab;
  onSelectTab: (tab: QawmiStudentTab) => void;
  unreadNoticeCount: number;
  onLogout: () => void;
  children: React.ReactNode;
}

const NAV_ITEMS: {
  id: QawmiStudentTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { id: 'overview', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'subjects', label: 'My Subjects', icon: BookOpen },
  { id: 'ai-tutor', label: 'AI Study Tutor', icon: Sparkles },
  { id: 'notices', label: 'Notices', icon: Bell },
  { id: 'profile', label: 'Profile & Settings', icon: UserCircle2 },
];

export function QawmiStudentShell({
  student,
  activeTab,
  onSelectTab,
  unreadNoticeCount,
  onLogout,
  children,
}: QawmiStudentShellProps) {
  const { theme, toggleTheme } = useTheme();
  const { toggleLanguage, toggleButtonLabel, t, td, formatDigits } = useDashboardLanguage();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const contextBadge = `${td(student.marhala)} · ${td(student.focusBranch)}`;
  const boardName = getQawmiBoardName();

  const initials = student.fullName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');

  const handleNavClick = (tab: QawmiStudentTab) => {
    onSelectTab(tab);
    setMobileMenuOpen(false);
  };

  const renderNavLinks = () => (
    <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto" aria-label="Qawmi student navigation">
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        const isActive = activeTab === item.id;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => handleNavClick(item.id)}
            aria-current={isActive ? 'page' : undefined}
            className={`w-full flex items-center justify-between gap-3 px-3.5 py-2.5 min-h-[44px] rounded-xl text-sm font-medium transition-colors text-left ${
              isActive
                ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200 border border-emerald-200/80 dark:border-emerald-800/80'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-white border border-transparent'
            }`}
          >
            <span className="flex items-center gap-3 min-w-0">
              <Icon
                className={`w-4 h-4 shrink-0 ${
                  isActive
                    ? 'text-emerald-700 dark:text-emerald-400'
                    : 'text-slate-400 dark:text-slate-500'
                }`}
              />
              <span className="truncate whitespace-nowrap">{td(item.label)}</span>
            </span>
            {item.id === 'notices' && unreadNoticeCount > 0 && (
              <span className="px-2 py-0.5 text-[11px] font-semibold rounded-md bg-emerald-100 dark:bg-emerald-900/70 text-emerald-800 dark:text-emerald-200 tabular-nums">
                {formatDigits(unreadNoticeCount)}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex transition-colors">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-72 lg:fixed lg:inset-y-0 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 z-30">
        <div className="px-5 py-5 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-700 text-white font-bold text-base flex items-center justify-center shrink-0">
              E
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                {t.brand.name}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                {td('Qawmi Madrasa Student Portal')}
              </p>
            </div>
          </div>

          <div
            data-testid="qawmi-student-sidebar-context"
            className="mt-4 px-3 py-2.5 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-900/70"
          >
            <p className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 truncate">
              {td(boardName)}
            </p>
            <p className="text-xs font-semibold text-slate-800 dark:text-slate-100 mt-0.5 truncate">
              {contextBadge}
            </p>
          </div>
        </div>

        {renderNavLinks()}

        <div
          data-testid="qawmi-student-sidebar-footer"
          className="p-4 border-t border-slate-200 dark:border-slate-800 space-y-3"
        >
          <div className="flex items-center gap-3 px-2 py-1.5">
            <div className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center justify-center shrink-0">
              {initials || 'ST'}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                {student.fullName}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                {student.email}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onLogout}
            className="w-full inline-flex items-center justify-center gap-2 px-3.5 py-2.5 min-h-[40px] rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-red-50 dark:hover:bg-red-950/40 text-slate-700 dark:text-slate-200 hover:text-red-700 dark:hover:text-red-300 border border-slate-200 dark:border-slate-700 hover:border-red-200 dark:hover:border-red-900 text-xs font-semibold transition-colors whitespace-nowrap"
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
          role="dialog"
          aria-modal="true"
          aria-label="Qawmi student navigation drawer"
        >
          <div
            className="fixed inset-0 bg-slate-950/60"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative w-72 max-w-[85vw] bg-white dark:bg-slate-900 h-full flex flex-col border-r border-slate-200 dark:border-slate-800 z-10">
            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-emerald-700 text-white font-bold text-sm flex items-center justify-center shrink-0">
                  E
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                    {td('Qawmi Madrasa Student')}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                    {contextBadge}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                aria-label={td('Close navigation menu')}
                className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            {renderNavLinks()}
            <div className="p-4 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={onLogout}
                className="w-full inline-flex items-center justify-center gap-2 px-3.5 py-2.5 min-h-[40px] rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold"
              >
                <LogOut className="w-4 h-4" aria-hidden="true" />
                <span>{td('Log Out')}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 lg:pl-72 flex flex-col min-w-0">
        <header className="sticky top-0 z-20 bg-white/95 dark:bg-slate-900/95 backdrop-blur border-b border-slate-200 dark:border-slate-800">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                onClick={() => setMobileMenuOpen(true)}
                aria-label={td('Open navigation menu')}
                className="lg:hidden w-10 h-10 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300"
              >
                <Menu className="w-5 h-5" />
              </button>
              <div className="min-w-0">
                <p className="text-sm sm:text-base font-bold text-slate-900 dark:text-white truncate">
                  {td(NAV_ITEMS.find((item) => item.id === activeTab)?.label ?? 'Dashboard')}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                  {contextBadge}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              <span
                data-testid="qawmi-student-topbar-context"
                className="hidden sm:inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/80 whitespace-nowrap"
              >
                {contextBadge}
              </span>
              <button
                type="button"
                onClick={toggleTheme}
                aria-label={theme === 'dark' ? td('Switch to light mode') : td('Switch to dark mode')}
                className="w-10 h-10 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center transition-colors"
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
          </div>
        </header>

        <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
