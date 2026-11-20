import React, { useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  KeyRound,
  Laptop,
  LogOut,
  Smartphone,
  Tablet,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { authService } from '../../services/authService';
import { qawmiAdminService } from '../../services/qawmiAdminService';
import type { DeviceSession } from '../../types/domain';
import {
  evaluatePasswordStrength,
  validatePassword,
  validatePasswordConfirmation,
} from '../../utils/validation';
import { useDashboardLanguage } from '../../i18n/useDashboardLanguage';

interface QawmiSettingsTabProps {
  onRequestLogout: () => void;
  onDataChanged?: () => void;
}

export function QawmiSettingsTab({
  onRequestLogout,
  onDataChanged,
}: QawmiSettingsTabProps) {
  const { session } = useAuth();
  const { dt, td } = useDashboardLanguage();
  const panelName = dt('Qawmi Madrasa Panel', 'কওমি মাদ্রাসা প্যানেল');

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwSuccess, setPwSuccess] = useState<string | null>(null);

  const [sessions, setSessions] = useState<DeviceSession[]>(() =>
    session ? authService.listDeviceSessions(session.userId) : []
  );
  const [deviceNotice, setDeviceNotice] = useState<string | null>(null);

  if (!session) return null;

  const strength = evaluatePasswordStrength(newPassword);

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPwError(null);
    setPwSuccess(null);

    if (!currentPassword.trim()) {
      setPwError(td('Please enter your current password.'));
      return;
    }
    const check = validatePassword(newPassword);
    if (!check.valid) {
      setPwError(td('New password must be at least 8 characters long.'));
      return;
    }
    const confirmCheck = validatePasswordConfirmation(newPassword, confirmPassword);
    if (!confirmCheck.valid) {
      setPwError(td('New password and confirmation do not match.'));
      return;
    }

    const res = qawmiAdminService.updateAdminPassword(
      session.userId,
      currentPassword,
      newPassword
    );
    if (!res.ok) {
      setPwError(td(res.error));
      return;
    }

    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setPwSuccess(
      dt('Password updated successfully for {email}.', '{email}-এর জন্য পাসওয়ার্ড সফলভাবে আপডেট হয়েছে।', {
        email: session.email,
      })
    );
    onDataChanged?.();
  };

  const handleRevokeSession = (deviceId: string) => {
    authService.revokeDeviceSession(session.userId, deviceId);
    setSessions(authService.listDeviceSessions(session.userId));
    setDeviceNotice(td('Selected device session has been signed out.'));
  };

  const handleRevokeOthers = () => {
    authService.revokeOtherDeviceSessions(session.userId);
    setSessions(authService.listDeviceSessions(session.userId));
    setDeviceNotice(td('All other device sessions have been signed out.'));
  };

  const otherSessionsCount = sessions.filter((s) => !s.isCurrent).length;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Security & Password */}
      <section className="lg:col-span-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-5">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center shrink-0">
            <KeyRound
              className="w-5 h-5 text-emerald-700 dark:text-emerald-400"
              aria-hidden="true"
            />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              {td('Security & Password')}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {dt(
                'Update login credentials for {panel} ({email})',
                '{panel} ({email})-এর লগইন তথ্য আপডেট করুন',
                { panel: panelName, email: session.email }
              )}
            </p>
          </div>
        </div>

        {pwSuccess && (
          <div
            role="status"
            className="flex items-start gap-2.5 p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 text-sm"
          >
            <CheckCircle2
              className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5"
              aria-hidden="true"
            />
            <span>{pwSuccess}</span>
          </div>
        )}

        {pwError && (
          <div
            role="alert"
            className="flex items-start gap-2.5 p-3.5 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-red-900 dark:text-red-200 text-sm"
          >
            <AlertCircle
              className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5"
              aria-hidden="true"
            />
            <span>{pwError}</span>
          </div>
        )}

        <form onSubmit={handlePasswordSubmit} className="space-y-4" noValidate>
          <div>
            <label
              htmlFor="qawmi-settings-cur-pw"
              className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
            >
              {td('Current Password')}
            </label>
            <input
              id="qawmi-settings-cur-pw"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder={td('Enter current password')}
              className="w-full px-3.5 py-2.5 min-h-[42px] bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-600"
            />
          </div>

          <div>
            <label
              htmlFor="qawmi-settings-new-pw"
              className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
            >
              {td('New Password')}
            </label>
            <input
              id="qawmi-settings-new-pw"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder={td('Minimum 8 characters')}
              className="w-full px-3.5 py-2.5 min-h-[42px] bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-600"
            />
            {newPassword.length > 0 && (
              <div className="mt-2 space-y-1.5">
                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                  <span>{td('Password strength')}</span>
                  <span className="font-semibold capitalize text-slate-800 dark:text-slate-200">
                    {td(strength.level)}
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-1.5" aria-hidden="true">
                  {[1, 2, 3, 4].map((idx) => (
                    <div
                      key={idx}
                      className={`h-1.5 rounded-full ${
                        strength.score >= idx
                          ? strength.level === 'strong' || strength.level === 'good'
                            ? 'bg-emerald-600'
                            : strength.level === 'fair'
                              ? 'bg-amber-500'
                              : 'bg-rose-500'
                          : 'bg-slate-200 dark:bg-slate-800'
                      }`}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          <div>
            <label
              htmlFor="qawmi-settings-confirm-pw"
              className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
            >
              {td('Confirm New Password')}
            </label>
            <input
              id="qawmi-settings-confirm-pw"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder={td('Re-enter new password')}
              className="w-full px-3.5 py-2.5 min-h-[42px] bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-600"
            />
          </div>

          <button
            type="submit"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 min-h-[44px] bg-emerald-700 hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            {td('Update Password')}
          </button>
        </form>
      </section>

      {/* Device Management */}
      <section className="lg:col-span-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              {td('Device Management')}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {dt('Active sessions signed into {panel}', '{panel}-এ সক্রিয় সেশনসমূহ', {
                panel: panelName,
              })}
            </p>
          </div>
          {otherSessionsCount > 0 && (
            <button
              type="button"
              onClick={handleRevokeOthers}
              className="px-3 py-1.5 min-h-[36px] text-xs font-semibold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 dark:hover:bg-rose-900/60 border border-rose-200 dark:border-rose-800 rounded-lg transition-colors whitespace-nowrap self-start sm:self-auto"
            >
              {td('Log Out Other Devices')}
            </button>
          )}
        </div>

        {deviceNotice && (
          <div
            role="status"
            className="px-3.5 py-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 text-xs"
          >
            {deviceNotice}
          </div>
        )}

        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {sessions.map((item) => {
            const DeviceIcon =
              item.deviceType === 'mobile'
                ? Smartphone
                : item.deviceType === 'tablet'
                  ? Tablet
                  : Laptop;
            return (
              <div
                key={item.id}
                className="py-3.5 first:pt-1 last:pb-1 flex items-center justify-between gap-3"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                    <DeviceIcon
                      className="w-4 h-4 text-slate-700 dark:text-slate-300"
                      aria-hidden="true"
                    />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                        {item.deviceName}
                      </p>
                      {item.isCurrent && (
                        <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                          {td('Current')}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {item.browser} · {item.location}
                    </p>
                  </div>
                </div>

                {item.isCurrent ? (
                  <button
                    type="button"
                    onClick={onRequestLogout}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[34px] text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/50 hover:text-rose-700 dark:hover:text-rose-300 rounded-lg transition-colors whitespace-nowrap shrink-0"
                  >
                    <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>{td('Log Out')}</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleRevokeSession(item.id)}
                    className="px-3 py-1.5 min-h-[34px] text-xs font-semibold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 dark:hover:bg-rose-900/60 border border-rose-200 dark:border-rose-800 rounded-lg transition-colors whitespace-nowrap shrink-0"
                  >
                    {td('Revoke')}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
