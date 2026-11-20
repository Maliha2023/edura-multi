import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertCircle, ArrowLeft, ArrowRight, Ticket } from 'lucide-react';
import { PublicShell } from '../components/PublicShell';
import { useI18n } from '../i18n';
import { couponService } from '../services/couponService';
import { normalizeCouponCode } from '../utils/validation';

export function CouponEntryPage() {
  const { t } = useI18n();
  const navigate = useNavigate();

  const [code, setCode] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const normalized = normalizeCouponCode(code);
    const result = couponService.validateCoupon(normalized);

    if (!result.valid) {
      setErrorMsg(t.coupon.error[result.error]);
      return;
    }

    navigate(`/onboarding?code=${encodeURIComponent(result.coupon.code)}`, {
      state: { couponCode: result.coupon.code, role: result.role },
    });
  };

  return (
    <PublicShell>
      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 py-8">
        <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 transition-colors">
          <div className="flex items-start gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-200 dark:border-emerald-800/80 flex items-center justify-center shrink-0">
              <Ticket className="w-5 h-5 text-emerald-700 dark:text-emerald-400" aria-hidden="true" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white">{t.coupon.title}</h1>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{t.coupon.subtitle}</p>
            </div>
          </div>

          {errorMsg && (
            <div
              role="alert"
              className="mb-5 flex items-start gap-3 p-4 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-red-900 dark:text-red-200 text-sm"
            >
              <AlertCircle className="w-5 h-5 text-red-700 dark:text-red-400 shrink-0 mt-0.5" aria-hidden="true" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            <div>
              <label
                htmlFor="coupon-code"
                className="block text-sm font-medium text-slate-800 dark:text-slate-200 mb-1.5"
              >
                {t.coupon.inputLabel}
              </label>
              <input
                id="coupon-code"
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder={t.coupon.inputPlaceholder}
                autoComplete="off"
                spellCheck={false}
                className="w-full px-3.5 py-2.5 min-h-[48px] bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-base font-mono tracking-wider uppercase text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600"
              />
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">{t.coupon.formatHint}</p>
            </div>

            <button
              type="submit"
              className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 min-h-[48px] bg-emerald-700 hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white text-sm font-semibold rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2"
            >
              <span>{t.coupon.verifyButton}</span>
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-slate-200 dark:border-slate-800">
            <Link
              to="/login"
              className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white py-1"
            >
              <ArrowLeft className="w-4 h-4" aria-hidden="true" />
              <span>{t.coupon.backToLogin}</span>
            </Link>
          </div>
        </div>
      </div>
    </PublicShell>
  );
}
