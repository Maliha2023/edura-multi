import React from 'react';
import { Bell, BookOpen, CalendarCheck, CheckSquare, ClipboardCheck, CreditCard, TrendingUp, Users } from 'lucide-react';
import { DashboardShell } from '../components/DashboardShell';
import { PlaceholderModulePage } from '../components/PlaceholderModulePage';
import { useAuth } from '../context/AuthContext';
import { formatDigits, formatMessage, useI18n } from '../i18n';

export function StudentDashboardPage() {
  const { profile } = useAuth();
  const { language, t } = useI18n();

  if (!profile) return null;

  return (
    <DashboardShell title={t.student.dashboardTitle}>
      <div className="space-y-6">
        <section className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8">
          <p className="text-xs font-semibold text-emerald-700">{t.common.roleStudent}</p>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">
            {formatMessage(t.student.welcomeTitle, { name: profile.fullName })}
          </h2>
          <p className="text-sm text-slate-600 mt-1.5">{t.student.welcomeSubtitle}</p>

          <div className="mt-6 pt-6 border-t border-slate-200">
            <h3 className="text-sm font-semibold text-slate-800 mb-3">{t.student.profileSummary}</h3>
            <dl className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <dt className="text-xs text-slate-500">{t.onboarding.review.fieldClass}</dt>
                <dd className="font-semibold text-slate-900 mt-1">
                  {profile.studentClass
                    ? formatMessage(t.student.classLabel, {
                        num: formatDigits(profile.studentClass, language),
                      })
                    : '—'}
                </dd>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <dt className="text-xs text-slate-500">{t.onboarding.review.fieldStream}</dt>
                <dd className="font-semibold text-slate-900 mt-1">
                  {profile.educationStream
                    ? t.onboarding.streams[profile.educationStream] ?? profile.educationStream
                    : '—'}
                </dd>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <dt className="text-xs text-slate-500">{t.onboarding.review.fieldPathway}</dt>
                <dd className="font-semibold text-slate-900 mt-1">
                  {profile.pathway
                    ? t.onboarding.pathways[profile.pathway as keyof typeof t.onboarding.pathways] ??
                      profile.pathway
                    : '—'}
                </dd>
              </div>
            </dl>
          </div>
        </section>

        <section className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8">
          <p className="text-xs font-semibold text-emerald-700">{t.common.comingSoon}</p>
          <h3 className="text-lg font-bold text-slate-900 mt-1">{t.nav.courseModules}</h3>
          <p className="text-sm text-slate-600 mt-1.5 max-w-2xl">{t.common.comingSoonDesc}</p>
        </section>
      </div>
    </DashboardShell>
  );
}

export function StudentPaymentLedgerPage() {
  const { t } = useI18n();
  return <PlaceholderModulePage title={t.student.ledgerTitle} icon={CreditCard} />;
}

export function StudentCourseModulesPage() {
  const { t } = useI18n();
  return <PlaceholderModulePage title={t.student.modulesTitle} icon={BookOpen} />;
}

export function StudentStudyPlanPage() {
  const { t } = useI18n();
  return <PlaceholderModulePage title={t.student.studyPlanTitle} icon={CalendarCheck} />;
}

export function StudentProgressPage() {
  const { t } = useI18n();
  return <PlaceholderModulePage title={t.student.progressTitle} icon={TrendingUp} />;
}

export function TeacherDashboardPage() {
  const { profile } = useAuth();
  const { t } = useI18n();

  if (!profile) return null;

  return (
    <DashboardShell title={t.teacher.dashboardTitle}>
      <div className="space-y-6">
        <section className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8">
          <p className="text-xs font-semibold text-emerald-700">{t.common.roleTeacher}</p>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">
            {formatMessage(t.teacher.welcomeTitle, { name: profile.fullName })}
          </h2>
          <p className="text-sm text-slate-600 mt-1.5">{t.teacher.welcomeSubtitle}</p>

          <div className="mt-6 pt-5 border-t border-slate-200 flex flex-wrap gap-6 text-sm">
            <div>
              <span className="text-slate-500">{t.teacher.teacherIdLabel}: </span>
              <span className="font-mono font-semibold text-slate-900">
                {profile.teacherId ?? '—'}
              </span>
            </div>
            <div>
              <span className="text-slate-500">{t.onboarding.review.fieldEmail}: </span>
              <span className="font-medium text-slate-900">{profile.email}</span>
            </div>
          </div>
        </section>

        <section className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8">
          <p className="text-xs font-semibold text-emerald-700">{t.common.comingSoon}</p>
          <h3 className="text-lg font-bold text-slate-900 mt-1">{t.nav.grading}</h3>
          <p className="text-sm text-slate-600 mt-1.5 max-w-2xl">{t.common.comingSoonDesc}</p>
        </section>
      </div>
    </DashboardShell>
  );
}

export function TeacherAttendancePage() {
  const { t } = useI18n();
  return <PlaceholderModulePage title={t.teacher.attendanceTitle} icon={CheckSquare} />;
}

export function TeacherGradingPage() {
  const { t } = useI18n();
  return <PlaceholderModulePage title={t.teacher.gradingTitle} icon={ClipboardCheck} />;
}

export function AdminNoticesPage() {
  const { t } = useI18n();
  return <PlaceholderModulePage title={t.admin.placeholders.noticesTitle} icon={Bell} />;
}

export function AdminPaymentsPage() {
  const { t } = useI18n();
  return <PlaceholderModulePage title={t.admin.placeholders.paymentsTitle} icon={CreditCard} />;
}

export function AdminUsersPage() {
  const { t } = useI18n();
  return <PlaceholderModulePage title={t.admin.placeholders.usersTitle} icon={Users} />;
}
