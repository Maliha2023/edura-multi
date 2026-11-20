import React, { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Edit3,
  History,
  Lock,
  Search,
  X,
  XCircle,
} from 'lucide-react';
import { DashboardShell } from '../components/DashboardShell';
import { formatDigits, formatMessage, useI18n } from '../i18n';
import { registrationService } from '../services/registrationService';
import type {
  EducationStream,
  Language,
  PendingRegistration,
  RegistrationStatus,
  StudentClass,
} from '../types/domain';
import { EDUCATION_STREAMS, STUDENT_CLASSES } from '../utils/validation';

export function AdminRegistrationsPage() {
  const { language, t } = useI18n();
  const [searchParams, setSearchParams] = useSearchParams();

  const [tab, setTab] = useState<RegistrationStatus>('pending');
  const [refreshTick, setRefreshTick] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(() => searchParams.get('id'));

  const [isEditing, setIsEditing] = useState(false);
  const [editFullName, setEditFullName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editTeacherId, setEditTeacherId] = useState('');
  const [editClass, setEditClass] = useState<StudentClass>(6);
  const [editStream, setEditStream] = useState<EducationStream>(
    'Bangladesh National Curriculum (NCTB)'
  );
  const [editPathway, setEditPathway] = useState('General');
  const [editLang, setEditLang] = useState<Language>('en');

  const [showRejectBox, setShowRejectBox] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [feedbackError, setFeedbackError] = useState<string | null>(null);
  const [editSaved, setEditSaved] = useState(false);
  const [historySearch, setHistorySearch] = useState('');

  const pathwayOptions = useMemo(() => registrationService.getPathwayOptions(), []);

  const allRegistrations = useMemo(() => {
    void refreshTick;
    return registrationService.listRegistrations();
  }, [refreshTick]);

  const counts = useMemo(
    () => ({
      pending: allRegistrations.filter((r) => r.status === 'pending').length,
      approved: allRegistrations.filter((r) => r.status === 'approved').length,
      rejected: allRegistrations.filter((r) => r.status === 'rejected').length,
    }),
    [allRegistrations]
  );

  const visibleList = useMemo(
    () => allRegistrations.filter((r) => r.status === tab),
    [allRegistrations, tab]
  );

  const selectedReg = useMemo(
    () => allRegistrations.find((r) => r.id === selectedId) ?? visibleList[0] ?? null,
    [allRegistrations, selectedId, visibleList]
  );

  const editFieldLabelMap = useMemo<Record<string, string>>(
    () => ({
      fullName: t.onboarding.review.fieldName,
      email: t.onboarding.review.fieldEmail,
      phone: t.onboarding.review.fieldPhone,
      teacherId: t.onboarding.review.fieldTeacherId,
      studentClass: t.onboarding.review.fieldClass,
      educationStream: t.onboarding.review.fieldStream,
      pathway: t.onboarding.review.fieldPathway,
      preferredLanguage: t.onboarding.review.fieldLanguage,
    }),
    [t]
  );

  const filteredEditHistory = useMemo(
    () =>
      selectedReg
        ? registrationService.filterEditHistory(
            selectedReg.editHistory,
            historySearch,
            editFieldLabelMap
          )
        : [],
    [selectedReg, historySearch, editFieldLabelMap]
  );

  const selectRegistration = (reg: PendingRegistration) => {
    setSelectedId(reg.id);
    setSearchParams({ id: reg.id }, { replace: true });
    setIsEditing(false);
    setShowRejectBox(false);
    setRejectReason('');
    setFeedbackError(null);
    setEditSaved(false);
    setHistorySearch('');
  };

  const startEditing = (reg: PendingRegistration) => {
    setEditFullName(reg.fullName);
    setEditEmail(reg.email);
    setEditPhone(reg.phone ?? '');
    setEditTeacherId(reg.teacherId ?? '');
    setEditClass(reg.studentClass ?? 6);
    setEditStream(reg.educationStream ?? 'Bangladesh National Curriculum (NCTB)');
    setEditPathway(reg.pathway ?? pathwayOptions[0] ?? 'General');
    setEditLang(reg.preferredLanguage);
    setIsEditing(true);
    setShowRejectBox(false);
    setFeedbackError(null);
    setEditSaved(false);
  };

  const resolveErrorKey = (key: string): string => {
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
      case 'validation.teacherIdRequired':
        return t.validation.teacherIdRequired;
      case 'registrations.rejectReasonRequired':
        return t.admin.registrations.rejectReasonRequired;
      case 'registrations.notFound':
        return t.admin.registrations.notFound;
      case 'registrations.alreadyReviewed':
        return t.admin.registrations.alreadyReviewed;
      default:
        return key;
    }
  };

  const handleSaveEdits = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReg) return;
    setFeedbackError(null);
    setEditSaved(false);

    const patch =
      selectedReg.role === 'teacher'
        ? {
            fullName: editFullName,
            email: editEmail,
            teacherId: editTeacherId,
            preferredLanguage: editLang,
          }
        : {
            fullName: editFullName,
            email: editEmail,
            phone: editPhone,
            studentClass: editClass,
            educationStream: editStream,
            pathway: editPathway,
            preferredLanguage: editLang,
          };

    const res = registrationService.updateRegistration(selectedReg.id, patch);
    if (!res.ok) {
      setFeedbackError(resolveErrorKey(res.errorKey));
      return;
    }

    setIsEditing(false);
    setEditSaved(true);
    setRefreshTick((n) => n + 1);
  };

  const handleApprove = () => {
    if (!selectedReg) return;
    setFeedbackError(null);
    setEditSaved(false);
    const res = registrationService.approveRegistration(selectedReg.id);
    if (!res.ok) {
      setFeedbackError(resolveErrorKey(res.errorKey));
      return;
    }
    setIsEditing(false);
    setShowRejectBox(false);
    setRefreshTick((n) => n + 1);
  };

  const handleReject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReg) return;
    setFeedbackError(null);
    setEditSaved(false);
    const res = registrationService.rejectRegistration(selectedReg.id, rejectReason);
    if (!res.ok) {
      setFeedbackError(resolveErrorKey(res.errorKey));
      return;
    }
    setShowRejectBox(false);
    setRejectReason('');
    setRefreshTick((n) => n + 1);
  };

  return (
    <DashboardShell title={t.admin.registrations.title}>
      <div className="space-y-6">
        <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              {t.admin.registrations.title}
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              {t.admin.registrations.subtitle}
            </p>
          </div>
          <div className="inline-flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg self-start">
            {(
              [
                { id: 'pending', label: t.admin.registrations.tabPending, count: counts.pending },
                { id: 'approved', label: t.admin.registrations.tabApproved, count: counts.approved },
                { id: 'rejected', label: t.admin.registrations.tabRejected, count: counts.rejected },
              ] as const
            ).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setTab(item.id);
                  setIsEditing(false);
                  setShowRejectBox(false);
                  setFeedbackError(null);
                  setEditSaved(false);
                  setHistorySearch('');
                }}
                className={`px-3 py-1.5 min-h-[36px] text-xs font-semibold rounded-md transition-colors whitespace-nowrap tabular-nums ${
                  tab === item.id
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {item.label} ({formatDigits(item.count, language)})
              </button>
            ))}
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Registration List */}
          <section className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden transition-colors">
            {visibleList.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-500 dark:text-slate-400">
                {tab === 'pending'
                  ? t.admin.registrations.emptyPending
                  : t.admin.registrations.emptyTab}
              </div>
            ) : (
              <div className="divide-y divide-slate-200 dark:divide-slate-800">
                {visibleList.map((reg) => {
                  const isActive = selectedReg?.id === reg.id;
                  return (
                    <button
                      key={reg.id}
                      type="button"
                      onClick={() => selectRegistration(reg)}
                      className={`w-full text-left px-5 py-4 transition-colors flex items-center justify-between gap-3 min-h-[68px] ${
                        isActive
                          ? 'bg-emerald-50/70 dark:bg-emerald-950/50'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                      }`}
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                          {reg.fullName}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                          {reg.role === 'teacher' ? t.common.roleTeacher : t.common.roleStudent}
                          <span aria-hidden="true"> · </span>
                          <span>
                            {new Date(reg.submittedAt).toLocaleString(
                              language === 'bn' ? 'bn-BD' : 'en-US',
                              { dateStyle: 'medium', timeStyle: 'short' }
                            )}
                          </span>
                        </p>
                      </div>
                      <span className="text-xs font-mono text-slate-600 dark:text-slate-300 shrink-0">
                        {reg.couponCode}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          {/* Detail & Review Panel */}
          <section className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 transition-colors">
            {!selectedReg ? (
              <p className="text-sm text-slate-500 dark:text-slate-400 py-8 text-center">
                {t.admin.registrations.selectPrompt}
              </p>
            ) : (
              <div className="space-y-6">
                <div className="flex flex-wrap items-start justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                      {selectedReg.fullName}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      {selectedReg.role === 'teacher' ? t.common.roleTeacher : t.common.roleStudent}
                      <span aria-hidden="true"> · </span>
                      <span className="font-mono">{selectedReg.couponCode}</span>
                      <span aria-hidden="true"> · </span>
                      <span>
                        {new Date(selectedReg.submittedAt).toLocaleString(
                          language === 'bn' ? 'bn-BD' : 'en-US',
                          { dateStyle: 'medium', timeStyle: 'short' }
                        )}
                      </span>
                    </p>
                  </div>
                </div>

                {selectedReg.status === 'approved' && (
                  <div className="flex items-center gap-2.5 p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 text-sm">
                    <CheckCircle2
                      className="w-4 h-4 text-emerald-700 dark:text-emerald-400 shrink-0"
                      aria-hidden="true"
                    />
                    <span>{t.admin.registrations.approvedBanner}</span>
                  </div>
                )}

                {selectedReg.status === 'rejected' && (
                  <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-red-900 dark:text-red-200 text-sm">
                    <XCircle
                      className="w-4 h-4 text-red-700 dark:text-red-400 shrink-0 mt-0.5"
                      aria-hidden="true"
                    />
                    <span>
                      {formatMessage(t.admin.registrations.rejectedBanner, {
                        reason: selectedReg.rejectionReason ?? '',
                      })}
                    </span>
                  </div>
                )}

                {editSaved && (
                  <div
                    role="status"
                    className="flex items-center gap-2.5 p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 text-sm"
                  >
                    <CheckCircle2
                      className="w-4 h-4 text-emerald-700 dark:text-emerald-400 shrink-0"
                      aria-hidden="true"
                    />
                    <span>{t.admin.registrations.editSavedBanner}</span>
                  </div>
                )}

                {feedbackError && (
                  <div
                    role="alert"
                    className="flex items-start gap-2.5 p-3.5 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-red-900 dark:text-red-200 text-sm"
                  >
                    <AlertCircle
                      className="w-4 h-4 text-red-700 dark:text-red-400 shrink-0 mt-0.5"
                      aria-hidden="true"
                    />
                    <span>{feedbackError}</span>
                  </div>
                )}

                {/* Encrypted Password Notice */}
                <div className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300">
                  <Lock className="w-4 h-4 text-slate-500 dark:text-slate-400 shrink-0" aria-hidden="true" />
                  <span>{t.admin.registrations.passwordNotice}</span>
                </div>

                {isEditing ? (
                  <form onSubmit={handleSaveEdits} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label
                          htmlFor="edit-fullname"
                          className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
                        >
                          {t.onboarding.review.fieldName}
                        </label>
                        <input
                          id="edit-fullname"
                          type="text"
                          value={editFullName}
                          onChange={(e) => setEditFullName(e.target.value)}
                          className="w-full px-3 py-2 min-h-[42px] bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="edit-email"
                          className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
                        >
                          {t.onboarding.review.fieldEmail}
                        </label>
                        <input
                          id="edit-email"
                          type="email"
                          value={editEmail}
                          onChange={(e) => setEditEmail(e.target.value)}
                          className="w-full px-3 py-2 min-h-[42px] bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="edit-lang"
                          className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
                        >
                          {t.onboarding.review.fieldLanguage}
                        </label>
                        <select
                          id="edit-lang"
                          value={editLang}
                          onChange={(e) => setEditLang(e.target.value as Language)}
                          className="w-full px-3 py-2 min-h-[42px] bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                        >
                          <option value="en">{t.common.english}</option>
                          <option value="bn">{t.common.bangla}</option>
                        </select>
                      </div>

                      {selectedReg.role === 'teacher' ? (
                        <div>
                          <label
                            htmlFor="edit-teacher-id"
                            className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
                          >
                            {t.onboarding.review.fieldTeacherId}
                          </label>
                          <input
                            id="edit-teacher-id"
                            type="text"
                            value={editTeacherId}
                            onChange={(e) => setEditTeacherId(e.target.value)}
                            className="w-full px-3 py-2 min-h-[42px] bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-sm font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                          />
                        </div>
                      ) : (
                        <>
                          <div>
                            <label
                              htmlFor="edit-phone"
                              className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
                            >
                              {t.onboarding.review.fieldPhone}
                            </label>
                            <input
                              id="edit-phone"
                              type="text"
                              value={editPhone}
                              onChange={(e) => setEditPhone(e.target.value)}
                              className="w-full px-3 py-2 min-h-[42px] bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-sm font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                            />
                          </div>

                          <div>
                            <label
                              htmlFor="edit-class"
                              className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
                            >
                              {t.onboarding.review.fieldClass}
                            </label>
                            <select
                              id="edit-class"
                              value={editClass}
                              onChange={(e) =>
                                setEditClass(Number(e.target.value) as StudentClass)
                              }
                              className="w-full px-3 py-2 min-h-[42px] bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                            >
                              {STUDENT_CLASSES.map((cls) => (
                                <option key={cls} value={cls}>
                                  {formatMessage(t.onboarding.stepStudentClass.classOption, {
                                    num: formatDigits(cls, language),
                                  })}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label
                              htmlFor="edit-stream"
                              className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
                            >
                              {t.onboarding.review.fieldStream}
                            </label>
                            <select
                              id="edit-stream"
                              value={editStream}
                              onChange={(e) =>
                                setEditStream(e.target.value as EducationStream)
                              }
                              className="w-full px-3 py-2 min-h-[42px] bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                            >
                              {EDUCATION_STREAMS.map((st) => (
                                <option key={st} value={st}>
                                  {t.onboarding.streams[st]}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label
                              htmlFor="edit-pathway"
                              className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
                            >
                              {t.onboarding.review.fieldPathway}
                            </label>
                            <select
                              id="edit-pathway"
                              value={editPathway}
                              onChange={(e) => setEditPathway(e.target.value)}
                              className="w-full px-3 py-2 min-h-[42px] bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                            >
                              {pathwayOptions.map((opt) => (
                                <option key={opt} value={opt}>
                                  {t.onboarding.pathways[
                                    opt as keyof typeof t.onboarding.pathways
                                  ] ?? opt}
                                </option>
                              ))}
                            </select>
                          </div>
                        </>
                      )}
                    </div>

                    <div className="flex items-center gap-3 pt-2">
                      <button
                        type="submit"
                        className="px-4 py-2.5 min-h-[44px] bg-emerald-700 hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white text-sm font-semibold rounded-lg transition-colors"
                      >
                        {t.admin.registrations.saveEditsButton}
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsEditing(false)}
                        className="px-4 py-2.5 min-h-[44px] bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-sm font-medium rounded-lg transition-colors"
                      >
                        {t.admin.registrations.cancelEditButton}
                      </button>
                    </div>
                  </form>
                ) : (
                  <dl className="divide-y divide-slate-200 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl">
                    <DetailRow label={t.onboarding.review.fieldName} value={selectedReg.fullName} />
                    <DetailRow label={t.onboarding.review.fieldEmail} value={selectedReg.email} />
                    <DetailRow
                      label={t.onboarding.review.fieldPassword}
                      value="********"
                      mono
                    />
                    <DetailRow
                      label={t.onboarding.review.fieldLanguage}
                      value={
                        selectedReg.preferredLanguage === 'bn'
                          ? t.common.bangla
                          : t.common.english
                      }
                    />
                    {selectedReg.role === 'teacher' ? (
                      <DetailRow
                        label={t.onboarding.review.fieldTeacherId}
                        value={selectedReg.teacherId ?? '—'}
                        mono
                      />
                    ) : (
                      <>
                        <DetailRow
                          label={t.onboarding.review.fieldPhone}
                          value={selectedReg.phone ?? '—'}
                          mono
                        />
                        <DetailRow
                          label={t.onboarding.review.fieldClass}
                          value={
                            selectedReg.studentClass
                              ? formatMessage(t.onboarding.stepStudentClass.classOption, {
                                  num: formatDigits(selectedReg.studentClass, language),
                                })
                              : '—'
                          }
                        />
                        <DetailRow
                          label={t.onboarding.review.fieldStream}
                          value={
                            selectedReg.educationStream
                              ? t.onboarding.streams[selectedReg.educationStream] ??
                                selectedReg.educationStream
                              : '—'
                          }
                        />
                        <DetailRow
                          label={t.onboarding.review.fieldPathway}
                          value={
                            selectedReg.pathway
                              ? t.onboarding.pathways[
                                  selectedReg.pathway as keyof typeof t.onboarding.pathways
                                ] ?? selectedReg.pathway
                              : '—'
                          }
                        />
                      </>
                    )}
                  </dl>
                )}

                {/* Pending Actions: Approve, Edit Manually, or Reject */}
                {selectedReg.status === 'pending' && !isEditing && (
                  <div className="space-y-4 pt-2">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <button
                        type="button"
                        onClick={handleApprove}
                        className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 min-h-[44px] bg-emerald-700 hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white text-sm font-semibold rounded-lg transition-colors whitespace-nowrap"
                      >
                        <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden="true" />
                        <span>{t.admin.registrations.approveButton}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => startEditing(selectedReg)}
                        className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 min-h-[44px] bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-sm font-semibold rounded-lg transition-colors whitespace-nowrap"
                      >
                        <Edit3 className="w-4 h-4 shrink-0" aria-hidden="true" />
                        <span>{t.admin.registrations.editManuallyButton}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowRejectBox((prev) => !prev)}
                        className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 min-h-[44px] bg-white dark:bg-slate-900 hover:bg-red-50 dark:hover:bg-red-950/50 text-red-700 dark:text-red-400 border border-red-300 dark:border-red-800 text-sm font-semibold rounded-lg transition-colors whitespace-nowrap"
                      >
                        <XCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
                        <span>{t.admin.registrations.rejectButton}</span>
                      </button>
                    </div>

                    {showRejectBox && (
                      <form
                        onSubmit={handleReject}
                        className="p-4 rounded-xl bg-red-50/70 dark:bg-red-950/40 border border-red-200 dark:border-red-800 space-y-3"
                      >
                        <label
                          htmlFor="reject-reason"
                          className="block text-sm font-semibold text-red-900 dark:text-red-200"
                        >
                          {t.admin.registrations.rejectReasonLabel}
                        </label>
                        <textarea
                          id="reject-reason"
                          rows={3}
                          value={rejectReason}
                          onChange={(e) => setRejectReason(e.target.value)}
                          placeholder={t.admin.registrations.rejectReasonPlaceholder}
                          className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-red-300 dark:border-red-800 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-red-600"
                        />
                        <div className="flex items-center gap-2">
                          <button
                            type="submit"
                            className="px-4 py-2 min-h-[40px] bg-red-700 hover:bg-red-800 text-white text-xs font-semibold rounded-lg transition-colors"
                          >
                            {t.admin.registrations.confirmRejectButton}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setShowRejectBox(false);
                              setRejectReason('');
                            }}
                            className="px-3.5 py-2 min-h-[40px] bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs font-medium rounded-lg"
                          >
                            {t.common.cancel}
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                )}

                {/* Approved Registration Action: Edit Manually */}
                {selectedReg.status === 'approved' && !isEditing && (
                  <div className="pt-2 flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={() => startEditing(selectedReg)}
                      className="inline-flex items-center gap-2 px-4 py-2.5 min-h-[44px] bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-sm font-semibold rounded-lg transition-colors whitespace-nowrap"
                    >
                      <Edit3 className="w-4 h-4" aria-hidden="true" />
                      <span>{t.admin.registrations.editManuallyButton}</span>
                    </button>
                  </div>
                )}

                {/* Edit History */}
                <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
                      <History className="w-4 h-4 text-slate-500 dark:text-slate-400 shrink-0" aria-hidden="true" />
                      <span>{t.admin.registrations.editHistoryTitle}</span>
                      {selectedReg.editHistory.length > 0 && (
                        <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 tabular-nums">
                          (
                          {historySearch.trim()
                            ? `${formatDigits(filteredEditHistory.length, language)}/${formatDigits(selectedReg.editHistory.length, language)}`
                            : formatDigits(selectedReg.editHistory.length, language)}
                          )
                        </span>
                      )}
                    </div>

                    <div className="relative w-full sm:w-64">
                      <label htmlFor="edit-history-search" className="sr-only">
                        {t.admin.registrations.editHistorySearchLabel}
                      </label>
                      <Search
                        className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                        aria-hidden="true"
                      />
                      <input
                        id="edit-history-search"
                        type="text"
                        value={historySearch}
                        onChange={(e) => setHistorySearch(e.target.value)}
                        placeholder={t.admin.registrations.editHistorySearchPlaceholder}
                        className="w-full pl-8 pr-8 py-1.5 min-h-[36px] bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600"
                      />
                      {historySearch && (
                        <button
                          type="button"
                          onClick={() => setHistorySearch('')}
                          aria-label={t.admin.registrations.editHistoryClearSearch}
                          className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded"
                        >
                          <X className="w-3.5 h-3.5" aria-hidden="true" />
                        </button>
                      )}
                    </div>
                  </div>

                  {selectedReg.editHistory.length === 0 ? (
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {t.admin.registrations.noEditsYet}
                    </p>
                  ) : filteredEditHistory.length === 0 ? (
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {t.admin.registrations.noEditsMatchSearch}
                    </p>
                  ) : (
                    <ul className="space-y-2 text-xs">
                      {filteredEditHistory.map((entry) => (
                        <li
                          key={entry.id}
                          className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700"
                        >
                          <span className="text-slate-800 dark:text-slate-200">
                            {formatMessage(t.admin.registrations.changedFromTo, {
                              field: editFieldLabelMap[entry.field] ?? entry.field,
                              old: entry.oldValue || '—',
                              new: entry.newValue || '—',
                            })}
                          </span>
                          <span className="text-slate-500 dark:text-slate-400 inline-flex items-center gap-1 tabular-nums">
                            <Clock className="w-3 h-3" aria-hidden="true" />
                            {new Date(entry.editedAt).toLocaleString(
                              language === 'bn' ? 'bn-BD' : 'en-US',
                              { dateStyle: 'short', timeStyle: 'short' }
                            )}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </DashboardShell>
  );
}

function DetailRow({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="px-4 py-3 flex items-center justify-between gap-4 text-sm">
      <dt className="text-slate-500 dark:text-slate-400 shrink-0">{label}</dt>
      <dd
        className={`text-slate-900 dark:text-slate-100 font-medium text-right break-all ${
          mono ? 'font-mono' : ''
        }`}
      >
        {value}
      </dd>
    </div>
  );
}
