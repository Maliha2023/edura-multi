import React, { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  BookMarked,
  BookOpen,
  Globe,
  GraduationCap,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { PublicShell } from '../components/PublicShell';
import { RoleLoginModal } from '../components/RoleLoginModal';
import { formatDigits, formatMessage, useI18n } from '../i18n';
import type { CurriculumSubTrack, EducationStream, UserRole } from '../types/domain';
import {
  EDUCATION_STREAMS,
  getSubTracksForStream,
  isValidSubTrackForStream,
  normalizeEducationStream,
} from '../utils/validation';

const CURRICULUM_PREF_KEY = 'edura_multi_curriculum_pref';
const LOGIN_ROLES: readonly UserRole[] = ['student', 'teacher', 'admin'] as const;

export interface CurriculumPreference {
  stream: EducationStream;
  pathway: CurriculumSubTrack;
  role?: UserRole;
}

export function isValidUserRole(raw?: string | null): raw is UserRole {
  return raw === 'student' || raw === 'teacher' || raw === 'admin';
}

export function getSavedCurriculumPreference(): CurriculumPreference | null {
  try {
    const raw = window.sessionStorage.getItem(CURRICULUM_PREF_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<CurriculumPreference>;
    const normalizedStream = normalizeEducationStream(parsed.stream);
    if (normalizedStream && isValidSubTrackForStream(normalizedStream, parsed.pathway)) {
      return {
        stream: normalizedStream,
        pathway: parsed.pathway,
        role: isValidUserRole(parsed.role) ? parsed.role : undefined,
      };
    }
  } catch {
    // Ignore storage access failures
  }
  return null;
}

export function saveCurriculumPreference(pref: CurriculumPreference): void {
  try {
    window.sessionStorage.setItem(CURRICULUM_PREF_KEY, JSON.stringify(pref));
  } catch {
    // Ignore storage access failures
  }
}

export function WelcomeCurriculumPage() {
  const { language, t } = useI18n();
  const [searchParams] = useSearchParams();

  const saved = useMemo(() => getSavedCurriculumPreference(), []);
  const requestedStep = searchParams.get('step');
  const initialStep: 'stream' | 'pathway' | 'role' =
    requestedStep === 'role' && saved
      ? 'role'
      : requestedStep === 'pathway' && saved
        ? 'pathway'
        : 'stream';

  const [step, setStep] = useState<'stream' | 'pathway' | 'role'>(initialStep);
  const [selectedStream, setSelectedStream] = useState<EducationStream | null>(
    saved?.stream ?? null
  );
  const [selectedPathway, setSelectedPathway] = useState<CurriculumSubTrack | null>(
    saved?.pathway ?? null
  );
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(saved?.role ?? null);
  const [activeModalRole, setActiveModalRole] = useState<UserRole | null>(null);

  const streamDescriptions: Record<EducationStream, string> = {
    'Bangladesh National Curriculum (NCTB)': t.welcome.streamDescNctb,
    'International Curriculum (English Medium)': t.welcome.streamDescInternational,
    'Bangladesh Madrasa Education': t.welcome.streamDescMadrasa,
  };

  const streamStyles: Record<
    EducationStream,
    {
      icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
      cardBase: string;
      cardSelected: string;
      iconBox: string;
      arrow: string;
    }
  > = {
    'Bangladesh National Curriculum (NCTB)': {
      icon: GraduationCap,
      cardBase:
        'border-emerald-200 dark:border-emerald-800/70 bg-emerald-50/75 dark:bg-emerald-950/35 hover:border-emerald-400 dark:hover:border-emerald-600 hover:bg-emerald-100/60 dark:hover:bg-emerald-950/55 text-slate-900 dark:text-slate-100',
      cardSelected:
        'border-emerald-600 dark:border-emerald-400 bg-emerald-100/90 dark:bg-emerald-950/70 text-emerald-950 dark:text-emerald-50',
      iconBox:
        'bg-emerald-100/90 dark:bg-emerald-900/60 border-emerald-200 dark:border-emerald-700/70 text-emerald-700 dark:text-emerald-300',
      arrow: 'text-emerald-600/80 dark:text-emerald-400',
    },
    'International Curriculum (English Medium)': {
      icon: Globe,
      cardBase:
        'border-sky-200 dark:border-sky-800/70 bg-sky-50/75 dark:bg-sky-950/35 hover:border-sky-400 dark:hover:border-sky-600 hover:bg-sky-100/60 dark:hover:bg-sky-950/55 text-slate-900 dark:text-slate-100',
      cardSelected:
        'border-sky-600 dark:border-sky-400 bg-sky-100/90 dark:bg-sky-950/70 text-sky-950 dark:text-sky-50',
      iconBox:
        'bg-sky-100/90 dark:bg-sky-900/60 border-sky-200 dark:border-sky-700/70 text-sky-700 dark:text-sky-300',
      arrow: 'text-sky-600/80 dark:text-sky-400',
    },
    'Bangladesh Madrasa Education': {
      icon: BookMarked,
      cardBase:
        'border-amber-200 dark:border-amber-800/70 bg-amber-50/75 dark:bg-amber-950/35 hover:border-amber-400 dark:hover:border-amber-600 hover:bg-amber-100/60 dark:hover:bg-amber-950/55 text-slate-900 dark:text-slate-100',
      cardSelected:
        'border-amber-600 dark:border-amber-400 bg-amber-100/90 dark:bg-amber-950/70 text-amber-950 dark:text-amber-50',
      iconBox:
        'bg-amber-100/90 dark:bg-amber-900/60 border-amber-200 dark:border-amber-700/70 text-amber-700 dark:text-amber-300',
      arrow: 'text-amber-600/80 dark:text-amber-400',
    },
  };

  const roleStyles: Record<
    UserRole,
    {
      icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
      cardBase: string;
      cardSelected: string;
      iconBox: string;
      arrow: string;
    }
  > = {
    student: {
      icon: GraduationCap,
      cardBase:
        'border-indigo-200 dark:border-indigo-800/70 bg-indigo-50/75 dark:bg-indigo-950/35 hover:border-indigo-400 dark:hover:border-indigo-600 hover:bg-indigo-100/60 dark:hover:bg-indigo-950/55 text-slate-900 dark:text-slate-100',
      cardSelected:
        'border-indigo-600 dark:border-indigo-400 bg-indigo-100/90 dark:bg-indigo-950/70 text-indigo-950 dark:text-indigo-50',
      iconBox:
        'bg-indigo-100/90 dark:bg-indigo-900/60 border-indigo-200 dark:border-indigo-700/70 text-indigo-700 dark:text-indigo-300',
      arrow: 'text-indigo-600/80 dark:text-indigo-400',
    },
    teacher: {
      icon: Users,
      cardBase:
        'border-teal-200 dark:border-teal-800/70 bg-teal-50/75 dark:bg-teal-950/35 hover:border-teal-400 dark:hover:border-teal-600 hover:bg-teal-100/60 dark:hover:bg-teal-950/55 text-slate-900 dark:text-slate-100',
      cardSelected:
        'border-teal-600 dark:border-teal-400 bg-teal-100/90 dark:bg-teal-950/70 text-teal-950 dark:text-teal-50',
      iconBox:
        'bg-teal-100/90 dark:bg-teal-900/60 border-teal-200 dark:border-teal-700/70 text-teal-700 dark:text-teal-300',
      arrow: 'text-teal-600/80 dark:text-teal-400',
    },
    admin: {
      icon: ShieldCheck,
      cardBase:
        'border-rose-200 dark:border-rose-800/70 bg-rose-50/75 dark:bg-rose-950/35 hover:border-rose-400 dark:hover:border-rose-600 hover:bg-rose-100/60 dark:hover:bg-rose-950/55 text-slate-900 dark:text-slate-100',
      cardSelected:
        'border-rose-600 dark:border-rose-400 bg-rose-100/90 dark:bg-rose-950/70 text-rose-950 dark:text-rose-50',
      iconBox:
        'bg-rose-100/90 dark:bg-rose-900/60 border-rose-200 dark:border-rose-700/70 text-rose-700 dark:text-rose-300',
      arrow: 'text-rose-600/80 dark:text-rose-400',
    },
  };

  const handleSelectStream = (stream: EducationStream) => {
    setSelectedStream(stream);
    if (selectedPathway && !isValidSubTrackForStream(stream, selectedPathway)) {
      setSelectedPathway(null);
    }
    setStep('pathway');
  };

  const handleSelectPathway = (pathway: CurriculumSubTrack) => {
    setSelectedPathway(pathway);
    if (selectedStream) {
      saveCurriculumPreference({
        stream: selectedStream,
        pathway,
        role: selectedRole ?? undefined,
      });
      setStep('role');
    }
  };

  const handleSelectRole = (role: UserRole) => {
    setSelectedRole(role);
    if (selectedStream && selectedPathway) {
      saveCurriculumPreference({
        stream: selectedStream,
        pathway: selectedPathway,
        role,
      });
    }
    setActiveModalRole(role);
  };

  const stepNumber = step === 'stream' ? 1 : step === 'pathway' ? 2 : 3;
  const progressPct = step === 'stream' ? 33 : step === 'pathway' ? 67 : 100;

  return (
    <PublicShell>
      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 py-8 sm:py-12">
        <div className="w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden transition-colors">
          <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/90">
            <div className="flex items-center justify-between gap-4 text-xs sm:text-sm">
              <span className="font-semibold text-slate-700 dark:text-slate-200">
                {t.brand.name}
                <span aria-hidden="true"> · </span>
                {t.brand.country}
              </span>
              <span className="font-medium text-slate-600 dark:text-slate-400 tabular-nums">
                {formatMessage(t.welcome.stepProgress, {
                  current: formatDigits(stepNumber, language),
                  total: formatDigits(3, language),
                })}
              </span>
            </div>
            <div
              role="progressbar"
              aria-valuenow={progressPct}
              aria-valuemin={0}
              aria-valuemax={100}
              className="mt-3 h-1.5 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden"
            >
              <div
                className="h-full bg-emerald-700 dark:bg-emerald-500 transition-all duration-200"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>

          <div className="p-6 sm:p-10">
            {step === 'stream' && (
              <div className="space-y-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-200 dark:border-emerald-800/80 flex items-center justify-center shrink-0">
                    <BookOpen className="w-5 h-5 text-emerald-700 dark:text-emerald-400" aria-hidden="true" />
                  </div>
                  <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white text-balance">
                    {t.welcome.streamTitle}
                  </h1>
                </div>

                <div className="grid grid-cols-1 gap-3.5">
                  {EDUCATION_STREAMS.map((stream) => {
                    const isSelected = selectedStream === stream;
                    const style = streamStyles[stream];
                    const StreamIcon = style.icon;
                    return (
                      <button
                        key={stream}
                        type="button"
                        onClick={() => handleSelectStream(stream)}
                        className={`p-4 min-h-[76px] rounded-xl border text-left transition-colors flex items-center justify-between gap-3.5 ${
                          isSelected ? style.cardSelected : style.cardBase
                        }`}
                      >
                        <div className="flex items-center gap-3.5 min-w-0">
                          <div
                            className={`w-10 h-10 rounded-lg border flex items-center justify-center shrink-0 ${style.iconBox}`}
                          >
                            <StreamIcon className="w-5 h-5" aria-hidden="true" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-base font-semibold">{t.onboarding.streams[stream]}</p>
                            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                              {streamDescriptions[stream]}
                            </p>
                          </div>
                        </div>
                        <ArrowRight className={`w-4 h-4 shrink-0 ${style.arrow}`} aria-hidden="true" />
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {step === 'pathway' && selectedStream && (
              <div className="space-y-6">
                <div className="flex items-start gap-3">
                  <div
                    className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${streamStyles[selectedStream].iconBox}`}
                  >
                    {(() => {
                      const StepIcon = streamStyles[selectedStream].icon;
                      return <StepIcon className="w-5 h-5" aria-hidden="true" />;
                    })()}
                  </div>
                  <div>
                    <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
                      {t.onboarding.streams[selectedStream]}
                    </p>
                    <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mt-0.5 text-balance">
                      {t.welcome.pathwayTitle}
                    </h1>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                      {t.welcome.subTrackSubtitles[selectedStream]}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {getSubTracksForStream(selectedStream).map((pathway) => {
                    const isSelected = selectedPathway === pathway;
                    const style = streamStyles[selectedStream];
                    return (
                      <button
                        key={pathway}
                        type="button"
                        onClick={() => handleSelectPathway(pathway)}
                        className={`p-4 min-h-[80px] rounded-xl border text-left transition-colors flex items-center justify-between gap-3 ${
                          isSelected ? style.cardSelected : style.cardBase
                        }`}
                      >
                        <div>
                          <p className="text-base font-semibold">{t.welcome.subTracks[pathway]}</p>
                          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                            {t.welcome.subTrackDescriptions[pathway]}
                          </p>
                        </div>
                        <ArrowRight className={`w-4 h-4 shrink-0 ${style.arrow}`} aria-hidden="true" />
                      </button>
                    );
                  })}
                </div>

                <div className="pt-2 flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => setStep('stream')}
                    className="inline-flex items-center gap-2 px-4 py-2.5 min-h-[44px] bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 text-sm font-medium rounded-lg transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4" aria-hidden="true" />
                    <span>{t.common.back}</span>
                  </button>
                  {selectedPathway && (
                    <button
                      type="button"
                      onClick={() => handleSelectPathway(selectedPathway)}
                      className="inline-flex items-center gap-2 px-5 py-2.5 min-h-[44px] bg-emerald-700 hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white text-sm font-semibold rounded-lg transition-colors"
                    >
                      <span>{t.common.next}</span>
                      <ArrowRight className="w-4 h-4" aria-hidden="true" />
                    </button>
                  )}
                </div>
              </div>
            )}

            {step === 'role' && selectedStream && selectedPathway && (
              <div className="space-y-6">
                <div className="flex items-start gap-3">
                  <div
                    className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${streamStyles[selectedStream].iconBox}`}
                  >
                    {(() => {
                      const StepIcon = streamStyles[selectedStream].icon;
                      return <StepIcon className="w-5 h-5" aria-hidden="true" />;
                    })()}
                  </div>
                  <div>
                    <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
                      {t.onboarding.streams[selectedStream]}
                      <span aria-hidden="true"> · </span>
                      {t.welcome.subTracks[selectedPathway]}
                    </p>
                    <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mt-0.5 text-balance">
                      {t.welcome.loginRoleTitle}
                    </h1>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                      {t.welcome.loginRoleSubtitle}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3.5">
                  {LOGIN_ROLES.map((role) => {
                    const isSelected = selectedRole === role;
                    const style = roleStyles[role];
                    const RoleIcon = style.icon;
                    return (
                      <button
                        key={role}
                        type="button"
                        onClick={() => handleSelectRole(role)}
                        className={`p-4 min-h-[76px] rounded-xl border text-left transition-colors flex items-center justify-between gap-3.5 ${
                          isSelected ? style.cardSelected : style.cardBase
                        }`}
                      >
                        <div className="flex items-center gap-3.5 min-w-0">
                          <div
                            className={`w-10 h-10 rounded-lg border flex items-center justify-center shrink-0 ${style.iconBox}`}
                          >
                            <RoleIcon className="w-5 h-5" aria-hidden="true" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-base font-semibold">{t.welcome.loginRoles[role]}</p>
                            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                              {t.welcome.loginRoleDescriptions[role]}
                            </p>
                          </div>
                        </div>
                        <ArrowRight className={`w-4 h-4 shrink-0 ${style.arrow}`} aria-hidden="true" />
                      </button>
                    );
                  })}
                </div>

                <div className="pt-2 flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => setStep('pathway')}
                    className="inline-flex items-center gap-2 px-4 py-2.5 min-h-[44px] bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 text-sm font-medium rounded-lg transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4" aria-hidden="true" />
                    <span>{t.common.back}</span>
                  </button>
                  {selectedRole && (
                    <button
                      type="button"
                      onClick={() => handleSelectRole(selectedRole)}
                      className="inline-flex items-center gap-2 px-5 py-2.5 min-h-[44px] bg-emerald-700 hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white text-sm font-semibold rounded-lg transition-colors"
                    >
                      <span>{t.welcome.continueToLogin}</span>
                      <ArrowRight className="w-4 h-4" aria-hidden="true" />
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {activeModalRole && selectedStream && selectedPathway && (
        <RoleLoginModal
          role={activeModalRole}
          stream={selectedStream}
          pathway={selectedPathway}
          onClose={() => setActiveModalRole(null)}
        />
      )}
    </PublicShell>
  );
}

