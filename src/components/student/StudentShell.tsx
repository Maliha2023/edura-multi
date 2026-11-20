import React, { useState } from 'react';
import { Link } from 'react-router-dom';
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
  UserCog,
  X,
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useDashboardLanguage } from '../../i18n/useDashboardLanguage';
import {
  formatStudentContextBadge,
  type StudentProfileContext,
} from '../../services/studentService';

export type StudentTabId = 'overview' | 'subjects' | 'tutor' | 'notices' | 'profile';

interface StudentShellProps {
  student: StudentProfileContext;
  activeTab: StudentTabId;
  onSelectTab: (tab: StudentTabId) => void;
  noticeCount: number;
  onSignOut: () => void;
  children: React.ReactNode;
}

const NAV_ITEMS: {
  id: StudentTabId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { id: 'overview', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'subjects', label: 'My Subjects', icon: BookOpen },
  { id: 'tutor', label: 'AI Study Tutor', icon: Bot },
  { id: 'notices', label: 'Notices', icon: Bell },
  { id: 'profile', label: 'Profile & Settings', icon: UserCog },
];

export function StudentShell({
  student,
  activeTab,
  onSelectTab,
  noticeCount,
  onSignOut,
  children,
}: StudentShellProps) {
  const { theme, toggleTheme } = useTheme();
  const { language, toggleLanguage, t, td, dt, formatDigits } = useDashboardLanguage();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const contextLabel = `${td(student.pathway)} · ${dt('Class {num}', 'শ্রেণি {num}', { num: student.academicClass })}${student.academicGroup ? ` · ${td(student.academicGroup)}` : ''}`;

  const activeNavMeta = NAV_ITEMS.find((n) => n.id === activeTab) ?? NAV_ITEMS[0];

  const handleTabClick = (tab: StudentTabId) => {
    onSelectTab(tab);
    setMobileMenuOpen(false);
  };

  const renderSidebarNav = () => (
    <nav aria-label="Student workspace navigation" className="space-y-1 px-3 py-4">
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        const isActive = activeTab === item.id;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => handleTabClick(item.id)}
            aria-current={isActive ? 'page' : undefined}
            className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 min-h-[44px] rounded-lg text-sm font-medium transition-colors whitespace-nowrap text-left ${
              isActive
                ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <span className="flex items-center gap-3 min-w-0">
              <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span className="truncate">{td(item.label)}</span>
            </span>
            {item.id === 'notices' && noticeCount > 0 && (
              <span className="text-xs font-semibold tabular-nums text-slate-500 dark:text-slate-400">
                {formatDigits(noticeCount)}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-screen flex bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 transition-colors">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-72 lg:shrink-0 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transition-colors">
        <div className="h-16 px-6 flex items-center border-b border-slate-200 dark:border-slate-800">
          <Link
            to="/student/dashboard"
            onClick={() => onSelectTab('overview')}
            className="text-lg font-bold tracking-tight text-slate-900 dark:text-white whitespace-nowrap"
          >
            {t.brand.name}
          </Link>
        </div>

        {/* Sidebar Academic Context Summary */}
        <div className="px-4 pt-4 pb-2">
          <div
            data-testid="student-sidebar-context"
            className="px-3.5 py-3 rounded-xl bg-emerald-50/75 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/70"
          >
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-800 dark:text-emerald-300">
              <GraduationCap className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>{td('Student Portal')}</span>
            </div>
            <p className="text-xs font-semibold text-slate-800 dark:text-slate-100 mt-1.5 leading-snug">
              {contextLabel}
            </p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">{renderSidebarNav()}</div>

        <div className="border-t border-slate-200 dark:border-slate-800 p-4">
          <div className="flex items-center justify-between gap-2.5">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                {student.fullName}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                {student.email}
              </p>
            </div>
            <button
              type="button"
              onClick={onSignOut}
              className="inline-flex items-center gap-1.5 px-2.5 py-2 min-h-[40px] rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/50 hover:text-rose-700 dark:hover:text-rose-300 border border-slate-200 dark:border-slate-700 transition-colors whitespace-nowrap shrink-0"
            >
              <LogOut className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              <span>{td('Log Out')}</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Column */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-30 h-14 lg:h-16 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 flex items-center justify-between gap-4 transition-colors">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label={td('Open student navigation menu')}
              className="lg:hidden inline-flex items-center justify-center w-11 h-11 -ml-2 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
            >
              <Menu className="w-5 h-5" aria-hidden="true" />
            </button>
            <h1 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-white truncate">
              {td(activeNavMeta.label)}
            </h1>
            <span
              data-testid="student-topbar-context"
              className="hidden md:inline-flex items-center px-3 py-1 rounded-lg text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 whitespace-nowrap"
            >
              {contextLabel}
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={t.common.themeToggleLabel}
              aria-pressed={theme === 'dark'}
              className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[44px] text-sm font-medium text-slate-800 dark:text-slate-100 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400" aria-hidden="true" />
              ) : (
                <Moon className="w-4 h-4 text-slate-700" aria-hidden="true" />
              )}
              <span className="hidden sm:inline">
                {theme === 'dark' ? t.common.switchToLight : t.common.switchToDark}
              </span>
            </button>
            <button
              type="button"
              onClick={toggleLanguage}
              aria-label={t.common.languageToggleLabel}
              className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[44px] text-sm font-medium text-slate-800 dark:text-slate-100 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              <Languages className="w-4 h-4 text-emerald-700 dark:text-emerald-400" aria-hidden="true" />
              <span>{language === 'en' ? t.common.switchToBangla : t.common.switchToEnglish}</span>
            </button>
          </div>
        </header>

        {/* Mobile Drawer */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 lg:hidden flex">
            <div
              className="fixed inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-xs"
              onClick={() => setMobileMenuOpen(false)}
              aria-hidden="true"
            />
            <div className="relative w-80 max-w-[88vw] bg-white dark:bg-slate-900 h-full flex flex-col border-r border-slate-200 dark:border-slate-800 shadow-xl">
              <div className="h-14 px-4 flex items-center justify-between border-b border-slate-200 dark:border-slate-800">
                <span className="text-base font-bold text-slate-900 dark:text-white">
                  {t.brand.name}
                </span>
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  aria-label={t.common.close}
                  className="inline-flex items-center justify-center w-11 h-11 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <X className="w-5 h-5" aria-hidden="true" />
                </button>
              </div>
              <div className="px-4 pt-4">
                <div className="px-3.5 py-2.5 rounded-xl bg-emerald-50/75 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
                  <p className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                    {contextLabel}
                  </p>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto">{renderSidebarNav()}</div>
              <div className="border-t border-slate-200 dark:border-slate-800 p-4 flex items-center justify-between gap-2.5">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                    {student.fullName}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                    {student.email}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onSignOut}
                  className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[40px] rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 whitespace-nowrap shrink-0"
                >
                  <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>{td('Log Out')}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-6xl w-full mx-auto">{children}</main>
      </div>
    </div>
  );
}
