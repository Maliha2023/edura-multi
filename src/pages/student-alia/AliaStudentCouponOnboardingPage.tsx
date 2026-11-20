import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock,
  Eye,
  EyeOff,
  GraduationCap,
  ShieldCheck,
  Ticket,
} from 'lucide-react';
import { PublicShell } from '../../components/PublicShell';
import {
  ALIA_MARHALA_OPTIONS,
  aliaStudentService,
  formatAliaStudentContextBadge,
  getAliaBoardName,
  getDemoAliaStudentCouponHint,
  getDepartmentsForMarhala,
  type AliaDepartment,
  type AliaMarhala,
  type AliaPendingRegistration,
} from '../../services/aliaStudentService';

type OnboardingStep = 'verify' | 'register' | 'submitted';

export function AliaStudentCouponOnboardingPage() {
  const navigate = useNavigate();

  const [step, setStep] = useState<OnboardingStep>('verify');
  const [couponCode, setCouponCode] = useState('');
  const [verifiedCoupon, setVerifiedCoupon] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Step 2 registration fields
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [marhala, setMarhala] = useState<AliaMarhala>('Dakhil (Classes 6–10)');
  const [department, setDepartment] = useState<AliaDepartment>('General');
  const [submittedRecord, setSubmittedRecord] = useState<AliaPendingRegistration | null>(null);

  const demoCouponHint = useMemo(() => getDemoAliaStudentCouponHint(), []);
  const availableDepartments = useMemo(() => getDepartmentsForMarhala(marhala), [marhala]);

  const handleMarhalaChange = (nextMarhala: AliaMarhala) => {
    setMarhala(nextMarhala);
    const nextDepts = getDepartmentsForMarhala(nextMarhala);
    if (!nextDepts.includes(department)) {
      setDepartment(nextDepts[0]);
    }
  };

  const handleVerifyCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    const res = aliaStudentService.validateAliaStudentCoupon(couponCode);
    if (!res.ok || !res.coupon) {
      setErrorMsg(res.message);
      return;
    }
    setVerifiedCoupon(res.coupon.code);
    setCouponCode(res.coupon.code);
    setStep('register');
  };

  const handleSubmitRegistration = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!verifiedCoupon) {
      setStep('verify');
      return;
    }

    const res = aliaStudentService.submitAliaStudentCouponRegistration({
      couponCode: verifiedCoupon,
      fullName,
      email,
      password,
      marhala,
      department,
    });

    if (!res.ok) {
      setErrorMsg(res.error);
      return;
    }

    setSubmittedRecord(res.registration);
    setStep('submitted');
  };

  const stepIndex = step === 'verify' ? 1 : step === 'register' ? 2 : 3;

  return (
    <PublicShell>
      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 py-8 sm:py-12">
        <div className="w-full max-w-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden transition-colors">
          {/* Header */}
          <div className="px-6 sm:px-8 py-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/90">
            <div className="flex items-center justify-between gap-3">
              <Link
                to="/login?role=student&pathway=alia"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Back to Alia Student Login</span>
              </Link>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                <GraduationCap className="w-3.5 h-3.5" aria-hidden="true" />
                Alia Madrasa
              </span>
            </div>

            <div className="mt-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
                {getAliaBoardName()}
              </p>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mt-1">
                Alia Madrasa Student Coupon Onboarding
              </h1>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                Step {stepIndex} of 3 —{' '}
                {step === 'verify'
                  ? 'Verify your S-XXXXX student coupon'
                  : step === 'register'
                    ? 'Complete your Marhala & Department profile'
                    : 'Application submitted for Admin approval'}
              </p>
            </div>
          </div>

          <div className="p-6 sm:p-8">
            {errorMsg && (
              <div
                role="alert"
                className="mb-5 flex items-start gap-3 p-4 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-red-900 dark:text-red-200 text-sm"
              >
                <AlertCircle
                  className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5"
                  aria-hidden="true"
                />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* STEP 1: Verify S-XXXXX Coupon */}
            {step === 'verify' && (
              <div className="space-y-5">
                <form onSubmit={handleVerifyCoupon} className="space-y-4" noValidate>
                  <div>
                    <label
                      htmlFor="alia-student-coupon-code"
                      className="block text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1.5"
                    >
                      Student Coupon Code (S-XXXXX)
                    </label>
                    <input
                      id="alia-student-coupon-code"
                      type="text"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                      placeholder="e.g., S-74201"
                      autoFocus
                      className="w-full px-4 py-3 min-h-[46px] bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-mono tracking-wider text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                    />
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                      Enter the 48-hour single-use student code issued by your Alia Madrasa
                      Administrator. Teacher codes (T-XXXXX) are not accepted here.
                    </p>
                  </div>

                  <button
                    type="submit"
                    className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 min-h-[48px] bg-emerald-700 hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white text-sm font-semibold rounded-xl transition-colors"
                  >
                    <Ticket className="w-4 h-4" aria-hidden="true" />
                    <span>Verify Student Coupon</span>
                    <ArrowRight className="w-4 h-4" aria-hidden="true" />
                  </button>
                </form>

                {/* Demo Coupon Shortcut */}
                <div className="p-4 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold text-emerald-900 dark:text-emerald-200">
                      Demo Alia Student Coupon Ready
                    </p>
                    <p className="text-xs text-emerald-800/80 dark:text-emerald-300/80 mt-0.5">
                      Use active sample code{' '}
                      <span className="font-mono font-bold">{demoCouponHint}</span> to test
                      registration immediately.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setErrorMsg(null);
                      setCouponCode(demoCouponHint);
                    }}
                    className="px-3.5 py-2 min-h-[38px] rounded-lg bg-white dark:bg-slate-900 hover:bg-emerald-100 dark:hover:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 text-xs font-semibold transition-colors whitespace-nowrap shrink-0"
                  >
                    Use {demoCouponHint}
                  </button>
                </div>
              </div>
            )}

            {/* STEP 2: Student Registration Form */}
            {step === 'register' && verifiedCoupon && (
              <form onSubmit={handleSubmitRegistration} className="space-y-4" noValidate>
                <div className="flex items-center justify-between gap-2 px-4 py-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-xs sm:text-sm text-emerald-900 dark:text-emerald-200">
                  <span className="inline-flex items-center gap-2 font-medium">
                    <ShieldCheck className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
                    Verified Coupon: <strong className="font-mono">{verifiedCoupon}</strong>
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setStep('verify');
                      setErrorMsg(null);
                    }}
                    className="text-xs font-semibold underline underline-offset-4 hover:text-emerald-700 dark:hover:text-emerald-300"
                  >
                    Change
                  </button>
                </div>

                <div>
                  <label
                    htmlFor="alia-reg-fullname"
                    className="block text-sm font-medium text-slate-800 dark:text-slate-200 mb-1.5"
                  >
                    Full Name
                  </label>
                  <input
                    id="alia-reg-fullname"
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g., Abdullah Al Mamun"
                    className="w-full px-3.5 py-2.5 min-h-[44px] bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>

                <div>
                  <label
                    htmlFor="alia-reg-email"
                    className="block text-sm font-medium text-slate-800 dark:text-slate-200 mb-1.5"
                  >
                    Email Address
                  </label>
                  <input
                    id="alia-reg-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="student@alia-madrasa.edu.bd"
                    className="w-full px-3.5 py-2.5 min-h-[44px] bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>

                <div>
                  <label
                    htmlFor="alia-reg-password"
                    className="block text-sm font-medium text-slate-800 dark:text-slate-200 mb-1.5"
                  >
                    Password
                  </label>
                  <div className="relative">
                    <input
                      id="alia-reg-password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Minimum 8 characters"
                      className="w-full pl-3.5 pr-12 py-2.5 min-h-[44px] bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      className="absolute right-1 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Marhala / Academic Level */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="alia-reg-marhala"
                      className="block text-sm font-medium text-slate-800 dark:text-slate-200 mb-1.5"
                    >
                      Marhala / Academic Level
                    </label>
                    <select
                      id="alia-reg-marhala"
                      value={marhala}
                      onChange={(e) => handleMarhalaChange(e.target.value as AliaMarhala)}
                      className="w-full px-3.5 py-2.5 min-h-[44px] bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                    >
                      {ALIA_MARHALA_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Dynamically Adapted Department / Stream */}
                  <div>
                    <label
                      htmlFor="alia-reg-department"
                      className="block text-sm font-medium text-slate-800 dark:text-slate-200 mb-1.5"
                    >
                      Department / Stream
                    </label>
                    <select
                      id="alia-reg-department"
                      value={department}
                      onChange={(e) => setDepartment(e.target.value as AliaDepartment)}
                      className="w-full px-3.5 py-2.5 min-h-[44px] bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                    >
                      {availableDepartments.map((dept) => (
                        <option key={dept} value={dept}>
                          {dept}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300">
                  Selected Placement:{' '}
                  <strong className="text-slate-900 dark:text-white">
                    {formatAliaStudentContextBadge(marhala, department)}
                  </strong>
                </div>

                <button
                  type="submit"
                  className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 min-h-[48px] bg-emerald-700 hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white text-sm font-semibold rounded-xl transition-colors"
                >
                  <span>Submit Registration for Approval</span>
                  <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </button>
              </form>
            )}

            {/* STEP 3: Confirmation Screen */}
            {step === 'submitted' && submittedRecord && (
              <div className="space-y-5">
                <div className="p-5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 space-y-3">
                  <div className="flex items-start gap-3">
                    <CheckCircle2
                      className="w-6 h-6 text-emerald-700 dark:text-emerald-400 shrink-0 mt-0.5"
                      aria-hidden="true"
                    />
                    <div>
                      <h2 className="text-base font-bold text-emerald-950 dark:text-emerald-100">
                        Registration Submitted to Alia Madrasa Queue
                      </h2>
                      <p className="text-sm text-emerald-900/80 dark:text-emerald-200/90 mt-1">
                        Your student profile has been queued for Alia Madrasa Admin approval with a
                        48-hour verification window.
                      </p>
                    </div>
                  </div>

                  <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-emerald-200/80 dark:border-emerald-800/70 text-xs">
                    <div>
                      <dt className="text-emerald-800/70 dark:text-emerald-300/70">Student Name</dt>
                      <dd className="font-semibold text-emerald-950 dark:text-white mt-0.5">
                        {submittedRecord.fullName}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-emerald-800/70 dark:text-emerald-300/70">Email</dt>
                      <dd className="font-semibold text-emerald-950 dark:text-white mt-0.5 break-all">
                        {submittedRecord.email}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-emerald-800/70 dark:text-emerald-300/70">
                        Marhala & Department
                      </dt>
                      <dd className="font-semibold text-emerald-950 dark:text-white mt-0.5">
                        {formatAliaStudentContextBadge(
                          submittedRecord.marhala,
                          submittedRecord.department
                        )}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-emerald-800/70 dark:text-emerald-300/70">Coupon Used</dt>
                      <dd className="font-mono font-semibold text-emerald-950 dark:text-white mt-0.5">
                        {submittedRecord.couponCode}
                      </dd>
                    </div>
                  </dl>
                </div>

                <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200">
                  <Clock className="w-4 h-4 text-amber-700 dark:text-amber-400 shrink-0 mt-0.5" />
                  <span>
                    Want to explore the Alia Madrasa Student Dashboard right away? Continue to the
                    Alia Demo Login screen for 1-click access.
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => navigate('/login?role=student&pathway=alia')}
                  className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 min-h-[48px] bg-emerald-700 hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white text-sm font-semibold rounded-xl transition-colors"
                >
                  <span>Continue to Demo Login</span>
                  <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </PublicShell>
  );
}
