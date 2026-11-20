import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Clock,
  Eye,
  EyeOff,
  GraduationCap,
  KeyRound,
  Lock,
  ShieldCheck,
  Ticket,
  Users,
  X,
} from 'lucide-react';
import { getDashboardPathForRole } from './RouteGuards';
import { useAuth } from '../context/AuthContext';
import { formatDigits, formatMessage, useI18n } from '../i18n';
import { authService } from '../services/authService';
import {
  formatStudentContextBadge,
  getDemoStudentPreset,
  resolveStudentPathway,
  studentService,
} from '../services/studentService';
import {
  formatTeacherContextBadge,
  getDemoTeacherPreset,
  resolveTeacherPathway,
  teacherService,
} from '../services/teacherService';
import {
  getDemoInternationalAdminPreset,
  internationalAdminService,
  resolveInternationalPathway,
} from '../services/internationalAdminService';
import {
  formatIntlStudentContextBadge,
  getDemoIntlStudentPreset,
  internationalStudentService,
} from '../services/internationalStudentService';
import {
  formatIntlTeacherContextBadge,
  getDemoIntlTeacherPreset,
  internationalTeacherService,
} from '../services/internationalTeacherService';
import {
  aliaStudentService,
  formatAliaStudentContextBadge,
  getDemoAliaStudentPreset,
  isAliaPathway,
} from '../services/aliaStudentService';
import {
  aliaTeacherService,
  formatAliaTeacherContextBadge,
  getDemoAliaTeacherPreset,
  isAliaTeacherPathway,
} from '../services/aliaTeacherService';
import {
  aliaAdminService,
  getDemoAliaAdminPreset,
  resolveAliaAdminPathway,
} from '../services/aliaAdminService';
import {
  formatQawmiStudentContextBadge,
  getDemoQawmiStudentPreset,
  isQawmiPathway,
  qawmiStudentService,
} from '../services/qawmiStudentService';
import {
  formatQawmiTeacherContextBadge,
  getDemoQawmiTeacherPreset,
  isQawmiTeacherPathway,
  qawmiTeacherService,
} from '../services/qawmiTeacherService';
import {
  getDemoQawmiAdminPreset,
  qawmiAdminService,
  resolveQawmiAdminPathway,
} from '../services/qawmiAdminService';
import type { CurriculumSubTrack, EducationStream, UserRole } from '../types/domain';
import { evaluatePasswordStrength, validatePasswordConfirmation } from '../utils/validation';

interface RoleLoginModalProps {
  role: UserRole;
  stream: EducationStream;
  pathway: CurriculumSubTrack;
  onClose: () => void;
}

function resolveRecoveryError(key: string, t: ReturnType<typeof useI18n>['t']): string {
  switch (key) {
    case 'validation.emailRequired':
      return t.validation.emailRequired;
    case 'validation.emailInvalid':
      return t.validation.emailInvalid;
    case 'validation.phoneRequired':
      return t.validation.phoneRequired;
    case 'validation.phoneInvalid':
      return t.validation.phoneInvalid;
    case 'validation.passwordMinLength':
      return t.validation.passwordMinLength;
    case 'validation.passwordMismatch':
      return t.validation.passwordMismatch;
    case 'changePassword.invalidOtp':
      return t.changePassword.invalidOtp;
    case 'changePassword.recoveryAccountMismatch':
      return t.changePassword.recoveryAccountMismatch;
    default:
      return key;
  }
}

