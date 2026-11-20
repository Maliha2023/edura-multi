import React, { useState } from 'react';
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Eye,
  EyeOff,
  Laptop,
  LogOut,
  Monitor,
  ShieldCheck,
  Smartphone,
  Tablet,
} from 'lucide-react';
import { DashboardShell } from '../components/DashboardShell';
import { useAuth } from '../context/AuthContext';
import { formatMessage, useI18n } from '../i18n';
import { authService } from '../services/authService';
import type { DeviceSession } from '../types/domain';
import { evaluatePasswordStrength, validatePasswordConfirmation } from '../utils/validation';

type SettingsSubTab = 'security_password' | 'device_management';

function resolvePasswordError(key: string, t: ReturnType<typeof useI18n>['t']): string {
  if (key === 'changePassword.identifierRequired') return t.changePassword.identifierRequired;
  if (key === 'changePassword.invalidOtp') return t.changePassword.invalidOtp;
  if (key === 'changePassword.accountNotFound') return t.changePassword.accountNotFound;
  if (key === 'changePassword.wrongAccountIdentifier') return t.changePassword.wrongAccountIdentifier;
  if (key === 'validation.passwordMinLength') return t.validation.passwordMinLength;
  if (key === 'validation.passwordMismatch') return t.validation.passwordMismatch;
  return key;
}

