import React, { useEffect, useState } from 'react';
import { Check, CheckCircle2, Clock, Copy, Plus, Search, X, XCircle } from 'lucide-react';
import { DashboardShell } from '../components/DashboardShell';
import { formatDigits, useI18n } from '../i18n';
import { couponService } from '../services/couponService';
import type { Coupon, CouponStatus } from '../types/domain';

type FilterType = 'all' | CouponStatus;

export function AdminCouponsPage() {
  const { language, t } = useI18n();
  const [coupons, setCoupons] = useState<Coupon[]>(() => couponService.listCoupons());
  const [now, setNow] = useState<number>(() => Date.now());
  const [filter, setFilter] = useState<FilterType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setInterval(() => {
      const current = Date.now();
      setNow(current);
      setCoupons(couponService.listCoupons(current));
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  const handleGenerate = (role: 'teacher' | 'student') => {
    const current = Date.now();
    couponService.generateCoupon(role, current);
    setNow(current);
    setCoupons(couponService.listCoupons(current));
  };

  const handleCopy = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
    } catch {
      // Fallback ignored if clipboard blocked in headless mode
    }
    setCopiedCode(code);
    window.setTimeout(() => {
      setCopiedCode((prev) => (prev === code ? null : prev));
    }, 2000);
  };

  const filteredCoupons = couponService.filterCoupons(coupons, {
    status: filter,
    query: searchQuery,
  });
  const hasSearchQuery = searchQuery.trim().length > 0;

  return (
    <DashboardShell title={t.admin.coupons.title}>
      <div className="space-y-6">
        {/* Action Header Card */}
        <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4 transition-colors">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              {t.admin.coupons.title}
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 max-w-xl">
              {t.admin.coupons.subtitle}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => handleGenerate('teacher')}
              className="inline-flex items-center gap-2 px-4 py-2.5 min-h-[44px] bg-emerald-700 hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white text-sm font-semibold rounded-lg transition-colors whitespace-nowrap"
            >
              <Plus className="w-4 h-4" aria-hidden="true" />
              <span>{t.admin.coupons.generateTeacher}</span>
            </button>
            <button
              type="button"
              onClick={() => handleGenerate('student')}
              className="inline-flex items-center gap-2 px-4 py-2.5 min-h-[44px] bg-slate-900 dark:bg-slate-700 hover:bg-slate-800 dark:hover:bg-slate-600 text-white text-sm font-semibold rounded-lg transition-colors whitespace-nowrap"
            >
              <Plus className="w-4 h-4" aria-hidden="true" />
              <span>{t.admin.coupons.generateStudent}</span>
            </button>
          </div>
        </section>

        {/* Table Card */}
        <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden transition-colors">
          <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="inline-flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg self-start">
              {(
                [
                  { id: 'all', label: t.admin.coupons.filterAll },
                  { id: 'active', label: t.admin.coupons.filterActive },
                  { id: 'used', label: t.admin.coupons.filterUsed },
                  { id: 'expired', label: t.admin.coupons.filterExpired },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setFilter(tab.id)}
                  className={`px-3 py-1.5 min-h-[36px] text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                    filter === tab.id
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto">
              <div className="relative flex-1 md:w-72">
                <label htmlFor="coupon-search-input" className="sr-only">
                  {t.admin.coupons.searchLabel}
                </label>
                <Search
                  className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                  aria-hidden="true"
                />
                <input
                  id="coupon-search-input"
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t.admin.coupons.searchPlaceholder}
                  className="w-full pl-9 pr-9 py-2 min-h-[40px] bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 transition-colors"
                />
                {hasSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    aria-label={t.admin.coupons.clearSearch}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 w-7 h-7 inline-flex items-center justify-center rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/70 dark:hover:bg-slate-800 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" aria-hidden="true" />
                  </button>
                )}
              </div>

              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 tabular-nums shrink-0">
                {formatDigits(filteredCoupons.length, language)}
              </p>
            </div>
          </div>

          {filteredCoupons.length === 0 ? (
            <div className="p-8 text-center space-y-3">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {hasSearchQuery ? t.admin.coupons.emptySearch : t.admin.coupons.empty}
              </p>
              {hasSearchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 min-h-[40px] text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-800 rounded-lg transition-colors"
                >
                  <X className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>{t.admin.coupons.clearSearch}</span>
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/60 text-xs font-semibold text-slate-600 dark:text-slate-300">
                    <th className="py-3 px-6">{t.admin.coupons.colCode}</th>
                    <th className="py-3 px-4">{t.admin.coupons.colType}</th>
                    <th className="py-3 px-4">{t.admin.coupons.colCreated}</th>
                    <th className="py-3 px-4">{t.admin.coupons.colCountdown}</th>
                    <th className="py-3 px-4">{t.admin.coupons.colStatus}</th>
                    <th className="py-3 px-6 text-right">{t.admin.coupons.colAction}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-sm">
                  {filteredCoupons.map((coupon) => {
                    const countdown = couponService.getCountdown(coupon.expiresAt, now);
                    const isCopied = copiedCode === coupon.code;
                    return (
                      <tr
                        key={coupon.code}
                        className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                      >
                        <td className="py-3.5 px-6 font-mono font-semibold text-slate-900 dark:text-white whitespace-nowrap">
                          {coupon.code}
                        </td>
                        <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300 whitespace-nowrap">
                          {coupon.role === 'teacher'
                            ? t.admin.coupons.typeTeacher
                            : t.admin.coupons.typeStudent}
                        </td>
                        <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400 text-xs whitespace-nowrap tabular-nums">
                          {new Date(coupon.createdAt).toLocaleString(
                            language === 'bn' ? 'bn-BD' : 'en-US',
                            { dateStyle: 'medium', timeStyle: 'short' }
                          )}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-xs text-slate-800 dark:text-slate-200 whitespace-nowrap tabular-nums">
                          {coupon.status === 'active'
                            ? formatDigits(countdown.formatted, language)
                            : coupon.status === 'used'
                              ? t.admin.coupons.usedTime
                              : t.admin.coupons.expiredTime}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <CouponStatusLabel status={coupon.status} t={t} />
                        </td>
                        <td className="py-3.5 px-6 text-right whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => handleCopy(coupon.code)}
                            aria-label={`${t.common.copy} ${coupon.code}`}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[36px] text-xs font-medium text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
                          >
                            {isCopied ? (
                              <>
                                <Check
                                  className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400"
                                  aria-hidden="true"
                                />
                                <span className="text-emerald-800 dark:text-emerald-300">
                                  {t.common.copied}
                                </span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                                <span>{t.common.copy}</span>
                              </>
                            )}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </DashboardShell>
  );
}

function CouponStatusLabel({
  status,
  t,
}: {
  status: CouponStatus;
  t: ReturnType<typeof useI18n>['t'];
}) {
  if (status === 'active') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
        <Clock className="w-3.5 h-3.5" aria-hidden="true" />
        <span>{t.admin.coupons.statusActive}</span>
      </span>
    );
  }
  if (status === 'used') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400">
        <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
        <span>{t.admin.coupons.statusUsed}</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-700 dark:text-red-400">
      <XCircle className="w-3.5 h-3.5" aria-hidden="true" />
      <span>{t.admin.coupons.statusExpired}</span>
    </span>
  );
}
