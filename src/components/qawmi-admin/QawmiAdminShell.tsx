import React, { useState } from 'react';
import {
  Bell,
  BookMarked,
  Languages,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  Settings,
  Sun,
  Ticket,
  Users,
  X,
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useDashboardLanguage } from '../../i18n/useDashboardLanguage';
import { getQawmiPanelName, getQawmiStreamLabel } from '../../services/qawmiAdminService';

export type QawmiAdminTab = 'overview' | 'coupons' | 'users' | 'notices' | 'settings';

interface QawmiAdminShellProps {
  adminEmail: string;
  activeTab: QawmiAdminTab;
  pendingCount: number;
  logoutModalOpen: boolean;
  onOpenLogoutModal: () => void;
  onCloseLogoutModal: () => void;
  onSelectTab: (tab: QawmiAdminTab) => void;
  onConfirmLogout: () => void;
  children: React.ReactNode;
}

const TAB_TITLES: Record<QawmiAdminTab, string> = {
  overview: 'Overview',
  coupons: 'Coupons',
  users: 'Users',
  notices: 'Notices',
  settings: 'Settings',
};

export function QawmiAdminShell({
  adminEmail,
  activeTab,
  pendingCount,
  logoutModalOpen,
  onOpenLogoutModal,
  onCloseLogoutModal,
  onSelectTab,
  onConfirmLogout,
  children,
}: QawmiAdminShellProps) {
  const { theme, toggleTheme } = useTheme();
  const { language, toggleLanguage, t, td, dt, formatDigits } = useDashboardLanguage();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const panelName = td(getQawmiPanelName());
  const streamLabel = td(getQawmiStreamLabel());

  const navItems: {
    id: QawmiAdminTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: number;
  }[] = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'coupons', label: 'Coupons', icon: Ticket },
    { id: 'users', label: 'Users', icon: Users, badge: pendingCount > 0 ? pendingCount : undefined },
    { id: 'notices', label: 'Notices', icon: Bell },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const handleSelect = (tab: QawmiAdminTab) => {
    onSelectTab(tab);
    setMobileMenuOpen(false);
  };

  const renderSidebarNav = () => (
    <nav aria-label="Qawmi Madrasa admin navigation" className="space-y-1 px-3 py-4">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = activeTab === item.id;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => handleSelect(item.id)}
            aria-current={isActive ? 'page' : undefined}
            className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 min-h-[44px] rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
              isActive
                ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <span className="flex items-center gap-3 min-w-0">
              <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span className="truncate">{td(item.label)}</span>
            </span>
            {typeof item.badge === 'number' && (
              <span className="text-xs font-mono font-semibold tabular-nums text-emerald-700 dark:text-emerald-300">
                {formatDigits(item.badge)}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );

  const renderFooterProfile = () => (
    <div className="border-t border-slate-200 dark:border-slate-800 p-4">
      <div className="flex items-center justify-between gap-2.5">
        <div className="min-w-0" data-testid="qawmi-admin-sidebar-footer">
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
            {panelName}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
            {adminEmail}
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setMobileMenuOpen(false);
            onOpenLogoutModal();
          }}
          className="inline-flex items-center gap-1.5 px-2.5 py-2 min-h-[40px] rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/50 hover:text-rose-700 dark:hover:text-rose-300 border border-slate-200 dark:border-slate-700 transition-colors whitespace-nowrap shrink-0"
        >
          <LogOut className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          <span>{td('Log Out')}</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 transition-colors">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:sticky lg:top-0 lg:h-screen lg:w-72 lg:shrink-0 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transition-colors">
        <div className="h-16 px-6 flex items-center border-b border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={() => handleSelect('overview')}
            className="text-lg font-bold tracking-tight text-slate-900 dark:text-white whitespace-nowrap"
          >
            {t.brand.name}
          </button>
        </div>

        {/* Pathway Context Card */}
        <div className="px-4 pt-4 pb-1">
          <div
            data-testid="qawmi-admin-sidebar-context"
            className="px-3.5 py-3 rounded-xl bg-emerald-50/75 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/70"
          >
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-800 dark:text-emerald-300">
              <BookMarked className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>{streamLabel}</span>
            </div>
            <p className="text-xs font-semibold text-slate-800 dark:text-slate-100 mt-1.5 leading-snug">
              {panelName}
            </p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">{renderSidebarNav()}</div>

        {renderFooterProfile()}
      </aside>

      {/* Main Column */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-30 h-14 lg:h-16 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 flex items-center justify-between gap-4 transition-colors">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label={td('Open Qawmi Madrasa admin menu')}
              className="lg:hidden inline-flex items-center justify-center w-11 h-11 -ml-2 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <Menu className="w-5 h-5" aria-hidden="true" />
            </button>
            <h1 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-white truncate">
              {td(TAB_TITLES[activeTab])}
            </h1>
            <span
              data-testid="qawmi-admin-topbar-context"
              className="hidden sm:inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/80 whitespace-nowrap"
            >
              {panelName}
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
              <div className="px-4 pt-4 pb-1">
                <div className="px-3.5 py-3 rounded-xl bg-emerald-50/75 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/70">
                  <div className="flex items-center gap-2 text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                    <BookMarked className="w-4 h-4 shrink-0" aria-hidden="true" />
                    <span>{streamLabel}</span>
                  </div>
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-100 mt-1">
                    {panelName}
                  </p>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto">{renderSidebarNav()}</div>
              {renderFooterProfile()}
            </div>
          </div>
        )}

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-6xl w-full mx-auto">
          {children}
        </main>
      </div>

      {/* Logout Confirmation Modal */}
      {logoutModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-[2px]"
          onClick={(e) => {
            if (e.target === e.currentTarget) onCloseLogoutModal();
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="qawmi-logout-modal-title"
            className="w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl p-6 space-y-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2
                  id="qawmi-logout-modal-title"
                  className="text-base font-bold text-slate-900 dark:text-white"
                >
                  {dt('Sign out of {panel}?', '{panel} থেকে লগআউট করবেন?', { panel: panelName })}
                </h2>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                  {dt(
                    'You will be returned to stream selection and will need to sign in again to manage Qawmi Madrasa records.',
                    'আপনাকে শিক্ষা ধারা নির্বাচন পর্দায় ফিরিয়ে নেওয়া হবে এবং কওমি মাদ্রাসার রেকর্ড পরিচালনা করতে পুনরায় লগইন করতে হবে।'
                  )}
                </p>
              </div>
              <button
                type="button"
                onClick={onCloseLogoutModal}
                aria-label={td('Cancel sign out')}
                className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 shrink-0"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={onCloseLogoutModal}
                className="px-4 py-2.5 min-h-[42px] text-sm font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
              >
                {td('Cancel')}
              </button>
              <button
                type="button"
                onClick={() => {
                  onCloseLogoutModal();
                  onConfirmLogout();
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 min-h-[42px] text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 dark:bg-rose-600 dark:hover:bg-rose-500 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" aria-hidden="true" />
                <span>{td('Confirm Log Out')}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
