import React, { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Clock,
  Eye,
  EyeOff,
  Ticket,
  Users,
} from 'lucide-react';
import { PublicShell } from '../../components/PublicShell';
import { getSavedCurriculumPreference } from '../WelcomeCurriculumPage';
import {
  ACADEMIC_TRACK_OPTIONS,
  formatAssignedLevelsSummary,
  getDemoIntlTeacherCouponHint,
  getIntlTeacherBoardName,
  getIntlTeacherPathwayLabel,
  getLevelsForPathway,
  hasUpperAcademicLevel,
  INTL_TEACHER_PRIMARY_SUBJECTS,
  internationalTeacherService,
  resolveInternationalPathway,
  type InternationalAcademicLevel,
  type InternationalPathway,
  type UpperAcademicTrack,
} from '../../services/internationalTeacherService';

type Step = 'coupon' | 'register' | 'submitted';

export function IntlTeacherCouponOnboardingPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const savedPreference = useMemo(() => getSavedCurriculumPreference(), []);
  const pathway: InternationalPathway = useMemo(() => {
    return (
      resolveInternationalPathway(searchParams.get('pathway')) ??
      resolveInternationalPathway(savedPreference?.pathway) ??
      'cambridge'
    );
  }, [searchParams, savedPreference]);

  const pathwayLabel = getIntlTeacherPathwayLabel(pathway);
  const boardName = getIntlTeacherBoardName(pathway);
  const pathwayLevels = getLevelsForPathway(pathway);
  const demoCouponHint = useMemo(() => getDemoIntlTeacherCouponHint(pathway), [pathway]);

  const [step, setStep] = useState<Step>('coupon');
  const [couponCode, setCouponCode] = useState('');
  const [couponError, setCouponError] = useState<string | null>(null);

  // Registration form fields
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [assignedLevels, setAssignedLevels] = useState<InternationalAcademicLevel[]>([
    pathwayLevels[1],
  ]);
  const [primarySubject, setPrimarySubject] = useState<string>(INTL_TEACHER_PRIMARY_SUBJECTS[0]);
  const [academicTrack, setAcademicTrack] = useState<UpperAcademicTrack>('Science');
  const [registerError, setRegisterError] = useState<string | null>(null);
  const [submittedRecord, setSubmittedRecord] = useState<{
    fullName: string;
    email: string;
    couponCode: string;
    assignedLevels: InternationalAcademicLevel[];
    primarySubject: string;
    academicTrack: string;
  } | null>(null);

  const needsUpperTrack = hasUpperAcademicLevel(assignedLevels);

  const toggleLevel = (lvl: InternationalAcademicLevel) => {
    setAssignedLevels((prev) =>
      prev.includes(lvl) ? prev.filter((item) => item !== lvl) : [...prev, lvl]
    );
  };

  const handleValidateCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    setCouponError(null);

    const res = internationalTeacherService.validateCoupon(couponCode, pathway);
    if (!res.ok) {
      setCouponError(res.message);
      return;
    }

    setCouponCode(res.coupon!.code);
    setStep('register');
  };

  const handleRegistrationSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setRegisterError(null);

    const res = internationalTeacherService.submitCouponRegistration({
      pathway,
      couponCode,
      fullName,
      email,
      password,
      assignedLevels,
      primarySubject,
      academicTrack: needsUpperTrack ? academicTrack : 'General',
    });

    if (!res.ok) {
      setRegisterError(res.error);
      return;
    }

    setSubmittedRecord({
      fullName: res.registration.fullName,
      email: res.registration.email,
      couponCode: res.registration.couponCode,
      assignedLevels: pathwayLevels.filter((lvl) => assignedLevels.includes(lvl)),
      primarySubject: res.registration.primarySubject ?? primarySubject,
      academicTrack: res.registration.academicTrack,
    });
    setStep('submitted');
  };

  return (
    <PublicShell>
      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 py-8 sm:py-12">
        <div className="w-full max-w-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden transition-colors">
          {/* Header Banner */}
          <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-teal-100 dark:bg-teal-900/60 border border-teal-200 dark:border-teal-800 text-teal-700 dark:text-teal-300 flex items-center justify-center shrink-0">
                <Users className="w-5 h-5" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-teal-700 dark:text-teal-400">
                  International Curriculum · {pathwayLabel}
                </p>
                <h1 className="text-lg font-bold text-slate-900 dark:text-white truncate">
                  {pathwayLabel} Teacher Onboarding
                </h1>
              </div>
            </div>

            <Link
              to={`/login?role=teacher&pathway=${pathway}`}
              className="text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-teal-700 dark:hover:text-teal-400 inline-flex items-center gap-1 whitespace-nowrap shrink-0"
            >
              <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Teacher Login</span>
            </Link>
          </div>

          {/* 3-Step Indicator */}
          <div className="px-6 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2 text-xs font-medium">
            <span
              className={
                step === 'coupon'
                  ? 'text-teal-700 dark:text-teal-400 font-semibold'
                  : 'text-slate-500 dark:text-slate-400'
              }
            >
              1. Verify Coupon
            </span>
            <span className="text-slate-300 dark:text-slate-700" aria-hidden="true">
              /
            </span>
            <span
              className={
                step === 'register'
                  ? 'text-teal-700 dark:text-teal-400 font-semibold'
                  : 'text-slate-500 dark:text-slate-400'
              }
            >
              2. Faculty Details
            </span>
            <span className="text-slate-300 dark:text-slate-700" aria-hidden="true">
              /
            </span>
            <span
              className={
                step === 'submitted'
                  ? 'text-teal-700 dark:text-teal-400 font-semibold'
                  : 'text-slate-500 dark:text-slate-400'
              }
            >
              3. Pending Review
            </span>
          </div>

          <div className="p-6 sm:p-8">
            {step === 'coupon' && (
              <div className="space-y-5">
                <div className="space-y-1.5">
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                    Enter Your {pathwayLabel} Teacher Coupon
                  </h2>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Use the single-use <span className="font-mono font-semibold">T-XXXXX</span>{' '}
                    faculty invite code issued by your {pathwayLabel} Admin ({boardName}).
                  </p>
                </div>

                {couponError && (
                  <div
                    role="alert"
                    className="flex items-start gap-2.5 p-3.5 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-red-900 dark:text-red-200 text-sm"
                  >
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
                    <span>{couponError}</span>
                  </div>
                )}

                <form onSubmit={handleValidateCoupon} className="space-y-4" noValidate>
                  <div>
                    <label
                      htmlFor="intl-teacher-coupon-input"
                      className="block text-sm font-medium text-slate-800 dark:text-slate-200 mb-1.5"
                    >
                      Teacher Coupon Code
                    </label>
                    <input
                      id="intl-teacher-coupon-input"
                      type="text"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                      placeholder={demoCouponHint}
                      autoFocus
                      className="w-full px-3.5 py-2.5 min-h-[46px] bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-base font-mono tracking-wider text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-600"
                    />
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">
                      Format: T-XXXXX (valid for 48 hours, scoped strictly to {pathwayLabel}).
                    </p>
                  </div>

                  <button
                    type="submit"
                    className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 min-h-[46px] bg-teal-700 hover:bg-teal-800 dark:bg-teal-600 dark:hover:bg-teal-500 text-white text-sm font-semibold rounded-lg transition-colors"
                  >
                    <span>Verify Teacher Coupon</span>
                    <ArrowRight className="w-4 h-4" aria-hidden="true" />
                  </button>
                </form>

                {/* Demo Helper Bar */}
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="text-xs text-slate-600 dark:text-slate-300">
                    <span className="font-semibold text-slate-900 dark:text-white">
                      Demo {pathwayLabel} Teacher Coupon:
                    </span>{' '}
                    <span className="font-mono font-semibold text-teal-700 dark:text-teal-400">
                      {demoCouponHint}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setCouponCode(demoCouponHint);
                      setCouponError(null);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[34px] text-xs font-semibold text-teal-700 dark:text-teal-300 bg-white dark:bg-slate-900 hover:bg-teal-50 dark:hover:bg-teal-950/60 border border-teal-200 dark:border-teal-800 rounded-lg transition-colors whitespace-nowrap shrink-0"
                  >
                    <Ticket className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Use Demo Coupon</span>
                  </button>
                </div>
              </div>
            )}

            {step === 'register' && (
              <div className="space-y-5">
                <div className="flex items-center justify-between gap-2 p-3 rounded-xl bg-teal-50 dark:bg-teal-950/50 border border-teal-200 dark:border-teal-800 text-xs text-teal-900 dark:text-teal-200">
                  <span className="inline-flex items-center gap-2 font-medium">
                    <CheckCircle2
                      className="w-4 h-4 text-teal-700 dark:text-teal-400 shrink-0"
                      aria-hidden="true"
                    />
                    Verified Coupon: <strong className="font-mono">{couponCode}</strong> (
                    {pathwayLabel})
                  </span>
                  <button
                    type="button"
                    onClick={() => setStep('coupon')}
                    className="font-semibold underline underline-offset-2"
                  >
                    Change
                  </button>
                </div>

                {registerError && (
                  <div
                    role="alert"
                    className="flex items-start gap-2.5 p-3.5 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-red-900 dark:text-red-200 text-sm"
                  >
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
                    <span>{registerError}</span>
                  </div>
                )}

                <form onSubmit={handleRegistrationSubmit} className="space-y-4" noValidate>
                  <div>
                    <label
                      htmlFor="intl-teacher-reg-name"
                      className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
                    >
                      Full Name *
                    </label>
                    <input
                      id="intl-teacher-reg-name"
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. Dr. Farhana Rahman"
                      className="w-full px-3.5 py-2.5 min-h-[44px] bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-600"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label
                        htmlFor="intl-teacher-reg-email"
                        className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
                      >
                        Email Address *
                      </label>
                      <input
                        id="intl-teacher-reg-email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder={`faculty@${pathway}-school.edu.bd`}
                        className="w-full px-3.5 py-2.5 min-h-[44px] bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-600"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="intl-teacher-reg-password"
                        className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
                      >
                        Password *
                      </label>
                      <div className="relative">
                        <input
                          id="intl-teacher-reg-password"
                          type={showPassword ? 'text' : 'password'}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Minimum 8 characters"
                          className="w-full pl-3.5 pr-11 py-2.5 min-h-[44px] bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-600"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((prev) => !prev)}
                          aria-label={showPassword ? 'Hide password' : 'Show password'}
                          className="absolute right-1 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                        >
                          {showPassword ? (
                            <EyeOff className="w-4 h-4" aria-hidden="true" />
                          ) : (
                            <Eye className="w-4 h-4" aria-hidden="true" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Assigned Academic Levels Multi-Select */}
                  <div>
                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                      Assigned Academic Levels ({pathwayLabel}) *
                    </p>
                    <div className="space-y-2">
                      {pathwayLevels.map((lvl) => {
                        const selected = assignedLevels.includes(lvl);
                        return (
                          <button
                            key={lvl}
                            type="button"
                            onClick={() => toggleLevel(lvl)}
                            aria-pressed={selected}
                            className={`w-full px-3.5 py-2.5 min-h-[44px] rounded-xl border text-left text-sm font-medium flex items-center justify-between gap-3 transition-colors ${
                              selected
                                ? 'bg-teal-50 dark:bg-teal-950/60 border-teal-500 dark:border-teal-600 text-teal-900 dark:text-teal-200 font-semibold'
                                : 'bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-teal-400'
                            }`}
                          >
                            <span>{lvl}</span>
                            <span
                              className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 ${
                                selected
                                  ? 'bg-teal-700 border-teal-700 text-white'
                                  : 'border-slate-300 dark:border-slate-600'
                              }`}
                            >
                              {selected && <Check className="w-3.5 h-3.5" aria-hidden="true" />}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Primary Subject + Conditional Academic Track */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className={needsUpperTrack ? '' : 'sm:col-span-2'}>
                      <label
                        htmlFor="intl-teacher-reg-subject"
                        className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
                      >
                        Primary Subject *
                      </label>
                      <select
                        id="intl-teacher-reg-subject"
                        value={primarySubject}
                        onChange={(e) => setPrimarySubject(e.target.value)}
                        className="w-full px-3 py-2.5 min-h-[44px] bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-600"
                      >
                        {INTL_TEACHER_PRIMARY_SUBJECTS.map((subj) => (
                          <option key={subj} value={subj}>
                            {subj}
                          </option>
                        ))}
                      </select>
                    </div>

                    {needsUpperTrack && (
                      <div>
                        <label
                          htmlFor="intl-teacher-reg-track"
                          className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
                        >
                          Academic Track *
                        </label>
                        <select
                          id="intl-teacher-reg-track"
                          value={academicTrack}
                          onChange={(e) => setAcademicTrack(e.target.value as UpperAcademicTrack)}
                          className="w-full px-3 py-2.5 min-h-[44px] bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-600"
                        >
                          {ACADEMIC_TRACK_OPTIONS.map((track) => (
                            <option key={track} value={track}>
                              {track}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>

                  {!needsUpperTrack && assignedLevels.length > 0 && (
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Academic Track is automatically set to <strong>General</strong> for Grade 1–8
                      (Primary / Lower Secondary) faculty.
                    </p>
                  )}

                  <button
                    type="submit"
                    className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 min-h-[46px] bg-teal-700 hover:bg-teal-800 dark:bg-teal-600 dark:hover:bg-teal-500 text-white text-sm font-semibold rounded-lg transition-colors"
                  >
                    <span>Submit for {pathwayLabel} Admin Approval</span>
                    <ArrowRight className="w-4 h-4" aria-hidden="true" />
                  </button>
                </form>
              </div>
            )}

            {step === 'submitted' && submittedRecord && (
              <div className="space-y-5 text-center py-2">
                <div className="w-14 h-14 rounded-2xl bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800 text-teal-700 dark:text-teal-400 flex items-center justify-center mx-auto">
                  <Clock className="w-7 h-7" aria-hidden="true" />
                </div>

                <div className="space-y-1.5">
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                    Faculty Registration Submitted
                  </h2>
                  <p className="text-sm text-slate-600 dark:text-slate-400 max-w-md mx-auto">
                    Your {pathwayLabel} Teacher application is now in the{' '}
                    <strong>{pathwayLabel} Admin Pending Approvals</strong> queue (48-hour review
                    window).
                  </p>
                </div>

                <dl className="text-left bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-xl p-4 divide-y divide-slate-200/70 dark:divide-slate-700 text-xs sm:text-sm">
                  <div className="py-2 flex items-center justify-between gap-3">
                    <dt className="text-slate-500 dark:text-slate-400">Applicant</dt>
                    <dd className="font-semibold text-slate-900 dark:text-white">
                      {submittedRecord.fullName}
                    </dd>
                  </div>
                  <div className="py-2 flex items-center justify-between gap-3">
                    <dt className="text-slate-500 dark:text-slate-400">Coupon Redeemed</dt>
                    <dd className="font-mono font-semibold text-teal-700 dark:text-teal-400">
                      {submittedRecord.couponCode}
                    </dd>
                  </div>
                  <div className="py-2 flex items-center justify-between gap-3">
                    <dt className="text-slate-500 dark:text-slate-400">Primary Subject</dt>
                    <dd className="font-semibold text-slate-900 dark:text-white">
                      {submittedRecord.primarySubject}
                    </dd>
                  </div>
                  <div className="py-2 flex items-center justify-between gap-3">
                    <dt className="text-slate-500 dark:text-slate-400">Assigned Levels</dt>
                    <dd className="font-semibold text-slate-900 dark:text-white text-right">
                      {formatAssignedLevelsSummary(submittedRecord.assignedLevels)}
                    </dd>
                  </div>
                  <div className="py-2 flex items-center justify-between gap-3">
                    <dt className="text-slate-500 dark:text-slate-400">Academic Track</dt>
                    <dd className="font-semibold text-slate-900 dark:text-white">
                      {submittedRecord.academicTrack}
                    </dd>
                  </div>
                </dl>

                <div className="flex flex-col sm:flex-row items-center gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => navigate(`/login?role=teacher&pathway=${pathway}`)}
                    className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 min-h-[46px] bg-teal-700 hover:bg-teal-800 dark:bg-teal-600 dark:hover:bg-teal-500 text-white text-sm font-semibold rounded-lg transition-colors"
                  >
                    <span>Continue to Demo Login</span>
                    <ArrowRight className="w-4 h-4" aria-hidden="true" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </PublicShell>
  );
}
