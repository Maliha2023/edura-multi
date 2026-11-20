import React, { useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, Edit3, Search, Users, X } from 'lucide-react';
import {
  getTeacherPathwayLabel,
  TEACHER_CLASS_LEVELS,
  TEACHER_GROUPS,
  type AttendanceStatus,
  type TeacherClassLevel,
  type TeacherGroup,
  type TeacherProfileContext,
  type TeacherRosterStudent,
} from '../../services/teacherService';
import { useDashboardLanguage } from '../../i18n/useDashboardLanguage';

interface TeacherRosterTabProps {
  teacher: TeacherProfileContext;
  roster: TeacherRosterStudent[];
  onSaveAssessment: (
    studentId: string,
    patch: {
      marks: number;
      attendanceRate: number;
      attendanceStatus: AttendanceStatus;
      remarks: string;
    }
  ) => { ok: true } | { ok: false; error: string };
}

export function TeacherRosterTab({
  teacher,
  roster,
  onSaveAssessment,
}: TeacherRosterTabProps) {
  const { dt, td, formatDigits } = useDashboardLanguage();
  const pathwayLabel = td(getTeacherPathwayLabel(teacher.pathway));

  const [searchQuery, setSearchQuery] = useState('');
  const [classFilter, setClassFilter] = useState<TeacherClassLevel | 'all'>('all');
  const [groupFilter, setGroupFilter] = useState<TeacherGroup | 'all'>('all');

  // Edit Marks / Attendance modal state
  const [editingStudent, setEditingStudent] = useState<TeacherRosterStudent | null>(null);
  const [marksInput, setMarksInput] = useState('85');
  const [attendanceRateInput, setAttendanceRateInput] = useState('92');
  const [attendanceStatus, setAttendanceStatus] = useState<AttendanceStatus>('Present');
  const [remarksInput, setRemarksInput] = useState('');
  const [modalError, setModalError] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const filteredRoster = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return roster.filter((student) => {
      if (classFilter !== 'all' && student.academicClass !== classFilter) return false;
      if (groupFilter !== 'all' && student.academicGroup !== groupFilter) return false;
      if (q) {
        const hay = `${student.fullName} ${student.email} ${student.id} class ${student.academicClass} ${student.academicGroup ?? ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [roster, searchQuery, classFilter, groupFilter]);

  const openEditor = (student: TeacherRosterStudent) => {
    setEditingStudent(student);
    setMarksInput(String(student.marks));
    setAttendanceRateInput(String(student.attendanceRate));
    setAttendanceStatus(student.attendanceStatus);
    setRemarksInput(student.remarks);
    setModalError(null);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent) return;
    setModalError(null);

    const res = onSaveAssessment(editingStudent.id, {
      marks: Number(marksInput),
      attendanceRate: Number(attendanceRateInput),
      attendanceStatus,
      remarks: remarksInput,
    });

    if (!res.ok) {
      setModalError(td(res.error));
      return;
    }

    setToastMsg(
      dt(
        'Updated marks and attendance for {name}.',
        '{name}-এর নম্বর এবং উপস্থিতি হালনাগাদ করা হয়েছে।',
        { name: editingStudent.fullName }
      )
    );
    setEditingStudent(null);
  };

  return (
    <div className="space-y-6">
      {/* Search & Filter Toolbar */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              {dt('{pathway} Student Roster & Progress', '{pathway} শিক্ষার্থীর তালিকা ও অগ্রগতি', {
                pathway: pathwayLabel,
              })}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {dt(
                'Strictly scoped to {pathway} learners · inspect lesson progress and record marks or attendance',
                'কেবল {pathway} শিক্ষার্থীদের জন্য · পাঠের অগ্রগতি দেখুন এবং নম্বর বা উপস্থিতি সংরক্ষণ করুন',
                { pathway: pathwayLabel }
              )}
            </p>
          </div>
          <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 tabular-nums">
            {dt('Showing {shown} of {total} students', '{total} জন শিক্ষার্থীর মধ্যে {shown} জন দেখানো হচ্ছে', {
              shown: formatDigits(filteredRoster.length),
              total: formatDigits(roster.length),
            })}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          <div className="md:col-span-5 relative">
            <Search
              className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden="true"
            />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={dt(
                'Search student by name, email, or ID...',
                'নাম, ইমেইল বা আইডি দিয়ে শিক্ষার্থী খুঁজুন...'
              )}
              aria-label={dt('Search students in roster', 'তালিকায় শিক্ষার্থী খুঁজুন')}
              className="w-full pl-10 pr-3.5 py-2.5 min-h-[42px] bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-600"
            />
          </div>

          <div className="md:col-span-3">
            <select
              aria-label={dt('Filter roster by class', 'শ্রেণি অনুযায়ী তালিকা ফিল্টার করুন')}
              value={classFilter}
              onChange={(e) =>
                setClassFilter(
                  e.target.value === 'all' ? 'all' : (Number(e.target.value) as TeacherClassLevel)
                )
              }
              className="w-full px-3 py-2.5 min-h-[42px] bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-600"
            >
              <option value="all">{dt('All Classes (1–12)', 'সকল শ্রেণি (১–১২)')}</option>
              {TEACHER_CLASS_LEVELS.map((cls) => (
                <option key={cls} value={cls}>
                  {dt('Class {cls}', 'শ্রেণি {cls}', { cls: formatDigits(cls) })}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-4 flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
            {(['all', ...TEACHER_GROUPS] as const).map((groupOption) => {
              const active = groupFilter === groupOption;
              return (
                <button
                  key={groupOption}
                  type="button"
                  onClick={() => setGroupFilter(groupOption)}
                  className={`flex-1 px-2.5 py-1.5 min-h-[34px] text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                    active
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {groupOption === 'all' ? dt('All Groups', 'সকল বিভাগ') : td(groupOption)}
                </button>
              );
            })}
          </div>
        </div>

        {toastMsg && (
          <div
            role="status"
            className="flex items-center justify-between gap-2 p-3 rounded-xl bg-teal-50 dark:bg-teal-950/50 border border-teal-200 dark:border-teal-800 text-teal-900 dark:text-teal-200 text-xs font-medium"
          >
            <span className="inline-flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-teal-700 dark:text-teal-400 shrink-0" aria-hidden="true" />
              {toastMsg}
            </span>
            <button
              type="button"
              onClick={() => setToastMsg(null)}
              aria-label={dt('Dismiss status message', 'বার্তা বন্ধ করুন')}
              className="text-teal-700 dark:text-teal-300 hover:underline"
            >
              {dt('Dismiss', 'বন্ধ করুন')}
            </button>
          </div>
        )}
      </section>

      {/* Roster Table */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
        {filteredRoster.length === 0 ? (
          <div className="p-10 text-center space-y-2">
            <Users className="w-6 h-6 text-slate-400 mx-auto" aria-hidden="true" />
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              {dt('No students match the current filters', 'বর্তমান ফিল্টার অনুযায়ী কোনো শিক্ষার্থী পাওয়া যায়নি')}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {dt(
                'Try resetting Class or Group filters to view all {pathway} learners.',
                'সকল {pathway} শিক্ষার্থী দেখতে শ্রেণি বা বিভাগ ফিল্টার রিসেট করুন।',
                { pathway: pathwayLabel }
              )}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 text-xs font-semibold text-slate-500 dark:text-slate-400">
                  <th className="py-3.5 px-5">{td('Student')}</th>
                  <th className="py-3.5 px-4">{dt('Academic Level', 'একাডেমিক স্তর')}</th>
                  <th className="py-3.5 px-4">{dt('Lesson Progress', 'পাঠের অগ্রগতি')}</th>
                  <th className="py-3.5 px-4">{dt('Marks', 'নম্বর')}</th>
                  <th className="py-3.5 px-4">{dt('Attendance', 'উপস্থিতি')}</th>
                  <th className="py-3.5 px-5 text-right">{dt('Action', 'কার্যক্রম')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                {filteredRoster.map((student) => {
                  const pct = Math.round(
                    (student.completedLessonsCount / Math.max(1, student.totalRecommendedLessons)) *
                      100
                  );
                  return (
                    <tr
                      key={student.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-4 px-5">
                        <p className="font-semibold text-slate-900 dark:text-white">
                          {student.fullName}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          {student.email}
                        </p>
                      </td>
                      <td className="py-4 px-4 whitespace-nowrap">
                        <p className="text-sm font-medium text-slate-800 dark:text-slate-200 tabular-nums">
                          {dt('Class {cls}', 'শ্রেণি {cls}', { cls: formatDigits(student.academicClass) })}
                          {student.academicGroup ? ` · ${td(student.academicGroup)}` : ''}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          {student.status === 'active' ? td('Active') : td('Suspended')}
                        </p>
                      </td>
                      <td className="py-4 px-4 min-w-[160px]">
                        <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-300 tabular-nums mb-1">
                          <span>
                            {dt('{done}/{total} lessons', '{done}/{total} পাঠ', {
                              done: formatDigits(student.completedLessonsCount),
                              total: formatDigits(student.totalRecommendedLessons),
                            })}
                          </span>
                          <span className="font-semibold">{formatDigits(pct)}%</span>
                        </div>
                        <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-teal-600 dark:bg-teal-500 rounded-full"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </td>
                      <td className="py-4 px-4 whitespace-nowrap tabular-nums">
                        <span className="font-bold text-slate-900 dark:text-white">
                          {formatDigits(student.marks)}
                        </span>
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          {' '}
                          / {formatDigits(100)}
                        </span>
                      </td>
                      <td className="py-4 px-4 whitespace-nowrap tabular-nums">
                        <p className="text-sm font-semibold text-slate-900 dark:text-white">
                          {formatDigits(student.attendanceRate)}%
                        </p>
                        <p
                          className={`text-xs font-medium mt-0.5 ${
                            student.attendanceStatus === 'Present'
                              ? 'text-emerald-700 dark:text-emerald-400'
                              : student.attendanceStatus === 'Late'
                                ? 'text-amber-700 dark:text-amber-400'
                                : 'text-rose-700 dark:text-rose-400'
                          }`}
                        >
                          {td(student.attendanceStatus)}
                        </p>
                      </td>
                      <td className="py-4 px-5 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => openEditor(student)}
                          className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[36px] text-xs font-semibold text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/60 hover:bg-teal-100 dark:hover:bg-teal-900/60 border border-teal-200 dark:border-teal-800 rounded-lg transition-colors whitespace-nowrap"
                        >
                          <Edit3 className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>{dt('Update Marks', 'নম্বর হালনাগাদ করুন')}</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Record / Update Marks & Attendance Modal */}
      {editingStudent && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-[2px]"
          onClick={(e) => {
            if (e.target === e.currentTarget) setEditingStudent(null);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="roster-edit-modal-title"
            className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl overflow-hidden"
          >
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-semibold text-teal-700 dark:text-teal-400">
                  {pathwayLabel} · {dt('Class {cls}', 'শ্রেণি {cls}', { cls: formatDigits(editingStudent.academicClass) })}
                  {editingStudent.academicGroup ? ` (${td(editingStudent.academicGroup)})` : ''}
                </p>
                <h3
                  id="roster-edit-modal-title"
                  className="text-base font-bold text-slate-900 dark:text-white truncate mt-0.5"
                >
                  {dt('Update Assessment — {name}', 'মূল্যায়ন হালনাগাদ — {name}', {
                    name: editingStudent.fullName,
                  })}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingStudent(null)}
                aria-label={dt('Close modal', 'মোডাল বন্ধ করুন')}
                className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4" noValidate>
              {modalError && (
                <div
                  role="alert"
                  className="flex items-start gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-red-900 dark:text-red-200 text-xs"
                >
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
                  <span>{modalError}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="roster-marks-input"
                    className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
                  >
                    {dt('Marks (0–100)', 'নম্বর (০–১০০)')}
                  </label>
                  <input
                    id="roster-marks-input"
                    type="number"
                    min={0}
                    max={100}
                    value={marksInput}
                    onChange={(e) => setMarksInput(e.target.value)}
                    className="w-full px-3.5 py-2.5 min-h-[42px] bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-sm tabular-nums text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-600"
                  />
                </div>

                <div>
                  <label
                    htmlFor="roster-attendance-rate"
                    className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
                  >
                    {dt('Attendance (%)', 'উপস্থিতি (%)')}
                  </label>
                  <input
                    id="roster-attendance-rate"
                    type="number"
                    min={0}
                    max={100}
                    value={attendanceRateInput}
                    onChange={(e) => setAttendanceRateInput(e.target.value)}
                    className="w-full px-3.5 py-2.5 min-h-[42px] bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-sm tabular-nums text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-600"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="roster-attendance-status"
                  className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
                >
                  {dt("Today's Attendance Status", 'আজকের উপস্থিতির অবস্থা')}
                </label>
                <select
                  id="roster-attendance-status"
                  value={attendanceStatus}
                  onChange={(e) => setAttendanceStatus(e.target.value as AttendanceStatus)}
                  className="w-full px-3 py-2.5 min-h-[42px] bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-600"
                >
                  <option value="Present">{td('Present')}</option>
                  <option value="Late">{td('Late')}</option>
                  <option value="Absent">{td('Absent')}</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="roster-remarks-input"
                  className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
                >
                  {dt('Teacher Remarks', 'শিক্ষকের মন্তব্য')}
                </label>
                <textarea
                  id="roster-remarks-input"
                  rows={3}
                  value={remarksInput}
                  onChange={(e) => setRemarksInput(e.target.value)}
                  placeholder={dt(
                    'Optional feedback on homework, lab performance, or quiz progress...',
                    'বাড়ির কাজ, ল্যাব পারফরম্যান্স বা কুইজ অগ্রগতি সম্পর্কে ঐচ্ছিক মন্তব্য...'
                  )}
                  className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-600"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingStudent(null)}
                  className="px-4 py-2.5 min-h-[42px] text-sm font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
                >
                  {td('Cancel')}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 min-h-[42px] text-sm font-semibold text-white bg-teal-700 hover:bg-teal-800 dark:bg-teal-600 dark:hover:bg-teal-500 rounded-lg transition-colors"
                >
                  {dt('Save Assessment', 'মূল্যায়ন সংরক্ষণ করুন')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
