import React, { useMemo, useState } from 'react';
import { BookOpen, Bot, CheckCircle2, Circle, Clock } from 'lucide-react';
import {
  formatStudentContextBadge,
  type StudentProfileContext,
  type StudentSubject,
} from '../../services/studentService';
import { useDashboardLanguage } from '../../i18n/useDashboardLanguage';

interface StudentSubjectsTabProps {
  student: StudentProfileContext;
  subjects: StudentSubject[];
  completedLessonIds: string[];
  onToggleLesson: (lessonId: string) => void;
  onAskTutorAboutLesson: (subjectName: string, lessonTitle: string) => void;
}

export function StudentSubjectsTab({
  student,
  subjects,
  completedLessonIds,
  onToggleLesson,
  onAskTutorAboutLesson,
}: StudentSubjectsTabProps) {
  const { dt, td, formatDigits } = useDashboardLanguage();
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(subjects[0]?.id ?? '');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'Core' | 'Group Major' | 'Elective'>(
    'all'
  );

  const visibleSubjects = useMemo(() => {
    if (categoryFilter === 'all') return subjects;
    return subjects.filter((s) => s.category === categoryFilter);
  }, [subjects, categoryFilter]);

  const activeSubject =
    visibleSubjects.find((s) => s.id === selectedSubjectId) ?? visibleSubjects[0] ?? null;

  const availableCategories = useMemo(() => {
    const set = new Set(subjects.map((s) => s.category));
    return Array.from(set);
  }, [subjects]);

  const contextLabel = formatStudentContextBadge(
    student.pathway,
    student.academicClass,
    student.academicGroup
  );

  return (
    <div className="space-y-6">
      {/* Header & Category Filter */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            {td('My Curriculum Subjects')}
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">
            {dt('NCTB syllabus modules tailored for {context}.', '{context}-এর জন্য এনসিটিবি সিলেবাস মডিউলসমূহ।', {
              context: td(contextLabel),
            })}
          </p>
        </div>

        {availableCategories.length > 1 && (
          <div
            role="group"
            aria-label={dt('Filter subjects by category', 'বিভাগ অনুযায়ী বিষয় ফিল্টার করুন')}
            className="inline-flex flex-wrap items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl self-start md:self-center"
          >
            {(['all', ...availableCategories] as const).map((cat) => {
              const active = categoryFilter === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategoryFilter(cat)}
                  className={`px-3 py-1.5 min-h-[36px] text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                    active
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {cat === 'all' ? td('All Subjects') : td(cat)}
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* Two-Column Master/Detail Curriculum Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Subject Selector List */}
        <div className="lg:col-span-4 space-y-2.5">
          {visibleSubjects.map((subject) => {
            const isSelected = activeSubject?.id === subject.id;
            const completedInSubj = subject.lessons.filter((l) =>
              completedLessonIds.includes(l.id)
            ).length;
            const pct =
              subject.lessons.length > 0
                ? Math.round((completedInSubj / subject.lessons.length) * 100)
                : 0;

            return (
              <button
                key={subject.id}
                type="button"
                onClick={() => setSelectedSubjectId(subject.id)}
                className={`w-full text-left p-4 rounded-2xl border transition-colors ${
                  isSelected
                    ? 'bg-emerald-50/80 dark:bg-emerald-950/50 border-emerald-500 dark:border-emerald-600'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">
                    {subject.code} · {td(subject.category)}
                  </span>
                  <span className="tabular-nums font-medium">{formatDigits(pct)}%</span>
                </div>
                <p className="text-sm font-bold text-slate-900 dark:text-white mt-1.5 leading-snug">
                  {subject.name}
                </p>
                {subject.localTitle && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {subject.localTitle}
                  </p>
                )}
                <div className="mt-3 h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-600 dark:bg-emerald-500 transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </button>
            );
          })}
        </div>

        {/* Active Subject Lessons Panel */}
        <div className="lg:col-span-8">
          {activeSubject ? (
            <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-5">
              <div className="pb-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <BookOpen className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" aria-hidden="true" />
                    <span className="font-mono font-semibold">{activeSubject.code}</span>
                    <span aria-hidden="true">·</span>
                    <span>{td(activeSubject.category)}</span>
                    <span aria-hidden="true">·</span>
                    <span className="tabular-nums">
                      {dt('{count} modules', '{count}টি মডিউল', {
                        count: activeSubject.lessons.length,
                      })}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                    {activeSubject.name}
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                    {activeSubject.description}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    onAskTutorAboutLesson(
                      activeSubject.name,
                      activeSubject.lessons[0]?.title ?? activeSubject.name
                    )
                  }
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 min-h-[42px] bg-emerald-700 hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 self-start"
                >
                  <Bot className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span>{td('Study with AI Tutor')}</span>
                </button>
              </div>

              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {activeSubject.lessons.map((lesson, idx) => {
                  const isDone = completedLessonIds.includes(lesson.id);
                  return (
                    <article
                      key={lesson.id}
                      className="py-4 first:pt-1 last:pb-0 flex flex-col sm:flex-row sm:items-start justify-between gap-4"
                    >
                      <div className="flex items-start gap-3.5 min-w-0 flex-1">
                        <button
                          type="button"
                          onClick={() => onToggleLesson(lesson.id)}
                          aria-label={
                            isDone
                              ? dt('Mark "{title}" as incomplete', '"{title}" অসমাপ্ত হিসেবে চিহ্নিত করুন', {
                                  title: lesson.title,
                                })
                              : dt('Mark "{title}" as completed', '"{title}" সম্পন্ন হিসেবে চিহ্নিত করুন', {
                                  title: lesson.title,
                                })
                          }
                          aria-pressed={isDone}
                          className="mt-0.5 w-8 h-8 rounded-lg flex items-center justify-center shrink-0 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        >
                          {isDone ? (
                            <CheckCircle2
                              className="w-5 h-5 text-emerald-600 dark:text-emerald-400"
                              aria-hidden="true"
                            />
                          ) : (
                            <Circle
                              className="w-5 h-5 text-slate-300 dark:text-slate-600"
                              aria-hidden="true"
                            />
                          )}
                        </button>

                        <div className="min-w-0 space-y-1">
                          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                            <span className="font-semibold text-slate-700 dark:text-slate-300 tabular-nums">
                              {dt('Module {num}', 'মডিউল {num}', {
                                num: String(idx + 1).padStart(2, '0'),
                              })}
                            </span>
                            <span aria-hidden="true">·</span>
                            <span>{lesson.keyTopic}</span>
                            <span aria-hidden="true">·</span>
                            <span className="inline-flex items-center gap-1 tabular-nums">
                              <Clock className="w-3 h-3" aria-hidden="true" />
                              {dt('{min} min', '{min} মিনিট', { min: lesson.durationMinutes })}
                            </span>
                            {isDone && (
                              <>
                                <span aria-hidden="true">·</span>
                                <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                                  {td('Completed')}
                                </span>
                              </>
                            )}
                          </div>
                          <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                            {lesson.title}
                          </h4>
                          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                            {lesson.summary}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => onAskTutorAboutLesson(activeSubject.name, lesson.title)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[36px] text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 hover:text-emerald-800 dark:hover:text-emerald-300 border border-slate-200 dark:border-slate-700 rounded-lg transition-colors whitespace-nowrap shrink-0 self-start sm:ml-2"
                      >
                        <Bot className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                        <span>{td('Practice')}</span>
                      </button>
                    </article>
                  );
                })}
              </div>
            </section>
          ) : (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 text-center text-sm text-slate-500">
              {dt('No subjects match this category filter.', 'এই বিভাগ ফিল্টারের সাথে কোনো বিষয় মেলেনি।')}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
