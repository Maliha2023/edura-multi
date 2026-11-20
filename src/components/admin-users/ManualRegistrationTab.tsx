import React, { useState } from 'react';
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Copy,
  Eye,
  EyeOff,
  GraduationCap,
  RefreshCw,
  ShieldCheck,
  UserPlus,
  Users,
} from 'lucide-react';
import {
  ACADEMIC_CLASSES,
  ACADEMIC_GROUPS,
  adminUsersService,
  formatAcademicLevel,
  generateRandomPassword,
  getPathwayDisplayName,
  isGroupApplicableForClass,
  type AcademicClassLevel,
  type AcademicGroup,
  type AdminUserPathway,
  type DirectoryRole,
  type PathwayUserProfile,
} from '../../services/adminUsersService';
import { useDashboardLanguage } from '../../i18n/useDashboardLanguage';

interface ManualRegistrationTabProps {
  pathway: AdminUserPathway;
  onAccountCreated: () => void;
  onGoToDirectory: () => void;
}

export function ManualRegistrationTab({
  pathway,
  onAccountCreated,
  onGoToDirectory,
}: ManualRegistrationTabProps) {
  const { td, dt, formatDigits } = useDashboardLanguage();
  const [role, setRole] = useState<DirectoryRole>('student');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [temporaryPassword, setTemporaryPassword] = useState('');
  const [showPassword, setShowPassword] = useState(true);
  const [academicClass, setAcademicClass] = useState<AcademicClassLevel>(10);
  const [academicGroup, setAcademicGroup] = useState<AcademicGroup>('Science');

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [createdCredentials, setCreatedCredentials] = useState<{
    profile: PathwayUserProfile;
    temporaryPassword: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  const pathwayLabel = td(getPathwayDisplayName(pathway));

  const handleGeneratePassword = () => {
    setTemporaryPassword(generateRandomPassword(12));
    setShowPassword(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const res = adminUsersService.createManualAccount({
      pathway,
      role,
      fullName,
      email,
      temporaryPassword,
      academicClass,
      academicGroup: isGroupApplicableForClass(academicClass) ? academicGroup : null,
    });

    if (!res.ok) {
      setErrorMsg(res.error);
      return;
    }

    setCreatedCredentials({
      profile: res.profile,
      temporaryPassword: res.temporaryPassword,
    });
    setCopied(false);
    setFullName('');
    setEmail('');
    setTemporaryPassword('');
    onAccountCreated();
  };

  const handleCopyCredentials = async () => {
    if (!createdCredentials) return;
    const text = [
      `Pathway: ${pathwayLabel}`,
      `Role: ${createdCredentials.profile.role === 'teacher' ? 'Teacher' : 'Student'}`,
      `Name: ${createdCredentials.profile.fullName}`,
      `Email: ${createdCredentials.profile.email}`,
      `Temporary Password: ${createdCredentials.temporaryPassword}`,
    ].join('\n');

    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Fallback ignored cleanly when clipboard API is unavailable
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Direct Admin Entry Form */}
      <section className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-5 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              {dt('Direct Account Creation', 'সরাসরি অ্যাকাউন্ট তৈরি')}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {dt(
                'Immediately creates an active account (bypasses pending approval queue).',
                'অপেক্ষমাণ অনুমোদন তালিকা ছাড়াই সরাসরি সক্রিয় অ্যাকাউন্ট তৈরি করে।'
              )}
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 px-3 py-1 rounded-lg">
            <ShieldCheck className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            <span>{pathwayLabel}</span>
          </span>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-5" noValidate>
          {errorMsg && (
            <div
              role="alert"
              className="flex items-start gap-2.5 p-3.5 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-red-900 dark:text-red-200 text-sm"
            >
              <AlertCircle
                className="w-4 h-4 text-red-700 dark:text-red-400 shrink-0 mt-0.5"
                aria-hidden="true"
              />
              <span>{td(errorMsg)}</span>
            </div>
          )}

          {/* Role Selector Radio Cards */}
          <fieldset>
            <legend className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
              {dt('Select Account Role', 'অ্যাকাউন্টের ভূমিকা নির্বাচন করুন')}
            </legend>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label
                className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-colors ${
                  role === 'teacher'
                    ? 'bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-600 dark:border-emerald-500'
                    : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <input
                  type="radio"
                  name="manual-role"
                  value="teacher"
                  checked={role === 'teacher'}
                  onChange={() => setRole('teacher')}
                  className="mt-1 accent-emerald-700"
                />
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 text-sm font-semibold text-slate-900 dark:text-white">
                    <Users className="w-4 h-4 text-emerald-700 dark:text-emerald-400" aria-hidden="true" />
                    <span>{td('Teacher')}</span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {dt(
                      'Assigned directly to {pathway} teachers directory',
                      'সরাসরি {pathway} শিক্ষক তালিকায় যুক্ত হবে',
                      { pathway: pathwayLabel }
                    )}
                  </p>
                </div>
              </label>

              <label
                className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-colors ${
                  role === 'student'
                    ? 'bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-600 dark:border-emerald-500'
                    : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <input
                  type="radio"
                  name="manual-role"
                  value="student"
                  checked={role === 'student'}
                  onChange={() => setRole('student')}
                  className="mt-1 accent-emerald-700"
                />
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 text-sm font-semibold text-slate-900 dark:text-white">
                    <GraduationCap
                      className="w-4 h-4 text-emerald-700 dark:text-emerald-400"
                      aria-hidden="true"
                    />
                    <span>{td('Student')}</span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {dt(
                      'Assigned directly to {pathway} students directory',
                      'সরাসরি {pathway} শিক্ষার্থী তালিকায় যুক্ত হবে',
                      { pathway: pathwayLabel }
                    )}
                  </p>
                </div>
              </label>
            </div>
          </fieldset>

          {/* Full Name & Email */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="manual-full-name"
                className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
              >
                {td('Full Name')} <span className="text-red-600">*</span>
              </label>
              <input
                id="manual-full-name"
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder={dt('e.g. Nusrat Tabassum', 'যেমন: নুসরাত তাবাসসুম')}
                className="w-full px-3.5 py-2.5 min-h-[44px] bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>

            <div>
              <label
                htmlFor="manual-email"
                className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
              >
                {td('Email Address')} <span className="text-red-600">*</span>
              </label>
              <input
                id="manual-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@school.edu.bd"
                className="w-full px-3.5 py-2.5 min-h-[44px] bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>
          </div>

          {/* Temporary Password with Generator */}
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
              <label
                htmlFor="manual-temp-password"
                className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
              >
                {td('Temporary Password')} <span className="text-red-600">*</span>
              </label>
              <button
                type="button"
                onClick={handleGeneratePassword}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:underline"
              >
                <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{dt('Generate Random Password', 'স্বয়ংক্রিয় পাসওয়ার্ড তৈরি করুন')}</span>
              </button>
            </div>
            <div className="relative">
              <input
                id="manual-temp-password"
                type={showPassword ? 'text' : 'password'}
                required
                value={temporaryPassword}
                onChange={(e) => setTemporaryPassword(e.target.value)}
                placeholder={dt('Minimum 8 characters', 'কমপক্ষে ৮ অক্ষর')}
                className="w-full pl-3.5 pr-11 py-2.5 min-h-[44px] bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-sm font-mono text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? dt('Hide password', 'পাসওয়ার্ড লুকান') : dt('Show password', 'পাসওয়ার্ড দেখুন')}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 rounded-md"
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" aria-hidden="true" />
                ) : (
                  <Eye className="w-4 h-4" aria-hidden="true" />
                )}
              </button>
            </div>
          </div>

          {/* Class (1-12) & Dynamic Group (Class 9-12) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="manual-class"
                className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
              >
                {td('Class')}
              </label>
              <select
                id="manual-class"
                value={academicClass}
                onChange={(e) => setAcademicClass(Number(e.target.value) as AcademicClassLevel)}
                className="w-full px-3.5 py-2.5 min-h-[44px] bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-600"
              >
                {ACADEMIC_CLASSES.map((cls) => (
                  <option key={cls} value={cls}>
                    {dt('Class {num}', 'শ্রেণি {num}', { num: cls })}
                  </option>
                ))}
              </select>
            </div>

            {isGroupApplicableForClass(academicClass) && (
              <div>
                <label
                  htmlFor="manual-group"
                  className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
                >
                  {dt('Group (Class 9–12)', 'বিভাগ (শ্রেণি ৯–১২)')}
                </label>
                <select
                  id="manual-group"
                  value={academicGroup}
                  onChange={(e) => setAcademicGroup(e.target.value as AcademicGroup)}
                  className="w-full px-3.5 py-2.5 min-h-[44px] bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                >
                  {ACADEMIC_GROUPS.map((grp) => (
                    <option key={grp} value={grp}>
                      {td(grp)}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="pt-1">
            <button
              type="submit"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 min-h-[46px] bg-emerald-700 hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white text-sm font-semibold rounded-lg transition-colors whitespace-nowrap"
            >
              <UserPlus className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>{dt('Create Account', 'অ্যাকাউন্ট তৈরি করুন')}</span>
            </button>
          </div>
        </form>
      </section>

      {/* Right Column: Credentials Summary Card (on success) or Scope Guidelines */}
      <aside className="lg:col-span-5">
        {createdCredentials ? (
          <div
            role="status"
            className="bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-700 rounded-2xl p-6 space-y-5"
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center shrink-0">
                <CheckCircle2
                  className="w-5 h-5 text-emerald-700 dark:text-emerald-400"
                  aria-hidden="true"
                />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {dt('Credentials Summary', 'লগইন তথ্যের সারসংক্ষেপ')}
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                  {dt(
                    'Account created as Active ({pathway} · Manual). Share these credentials with the user.',
                    'সক্রিয় অ্যাকাউন্ট তৈরি হয়েছে ({pathway} · ম্যানুয়াল)। ব্যবহারকারীর সাথে এই তথ্যগুলো শেয়ার করুন।',
                    { pathway: pathwayLabel }
                  )}
                </p>
              </div>
            </div>

            <dl className="divide-y divide-slate-200 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl text-sm">
              <SummaryRow label={td('Full Name')} value={createdCredentials.profile.fullName} />
              <SummaryRow
                label={td('Role')}
                value={createdCredentials.profile.role === 'teacher' ? td('Teacher') : td('Student')}
              />
              <SummaryRow
                label={td('Academic Level')}
                value={
                  formatDigits(
                    formatAcademicLevel(
                      createdCredentials.profile.academicClass,
                      createdCredentials.profile.academicGroup
                    )
                  )
                }
              />
              <SummaryRow label={td('Email')} value={createdCredentials.profile.email} mono />
              <SummaryRow
                label={td('Temporary Password')}
                value={createdCredentials.temporaryPassword}
                mono
              />
            </dl>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={handleCopyCredentials}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 min-h-[44px] bg-emerald-700 hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white text-sm font-semibold rounded-lg transition-colors whitespace-nowrap"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4" aria-hidden="true" />
                    <span>{dt('Copied Credentials', 'তথ্য কপি হয়েছে')}</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" aria-hidden="true" />
                    <span>{dt('Copy Credentials', 'লগইন তথ্য কপি করুন')}</span>
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={onGoToDirectory}
                className="px-4 py-2.5 min-h-[44px] bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 text-sm font-semibold rounded-lg transition-colors whitespace-nowrap"
              >
                {dt('Open Directory', 'ডিরেক্টরি খুলুন')}
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              {dt('Manual Account Provisioning Rules', 'ম্যানুয়াল অ্যাকাউন্ট তৈরির নিয়মাবলি')}
            </h3>
            <ul className="space-y-2.5 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              <li>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {dt('Pathway Isolation:', 'পাথওয়ে সীমাবদ্ধতা:')}
                </span>{' '}
                {dt(
                  'Accounts created here are automatically locked to {pathway}.',
                  'এখানে তৈরি অ্যাকাউন্টগুলো স্বয়ংক্রিয়ভাবে {pathway}-এ সীমাবদ্ধ থাকবে।',
                  { pathway: pathwayLabel }
                )}
              </li>
              <li>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {dt('Immediate Activation:', 'তাৎক্ষণিক সক্রিয়করণ:')}
                </span>{' '}
                {dt(
                  'Entry source is tagged as Manual and status is set to Active immediately without waiting in Pending Approvals.',
                  'নিবন্ধনের উৎস ম্যানুয়াল হিসেবে চিহ্নিত হবে এবং অনুমোদনের অপেক্ষা ছাড়াই অ্যাকাউন্ট তাৎক্ষণিক সক্রিয় হবে।'
                )}
              </li>
              <li>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {dt('Class & Group Rules:', 'শ্রেণি ও বিভাগের নিয়ম:')}
                </span>{' '}
                {dt(
                  'Group selection (Science, Arts, Commerce) automatically activates for Classes 9–12.',
                  'নবম–দ্বাদশ শ্রেণির জন্য বিভাগ নির্বাচন (বিজ্ঞান, মানবিক, ব্যবসায় শিক্ষা) স্বয়ংক্রিয়ভাবে চালু হয়।'
                )}
              </li>
              <li>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {dt('Credential Handover:', 'লগইন তথ্য হস্তান্তর:')}
                </span>{' '}
                {dt(
                  'Once created, a one-click Credentials Summary Card will appear right here so you can copy and share login details immediately.',
                  'তৈরি হওয়ার সাথে সাথেই এখানে লগইন তথ্যের কার্ড দেখা যাবে, যা এক ক্লিকে কপি করে শেয়ার করা যাবে।'
                )}
              </li>
            </ul>
          </div>
        )}
      </aside>
    </div>
  );
}

function SummaryRow({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="px-4 py-2.5 flex items-center justify-between gap-4">
      <dt className="text-xs text-slate-500 dark:text-slate-400 shrink-0">{label}</dt>
      <dd
        className={`text-slate-900 dark:text-slate-100 font-semibold text-right break-all ${
          mono ? 'font-mono text-xs' : ''
        }`}
      >
        {value}
      </dd>
    </div>
  );
}
