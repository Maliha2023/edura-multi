import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { AlertCircle, ArrowRight, Clock, Eye, EyeOff, Lock, Ticket } from 'lucide-react';
import { PublicShell } from '../components/PublicShell';
import { getDashboardPathForRole } from '../components/RouteGuards';
import { useAuth } from '../context/AuthContext';
import { formatDigits, formatMessage, useI18n } from '../i18n';
import {
  formatStudentContextBadge,
  getDemoStudentPreset,
  getStudentPathwayLabel,
  resolveStudentPathway,
  studentService,
} from '../services/studentService';
import {
  formatTeacherContextBadge,
  getDemoTeacherPreset,
  getTeacherPathwayLabel,
  resolveTeacherPathway,
  teacherService,
} from '../services/teacherService';
import {
  getDemoInternationalAdminPreset,
  getInternationalPathwaySubTrack,
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
  resolveAliaPathway,
} from '../services/aliaStudentService';
import {
  aliaTeacherService,
  formatAliaTeacherContextBadge,
  getDemoAliaTeacherPreset,
  resolveAliaTeacherPathway,
} from '../services/aliaTeacherService';
import {
  aliaAdminService,
  getDemoAliaAdminPreset,
  resolveAliaAdminPathway,
} from '../services/aliaAdminService';
import {
  formatQawmiStudentContextBadge,
  getDemoQawmiStudentPreset,
  qawmiStudentService,
  resolveQawmiPathway,
} from '../services/qawmiStudentService';
import {
  formatQawmiTeacherContextBadge,
  getDemoQawmiTeacherPreset,
  qawmiTeacherService,
  resolveQawmiTeacherPathway,
} from '../services/qawmiTeacherService';
import {
  getDemoQawmiAdminPreset,
  qawmiAdminService,
  resolveQawmiAdminPathway,
} from '../services/qawmiAdminService';
import type { UserRole } from '../types/domain';
import { getSavedCurriculumPreference, isValidUserRole } from './WelcomeCurriculumPage';

