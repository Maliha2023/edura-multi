import React, { useState } from 'react';
import { AlertCircle, CheckCircle2, KeyRound, LogOut, UserCheck } from 'lucide-react';
import {
  formatAssignedClassesSummary,
  getTeacherPathwayLabel,
  teacherService,
  type TeacherProfileContext,
} from '../../services/teacherService';
import { useDashboardLanguage } from '../../i18n/useDashboardLanguage';

interface TeacherProfileTabProps {
  teacher: TeacherProfileContext;
  onSignOut: () => void;
}

export function TeacherProfileTab({ teacher, onSignOut }: TeacherProfileTabProps) {
  const { dt, td, formatDigits, formatDate } = useDashboardLanguage();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const pathwayLabel = td(getTeacherPathwayLabel(teacher.pathway));
  const classesLabel = formatDigits(formatAssignedClassesSummary(teacher.assignedClasses));
  const joinedLabel = formatDate(teacher.joinedAt, {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const res = teacherService.updateTeacherPassword(
      teacher.userId,
      teacher.email,
      currentPassword,
      newPassword,
      confirmPassword
    );
    if (!res.ok) {
      setErrorMsg(td(res.error));
      return;
    }

    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setSuccessMsg(
      dt(
        'Your faculty account password has been updated.',
        'আপনার শিক্ষক অ্যাকাউন্টের পাসওয়ার্ড সফলভাবে হালনাগাদ হয়েছে।'
      )
    );
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Faculty Academic Profile Card */}
      <section className="lg:col-span-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-5">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800 flex items-center justify-center shrink-0">
            <UserCheck className="w-6 h-6 text-teal-700 dark:text-teal-400" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white truncate">
              {teacher.fullName}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
              {teacher.email}
            </p>
          </div>
        </div>

        <dl className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
          <div className="py-3 flex items-center justify-between gap-4">
            <dt className="text-slate-500 dark:text-slate-400">
              {dt('Curriculum Pathway', 'পাঠ্যক্রম ধারা')}
            </dt>
            <dd className="font-semibold text-teal-700 dark:text-teal-400">{pathwayLabel}</dd>
          </div>
          <div className="py-3 flex items-center justify-between gap-4">
            <dt className="text-slate-500 dark:text-slate-400">
              {dt('Primary Subject', 'প্রধান বিষয়')}
            </dt>
            <dd className="font-semibold text-slate-900 dark:text-white">
              {td(teacher.primarySubject)}
            </dd>
          </div>
          <div className="py-3 flex items-center justify-between gap-4">
            <dt className="text-slate-500 dark:text-slate-400">
              {dt('Assigned Classes', 'নির্ধারিত শ্রেণিসমূহ')}
            </dt>
            <dd className="font-semibold text-slate-900 dark:text-white tabular-nums">
              {classesLabel}
            </dd>
          </div>
          {teacher.academicGroup && (
            <div className="py-3 flex items-center justify-between gap-4">
              <dt className="text-slate-500 dark:text-slate-400">
                {dt('Academic Group', 'একাডেমিক বিভাগ')}
              </dt>
              <dd className="font-semibold text-slate-900 dark:text-white">
                {td(teacher.academicGroup)}
              </dd>
            </div>
          )}
          <div className="py-3 flex items-center justify-between gap-4">
            <dt className="text-slate-500 dark:text-slate-400">
              {dt('Enrollment Source', 'নিবন্ধনের উৎস')}
            </dt>
            <dd className="font-medium text-slate-800 dark:text-slate-200">
              {teacher.registrationType === 'coupon_auto'
                ? dt('Auto Coupon', 'অটো কুপন')
                : dt('Admin Manual', 'অ্যাডমিন ম্যানুয়াল')}
            </dd>
          </div>
          <div className="py-3 flex items-center justify-between gap-4">
            <dt className="text-slate-500 dark:text-slate-400">
              {dt('Member Since', 'সদস্যপদ থেকে')}
            </dt>
            <dd className="font-medium text-slate-800 dark:text-slate-200">{joinedLabel}</dd>
          </div>
        </dl>

        <div className="pt-2">
          <button
            type="button"
            onClick={onSignOut}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 min-h-[44px] bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/50 text-slate-800 dark:text-slate-100 hover:text-rose-700 dark:hover:text-rose-300 border border-slate-200 dark:border-slate-700 text-sm font-semibold rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" aria-hidden="true" />
            <span>{dt('Sign Out to Stream Selection', 'সাইন আউট করে ধারা নির্বাচনে ফিরুন')}</span>
          </button>
        </div>
      </section>

      {/* Update Password Card */}
      <section className="lg:col-span-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
            <KeyRound className="w-5 h-5 text-slate-700 dark:text-slate-300" aria-hidden="true" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              {dt('Update Account Password', 'অ্যাকাউন্টের পাসওয়ার্ড হালনাগাদ করুন')}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {dt(
                'Keep your {pathway} teacher credentials secure.',
                'আপনার {pathway} শিক্ষকের অ্যাকাউন্টের নিরাপত্তা নিশ্চিত করুন।',
                { pathway: pathwayLabel }
              )}
            </p>
          </div>
        </div>

        {errorMsg && (
          <div
            role="alert"
            className="flex items-start gap-2.5 p-3.5 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-red-900 dark:text-red-200 text-sm"
          >
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-700 dark:text-red-400" aria-hidden="true" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div
            role="status"
            className="flex items-start gap-2.5 p-3.5 rounded-xl bg-teal-50 dark:bg-teal-950/50 border border-teal-200 dark:border-teal-800 text-teal-900 dark:text-teal-200 text-sm"
          >
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-teal-700 dark:text-teal-400" aria-hidden="true" />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handlePasswordSubmit} className="space-y-4" noValidate>
          <div>
            <label
              htmlFor="teacher-current-password"
              className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
            >
              {dt('Current Password', 'বর্তমান পাসওয়ার্ড')}
            </label>
            <input
              id="teacher-current-password"
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder={dt('Enter current password', 'বর্তমান পাসওয়ার্ড লিখুন')}
              className="w-full px-3.5 py-2.5 min-h-[44px] bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-600"
            />
          </div>

          <div>
            <label
              htmlFor="teacher-new-password"
              className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
            >
              {dt('New Password', 'নতুন পাসওয়ার্ড')}
            </label>
            <input
              id="teacher-new-password"
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder={dt('Minimum 8 characters', 'ন্যূনতম ৮ অক্ষর')}
              className="w-full px-3.5 py-2.5 min-h-[44px] bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-600"
            />
          </div>

          <div>
            <label
              htmlFor="teacher-confirm-password"
              className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
            >
              {dt('Confirm New Password', 'নতুন পাসওয়ার্ড নিশ্চিত করুন')}
            </label>
            <input
              id="teacher-confirm-password"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder={dt('Re-enter new password', 'নতুন পাসওয়ার্ডটি আবার লিখুন')}
              className="w-full px-3.5 py-2.5 min-h-[44px] bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-600"
            />
          </div>

          <button
            type="submit"
            className="w-full inline-flex items-center justify-center px-5 py-3 min-h-[46px] bg-teal-700 hover:bg-teal-800 dark:bg-teal-600 dark:hover:bg-teal-500 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            {dt('Update Password', 'পাসওয়ার্ড হালনাগাদ করুন')}
          </button>
        </form>
      </section>
    </div>
  );
}
