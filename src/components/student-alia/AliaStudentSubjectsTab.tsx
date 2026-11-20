import React, { useMemo, useState } from 'react';
import {
  BookOpen,
  CheckCircle2,
  Circle,
  Clock,
  Sparkles,
  Target,
} from 'lucide-react';
import {
  getShortMarhalaLabel,
  type AliaStudentContext,
  type AliaStudentSubject,
} from '../../services/aliaStudentService';
import { useDashboardLanguage } from '../../i18n/useDashboardLanguage';

interface AliaStudentSubjectsTabProps {
  student: AliaStudentContext;
  subjects: AliaStudentSubject[];
  completedLessonIds: string[];
  onToggleLesson: (lessonId: string) => void;
  onAskTutorAboutLesson: (subjectName: string, prompt: string, mode: 'ask' | 'practice') => void;
}

export function AliaStudentSubjectsTab({
  student,
  subjects,
  completedLessonIds,
  onToggleLesson,
  onAskTutorAboutLesson,
}: AliaStudentSubjectsTabProps) {
  const { dt, td, formatDigits } = useDashboardLanguage();

  const [categoryFilter, setCategoryFilter] = useState<
    'All' | 'Core' | 'Department Major' | 'Elective'
  >('All');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(subjects[0]?.id ?? '');

  const completedSet = useMemo(() => new Set(completedLessonIds), [completedLessonIds]);
  const shortMarhala = getShortMarhalaLabel(student.marhala);

  const filteredSubjects = useMemo(() => {
    if (categoryFilter === 'All') return subjects;
    return subjects.filter((s) => s.category === categoryFilter);
  }, [subjects, categoryFilter]);

  const activeSubject =
    filteredSubjects.find((s) => s.id === selectedSubjectId) ?? filteredSubjects[0] ?? subjects[0];

  const categories: ('All' | 'Core' | 'Department Major' | 'Elective')[] = [
    'All',
    'Core',
    'Department Major',
    'Elective',
  ];

  return (
    <div className="space-y-6">
      {/* Header & Category Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
            {td('Alia Madrasa Subjects')}
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            {td(student.marhala)} · {dt('{dept} Department', '{dept} বিভাগ', { dept: td(student.department) })} ·{' '}
            {td('Bangladesh Madrasa Education Board')}
          </p>
        </div>

        <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-1 rounded-xl self-start sm:self-auto flex-wrap">
          {categories.map((cat) => {
            const active = categoryFilter === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setCategoryFilter(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  active
                    ? 'bg-emerald-700 text-white'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {cat === 'All' ? td('All Subjects') : td(cat)}
              </button>
            );
          })}
        </div>
      </div>

      {/* Master-Detail Subject Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Subject Selector List */}
        <div className="lg:col-span-5 space-y-3">
          {filteredSubjects.map((subject) => {
            const doneCount = subject.lessons.filter((l) => completedSet.has(l.id)).length;
            const pct = Math.round((doneCount / Math.max(subject.lessons.length, 1)) * 100);
            const isSelected = activeSubject?.id === subject.id;

            return (
              <button
                key={subject.id}
                type="button"
                onClick={() => setSelectedSubjectId(subject.id)}
                className={`w-full text-left p-4 rounded-2xl border transition-colors ${
                  isSelected
                    ? 'bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-400 dark:border-emerald-700'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                    {subject.code}
                  </span>
                  <span className="text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
                    {td(subject.category)}
                  </span>
                </div>
                <p className="text-sm sm:text-base font-bold text-slate-900 dark:text-white mt-2">
                  {subject.name}
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 line-clamp-2">
                  {subject.description}
                </p>

                <div className="mt-3 flex items-center justify-between gap-3">
                  <div className="flex-1 h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-600 dark:bg-emerald-500 rounded-full transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 tabular-nums shrink-0">
                    {formatDigits(doneCount)}/{formatDigits(subject.lessons.length)}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Selected Subject Modules & Lessons */}
        {activeSubject && (
          <section className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-5 border-b border-slate-200 dark:border-slate-800">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-mono font-semibold px-2.5 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                    {activeSubject.boardTag}
                  </span>
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    {dt('Code {code}', 'কোড {code}', { code: activeSubject.code })}
                  </span>
                </div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                  {activeSubject.name}
                </h2>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  {activeSubject.description}
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  onAskTutorAboutLesson(
                    activeSubject.name,
                    `Give me a concise ${shortMarhala} (${student.department}) revision plan and key BMEB exam concepts for ${activeSubject.name}.`,
                    'ask'
                  )
                }
                className="inline-flex items-center justify-center gap-2 px-3.5 py-2.5 min-h-[40px] bg-emerald-700 hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl transition-colors whitespace-nowrap shrink-0"
              >
                <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{td('Study with AI Tutor')}</span>
              </button>
            </div>

            <div className="space-y-3.5">
              {activeSubject.lessons.map((lesson, idx) => {
                const isDone = completedSet.has(lesson.id);
                return (
                  <article
                    key={lesson.id}
                    className={`p-4 rounded-xl border transition-colors ${
                      isDone
                        ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/70'
                        : 'bg-slate-50/70 dark:bg-slate-950/50 border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        <button
                          type="button"
                          onClick={() => onToggleLesson(lesson.id)}
                          aria-label={
                            isDone
                              ? dt('Mark "{title}" as incomplete', '"{title}" অসম্পূর্ণ হিসেবে চিহ্নিত করুন', {
                                  title: lesson.title,
                                })
                              : dt('Mark "{title}" as complete', '"{title}" সম্পন্ন হিসেবে চিহ্নিত করুন', {
                                  title: lesson.title,
                                })
                          }
                          className="mt-0.5 text-emerald-700 dark:text-emerald-400 hover:scale-105 transition-transform shrink-0"
                        >
                          {isDone ? (
                            <CheckCircle2 className="w-5 h-5" />
                          ) : (
                            <Circle className="w-5 h-5 text-slate-400 dark:text-slate-500" />
                          )}
                        </button>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap text-[11px] text-slate-500 dark:text-slate-400">
                            <span className="font-semibold text-slate-700 dark:text-slate-300">
                              {dt('Module {num}', 'মডিউল {num}', { num: idx + 1 })}
                            </span>
                            <span>•</span>
                            <span>{lesson.keyTopic}</span>
                            <span>•</span>
                            <span className="inline-flex items-center gap-1">
                              <Clock className="w-3 h-3" aria-hidden="true" />
                              {dt('{min} min', '{min} মিনিট', { min: lesson.durationMinutes })}
                            </span>
                          </div>
                          <h3
                            className={`text-sm font-bold mt-1 ${
                              isDone
                                ? 'text-emerald-900 dark:text-emerald-200'
                                : 'text-slate-900 dark:text-white'
                            }`}
                          >
                            {lesson.title}
                          </h3>
                          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                            {lesson.summary}
                          </p>
                          <div className="mt-2.5 flex items-center gap-2 flex-wrap">
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">
                              <Target className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                              {lesson.examFocus}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 pt-3 border-t border-slate-200/70 dark:border-slate-800 flex flex-wrap items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => onToggleLesson(lesson.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs font-semibold transition-colors"
                      >
                        <BookOpen className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>{isDone ? td('Completed') : td('Mark Complete')}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          onAskTutorAboutLesson(
                            activeSubject.name,
                            `Create BMEB ${shortMarhala} (${student.department}) practice questions for "${lesson.title}" (${lesson.examFocus}).`,
                            'practice'
                          )
                        }
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800 text-xs font-semibold transition-colors"
                      >
                        <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>{td('Practice')}</span>
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
