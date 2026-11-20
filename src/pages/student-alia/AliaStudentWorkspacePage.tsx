import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  aliaStudentService,
  getAliaSubjectsForStudent,
} from '../../services/aliaStudentService';
import {
  AliaStudentShell,
  type AliaStudentTab,
} from '../../components/student-alia/AliaStudentShell';
import { AliaStudentOverviewTab } from '../../components/student-alia/AliaStudentOverviewTab';
import { AliaStudentSubjectsTab } from '../../components/student-alia/AliaStudentSubjectsTab';
import {
  AliaStudentAiTutorTab,
  type AliaTutorMode,
} from '../../components/student-alia/AliaStudentAiTutorTab';
import { AliaStudentNoticesTab } from '../../components/student-alia/AliaStudentNoticesTab';
import { AliaStudentProfileTab } from '../../components/student-alia/AliaStudentProfileTab';

interface AliaStudentWorkspacePageProps {
  initialTab?: AliaStudentTab;
}

export function AliaStudentWorkspacePage({
  initialTab = 'overview',
}: AliaStudentWorkspacePageProps) {
  const { session, profile, logout } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<AliaStudentTab>(initialTab);
  const [completedLessonIds, setCompletedLessonIds] = useState<string[]>([]);
  const [tutorPreset, setTutorPreset] = useState<{
    subject?: string;
    prompt?: string;
    mode?: AliaTutorMode;
  }>({});

  const student = useMemo(() => {
    if (!session) return null;
    return aliaStudentService.resolveAliaStudentContext(session, profile);
  }, [session, profile]);

  useEffect(() => {
    if (!student) return;
    setCompletedLessonIds(aliaStudentService.getCompletedLessonIds(student.userId));
  }, [student]);

  const subjects = useMemo(() => {
    if (!student) return [];
    return getAliaSubjectsForStudent(student.marhala, student.department);
  }, [student]);

  const notices = useMemo(() => {
    if (!student) return [];
    return aliaStudentService.listRelevantNotices(student);
  }, [student]);

  const handleToggleLesson = useCallback(
    (lessonId: string) => {
      if (!student) return;
      const next = aliaStudentService.toggleLessonCompleted(student.userId, lessonId);
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

  // Strict pathway isolation guard: non-Alia students cannot enter the Alia Student Portal
  if (!session || !student) {
    return <Navigate to="/login?role=student&pathway=alia" replace />;
  }

  return (
    <AliaStudentShell
      student={student}
      activeTab={activeTab}
      onSelectTab={setActiveTab}
      unreadNoticeCount={notices.length}
      onLogout={handleLogout}
    >
      {activeTab === 'overview' && (
        <AliaStudentOverviewTab
          student={student}
          subjects={subjects}
          completedLessonIds={completedLessonIds}
          notices={notices}
          onNavigateTab={setActiveTab}
          onStudySubjectWithTutor={handleStudySubjectWithTutor}
        />
      )}

      {activeTab === 'subjects' && (
        <AliaStudentSubjectsTab
          student={student}
          subjects={subjects}
          completedLessonIds={completedLessonIds}
          onToggleLesson={handleToggleLesson}
          onAskTutorAboutLesson={handleAskTutorAboutLesson}
        />
      )}

      {activeTab === 'ai-tutor' && (
        <AliaStudentAiTutorTab
          student={student}
          subjects={subjects}
          initialSubject={tutorPreset.subject}
          initialPrompt={tutorPreset.prompt}
          initialMode={tutorPreset.mode}
          onClearPreset={handleClearTutorPreset}
        />
      )}

      {activeTab === 'notices' && <AliaStudentNoticesTab student={student} />}

      {activeTab === 'profile' && (
        <AliaStudentProfileTab student={student} onLogout={handleLogout} />
      )}
    </AliaStudentShell>
  );
}
