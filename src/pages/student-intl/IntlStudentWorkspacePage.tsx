import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, ShieldAlert } from 'lucide-react';
import { IntlStudentAiTutorTab } from '../../components/student-intl/IntlStudentAiTutorTab';
import { IntlStudentNoticesTab } from '../../components/student-intl/IntlStudentNoticesTab';
import { IntlStudentOverviewTab } from '../../components/student-intl/IntlStudentOverviewTab';
import { IntlStudentProfileTab } from '../../components/student-intl/IntlStudentProfileTab';
import {
  IntlStudentShell,
  type IntlStudentTabId,
} from '../../components/student-intl/IntlStudentShell';
import { IntlStudentSubjectsTab } from '../../components/student-intl/IntlStudentSubjectsTab';
import { useAuth } from '../../context/AuthContext';
import {
  getIntlSubjectsForStudent,
  internationalStudentService,
} from '../../services/internationalStudentService';

export function IntlStudentWorkspacePage({
  initialTab = 'overview',
}: {
  initialTab?: IntlStudentTabId;
}) {
  const { session, profile, logout } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<IntlStudentTabId>(initialTab);
  const [tutorSubject, setTutorSubject] = useState<string | null>(null);
  const [tutorTopic, setTutorTopic] = useState<string | null>(null);

  const student = useMemo(() => {
    if (!session) return null;
    return internationalStudentService.resolveIntlStudentContext(session, profile);
  }, [session, profile]);

  const [completedLessonIds, setCompletedLessonIds] = useState<string[]>(() =>
    student
      ? internationalStudentService.getCompletedLessonIds(student.userId, student.pathway)
      : []
  );

  const subjects = useMemo(() => {
    if (!student) return [];
    return getIntlSubjectsForStudent(
      student.pathway,
      student.academicLevel,
      student.academicTrack
    );
  }, [student]);

  const relevantNotices = useMemo(() => {
    if (!student) return [];
    return internationalStudentService.listRelevantNotices(student);
  }, [student]);

  const handleSignOut = () => {
    logout();
    window.setTimeout(() => {
      navigate('/', { replace: true });
    }, 0);
  };

  if (!session) return null;

  // Strict Cambridge & Edexcel pathway isolation guard
  if (!student) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
        <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 flex items-center justify-center mx-auto">
            <ShieldAlert className="w-6 h-6 text-amber-700 dark:text-amber-400" aria-hidden="true" />
          </div>
          <h1 className="text-lg font-bold">International Student Portal Scope</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            This Student Dashboard is scoped strictly to{' '}
            <strong className="text-slate-900 dark:text-white">Cambridge</strong> and{' '}
            <strong className="text-slate-900 dark:text-white">Edexcel</strong> pathways. Please
            sign out and select your pathway to continue.
          </p>
          <button
            type="button"
            onClick={handleSignOut}
            className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 min-h-[46px] bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" aria-hidden="true" />
            <span>Return to Stream Selection</span>
          </button>
        </div>
      </div>
    );
  }

  const handleToggleLesson = (lessonId: string) => {
    const updated = internationalStudentService.toggleLessonCompleted(
      student.userId,
      student.pathway,
      lessonId
    );
    setCompletedLessonIds(updated);
  };

  const handleOpenTutorWithSubject = (subjectName: string, lessonTitle?: string) => {
    setTutorSubject(subjectName);
    setTutorTopic(lessonTitle ?? null);
    setActiveTab('tutor');
  };

  return (
    <IntlStudentShell
      student={student}
      activeTab={activeTab}
      onSelectTab={setActiveTab}
      noticeCount={relevantNotices.length}
      onSignOut={handleSignOut}
    >
      {activeTab === 'overview' && (
        <IntlStudentOverviewTab
          student={student}
          subjects={subjects}
          completedLessonIds={completedLessonIds}
          notices={relevantNotices}
          onNavigateTab={setActiveTab}
          onStartTutorWithSubject={(subj) => handleOpenTutorWithSubject(subj)}
        />
      )}

      {activeTab === 'subjects' && (
        <IntlStudentSubjectsTab
          student={student}
          subjects={subjects}
          completedLessonIds={completedLessonIds}
          onToggleLesson={handleToggleLesson}
          onAskTutorAboutLesson={(subj, lesson) => handleOpenTutorWithSubject(subj, lesson)}
        />
      )}

      {activeTab === 'tutor' && (
        <IntlStudentAiTutorTab
          student={student}
          subjects={subjects}
          initialSubject={tutorSubject}
          initialTopic={tutorTopic}
        />
      )}

      {activeTab === 'notices' && <IntlStudentNoticesTab student={student} />}

      {activeTab === 'profile' && (
        <IntlStudentProfileTab student={student} onSignOut={handleSignOut} />
      )}
    </IntlStudentShell>
  );
}
