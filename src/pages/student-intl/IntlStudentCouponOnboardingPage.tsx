import React, { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
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
  getSavedCurriculumPreference,
  saveCurriculumPreference,
} from '../WelcomeCurriculumPage';
import {
  ACADEMIC_TRACK_OPTIONS,
  getLevelsForPathway,
  levelRequiresTrack,
  resolveInternationalPathway,
  type InternationalAcademicLevel,
  type InternationalAcademicTrack,
  type InternationalPathway,
  type UpperAcademicTrack,
} from '../../services/internationalAdminService';
import {
  formatIntlStudentContextBadge,
  getDemoIntlStudentCouponHint,
  getIntlStudentPathwayLabel,
  internationalStudentService,
} from '../../services/internationalStudentService';

export function IntlStudentCouponOnboardingPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const savedPref = useMemo(() => getSavedCurriculumPreference(), []);

  const initialPathway: InternationalPathway =
    resolveInternationalPathway(searchParams.get('pathway')) ??
    resolveInternationalPathway(savedPref?.pathway) ??
    'cambridge';

  const [pathway, setPathway] = useState<InternationalPathway>(initialPathway);
  const [step, setStep] = useState<'coupon' | 'register' | 'submitted'>('coupon');

  // Step 1: Coupon entry
  const [couponInput, setCouponInput] = useState('');
  const [verifiedCouponCode, setVerifiedCouponCode] = useState('');
  const [couponError, setCouponError] = useState<string | null>(null);

  // Step 2: Registration form
  const levelOptions = useMemo(() => getLevelsForPathway(pathway), [pathway]);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [academicLevel, setAcademicLevel] = useState<InternationalAcademicLevel>(
    getLevelsForPathway(initialPathway)[1]
  );
  const [academicTrack, setAcademicTrack] = useState<UpperAcademicTrack>('Science');
  const [formError, setFormError] = useState<string | null>(null);

  // Step 3: Confirmation summary
  const [submittedInfo, setSubmittedInfo] = useState<{
    fullName: string;
    email: string;
    couponCode: string;
    academicLevel: InternationalAcademicLevel;
    academicTrack: InternationalAcademicTrack;
    pathway: InternationalPathway;
  } | null>(null);

  const pathwayLabel = getIntlStudentPathwayLabel(pathway);
  const demoCouponHint = getDemoIntlStudentCouponHint(pathway);
  const showTrackField = levelRequiresTrack(academicLevel);

  const handleSwitchPathway = (next: InternationalPathway) => {
    setPathway(next);
    setAcademicLevel(getLevelsForPathway(next)[1]);
    setCouponError(null);
    setSearchParams({ pathway: next }, { replace: true });
    saveCurriculumPreference({
      stream: 'International Curriculum (English Medium)',
      pathway: getIntlStudentPathwayLabel(next),
      role: 'student',
    });
  };

  const handleVerifyCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    setCouponError(null);

    const check = internationalStudentService.validateIntlStudentCoupon(couponInput, pathway);
    if (!check.ok || !check.coupon) {
      setCouponError(check.message);
      return;
    }

    setVerifiedCouponCode(check.coupon.code);
    setStep('register');
  };

  const handleSubmitRegistration = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const res = internationalStudentService.submitIntlStudentCouponRegistration({
      pathway,
      couponCode: verifiedCouponCode,
      fullName,
      email,
      password,
      academicLevel,
      academicTrack: showTrackField ? academicTrack : 'General',
    });

    if (!res.ok) {
      setFormError(res.error);
      return;
    }

    saveCurriculumPreference({
      stream: 'International Curriculum (English Medium)',
      pathway: pathwayLabel,
      role: 'student',
    });

    setSubmittedInfo({
      fullName: res.registration.fullName,
      email: res.registration.email,
      couponCode: res.registration.couponCode,
      academicLevel: res.registration.academicLevel,
      academicTrack: res.registration.academicTrack,
      pathway: res.registration.pathway,
    });
    setStep('submitted');
  };

  const handleContinueToDemoLogin = () => {
    saveCurriculumPreference({
      stream: 'International Curriculum (English Medium)',
      pathway: pathwayLabel,
      role: 'student',
    });
    navigate(`/login?role=student&pathway=${pathway}`);
  };

  return (
    <PublicShell>
      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 py-8 sm:py-12">
        <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden transition-colors">
          {/* Header Progress & Pathway Context */}
          <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/75 dark:bg-slate-900 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center shrink-0">
                <GraduationCap
                  className="w-4 h-4 text-emerald-700 dark:text-emerald-400"
                  aria-hidden="true"
                />
              </div>
              <div>
                <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                  International Student Registration
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {step === 'coupon'
                    ? 'Step 1 of 2 · Verify Coupon'
                    : step === 'register'
                      ? 'Step 2 of 2 · Academic Details'
                      : 'Application Submitted'}
                </p>
              </div>
            </div>

            {step === 'coupon' ? (
              <div
                role="group"
                aria-label="Select international pathway"
                className="inline-flex items-center gap-1 p-0.5 bg-slate-200/70 dark:bg-slate-800 rounded-lg"
              >
                {(['cambridge', 'edexcel'] as const).map((pw) => (
                  <button
                    key={pw}
                    type="button"
                    onClick={() => handleSwitchPathway(pw)}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                      pathway === pw
                        ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {getIntlStudentPathwayLabel(pw)}
                  </button>
                ))}
              </div>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{pathwayLabel}</span>
              </span>
            )}
          </div>

          <div className="p-6 sm:p-8">
            {step === 'coupon' && (
              <form onSubmit={handleVerifyCoupon} className="space-y-5" noValidate>
                <div>
                  <h1 className="text-xl font-bold text-slate-900 dark:text-white">
                    Enter your Student Coupon Code
                  </h1>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                    Redeem an active 48-hour student coupon issued for the{' '}
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {pathwayLabel}
                    </span>{' '}
                    pathway.
                  </p>
                </div>

                {couponError && (
                  <div
                    role="alert"
                    className="flex items-start gap-2.5 p-3.5 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-red-900 dark:text-red-200 text-sm"
                  >
                    <AlertCircle
                      className="w-4 h-4 shrink-0 mt-0.5 text-red-700 dark:text-red-400"
                      aria-hidden="true"
                    />
                    <span>{couponError}</span>
                  </div>
                )}

                <div>
                  <label
                    htmlFor="intl-student-coupon-code"
                    className="block text-sm font-medium text-slate-800 dark:text-slate-200 mb-1.5"
                  >
                    Student Coupon Code
                  </label>
                  <input
                    id="intl-student-coupon-code"
                    type="text"
                    value={couponInput}
                    onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                    placeholder={pathway === 'cambridge' ? 'e.g. S-61488' : 'e.g. S-82903'}
                    autoComplete="off"
                    spellCheck={false}
                    className="w-full px-3.5 py-2.5 min-h-[48px] bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-base font-mono tracking-wider uppercase text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <span>Format: S-XXXXX (valid for 48 hours)</span>
                    <button
                      type="button"
                      onClick={() => {
                        setCouponInput(demoCouponHint);
                        setCouponError(null);
                      }}
                      className="font-mono font-semibold text-emerald-700 dark:text-emerald-400 hover:underline"
                    >
                      Use demo code {demoCouponHint}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 min-h-[48px] bg-emerald-700 hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white text-sm font-semibold rounded-lg transition-colors"
                >
                  <Ticket className="w-4 h-4" aria-hidden="true" />
                  <span>Verify Coupon & Continue</span>
                  <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </button>

                <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs sm:text-sm">
                  <Link
                    to="/?step=role"
                    className="inline-flex items-center gap-1.5 font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
                  >
                    <ArrowLeft className="w-4 h-4" aria-hidden="true" />
                    <span>Back to Role Selection</span>
                  </Link>
                  <Link
                    to={`/login?role=student&pathway=${pathway}`}
                    className="font-semibold text-emerald-700 dark:text-emerald-400 hover:underline"
                  >
                    Student Login
                  </Link>
                </div>
              </form>
            )}

            {step === 'register' && (
              <form onSubmit={handleSubmitRegistration} className="space-y-4" noValidate>
                <div>
                  <h1 className="text-xl font-bold text-slate-900 dark:text-white">
                    Complete Student Registration
                  </h1>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Verified coupon{' '}
                    <span className="font-mono font-semibold text-emerald-700 dark:text-emerald-400">
                      {verifiedCouponCode}
                    </span>{' '}
                    · {pathwayLabel}
                  </p>
                </div>

                {formError && (
                  <div
                    role="alert"
                    className="flex items-start gap-2.5 p-3.5 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-red-900 dark:text-red-200 text-sm"
                  >
                    <AlertCircle
                      className="w-4 h-4 shrink-0 mt-0.5 text-red-700 dark:text-red-400"
                      aria-hidden="true"
                    />
                    <span>{formError}</span>
                  </div>
                )}

                <div>
                  <label
                    htmlFor="intl-student-reg-name"
                    className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
                  >
                    Full Name <span className="text-red-600">*</span>
                  </label>
                  <input
                    id="intl-student-reg-name"
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Zoya Rahman"
                    className="w-full px-3.5 py-2.5 min-h-[44px] bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>

                <div>
                  <label
                    htmlFor="intl-student-reg-email"
                    className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
                  >
                    Email Address <span className="text-red-600">*</span>
                  </label>
                  <input
                    id="intl-student-reg-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={
                      pathway === 'cambridge'
                        ? 'student@cambridge-student.edu.bd'
                        : 'student@edexcel-student.edu.bd'
                    }
                    className="w-full px-3.5 py-2.5 min-h-[44px] bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>

                <div>
                  <label
                    htmlFor="intl-student-reg-password"
                    className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
                  >
                    Password <span className="text-red-600">*</span>
                  </label>
                  <div className="relative">
                    <input
                      id="intl-student-reg-password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="At least 8 characters"
                      className="w-full pl-3.5 pr-12 py-2.5 min-h-[44px] bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-600"
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

                <div className="space-y-3.5">
                  <div>
                    <label
                      htmlFor="intl-student-reg-level"
                      className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
                    >
                      Academic Level ({pathwayLabel}) <span className="text-red-600">*</span>
                    </label>
                    <select
                      id="intl-student-reg-level"
                      value={academicLevel}
                      onChange={(e) =>
                        setAcademicLevel(e.target.value as InternationalAcademicLevel)
                      }
                      className="w-full px-3.5 py-2.5 min-h-[44px] bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                    >
                      {levelOptions.map((lvl) => (
                        <option key={lvl} value={lvl}>
                          {lvl}
                        </option>
                      ))}
                    </select>
                  </div>

                  {showTrackField ? (
                    <div>
                      <label
                        htmlFor="intl-student-reg-track"
                        className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
                      >
                        Academic Track / Stream <span className="text-red-600">*</span>
                      </label>
                      <select
                        id="intl-student-reg-track"
                        value={academicTrack}
                        onChange={(e) => setAcademicTrack(e.target.value as UpperAcademicTrack)}
                        className="w-full px-3.5 py-2.5 min-h-[44px] bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                      >
                        {ACADEMIC_TRACK_OPTIONS.map((track) => (
                          <option key={track} value={track}>
                            {track}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div className="px-3.5 py-2.5 rounded-lg bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400">
                      Academic Track is automatically set to{' '}
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        General
                      </span>{' '}
                      for Grade 1–8 (Primary / Lower Secondary).
                    </div>
                  )}
                </div>

                <div className="pt-2 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setStep('coupon');
                      setFormError(null);
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-3 min-h-[46px] bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 text-sm font-medium rounded-lg transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4" aria-hidden="true" />
                    <span>Back</span>
                  </button>
                  <button
                    type="submit"
                    className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 min-h-[46px] bg-emerald-700 hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white text-sm font-semibold rounded-lg transition-colors"
                  >
                    <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
                    <span>Submit Registration</span>
                  </button>
                </div>
              </form>
            )}

            {step === 'submitted' && submittedInfo && (
              <div className="space-y-6 text-center">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center mx-auto">
                  <Clock className="w-6 h-6 text-emerald-700 dark:text-emerald-400" aria-hidden="true" />
                </div>

                <div className="space-y-1.5">
                  <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                    Registration Submitted for Approval
                  </h1>
                  <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                    Your application has been queued in the{' '}
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {getIntlStudentPathwayLabel(submittedInfo.pathway)} Panel
                    </span>{' '}
                    Pending Approvals list with a 48-hour review countdown.
                  </p>
                </div>

                <dl className="divide-y divide-slate-200 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/70 dark:bg-slate-950/50 text-left text-sm">
                  <div className="px-4 py-2.5 flex justify-between gap-4">
                    <dt className="text-slate-500 dark:text-slate-400">Student Name</dt>
                    <dd className="font-semibold text-slate-900 dark:text-white">
                      {submittedInfo.fullName}
                    </dd>
                  </div>
                  <div className="px-4 py-2.5 flex justify-between gap-4">
                    <dt className="text-slate-500 dark:text-slate-400">Email</dt>
                    <dd className="font-medium text-slate-900 dark:text-white">
                      {submittedInfo.email}
                    </dd>
                  </div>
                  <div className="px-4 py-2.5 flex justify-between gap-4">
                    <dt className="text-slate-500 dark:text-slate-400">Academic Scope</dt>
                    <dd className="font-semibold text-emerald-700 dark:text-emerald-400 text-right">
                      {formatIntlStudentContextBadge(
                        submittedInfo.pathway,
                        submittedInfo.academicLevel,
                        submittedInfo.academicTrack
                      )}
                    </dd>
                  </div>
                  <div className="px-4 py-2.5 flex justify-between gap-4">
                    <dt className="text-slate-500 dark:text-slate-400">Coupon Redeemed</dt>
                    <dd className="font-mono font-semibold text-slate-900 dark:text-white">
                      {submittedInfo.couponCode}
                    </dd>
                  </div>
                </dl>

                <div className="space-y-2.5">
                  <button
                    type="button"
                    onClick={handleContinueToDemoLogin}
                    className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 min-h-[48px] bg-emerald-700 hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white text-sm font-semibold rounded-lg transition-colors"
                  >
                    <span>Continue to Demo Login</span>
                    <ArrowRight className="w-4 h-4" aria-hidden="true" />
                  </button>
                  <Link
                    to="/"
                    className="inline-block text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white py-1"
                  >
                    Return to Stream Selection
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
