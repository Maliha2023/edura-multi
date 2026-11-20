import React from 'react';
import { Link } from 'react-router-dom';
import { Languages, LogOut, Moon, Sun } from 'lucide-react';
import { useI18n } from '../i18n';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export function PublicShell({ children }: { children: React.ReactNode }) {
  const { language, toggleLanguage, t } = useI18n();
  const { theme, toggleTheme } = useTheme();
  const { session, logout } = useAuth();

  const isForcedPasswordChange = Boolean(session?.mustChangePassword);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 transition-colors">
      <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border-b border-slate-200 dark:border-slate-800 transition-colors">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4 sm:gap-8">
          {/* Zone 1: Single text element wordmark */}
          <Link
            to={isForcedPasswordChange ? '/change-password' : '/'}
            className="text-lg font-bold tracking-tight text-slate-900 dark:text-white whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 rounded"
          >
            {t.brand.name}
          </Link>

          {/* Zone 3: Utility toggles (Theme & Language) */}
          <div className="flex items-center gap-2 shrink-0">
            {isForcedPasswordChange && (
              <button
                type="button"
                onClick={logout}
                className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[44px] text-sm font-medium text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap shrink-0"
              >
                <LogOut className="w-4 h-4" aria-hidden="true" />
                <span>{t.common.signOut}</span>
              </button>
            )}
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={t.common.themeToggleLabel}
              aria-pressed={theme === 'dark'}
              className="inline-flex items-center gap-2 px-3 py-2 min-h-[44px] text-sm font-medium text-slate-800 dark:text-slate-100 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
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
              className="inline-flex items-center gap-2 px-3.5 py-2 min-h-[44px] text-sm font-medium text-slate-800 dark:text-slate-100 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
            >
              <Languages className="w-4 h-4 text-emerald-700 dark:text-emerald-400" aria-hidden="true" />
              <span>{language === 'en' ? t.common.switchToBangla : t.common.switchToEnglish}</span>
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col">{children}</main>
    </div>
  );
}
