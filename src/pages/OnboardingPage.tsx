import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock,
  Eye,
  EyeOff,
} from 'lucide-react';
import { PublicShell } from '../components/PublicShell';
import { getSavedCurriculumPreference } from './WelcomeCurriculumPage';
import { formatDigits, formatMessage, useI18n } from '../i18n';
import { couponService } from '../services/couponService';
import { registrationService } from '../services/registrationService';
import type { EducationStream, Language, StudentClass } from '../types/domain';
import {
  EDUCATION_STREAMS,
  STUDENT_CLASSES,
  validateBangladeshPhone,
  validateEmail,
  validateFullName,
  validatePassword,
  validatePasswordConfirmation,
  validateTeacherId,
} from '../utils/validation';

type TeacherStep = 'language' | 'fullName' | 'email' | 'password' | 'teacherId' | 'review';
type StudentStep =
  | 'language'
  | 'fullName'
  | 'phone'
  | 'email'
  | 'password'
  | 'studentClass'
  | 'educationStream'
  | 'pathway'
  | 'review';

const TEACHER_STEPS: TeacherStep[] = [
  'language',
  'fullName',
  'email',
  'password',
  'teacherId',
  'review',
];

const STUDENT_STEPS: StudentStep[] = [
  'language',
  'fullName',
  'phone',
  'email',
  'password',
  'studentClass',
  'educationStream',
  'pathway',
  'review',
];

function translateValidationKey(key: string, t: ReturnType<typeof useI18n>['t']): string {
  switch (key) {
    case 'validation.nameRequired':
      return t.validation.nameRequired;
    case 'validation.emailRequired':
      return t.validation.emailRequired;
    case 'validation.emailInvalid':
      return t.validation.emailInvalid;
    case 'validation.emailInUse':
      return t.validation.emailInUse;
    case 'validation.phoneRequired':
      return t.validation.phoneRequired;
    case 'validation.phoneInvalid':
      return t.validation.phoneInvalid;
    case 'validation.phoneInUse':
      return t.validation.phoneInUse;
    case 'validation.passwordMinLength':
      return t.validation.passwordMinLength;
    case 'validation.passwordMismatch':
      return t.validation.passwordMismatch;
    case 'validation.teacherIdRequired':
      return t.validation.teacherIdRequired;
    case 'coupon.error.invalid_format':
      return t.coupon.error.invalid_format;
    case 'coupon.error.not_found':
      return t.coupon.error.not_found;
    case 'coupon.error.already_used':
      return t.coupon.error.already_used;
    case 'coupon.error.expired':
      return t.coupon.error.expired;
    case 'coupon.error.roleMismatch':
      return t.coupon.error.roleMismatch;
    default:
      return key;
  }
}

