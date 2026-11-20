import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertCircle, Check, CheckCircle2, Eye, EyeOff, KeyRound, ShieldAlert } from 'lucide-react';
import { PublicShell } from '../components/PublicShell';
import { DashboardShell } from '../components/DashboardShell';
import { getDashboardPathForRole } from '../components/RouteGuards';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../i18n';
import { authService } from '../services/authService';
import { evaluatePasswordStrength, validatePasswordConfirmation } from '../utils/validation';

function resolveValidationMessage(key: string, t: ReturnType<typeof useI18n>['t']): string {
  if (key === 'changePassword.identifierRequired') return t.changePassword.identifierRequired;
  if (key === 'changePassword.invalidOtp') return t.changePassword.invalidOtp;
  if (key === 'changePassword.accountNotFound') return t.changePassword.accountNotFound;
  if (key === 'changePassword.wrongAccountIdentifier') return t.changePassword.wrongAccountIdentifier;
  if (key === 'validation.passwordMinLength') return t.validation.passwordMinLength;
  if (key === 'validation.passwordMismatch') return t.validation.passwordMismatch;
  return key;
}

export function ChangePasswordPage() {
  const { session, refreshSession } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();

  const [identifier, setIdentifier] = useState(session?.email ?? '');
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [completed, setCompleted] = useState(false);

  const isForcedAdmin = Boolean(session?.mustChangePassword);
  const isLoggedInNormal = Boolean(session && !session.mustChangePassword);

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
    setErrorMsg(null);
    const res = authService.requestPasswordOtp(identifier);
    if (!res.ok) {
      setErrorMsg(resolveValidationMessage(res.errorKey, t));
      return;
    }
    setOtpSent(true);
  };

  const handleUpdatePassword = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const confirmCheck = validatePasswordConfirmation(newPassword, confirmPassword);
    if (!confirmCheck.valid) {
      setErrorMsg(resolveValidationMessage(confirmCheck.errorKey, t));
      return;
    }

    const res = authService.verifyOtpAndChangePassword(
      identifier,
      otp,
      newPassword,
      Date.now(),
      session?.userId
    );
    if (!res.ok) {
      setErrorMsg(resolveValidationMessage(res.errorKey, t));
      return;
    }

    refreshSession();
    setCompleted(true);
  };

  const content = (
    <div className="w-full max-w-lg mx-auto py-4 sm:py-8">
      <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8">
        <div className="flex items-start gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center shrink-0">
            <KeyRound className="w-5 h-5 text-emerald-700" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">{t.changePassword.title}</h1>
            <p className="text-sm text-slate-600 mt-1">{t.changePassword.subtitle}</p>
          </div>
        </div>

        {isForcedAdmin && !completed && (
          <div
            role="alert"
            className="mb-6 flex items-start gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-sm"
          >
            <ShieldAlert className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" aria-hidden="true" />
            <span>{t.changePassword.forcedAdminNotice}</span>
          </div>
        )}

        {errorMsg && (
          <div
            role="alert"
            className="mb-5 flex items-start gap-3 p-4 rounded-xl bg-red-50 border border-red-200 text-red-900 text-sm"
          >
            <AlertCircle className="w-5 h-5 text-red-700 shrink-0 mt-0.5" aria-hidden="true" />
            <span>{errorMsg}</span>
          </div>
        )}

        {completed ? (
          <div className="space-y-5 py-2">
            <div className="flex items-start gap-3 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900">
              <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" aria-hidden="true" />
              <div>
                <p className="text-sm font-semibold">{t.changePassword.successTitle}</p>
                <p className="text-sm mt-1">
                  {session ? t.changePassword.successLoggedIn : t.changePassword.successLoggedOut}
                </p>
              </div>
            </div>

            {session ? (
              <button
                type="button"
                onClick={() => navigate(getDashboardPathForRole(session.role), { replace: true })}
                className="w-full inline-flex items-center justify-center px-5 py-3 min-h-[48px] bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-semibold rounded-lg transition-colors"
              >
                {t.changePassword.continueToDashboard}
              </button>
            ) : (
              <Link
                to="/login"
                className="w-full inline-flex items-center justify-center px-5 py-3 min-h-[48px] bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-semibold rounded-lg transition-colors"
              >
                {t.changePassword.backToLogin}
              </Link>
            )}
          </div>
        ) : !otpSent ? (
          <form onSubmit={handleSendOtp} className="space-y-5" noValidate>
            <p className="text-sm font-semibold text-slate-800">{t.changePassword.step1Title}</p>
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                <label
                  htmlFor="cp-identifier"
                  className="block text-sm font-medium text-slate-700"
                >
                  {t.changePassword.identifierLabel}
                </label>
                {session?.phone && (
                  <div className="inline-flex items-center gap-1 p-0.5 bg-slate-100 rounded-md text-xs">
                    <button
                      type="button"
                      onClick={() => setIdentifier(session.email)}
                      className={`px-2.5 py-1 rounded font-medium transition-colors ${
                        identifier === session.email
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {t.changePassword.useEmailOption}
                    </button>
                    <button
                      type="button"
                      onClick={() => setIdentifier(session.phone ?? '')}
                      className={`px-2.5 py-1 rounded font-medium transition-colors ${
                        identifier === session.phone
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {t.changePassword.usePhoneOption}
                    </button>
                  </div>
                )}
              </div>
              <input
                id="cp-identifier"
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder={t.changePassword.identifierPlaceholder}
                className="w-full px-3.5 py-2.5 min-h-[44px] bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>

            <button
              type="submit"
              className="w-full inline-flex items-center justify-center px-5 py-3 min-h-[48px] bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-semibold rounded-lg transition-colors"
            >
              {t.changePassword.sendOtpButton}
            </button>
          </form>
        ) : (
          <form onSubmit={handleUpdatePassword} className="space-y-5" noValidate>
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-800">{t.changePassword.step2Title}</p>
              <span className="text-xs font-mono text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-md">
                {t.changePassword.otpDemoNote}
              </span>
            </div>

            <div>
              <label htmlFor="cp-otp" className="block text-sm font-medium text-slate-700 mb-1.5">
                {t.changePassword.otpLabel}
              </label>
              <input
                id="cp-otp"
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder={t.changePassword.otpPlaceholder}
                className="w-full px-3.5 py-2.5 min-h-[44px] bg-white border border-slate-300 rounded-lg text-sm font-mono tracking-widest text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>

            <div>
              <label
                htmlFor="cp-new-password"
                className="block text-sm font-medium text-slate-700 mb-1.5"
              >
                {t.changePassword.newPasswordLabel}
              </label>
              <div className="relative">
                <input
                  id="cp-new-password"
                  type={showNew ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder={t.changePassword.newPasswordPlaceholder}
                  className="w-full pl-3.5 pr-12 py-2.5 min-h-[44px] bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
                <button
                  type="button"
                  onClick={() => setShowNew((prev) => !prev)}
                  aria-label={showNew ? t.common.hidePassword : t.common.showPassword}
                  className="absolute right-1 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center text-slate-500 hover:text-slate-800"
                >
                  {showNew ? (
                    <EyeOff className="w-4 h-4" aria-hidden="true" />
                  ) : (
                    <Eye className="w-4 h-4" aria-hidden="true" />
                  )}
                </button>
              </div>

              {/* Password Strength Indicator */}
              <div className="mt-3 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-600">{t.changePassword.strengthLabel}</span>
                  <span className="font-semibold text-slate-800">{strengthLabel}</span>
                </div>
                <div className="grid grid-cols-4 gap-1.5" aria-hidden="true">
                  {[1, 2, 3, 4].map((idx) => (
                    <div
                      key={idx}
                      className={`h-1.5 rounded-full transition-colors ${
                        strength.score >= idx ? strengthBarColor : 'bg-slate-200'
                      }`}
                    />
                  ))}
                </div>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1 text-xs text-slate-600">
                  {[
                    { met: strength.hasMinLength, label: t.changePassword.ruleMinLength },
                    { met: strength.hasUpperAndLower, label: t.changePassword.ruleCase },
                    { met: strength.hasNumber, label: t.changePassword.ruleNumber },
                    { met: strength.hasSymbol, label: t.changePassword.ruleSymbol },
                  ].map((rule) => (
                    <li
                      key={rule.label}
                      className={`flex items-center gap-1.5 ${
                        rule.met ? 'text-emerald-700 font-medium' : 'text-slate-500'
                      }`}
                    >
                      <Check
                        className={`w-3.5 h-3.5 shrink-0 ${
                          rule.met ? 'text-emerald-600' : 'text-slate-300'
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
                htmlFor="cp-confirm-password"
                className="block text-sm font-medium text-slate-700 mb-1.5"
              >
                {t.changePassword.confirmPasswordLabel}
              </label>
              <div className="relative">
                <input
                  id="cp-confirm-password"
                  type={showConfirm ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder={t.changePassword.confirmPasswordPlaceholder}
                  className="w-full pl-3.5 pr-12 py-2.5 min-h-[44px] bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((prev) => !prev)}
                  aria-label={showConfirm ? t.common.hidePassword : t.common.showPassword}
                  className="absolute right-1 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center text-slate-500 hover:text-slate-800"
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
                  setErrorMsg(null);
                }}
                className="px-4 py-3 min-h-[48px] bg-slate-100 hover:bg-slate-200 text-slate-800 text-sm font-medium rounded-lg transition-colors"
              >
                {t.common.back}
              </button>
              <button
                type="submit"
                className="flex-1 inline-flex items-center justify-center px-5 py-3 min-h-[48px] bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-semibold rounded-lg transition-colors"
              >
                {t.changePassword.updateButton}
              </button>
            </div>
          </form>
        )}

        {!session && !completed && (
          <div className="mt-6 pt-5 border-t border-slate-200">
            <Link
              to="/login"
              className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 py-1"
            >
              <span>← {t.changePassword.backToLogin}</span>
            </Link>
          </div>
        )}
      </div>
    </div>
  );

  if (isLoggedInNormal) {
    return <DashboardShell title={t.changePassword.title}>{content}</DashboardShell>;
  }

  return (
    <PublicShell>
      <div className="flex-1 flex items-center justify-center px-4 sm:px-6">{content}</div>
    </PublicShell>
  );
}
