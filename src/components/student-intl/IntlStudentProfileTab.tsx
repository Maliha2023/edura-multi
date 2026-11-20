import React, { useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  LogOut,
  User,
} from 'lucide-react';
import {
  getIntlStudentPathwayLabel,
  internationalStudentService,
  type IntlStudentContext,
} from '../../services/internationalStudentService';
import { useDashboardLanguage } from '../../i18n/useDashboardLanguage';

interface IntlStudentProfileTabProps {
  student: IntlStudentContext;
  onSignOut: () => void;
}

export function IntlStudentProfileTab({ student, onSignOut }: IntlStudentProfileTabProps) {
  const { dt, td, formatDate } = useDashboardLanguage();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const pathwayLabel = td(getIntlStudentPathwayLabel(student.pathway));

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setStatus(null);

    const res = internationalStudentService.updateIntlStudentPassword(
      student.email,
      student.pathway,
      currentPassword,
      newPassword,
      confirmPassword
    );

    if (!res.ok) {
      setStatus({ type: 'error', text: td(res.error) });
      return;
    }

    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setStatus({
      type: 'success',
      text: td(
        'Your password has been updated. Use your new password next time you sign in.'
      ),
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Student Profile Card */}
      <section className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-5">
        <div className="flex items-center gap-3 pb-4 border-b border-slate-200 dark:border-slate-800">
          <div className="w-11 h-11 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center shrink-0">
            <User className="w-5 h-5 text-emerald-700 dark:text-emerald-400" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-bold text-slate-900 dark:text-white truncate">
              {student.fullName}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{student.email}</p>
          </div>
        </div>

        <dl className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
          <div className="py-3 flex items-center justify-between gap-4">
            <dt className="text-slate-500 dark:text-slate-400">{td('Pathway')}</dt>
            <dd className="font-semibold text-slate-900 dark:text-white">{pathwayLabel}</dd>
          </div>
          <div className="py-3 flex items-center justify-between gap-4">
            <dt className="text-slate-500 dark:text-slate-400">{td('Academic Level')}</dt>
            <dd className="font-semibold text-slate-900 dark:text-white text-right">
              {td(student.academicLevel)}
            </dd>
          </div>
          <div className="py-3 flex items-center justify-between gap-4">
            <dt className="text-slate-500 dark:text-slate-400">{td('Academic Track')}</dt>
            <dd className="font-semibold text-slate-900 dark:text-white">
              {td(student.academicTrack)}
            </dd>
          </div>
          <div className="py-3 flex items-center justify-between gap-4">
            <dt className="text-slate-500 dark:text-slate-400">{td('Enrollment Source')}</dt>
            <dd className="font-medium text-slate-700 dark:text-slate-300">
              {student.registrationType === 'coupon_auto'
                ? td('Coupon Registration')
                : td('Admin Enrolled')}
            </dd>
          </div>
          <div className="py-3 flex items-center justify-between gap-4">
            <dt className="text-slate-500 dark:text-slate-400">{td('Joined')}</dt>
            <dd className="font-medium text-slate-700 dark:text-slate-300 tabular-nums">
              {formatDate(student.joinedAt, { dateStyle: 'medium' })}
            </dd>
          </div>
        </dl>

        <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={onSignOut}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 min-h-[44px] bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/50 text-slate-800 dark:text-slate-100 hover:text-rose-700 dark:hover:text-rose-300 border border-slate-200 dark:border-slate-700 text-sm font-semibold rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>{td('Sign Out to Stream Selection')}</span>
          </button>
        </div>
      </section>

      {/* Password Update Card */}
      <section className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-5">
        <div className="flex items-center gap-3 pb-4 border-b border-slate-200 dark:border-slate-800">
          <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
            <KeyRound className="w-5 h-5 text-slate-700 dark:text-slate-300" aria-hidden="true" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              {td('Update Password')}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {dt(
                'Keep your {pathway} student account secure with a strong password (minimum 8 characters).',
                'একটি শক্তিশালী পাসওয়ার্ডের মাধ্যমে আপনার {pathway} শিক্ষার্থী অ্যাকাউন্ট সুরক্ষিত রাখুন (সর্বনিম্ন ৮ অক্ষর)।',
                { pathway: pathwayLabel }
              )}
            </p>
          </div>
        </div>

        {status && (
          <div
            role={status.type === 'error' ? 'alert' : 'status'}
            className={`flex items-start gap-2.5 p-3.5 rounded-xl border text-sm ${
              status.type === 'success'
                ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
                : 'bg-red-50 dark:bg-red-950/50 border-red-200 dark:border-red-800 text-red-900 dark:text-red-200'
            }`}
          >
            {status.type === 'success' ? (
              <CheckCircle2
                className="w-4 h-4 shrink-0 mt-0.5 text-emerald-700 dark:text-emerald-400"
                aria-hidden="true"
              />
            ) : (
              <AlertCircle
                className="w-4 h-4 shrink-0 mt-0.5 text-red-700 dark:text-red-400"
                aria-hidden="true"
              />
            )}
            <span>{status.text}</span>
          </div>
        )}

        <form onSubmit={handlePasswordSubmit} className="space-y-4" noValidate>
          <div>
            <label
              htmlFor="intl-student-current-password"
              className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
            >
              {td('Current Password')}
            </label>
            <div className="relative">
              <input
                id="intl-student-current-password"
                type={showCurrent ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder={td('Enter current password')}
                className="w-full pl-3.5 pr-12 py-2.5 min-h-[44px] bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
              <button
                type="button"
                onClick={() => setShowCurrent((prev) => !prev)}
                aria-label={showCurrent ? td('Hide current password') : td('Show current password')}
                className="absolute right-1 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              >
                {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="intl-student-new-password"
                className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
              >
                {td('New Password')}
              </label>
              <div className="relative">
                <input
                  id="intl-student-new-password"
                  type={showNew ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder={td('Min. 8 characters')}
                  className="w-full pl-3.5 pr-12 py-2.5 min-h-[44px] bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
                <button
                  type="button"
                  onClick={() => setShowNew((prev) => !prev)}
                  aria-label={showNew ? td('Hide new password') : td('Show new password')}
                  className="absolute right-1 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                >
                  {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label
                htmlFor="intl-student-confirm-password"
                className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
              >
                {td('Confirm New Password')}
              </label>
              <input
                id="intl-student-confirm-password"
                type={showNew ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder={td('Re-enter new password')}
                className="w-full px-3.5 py-2.5 min-h-[44px] bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>
          </div>

          <div className="pt-1 flex justify-end">
            <button
              type="submit"
              className="px-5 py-2.5 min-h-[44px] bg-emerald-700 hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white text-sm font-semibold rounded-lg transition-colors whitespace-nowrap"
            >
              {td('Update Password')}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
