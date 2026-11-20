import React, { useState } from 'react';
import { AlertCircle, CheckCircle2, KeyRound, LogOut, ShieldCheck, UserCircle2 } from 'lucide-react';
import {
  aliaTeacherService,
  formatAssignedAliaMarhalasSummary,
  getAliaTeacherBoardName,
  getAliaTeacherPathwayLabel,
  type AliaTeacherContext,
} from '../../services/aliaTeacherService';

interface AliaTeacherProfileTabProps {
  teacher: AliaTeacherContext;
  onSignOut: () => void;
}

export function AliaTeacherProfileTab({ teacher, onSignOut }: AliaTeacherProfileTabProps) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const memberSince = new Date(teacher.joinedAt).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const res = aliaTeacherService.updateTeacherPassword(
      teacher.email,
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
    setSuccessMsg('Your Alia Madrasa teacher account password has been updated.');
  };

  const profileRows = [
    { label: 'Full Name', value: teacher.fullName },
    { label: 'Email Address', value: teacher.email },
    { label: 'Curriculum Pathway', value: getAliaTeacherPathwayLabel() },
    { label: 'Examination Board', value: getAliaTeacherBoardName() },
    { label: 'Primary Subject', value: teacher.primarySubject },
    {
      label: 'Assigned Marhalas',
      value: formatAssignedAliaMarhalasSummary(teacher.assignedMarhalas),
    },
    { label: 'Department / Stream', value: teacher.department },
    {
      label: 'Enrollment Source',
      value:
        teacher.registrationType === 'coupon_auto'
          ? `Teacher Coupon${teacher.couponCode ? ` (${teacher.couponCode})` : ''}`
          : 'Manual Admin Provisioning',
    },
    { label: 'Member Since', value: memberSince },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Faculty Profile Details */}
      <section className="lg:col-span-7 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 space-y-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800 text-teal-700 dark:text-teal-300 flex items-center justify-center">
              <UserCircle2 className="w-6 h-6" aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Faculty Profile &amp; Pathway Assignment
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Isolated Alia Madrasa educator credentials
              </p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-xs font-semibold text-emerald-800 dark:text-emerald-300">
            <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Active Faculty</span>
          </span>
        </div>

        <dl className="divide-y divide-slate-200/80 dark:divide-slate-800">
          {profileRows.map((row) => (
            <div
              key={row.label}
              className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-sm"
            >
              <dt className="text-xs font-medium text-slate-500 dark:text-slate-400">
                {row.label}
              </dt>
              <dd className="text-sm font-semibold text-slate-900 dark:text-white sm:text-right">
                {row.value}
              </dd>
            </div>
          ))}
        </dl>

        <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={onSignOut}
            className="inline-flex items-center gap-2 px-4 py-2.5 min-h-[42px] rounded-xl border border-rose-200 dark:border-rose-900/70 bg-rose-50/70 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-950/70 text-rose-700 dark:text-rose-300 text-xs font-semibold transition-colors"
          >
            <LogOut className="w-4 h-4" aria-hidden="true" />
            <span>Sign Out of Alia Teacher Portal</span>
          </button>
        </div>
      </section>

      {/* Security / Password Update */}
      <section className="lg:col-span-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800 text-teal-700 dark:text-teal-300 flex items-center justify-center">
            <KeyRound className="w-4 h-4" aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Update Password
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Minimum 8 characters required
            </p>
          </div>
        </div>

        {errorMsg && (
          <div
            role="alert"
            className="flex items-start gap-2.5 p-3 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-red-900 dark:text-red-200 text-xs"
          >
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div
            role="status"
            className="flex items-start gap-2.5 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 text-xs"
          >
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handlePasswordSubmit} className="space-y-3.5">
          <div>
            <label
              htmlFor="alia-profile-current-pw"
              className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
            >
              Current Password
            </label>
            <input
              id="alia-profile-current-pw"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Enter current password"
              className="w-full px-3.5 py-2.5 min-h-[42px] bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-600"
            />
          </div>

          <div>
            <label
              htmlFor="alia-profile-new-pw"
              className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
            >
              New Password
            </label>
            <input
              id="alia-profile-new-pw"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="At least 8 characters"
              className="w-full px-3.5 py-2.5 min-h-[42px] bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-600"
            />
          </div>

          <div>
            <label
              htmlFor="alia-profile-confirm-pw"
              className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
            >
              Confirm New Password
            </label>
            <input
              id="alia-profile-confirm-pw"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter new password"
              className="w-full px-3.5 py-2.5 min-h-[42px] bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-600"
            />
          </div>

          <button
            type="submit"
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 min-h-[42px] rounded-xl bg-teal-700 hover:bg-teal-800 dark:bg-teal-600 dark:hover:bg-teal-500 text-white text-sm font-semibold transition-colors"
          >
            <KeyRound className="w-4 h-4" aria-hidden="true" />
            <span>Update Password</span>
          </button>
        </form>
      </section>
    </div>
  );
}