export function LoginPage() {
  const { login } = useAuth();
  const { language, t } = useI18n();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const savedCurriculum = useMemo(() => getSavedCurriculumPreference(), []);
  const roleParam = searchParams.get('role');
  const selectedRole: UserRole | null = isValidUserRole(roleParam)
    ? roleParam
    : savedCurriculum?.role ?? null;

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [pendingMsg, setPendingMsg] = useState<string | null>(null);
  const [lockSeconds, setLockSeconds] = useState<number>(0);

  useEffect(() => {
    if (lockSeconds <= 0) return;
    const timer = window.setInterval(() => {
      setLockSeconds((prev) => (prev > 1 ? prev - 1 : 0));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [lockSeconds]);

  const internationalStudentPathway =
    selectedRole === 'student'
      ? resolveInternationalPathway(searchParams.get('pathway')) ??
        resolveInternationalPathway(savedCurriculum?.pathway)
      : null;
  const demoInternationalStudentPreset = internationalStudentPathway
    ? getDemoIntlStudentPreset(internationalStudentPathway)
    : null;

  const aliaStudentPathway =
    selectedRole === 'student'
      ? resolveAliaPathway(searchParams.get('pathway')) ??
        resolveAliaPathway(savedCurriculum?.pathway)
      : null;
  const demoAliaStudentPreset = aliaStudentPathway ? getDemoAliaStudentPreset() : null;

  const qawmiStudentPathway =
    selectedRole === 'student'
      ? resolveQawmiPathway(searchParams.get('pathway')) ??
        resolveQawmiPathway(savedCurriculum?.pathway)
      : null;
  const demoQawmiStudentPreset = qawmiStudentPathway ? getDemoQawmiStudentPreset() : null;

  const pathwayParam = resolveStudentPathway(searchParams.get('pathway'));
  const phase1StudentPathway =
    selectedRole === 'student' &&
    !internationalStudentPathway &&
    !aliaStudentPathway &&
    !qawmiStudentPathway
      ? pathwayParam ?? resolveStudentPathway(savedCurriculum?.pathway) ?? 'bangla_version'
      : null;
  const demoStudentPreset = phase1StudentPathway
    ? getDemoStudentPreset(phase1StudentPathway)
    : null;

  const internationalTeacherPathway =
    selectedRole === 'teacher'
      ? resolveInternationalPathway(searchParams.get('pathway')) ??
        resolveInternationalPathway(savedCurriculum?.pathway)
      : null;
  const demoInternationalTeacherPreset = internationalTeacherPathway
    ? getDemoIntlTeacherPreset(internationalTeacherPathway)
    : null;

  const aliaTeacherPathway =
    selectedRole === 'teacher'
      ? resolveAliaTeacherPathway(searchParams.get('pathway')) ??
        resolveAliaTeacherPathway(savedCurriculum?.pathway)
      : null;
  const demoAliaTeacherPreset = aliaTeacherPathway ? getDemoAliaTeacherPreset() : null;

  const qawmiTeacherPathway =
    selectedRole === 'teacher'
      ? resolveQawmiTeacherPathway(searchParams.get('pathway')) ??
        resolveQawmiTeacherPathway(savedCurriculum?.pathway)
      : null;
  const demoQawmiTeacherPreset = qawmiTeacherPathway ? getDemoQawmiTeacherPreset() : null;

  const teacherPathwayParam = resolveTeacherPathway(searchParams.get('pathway'));
  const phase1TeacherPathway =
    selectedRole === 'teacher' &&
    !internationalTeacherPathway &&
    !aliaTeacherPathway &&
    !qawmiTeacherPathway
      ? teacherPathwayParam ?? resolveTeacherPathway(savedCurriculum?.pathway) ?? 'bangla_version'
      : null;
  const demoTeacherPreset = phase1TeacherPathway
    ? getDemoTeacherPreset(phase1TeacherPathway)
    : null;

  const internationalAdminPathway =
    selectedRole === 'admin'
      ? resolveInternationalPathway(searchParams.get('pathway')) ??
        resolveInternationalPathway(savedCurriculum?.pathway)
      : null;
  const demoInternationalAdminPreset = internationalAdminPathway
    ? getDemoInternationalAdminPreset(internationalAdminPathway)
    : null;

  const aliaAdminPathway =
    selectedRole === 'admin'
      ? resolveAliaAdminPathway(searchParams.get('pathway')) ??
        resolveAliaAdminPathway(savedCurriculum?.pathway)
      : null;
  const demoAliaAdminPreset = aliaAdminPathway ? getDemoAliaAdminPreset() : null;

  const qawmiAdminPathway =
    selectedRole === 'admin'
      ? resolveQawmiAdminPathway(searchParams.get('pathway')) ??
        resolveQawmiAdminPathway(savedCurriculum?.pathway)
      : null;
  const demoQawmiAdminPreset = qawmiAdminPathway ? getDemoQawmiAdminPreset() : null;

  const handleDemoStudentQuickLogin = () => {
    if (!phase1StudentPathway || !demoStudentPreset) return;
    setErrorMsg(null);
    setPendingMsg(null);
    studentService.prepareStudentAccountForLogin(
      demoStudentPreset.email,
      demoStudentPreset.password,
      phase1StudentPathway
    );
    const res = login(demoStudentPreset.email, demoStudentPreset.password, 'student', {
      stream: 'Bangladesh National Curriculum (NCTB)',
      pathway: getStudentPathwayLabel(phase1StudentPathway),
    });
    if (res.ok) {
      navigate(getDashboardPathForRole('student'), { replace: true });
    }
  };

  const handleDemoTeacherQuickLogin = () => {
    if (!phase1TeacherPathway || !demoTeacherPreset) return;
    setErrorMsg(null);
    setPendingMsg(null);
    teacherService.prepareTeacherAccountForLogin(
      demoTeacherPreset.email,
      demoTeacherPreset.password,
      phase1TeacherPathway
    );
    const res = login(demoTeacherPreset.email, demoTeacherPreset.password, 'teacher', {
      stream: 'Bangladesh National Curriculum (NCTB)',
      pathway: getTeacherPathwayLabel(phase1TeacherPathway),
    });
    if (res.ok) {
      navigate(getDashboardPathForRole('teacher'), { replace: true });
    }
  };

  const handleDemoInternationalAdminQuickLogin = () => {
    if (!internationalAdminPathway || !demoInternationalAdminPreset) return;
    setErrorMsg(null);
    setPendingMsg(null);
    internationalAdminService.prepareInternationalAdminForLogin(
      demoInternationalAdminPreset.email,
      internationalAdminPathway
    );
    const pathwaySubTrack = getInternationalPathwaySubTrack(internationalAdminPathway);
    const res = login(
      demoInternationalAdminPreset.email,
      demoInternationalAdminPreset.password,
      'admin',
      {
        stream: 'International Curriculum (English Medium)',
        pathway: pathwaySubTrack,
      }
    );
    if (res.ok) {
      navigate(getDashboardPathForRole('admin', pathwaySubTrack), { replace: true });
    }
  };

  const handleDemoAliaAdminQuickLogin = () => {
    if (!aliaAdminPathway || !demoAliaAdminPreset) return;
    setErrorMsg(null);
    setPendingMsg(null);
    aliaAdminService.prepareAliaAdminForLogin(demoAliaAdminPreset.email);
    const res = login(
      demoAliaAdminPreset.email,
      demoAliaAdminPreset.password,
      'admin',
      {
        stream: 'Bangladesh Madrasa Education',
        pathway: demoAliaAdminPreset.pathwayLabel,
      }
    );
    if (res.ok) {
      navigate(getDashboardPathForRole('admin', demoAliaAdminPreset.pathwayLabel), {
        replace: true,
      });
    }
  };

  const handleDemoQawmiAdminQuickLogin = () => {
    if (!qawmiAdminPathway || !demoQawmiAdminPreset) return;
    setErrorMsg(null);
    setPendingMsg(null);
    qawmiAdminService.prepareQawmiAdminForLogin(demoQawmiAdminPreset.email);
    const res = login(
      demoQawmiAdminPreset.email,
      demoQawmiAdminPreset.password,
      'admin',
      {
        stream: 'Bangladesh Madrasa Education',
        pathway: demoQawmiAdminPreset.pathwayLabel,
      }
    );
    if (res.ok) {
      navigate(getDashboardPathForRole('admin', demoQawmiAdminPreset.pathwayLabel), {
        replace: true,
      });
    }
  };

  const handleDemoInternationalStudentQuickLogin = () => {
    if (!internationalStudentPathway || !demoInternationalStudentPreset) return;
    setErrorMsg(null);
    setPendingMsg(null);
    internationalStudentService.prepareIntlStudentAccountForLogin(
      demoInternationalStudentPreset.email,
      demoInternationalStudentPreset.password,
      internationalStudentPathway
    );
    const pathwaySubTrack = getInternationalPathwaySubTrack(internationalStudentPathway);
    const res = login(
      demoInternationalStudentPreset.email,
      demoInternationalStudentPreset.password,
      'student',
      {
        stream: 'International Curriculum (English Medium)',
        pathway: pathwaySubTrack,
      }
    );
    if (res.ok) {
      navigate(getDashboardPathForRole('student', pathwaySubTrack), { replace: true });
    }
  };

  const handleDemoInternationalTeacherQuickLogin = () => {
    if (!internationalTeacherPathway || !demoInternationalTeacherPreset) return;
    setErrorMsg(null);
    setPendingMsg(null);
    internationalTeacherService.prepareIntlTeacherAccountForLogin(
      demoInternationalTeacherPreset.email,
      demoInternationalTeacherPreset.password,
      internationalTeacherPathway
    );
    const pathwaySubTrack = getInternationalPathwaySubTrack(internationalTeacherPathway);
    const res = login(
      demoInternationalTeacherPreset.email,
      demoInternationalTeacherPreset.password,
      'teacher',
      {
        stream: 'International Curriculum (English Medium)',
        pathway: pathwaySubTrack,
      }
    );
    if (res.ok) {
      navigate(getDashboardPathForRole('teacher', pathwaySubTrack), { replace: true });
    }
  };

  const handleDemoAliaStudentQuickLogin = () => {
    if (!aliaStudentPathway || !demoAliaStudentPreset) return;
    setErrorMsg(null);
    setPendingMsg(null);
    aliaStudentService.prepareAliaStudentAccountForLogin(
      demoAliaStudentPreset.email,
      demoAliaStudentPreset.password
    );
    const res = login(
      demoAliaStudentPreset.email,
      demoAliaStudentPreset.password,
      'student',
      {
        stream: 'Bangladesh Madrasa Education',
        pathway: 'Alia',
      }
    );
    if (res.ok) {
      navigate(getDashboardPathForRole('student', 'Alia'), { replace: true });
    }
  };

  const handleDemoQawmiStudentQuickLogin = () => {
    if (!qawmiStudentPathway || !demoQawmiStudentPreset) return;
    setErrorMsg(null);
    setPendingMsg(null);
    qawmiStudentService.prepareQawmiStudentAccountForLogin(
      demoQawmiStudentPreset.email,
      demoQawmiStudentPreset.password
    );
    const res = login(
      demoQawmiStudentPreset.email,
      demoQawmiStudentPreset.password,
      'student',
      {
        stream: 'Bangladesh Madrasa Education',
        pathway: 'Qawmi',
      }
    );
    if (res.ok) {
      navigate(getDashboardPathForRole('student', 'Qawmi'), { replace: true });
    }
  };

  const handleDemoAliaTeacherQuickLogin = () => {
    if (!aliaTeacherPathway || !demoAliaTeacherPreset) return;
    setErrorMsg(null);
    setPendingMsg(null);
    aliaTeacherService.prepareAliaTeacherAccountForLogin(
      demoAliaTeacherPreset.email,
      demoAliaTeacherPreset.password
    );
    const res = login(
      demoAliaTeacherPreset.email,
      demoAliaTeacherPreset.password,
      'teacher',
      {
        stream: 'Bangladesh Madrasa Education',
        pathway: 'Alia',
      }
    );
    if (res.ok) {
      navigate(getDashboardPathForRole('teacher', 'Alia'), { replace: true });
    }
  };

  const handleDemoQawmiTeacherQuickLogin = () => {
    if (!qawmiTeacherPathway || !demoQawmiTeacherPreset) return;
    setErrorMsg(null);
    setPendingMsg(null);
    qawmiTeacherService.prepareQawmiTeacherAccountForLogin(
      demoQawmiTeacherPreset.email,
      demoQawmiTeacherPreset.password
    );
    const res = login(
      demoQawmiTeacherPreset.email,
      demoQawmiTeacherPreset.password,
      'teacher',
      {
        stream: 'Bangladesh Madrasa Education',
        pathway: 'Qawmi',
      }
    );
    if (res.ok) {
      navigate(getDashboardPathForRole('teacher', 'Qawmi'), { replace: true });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setPendingMsg(null);

    if (phase1StudentPathway) {
      studentService.prepareStudentAccountForLogin(identifier, password, phase1StudentPathway);
    }
    if (internationalStudentPathway) {
      internationalStudentService.prepareIntlStudentAccountForLogin(
        identifier,
        password,
        internationalStudentPathway
      );
    }
    if (aliaStudentPathway) {
      aliaStudentService.prepareAliaStudentAccountForLogin(identifier, password);
    }
    if (qawmiStudentPathway) {
      qawmiStudentService.prepareQawmiStudentAccountForLogin(identifier, password);
    }
    if (phase1TeacherPathway) {
      teacherService.prepareTeacherAccountForLogin(identifier, password, phase1TeacherPathway);
    }
    if (internationalTeacherPathway) {
      internationalTeacherService.prepareIntlTeacherAccountForLogin(
        identifier,
        password,
        internationalTeacherPathway
      );
    }
    if (aliaTeacherPathway) {
      aliaTeacherService.prepareAliaTeacherAccountForLogin(identifier, password);
    }
    if (qawmiTeacherPathway) {
      qawmiTeacherService.prepareQawmiTeacherAccountForLogin(identifier, password);
    }
    if (internationalAdminPathway) {
      internationalAdminService.prepareInternationalAdminForLogin(
        identifier,
        internationalAdminPathway
      );
    }
    if (aliaAdminPathway) {
      aliaAdminService.prepareAliaAdminForLogin(identifier);
    }
    if (qawmiAdminPathway) {
      qawmiAdminService.prepareQawmiAdminForLogin(identifier);
    }

    const res = login(
      identifier,
      password,
      selectedRole ?? undefined,
      savedCurriculum
        ? { stream: savedCurriculum.stream, pathway: savedCurriculum.pathway }
        : qawmiStudentPathway || qawmiTeacherPathway || qawmiAdminPathway
          ? {
              stream: 'Bangladesh Madrasa Education',
              pathway: 'Qawmi',
            }
          : aliaStudentPathway || aliaTeacherPathway || aliaAdminPathway
            ? {
                stream: 'Bangladesh Madrasa Education',
                pathway: 'Alia',
              }
          : internationalStudentPathway
            ? {
                stream: 'International Curriculum (English Medium)',
                pathway: getInternationalPathwaySubTrack(internationalStudentPathway),
              }
            : internationalTeacherPathway
              ? {
                  stream: 'International Curriculum (English Medium)',
                  pathway: getInternationalPathwaySubTrack(internationalTeacherPathway),
                }
              : phase1StudentPathway
                ? {
                    stream: 'Bangladesh National Curriculum (NCTB)',
                    pathway: getStudentPathwayLabel(phase1StudentPathway),
                  }
                : phase1TeacherPathway
                  ? {
                      stream: 'Bangladesh National Curriculum (NCTB)',
                      pathway: getTeacherPathwayLabel(phase1TeacherPathway),
                    }
                  : internationalAdminPathway
                    ? {
                        stream: 'International Curriculum (English Medium)',
                        pathway: getInternationalPathwaySubTrack(internationalAdminPathway),
                      }
                    : undefined
    );
    if (res.ok) {
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

  const lockMins = Math.floor(lockSeconds / 60);
  const lockSecs = lockSeconds % 60;
  const pageTitle = selectedRole ? t.login.roleTitles[selectedRole] : t.login.title;
  const pageSubtitle = selectedRole ? t.login.roleSubtitles[selectedRole] : t.login.subtitle;
  const showCouponFooter = selectedRole !== 'admin';

  return (
    <PublicShell>
      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 py-8 sm:py-12">
        <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-stretch">
          {/* Editorial Introduction Column */}
          <section className="lg:col-span-6 flex flex-col justify-between bg-slate-900 text-slate-50 rounded-2xl p-6 sm:p-10">
            <div className="space-y-5">
              <p className="text-xs font-medium tracking-wide text-emerald-300">
                {t.brand.name}
                <span aria-hidden="true"> · </span>
                {t.brand.country}
              </p>
              <h1 className="text-2xl sm:text-3xl font-bold leading-tight text-balance">
                {t.login.heroHeading}
              </h1>
              <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-md">
                {t.login.heroBody}
              </p>
            </div>

            <div className="mt-8 pt-6 border-t border-slate-800 space-y-4">
              <ul className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs sm:text-sm text-slate-300">
                <li>{t.login.streamNctb}</li>
                <li>{t.login.streamInternational}</li>
                <li>{t.login.streamMadrasa}</li>
              </ul>

              {showCouponFooter && (
                <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-800/70 rounded-xl p-4 border border-slate-700/80">
                  <div>
                    <p className="text-sm font-medium text-white">{t.login.haveCouponPrompt}</p>
                    <p className="text-xs text-slate-300 mt-0.5">{t.coupon.formatHint}</p>
                  </div>
                  <Link
                    to={
                      phase1StudentPathway
                        ? `/student/coupon?pathway=${phase1StudentPathway}`
                        : internationalStudentPathway
                          ? `/student-intl/coupon?pathway=${internationalStudentPathway}`
                          : aliaStudentPathway
                            ? '/student-alia/coupon?pathway=alia'
                            : qawmiStudentPathway
                              ? '/student-qawmi/coupon?pathway=qawmi'
                              : aliaTeacherPathway
                                ? '/teacher-alia/coupon?pathway=alia'
                                : qawmiTeacherPathway
                                  ? '/teacher-qawmi/coupon?pathway=qawmi'
                                  : internationalTeacherPathway
                                    ? `/teacher-intl/coupon?pathway=${internationalTeacherPathway}`
                                    : phase1TeacherPathway
                                      ? `/teacher/coupon?pathway=${phase1TeacherPathway}`
                                      : '/coupon'
                    }
                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 min-h-[44px] bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0"
                  >
                    <Ticket className="w-4 h-4" aria-hidden="true" />
                    <span>{t.login.haveCouponLink}</span>
                  </Link>
                </div>
              )}
            </div>
          </section>

          {/* Sign-In Form Card */}
          <section className="lg:col-span-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-10 flex flex-col justify-center transition-colors">
            {(savedCurriculum || selectedRole) && (
              <div className="mb-5 flex items-start justify-between gap-3 px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm">
                <div className="text-slate-700 dark:text-slate-300 min-w-0 leading-relaxed">
                  <span className="text-slate-500 dark:text-slate-400">
                    {t.welcome.selectedContext}:{' '}
                  </span>
                  {savedCurriculum && (
                    <>
                      <span className="font-semibold text-slate-900 dark:text-white">
                        {t.onboarding.streams[savedCurriculum.stream] ?? savedCurriculum.stream}
                      </span>
                      <span aria-hidden="true" className="mx-1.5 text-slate-400 dark:text-slate-500">
                        ·
                      </span>
                      <span className="font-semibold text-emerald-800 dark:text-emerald-400">
                        {t.welcome.subTracks[savedCurriculum.pathway] ?? savedCurriculum.pathway}
                      </span>
                    </>
                  )}
                  {selectedRole && (
                    <>
                      {savedCurriculum && (
                        <span aria-hidden="true" className="mx-1.5 text-slate-400 dark:text-slate-500">
                          ·
                        </span>
                      )}
                      <span className="font-semibold text-sky-800 dark:text-sky-300">
                        {t.welcome.loginRoles[selectedRole]}
                      </span>
                    </>
                  )}
                </div>
                <Link
                  to={savedCurriculum ? '/?step=role' : '/'}
                  className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300 underline underline-offset-4 shrink-0"
                >
                  {t.welcome.changeSelection}
                </Link>
              </div>
            )}

            <div className="mb-6">
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
                {pageTitle}
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1.5">
                {pageSubtitle}
              </p>
            </div>

            {pendingMsg && (
              <div
                role="status"
                className="mb-5 flex items-start gap-3 p-4 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-sm"
              >
                <Clock className="w-5 h-5 text-amber-700 dark:text-amber-400 shrink-0 mt-0.5" aria-hidden="true" />
                <span>{pendingMsg}</span>
              </div>
            )}

            {errorMsg && (
              <div
                role="alert"
                className="mb-5 flex items-start gap-3 p-4 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-red-900 dark:text-red-200 text-sm"
              >
                {lockSeconds > 0 ? (
                  <Lock className="w-5 h-5 text-red-700 dark:text-red-400 shrink-0 mt-0.5" aria-hidden="true" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-red-700 dark:text-red-400 shrink-0 mt-0.5" aria-hidden="true" />
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

            <form onSubmit={handleSubmit} className="space-y-5" noValidate>
              <div>
                <label
                  htmlFor="login-identifier"
                  className="block text-sm font-medium text-slate-800 dark:text-slate-200 mb-1.5"
                >
                  {t.login.identifierLabel}
                </label>
                <input
                  id="login-identifier"
                  type="text"
                  autoComplete="username"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder={t.login.identifierPlaceholder}
                  className="w-full px-3.5 py-2.5 min-h-[44px] bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label
                    htmlFor="login-password"
                    className="block text-sm font-medium text-slate-800 dark:text-slate-200"
                  >
                    {t.login.passwordLabel}
                  </label>
                  <Link
                    to="/change-password"
                    className="text-xs font-medium text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300 underline underline-offset-4 py-1"
                  >
                    {t.login.forgotPasswordLink}
                  </Link>
                </div>
                <div className="relative">
                  <input
                    id="login-password"
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
              <div className="mt-5 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-100">
                    Quick Demo Student Access
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
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
                  className="px-3.5 py-2 min-h-[38px] bg-white dark:bg-slate-900 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0"
                >
                  1-Click Demo Login
                </button>
              </div>
            )}

            {demoTeacherPreset && phase1TeacherPathway && (
              <div className="mt-5 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-100">
                    Quick Demo Teacher Access
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
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
                  className="px-3.5 py-2 min-h-[38px] bg-white dark:bg-slate-900 hover:bg-teal-50 dark:hover:bg-teal-950/60 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0"
                >
                  1-Click Demo Login
                </button>
              </div>
            )}

            {demoInternationalAdminPreset && internationalAdminPathway && (
              <div className="mt-5 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-100">
                    Quick {demoInternationalAdminPreset.panelName} Access
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                    {demoInternationalAdminPreset.email}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleDemoInternationalAdminQuickLogin}
                  className="px-3.5 py-2 min-h-[38px] bg-white dark:bg-slate-900 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0"
                >
                  1-Click Demo Login
                </button>
              </div>
            )}

            {demoAliaAdminPreset && aliaAdminPathway && (
              <div className="mt-5 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-100">
                    {demoAliaAdminPreset.quickAccessTitle}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                    {demoAliaAdminPreset.email}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleDemoAliaAdminQuickLogin}
                  className="px-3.5 py-2 min-h-[38px] bg-white dark:bg-slate-900 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0"
                >
                  1-Click Demo Login
                </button>
              </div>
            )}

            {demoQawmiAdminPreset && qawmiAdminPathway && (
              <div className="mt-5 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-100">
                    {demoQawmiAdminPreset.quickAccessTitle}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                    {demoQawmiAdminPreset.email}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleDemoQawmiAdminQuickLogin}
                  className="px-3.5 py-2 min-h-[38px] bg-white dark:bg-slate-900 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0"
                >
                  1-Click Demo Login
                </button>
              </div>
            )}

            {demoInternationalStudentPreset && internationalStudentPathway && (
              <div className="mt-5 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-100">
                    Quick Demo Student Access
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
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
                  className="px-3.5 py-2 min-h-[38px] bg-white dark:bg-slate-900 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0"
                >
                  1-Click Demo Login
                </button>
              </div>
            )}

            {demoInternationalTeacherPreset && internationalTeacherPathway && (
              <div className="mt-5 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-100">
                    Quick Demo Teacher Access
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
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
                  className="px-3.5 py-2 min-h-[38px] bg-white dark:bg-slate-900 hover:bg-teal-50 dark:hover:bg-teal-950/60 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0"
                >
                  1-Click Demo Login
                </button>
              </div>
            )}

            {demoAliaStudentPreset && aliaStudentPathway && (
              <div className="mt-5 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-100">
                    Quick Demo Student Access
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
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
                  className="px-3.5 py-2 min-h-[38px] bg-white dark:bg-slate-900 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0"
                >
                  1-Click Demo Login
                </button>
              </div>
            )}

            {demoAliaTeacherPreset && aliaTeacherPathway && (
              <div className="mt-5 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-100">
                    Quick Demo Teacher Access
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                    {demoAliaTeacherPreset.fullName} ·{' '}
                    {formatAliaTeacherContextBadge(demoAliaTeacherPreset.primarySubject)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleDemoAliaTeacherQuickLogin}
                  className="px-3.5 py-2 min-h-[38px] bg-white dark:bg-slate-900 hover:bg-teal-50 dark:hover:bg-teal-950/60 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0"
                >
                  1-Click Demo Login
                </button>
              </div>
            )}

            {demoQawmiStudentPreset && qawmiStudentPathway && (
              <div className="mt-5 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-100">
                    Quick Demo Student Access
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
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
                  className="px-3.5 py-2 min-h-[38px] bg-white dark:bg-slate-900 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0"
                >
                  1-Click Demo Login
                </button>
              </div>
            )}

            {demoQawmiTeacherPreset && qawmiTeacherPathway && (
              <div className="mt-5 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-100">
                    Quick Demo Teacher Access
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                    {demoQawmiTeacherPreset.fullName} ·{' '}
                    {formatQawmiTeacherContextBadge(demoQawmiTeacherPreset.primarySubject)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleDemoQawmiTeacherQuickLogin}
                  className="px-3.5 py-2 min-h-[38px] bg-white dark:bg-slate-900 hover:bg-teal-50 dark:hover:bg-teal-950/60 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0"
                >
                  1-Click Demo Login
                </button>
              </div>
            )}

            {showCouponFooter && (
              <div className="mt-6 pt-5 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-sm">
                <span className="text-slate-600 dark:text-slate-400">{t.login.haveCouponPrompt}</span>
                <Link
                  to={
                    phase1StudentPathway
                      ? `/student/coupon?pathway=${phase1StudentPathway}`
                      : internationalStudentPathway
                        ? `/student-intl/coupon?pathway=${internationalStudentPathway}`
                        : aliaStudentPathway
                          ? '/student-alia/coupon?pathway=alia'
                          : qawmiStudentPathway
                            ? '/student-qawmi/coupon?pathway=qawmi'
                            : aliaTeacherPathway
                              ? '/teacher-alia/coupon?pathway=alia'
                              : qawmiTeacherPathway
                                ? '/teacher-qawmi/coupon?pathway=qawmi'
                                : internationalTeacherPathway
                                  ? `/teacher-intl/coupon?pathway=${internationalTeacherPathway}`
                                  : phase1TeacherPathway
                                    ? `/teacher/coupon?pathway=${phase1TeacherPathway}`
                                    : '/coupon'
                  }
                  className="font-semibold text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300 underline underline-offset-4 py-1"
                >
                  {t.login.haveCouponLink}
                </Link>
              </div>
            )}
          </section>
        </div>
      </div>
    </PublicShell>
  );
}
