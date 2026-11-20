import React, { useEffect, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  Bell,
  BookOpen,
  CalendarCheck,
  CheckSquare,
  ClipboardCheck,
  CreditCard,
  Languages,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  Settings,
  Sun,
  Ticket,
  TrendingUp,
  Users,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useI18n } from '../i18n';
import type { UserRole } from '../types/domain';

interface NavItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

export function DashboardShell({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const { session, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { language, toggleLanguage, t } = useI18n();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const locationState = location.state as { notAllowed?: boolean } | null;
  const [showNotAllowed, setShowNotAllowed] = useState(Boolean(locationState?.notAllowed));

  useEffect(() => {
    if (locationState?.notAllowed) {
      setShowNotAllowed(true);
      // Clear navigation state cleanly so reload doesn't re-trigger
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [locationState?.notAllowed, location.pathname, navigate]);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  if (!session) return null;

  const role: UserRole = session.role;

  const navItems: NavItem[] =
    role === 'student'
      ? [
          { to: '/student/dashboard', label: t.nav.studentDashboard, icon: LayoutDashboard },
          { to: '/student/course-modules', label: t.nav.courseModules, icon: BookOpen },
          { to: '/student/study-plan', label: t.nav.studyPlan, icon: CalendarCheck },
          { to: '/student/progress', label: t.nav.progress, icon: TrendingUp },
          { to: '/student/payment-ledger', label: t.nav.paymentLedger, icon: CreditCard },
        ]
      : role === 'teacher'
        ? [
            { to: '/teacher/dashboard', label: t.nav.teacherDashboard, icon: LayoutDashboard },
            { to: '/teacher/attendance', label: t.nav.attendance, icon: CheckSquare },
            { to: '/teacher/grading', label: t.nav.grading, icon: ClipboardCheck },
          ]
        : [
            { to: '/admin/dashboard', label: t.nav.adminDashboard, icon: LayoutDashboard },
            { to: '/admin/coupons', label: t.nav.coupons, icon: Ticket },
            { to: '/admin/users', label: t.nav.users, icon: Users },
            { to: '/admin/notices', label: t.nav.notices, icon: Bell },
            { to: '/admin/settings', label: t.nav.settings, icon: Settings },
          ];

  const roleLabel =
    role === 'student'
      ? t.common.roleStudent
      : role === 'teacher'
        ? t.common.roleTeacher
        : t.common.roleAdmin;

  const panelPrimaryLabel =
    role === 'admin'
      ? session.selectedPathway
        ? t.admin.panels[session.selectedPathway]
        : t.admin.panels.default
      : session.fullName;

  const handleSignOut = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const renderNavLinks = () => (
    <nav aria-label="Workspace navigation" className="space-y-1 px-3 py-4">
      {navItems.map((item) => {
        const Icon = item.icon;
        return (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 min-h-[44px] rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                isActive
                  ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
              }`
            }
          >
            <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span className="truncate">{item.label}</span>
          </NavLink>
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
            to={`/${role}/dashboard`}
            className="text-lg font-bold tracking-tight text-slate-900 dark:text-white whitespace-nowrap"
          >
            {t.brand.name}
          </Link>
        </div>

        <div className="flex-1 overflow-y-auto">{renderNavLinks()}</div>

        <div className="border-t border-slate-200 dark:border-slate-800 p-4">
          <div className="flex items-center justify-between gap-2.5">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                {panelPrimaryLabel}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                {role === 'admin' ? session.email : `${roleLabel} · ${session.email}`}
              </p>
            </div>
            <button
              type="button"
              onClick={handleSignOut}
              className="inline-flex items-center gap-1.5 px-2.5 py-2 min-h-[40px] rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/50 hover:text-rose-700 dark:hover:text-rose-300 border border-slate-200 dark:border-slate-700 transition-colors whitespace-nowrap shrink-0"
            >
              <LogOut className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              <span>{t.common.signOut}</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Column */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar (compact on mobile, contextual on desktop) */}
        <header className="sticky top-0 z-30 h-14 lg:h-16 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 flex items-center justify-between gap-4 transition-colors">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open navigation menu"
              className="lg:hidden inline-flex items-center justify-center w-11 h-11 -ml-2 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
            >
              <Menu className="w-5 h-5" aria-hidden="true" />
            </button>
            <h1 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-white truncate">
              {title}
            </h1>
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
                <span className="text-base font-bold text-slate-900 dark:text-white">{t.brand.name}</span>
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  aria-label={t.common.close}
                  className="inline-flex items-center justify-center w-11 h-11 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <X className="w-5 h-5" aria-hidden="true" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto">{renderNavLinks()}</div>
              <div className="border-t border-slate-200 dark:border-slate-800 p-4">
                <div className="flex items-center justify-between gap-2.5">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                      {panelPrimaryLabel}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                      {role === 'admin' ? session.email : roleLabel}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleSignOut}
                    className="inline-flex items-center gap-1.5 px-2.5 py-2 min-h-[40px] rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/50 hover:text-rose-700 dark:hover:text-rose-300 border border-slate-200 dark:border-slate-700 transition-colors whitespace-nowrap shrink-0"
                  >
                    <LogOut className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                    <span>{t.common.signOut}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Route guard "Not allowed" notification banner */}
        {showNotAllowed && (
          <div
            role="alert"
            className="mx-4 sm:mx-6 mt-4 flex items-center justify-between gap-3 px-4 py-3 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 rounded-xl text-sm"
          >
            <div className="flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 text-amber-700 dark:text-amber-400 shrink-0" aria-hidden="true" />
              <span>{t.common.notAllowed}</span>
            </div>
            <button
              type="button"
              onClick={() => setShowNotAllowed(false)}
              aria-label={t.common.close}
              className="p-1.5 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-900/50 text-amber-800 dark:text-amber-300 min-h-[36px] min-w-[36px] flex items-center justify-center"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        )}

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-6xl w-full mx-auto">{children}</main>
      </div>
    </div>
  );
}