export function AdminSettingsPage() {
  const { session, refreshSession } = useAuth();
  const { language, t } = useI18n();

  const [activeTab, setActiveTab] = useState<SettingsSubTab>('security_password');

  // Change Password form state
  const [identifier, setIdentifier] = useState(session?.email ?? '');
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordUpdated, setPasswordUpdated] = useState(false);

  // Device Management state
  const [devices, setDevices] = useState<DeviceSession[]>(() =>
    session ? authService.listDeviceSessions(session.userId) : []
  );
  const [deviceNotice, setDeviceNotice] = useState<string | null>(null);

  if (!session) return null;

  const strength = evaluatePasswordStrength(newPassword);
  const strengthLabel =
    strength.level === 'strong'
      ? t.changePassword.strengthStrong
      : strength.level === 'good'
        ? t.changePassword.strengthGood
        : strength.level === 'fair'
          ? t.changePassword.strengthFair
          : t.changePassword.strengthWeak;

  const strengthBarColor =
    strength.level === 'strong'
      ? 'bg-emerald-600'
      : strength.level === 'good'
        ? 'bg-emerald-500'
        : strength.level === 'fair'
          ? 'bg-amber-500'
          : 'bg-red-500';

  const handleSendOtp = (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    const res = authService.requestPasswordOtp(identifier);
    if (!res.ok) {
      setPasswordError(resolvePasswordError(res.errorKey, t));
      return;
    }
    setOtpSent(true);
  };

  const handleUpdatePassword = (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);

    const confirmCheck = validatePasswordConfirmation(newPassword, confirmPassword);
    if (!confirmCheck.valid) {
      setPasswordError(resolvePasswordError(confirmCheck.errorKey, t));
      return;
    }

    const res = authService.verifyOtpAndChangePassword(
      identifier,
      otp,
      newPassword,
      Date.now(),
      session.userId
    );
    if (!res.ok) {
      setPasswordError(resolvePasswordError(res.errorKey, t));
      return;
    }

    refreshSession();
    setPasswordUpdated(true);
  };

  const resetPasswordFlow = () => {
    setOtpSent(false);
    setOtp('');
    setNewPassword('');
    setConfirmPassword('');
    setPasswordError(null);
    setPasswordUpdated(false);
  };

  const handleRevokeDevice = (deviceId: string) => {
    const updated = authService.revokeDeviceSession(session.userId, deviceId);
    setDevices(updated);
    setDeviceNotice(t.admin.settings.deviceLoggedOutNotice);
  };

  const handleRevokeAllOtherDevices = () => {
    const updated = authService.revokeOtherDeviceSessions(session.userId);
    setDevices(updated);
    setDeviceNotice(t.admin.settings.allOtherDevicesLoggedOutNotice);
  };

  const otherDevicesCount = devices.filter((d) => !d.isCurrent).length;

  const renderDeviceIcon = (deviceType: DeviceSession['deviceType']) => {
    if (deviceType === 'mobile') {
      return <Smartphone className="w-5 h-5" aria-hidden="true" />;
    }
    if (deviceType === 'tablet') {
      return <Tablet className="w-5 h-5" aria-hidden="true" />;
    }
    return <Laptop className="w-5 h-5" aria-hidden="true" />;
  };

  return (
    <DashboardShell title={t.admin.settings.title}>
      <div className="space-y-6">
        <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 transition-colors">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            {t.admin.settings.title}
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            {t.admin.settings.subtitle}
          </p>

          {/* Two Sub-Tabs inside Settings: Security & Password and Device Management */}
          <div
            role="tablist"
            aria-label={t.admin.settings.title}
            className="mt-6 flex flex-wrap items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-4"
          >
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'security_password'}
              onClick={() => setActiveTab('security_password')}
              className={`inline-flex items-center gap-2 px-4 py-2.5 min-h-[44px] rounded-xl text-sm font-semibold transition-colors whitespace-nowrap ${
                activeTab === 'security_password'
                  ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-transparent'
              }`}
            >
              <ShieldCheck className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>{t.admin.settings.tabs.securityAndPassword}</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'device_management'}
              onClick={() => {
                setActiveTab('device_management');
                setDevices(authService.listDeviceSessions(session.userId));
              }}
              className={`inline-flex items-center gap-2 px-4 py-2.5 min-h-[44px] rounded-xl text-sm font-semibold transition-colors whitespace-nowrap ${
                activeTab === 'device_management'
                  ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-transparent'
              }`}
            >
              <Monitor className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>{t.admin.settings.securitySubTabs.deviceManagement}</span>
            </button>
          </div>

          {activeTab === 'security_password' ? (
            <div className="mt-6">
              <div className="max-w-xl rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 p-5 sm:p-6">
                  <div className="mb-5">
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      {t.admin.settings.changePasswordCardTitle}
                    </h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                      {t.admin.settings.changePasswordCardDesc}
                    </p>
                  </div>

                  {passwordError && (
                    <div
                      role="alert"
                      className="mb-5 flex items-start gap-3 p-4 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-red-900 dark:text-red-200 text-sm"
                    >
                      <AlertCircle
                        className="w-5 h-5 text-red-700 dark:text-red-400 shrink-0 mt-0.5"
                        aria-hidden="true"
                      />
                      <span>{passwordError}</span>
                    </div>
                  )}

                  {passwordUpdated ? (
                    <div className="space-y-4">
                      <div
                        role="status"
                        className="flex items-start gap-3 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200"
                      >
                        <CheckCircle2
                          className="w-5 h-5 text-emerald-700 dark:text-emerald-400 shrink-0 mt-0.5"
                          aria-hidden="true"
                        />
                        <div>
                          <p className="text-sm font-semibold">{t.changePassword.successTitle}</p>
                          <p className="text-sm mt-1">{t.changePassword.successLoggedIn}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={resetPasswordFlow}
                        className="inline-flex items-center justify-center px-4 py-2.5 min-h-[44px] bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 text-sm font-semibold rounded-lg transition-colors"
                      >
                        {t.admin.settings.changeAnotherButton}
                      </button>
                    </div>
                  ) : !otpSent ? (
                    <form onSubmit={handleSendOtp} className="space-y-4" noValidate>
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                        {t.changePassword.step1Title}
                      </p>
                      <div>
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                          <label
                            htmlFor="settings-cp-identifier"
                            className="block text-sm font-medium text-slate-700 dark:text-slate-300"
                          >
                            {t.changePassword.identifierLabel}
                          </label>
                          {session.phone && (
                            <div className="inline-flex items-center gap-1 p-0.5 bg-slate-100 dark:bg-slate-800 rounded-md text-xs">
                              <button
                                type="button"
                                onClick={() => setIdentifier(session.email)}
                                className={`px-2.5 py-1 rounded font-medium transition-colors ${
                                  identifier === session.email
                                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                                }`}
                              >
                                {t.changePassword.useEmailOption}
                              </button>
                              <button
                                type="button"
                                onClick={() => setIdentifier(session.phone ?? '')}
                                className={`px-2.5 py-1 rounded font-medium transition-colors ${
                                  identifier === session.phone
                                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                                }`}
                              >
                                {t.changePassword.usePhoneOption}
                              </button>
                            </div>
                          )}
                        </div>
                        <input
                          id="settings-cp-identifier"
                          type="text"
                          value={identifier}
                          onChange={(e) => setIdentifier(e.target.value)}
                          placeholder={t.changePassword.identifierPlaceholder}
                          className="w-full px-3.5 py-2.5 min-h-[44px] bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                        />
                      </div>

                      <button
                        type="submit"
                        className="inline-flex items-center justify-center px-5 py-2.5 min-h-[44px] bg-emerald-700 hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white text-sm font-semibold rounded-lg transition-colors"
                      >
                        {t.changePassword.sendOtpButton}
                      </button>
                    </form>
                  ) : (
                    <form onSubmit={handleUpdatePassword} className="space-y-4" noValidate>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                          {t.changePassword.step2Title}
                        </p>
                        <span className="text-xs font-mono text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 px-2.5 py-1 rounded-md">
                          {t.changePassword.otpDemoNote}
                        </span>
                      </div>

                      <div>
                        <label
                          htmlFor="settings-cp-otp"
                          className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5"
                        >
                          {t.changePassword.otpLabel}
                        </label>
                        <input
                          id="settings-cp-otp"
                          type="text"
                          inputMode="numeric"
                          maxLength={6}
                          value={otp}
                          onChange={(e) => setOtp(e.target.value)}
                          placeholder={t.changePassword.otpPlaceholder}
                          className="w-full px-3.5 py-2.5 min-h-[44px] bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-sm font-mono tracking-widest text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="settings-cp-new-password"
                          className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5"
                        >
                          {t.changePassword.newPasswordLabel}
                        </label>
                        <div className="relative">
                          <input
                            id="settings-cp-new-password"
                            type={showNew ? 'text' : 'password'}
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder={t.changePassword.newPasswordPlaceholder}
                            className="w-full pl-3.5 pr-12 py-2.5 min-h-[44px] bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                          />
                          <button
                            type="button"
                            onClick={() => setShowNew((prev) => !prev)}
                            aria-label={showNew ? t.common.hidePassword : t.common.showPassword}
                            className="absolute right-1 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                          >
                            {showNew ? (
                              <EyeOff className="w-4 h-4" aria-hidden="true" />
                            ) : (
                              <Eye className="w-4 h-4" aria-hidden="true" />
                            )}
                          </button>
                        </div>

                        <div className="mt-3 space-y-2">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-600 dark:text-slate-400">
                              {t.changePassword.strengthLabel}
                            </span>
                            <span className="font-semibold text-slate-800 dark:text-slate-200">
                              {strengthLabel}
                            </span>
                          </div>
                          <div className="grid grid-cols-4 gap-1.5" aria-hidden="true">
                            {[1, 2, 3, 4].map((idx) => (
                              <div
                                key={idx}
                                className={`h-1.5 rounded-full transition-colors ${
                                  strength.score >= idx
                                    ? strengthBarColor
                                    : 'bg-slate-200 dark:bg-slate-800'
                                }`}
                              />
                            ))}
                          </div>
                          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1 text-xs text-slate-600 dark:text-slate-400">
                            {[
                              { met: strength.hasMinLength, label: t.changePassword.ruleMinLength },
                              { met: strength.hasUpperAndLower, label: t.changePassword.ruleCase },
                              { met: strength.hasNumber, label: t.changePassword.ruleNumber },
                              { met: strength.hasSymbol, label: t.changePassword.ruleSymbol },
                            ].map((rule) => (
                              <li
                                key={rule.label}
                                className={`flex items-center gap-1.5 ${
                                  rule.met
                                    ? 'text-emerald-700 dark:text-emerald-400 font-medium'
                                    : 'text-slate-500 dark:text-slate-400'
                                }`}
                              >
                                <Check
                                  className={`w-3.5 h-3.5 shrink-0 ${
                                    rule.met
                                      ? 'text-emerald-600 dark:text-emerald-400'
                                      : 'text-slate-300 dark:text-slate-600'
                                  }`}
                                  aria-hidden="true"
                                />
                                <span>{rule.label}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      <div>
                        <label
                          htmlFor="settings-cp-confirm-password"
                          className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5"
                        >
                          {t.changePassword.confirmPasswordLabel}
                        </label>
                        <div className="relative">
                          <input
                            id="settings-cp-confirm-password"
                            type={showConfirm ? 'text' : 'password'}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder={t.changePassword.confirmPasswordPlaceholder}
                            className="w-full pl-3.5 pr-12 py-2.5 min-h-[44px] bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirm((prev) => !prev)}
                            aria-label={showConfirm ? t.common.hidePassword : t.common.showPassword}
                            className="absolute right-1 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                          >
                            {showConfirm ? (
                              <EyeOff className="w-4 h-4" aria-hidden="true" />
                            ) : (
                              <Eye className="w-4 h-4" aria-hidden="true" />
                            )}
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            setOtpSent(false);
                            setPasswordError(null);
                          }}
                          className="px-4 py-2.5 min-h-[44px] bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 text-sm font-medium rounded-lg transition-colors"
                        >
                          {t.common.back}
                        </button>
                        <button
                          type="submit"
                          className="flex-1 inline-flex items-center justify-center px-5 py-2.5 min-h-[44px] bg-emerald-700 hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white text-sm font-semibold rounded-lg transition-colors"
                        >
                          {t.changePassword.updateButton}
                        </button>
                      </div>
                    </form>
                  )}
              </div>
            </div>
          ) : (
            <div className="mt-6 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <h3 className="text-base font-bold text-slate-900 dark:text-white">
                        {t.admin.settings.deviceManagementTitle}
                      </h3>
                      <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                        {t.admin.settings.deviceManagementDesc}
                      </p>
                    </div>
                    {otherDevicesCount > 0 && (
                      <button
                        type="button"
                        onClick={handleRevokeAllOtherDevices}
                        className="inline-flex items-center gap-2 px-4 py-2.5 min-h-[44px] rounded-xl bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 text-sm font-semibold transition-colors whitespace-nowrap"
                      >
                        <LogOut className="w-4 h-4 shrink-0" aria-hidden="true" />
                        <span>{t.admin.settings.logoutAllOtherDevices}</span>
                      </button>
                    )}
                  </div>

                  {deviceNotice && (
                    <div
                      role="status"
                      className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 text-sm"
                    >
                      <CheckCircle2
                        className="w-4 h-4 text-emerald-700 dark:text-emerald-400 shrink-0"
                        aria-hidden="true"
                      />
                      <span>{deviceNotice}</span>
                    </div>
                  )}

                  <div className="divide-y divide-slate-200 dark:divide-slate-800 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 overflow-hidden">
                    {devices.map((device) => (
                      <div
                        key={device.id}
                        className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                      >
                        <div className="flex items-start gap-3.5 min-w-0">
                          <div
                            className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${
                              device.isCurrent
                                ? 'bg-emerald-100/90 dark:bg-emerald-900/60 border-emerald-200 dark:border-emerald-700/70 text-emerald-700 dark:text-emerald-300'
                                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                            }`}
                          >
                            {renderDeviceIcon(device.deviceType)}
                          </div>
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-sm font-semibold text-slate-900 dark:text-white">
                                {device.deviceName}
                              </p>
                              {device.isCurrent && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-700/70">
                                  {t.admin.settings.currentDeviceBadge}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                              {device.browser}
                              <span aria-hidden="true"> · </span>
                              {device.location}
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                              {device.isCurrent
                                ? t.admin.settings.activeNow
                                : formatMessage(t.admin.settings.lastActive, {
                                    time: new Date(device.lastActiveAt).toLocaleString(
                                      language === 'bn' ? 'bn-BD' : 'en-US',
                                      { dateStyle: 'medium', timeStyle: 'short' }
                                    ),
                                  })}
                            </p>
                          </div>
                        </div>

                        {!device.isCurrent && (
                          <button
                            type="button"
                            onClick={() => handleRevokeDevice(device.id)}
                            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 min-h-[40px] rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 hover:bg-rose-50 dark:hover:bg-rose-950/50 hover:text-rose-700 dark:hover:text-rose-300 border border-slate-200 dark:border-slate-700 transition-colors whitespace-nowrap shrink-0"
                          >
                            <LogOut className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                            <span>{t.admin.settings.logoutDevice}</span>
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  {otherDevicesCount === 0 && (
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {t.admin.settings.noOtherDevices}
                    </p>
                  )}
                </div>
          )}
        </section>
      </div>
    </DashboardShell>
  );
}
