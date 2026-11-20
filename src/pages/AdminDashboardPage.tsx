import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Check, Copy, Plus, Ticket, UserCheck } from 'lucide-react';
import { DashboardShell } from '../components/DashboardShell';
import { formatDigits, useI18n } from '../i18n';
import { couponService } from '../services/couponService';
import { registrationService } from '../services/registrationService';
import { loadDatabase } from '../services/storage';
import type { Coupon } from '../types/domain';

export function AdminDashboardPage() {
  const { language, t } = useI18n();
  const [refreshTick, setRefreshTick] = useState(0);
  const [latestCoupon, setLatestCoupon] = useState<Coupon | null>(null);
  const [copied, setCopied] = useState(false);

  const stats = useMemo(() => {
    void refreshTick;
    const coupons = couponService.listCoupons();
    const activeCoupons = coupons.filter((c) => c.status === 'active').length;
    const pendingRegs = registrationService.listRegistrations('pending');
    const db = loadDatabase();
    const approvedNonAdmins = db.users.filter((u) => u.role !== 'admin').length;
    return {
      activeCoupons,
      pendingCount: pendingRegs.length,
      approvedCount: approvedNonAdmins,
      recentPending: pendingRegs.slice(0, 5),
    };
  }, [refreshTick]);

  const handleQuickGenerate = (role: 'teacher' | 'student') => {
    const generated = couponService.generateCoupon(role);
    setLatestCoupon(generated);
    setCopied(false);
    setRefreshTick((n) => n + 1);
  };

  const handleCopyLatest = async () => {
    if (!latestCoupon) return;
    try {
      await navigator.clipboard.writeText(latestCoupon.code);
    } catch {
      // Clipboard fallback in headless environments
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  return (
    <DashboardShell title={t.admin.dashboardTitle}>
      <div className="space-y-6">
        <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 transition-colors">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            {t.admin.dashboardTitle}
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            {t.admin.dashboardSubtitle}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                {t.admin.statActiveCoupons}
              </p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1 tabular-nums">
                {formatDigits(stats.activeCoupons, language)}
              </p>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                {t.admin.statPendingRegistrations}
              </p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1 tabular-nums">
                {formatDigits(stats.pendingCount, language)}
              </p>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                {t.admin.statApprovedUsers}
              </p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1 tabular-nums">
                {formatDigits(stats.approvedCount, language)}
              </p>
            </div>
          </div>

          <div className="mt-6 pt-5 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => handleQuickGenerate('teacher')}
              className="inline-flex items-center gap-2 px-4 py-2.5 min-h-[44px] bg-emerald-700 hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white text-sm font-semibold rounded-lg transition-colors whitespace-nowrap"
            >
              <Plus className="w-4 h-4" aria-hidden="true" />
              <span>{t.admin.coupons.generateTeacher}</span>
            </button>
            <button
              type="button"
              onClick={() => handleQuickGenerate('student')}
              className="inline-flex items-center gap-2 px-4 py-2.5 min-h-[44px] bg-slate-900 dark:bg-slate-700 hover:bg-slate-800 dark:hover:bg-slate-600 text-white text-sm font-semibold rounded-lg transition-colors whitespace-nowrap"
            >
              <Plus className="w-4 h-4" aria-hidden="true" />
              <span>{t.admin.coupons.generateStudent}</span>
            </button>
            <Link
              to="/admin/coupons"
              className="inline-flex items-center gap-2 px-4 py-2.5 min-h-[44px] bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-slate-100 text-sm font-semibold rounded-lg transition-colors whitespace-nowrap"
            >
              <Ticket className="w-4 h-4" aria-hidden="true" />
              <span>{t.admin.goToCoupons}</span>
            </Link>
            <Link
              to="/admin/registrations"
              className="inline-flex items-center gap-2 px-4 py-2.5 min-h-[44px] bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-slate-100 text-sm font-semibold rounded-lg transition-colors whitespace-nowrap"
            >
              <UserCheck className="w-4 h-4" aria-hidden="true" />
              <span>{t.admin.goToRegistrations}</span>
            </Link>
          </div>

          {latestCoupon && (
            <div
              role="status"
              className="mt-4 flex flex-wrap items-center justify-between gap-3 px-4 py-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-sm"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-emerald-900 dark:text-emerald-200">
                  {t.admin.quickCouponGenerated}
                </span>
                <span className="font-mono font-bold text-emerald-950 dark:text-white">
                  {latestCoupon.code}
                </span>
                <span aria-hidden="true" className="text-emerald-600 dark:text-emerald-400">
                  ·
                </span>
                <span className="text-xs text-emerald-800 dark:text-emerald-300">
                  {latestCoupon.role === 'teacher'
                    ? t.admin.coupons.typeTeacher
                    : t.admin.coupons.typeStudent}
                </span>
              </div>
              <button
                type="button"
                onClick={handleCopyLatest}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[36px] bg-white dark:bg-slate-900 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-200 text-xs font-semibold rounded-lg transition-colors"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>{t.common.copied}</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>{t.common.copy}</span>
                  </>
                )}
              </button>
            </div>
          )}
        </section>

        <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 transition-colors">
          <div className="flex items-center justify-between gap-4 mb-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              {t.admin.recentPendingTitle}
            </h3>
            <Link
              to="/admin/registrations"
              className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300"
            >
              <span>{t.admin.viewAllRegistrations}</span>
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </Link>
          </div>

          {stats.recentPending.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400 py-4">
              {t.admin.registrations.emptyPending}
            </p>
          ) : (
            <div className="divide-y divide-slate-200 dark:divide-slate-800">
              {stats.recentPending.map((reg) => (
                <div
                  key={reg.id}
                  className="py-3.5 flex items-center justify-between gap-4 text-sm"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                      {reg.fullName}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {reg.role === 'teacher' ? t.common.roleTeacher : t.common.roleStudent}
                      <span aria-hidden="true"> · </span>
                      <span className="font-mono">{reg.couponCode}</span>
                      <span aria-hidden="true"> · </span>
                      <span>
                        {new Date(reg.submittedAt).toLocaleString(
                          language === 'bn' ? 'bn-BD' : 'en-US',
                          { dateStyle: 'medium', timeStyle: 'short' }
                        )}
                      </span>
                    </p>
                  </div>
                  <Link
                    to={`/admin/registrations?id=${encodeURIComponent(reg.id)}`}
                    className="px-3 py-2 min-h-[40px] inline-flex items-center text-xs font-semibold text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 rounded-lg whitespace-nowrap shrink-0"
                  >
                    {t.admin.registrations.openButton}
                  </Link>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </DashboardShell>
  );
}
