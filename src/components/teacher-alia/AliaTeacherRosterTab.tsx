import React, { useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, Edit3, Search, Users, X } from 'lucide-react';
import {
  ALIA_ALL_DEPARTMENT_OPTIONS,
  ALIA_TEACHER_MARHALA_OPTIONS,
  getShortAliaMarhalaLabel,
  type AliaAttendanceStatus,
  type AliaDepartment,
  type AliaMarhala,
  type AliaTeacherContext,
  type AliaTeacherRosterStudent,
} from '../../services/aliaTeacherService';

interface AliaTeacherRosterTabProps {
  teacher: AliaTeacherContext;
  roster: AliaTeacherRosterStudent[];
  onSaveAssessment: (
    studentId: string,
    patch: {
      marks: number;
      attendanceRate: number;
      attendanceStatus: AliaAttendanceStatus;
      remarks: string;
    }
  ) => { ok: true } | { ok: false; error: string };
}

export function AliaTeacherRosterTab({
  teacher,
  roster,
  onSaveAssessment,
}: AliaTeacherRosterTabProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [marhalaFilter, setMarhalaFilter] = useState<'all' | AliaMarhala>('all');
  const [departmentFilter, setDepartmentFilter] = useState<'all' | AliaDepartment>('all');

  const [editingStudent, setEditingStudent] = useState<AliaTeacherRosterStudent | null>(null);
  const [marksInput, setMarksInput] = useState('85');
  const [attendanceRateInput, setAttendanceRateInput] = useState('92');
  const [attendanceStatusInput, setAttendanceStatusInput] =
    useState<AliaAttendanceStatus>('Present');
  const [remarksInput, setRemarksInput] = useState('');
  const [modalError, setModalError] = useState<string | null>(null);
  const [saveBanner, setSaveBanner] = useState<string | null>(null);

  const filteredRoster = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return roster.filter((student) => {
      if (marhalaFilter !== 'all' && student.marhala !== marhalaFilter) return false;
      if (departmentFilter !== 'all' && student.department !== departmentFilter) return false;
      if (q) {
        const hay = `${student.fullName} ${student.email} ${student.marhala} ${student.department}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [roster, searchQuery, marhalaFilter, departmentFilter]);

  const openModal = (student: AliaTeacherRosterStudent) => {
    setEditingStudent(student);
    setMarksInput(String(student.marks));
    setAttendanceRateInput(String(student.attendanceRate));
    setAttendanceStatusInput(student.attendanceStatus);
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
      attendanceStatus: attendanceStatusInput,
      remarks: remarksInput,
    });

    if (!res.ok) {
      setModalError(res.error);
      return;
    }

    setSaveBanner(`Updated marks and attendance for ${editingStudent.fullName}.`);
    setEditingStudent(null);
  };

  return (
    <div className="space-y-6">
      {saveBanner && (
        <div
          role="status"
          className="flex items-center justify-between gap-3 p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 text-sm"
        >
          <span className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>{saveBanner}</span>
          </span>
          <button
            type="button"
            onClick={() => setSaveBanner(null)}
            aria-label="Dismiss notification"
            className="text-emerald-700 dark:text-emerald-300 hover:opacity-75"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      )}

      <section className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Alia Madrasa Student Roster &amp; Progress
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Showing {filteredRoster.length} of {roster.length} Alia Madrasa students · Subject:{' '}
              {teacher.primarySubject}
            </p>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          <div className="sm:col-span-5 relative">
            <Search
              className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2"
              aria-hidden="true"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search student name or email..."
              className="w-full pl-9 pr-3.5 py-2 min-h-[42px] bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-600"
            />
          </div>

          <div className="sm:col-span-3">
            <select
              aria-label="Filter students by Marhala"
              value={marhalaFilter}
              onChange={(e) => setMarhalaFilter(e.target.value as 'all' | AliaMarhala)}
              className="w-full px-3 py-2 min-h-[42px] bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-600"
            >
              <option value="all">All Marhalas</option>
              {ALIA_TEACHER_MARHALA_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {getShortAliaMarhalaLabel(option)}
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-4">
            <select
              aria-label="Filter students by Department"
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value as 'all' | AliaDepartment)}
              className="w-full px-3 py-2 min-h-[42px] bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-600"
            >
              <option value="all">All Departments</option>
              {ALIA_ALL_DEPARTMENT_OPTIONS.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Roster Table */}
        {filteredRoster.length === 0 ? (
          <div className="py-12 text-center rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
            <Users className="w-8 h-8 text-slate-400 mx-auto mb-2" aria-hidden="true" />
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              No Alia Madrasa students match your current filter
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Reset the Marhala or Department filter to inspect all learners.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-500 dark:text-slate-400">
                  <th className="py-3 pr-4">Student</th>
                  <th className="py-3 px-3">Marhala &amp; Department</th>
                  <th className="py-3 px-3">Lesson Progress</th>
                  <th className="py-3 px-3">Marks</th>
                  <th className="py-3 px-3">Attendance</th>
                  <th className="py-3 pl-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/80 dark:divide-slate-800 text-sm">
                {filteredRoster.map((student) => {
                  const pct = Math.min(
                    100,
                    Math.round(
                      (student.completedLessonsCount /
                        Math.max(1, student.totalRecommendedLessons)) *
                        100
                    )
                  );
                  return (
                    <tr
                      key={student.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-3.5 pr-4">
                        <p className="font-semibold text-slate-900 dark:text-white">
                          {student.fullName}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {student.email}
                        </p>
                      </td>
                      <td className="py-3.5 px-3">
                        <p className="text-xs font-semibold text-teal-800 dark:text-teal-300">
                          {getShortAliaMarhalaLabel(student.marhala)}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {student.department}
                        </p>
                      </td>
                      <td className="py-3.5 px-3 min-w-[150px]">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-slate-600 dark:text-slate-300 tabular-nums">
                            {student.completedLessonsCount}/{student.totalRecommendedLessons} lessons
                          </span>
                          <span className="font-semibold text-slate-800 dark:text-slate-200 tabular-nums">
                            {pct}%
                          </span>
                        </div>
                        <div className="h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                          <div
                            className={`h-full rounded-full bg-teal-600 dark:bg-teal-400 ${
                              pct >= 95
                                ? 'w-full'
                                : pct >= 85
                                  ? 'w-11/12'
                                  : pct >= 75
                                    ? 'w-9/12'
                                    : pct >= 65
                                      ? 'w-8/12'
                                      : pct >= 55
                                        ? 'w-7/12'
                                        : pct >= 45
                                          ? 'w-6/12'
                                          : pct >= 35
                                            ? 'w-5/12'
                                            : pct >= 25
                                              ? 'w-4/12'
                                              : pct >= 15
                                                ? 'w-3/12'
                                                : pct >= 5
                                                  ? 'w-2/12'
                                                  : 'w-1/12'
                            }`}
                          />
                        </div>
                      </td>
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        <span className="font-bold text-slate-900 dark:text-white tabular-nums">
                          {student.marks}
                        </span>
                        <span className="text-xs text-slate-500 dark:text-slate-400"> / 100</span>
                      </td>
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 tabular-nums">
                            {student.attendanceRate}%
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                              student.attendanceStatus === 'Present'
                                ? 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300'
                                : student.attendanceStatus === 'Late'
                                  ? 'bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300'
                                  : 'bg-rose-100 dark:bg-rose-950/70 text-rose-800 dark:text-rose-300'
                            }`}
                          >
                            {student.attendanceStatus}
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 pl-3 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => openModal(student)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[36px] rounded-lg bg-white dark:bg-slate-800 border border-teal-200 dark:border-teal-800 hover:bg-teal-50 dark:hover:bg-teal-950/60 text-teal-700 dark:text-teal-300 text-xs font-semibold transition-colors"
                        >
                          <Edit3 className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>Update Marks</span>
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

      {/* Assessment Update Modal */}
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
            aria-labelledby="alia-assessment-modal-title"
            className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden"
          >
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
              <div>
                <h3
                  id="alia-assessment-modal-title"
                  className="text-base font-bold text-slate-900 dark:text-white"
                >
                  Update Student Assessment
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {editingStudent.fullName} · {getShortAliaMarhalaLabel(editingStudent.marhala)} (
                  {editingStudent.department})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingStudent(null)}
                aria-label="Close modal"
                className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4">
              {modalError && (
                <div
                  role="alert"
                  className="flex items-start gap-2.5 p-3 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-red-900 dark:text-red-200 text-xs"
                >
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
                  <span>{modalError}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="alia-edit-marks"
                    className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
                  >
                    Term Marks (0–100)
                  </label>
                  <input
                    id="alia-edit-marks"
                    type="number"
                    min={0}
                    max={100}
                    value={marksInput}
                    onChange={(e) => setMarksInput(e.target.value)}
                    className="w-full px-3 py-2.5 min-h-[42px] bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-600"
                  />
                </div>

                <div>
                  <label
                    htmlFor="alia-edit-attendance"
                    className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
                  >
                    Attendance Rate (%)
                  </label>
                  <input
                    id="alia-edit-attendance"
                    type="number"
                    min={0}
                    max={100}
                    value={attendanceRateInput}
                    onChange={(e) => setAttendanceRateInput(e.target.value)}
                    className="w-full px-3 py-2.5 min-h-[42px] bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-600"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="alia-edit-status"
                  className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
                >
                  Today&apos;s Attendance Status
                </label>
                <select
                  id="alia-edit-status"
                  value={attendanceStatusInput}
                  onChange={(e) =>
                    setAttendanceStatusInput(e.target.value as AliaAttendanceStatus)
                  }
                  className="w-full px-3 py-2.5 min-h-[42px] bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-600"
                >
                  <option value="Present">Present</option>
                  <option value="Late">Late</option>
                  <option value="Absent">Absent</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="alia-edit-remarks"
                  className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
                >
                  Faculty Remarks
                </label>
                <textarea
                  id="alia-edit-remarks"
                  rows={3}
                  value={remarksInput}
                  onChange={(e) => setRemarksInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-600 resize-y"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingStudent(null)}
                  className="px-4 py-2.5 min-h-[42px] rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2.5 min-h-[42px] rounded-xl bg-teal-700 hover:bg-teal-800 dark:bg-teal-600 dark:hover:bg-teal-500 text-white text-xs font-semibold transition-colors"
                >
                  Save Assessment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
