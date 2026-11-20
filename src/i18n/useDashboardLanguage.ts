import { useCallback } from 'react';
import { useI18n } from './index';
import {
  formatDashboardCountdown,
  formatDashboardDate,
  formatDashboardDateTime,
  formatDashboardDigits,
  getLanguageToggleLabel,
  translateDashboardTemplate,
  translateDashboardText,
} from '../../lib/i18n-dashboard';

export function useDashboardLanguage() {
  const { language, setLanguage, toggleLanguage, t } = useI18n();
  const isBangla = language === 'bn';

  const td = useCallback(
    (text: string): string => translateDashboardText(text, language),
    [language]
  );

  const dt = useCallback(
    (
      enText: string,
      bnText: string,
      vars: Record<string, string | number> = {}
    ): string => translateDashboardTemplate(enText, bnText, vars, language),
    [language]
  );

  const formatDigits = useCallback(
    (value: string | number): string => formatDashboardDigits(value, language),
    [language]
  );

  const formatDate = useCallback(
    (
      isoOrDate: string | number | Date,
      options?: Intl.DateTimeFormatOptions
    ): string => formatDashboardDate(isoOrDate, language, options),
    [language]
  );

  const formatDateTime = useCallback(
    (
      isoOrDate: string | number | Date,
      options?: Intl.DateTimeFormatOptions
    ): string => formatDashboardDateTime(isoOrDate, language, options),
    [language]
  );

  const formatCountdown = useCallback(
    (countdown: string): string => formatDashboardCountdown(countdown, language),
    [language]
  );

  return {
    language,
    isBangla,
    setLanguage,
    toggleLanguage,
    t,
    td,
    dt,
    formatDigits,
    formatDate,
    formatDateTime,
    formatCountdown,
    toggleButtonLabel: getLanguageToggleLabel(language),
  };
}
