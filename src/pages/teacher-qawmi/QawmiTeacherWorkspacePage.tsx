import React, { useMemo, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  QawmiTeacherShell,
  type QawmiTeacherTabId,
} from '../../components/teacher-qawmi/QawmiTeacherShell';
import { QawmiTeacherOverviewTab } from '../../components/teacher-qawmi/QawmiTeacherOverviewTab';
import { QawmiTeacherClassesTab } from '../../components/teacher-qawmi/QawmiTeacherClassesTab';
import { QawmiTeacherRosterTab } from '../../components/teacher-qawmi/QawmiTeacherRosterTab';
import { QawmiTeacherAiAssistantTab } from '../../components/teacher-qawmi/QawmiTeacherAiAssistantTab';
import { QawmiTeacherNoticesTab } from '../../components/teacher-qawmi/QawmiTeacherNoticesTab';
import { QawmiTeacherProfileTab } from '../../components/teacher-qawmi/QawmiTeacherProfileTab';
import {
  qawmiTeacherService,
  type QawmiAttendanceStatus,
  type QawmiTeacherAnnouncementTag,
  type QawmiTeacherFocusBranch,
  type QawmiTeacherMarhala,
  type QawmiTeacherModuleType,
} from '../../services/qawmiTeacherService';

interface QawmiTeacherWorkspacePageProps {
  initialTab?: QawmiTeacherTabId;
}

export function QawmiTeacherWorkspacePage({
  initialTab = 'overview',
}: QawmiTeacherWorkspacePageProps) {
  const { session, profile, logout } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<QawmiTeacherTabId>(initialTab);
  const [revision, setRevision] = useState(0);
  const [aiInitialTopic, setAiInitialTopic] = useState<string | null>(null);
  const [aiInitialMarhala, setAiInitialMarhala] = useState<QawmiTeacherMarhala | null>(null);

  const teacher = useMemo(() => {
    if (!session) return null;
    return qawmiTeacherService.resolveQawmiTeacherContext(session, profile);
  }, [session, profile]);

  const modules = useMemo(() => {
    void revision;
    if (!teacher) return [];
    return qawmiTeacherService.listModules();
  }, [teacher, revision]);

  const roster = useMemo(() => {
    void revision;
    if (!teacher) return [];
    return qawmiTeacherService.listStudentRoster();
  }, [teacher, revision]);

  const officialNotices = useMemo(() => {
    void revision;
    if (!teacher) return [];
    return qawmiTeacherService.listOfficialNotices();
  }, [teacher, revision]);

  const classAnnouncements = useMemo(() => {
    void revision;
    if (!teacher) return [];
    return qawmiTeacherService.listClassAnnouncements();
  }, [teacher, revision]);

  const todaySchedule = useMemo(() => {
    if (!teacher) return [];
    return qawmiTeacherService.getTodaySchedule(teacher);
  }, [teacher]);

  if (!teacher) {
    return <Navigate to="/teacher/dashboard" replace />;
  }

  const handleLogout = () => {
    logout();
    navigate('/', { replace: true });
  };

  const handleOpenAiWithTopic = (topic: string, marhala: QawmiTeacherMarhala) => {
    setAiInitialTopic(topic);
    setAiInitialMarhala(marhala);
    setActiveTab('ai-assistant');
  };

  const handleCreateModule = (input: {
    marhala: QawmiTeacherMarhala;
    focusBranch: QawmiTeacherFocusBranch;
    title: string;
    type: QawmiTeacherModuleType;
    summary: string;
    published: boolean;
  }) => {
    const res = qawmiTeacherService.createModule(teacher, input);
    if (res.ok) {
      setRevision((prev) => prev + 1);
      return { ok: true as const };
    }
    return { ok: false as const, error: res.error };
  };

  const handleTogglePublish = (moduleId: string) => {
    qawmiTeacherService.toggleModulePublished(moduleId);
    setRevision((prev) => prev + 1);
  };

  const handleDeleteModule = (moduleId: string) => {
    qawmiTeacherService.deleteModule(moduleId);
    setRevision((prev) => prev + 1);
  };

  const handleSaveAssessment = (
    studentId: string,
    patch: {
      marks: number;
      attendanceRate: number;
      attendanceStatus: QawmiAttendanceStatus;
      remarks: string;
    }
  ) => {
    const res = qawmiTeacherService.updateStudentAssessment(studentId, patch);
    if (res.ok) {
      setRevision((prev) => prev + 1);
    }
    return res;
  };

  const handlePostAnnouncement = (input: {
    marhala: QawmiTeacherMarhala;
    focusBranch: QawmiTeacherFocusBranch;
    title: string;
    message: string;
    tag: QawmiTeacherAnnouncementTag;
  }) => {
    const res = qawmiTeacherService.postClassAnnouncement(teacher, input);
    if (res.ok) {
      setRevision((prev) => prev + 1);
      return { ok: true as const };
    }
    return { ok: false as const, error: res.error };
  };

  const handleDeleteAnnouncement = (announcementId: string) => {
    qawmiTeacherService.deleteClassAnnouncement(announcementId);
    setRevision((prev) => prev + 1);
  };

  return (
    <QawmiTeacherShell
      teacher={teacher}
      activeTab={activeTab}
      onSelectTab={setActiveTab}
      onLogout={handleLogout}
      noticeCount={officialNotices.length}
    >
      {activeTab === 'overview' && (
        <QawmiTeacherOverviewTab
          teacher={teacher}
          modules={modules}
          roster={roster}
          officialNotices={officialNotices}
          todaySchedule={todaySchedule}
          onNavigateTab={setActiveTab}
          onOpenAiWithTopic={handleOpenAiWithTopic}
        />
      )}

      {activeTab === 'classes' && (
        <QawmiTeacherClassesTab
          teacher={teacher}
          modules={modules}
          onCreateModule={handleCreateModule}
          onTogglePublish={handleTogglePublish}
          onDeleteModule={handleDeleteModule}
          onDraftQuizForModule={handleOpenAiWithTopic}
        />
      )}

      {activeTab === 'roster' && (
        <QawmiTeacherRosterTab
          teacher={teacher}
          roster={roster}
          onSaveAssessment={handleSaveAssessment}
        />
      )}

      {activeTab === 'ai-assistant' && (
        <QawmiTeacherAiAssistantTab
          teacher={teacher}
          initialTopic={aiInitialTopic}
          initialMarhala={aiInitialMarhala}
        />
      )}

      {activeTab === 'notices' && (
        <QawmiTeacherNoticesTab
          teacher={teacher}
          officialNotices={officialNotices}
          classAnnouncements={classAnnouncements}
          onPostAnnouncement={handlePostAnnouncement}
          onDeleteAnnouncement={handleDeleteAnnouncement}
        />
      )}

      {activeTab === 'profile' && (
        <QawmiTeacherProfileTab teacher={teacher} onSignOut={handleLogout} />
      )}
    </QawmiTeacherShell>
  );
}