export function OnboardingPage() {
  const { language, setLanguage, t } = useI18n();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const routeState = location.state as { couponCode?: string; role?: 'teacher' | 'student' } | null;
  const rawCode = searchParams.get('code') ?? routeState?.couponCode ?? '';

  const [stepIndex, setStepIndex] = useState(0);
  const [selectedLanguage, setSelectedLanguage] = useState<Language>(language);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const savedCurriculum = useMemo(() => getSavedCurriculumPreference(), []);
  const pathwayOptions = useMemo(() => registrationService.getPathwayOptions(), []);
  const [teacherId, setTeacherId] = useState('');
  const [studentClass, setStudentClass] = useState<StudentClass | null>(null);
  const [educationStream, setEducationStream] = useState<EducationStream | null>(
    savedCurriculum?.stream ?? null
  );
  const [pathway, setPathway] = useState(() =>
    savedCurriculum?.pathway && pathwayOptions.includes(savedCurriculum.pathway)
      ? savedCurriculum.pathway
      : ''
  );
  const [stepError, setStepError] = useState<string | null>(null);
  const [submittedRecord, setSubmittedRecord] = useState<{
    fullName: string;
    couponCode: string;
  } | null>(null);

  const couponValidation = useMemo(() => couponService.validateCoupon(rawCode), [rawCode]);
  const chatHistoryRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!submittedRecord && !couponValidation.valid) {
      navigate('/coupon', { replace: true });
    }
  }, [couponValidation.valid, navigate, submittedRecord]);

  useEffect(() => {
    if (chatHistoryRef.current) {
      chatHistoryRef.current.scrollTop = chatHistoryRef.current.scrollHeight;
    }
  }, [stepIndex]);

  if (submittedRecord) {
    return (
      <PublicShell>
        <div className="flex-1 flex items-center justify-center px-4 sm:px-6 py-8">
          <div className="w-full max-w-lg bg-white border border-slate-200 rounded-2xl p-6 sm:p-10 text-center space-y-5">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center mx-auto">
              <Clock className="w-6 h-6 text-amber-700" aria-hidden="true" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">{t.onboarding.submitted.title}</h1>
            <p className="text-sm sm:text-base text-slate-700">{t.onboarding.submitted.subtitle}</p>
            <p className="text-sm text-slate-600">{t.onboarding.submitted.detail}</p>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-left space-y-2 text-sm">
              <div className="flex justify-between gap-4">
                <span className="text-slate-500">{t.onboarding.submitted.submittedFor}</span>
                <span className="font-semibold text-slate-900">{submittedRecord.fullName}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-slate-500">{t.onboarding.submitted.couponUsed}</span>
                <span className="font-mono font-medium text-slate-900">
                  {submittedRecord.couponCode}
                </span>
              </div>
            </div>

            <Link
              to="/login"
              className="w-full inline-flex items-center justify-center px-5 py-3 min-h-[48px] bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-semibold rounded-lg transition-colors"
            >
              {t.onboarding.submitted.backToLogin}
            </Link>
          </div>
        </div>
      </PublicShell>
    );
  }

  if (!couponValidation.valid) {
    return null;
  }

  const role = couponValidation.role;
  const couponCode = couponValidation.coupon.code;
  const steps = role === 'teacher' ? TEACHER_STEPS : STUDENT_STEPS;
  const currentStep = steps[stepIndex];
  const progressPct = Math.round(((stepIndex + 1) / steps.length) * 100);

  const handleLanguagePick = (lang: Language) => {
    setSelectedLanguage(lang);
    setLanguage(lang);
    setStepError(null);
  };

  const handleNext = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setStepError(null);

    if (currentStep === 'language') {
      setLanguage(selectedLanguage);
      setStepIndex((i) => Math.min(steps.length - 1, i + 1));
      return;
    }

    if (currentStep === 'fullName') {
      const check = validateFullName(fullName);
      if (!check.valid) {
        setStepError(translateValidationKey(check.errorKey, t));
        return;
      }
    }

    if (currentStep === 'phone') {
      const check = validateBangladeshPhone(phone);
      if (!check.valid) {
        setStepError(translateValidationKey(check.errorKey, t));
        return;
      }
    }

    if (currentStep === 'email') {
      const check = validateEmail(email);
      if (!check.valid) {
        setStepError(translateValidationKey(check.errorKey, t));
        return;
      }
    }

    if (currentStep === 'password') {
      const pCheck = validatePassword(password);
      if (!pCheck.valid) {
        setStepError(translateValidationKey(pCheck.errorKey, t));
        return;
      }
      const cCheck = validatePasswordConfirmation(password, confirmPassword);
      if (!cCheck.valid) {
        setStepError(translateValidationKey(cCheck.errorKey, t));
        return;
      }
    }

    if (currentStep === 'teacherId') {
      const check = validateTeacherId(teacherId);
      if (!check.valid) {
        setStepError(translateValidationKey(check.errorKey, t));
        return;
      }
    }

    if (currentStep === 'studentClass' && !studentClass) {
      setStepError(t.validation.classRequired);
      return;
    }

    if (currentStep === 'educationStream' && !educationStream) {
      setStepError(t.validation.streamRequired);
      return;
    }

    if (currentStep === 'pathway' && !pathway) {
      setStepError(t.validation.pathwayRequired);
      return;
    }

    setStepIndex((i) => Math.min(steps.length - 1, i + 1));
  };

  const handleBack = () => {
    setStepError(null);
    if (stepIndex === 0) {
      navigate('/coupon');
    } else {
      setStepIndex((i) => Math.max(0, i - 1));
    }
  };

  const handleSubmitRegistration = () => {
    setStepError(null);
    const result =
      role === 'teacher'
        ? registrationService.submitRegistration({
            role: 'teacher',
            couponCode,
            preferredLanguage: selectedLanguage,
            fullName,
            email,
            password,
            teacherId,
          })
        : registrationService.submitRegistration({
            role: 'student',
            couponCode,
            preferredLanguage: selectedLanguage,
            fullName,
            phone,
            email,
            password,
            studentClass: studentClass!,
            educationStream: educationStream!,
            pathway,
          });

    if (!result.ok) {
      setStepError(translateValidationKey(result.errorKey, t));
      return;
    }

    setSubmittedRecord({
      fullName: result.registration.fullName,
      couponCode: result.registration.couponCode,
    });
  };

  const completedChatMessages = steps
    .slice(0, stepIndex)
    .map((step): { key: string; question: string; answer: string } | null => {
      switch (step) {
        case 'language':
          return {
            key: step,
            question: t.onboarding.stepLanguage.question,
            answer: selectedLanguage === 'bn' ? t.common.bangla : t.common.english,
          };
        case 'fullName':
          return {
            key: step,
            question: t.onboarding.stepFullName.question,
            answer: fullName.trim(),
          };
        case 'phone':
          return {
            key: step,
            question: t.onboarding.stepPhone.question,
            answer: phone,
          };
        case 'email':
          return {
            key: step,
            question:
              role === 'teacher'
                ? t.onboarding.stepEmailTeacher.question
                : t.onboarding.stepEmailStudent.question,
            answer: email.trim(),
          };
        case 'password':
          return {
            key: step,
            question: t.onboarding.stepPassword.question,
            answer: '••••••••',
          };
        case 'teacherId':
          return {
            key: step,
            question: t.onboarding.stepTeacherId.question,
            answer: teacherId.trim(),
          };
        case 'studentClass':
          return {
            key: step,
            question: t.onboarding.stepStudentClass.question,
            answer: studentClass
              ? formatMessage(t.onboarding.stepStudentClass.classOption, {
                  num: formatDigits(studentClass, language),
                })
              : '',
          };
        case 'educationStream':
          return {
            key: step,
            question: t.onboarding.stepEducationStream.question,
            answer: educationStream
              ? t.onboarding.streams[educationStream] ?? educationStream
              : '',
          };
        case 'pathway':
          return {
            key: step,
            question: t.onboarding.stepPathway.question,
            answer:
              t.onboarding.pathways[pathway as keyof typeof t.onboarding.pathways] ?? pathway,
          };
        default:
          return null;
      }
    })
    .filter((item): item is { key: string; question: string; answer: string } => Boolean(item));

  return (
    <PublicShell>
      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 py-6 sm:py-10">
        <div className="w-full max-w-xl bg-white border border-slate-200 rounded-2xl overflow-hidden">
          {/* Top Progress Header */}
          <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/70">
            <div className="flex items-center justify-between gap-4 text-xs sm:text-sm">
              <div className="flex items-center gap-2 font-medium text-slate-700">
                <span>{role === 'teacher' ? t.onboarding.titleTeacher : t.onboarding.titleStudent}</span>
                <span aria-hidden="true" className="text-slate-400">·</span>
                <span className="font-mono text-slate-900">{couponCode}</span>
              </div>
              <span className="font-medium text-slate-600 tabular-nums">
                {formatMessage(t.onboarding.stepProgress, {
                  current: formatDigits(stepIndex + 1, language),
                  total: formatDigits(steps.length, language),
                })}
              </span>
            </div>
            <div
              role="progressbar"
              aria-valuenow={progressPct}
              aria-valuemin={0}
              aria-valuemax={100}
              className="mt-3 h-1.5 w-full bg-slate-200 rounded-full overflow-hidden"
            >
              <div
                className="h-full bg-emerald-700 transition-all duration-200"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>

          {/* Chat-Style Question Canvas */}
          <div className="p-6 sm:p-8 space-y-6">
            {completedChatMessages.length > 0 && currentStep !== 'review' && (
              <div
                ref={chatHistoryRef}
                aria-label={t.onboarding.chatAssistantLabel}
                className="space-y-3 pb-4 border-b border-slate-200 max-h-52 overflow-y-auto pr-1"
              >
                {completedChatMessages.map((msg) => (
                  <div key={msg.key} className="space-y-1.5 text-xs sm:text-sm">
                    <div className="flex justify-start">
                      <span className="inline-block max-w-[85%] px-3.5 py-2 rounded-2xl rounded-tl-xs bg-slate-100 text-slate-700">
                        {msg.question}
                      </span>
                    </div>
                    <div className="flex justify-end">
                      <span className="inline-block max-w-[85%] px-3.5 py-2 rounded-2xl rounded-tr-xs bg-emerald-50 border border-emerald-200 text-emerald-950 font-medium break-all">
                        {msg.answer}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {stepError && (
              <div
                role="alert"
                className="mb-5 flex items-start gap-3 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-900 text-sm"
              >
                <AlertCircle className="w-5 h-5 text-red-700 shrink-0 mt-0.5" aria-hidden="true" />
                <span>{stepError}</span>
              </div>
            )}

            {currentStep === 'language' && (
              <form onSubmit={handleNext} className="space-y-6">
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
                    {t.onboarding.stepLanguage.question}
                  </h1>
                  <p className="text-sm text-slate-600 mt-1.5">
                    {t.onboarding.stepLanguage.helper}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => handleLanguagePick('en')}
                    className={`p-4 min-h-[64px] rounded-xl border text-left transition-colors ${
                      selectedLanguage === 'en'
                        ? 'border-emerald-700 bg-emerald-50 text-emerald-950'
                        : 'border-slate-200 bg-white hover:border-slate-300 text-slate-900'
                    }`}
                  >
                    <p className="text-base font-semibold">{t.common.english}</p>
                    <p className="text-xs text-slate-600 mt-0.5">
                      {t.onboarding.stepLanguage.englishDesc}
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleLanguagePick('bn')}
                    className={`p-4 min-h-[64px] rounded-xl border text-left transition-colors ${
                      selectedLanguage === 'bn'
                        ? 'border-emerald-700 bg-emerald-50 text-emerald-950'
                        : 'border-slate-200 bg-white hover:border-slate-300 text-slate-900'
                    }`}
                  >
                    <p className="text-base font-semibold">{t.common.bangla}</p>
                    <p className="text-xs text-slate-600 mt-0.5">
                      {t.onboarding.stepLanguage.banglaDesc}
                    </p>
                  </button>
                </div>

                <div className="flex items-center justify-between gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleBack}
                    className="inline-flex items-center gap-2 px-4 py-2.5 min-h-[44px] bg-slate-100 hover:bg-slate-200 text-slate-800 text-sm font-medium rounded-lg transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4" aria-hidden="true" />
                    <span>{t.common.back}</span>
                  </button>
                  <button
                    type="submit"
                    className="inline-flex items-center gap-2 px-5 py-2.5 min-h-[44px] bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-semibold rounded-lg transition-colors"
                  >
                    <span>{t.common.next}</span>
                    <ArrowRight className="w-4 h-4" aria-hidden="true" />
                  </button>
                </div>
              </form>
            )}

            {currentStep === 'fullName' && (
              <form onSubmit={handleNext} className="space-y-6" noValidate>
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
                    {t.onboarding.stepFullName.question}
                  </h1>
                  <p className="text-sm text-slate-600 mt-1.5">
                    {t.onboarding.stepFullName.helper}
                  </p>
                </div>
                <div>
                  <label htmlFor="ob-fullname" className="block text-sm font-medium text-slate-800 mb-1.5">
                    {t.onboarding.stepFullName.label}
                  </label>
                  <input
                    id="ob-fullname"
                    type="text"
                    autoFocus
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder={t.onboarding.stepFullName.placeholder}
                    className="w-full px-3.5 py-2.5 min-h-[48px] bg-white border border-slate-300 rounded-lg text-base text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>
                <StepControls onBack={handleBack} backLabel={t.common.back} nextLabel={t.common.next} />
              </form>
            )}

            {currentStep === 'phone' && (
              <form onSubmit={handleNext} className="space-y-6" noValidate>
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
                    {t.onboarding.stepPhone.question}
                  </h1>
                  <p className="text-sm text-slate-600 mt-1.5">{t.onboarding.stepPhone.helper}</p>
                </div>
                <div>
                  <label htmlFor="ob-phone" className="block text-sm font-medium text-slate-800 mb-1.5">
                    {t.onboarding.stepPhone.label}
                  </label>
                  <input
                    id="ob-phone"
                    type="tel"
                    inputMode="numeric"
                    autoFocus
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder={t.onboarding.stepPhone.placeholder}
                    className="w-full px-3.5 py-2.5 min-h-[48px] bg-white border border-slate-300 rounded-lg text-base font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>
                <StepControls onBack={handleBack} backLabel={t.common.back} nextLabel={t.common.next} />
              </form>
            )}

            {currentStep === 'email' && (
              <form onSubmit={handleNext} className="space-y-6" noValidate>
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
                    {role === 'teacher'
                      ? t.onboarding.stepEmailTeacher.question
                      : t.onboarding.stepEmailStudent.question}
                  </h1>
                  <p className="text-sm text-slate-600 mt-1.5">
                    {role === 'teacher'
                      ? t.onboarding.stepEmailTeacher.helper
                      : t.onboarding.stepEmailStudent.helper}
                  </p>
                </div>
                <div>
                  <label htmlFor="ob-email" className="block text-sm font-medium text-slate-800 mb-1.5">
                    {role === 'teacher'
                      ? t.onboarding.stepEmailTeacher.label
                      : t.onboarding.stepEmailStudent.label}
                  </label>
                  <input
                    id="ob-email"
                    type="email"
                    autoFocus
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={
                      role === 'teacher'
                        ? t.onboarding.stepEmailTeacher.placeholder
                        : t.onboarding.stepEmailStudent.placeholder
                    }
                    className="w-full px-3.5 py-2.5 min-h-[48px] bg-white border border-slate-300 rounded-lg text-base text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>
                <StepControls onBack={handleBack} backLabel={t.common.back} nextLabel={t.common.next} />
              </form>
            )}

            {currentStep === 'password' && (
              <form onSubmit={handleNext} className="space-y-5" noValidate>
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
                    {t.onboarding.stepPassword.question}
                  </h1>
                  <p className="text-sm text-slate-600 mt-1.5">
                    {t.onboarding.stepPassword.helper}
                  </p>
                </div>
                <div>
                  <label htmlFor="ob-password" className="block text-sm font-medium text-slate-800 mb-1.5">
                    {t.onboarding.stepPassword.passwordLabel}
                  </label>
                  <div className="relative">
                    <input
                      id="ob-password"
                      type={showPassword ? 'text' : 'password'}
                      autoFocus
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={t.onboarding.stepPassword.passwordPlaceholder}
                      className="w-full pl-3.5 pr-12 py-2.5 min-h-[48px] bg-white border border-slate-300 rounded-lg text-base text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      aria-label={showPassword ? t.common.hidePassword : t.common.showPassword}
                      className="absolute right-1 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center text-slate-500 hover:text-slate-800"
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" aria-hidden="true" />
                      ) : (
                        <Eye className="w-4 h-4" aria-hidden="true" />
                      )}
                    </button>
                  </div>
                </div>
                <div>
                  <label
                    htmlFor="ob-confirm-password"
                    className="block text-sm font-medium text-slate-800 mb-1.5"
                  >
                    {t.onboarding.stepPassword.confirmLabel}
                  </label>
                  <div className="relative">
                    <input
                      id="ob-confirm-password"
                      type={showConfirm ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder={t.onboarding.stepPassword.confirmPlaceholder}
                      className="w-full pl-3.5 pr-12 py-2.5 min-h-[48px] bg-white border border-slate-300 rounded-lg text-base text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
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
                <StepControls onBack={handleBack} backLabel={t.common.back} nextLabel={t.common.next} />
              </form>
            )}

            {currentStep === 'teacherId' && (
              <form onSubmit={handleNext} className="space-y-6" noValidate>
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
                    {t.onboarding.stepTeacherId.question}
                  </h1>
                  <p className="text-sm text-slate-600 mt-1.5">
                    {t.onboarding.stepTeacherId.helper}
                  </p>
                </div>
                <div>
                  <label htmlFor="ob-teacher-id" className="block text-sm font-medium text-slate-800 mb-1.5">
                    {t.onboarding.stepTeacherId.label}
                  </label>
                  <input
                    id="ob-teacher-id"
                    type="text"
                    autoFocus
                    value={teacherId}
                    onChange={(e) => setTeacherId(e.target.value)}
                    placeholder={t.onboarding.stepTeacherId.placeholder}
                    className="w-full px-3.5 py-2.5 min-h-[48px] bg-white border border-slate-300 rounded-lg text-base font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>
                <StepControls onBack={handleBack} backLabel={t.common.back} nextLabel={t.common.next} />
              </form>
            )}

            {currentStep === 'studentClass' && (
              <form onSubmit={handleNext} className="space-y-6" noValidate>
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
                    {t.onboarding.stepStudentClass.question}
                  </h1>
                  <p className="text-sm text-slate-600 mt-1.5">
                    {t.onboarding.stepStudentClass.helper}
                  </p>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {STUDENT_CLASSES.map((cls) => (
                    <button
                      key={cls}
                      type="button"
                      onClick={() => {
                        setStudentClass(cls);
                        setStepError(null);
                      }}
                      className={`px-3 py-3 min-h-[48px] rounded-xl border text-sm font-semibold transition-colors ${
                        studentClass === cls
                          ? 'border-emerald-700 bg-emerald-50 text-emerald-950'
                          : 'border-slate-200 bg-white hover:border-slate-300 text-slate-800'
                      }`}
                    >
                      {formatMessage(t.onboarding.stepStudentClass.classOption, {
                        num: formatDigits(cls, language),
                      })}
                    </button>
                  ))}
                </div>
                <StepControls onBack={handleBack} backLabel={t.common.back} nextLabel={t.common.next} />
              </form>
            )}

            {currentStep === 'educationStream' && (
              <form onSubmit={handleNext} className="space-y-6" noValidate>
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
                    {t.onboarding.stepEducationStream.question}
                  </h1>
                  <p className="text-sm text-slate-600 mt-1.5">
                    {t.onboarding.stepEducationStream.helper}
                  </p>
                </div>
                <div className="grid grid-cols-1 gap-3">
                  {EDUCATION_STREAMS.map((stream) => (
                    <button
                      key={stream}
                      type="button"
                      onClick={() => {
                        setEducationStream(stream);
                        setStepError(null);
                      }}
                      className={`p-4 min-h-[56px] rounded-xl border text-left text-sm font-semibold transition-colors ${
                        educationStream === stream
                          ? 'border-emerald-700 bg-emerald-50 text-emerald-950'
                          : 'border-slate-200 bg-white hover:border-slate-300 text-slate-900'
                      }`}
                    >
                      {t.onboarding.streams[stream]}
                    </button>
                  ))}
                </div>
                <StepControls onBack={handleBack} backLabel={t.common.back} nextLabel={t.common.next} />
              </form>
            )}

            {currentStep === 'pathway' && (
              <form onSubmit={handleNext} className="space-y-6" noValidate>
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
                    {t.onboarding.stepPathway.question}
                  </h1>
                  <p className="text-sm text-slate-600 mt-1.5">
                    {t.onboarding.stepPathway.helper}
                  </p>
                </div>
                <div>
                  <label htmlFor="ob-pathway" className="block text-sm font-medium text-slate-800 mb-1.5">
                    {t.onboarding.stepPathway.label}
                  </label>
                  <select
                    id="ob-pathway"
                    value={pathway}
                    onChange={(e) => {
                      setPathway(e.target.value);
                      setStepError(null);
                    }}
                    className="w-full px-3.5 py-2.5 min-h-[48px] bg-white border border-slate-300 rounded-lg text-base text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  >
                    <option value="">{t.onboarding.stepPathway.selectPlaceholder}</option>
                    {pathwayOptions.map((opt) => (
                      <option key={opt} value={opt}>
                        {t.onboarding.pathways[opt as keyof typeof t.onboarding.pathways] ?? opt}
                      </option>
                    ))}
                  </select>
                </div>
                <StepControls onBack={handleBack} backLabel={t.common.back} nextLabel={t.common.next} />
              </form>
            )}

            {currentStep === 'review' && (
              <div className="space-y-6">
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
                    {t.onboarding.review.question}
                  </h1>
                  <p className="text-sm text-slate-600 mt-1.5">{t.onboarding.review.helper}</p>
                </div>

                <dl className="divide-y divide-slate-200 border border-slate-200 rounded-xl bg-slate-50/50">
                  <ReviewRow
                    label={t.onboarding.review.fieldLanguage}
                    value={selectedLanguage === 'bn' ? t.common.bangla : t.common.english}
                  />
                  <ReviewRow
                    label={t.onboarding.review.fieldRole}
                    value={role === 'teacher' ? t.common.roleTeacher : t.common.roleStudent}
                  />
                  <ReviewRow label={t.onboarding.review.fieldCoupon} value={couponCode} mono />
                  <ReviewRow label={t.onboarding.review.fieldName} value={fullName.trim()} />
                  {role === 'student' && (
                    <ReviewRow label={t.onboarding.review.fieldPhone} value={phone} mono />
                  )}
                  <ReviewRow label={t.onboarding.review.fieldEmail} value={email.trim()} />
                  <ReviewRow
                    label={t.onboarding.review.fieldPassword}
                    value={t.onboarding.review.passwordMasked}
                  />
                  {role === 'teacher' ? (
                    <ReviewRow label={t.onboarding.review.fieldTeacherId} value={teacherId} mono />
                  ) : (
                    <>
                      <ReviewRow
                        label={t.onboarding.review.fieldClass}
                        value={
                          studentClass
                            ? formatMessage(t.onboarding.stepStudentClass.classOption, {
                                num: formatDigits(studentClass, language),
                              })
                            : ''
                        }
                      />
                      <ReviewRow
                        label={t.onboarding.review.fieldStream}
                        value={
                          educationStream
                            ? t.onboarding.streams[educationStream] ?? educationStream
                            : ''
                        }
                      />
                      <ReviewRow
                        label={t.onboarding.review.fieldPathway}
                        value={
                          t.onboarding.pathways[pathway as keyof typeof t.onboarding.pathways] ??
                          pathway
                        }
                      />
                    </>
                  )}
                </dl>

                <div className="flex items-center justify-between gap-3 pt-1">
                  <button
                    type="button"
                    onClick={handleBack}
                    className="inline-flex items-center gap-2 px-4 py-3 min-h-[48px] bg-slate-100 hover:bg-slate-200 text-slate-800 text-sm font-medium rounded-lg transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4" aria-hidden="true" />
                    <span>{t.common.back}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleSubmitRegistration}
                    className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 min-h-[48px] bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-semibold rounded-lg transition-colors"
                  >
                    <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
                    <span>{t.onboarding.review.submitButton}</span>
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

function StepControls({
  onBack,
  backLabel,
  nextLabel,
}: {
  onBack: () => void;
  backLabel: string;
  nextLabel: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 pt-2">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-2 px-4 py-2.5 min-h-[44px] bg-slate-100 hover:bg-slate-200 text-slate-800 text-sm font-medium rounded-lg transition-colors"
      >
        <ArrowLeft className="w-4 h-4" aria-hidden="true" />
        <span>{backLabel}</span>
      </button>
      <button
        type="submit"
        className="inline-flex items-center gap-2 px-5 py-2.5 min-h-[44px] bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-semibold rounded-lg transition-colors"
      >
        <span>{nextLabel}</span>
        <ArrowRight className="w-4 h-4" aria-hidden="true" />
      </button>
    </div>
  );
}

function ReviewRow({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="px-4 py-3 flex items-center justify-between gap-4 text-sm">
      <dt className="text-slate-500 shrink-0">{label}</dt>
      <dd className={`text-slate-900 font-medium text-right break-all ${mono ? 'font-mono' : ''}`}>
        {value}
      </dd>
    </div>
  );
}
