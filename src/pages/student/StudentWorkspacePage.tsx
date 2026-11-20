import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, ShieldAlert } from 'lucide-react';
import { StudentAiTutorTab } from '../../components/student/StudentAiTutorTab';
import { StudentNoticesTab } from '../../components/student/StudentNoticesTab';
import { StudentOverviewTab } from '../../components/student/StudentOverviewTab';
import { StudentProfileTab } from '../../components/student/StudentProfileTab';
import { StudentShell, type StudentTabId } from '../../components/student/StudentShell';
import { StudentSubjectsTab } from '../../components/student/StudentSubjectsTab';
import { useAuth } from '../../context/AuthContext';
import { getSubjectsForStudent, studentService } from '../../services/studentService';

export function StudentWorkspacePage({
  initialTab = 'overview',
}: {
  initialTab?: StudentTabId;
}) {
  const { session, profile, logout } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<StudentTabId>(initialTab);
  const [tutorSubject, setTutorSubject] = useState<string | null>(null);
  const [tutorTopic, setTutorTopic] = useState<string | null>(null);

  const student = useMemo(() => {
    if (!session) return null;
    return studentService.resolveStudentContext(session, profile);
  }, [session, profile]);

  const [completedLessonIds, setCompletedLessonIds] = useState<string[]>(() =>
    session ? studentService.getCompletedLessonIds(session.userId) : []
  );

  const subjects = useMemo(() => {
    if (!student) return [];
    return getSubjectsForStudent(
      student.pathway,
      student.academicClass,
      student.academicGroup
    );
  }, [student]);

  const relevantNotices = useMemo(() => {
    if (!student) return [];
    return studentService.listRelevantNotices(student);
  }, [student]);

  const handleSignOut = () => {
    logout();
    window.setTimeout(() => {
      navigate('/', { replace: true });
    }, 0);
  };

  if (!session) return null;

  // Phase 1 strict pathway scope guard (Bangla Version & English Version only)
  if (!student) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
        <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 flex items-center justify-center mx-auto">
            <ShieldAlert className="w-6 h-6 text-amber-700 dark:text-amber-400" aria-hidden="true" />
          </div>
          <h1 className="text-lg font-bold">Student Portal Scope (Phase 1)</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            The Student Dashboard is currently available for{' '}
            <strong className="text-slate-900 dark:text-white">Bangla Version</strong> and{' '}
            <strong className="text-slate-900 dark:text-white">English Version</strong> (NCTB)
            pathways. Please sign out and choose either pathway to continue.
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
    const updated = studentService.toggleLessonCompleted(student.userId, lessonId);
    setCompletedLessonIds(updated);
  };

  const handleOpenTutorWithSubject = (subjectName: string, lessonTitle?: string) => {
    setTutorSubject(subjectName);
    setTutorTopic(lessonTitle ?? null);
    setActiveTab('tutor');
  };

  return (
    <StudentShell
      student={student}
      activeTab={activeTab}
      onSelectTab={setActiveTab}
      noticeCount={relevantNotices.length}
      onSignOut={handleSignOut}
    >
      {activeTab === 'overview' && (
        <StudentOverviewTab
          student={student}
          subjects={subjects}
          completedLessonIds={completedLessonIds}
          notices={relevantNotices}
          onNavigateTab={setActiveTab}
          onStartTutorWithSubject={(subj) => handleOpenTutorWithSubject(subj)}
        />
      )}

      {activeTab === 'subjects' && (
        <StudentSubjectsTab
          student={student}
          subjects={subjects}
          completedLessonIds={completedLessonIds}
          onToggleLesson={handleToggleLesson}
          onAskTutorAboutLesson={(subj, lesson) => handleOpenTutorWithSubject(subj, lesson)}
        />
      )}

      {activeTab === 'tutor' && (
        <StudentAiTutorTab
          student={student}
          subjects={subjects}
          initialSubject={tutorSubject}
          initialTopic={tutorTopic}
        />
      )}

      {activeTab === 'notices' && <StudentNoticesTab student={student} />}

      {activeTab === 'profile' && (
        <StudentProfileTab student={student} onSignOut={handleSignOut} />
      )}
    </StudentShell>
  );
}
