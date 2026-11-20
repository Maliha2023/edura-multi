import React, { useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, Edit3, Search, Users, X } from 'lucide-react';
import {
  ACADEMIC_TRACK_OPTIONS,
  getIntlTeacherPathwayLabel,
  getLevelsForPathway,
  getShortLevelLabel,
  type InternationalAcademicLevel,
  type InternationalAcademicTrack,
  type IntlAttendanceStatus,
  type IntlTeacherContext,
  type IntlTeacherRosterStudent,
} from '../../services/internationalTeacherService';
import { useDashboardLanguage } from '../../i18n/useDashboardLanguage';

interface IntlTeacherRosterTabProps {
  teacher: IntlTeacherContext;
  roster: IntlTeacherRosterStudent[];
  onSaveAssessment: (
    studentId: string,
    patch: {
      marks: number;
      attendanceRate: number;
      attendanceStatus: IntlAttendanceStatus;
      remarks: string;
    }
  ) => { ok: true } | { ok: false; error: string };
}

export function IntlTeacherRosterTab({
  teacher,
  roster,
  onSaveAssessment,
}: IntlTeacherRosterTabProps) {
  const { dt, td, formatDigits } = useDashboardLanguage();
  const pathwayLabel = td(getIntlTeacherPathwayLabel(teacher.pathway));
  const pathwayLevels = getLevelsForPathway(teacher.pathway);

  const [searchQuery, setSearchQuery] = useState('');
  const [levelFilter, setLevelFilter] = useState<'all' | InternationalAcademicLevel>('all');
  const [trackFilter, setTrackFilter] = useState<'all' | InternationalAcademicTrack>('all');

  // Edit Marks & Attendance modal
  const [editingStudent, setEditingStudent] = useState<IntlTeacherRosterStudent | null>(null);
  const [marksInput, setMarksInput] = useState('85');
  const [attendanceRateInput, setAttendanceRateInput] = useState('92');
  const [attendanceStatus, setAttendanceStatus] = useState<IntlAttendanceStatus>('Present');
  const [remarksInput, setRemarksInput] = useState('');
  const [modalError, setModalError] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const filteredRoster = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return roster.filter((student) => {
      if (levelFilter !== 'all' && student.academicLevel !== levelFilter) return false;
      if (trackFilter !== 'all' && student.academicTrack !== trackFilter) return false;
      if (q) {
        const hay = `${student.fullName} ${student.email} ${student.id} ${student.academicLevel} ${student.academicTrack}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [roster, searchQuery, levelFilter, trackFilter]);

  const openEditor = (student: IntlTeacherRosterStudent) => {
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
                'Strictly scoped to {pathway} learners · inspect syllabus completion and record marks or attendance',
                'কেবল {pathway} শিক্ষার্থীদের জন্য · সিলেবাস সমাপ্তি দেখুন এবং নম্বর বা উপস্থিতি সংরক্ষণ করুন',
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

          <div className="md:col-span-4">
            <select
              aria-label={dt('Filter roster by academic level', 'একাডেমিক স্তর অনুযায়ী তালিকা ফিল্টার করুন')}
              value={levelFilter}
              onChange={(e) =>
                setLevelFilter(e.target.value as 'all' | InternationalAcademicLevel)
              }
              className="w-full px-3 py-2.5 min-h-[42px] bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-600"
            >
              <option value="all">{dt('All Academic Levels', 'সকল একাডেমিক স্তর')}</option>
              {pathwayLevels.map((lvl) => (
                <option key={lvl} value={lvl}>
                  {td(lvl)}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-3">
            <select
              aria-label={dt('Filter roster by academic track', 'একাডেমিক ট্র্যাক অনুযায়ী তালিকা ফিল্টার করুন')}
              value={trackFilter}
              onChange={(e) =>
                setTrackFilter(e.target.value as 'all' | InternationalAcademicTrack)
              }
              className="w-full px-3 py-2.5 min-h-[42px] bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-600"
            >
              <option value="all">{dt('All Academic Tracks', 'সকল একাডেমিক ট্র্যাক')}</option>
              <option value="General">{dt('General (Grade 1–8)', 'সাধারণ (গ্রেড ১–৮)')}</option>
              {ACADEMIC_TRACK_OPTIONS.map((track) => (
                <option key={track} value={track}>
                  {td(track)}
                </option>
              ))}
            </select>
          </div>
        </div>

        {toastMsg && (
          <div
            role="status"
            className="flex items-center justify-between gap-2 p-3 rounded-xl bg-teal-50 dark:bg-teal-950/50 border border-teal-200 dark:border-teal-800 text-teal-900 dark:text-teal-200 text-xs font-medium"
          >
            <span className="inline-flex items-center gap-2">
              <CheckCircle2
                className="w-4 h-4 text-teal-700 dark:text-teal-400 shrink-0"
                aria-hidden="true"
              />
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
                'Try resetting Academic Level or Track filters to view all {pathway} learners.',
                'সকল {pathway} শিক্ষার্থী দেখতে একাডেমিক স্তর বা ট্র্যাক ফিল্টার রিসেট করুন।',
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
                  <th className="py-3.5 px-4">{dt('Level & Track', 'স্তর ও ট্র্যাক')}</th>
                  <th className="py-3.5 px-4">{dt('Lesson Progress', 'পাঠের অগ্রগতি')}</th>
                  <th className="py-3.5 px-4">{dt('Marks', 'নম্বর')}</th>
                  <th className="py-3.5 px-4">{dt('Attendance', 'উপস্থিতি')}</th>
                  <th className="py-3.5 px-5 text-right">{dt('Action', 'কার্যক্রম')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                {filteredRoster.map((student) => {
                  const pct = Math.round(
                    (student.completedLessonsCount /
                      Math.max(1, student.totalRecommendedLessons)) *
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
                        <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                          {td(getShortLevelLabel(student.academicLevel))} · {td(student.academicTrack)}
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

      {/* Update Marks & Attendance Modal */}
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
            aria-labelledby="intl-roster-edit-modal-title"
            className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl overflow-hidden"
          >
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-semibold text-teal-700 dark:text-teal-400">
                  {pathwayLabel} · {td(getShortLevelLabel(editingStudent.academicLevel))} (
                  {td(editingStudent.academicTrack)})
                </p>
                <h3
                  id="intl-roster-edit-modal-title"
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
                    htmlFor="intl-roster-marks"
                    className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
                  >
                    {dt('Marks (0–100)', 'নম্বর (০–১০০)')}
                  </label>
                  <input
                    id="intl-roster-marks"
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
                    htmlFor="intl-roster-attendance"
                    className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
                  >
                    {dt('Attendance (%)', 'উপস্থিতি (%)')}
                  </label>
                  <input
                    id="intl-roster-attendance"
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
                  htmlFor="intl-roster-status"
                  className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
                >
                  {dt("Today's Attendance Status", 'আজকের উপস্থিতির অবস্থা')}
                </label>
                <select
                  id="intl-roster-status"
                  value={attendanceStatus}
                  onChange={(e) => setAttendanceStatus(e.target.value as IntlAttendanceStatus)}
                  className="w-full px-3 py-2.5 min-h-[42px] bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-600"
                >
                  <option value="Present">{td('Present')}</option>
                  <option value="Late">{td('Late')}</option>
                  <option value="Absent">{td('Absent')}</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="intl-roster-remarks"
                  className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
                >
                  {dt('Faculty Remarks', 'শিক্ষকের মন্তব্য')}
                </label>
                <textarea
                  id="intl-roster-remarks"
                  rows={3}
                  value={remarksInput}
                  onChange={(e) => setRemarksInput(e.target.value)}
                  placeholder={dt(
                    'Optional feedback on mock exams, practical work, or past-paper pacing...',
                    'মক পরীক্ষা, ব্যবহারিক কাজ বা পাস্ট-পেপার অনুশীলনের গতি সম্পর্কে ঐচ্ছিক মন্তব্য...'
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
