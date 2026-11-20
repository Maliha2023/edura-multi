import React, { createContext, useContext, useEffect, useState } from 'react';
import type { Language } from '../types/domain';
import { en, type TranslationDict } from './en';
import { bn } from './bn';
import { authService } from '../services/authService';

const LANG_STORAGE_KEY = 'edura_multi_lang';

interface I18nContextValue {
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  t: TranslationDict;
}

const I18nContext = createContext<I18nContextValue | null>(null);

function getInitialLanguage(): Language {
  try {
    const session = authService.getCurrentSession();
    if (session?.preferredLanguage === 'bn' || session?.preferredLanguage === 'en') {
      return session.preferredLanguage;
    }
    const saved = window.localStorage.getItem(LANG_STORAGE_KEY);
    if (saved === 'bn' || saved === 'en') return saved;
  } catch {
    // Ignore storage access errors
  }
  return 'en';
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>(getInitialLanguage);

  useEffect(() => {
    document.documentElement.lang = language;
    try {
      window.localStorage.setItem(LANG_STORAGE_KEY, language);
    } catch {
      // Ignore storage access errors
    }
  }, [language]);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    authService.updatePreferredLanguage(lang);
  };

  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'bn' : 'en');
  };

  const t = language === 'bn' ? bn : en;

  return (
    <I18nContext.Provider value={{ language, setLanguage, toggleLanguage, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return ctx;
}

export function formatMessage(
  template: string,
  vars: Record<string, string | number>
): string {
  return Object.entries(vars).reduce(
    (acc, [key, val]) => acc.replaceAll(`{${key}}`, String(val)),
    template
  );
}

const BANGLA_DIGITS = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'] as const;

export function formatDigits(value: string | number, language: Language): string {
  const str = String(value);
  if (language !== 'bn') return str;
  return str.replace(/\d/g, (d) => BANGLA_DIGITS[Number(d)] ?? d);
}
