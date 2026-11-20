import React, { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Briefcase,
  CheckCircle2,
  Clock,
  Eye,
  EyeOff,
  ShieldCheck,
  Ticket,
} from 'lucide-react';
import { PublicShell } from '../../components/PublicShell';
import {
  formatAssignedClassesSummary,
  getDemoTeacherCouponHint,
  getTeacherPathwayLabel,
  hasSeniorSecondaryClass,
  resolveTeacherPathway,
  TEACHER_CLASS_LEVELS,
  TEACHER_GROUPS,
  TEACHER_SUBJECT_OPTIONS,
  teacherService,
  type TeacherClassLevel,
  type TeacherGroup,
  type TeacherPathway,
} from '../../services/teacherService';
import { getSavedCurriculumPreference } from '../WelcomeCurriculumPage';

export function TeacherCouponOnboardingPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const savedPreference = useMemo(() => getSavedCurriculumPreference(), []);
  const initialPathway: TeacherPathway =
    resolveTeacherPathway(searchParams.get('pathway')) ??
    resolveTeacherPathway(savedPreference?.pathway) ??
    'bangla_version';

  const [pathway, setPathway] = useState<TeacherPathway>(initialPathway);
  const [step, setStep] = useState<'coupon' | 'register' | 'submitted'>('coupon');

  // Step 1: Coupon validation
  const [couponInput, setCouponInput] = useState('');
  const [verifiedCode, setVerifiedCode] = useState<string | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);

  // Step 2: Teacher Registration Form
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [assignedClasses, setAssignedClasses] = useState<TeacherClassLevel[]>([9, 10]);
  const [primarySubject, setPrimarySubject] = useState('Physics');
  const [academicGroup, setAcademicGroup] = useState<TeacherGroup>('Science');
  const [formError, setFormError] = useState<string | null>(null);

  // Step 3: Submitted confirmation state
  const [submittedSummary, setSubmittedSummary] = useState<{
    fullName: string;
    email: string;
    couponCode: string;
    classesSummary: string;
    subject: string;
    group: TeacherGroup | null;
  } | null>(null);

  const pathwayLabel = getTeacherPathwayLabel(pathway);
  const demoCouponHint = getDemoTeacherCouponHint(pathway);
  const showGroupField = hasSeniorSecondaryClass(assignedClasses);

  const handlePathwaySwitch = (nextPathway: TeacherPathway) => {
    setPathway(nextPathway);
    setSearchParams({ pathway: nextPathway }, { replace: true });
    setCouponError(null);
    setFormError(null);
    if (step === 'register') {
      setStep('coupon');
      setVerifiedCode(null);
    }
  };

  const handleToggleClass = (cls: TeacherClassLevel) => {
    setAssignedClasses((prev) =>
      prev.includes(cls) ? prev.filter((item) => item !== cls) : [...prev, cls].sort((a, b) => a - b)
    );
  };

  const handleVerifyCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    setCouponError(null);
    const res = teacherService.validateTeacherCoupon(couponInput, pathway);
    if (!res.ok) {
      setCouponError(res.message);
      return;
    }
    setVerifiedCode(res.coupon.code);
    setStep('register');
  };

  const handleRegistrationSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!verifiedCode) {
      setStep('coupon');
      return;
    }

    const res = teacherService.submitTeacherCouponRegistration({
      pathway,
      couponCode: verifiedCode,
      fullName,
      email,
      password,
      assignedClasses,
      primarySubject,
      academicGroup: showGroupField ? academicGroup : null,
    });

    if (!res.ok) {
      setFormError(res.error);
      return;
    }

    setSubmittedSummary({
      fullName: res.registration.fullName,
      email: res.registration.email,
      couponCode: res.registration.couponCode,
      classesSummary: formatAssignedClassesSummary(assignedClasses),
      subject: primarySubject,
      group: showGroupField ? academicGroup : null,
    });
    setStep('submitted');
  };

  return (
    <PublicShell>
      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 py-8 sm:py-12">
        <div className="w-full max-w-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden transition-colors">
          {/* Card Header */}
          <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-teal-100 dark:bg-teal-900/60 border border-teal-200 dark:border-teal-700/70 text-teal-700 dark:text-teal-300 flex items-center justify-center shrink-0">
                <Briefcase className="w-5 h-5" aria-hidden="true" />
              </div>
              <div>
                <p className="text-xs font-semibold text-teal-700 dark:text-teal-400">
                  NCTB Teacher Registration
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {step === 'coupon'
                    ? 'Step 1 of 2 · Verify Teacher Coupon'
                    : step === 'register'
                      ? 'Step 2 of 2 · Faculty Profile Details'
                      : 'Application Submitted'}
                </p>
              </div>
            </div>

            {step !== 'submitted' ? (
              <div
                role="radiogroup"
                aria-label="Select NCTB teacher pathway"
                className="inline-flex items-center gap-1 p-1 bg-slate-200/70 dark:bg-slate-800 rounded-xl self-start sm:self-auto"
              >
                {(
                  [
                    { id: 'bangla_version', label: 'Bangla Version' },
                    { id: 'english_version', label: 'English Version' },
                  ] as const
                ).map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    role="radio"
                    aria-checked={pathway === option.id}
                    onClick={() => handlePathwaySwitch(option.id)}
                    className={`px-3 py-1.5 min-h-[34px] text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                      pathway === option.id
                        ? 'bg-white dark:bg-slate-900 text-teal-800 dark:text-teal-300 shadow-xs'
                        : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800 text-xs font-semibold text-teal-800 dark:text-teal-300">
                <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />
                {pathwayLabel}
              </span>
            )}
          </div>

          {/* Step 1: Coupon Code Entry */}
          {step === 'coupon' && (
            <div className="p-6 sm:p-8 space-y-5">
              <div className="space-y-1.5">
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
                  Enter your {pathwayLabel} Teacher Coupon
                </h1>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Redeem your active 5-digit faculty onboarding code (<span className="font-mono">T-XXXXX</span>) issued by your {pathwayLabel} administrator.
                </p>
              </div>

              {couponError && (
                <div
                  role="alert"
                  className="flex items-start gap-2.5 p-3.5 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-red-900 dark:text-red-200 text-sm"
                >
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-700 dark:text-red-400" aria-hidden="true" />
                  <span>{couponError}</span>
                </div>
              )}

              <form onSubmit={handleVerifyCoupon} className="space-y-4" noValidate>
                <div>
                  <label
                    htmlFor="teacher-coupon-code"
                    className="block text-sm font-medium text-slate-800 dark:text-slate-200 mb-1.5"
                  >
                    Teacher Coupon Code
                  </label>
                  <input
                    id="teacher-coupon-code"
                    type="text"
                    autoFocus
                    value={couponInput}
                    onChange={(e) => setCouponInput(e.target.value)}
                    placeholder={`e.g. ${demoCouponHint}`}
                    className="w-full px-4 py-3 min-h-[48px] bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-base font-mono tracking-wider uppercase text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-600"
                  />
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">
                    Demo {pathwayLabel} teacher code:{' '}
                    <button
                      type="button"
                      onClick={() => setCouponInput(demoCouponHint)}
                      className="font-mono font-semibold text-teal-700 dark:text-teal-400 underline underline-offset-2"
                    >
                      {demoCouponHint}
                    </button>
                  </p>
                </div>

                <button
                  type="submit"
                  className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 min-h-[48px] bg-teal-700 hover:bg-teal-800 dark:bg-teal-600 dark:hover:bg-teal-500 text-white text-sm font-semibold rounded-lg transition-colors"
                >
                  <Ticket className="w-4 h-4" aria-hidden="true" />
                  <span>Verify Teacher Coupon</span>
                </button>
              </form>

              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs sm:text-sm">
                <Link
                  to="/"
                  className="inline-flex items-center gap-1.5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-medium"
                >
                  <ArrowLeft className="w-4 h-4" aria-hidden="true" />
                  <span>Back to Stream Selection</span>
                </Link>
                <Link
                  to={`/login?role=teacher&pathway=${pathway}`}
                  className="font-semibold text-teal-700 dark:text-teal-400 hover:underline underline-offset-4"
                >
                  Go to Demo Login
                </Link>
              </div>
            </div>
          )}

          {/* Step 2: Teacher Registration Form */}
          {step === 'register' && verifiedCode && (
            <div className="p-6 sm:p-8 space-y-5">
              <div className="flex items-center justify-between gap-2 p-3 rounded-xl bg-teal-50/80 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 text-xs">
                <span className="inline-flex items-center gap-2 font-semibold text-teal-900 dark:text-teal-200">
                  <CheckCircle2 className="w-4 h-4 text-teal-700 dark:text-teal-400 shrink-0" aria-hidden="true" />
                  Verified {pathwayLabel} Coupon:{' '}
                  <span className="font-mono">{verifiedCode}</span>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setStep('coupon');
                    setVerifiedCode(null);
                  }}
                  className="text-teal-700 dark:text-teal-300 font-semibold hover:underline"
                >
                  Change
                </button>
              </div>

              <div>
                <h1 className="text-xl font-bold text-slate-900 dark:text-white">
                  Complete Faculty Registration
                </h1>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1">
                  Your application will be queued in {pathwayLabel} Admin Pending Approvals with a 48-hour review countdown.
                </p>
              </div>

              {formError && (
                <div
                  role="alert"
                  className="flex items-start gap-2.5 p-3.5 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-red-900 dark:text-red-200 text-sm"
                >
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-700 dark:text-red-400" aria-hidden="true" />
                  <span>{formError}</span>
                </div>
              )}

              <form onSubmit={handleRegistrationSubmit} className="space-y-4" noValidate>
                <div>
                  <label
                    htmlFor="teacher-reg-name"
                    className="block text-sm font-medium text-slate-800 dark:text-slate-200 mb-1.5"
                  >
                    Full Name
                  </label>
                  <input
                    id="teacher-reg-name"
                    type="text"
                    autoFocus
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Dr. Sabrina Karim"
                    className="w-full px-3.5 py-2.5 min-h-[44px] bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-600"
                  />
                </div>

                <div>
                  <label
                    htmlFor="teacher-reg-email"
                    className="block text-sm font-medium text-slate-800 dark:text-slate-200 mb-1.5"
                  >
                    Email Address
                  </label>
                  <input
                    id="teacher-reg-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. sabrina.karim@school.edu.bd"
                    className="w-full px-3.5 py-2.5 min-h-[44px] bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-600"
                  />
                </div>

                <div>
                  <label
                    htmlFor="teacher-reg-password"
                    className="block text-sm font-medium text-slate-800 dark:text-slate-200 mb-1.5"
                  >
                    Password
                  </label>
                  <div className="relative">
                    <input
                      id="teacher-reg-password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Minimum 8 characters"
                      className="w-full pl-3.5 pr-12 py-2.5 min-h-[44px] bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-600"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      className="absolute right-1 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" aria-hidden="true" />
                      ) : (
                        <Eye className="w-4 h-4" aria-hidden="true" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Assigned Classes Multi-Select */}
                <fieldset className="space-y-2">
                  <legend className="text-sm font-medium text-slate-800 dark:text-slate-200">
                    Assigned Classes (Class 1–12)
                    <span className="ml-2 text-xs font-normal text-slate-500 dark:text-slate-400">
                      Selected: {formatAssignedClassesSummary(assignedClasses)}
                    </span>
                  </legend>
                  <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                    {TEACHER_CLASS_LEVELS.map((cls) => {
                      const selected = assignedClasses.includes(cls);
                      return (
                        <button
                          key={cls}
                          type="button"
                          aria-pressed={selected}
                          onClick={() => handleToggleClass(cls)}
                          className={`px-2 py-2 min-h-[38px] text-xs font-semibold rounded-lg border transition-colors tabular-nums whitespace-nowrap ${
                            selected
                              ? 'bg-teal-700 dark:bg-teal-600 text-white border-teal-700 dark:border-teal-600'
                              : 'bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:border-teal-500'
                          }`}
                        >
                          Class {cls}
                        </button>
                      );
                    })}
                  </div>
                </fieldset>

                <div className={`grid grid-cols-1 ${showGroupField ? 'sm:grid-cols-2' : ''} gap-4`}>
                  <div>
                    <label
                      htmlFor="teacher-reg-subject"
                      className="block text-sm font-medium text-slate-800 dark:text-slate-200 mb-1.5"
                    >
                      Primary Subject / Department
                    </label>
                    <select
                      id="teacher-reg-subject"
                      value={primarySubject}
                      onChange={(e) => setPrimarySubject(e.target.value)}
                      className="w-full px-3.5 py-2.5 min-h-[44px] bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-600"
                    >
                      {TEACHER_SUBJECT_OPTIONS.map((subj) => (
                        <option key={subj} value={subj}>
                          {subj}
                        </option>
                      ))}
                    </select>
                  </div>

                  {showGroupField && (
                    <div>
                      <label
                        htmlFor="teacher-reg-group"
                        className="block text-sm font-medium text-slate-800 dark:text-slate-200 mb-1.5"
                      >
                        Academic Group (Classes 9–12)
                      </label>
                      <select
                        id="teacher-reg-group"
                        value={academicGroup}
                        onChange={(e) => setAcademicGroup(e.target.value as TeacherGroup)}
                        className="w-full px-3.5 py-2.5 min-h-[44px] bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-600"
                      >
                        {TEACHER_GROUPS.map((g) => (
                          <option key={g} value={g}>
                            {g}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 min-h-[48px] bg-teal-700 hover:bg-teal-800 dark:bg-teal-600 dark:hover:bg-teal-500 text-white text-sm font-semibold rounded-lg transition-colors"
                >
                  <span>Submit Teacher Application</span>
                  <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </button>
              </form>
            </div>
          )}

          {/* Step 3: Confirmation Screen */}
          {step === 'submitted' && submittedSummary && (
            <div className="p-6 sm:p-8 text-center space-y-6">
              <div className="w-12 h-12 rounded-2xl bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800 flex items-center justify-center mx-auto">
                <Clock className="w-6 h-6 text-teal-700 dark:text-teal-400" aria-hidden="true" />
              </div>

              <div className="space-y-1.5">
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
                  Teacher Application Submitted
                </h1>
                <p className="text-sm text-slate-600 dark:text-slate-400 max-w-md mx-auto">
                  Your faculty registration is now queued in the{' '}
                  <strong className="text-slate-900 dark:text-white">{pathwayLabel}</strong> Admin
                  Pending Approvals list with a 48-hour review countdown.
                </p>
              </div>

              <dl className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl divide-y divide-slate-200 dark:divide-slate-700 text-sm text-left">
                <div className="px-4 py-3 flex items-center justify-between gap-4">
                  <dt className="text-slate-500 dark:text-slate-400">Faculty Name</dt>
                  <dd className="font-semibold text-slate-900 dark:text-white">
                    {submittedSummary.fullName}
                  </dd>
                </div>
                <div className="px-4 py-3 flex items-center justify-between gap-4">
                  <dt className="text-slate-500 dark:text-slate-400">Email</dt>
                  <dd className="font-medium text-slate-800 dark:text-slate-200">
                    {submittedSummary.email}
                  </dd>
                </div>
                <div className="px-4 py-3 flex items-center justify-between gap-4">
                  <dt className="text-slate-500 dark:text-slate-400">Teaching Scope</dt>
                  <dd className="font-semibold text-teal-700 dark:text-teal-400">
                    {pathwayLabel} • {submittedSummary.subject} ({submittedSummary.classesSummary}
                    {submittedSummary.group ? ` · ${submittedSummary.group}` : ''})
                  </dd>
                </div>
                <div className="px-4 py-3 flex items-center justify-between gap-4">
                  <dt className="text-slate-500 dark:text-slate-400">Coupon Redeemed</dt>
                  <dd className="font-mono font-semibold text-slate-900 dark:text-white">
                    {submittedSummary.couponCode}
                  </dd>
                </div>
              </dl>

              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => navigate(`/login?role=teacher&pathway=${pathway}`)}
                  className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 min-h-[48px] bg-teal-700 hover:bg-teal-800 dark:bg-teal-600 dark:hover:bg-teal-500 text-white text-sm font-semibold rounded-lg transition-colors"
                >
                  <span>Continue to Demo Login</span>
                  <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </button>
                <Link
                  to="/"
                  className="block text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                >
                  Return to Stream Selection
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </PublicShell>
  );
}