export function RoleLoginModal({ role, stream, pathway, onClose }: RoleLoginModalProps) {
  const { login } = useAuth();
  const { language, t } = useI18n();
  const navigate = useNavigate();

  const [mode, setMode] = useState<'login' | 'recovery'>('login');

  // Login form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [pendingMsg, setPendingMsg] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);
  const [lockSeconds, setLockSeconds] = useState<number>(0);

  // Recovery form state
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [recoveryPhone, setRecoveryPhone] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [recoveryError, setRecoveryError] = useState<string | null>(null);
  const [recoveryDone, setRecoveryDone] = useState(false);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  useEffect(() => {
    if (lockSeconds <= 0) return;
    const timer = window.setInterval(() => {
      setLockSeconds((prev) => (prev > 1 ? prev - 1 : 0));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [lockSeconds]);

  const roleIconMeta: Record<
    UserRole,
    {
      icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
      iconBox: string;
    }
  > = {
    student: {
      icon: GraduationCap,
      iconBox:
        'bg-indigo-100 dark:bg-indigo-900/60 border-indigo-200 dark:border-indigo-700/70 text-indigo-700 dark:text-indigo-300',
    },
    teacher: {
      icon: Users,
      iconBox:
        'bg-teal-100 dark:bg-teal-900/60 border-teal-200 dark:border-teal-700/70 text-teal-700 dark:text-teal-300',
    },
    admin: {
      icon: ShieldCheck,
      iconBox:
        'bg-rose-100 dark:bg-rose-900/60 border-rose-200 dark:border-rose-700/70 text-rose-700 dark:text-rose-300',
    },
  };

  const RoleIcon = roleIconMeta[role].icon;

  const phase1StudentPathway =
    role === 'student' ? resolveStudentPathway(pathway) : null;
  const demoStudentPreset = phase1StudentPathway
    ? getDemoStudentPreset(phase1StudentPathway)
    : null;

  const phase1TeacherPathway =
    role === 'teacher' ? resolveTeacherPathway(pathway) : null;
  const demoTeacherPreset = phase1TeacherPathway
    ? getDemoTeacherPreset(phase1TeacherPathway)
    : null;

  const internationalAdminPathway =
    role === 'admin' ? resolveInternationalPathway(pathway) : null;
  const demoInternationalAdminPreset = internationalAdminPathway
    ? getDemoInternationalAdminPreset(internationalAdminPathway)
    : null;

  const internationalStudentPathway =
    role === 'student' ? resolveInternationalPathway(pathway) : null;
  const demoInternationalStudentPreset = internationalStudentPathway
    ? getDemoIntlStudentPreset(internationalStudentPathway)
    : null;

  const internationalTeacherPathway =
    role === 'teacher' ? resolveInternationalPathway(pathway) : null;
  const demoInternationalTeacherPreset = internationalTeacherPathway
    ? getDemoIntlTeacherPreset(internationalTeacherPathway)
    : null;

  const isAliaStudentFlow = role === 'student' && isAliaPathway(pathway);
  const demoAliaStudentPreset = isAliaStudentFlow ? getDemoAliaStudentPreset() : null;

  const isAliaTeacherFlow = role === 'teacher' && isAliaTeacherPathway(pathway);
  const demoAliaTeacherPreset = isAliaTeacherFlow ? getDemoAliaTeacherPreset() : null;

  const isAliaAdminFlow = role === 'admin' && resolveAliaAdminPathway(pathway) === 'alia';
  const demoAliaAdminPreset = isAliaAdminFlow ? getDemoAliaAdminPreset() : null;

  const isQawmiStudentFlow = role === 'student' && isQawmiPathway(pathway);
  const demoQawmiStudentPreset = isQawmiStudentFlow ? getDemoQawmiStudentPreset() : null;

  const isQawmiTeacherFlow = role === 'teacher' && isQawmiTeacherPathway(pathway);
  const demoQawmiTeacherPreset = isQawmiTeacherFlow ? getDemoQawmiTeacherPreset() : null;

  const isQawmiAdminFlow = role === 'admin' && resolveQawmiAdminPathway(pathway) === 'qawmi';
  const demoQawmiAdminPreset = isQawmiAdminFlow ? getDemoQawmiAdminPreset() : null;

  const handleDemoStudentQuickLogin = () => {
    if (!phase1StudentPathway || !demoStudentPreset) return;
    setErrorMsg(null);
    setPendingMsg(null);
    setSuccessNotice(null);
    studentService.prepareStudentAccountForLogin(
      demoStudentPreset.email,
      demoStudentPreset.password,
      phase1StudentPathway
    );
    const res = login(demoStudentPreset.email, demoStudentPreset.password, 'student', {
      stream,
      pathway,
    });
    if (res.ok) {
      onClose();
      navigate(getDashboardPathForRole('student'), { replace: true });
    }
  };

  const handleDemoTeacherQuickLogin = () => {
    if (!phase1TeacherPathway || !demoTeacherPreset) return;
    setErrorMsg(null);
    setPendingMsg(null);
    setSuccessNotice(null);
    teacherService.prepareTeacherAccountForLogin(
      demoTeacherPreset.email,
      demoTeacherPreset.password,
      phase1TeacherPathway
    );
    const res = login(demoTeacherPreset.email, demoTeacherPreset.password, 'teacher', {
      stream,
      pathway,
    });
    if (res.ok) {
      onClose();
      navigate(getDashboardPathForRole('teacher'), { replace: true });
    }
  };

  const handleDemoInternationalAdminQuickLogin = () => {
    if (!internationalAdminPathway || !demoInternationalAdminPreset) return;
    setErrorMsg(null);
    setPendingMsg(null);
    setSuccessNotice(null);
    internationalAdminService.prepareInternationalAdminForLogin(
      demoInternationalAdminPreset.email,
      internationalAdminPathway
    );
    const res = login(
      demoInternationalAdminPreset.email,
      demoInternationalAdminPreset.password,
      'admin',
      { stream, pathway }
    );
    if (res.ok) {
      onClose();
      navigate(getDashboardPathForRole('admin', pathway), { replace: true });
    }
  };

  const handleDemoInternationalStudentQuickLogin = () => {
    if (!internationalStudentPathway || !demoInternationalStudentPreset) return;
    setErrorMsg(null);
    setPendingMsg(null);
    setSuccessNotice(null);
    internationalStudentService.prepareIntlStudentAccountForLogin(
      demoInternationalStudentPreset.email,
      demoInternationalStudentPreset.password,
      internationalStudentPathway
    );
    const res = login(
      demoInternationalStudentPreset.email,
      demoInternationalStudentPreset.password,
      'student',
      { stream, pathway }
    );
    if (res.ok) {
      onClose();
      navigate(getDashboardPathForRole('student', pathway), { replace: true });
    }
  };

  const handleDemoInternationalTeacherQuickLogin = () => {
    if (!internationalTeacherPathway || !demoInternationalTeacherPreset) return;
    setErrorMsg(null);
    setPendingMsg(null);
    setSuccessNotice(null);
    internationalTeacherService.prepareIntlTeacherAccountForLogin(
      demoInternationalTeacherPreset.email,
      demoInternationalTeacherPreset.password,
      internationalTeacherPathway
    );
    const res = login(
      demoInternationalTeacherPreset.email,
      demoInternationalTeacherPreset.password,
      'teacher',
      { stream, pathway }
    );
    if (res.ok) {
      onClose();
      navigate(getDashboardPathForRole('teacher', pathway), { replace: true });
    }
  };

  const handleDemoAliaStudentQuickLogin = () => {
    if (!isAliaStudentFlow || !demoAliaStudentPreset) return;
    setErrorMsg(null);
    setPendingMsg(null);
    setSuccessNotice(null);
    aliaStudentService.prepareAliaStudentAccountForLogin(
      demoAliaStudentPreset.email,
      demoAliaStudentPreset.password
    );
    const res = login(
      demoAliaStudentPreset.email,
      demoAliaStudentPreset.password,
      'student',
      { stream, pathway }
    );
    if (res.ok) {
      onClose();
      navigate(getDashboardPathForRole('student', pathway), { replace: true });
    }
  };

  const handleDemoQawmiStudentQuickLogin = () => {
    if (!isQawmiStudentFlow || !demoQawmiStudentPreset) return;
    setErrorMsg(null);
    setPendingMsg(null);
    setSuccessNotice(null);
    qawmiStudentService.prepareQawmiStudentAccountForLogin(
      demoQawmiStudentPreset.email,
      demoQawmiStudentPreset.password
    );
    const res = login(
      demoQawmiStudentPreset.email,
      demoQawmiStudentPreset.password,
      'student',
      { stream, pathway }
    );
    if (res.ok) {
      onClose();
      navigate(getDashboardPathForRole('student', pathway), { replace: true });
    }
  };

  const handleDemoAliaTeacherQuickLogin = () => {
    if (!isAliaTeacherFlow || !demoAliaTeacherPreset) return;
    setErrorMsg(null);
    setPendingMsg(null);
    setSuccessNotice(null);
    aliaTeacherService.prepareAliaTeacherAccountForLogin(
      demoAliaTeacherPreset.email,
      demoAliaTeacherPreset.password
    );
    const res = login(
      demoAliaTeacherPreset.email,
      demoAliaTeacherPreset.password,
      'teacher',
      { stream, pathway }
    );
    if (res.ok) {
      onClose();
      navigate(getDashboardPathForRole('teacher', pathway), { replace: true });
    }
  };

  const handleDemoQawmiTeacherQuickLogin = () => {
    if (!isQawmiTeacherFlow || !demoQawmiTeacherPreset) return;
    setErrorMsg(null);
    setPendingMsg(null);
    setSuccessNotice(null);
    qawmiTeacherService.prepareQawmiTeacherAccountForLogin(
      demoQawmiTeacherPreset.email,
      demoQawmiTeacherPreset.password
    );
    const res = login(
      demoQawmiTeacherPreset.email,
      demoQawmiTeacherPreset.password,
      'teacher',
      { stream, pathway }
    );
    if (res.ok) {
      onClose();
      navigate(getDashboardPathForRole('teacher', pathway), { replace: true });
    }
  };

  const handleDemoAliaAdminQuickLogin = () => {
    if (!isAliaAdminFlow || !demoAliaAdminPreset) return;
    setErrorMsg(null);
    setPendingMsg(null);
    setSuccessNotice(null);
    aliaAdminService.prepareAliaAdminForLogin(demoAliaAdminPreset.email);
    const res = login(
      demoAliaAdminPreset.email,
      demoAliaAdminPreset.password,
      'admin',
      { stream, pathway }
    );
    if (res.ok) {
      onClose();
      navigate(getDashboardPathForRole('admin', pathway), { replace: true });
    }
  };

  const handleDemoQawmiAdminQuickLogin = () => {
    if (!isQawmiAdminFlow || !demoQawmiAdminPreset) return;
    setErrorMsg(null);
    setPendingMsg(null);
    setSuccessNotice(null);
    qawmiAdminService.prepareQawmiAdminForLogin(demoQawmiAdminPreset.email);
    const res = login(
      demoQawmiAdminPreset.email,
      demoQawmiAdminPreset.password,
      'admin',
      { stream, pathway }
    );
    if (res.ok) {
      onClose();
      navigate(getDashboardPathForRole('admin', pathway), { replace: true });
    }
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setPendingMsg(null);
    setSuccessNotice(null);

    if (phase1StudentPathway) {
      studentService.prepareStudentAccountForLogin(email, password, phase1StudentPathway);
    }
    if (internationalStudentPathway) {
      internationalStudentService.prepareIntlStudentAccountForLogin(
        email,
        password,
        internationalStudentPathway
      );
    }
    if (isAliaStudentFlow) {
      aliaStudentService.prepareAliaStudentAccountForLogin(email, password);
    }
    if (isQawmiStudentFlow) {
      qawmiStudentService.prepareQawmiStudentAccountForLogin(email, password);
    }
    if (phase1TeacherPathway) {
      teacherService.prepareTeacherAccountForLogin(email, password, phase1TeacherPathway);
    }
    if (internationalTeacherPathway) {
      internationalTeacherService.prepareIntlTeacherAccountForLogin(
        email,
        password,
        internationalTeacherPathway
      );
    }
    if (isAliaTeacherFlow) {
      aliaTeacherService.prepareAliaTeacherAccountForLogin(email, password);
    }
    if (isQawmiTeacherFlow) {
      qawmiTeacherService.prepareQawmiTeacherAccountForLogin(email, password);
    }
    if (internationalAdminPathway) {
      internationalAdminService.prepareInternationalAdminForLogin(
        email,
        internationalAdminPathway
      );
    }
    if (isAliaAdminFlow) {
      aliaAdminService.prepareAliaAdminForLogin(email);
    }
    if (isQawmiAdminFlow) {
      qawmiAdminService.prepareQawmiAdminForLogin(email);
    }

    const res = login(email, password, role, { stream, pathway });
    if (res.ok) {
      onClose();
      if (res.session.mustChangePassword) {
        navigate('/change-password', { replace: true });
      } else {
        navigate(getDashboardPathForRole(res.session.role, res.session.selectedPathway), {
          replace: true,
        });
      }
      return;
    }

    if (res.reason === 'pending_approval') {
      setPendingMsg(t.login.errorPending);
      return;
    }

    if (res.reason === 'role_mismatch' && res.actualRole) {
      setErrorMsg(
        formatMessage(t.login.errorRoleMismatch, {
          actualRole: t.welcome.loginRoles[res.actualRole],
        })
      );
      return;
    }

    if (res.reason === 'locked') {
      setLockSeconds(res.remainingSeconds ?? 300);
      setErrorMsg(t.login.errorLocked);
      return;
    }

    setErrorMsg(t.login.errorGeneric);
  };

  const openRecoveryMode = () => {
    setMode('recovery');
    setRecoveryEmail(email.includes('@') ? email : '');
    setRecoveryPhone('');
    setOtpSent(false);
    setOtpCode('');
    setNewPassword('');
    setConfirmPassword('');
    setRecoveryError(null);
    setRecoveryDone(false);
  };

  const handleSendRecoveryOtp = (e: React.FormEvent) => {
    e.preventDefault();
    setRecoveryError(null);
    const res = authService.requestRecoveryOtp(recoveryEmail, recoveryPhone);
    if (!res.ok) {
      setRecoveryError(resolveRecoveryError(res.errorKey, t));
      return;
    }
    setOtpSent(true);
  };

  const handleCompleteRecovery = (e: React.FormEvent) => {
    e.preventDefault();
    setRecoveryError(null);

    const confirmCheck = validatePasswordConfirmation(newPassword, confirmPassword);
    if (!confirmCheck.valid) {
      setRecoveryError(resolveRecoveryError(confirmCheck.errorKey, t));
      return;
    }

    const res = authService.verifyRecoveryOtpAndResetPassword(
      recoveryEmail,
      recoveryPhone,
      otpCode,
      newPassword,
      role
    );
    if (!res.ok) {
      setRecoveryError(resolveRecoveryError(res.errorKey, t));
      return;
    }

    setRecoveryDone(true);
  };

  const returnToLoginAfterRecovery = () => {
    setEmail(recoveryEmail.trim());
    setPassword('');
    setErrorMsg(null);
    setPendingMsg(null);
    setSuccessNotice(t.changePassword.recoverySuccessNote);
    setMode('login');
  };

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

  const lockMins = Math.floor(lockSeconds / 60);
  const lockSecs = lockSeconds % 60;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-[2px] overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="role-modal-title"
        className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl overflow-hidden my-auto transition-colors"
      >
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900 flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div
              className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${
                mode === 'recovery'
                  ? 'bg-emerald-100 dark:bg-emerald-900/60 border-emerald-200 dark:border-emerald-700/70 text-emerald-700 dark:text-emerald-300'
                  : roleIconMeta[role].iconBox
              }`}
            >
              {mode === 'recovery' ? (
                <KeyRound className="w-5 h-5" aria-hidden="true" />
              ) : (
                <RoleIcon className="w-5 h-5" aria-hidden="true" />
              )}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400 leading-snug">
                <span className="block">{t.onboarding.streams[stream]}</span>
                <span className="block text-slate-600 dark:text-slate-300">
                  {t.welcome.subTracks[pathway]}
                </span>
              </p>
              <h2
                id="role-modal-title"
                className="text-lg font-bold text-slate-900 dark:text-white mt-0.5"
              >
                {mode === 'recovery' ? t.changePassword.recoveryTitle : t.login.roleTitles[role]}
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t.common.close}
            className="w-10 h-10 rounded-lg flex items-center justify-center text-slate-500 dark:text-slate-400 hover:bg-slate-200/70 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-slate-100 transition-colors shrink-0"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        <div className="p-6">
          {mode === 'login' ? (
            <>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-5">
                {t.login.roleSubtitles[role]}
              </p>

              {successNotice && (
                <div
                  role="status"
                  className="mb-4 flex items-start gap-3 p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 text-sm"
                >
                  <CheckCircle2
                    className="w-5 h-5 text-emerald-700 dark:text-emerald-400 shrink-0 mt-0.5"
                    aria-hidden="true"
                  />
                  <span>{successNotice}</span>
                </div>
              )}

              {pendingMsg && (
                <div
                  role="status"
                  className="mb-4 flex items-start gap-3 p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-sm"
                >
                  <Clock
                    className="w-5 h-5 text-amber-700 dark:text-amber-400 shrink-0 mt-0.5"
                    aria-hidden="true"
                  />
                  <span>{pendingMsg}</span>
                </div>
              )}

              {errorMsg && (
                <div
                  role="alert"
                  className="mb-4 flex items-start gap-3 p-3.5 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-red-900 dark:text-red-200 text-sm"
                >
                  {lockSeconds > 0 ? (
                    <Lock
                      className="w-5 h-5 text-red-700 dark:text-red-400 shrink-0 mt-0.5"
                      aria-hidden="true"
                    />
                  ) : (
                    <AlertCircle
                      className="w-5 h-5 text-red-700 dark:text-red-400 shrink-0 mt-0.5"
                      aria-hidden="true"
                    />
                  )}
                  <div className="space-y-1">
                    <p className="font-medium">{errorMsg}</p>
                    {lockSeconds > 0 && (
                      <p className="text-xs text-red-800 dark:text-red-300 tabular-nums">
                        {formatMessage(t.login.errorLockedCountdown, {
                          minutes: formatDigits(lockMins, language),
                          seconds: formatDigits(String(lockSecs).padStart(2, '0'), language),
                        })}
                      </p>
                    )}
                  </div>
                </div>
              )}

              <form onSubmit={handleLoginSubmit} className="space-y-4" noValidate>
                <div>
                  <label
                    htmlFor="modal-login-email"
                    className="block text-sm font-medium text-slate-800 dark:text-slate-200 mb-1.5"
                  >
                    {t.login.emailLabel}
                  </label>
                  <input
                    id="modal-login-email"
                    type="email"
                    autoComplete="email"
                    autoFocus
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t.login.emailPlaceholder}
                    className="w-full px-3.5 py-2.5 min-h-[44px] bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <label
                      htmlFor="modal-login-password"
                      className="block text-sm font-medium text-slate-800 dark:text-slate-200"
                    >
                      {t.login.passwordLabel}
                    </label>
                    <button
                      type="button"
                      onClick={openRecoveryMode}
                      className="text-xs font-medium text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300 underline underline-offset-4 py-1"
                    >
                      {t.login.forgotPasswordButton}
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      id="modal-login-password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={t.login.passwordPlaceholder}
                      className="w-full pl-3.5 pr-12 py-2.5 min-h-[44px] bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      aria-label={showPassword ? t.common.hidePassword : t.common.showPassword}
                      className="absolute right-1 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 rounded-md"
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" aria-hidden="true" />
                      ) : (
                        <Eye className="w-4 h-4" aria-hidden="true" />
                      )}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 min-h-[48px] bg-emerald-700 hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white text-sm font-semibold rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2"
                >
                  <span>{t.login.submitButton}</span>
                  <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </button>
              </form>

              {demoStudentPreset && phase1StudentPathway && (
                <div className="mt-4 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-100">
                      Quick Demo Student Access
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                      {demoStudentPreset.fullName} ·{' '}
                      {formatStudentContextBadge(
                        phase1StudentPathway,
                        demoStudentPreset.academicClass,
                        demoStudentPreset.academicGroup
                      )}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleDemoStudentQuickLogin}
                    className="px-3 py-2 min-h-[36px] bg-white dark:bg-slate-900 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0"
                  >
                    1-Click Demo Login
                  </button>
                </div>
              )}

              {demoTeacherPreset && phase1TeacherPathway && (
                <div className="mt-4 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-100">
                      Quick Demo Teacher Access
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                      {demoTeacherPreset.fullName} ·{' '}
                      {formatTeacherContextBadge(
                        phase1TeacherPathway,
                        demoTeacherPreset.primarySubject
                      )}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleDemoTeacherQuickLogin}
                    className="px-3 py-2 min-h-[36px] bg-white dark:bg-slate-900 hover:bg-teal-50 dark:hover:bg-teal-950/60 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0"
                  >
                    1-Click Demo Login
                  </button>
                </div>
              )}

              {demoInternationalAdminPreset && internationalAdminPathway && (
                <div className="mt-4 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-100">
                      Quick {demoInternationalAdminPreset.panelName} Access
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                      {demoInternationalAdminPreset.email}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleDemoInternationalAdminQuickLogin}
                    className="px-3 py-2 min-h-[36px] bg-white dark:bg-slate-900 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0"
                  >
                    1-Click Demo Login
                  </button>
                </div>
              )}

              {isAliaAdminFlow && demoAliaAdminPreset && (
                <div className="mt-4 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-100">
                      {demoAliaAdminPreset.quickAccessTitle}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                      {demoAliaAdminPreset.email}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleDemoAliaAdminQuickLogin}
                    className="px-3 py-2 min-h-[36px] bg-white dark:bg-slate-900 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0"
                  >
                    1-Click Demo Login
                  </button>
                </div>
              )}

              {isQawmiAdminFlow && demoQawmiAdminPreset && (
                <div className="mt-4 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-100">
                      {demoQawmiAdminPreset.quickAccessTitle}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                      {demoQawmiAdminPreset.email}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleDemoQawmiAdminQuickLogin}
                    className="px-3 py-2 min-h-[36px] bg-white dark:bg-slate-900 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0"
                  >
                    1-Click Demo Login
                  </button>
                </div>
              )}

              {demoInternationalStudentPreset && internationalStudentPathway && (
                <div className="mt-4 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-100">
                      Quick Demo Student Access
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                      {demoInternationalStudentPreset.fullName} ·{' '}
                      {formatIntlStudentContextBadge(
                        internationalStudentPathway,
                        demoInternationalStudentPreset.academicLevel,
                        demoInternationalStudentPreset.academicTrack
                      )}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleDemoInternationalStudentQuickLogin}
                    className="px-3 py-2 min-h-[36px] bg-white dark:bg-slate-900 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0"
                  >
                    1-Click Demo Login
                  </button>
                </div>
              )}

              {demoInternationalTeacherPreset && internationalTeacherPathway && (
                <div className="mt-4 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-100">
                      Quick Demo Teacher Access
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                      {demoInternationalTeacherPreset.fullName} ·{' '}
                      {formatIntlTeacherContextBadge(
                        internationalTeacherPathway,
                        demoInternationalTeacherPreset.primarySubject
                      )}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleDemoInternationalTeacherQuickLogin}
                    className="px-3 py-2 min-h-[36px] bg-white dark:bg-slate-900 hover:bg-teal-50 dark:hover:bg-teal-950/60 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0"
                  >
                    1-Click Demo Login
                  </button>
                </div>
              )}

              {demoAliaStudentPreset && isAliaStudentFlow && (
                <div className="mt-4 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-100">
                      Quick Demo Student Access
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                      {demoAliaStudentPreset.fullName} ·{' '}
                      {formatAliaStudentContextBadge(
                        demoAliaStudentPreset.marhala,
                        demoAliaStudentPreset.department
                      )}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleDemoAliaStudentQuickLogin}
                    className="px-3 py-2 min-h-[36px] bg-white dark:bg-slate-900 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0"
                  >
                    1-Click Demo Login
                  </button>
                </div>
              )}

              {demoAliaTeacherPreset && isAliaTeacherFlow && (
                <div className="mt-4 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-100">
                      Quick Demo Teacher Access
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                      {demoAliaTeacherPreset.fullName} ·{' '}
                      {formatAliaTeacherContextBadge(demoAliaTeacherPreset.primarySubject)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleDemoAliaTeacherQuickLogin}
                    className="px-3 py-2 min-h-[36px] bg-white dark:bg-slate-900 hover:bg-teal-50 dark:hover:bg-teal-950/60 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0"
                  >
                    1-Click Demo Login
                  </button>
                </div>
              )}

              {demoQawmiStudentPreset && isQawmiStudentFlow && (
                <div className="mt-4 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-100">
                      Quick Demo Student Access
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                      {demoQawmiStudentPreset.fullName} ·{' '}
                      {formatQawmiStudentContextBadge(
                        demoQawmiStudentPreset.marhala,
                        demoQawmiStudentPreset.focusBranch
                      )}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleDemoQawmiStudentQuickLogin}
                    className="px-3 py-2 min-h-[36px] bg-white dark:bg-slate-900 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0"
                  >
                    1-Click Demo Login
                  </button>
                </div>
              )}

              {demoQawmiTeacherPreset && isQawmiTeacherFlow && (
                <div className="mt-4 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-100">
                      Quick Demo Teacher Access
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                      {demoQawmiTeacherPreset.fullName} ·{' '}
                      {formatQawmiTeacherContextBadge(demoQawmiTeacherPreset.primarySubject)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleDemoQawmiTeacherQuickLogin}
                    className="px-3 py-2 min-h-[36px] bg-white dark:bg-slate-900 hover:bg-teal-50 dark:hover:bg-teal-950/60 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0"
                  >
                    1-Click Demo Login
                  </button>
                </div>
              )}

              {role !== 'admin' && (
                <div className="mt-5 pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 text-xs sm:text-sm">
                  <span className="text-slate-600 dark:text-slate-400">
                    {t.login.haveCouponPrompt}
                  </span>
                  <Link
                    to={
                      phase1StudentPathway
                        ? `/student/coupon?pathway=${phase1StudentPathway}`
                        : internationalStudentPathway
                          ? `/student-intl/coupon?pathway=${internationalStudentPathway}`
                          : isAliaStudentFlow
                            ? '/student-alia/coupon?pathway=alia'
                            : isQawmiStudentFlow
                              ? '/student-qawmi/coupon?pathway=qawmi'
                              : isAliaTeacherFlow
                                ? '/teacher-alia/coupon?pathway=alia'
                                : isQawmiTeacherFlow
                                  ? '/teacher-qawmi/coupon?pathway=qawmi'
                                  : internationalTeacherPathway
                                    ? `/teacher-intl/coupon?pathway=${internationalTeacherPathway}`
                                    : phase1TeacherPathway
                                      ? `/teacher/coupon?pathway=${phase1TeacherPathway}`
                                      : '/coupon'
                    }
                    onClick={onClose}
                    className="inline-flex items-center gap-1.5 font-semibold text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300 underline underline-offset-4 py-1"
                  >
                    <Ticket className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>{t.login.haveCouponLink}</span>
                  </Link>
                </div>
              )}
            </>
          ) : recoveryDone ? (
            <div className="space-y-5 py-1">
              <div className="flex items-start gap-3 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200">
                <CheckCircle2
                  className="w-5 h-5 text-emerald-700 dark:text-emerald-400 shrink-0 mt-0.5"
                  aria-hidden="true"
                />
                <div>
                  <p className="text-sm font-semibold">{t.changePassword.successTitle}</p>
                  <p className="text-sm mt-1">{t.changePassword.recoverySuccessNote}</p>
                </div>
              </div>

              <button
                type="button"
                onClick={returnToLoginAfterRecovery}
                className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 min-h-[48px] bg-emerald-700 hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white text-sm font-semibold rounded-lg transition-colors"
              >
                <ArrowLeft className="w-4 h-4" aria-hidden="true" />
                <span>{t.changePassword.backToLogin}</span>
              </button>
            </div>
          ) : !otpSent ? (
            <>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-5">
                {t.changePassword.recoverySubtitle}
              </p>

              {recoveryError && (
                <div
                  role="alert"
                  className="mb-4 flex items-start gap-3 p-3.5 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-red-900 dark:text-red-200 text-sm"
                >
                  <AlertCircle
                    className="w-5 h-5 text-red-700 dark:text-red-400 shrink-0 mt-0.5"
                    aria-hidden="true"
                  />
                  <span>{recoveryError}</span>
                </div>
              )}

              <form onSubmit={handleSendRecoveryOtp} className="space-y-4" noValidate>
                <div>
                  <label
                    htmlFor="modal-recovery-email"
                    className="block text-sm font-medium text-slate-800 dark:text-slate-200 mb-1.5"
                  >
                    {t.changePassword.recoveryEmailLabel}
                  </label>
                  <input
                    id="modal-recovery-email"
                    type="email"
                    autoComplete="email"
                    autoFocus
                    value={recoveryEmail}
                    onChange={(e) => setRecoveryEmail(e.target.value)}
                    placeholder={t.changePassword.recoveryEmailPlaceholder}
                    className="w-full px-3.5 py-2.5 min-h-[44px] bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>

                <div>
                  <label
                    htmlFor="modal-recovery-phone"
                    className="block text-sm font-medium text-slate-800 dark:text-slate-200 mb-1.5"
                  >
                    {t.changePassword.recoveryPhoneLabel}
                  </label>
                  <input
                    id="modal-recovery-phone"
                    type="tel"
                    autoComplete="tel"
                    value={recoveryPhone}
                    onChange={(e) => setRecoveryPhone(e.target.value)}
                    placeholder={t.changePassword.recoveryPhonePlaceholder}
                    className="w-full px-3.5 py-2.5 min-h-[44px] bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>

                <div className="flex items-center gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setMode('login');
                      setRecoveryError(null);
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-3 min-h-[48px] bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 text-sm font-medium rounded-lg transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4" aria-hidden="true" />
                    <span>{t.common.back}</span>
                  </button>
                  <button
                    type="submit"
                    className="flex-1 inline-flex items-center justify-center px-5 py-3 min-h-[48px] bg-emerald-700 hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white text-sm font-semibold rounded-lg transition-colors"
                  >
                    {t.changePassword.sendOtpButton}
                  </button>
                </div>
              </form>
            </>
          ) : (
            <>
              <div className="flex items-center justify-between gap-2 mb-4">
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                  {t.changePassword.step2Title}
                </p>
                <span className="text-xs font-mono text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 px-2.5 py-1 rounded-md">
                  {t.changePassword.otpDemoNote}
                </span>
              </div>

              {recoveryError && (
                <div
                  role="alert"
                  className="mb-4 flex items-start gap-3 p-3.5 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-red-900 dark:text-red-200 text-sm"
                >
                  <AlertCircle
                    className="w-5 h-5 text-red-700 dark:text-red-400 shrink-0 mt-0.5"
                    aria-hidden="true"
                  />
                  <span>{recoveryError}</span>
                </div>
              )}

              <form onSubmit={handleCompleteRecovery} className="space-y-4" noValidate>
                <div>
                  <label
                    htmlFor="modal-recovery-otp"
                    className="block text-sm font-medium text-slate-800 dark:text-slate-200 mb-1.5"
                  >
                    {t.changePassword.otpLabel}
                  </label>
                  <input
                    id="modal-recovery-otp"
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    autoFocus
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    placeholder={t.changePassword.otpPlaceholder}
                    className="w-full px-3.5 py-2.5 min-h-[44px] bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-sm font-mono tracking-widest text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>

                <div>
                  <label
                    htmlFor="modal-recovery-new-password"
                    className="block text-sm font-medium text-slate-800 dark:text-slate-200 mb-1.5"
                  >
                    {t.changePassword.newPasswordLabel}
                  </label>
                  <div className="relative">
                    <input
                      id="modal-recovery-new-password"
                      type={showNewPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder={t.changePassword.newPasswordPlaceholder}
                      className="w-full pl-3.5 pr-12 py-2.5 min-h-[44px] bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword((prev) => !prev)}
                      aria-label={showNewPassword ? t.common.hidePassword : t.common.showPassword}
                      className="absolute right-1 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                    >
                      {showNewPassword ? (
                        <EyeOff className="w-4 h-4" aria-hidden="true" />
                      ) : (
                        <Eye className="w-4 h-4" aria-hidden="true" />
                      )}
                    </button>
                  </div>

                  <div className="mt-2.5 space-y-2">
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
                    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1 pt-0.5 text-xs text-slate-600 dark:text-slate-400">
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
                    htmlFor="modal-recovery-confirm-password"
                    className="block text-sm font-medium text-slate-800 dark:text-slate-200 mb-1.5"
                  >
                    {t.changePassword.confirmPasswordLabel}
                  </label>
                  <div className="relative">
                    <input
                      id="modal-recovery-confirm-password"
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder={t.changePassword.confirmPasswordPlaceholder}
                      className="w-full pl-3.5 pr-12 py-2.5 min-h-[44px] bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((prev) => !prev)}
                      aria-label={
                        showConfirmPassword ? t.common.hidePassword : t.common.showPassword
                      }
                      className="absolute right-1 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                    >
                      {showConfirmPassword ? (
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
                      setRecoveryError(null);
                    }}
                    className="px-4 py-3 min-h-[48px] bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 text-sm font-medium rounded-lg transition-colors"
                  >
                    {t.common.back}
                  </button>
                  <button
                    type="submit"
                    className="flex-1 inline-flex items-center justify-center px-5 py-3 min-h-[48px] bg-emerald-700 hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white text-sm font-semibold rounded-lg transition-colors"
                  >
                    {t.changePassword.updateButton}
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
