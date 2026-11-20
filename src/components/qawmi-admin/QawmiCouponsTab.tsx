import React, { useEffect, useState } from 'react';
import { Check, Clock, Copy, Plus, Search, Ticket } from 'lucide-react';
import {
  formatCountdownRemaining,
  qawmiAdminService,
  type QawmiAdminCoupon,
  type QawmiAdminRole,
} from '../../services/qawmiAdminService';
import type { CouponStatus } from '../../types/domain';
import { useDashboardLanguage } from '../../i18n/useDashboardLanguage';

interface QawmiCouponsTabProps {
  adminEmail: string;
  onDataChanged: () => void;
}

export function QawmiCouponsTab({ adminEmail, onDataChanged }: QawmiCouponsTabProps) {
  const { td, dt, formatDigits, formatDate, formatCountdown } = useDashboardLanguage();
  const [statusFilter, setStatusFilter] = useState<'all' | CouponStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [nowTs, setNowTs] = useState(() => Date.now());
  const [coupons, setCoupons] = useState<QawmiAdminCoupon[]>(() =>
    qawmiAdminService.listCoupons()
  );

  const refresh = (currentNow = Date.now()) => {
    setCoupons(
      qawmiAdminService.listCoupons({ status: statusFilter, query: searchQuery }, currentNow)
    );
  };

  useEffect(() => {
    refresh(nowTs);
  }, [statusFilter, searchQuery]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNowTs(Date.now());
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  const handleGenerate = (role: QawmiAdminRole) => {
    const created = qawmiAdminService.generateCoupon(role, adminEmail);
    setStatusFilter('all');
    setSearchQuery('');
    setCoupons(qawmiAdminService.listCoupons());
    setToastMsg(
      dt(
        'Generated {role} coupon {code} (valid for 48 hours).',
        '{role} কুপন {code} তৈরি হয়েছে (৪৮ ঘণ্টা মেয়াদ)।',
        { role: role === 'teacher' ? td('Teacher') : td('Student'), code: created.code }
      )
    );
    onDataChanged();
  };

  const handleCopy = async (code: string) => {
    try {
      await navigator.clipboard?.writeText(code);
    } catch {
      // Clipboard fallback ignored cleanly in restricted iframes
    }
    setCopiedCode(code);
    window.setTimeout(() => {
      setCopiedCode((prev) => (prev === code ? null : prev));
    }, 2000);
  };

  const allCoupons = qawmiAdminService.listCoupons({}, nowTs);
  const counts = {
    all: allCoupons.length,
    active: allCoupons.filter((c) => c.status === 'active').length,
    used: allCoupons.filter((c) => c.status === 'used').length,
    expired: allCoupons.filter((c) => c.status === 'expired').length,
  };

  return (
    <div className="space-y-6">
      {/* Header & Action Buttons */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              {dt('Qawmi Madrasa Onboarding Coupons', 'কওমি মাদ্রাসা অনবোর্ডিং কুপন')}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {dt(
                'Issue 48-hour single-use coupons strictly scoped to Qawmi Madrasa Teacher (T-XXXXX) and Student (S-XXXXX) registrations.',
                'শুধুমাত্র কওমি মাদ্রাসার শিক্ষক (T-XXXXX) এবং শিক্ষার্থী (S-XXXXX) নিবন্ধনের জন্য ৪৮ ঘণ্টা মেয়াদি একক-ব্যবহারযোগ্য কুপন ইস্যু করুন।'
              )}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => handleGenerate('teacher')}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 min-h-[42px] bg-emerald-700 hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white text-xs sm:text-sm font-semibold rounded-lg transition-colors whitespace-nowrap"
            >
              <Plus className="w-4 h-4" aria-hidden="true" />
              <span>{dt('Generate Teacher Coupon', 'শিক্ষক কুপন তৈরি করুন')}</span>
            </button>
            <button
              type="button"
              onClick={() => handleGenerate('student')}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 min-h-[42px] bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 text-xs sm:text-sm font-semibold rounded-lg transition-colors whitespace-nowrap"
            >
              <Plus className="w-4 h-4" aria-hidden="true" />
              <span>{dt('Generate Student Coupon', 'শিক্ষার্থী কুপন তৈরি করুন')}</span>
            </button>
          </div>
        </div>

        {toastMsg && (
          <div
            role="status"
            className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 text-sm"
          >
            <span>{toastMsg}</span>
            <button
              type="button"
              onClick={() => setToastMsg(null)}
              className="text-xs font-semibold underline underline-offset-4 shrink-0"
            >
              {dt('Dismiss', 'বন্ধ করুন')}
            </button>
          </div>
        )}

        {/* Search & Filter Controls */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-1">
          <div className="relative flex-1 max-w-sm">
            <Search
              className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden="true"
            />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={dt(
                'Search by coupon code (e.g. T-85310)...',
                'কুপন কোড দিয়ে খুঁজুন (যেমন T-85310)...'
              )}
              aria-label={dt('Search coupons by code', 'কোড দিয়ে কুপন খুঁজুন')}
              className="w-full pl-10 pr-3.5 py-2 min-h-[42px] bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-600"
            />
          </div>

          <div
            role="tablist"
            aria-label={dt('Filter coupons by status', 'অবস্থা অনুযায়ী কুপন ফিল্টার')}
            className="inline-flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg self-start"
          >
            {(['all', 'active', 'used', 'expired'] as const).map((status) => {
              const active = statusFilter === status;
              const label =
                status === 'all'
                  ? `${td('All')} (${formatDigits(counts.all)})`
                  : status === 'active'
                    ? `${td('Active')} (${formatDigits(counts.active)})`
                    : status === 'used'
                      ? `${td('Used')} (${formatDigits(counts.used)})`
                      : `${td('Expired')} (${formatDigits(counts.expired)})`;
              return (
                <button
                  key={status}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setStatusFilter(status)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                    active
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Coupons Data Table */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
        {coupons.length === 0 ? (
          <div className="p-10 text-center space-y-2">
            <Ticket
              className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto"
              aria-hidden="true"
            />
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              {dt(
                'No Qawmi Madrasa coupons match your filter',
                'আপনার ফিল্টারের সাথে কোনো কওমি মাদ্রাসা কুপন মেলেনি'
              )}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {dt(
                'Generate a new Teacher or Student coupon above or clear the search filter.',
                'উপরে নতুন শিক্ষক বা শিক্ষার্থী কুপন তৈরি করুন অথবা অনুসন্ধান ফিল্টার মুছুন।'
              )}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 text-xs font-semibold text-slate-500 dark:text-slate-400">
                  <th className="py-3 px-5">{dt('Coupon Code', 'কুপন কোড')}</th>
                  <th className="py-3 px-4">{td('Role')}</th>
                  <th className="py-3 px-4">{td('Status')}</th>
                  <th className="py-3 px-4">{dt('48h Validity Countdown', '৪৮ ঘণ্টা মেয়াদের কাউন্টডাউন')}</th>
                  <th className="py-3 px-4">{dt('Issued', 'ইস্যু তারিখ')}</th>
                  <th className="py-3 px-5 text-right">{td('Action')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                {coupons.map((cpn) => {
                  const countdown = formatCountdownRemaining(cpn.expiresAt, nowTs);
                  const effectiveStatus: CouponStatus =
                    cpn.status === 'active' && countdown.expired ? 'expired' : cpn.status;
                  return (
                    <tr
                      key={cpn.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-3.5 px-5 font-mono font-bold text-slate-900 dark:text-white tabular-nums whitespace-nowrap">
                        {cpn.code}
                      </td>
                      <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300 whitespace-nowrap">
                        {cpn.role === 'teacher' ? td('Teacher') : td('Student')}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`text-xs font-semibold ${
                            effectiveStatus === 'active'
                              ? 'text-emerald-700 dark:text-emerald-400'
                              : effectiveStatus === 'used'
                                ? 'text-sky-700 dark:text-sky-400'
                                : 'text-rose-600 dark:text-rose-400'
                          }`}
                        >
                          {effectiveStatus === 'active'
                            ? td('Active')
                            : effectiveStatus === 'used'
                              ? td('Used')
                              : td('Expired')}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-xs tabular-nums whitespace-nowrap">
                        {effectiveStatus === 'active' ? (
                          <span className="inline-flex items-center gap-1.5 text-slate-800 dark:text-slate-200 font-medium">
                            <Clock
                              className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400"
                              aria-hidden="true"
                            />
                            {formatCountdown(countdown.label)}
                          </span>
                        ) : effectiveStatus === 'used' ? (
                          <span className="text-slate-500 dark:text-slate-400">{td('Redeemed')}</span>
                        ) : (
                          <span className="text-rose-600 dark:text-rose-400">{td('Expired')}</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums whitespace-nowrap">
                        {formatDate(cpn.createdAt)}
                      </td>
                      <td className="py-3.5 px-5 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => handleCopy(cpn.code)}
                          aria-label={dt('Copy coupon {code}', 'কুপন {code} কপি করুন', {
                            code: cpn.code,
                          })}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[34px] text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 hover:text-emerald-700 dark:hover:text-emerald-300 border border-slate-200 dark:border-slate-700 rounded-lg transition-colors"
                        >
                          {copiedCode === cpn.code ? (
                            <>
                              <Check
                                className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400"
                                aria-hidden="true"
                              />
                              <span>{td('Copied')}</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                              <span>{td('Copy')}</span>
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
  );
}
