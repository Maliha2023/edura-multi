import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  getQawmiSubjectsForStudent,
  qawmiStudentService,
} from '../../services/qawmiStudentService';
import {
  QawmiStudentShell,
  type QawmiStudentTab,
} from '../../components/student-qawmi/QawmiStudentShell';
import { QawmiStudentOverviewTab } from '../../components/student-qawmi/QawmiStudentOverviewTab';
import { QawmiStudentSubjectsTab } from '../../components/student-qawmi/QawmiStudentSubjectsTab';
import {
  QawmiStudentAiTutorTab,
  type QawmiTutorMode,
} from '../../components/student-qawmi/QawmiStudentAiTutorTab';
import { QawmiStudentNoticesTab } from '../../components/student-qawmi/QawmiStudentNoticesTab';
import { QawmiStudentProfileTab } from '../../components/student-qawmi/QawmiStudentProfileTab';

interface QawmiStudentWorkspacePageProps {
  initialTab?: QawmiStudentTab;
}

export function QawmiStudentWorkspacePage({
  initialTab = 'overview',
}: QawmiStudentWorkspacePageProps) {
  const { session, profile, logout } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<QawmiStudentTab>(initialTab);
  const [completedLessonIds, setCompletedLessonIds] = useState<string[]>([]);
  const [tutorPreset, setTutorPreset] = useState<{
    subject?: string;
    prompt?: string;
    mode?: QawmiTutorMode;
  }>({});

  const student = useMemo(() => {
    if (!session) return null;
    return qawmiStudentService.resolveQawmiStudentContext(session, profile);
  }, [session, profile]);

  useEffect(() => {
    if (!student) return;
    setCompletedLessonIds(qawmiStudentService.getCompletedLessonIds(student.userId));
  }, [student]);

  const subjects = useMemo(() => {
    if (!student) return [];
    return getQawmiSubjectsForStudent(student.marhala, student.focusBranch);
  }, [student]);

  const notices = useMemo(() => {
    if (!student) return [];
    return qawmiStudentService.listRelevantNotices(student);
  }, [student]);

  const handleToggleLesson = useCallback(
    (lessonId: string) => {
      if (!student) return;
      const next = qawmiStudentService.toggleLessonCompleted(student.userId, lessonId);
      setCompletedLessonIds(next);
    },
    [student]
  );

  const handleStudySubjectWithTutor = useCallback((subjectName: string) => {
    setTutorPreset({ subject: subjectName, mode: 'ask' });
    setActiveTab('ai-tutor');
  }, []);

  const handleAskTutorAboutLesson = useCallback(
    (subjectName: string, prompt: string, mode: 'ask' | 'practice') => {
      setTutorPreset({ subject: subjectName, prompt, mode });
      setActiveTab('ai-tutor');
    },
    []
  );

  const handleClearTutorPreset = useCallback(() => {
    setTutorPreset({});
  }, []);

  const handleLogout = useCallback(() => {
    logout();
    navigate('/', { replace: true });
  }, [logout, navigate]);

  // Strict pathway isolation guard: non-Qawmi students cannot enter the Qawmi Student Portal
  if (!session || !student) {
    return <Navigate to="/login?role=student&pathway=qawmi" replace />;
  }

  return (
    <QawmiStudentShell
      student={student}
      activeTab={activeTab}
      onSelectTab={setActiveTab}
      unreadNoticeCount={notices.length}
      onLogout={handleLogout}
    >
      {activeTab === 'overview' && (
        <QawmiStudentOverviewTab
          student={student}
          subjects={subjects}
          completedLessonIds={completedLessonIds}
          notices={notices}
          onNavigateTab={setActiveTab}
          onStudySubjectWithTutor={handleStudySubjectWithTutor}
        />
      )}

      {activeTab === 'subjects' && (
        <QawmiStudentSubjectsTab
          student={student}
          subjects={subjects}
          completedLessonIds={completedLessonIds}
          onToggleLesson={handleToggleLesson}
          onAskTutorAboutLesson={handleAskTutorAboutLesson}
        />
      )}

      {activeTab === 'ai-tutor' && (
        <QawmiStudentAiTutorTab
          student={student}
          subjects={subjects}
          initialSubject={tutorPreset.subject}
          initialPrompt={tutorPreset.prompt}
          initialMode={tutorPreset.mode}
          onClearPreset={handleClearTutorPreset}
        />
      )}

      {activeTab === 'notices' && <QawmiStudentNoticesTab student={student} />}

      {activeTab === 'profile' && (
        <QawmiStudentProfileTab student={student} onLogout={handleLogout} />
      )}
    </QawmiStudentShell>
  );
}
