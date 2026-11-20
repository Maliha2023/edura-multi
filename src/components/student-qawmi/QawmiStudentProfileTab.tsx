import React, { useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  KeyRound,
  LogOut,
  ShieldCheck,
  UserCircle2,
} from 'lucide-react';
import {
  getQawmiBoardName,
  getQawmiPathwayLabel,
  qawmiStudentService,
  type QawmiStudentContext,
} from '../../services/qawmiStudentService';
import { useDashboardLanguage } from '../../i18n/useDashboardLanguage';

interface QawmiStudentProfileTabProps {
  student: QawmiStudentContext;
  onLogout: () => void;
}

export function QawmiStudentProfileTab({ student, onLogout }: QawmiStudentProfileTabProps) {
  const { dt, td, formatDate } = useDashboardLanguage();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const joinedDate = formatDate(student.joinedAt, {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  const handlePasswordUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const res = qawmiStudentService.updateQawmiStudentPassword(
      student.email,
      currentPassword,
      newPassword,
      confirmPassword
    );
    if (!res.ok) {
      setErrorMsg(res.error);
      return;
    }

    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setSuccessMsg(
      dt(
        'Your Qawmi Madrasa student account password has been updated.',
        'আপনার কওমি মাদ্রাসা শিক্ষার্থী অ্যাকাউন্টের পাসওয়ার্ড আপডেট করা হয়েছে।'
      )
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
          {td('Profile & Settings')}
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
          {dt(
            'View your Qawmi Madrasa academic placement, Marhala details, and update your portal password.',
            'আপনার কওমি মাদ্রাসা একাডেমিক অবস্থান, মারহালা তথ্য দেখুন এবং পোর্টাল পাসওয়ার্ড আপডেট করুন।'
          )}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Profile Summary Card */}
        <section className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-5">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-200 dark:border-slate-800">
            <div className="w-11 h-11 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 flex items-center justify-center">
              <UserCircle2 className="w-6 h-6" aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {dt('Talibul Ilm Academic Profile', 'তালিবুল ইলম একাডেমিক প্রোফাইল')}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">{td(getQawmiBoardName())}</p>
            </div>
          </div>

          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800">
              <dt className="text-xs text-slate-500 dark:text-slate-400">{td('Full Name')}</dt>
              <dd className="text-sm font-semibold text-slate-900 dark:text-white mt-1">
                {student.fullName}
              </dd>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800">
              <dt className="text-xs text-slate-500 dark:text-slate-400">
                {dt('Pathway', 'পাথওয়ে')}
              </dt>
              <dd className="text-sm font-semibold text-emerald-800 dark:text-emerald-300 mt-1">
                {td(getQawmiPathwayLabel())}
              </dd>
            </div>

            <div className="sm:col-span-2 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800">
              <dt className="text-xs text-slate-500 dark:text-slate-400">{td('Email Address')}</dt>
              <dd className="text-sm font-semibold text-slate-900 dark:text-white mt-1 break-words">
                {student.email}
              </dd>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800">
              <dt className="text-xs text-slate-500 dark:text-slate-400">
                {dt('Marhala / Stage', 'মারহালা / স্তর')}
              </dt>
              <dd className="text-sm font-semibold text-slate-900 dark:text-white mt-1">
                {td(student.marhala)}
              </dd>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800">
              <dt className="text-xs text-slate-500 dark:text-slate-400">{td('Focus Branch')}</dt>
              <dd className="text-sm font-semibold text-slate-900 dark:text-white mt-1">
                {td(student.focusBranch)}
              </dd>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800">
              <dt className="text-xs text-slate-500 dark:text-slate-400">
                {dt('Enrollment Source', 'নিবন্ধনের উৎস')}
              </dt>
              <dd className="text-sm font-semibold text-slate-900 dark:text-white mt-1">
                {student.registrationType === 'coupon_auto'
                  ? `${dt('Coupon Verified', 'কুপন যাচাইকৃত')}${student.couponCode ? ` (${student.couponCode})` : ''}`
                  : dt('Admin Enrolled', 'অ্যাডমিন কর্তৃক নিবন্ধিত')}
              </dd>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-3">
              <div>
                <dt className="text-xs text-slate-500 dark:text-slate-400">
                  {dt('Joined Date', 'যোগদানের তারিখ')}
                </dt>
                <dd className="text-sm font-semibold text-slate-900 dark:text-white mt-0.5">
                  {joinedDate}
                </dd>
              </div>
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400 shrink-0">
                <ShieldCheck className="w-4 h-4" aria-hidden="true" />
                {dt('Active Student', 'সক্রিয় শিক্ষার্থী')}
              </span>
            </div>
          </dl>

          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {dt(
                'Need to update your Marhala or Focus branch? Contact your Madrasa Nazim/Admin.',
                'মারহালা বা শাখা পরিবর্তন করতে চাইলে আপনার মাদ্রাসার নাযিম/অ্যাডমিনের সাথে যোগাযোগ করুন।'
              )}
            </p>
            <button
              type="button"
              onClick={onLogout}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-red-50 dark:hover:bg-red-950/50 text-slate-700 dark:text-slate-200 hover:text-red-700 dark:hover:text-red-300 border border-slate-200 dark:border-slate-700 text-xs font-semibold transition-colors shrink-0 whitespace-nowrap"
            >
              <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{td('Sign Out')}</span>
            </button>
          </div>
        </section>

        {/* Password Update Card */}
        <section className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-5">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-200 dark:border-slate-800">
            <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center justify-center">
              <KeyRound className="w-5 h-5" aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {td('Update Password')}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {dt(
                  'Keep your Qawmi student portal credentials secure',
                  'আপনার কওমি শিক্ষার্থী পোর্টালের লগইন তথ্য সুরক্ষিত রাখুন'
                )}
              </p>
            </div>
          </div>

          {errorMsg && (
            <div
              role="alert"
              className="flex items-start gap-2.5 p-3.5 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-xs sm:text-sm text-red-900 dark:text-red-200"
            >
              <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
              <span>{td(errorMsg)}</span>
            </div>
          )}

          {successMsg && (
            <div
              role="status"
              className="flex items-start gap-2.5 p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-xs sm:text-sm text-emerald-900 dark:text-emerald-200"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          <form onSubmit={handlePasswordUpdate} className="space-y-4">
            <div>
              <label
                htmlFor="qawmi-current-password"
                className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
              >
                {td('Current Password')}
              </label>
              <input
                id="qawmi-current-password"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder={dt('Enter current password', 'বর্তমান পাসওয়ার্ড লিখুন')}
                className="w-full px-3.5 py-2.5 min-h-[42px] bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>

            <div>
              <label
                htmlFor="qawmi-new-password"
                className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
              >
                {td('New Password')}
              </label>
              <input
                id="qawmi-new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder={dt('Minimum 8 characters', 'ন্যূনতম ৮ অক্ষর')}
                className="w-full px-3.5 py-2.5 min-h-[42px] bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>

            <div>
              <label
                htmlFor="qawmi-confirm-password"
                className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
              >
                {td('Confirm New Password')}
              </label>
              <input
                id="qawmi-confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder={dt('Re-enter new password', 'নতুন পাসওয়ার্ড পুনরায় লিখুন')}
                className="w-full px-3.5 py-2.5 min-h-[42px] bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>

            <button
              type="submit"
              className="w-full inline-flex items-center justify-center px-4 py-2.5 min-h-[44px] bg-emerald-700 hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white text-sm font-semibold rounded-xl transition-colors"
            >
              {dt('Save New Password', 'নতুন পাসওয়ার্ড সংরক্ষণ করুন')}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
