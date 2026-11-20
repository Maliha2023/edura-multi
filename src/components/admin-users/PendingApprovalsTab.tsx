import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Edit3,
  GraduationCap,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import {
  ACADEMIC_CLASSES,
  ACADEMIC_GROUPS,
  adminUsersService,
  formatAcademicLevel,
  formatCountdownRemaining,
  isGroupApplicableForClass,
  type AcademicClassLevel,
  type AcademicGroup,
  type AdminUserPathway,
  type DirectoryRole,
  type PathwayPendingRegistration,
} from '../../services/adminUsersService';
import { useDashboardLanguage } from '../../i18n/useDashboardLanguage';

interface PendingApprovalsTabProps {
  pathway: AdminUserPathway;
  pendingItems: PathwayPendingRegistration[];
  onDataChanged: () => void;
}

export function PendingApprovalsTab({
  pathway,
  pendingItems,
  onDataChanged,
}: PendingApprovalsTabProps) {
  const { td, dt, formatDigits, formatCountdown } = useDashboardLanguage();
  const [roleView, setRoleView] = useState<DirectoryRole>('teacher');
  const [groupFilter, setGroupFilter] = useState<AcademicGroup | 'all'>('all');
  const [nowTick, setNowTick] = useState(() => Date.now());

  const [editingRecord, setEditingRecord] = useState<PathwayPendingRegistration | null>(null);
  const [editName, setEditName] = useState('');
  const [editClass, setEditClass] = useState<AcademicClassLevel>(10);
  const [editGroup, setEditGroup] = useState<AcademicGroup>('Science');
  const [editError, setEditError] = useState<string | null>(null);

  const [rejectTarget, setRejectTarget] = useState<PathwayPendingRegistration | null>(null);
  const [banner, setBanner] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Live 1-second tick for 48h countdown timers
  useEffect(() => {
    const timer = window.setInterval(() => setNowTick(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  // Close modals on Escape
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setEditingRecord(null);
        setRejectTarget(null);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const teacherCount = useMemo(
    () => pendingItems.filter((item) => item.role === 'teacher').length,
    [pendingItems]
  );
  const studentCount = useMemo(
    () => pendingItems.filter((item) => item.role === 'student').length,
    [pendingItems]
  );

  const filteredItems = useMemo(
    () =>
      adminUsersService.filterPending(pendingItems, {
        role: roleView,
        academicGroup: roleView === 'student' ? groupFilter : 'all',
      }),
    [pendingItems, roleView, groupFilter]
  );

  const openEditModal = (record: PathwayPendingRegistration) => {
    setEditingRecord(record);
    setEditName(record.fullName);
    setEditClass(record.academicClass);
    setEditGroup(record.academicGroup ?? 'Science');
    setEditError(null);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRecord) return;
    setEditError(null);

    const res = adminUsersService.editPendingRegistration(pathway, editingRecord.id, {
      fullName: editName,
      academicClass: editClass,
      academicGroup: isGroupApplicableForClass(editClass) ? editGroup : null,
    });
    if (!res.ok) {
      setEditError(res.error);
      return;
    }

    setEditingRecord(null);
    setBanner({
      type: 'success',
      message: dt(
        'Updated pending request for {name}.',
        '{name}-এর অপেক্ষমাণ আবেদন আপডেট হয়েছে।',
        { name: res.record.fullName }
      ),
    });
    onDataChanged();
  };

  const handleApprove = (record: PathwayPendingRegistration) => {
    const res = adminUsersService.approvePendingRegistration(pathway, record.id);
    if (!res.ok) {
      setBanner({ type: 'error', message: res.error });
      return;
    }
    setBanner({
      type: 'success',
      message: dt(
        'Approved {name} — account created as Active (Auto Coupon) and coupon {code} marked used.',
        '{name}-কে অনুমোদন দেওয়া হয়েছে — অ্যাকাউন্ট সক্রিয় হয়েছে এবং কুপন {code} ব্যবহৃত হিসেবে চিহ্নিত হয়েছে।',
        { name: res.profile.fullName, code: record.couponCode }
      ),
    });
    onDataChanged();
  };

  const handleConfirmReject = () => {
    if (!rejectTarget) return;
    const name = rejectTarget.fullName;
    const res = adminUsersService.rejectPendingRegistration(pathway, rejectTarget.id);
    setRejectTarget(null);
    if (!res.ok) {
      setBanner({ type: 'error', message: res.error });
      return;
    }
    setBanner({
      type: 'success',
      message: dt(
        'Rejected and removed pending registration for {name}.',
        '{name}-এর অপেক্ষমাণ আবেদন বাতিল ও অপসারণ করা হয়েছে।',
        { name }
      ),
    });
    onDataChanged();
  };

  return (
    <div className="space-y-5">
      {banner && (
        <div
          role={banner.type === 'error' ? 'alert' : 'status'}
          className={`flex items-center justify-between gap-3 px-4 py-3 rounded-xl border text-sm ${
            banner.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
              : 'bg-red-50 dark:bg-red-950/50 border-red-200 dark:border-red-800 text-red-900 dark:text-red-200'
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            {banner.type === 'success' ? (
              <CheckCircle2
                className="w-4 h-4 text-emerald-700 dark:text-emerald-400 shrink-0"
                aria-hidden="true"
              />
            ) : (
              <AlertCircle
                className="w-4 h-4 text-red-700 dark:text-red-400 shrink-0"
                aria-hidden="true"
              />
            )}
            <span>{banner.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setBanner(null)}
            aria-label="Dismiss message"
            className="p-1 rounded-md opacity-70 hover:opacity-100 shrink-0"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      )}

      {/* Role Sub-Views & Conditional Student Group Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div
          role="tablist"
          aria-label="Pending role filter"
          className="inline-flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl self-start"
        >
          <button
            type="button"
            role="tab"
            aria-selected={roleView === 'teacher'}
            onClick={() => setRoleView('teacher')}
            className={`inline-flex items-center gap-2 px-3.5 py-2 min-h-[40px] rounded-lg text-sm font-semibold transition-colors whitespace-nowrap tabular-nums ${
              roleView === 'teacher'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Users className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>
              {dt('Teacher Pending ({count})', 'অপেক্ষমাণ শিক্ষক ({count})', {
                count: teacherCount,
              })}
            </span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={roleView === 'student'}
            onClick={() => setRoleView('student')}
            className={`inline-flex items-center gap-2 px-3.5 py-2 min-h-[40px] rounded-lg text-sm font-semibold transition-colors whitespace-nowrap tabular-nums ${
              roleView === 'student'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <GraduationCap className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>
              {dt('Student Pending ({count})', 'অপেক্ষমাণ শিক্ষার্থী ({count})', {
                count: studentCount,
              })}
            </span>
          </button>
        </div>

        {/* Conditional Group Filter (Class 9-12) for Student Pending */}
        {roleView === 'student' && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              {dt('Class 9–12 Group:', 'শ্রেণি ৯–১২ বিভাগ:')}
            </span>
            <div
              role="group"
              aria-label={dt('Student pending group filter', 'অপেক্ষমাণ শিক্ষার্থী বিভাগ ফিল্টার')}
              className="inline-flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg"
            >
              {(['all', ...ACADEMIC_GROUPS] as const).map((grp) => (
                <button
                  key={grp}
                  type="button"
                  onClick={() => setGroupFilter(grp)}
                  className={`px-3 py-1.5 min-h-[34px] text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                    groupFilter === grp
                      ? 'bg-emerald-700 dark:bg-emerald-600 text-white'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {grp === 'all' ? td('All') : td(grp)}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Pending Approvals Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
        {filteredItems.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
              {dt(
                'No pending {role} registrations match the current filter.',
                'বর্তমান ফিল্টারের সাথে কোনো অপেক্ষমাণ {role} নিবন্ধন মেলেনি।',
                { role: roleView === 'teacher' ? td('Teacher') : td('Student') }
              )}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {dt(
                'New coupon-based sign-ups for this pathway will appear here automatically.',
                'এই পাথওয়ের নতুন কুপন-ভিত্তিক আবেদনগুলো স্বয়ংক্রিয়ভাবে এখানে প্রদর্শিত হবে।'
              )}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/50 text-xs font-semibold text-slate-600 dark:text-slate-400">
                  <th className="py-3.5 px-5">{dt('Applicant', 'আবেদনকারী')}</th>
                  <th className="py-3.5 px-4 whitespace-nowrap">{dt('Applied Class & Group', 'আবেদিত শ্রেণি ও বিভাগ')}</th>
                  <th className="py-3.5 px-4 whitespace-nowrap">{dt('Coupon Code', 'কুপন কোড')}</th>
                  <th className="py-3.5 px-4 whitespace-nowrap">{dt('48h Countdown', '৪৮ ঘণ্টার কাউন্টডাউন')}</th>
                  <th className="py-3.5 px-5 text-right whitespace-nowrap">{td('Actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-sm">
                {filteredItems.map((record) => {
                  const countdown = formatCountdownRemaining(record.expiresAt, nowTick);
                  return (
                    <tr
                      key={record.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-3.5 px-5">
                        <p className="font-semibold text-slate-900 dark:text-white">
                          {record.fullName}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          {record.email}
                        </p>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap text-slate-800 dark:text-slate-200 font-medium tabular-nums">
                        {dt('Class {num}', 'শ্রেণি {num}', { num: record.academicClass })}
                        {record.academicGroup ? ` · ${td(record.academicGroup)}` : ''}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="font-mono text-xs font-semibold text-slate-800 dark:text-slate-200 tabular-nums">
                          {record.couponCode}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 font-mono text-xs font-semibold tabular-nums ${
                            countdown.expired
                              ? 'text-red-700 dark:text-red-400'
                              : countdown.urgent
                                ? 'text-amber-700 dark:text-amber-400'
                                : 'text-emerald-700 dark:text-emerald-400'
                          }`}
                        >
                          <Clock className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                          <span>{formatCountdown(countdown.text)}</span>
                        </span>
                      </td>
                      <td className="py-3.5 px-5 text-right whitespace-nowrap">
                        <div className="inline-flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => openEditModal(record)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[36px] text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg transition-colors whitespace-nowrap"
                          >
                            <Edit3 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                            <span>{td('Edit')}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleApprove(record)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[36px] text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 rounded-lg transition-colors whitespace-nowrap"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                            <span>{dt('Approve', 'অনুমোদন')}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setRejectTarget(record)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[36px] text-xs font-semibold text-red-700 dark:text-red-400 bg-white dark:bg-slate-900 hover:bg-red-50 dark:hover:bg-red-950/50 border border-red-300 dark:border-red-800 rounded-lg transition-colors whitespace-nowrap"
                          >
                            <Trash2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                            <span>{dt('Reject', 'বাতিল')}</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit Pending Registration Modal */}
      {editingRecord && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-[2px]"
          onClick={(e) => {
            if (e.target === e.currentTarget) setEditingRecord(null);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-pending-title"
            className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl overflow-hidden"
          >
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
              <div>
                <h3
                  id="edit-pending-title"
                  className="text-base font-bold text-slate-900 dark:text-white"
                >
                  {dt('Edit Pending Applicant', 'অপেক্ষমাণ আবেদনকারীর তথ্য সম্পাদনা')}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {editingRecord.email} · {editingRecord.couponCode}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingRecord(null)}
                aria-label={td('Close')}
                className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-6 space-y-4">
              {editError && (
                <div
                  role="alert"
                  className="flex items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-xs text-red-800 dark:text-red-200"
                >
                  <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span>{editError}</span>
                </div>
              )}

              <div>
                <label
                  htmlFor="pending-edit-name"
                  className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
                >
                  {td('Full Name')}
                </label>
                <input
                  id="pending-edit-name"
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3.5 py-2.5 min-h-[42px] bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label
                    htmlFor="pending-edit-class"
                    className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
                  >
                    {dt('Applied Class', 'আবেদিত শ্রেণি')}
                  </label>
                  <select
                    id="pending-edit-class"
                    value={editClass}
                    onChange={(e) => setEditClass(Number(e.target.value) as AcademicClassLevel)}
                    className="w-full px-3.5 py-2.5 min-h-[42px] bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  >
                    {ACADEMIC_CLASSES.map((cls) => (
                      <option key={cls} value={cls}>
                        {dt('Class {num}', 'শ্রেণি {num}', { num: cls })}
                      </option>
                    ))}
                  </select>
                </div>

                {isGroupApplicableForClass(editClass) && (
                  <div>
                    <label
                      htmlFor="pending-edit-group"
                      className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
                    >
                      {dt('Group (Class 9–12)', 'বিভাগ (শ্রেণি ৯–১২)')}
                    </label>
                    <select
                      id="pending-edit-group"
                      value={editGroup}
                      onChange={(e) => setEditGroup(e.target.value as AcademicGroup)}
                      className="w-full px-3.5 py-2.5 min-h-[42px] bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-600"
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

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingRecord(null)}
                  className="px-4 py-2 min-h-[40px] text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg"
                >
                  {td('Cancel')}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 min-h-[40px] text-sm font-semibold text-white bg-emerald-700 hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 rounded-lg"
                >
                  {td('Save Changes')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reject Confirmation Dialog */}
      {rejectTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-[2px]"
          onClick={(e) => {
            if (e.target === e.currentTarget) setRejectTarget(null);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="reject-pending-title"
            className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl p-6 space-y-4"
          >
            <div>
              <h3
                id="reject-pending-title"
                className="text-base font-bold text-slate-900 dark:text-white"
              >
                {dt('Reject Pending Registration?', 'অপেক্ষমাণ নিবন্ধন বাতিল করবেন?')}
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1.5">
                {dt(
                  'This will permanently remove the pending application for {name} ({email}). No account will be created.',
                  'এটি {name} ({email})-এর অপেক্ষমাণ আবেদন স্থায়ীভাবে মুছে ফেলবে। কোনো অ্যাকাউন্ট তৈরি হবে না।',
                  { name: rejectTarget.fullName, email: rejectTarget.email }
                )}
              </p>
            </div>
            <div className="flex items-center justify-end gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setRejectTarget(null)}
                className="px-4 py-2 min-h-[40px] text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg"
              >
                {td('Cancel')}
              </button>
              <button
                type="button"
                onClick={handleConfirmReject}
                className="px-4 py-2 min-h-[40px] text-sm font-semibold text-white bg-red-700 hover:bg-red-800 rounded-lg"
              >
                {dt('Confirm Reject', 'বাতিল নিশ্চিত করুন')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
