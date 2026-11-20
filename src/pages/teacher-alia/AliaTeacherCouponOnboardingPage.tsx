import React, { useMemo, useState } from 'react';
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
  Ticket,
} from 'lucide-react';
import { PublicShell } from '../../components/PublicShell';
import {
  ALIA_TEACHER_MARHALA_OPTIONS,
  ALIA_TEACHER_PRIMARY_SUBJECTS,
  aliaTeacherService,
  formatAssignedAliaMarhalasSummary,
  getDepartmentsForAssignedMarhalas,
  getDemoAliaTeacherCouponHint,
  getShortAliaMarhalaLabel,
  type AliaDepartment,
  type AliaMarhala,
  type AliaPendingRecord,
} from '../../services/aliaTeacherService';

type Step = 'coupon' | 'register' | 'submitted';

export function AliaTeacherCouponOnboardingPage() {
  const navigate = useNavigate();

  const [step, setStep] = useState<Step>('coupon');
  const [couponCode, setCouponCode] = useState('');
  const [couponError, setCouponError] = useState<string | null>(null);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [assignedMarhalas, setAssignedMarhalas] = useState<AliaMarhala[]>([
    'Dakhil (Classes 6–10)',
    'Alim (Classes 11–12)',
  ]);
  const [primarySubject, setPrimarySubject] = useState<string>(ALIA_TEACHER_PRIMARY_SUBJECTS[0]);
  const [department, setDepartment] = useState<AliaDepartment>('General');
  const [registerError, setRegisterError] = useState<string | null>(null);

  const [submittedRecord, setSubmittedRecord] = useState<AliaPendingRecord | null>(null);

  const demoCouponHint = useMemo(() => getDemoAliaTeacherCouponHint(), []);
  const allowedDepartments = useMemo(
    () => getDepartmentsForAssignedMarhalas(assignedMarhalas),
    [assignedMarhalas]
  );

  const handleToggleMarhala = (marhala: AliaMarhala) => {
    setAssignedMarhalas((prev) => {
      const exists = prev.includes(marhala);
      const next = exists ? prev.filter((item) => item !== marhala) : [...prev, marhala];
      const nextAllowed = getDepartmentsForAssignedMarhalas(next);
      if (nextAllowed.length > 0 && !nextAllowed.includes(department)) {
        setDepartment(nextAllowed[0]);
      }
      return next;
    });
  };

  const handleVerifyCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    setCouponError(null);

    const result = aliaTeacherService.validateCoupon(couponCode);
    if (!result.ok || !result.coupon) {
      setCouponError(result.message);
      return;
    }

    setCouponCode(result.coupon.code);
    setStep('register');
  };

  const handleUseDemoCoupon = () => {
    const code = getDemoAliaTeacherCouponHint();
    setCouponCode(code);
    setCouponError(null);
    const result = aliaTeacherService.validateCoupon(code);
    if (result.ok && result.coupon) {
      setStep('register');
    } else {
      setCouponError(result.message);
    }
  };

  const handleRegistrationSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setRegisterError(null);

    const res = aliaTeacherService.submitCouponRegistration({
      couponCode,
      fullName,
      email,
      password,
      assignedMarhalas,
      primarySubject,
      department,
    });

    if (!res.ok) {
      setRegisterError(res.error);
      return;
    }

    setSubmittedRecord(res.registration);
    setStep('submitted');
  };

  return (
    <PublicShell>
      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 py-8 sm:py-12">
        <div className="w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden transition-colors">
          {/* Header Banner */}
          <div className="px-6 sm:px-8 py-6 bg-slate-900 text-white border-b border-slate-800">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-teal-600/20 border border-teal-500/40 text-teal-300 flex items-center justify-center shrink-0">
                  <GraduationCap className="w-5 h-5" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-teal-300">
                    Bangladesh Madrasa Education · Alia Madrasa
                  </p>
                  <h1 className="text-lg sm:text-xl font-bold tracking-tight">
                    Alia Madrasa Teacher Coupon Onboarding
                  </h1>
                </div>
              </div>

              <Link
                to="/login?role=teacher&pathway=alia"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-300 hover:text-white underline underline-offset-4 shrink-0"
              >
                <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Teacher Login</span>
              </Link>
            </div>

            {/* Stepper */}
            <div className="mt-5 grid grid-cols-3 gap-2 text-xs">
              {[
                { key: 'coupon', label: '1. Verify T-XXXXX' },
                { key: 'register', label: '2. Faculty Profile' },
                { key: 'submitted', label: '3. 48h Approval' },
              ].map((item, idx) => {
                const currentIdx = step === 'coupon' ? 0 : step === 'register' ? 1 : 2;
                const isDone = idx < currentIdx;
                const isCurrent = idx === currentIdx;
                return (
                  <div
                    key={item.key}
                    className={`px-3 py-2 rounded-lg border font-medium flex items-center gap-2 ${
                      isCurrent
                        ? 'bg-teal-600 border-teal-500 text-white'
                        : isDone
                          ? 'bg-teal-950/60 border-teal-800 text-teal-200'
                          : 'bg-slate-800/70 border-slate-700 text-slate-400'
                    }`}
                  >
                    {isDone && <Check className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />}
                    <span className="truncate">{item.label}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="p-6 sm:p-8">
            {step === 'coupon' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                    Enter Your Alia Madrasa Teacher Coupon
                  </h2>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                    Teacher coupons are issued by your Alia Madrasa Administrator in the{' '}
                    <span className="font-mono font-semibold text-teal-700 dark:text-teal-400">
                      T-XXXXX
                    </span>{' '}
                    format and remain valid for 48 hours.
                  </p>
                </div>

                {couponError && (
                  <div
                    role="alert"
                    className="flex items-start gap-3 p-3.5 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-red-900 dark:text-red-200 text-sm"
                  >
                    <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" aria-hidden="true" />
                    <span>{couponError}</span>
                  </div>
                )}

                <form onSubmit={handleVerifyCoupon} className="space-y-4">
                  <div>
                    <label
                      htmlFor="alia-teacher-coupon-input"
                      className="block text-sm font-medium text-slate-800 dark:text-slate-200 mb-1.5"
                    >
                      Teacher Coupon Code
                    </label>
                    <input
                      id="alia-teacher-coupon-input"
                      type="text"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                      placeholder="T-74310"
                      autoFocus
                      className="w-full px-4 py-3 min-h-[48px] bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl font-mono text-base tracking-widest text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-600"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 min-h-[48px] rounded-xl bg-teal-700 hover:bg-teal-800 dark:bg-teal-600 dark:hover:bg-teal-500 text-white text-sm font-semibold transition-colors"
                  >
                    <span>Verify Teacher Coupon</span>
                    <ArrowRight className="w-4 h-4" aria-hidden="true" />
                  </button>
                </form>

                {/* Demo Coupon Helper */}
                <div className="p-4 rounded-xl bg-teal-50/70 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-teal-900 dark:text-teal-200 flex items-center gap-1.5">
                      <Ticket className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Demo Alia Teacher Coupon Available</span>
                    </p>
                    <p className="text-xs text-teal-800/80 dark:text-teal-300/80 mt-0.5">
                      Active code: <span className="font-mono font-bold">{demoCouponHint}</span>{' '}
                      (Alia Madrasa Faculty)
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleUseDemoCoupon}
                    className="px-3.5 py-2 min-h-[38px] rounded-lg bg-white dark:bg-slate-900 border border-teal-300 dark:border-teal-700 hover:bg-teal-100 dark:hover:bg-teal-900/60 text-teal-800 dark:text-teal-200 text-xs font-semibold transition-colors whitespace-nowrap shrink-0"
                  >
                    Use Demo Coupon
                  </button>
                </div>
              </div>
            )}

            {step === 'register' && (
              <div className="space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-slate-200 dark:border-slate-800">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                      Complete Alia Madrasa Faculty Registration
                    </h2>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                      Verified Coupon:{' '}
                      <span className="font-mono font-bold text-teal-700 dark:text-teal-400">
                        {couponCode}
                      </span>{' '}
                      · Pathway: Alia Madrasa
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setStep('coupon');
                      setRegisterError(null);
                    }}
                    className="text-xs font-semibold text-teal-700 dark:text-teal-400 hover:underline underline-offset-4"
                  >
                    Change Coupon
                  </button>
                </div>

                {registerError && (
                  <div
                    role="alert"
                    className="flex items-start gap-3 p-3.5 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-red-900 dark:text-red-200 text-sm"
                  >
                    <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" aria-hidden="true" />
                    <span>{registerError}</span>
                  </div>
                )}

                <form onSubmit={handleRegistrationSubmit} className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label
                        htmlFor="alia-teacher-fullname"
                        className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
                      >
                        Full Name
                      </label>
                      <input
                        id="alia-teacher-fullname"
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="e.g., Maulana Abdul Karim"
                        className="w-full px-3.5 py-2.5 min-h-[44px] bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-600"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="alia-teacher-email"
                        className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
                      >
                        Email Address
                      </label>
                      <input
                        id="alia-teacher-email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="ustad@alia-teacher.edu.bd"
                        className="w-full px-3.5 py-2.5 min-h-[44px] bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-600"
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="alia-teacher-password"
                      className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
                    >
                      Password (min. 8 characters)
                    </label>
                    <div className="relative">
                      <input
                        id="alia-teacher-password"
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Create a secure password"
                        className="w-full pl-3.5 pr-12 py-2.5 min-h-[44px] bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-600"
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

                  {/* Assigned Marhalas Multi-Select */}
                  <div>
                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                      Assigned Marhalas / Levels (Select one or more)
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {ALIA_TEACHER_MARHALA_OPTIONS.map((marhalaOption) => {
                        const selected = assignedMarhalas.includes(marhalaOption);
                        return (
                          <button
                            key={marhalaOption}
                            type="button"
                            onClick={() => handleToggleMarhala(marhalaOption)}
                            aria-pressed={selected}
                            className={`px-3.5 py-2.5 min-h-[42px] rounded-xl border text-left text-xs font-semibold flex items-center justify-between gap-2 transition-colors ${
                              selected
                                ? 'bg-teal-50 dark:bg-teal-950/60 border-teal-500 text-teal-900 dark:text-teal-200'
                                : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                            }`}
                          >
                            <span>{marhalaOption}</span>
                            {selected && (
                              <Check className="w-4 h-4 text-teal-700 dark:text-teal-300 shrink-0" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label
                        htmlFor="alia-teacher-subject"
                        className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
                      >
                        Primary Subject
                      </label>
                      <select
                        id="alia-teacher-subject"
                        value={primarySubject}
                        onChange={(e) => setPrimarySubject(e.target.value)}
                        className="w-full px-3.5 py-2.5 min-h-[44px] bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-600"
                      >
                        {ALIA_TEACHER_PRIMARY_SUBJECTS.map((subj) => (
                          <option key={subj} value={subj}>
                            {subj}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label
                        htmlFor="alia-teacher-department"
                        className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
                      >
                        Department / Stream
                      </label>
                      <select
                        id="alia-teacher-department"
                        value={department}
                        onChange={(e) => setDepartment(e.target.value as AliaDepartment)}
                        className="w-full px-3.5 py-2.5 min-h-[44px] bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-600"
                      >
                        {allowedDepartments.map((dept) => (
                          <option key={dept} value={dept}>
                            {dept}
                          </option>
                        ))}
                      </select>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                        Adapted for:{' '}
                        {assignedMarhalas.length
                          ? assignedMarhalas.map(getShortAliaMarhalaLabel).join(', ')
                          : 'Select a Marhala'}
                      </p>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 min-h-[48px] rounded-xl bg-teal-700 hover:bg-teal-800 dark:bg-teal-600 dark:hover:bg-teal-500 text-white text-sm font-semibold transition-colors"
                  >
                    <span>Submit Faculty Registration</span>
                    <ArrowRight className="w-4 h-4" aria-hidden="true" />
                  </button>
                </form>
              </div>
            )}

            {step === 'submitted' && submittedRecord && (
              <div className="space-y-6 py-2">
                <div className="flex items-start gap-3.5 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200">
                  <CheckCircle2 className="w-6 h-6 text-emerald-700 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <h2 className="text-base font-bold">
                      Alia Madrasa Teacher Registration Submitted
                    </h2>
                    <p className="text-sm mt-1">
                      Your faculty profile has been added to the Alia Madrasa approval queue and
                      coupon <span className="font-mono font-bold">{submittedRecord.couponCode}</span>{' '}
                      has been marked as redeemed.
                    </p>
                  </div>
                </div>

                <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 p-4 space-y-2.5 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-slate-500 dark:text-slate-400">Faculty Name</span>
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {submittedRecord.fullName}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-slate-500 dark:text-slate-400">Primary Subject</span>
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {submittedRecord.primarySubject}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      Assigned Marhalas
                    </span>
                    <span className="font-semibold text-teal-800 dark:text-teal-300">
                      {formatAssignedAliaMarhalasSummary(
                        submittedRecord.assignedMarhalas ?? [submittedRecord.marhala]
                      )}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      Department / Stream
                    </span>
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {submittedRecord.department}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700 dark:text-amber-300">
                      <Clock className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Review Window</span>
                    </span>
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      48-Hour Admin Approval Window
                    </span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    type="button"
                    onClick={() => navigate('/login?role=teacher&pathway=alia')}
                    className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 min-h-[48px] rounded-xl bg-teal-700 hover:bg-teal-800 dark:bg-teal-600 dark:hover:bg-teal-500 text-white text-sm font-semibold transition-colors"
                  >
                    <KeyRound className="w-4 h-4" aria-hidden="true" />
                    <span>Continue to Demo Login</span>
                  </button>
                  <Link
                    to="/"
                    className="inline-flex items-center justify-center px-5 py-3 min-h-[48px] rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-sm font-semibold transition-colors"
                  >
                    Back to Pathways
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </PublicShell>
  );
}
