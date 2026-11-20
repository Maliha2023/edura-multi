import React, { useMemo, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  AliaTeacherShell,
  type AliaTeacherTabId,
} from '../../components/teacher-alia/AliaTeacherShell';
import { AliaTeacherOverviewTab } from '../../components/teacher-alia/AliaTeacherOverviewTab';
import { AliaTeacherClassesTab } from '../../components/teacher-alia/AliaTeacherClassesTab';
import { AliaTeacherRosterTab } from '../../components/teacher-alia/AliaTeacherRosterTab';
import { AliaTeacherAiAssistantTab } from '../../components/teacher-alia/AliaTeacherAiAssistantTab';
import { AliaTeacherNoticesTab } from '../../components/teacher-alia/AliaTeacherNoticesTab';
import { AliaTeacherProfileTab } from '../../components/teacher-alia/AliaTeacherProfileTab';
import {
  aliaTeacherService,
  type AliaAttendanceStatus,
  type AliaDepartment,
  type AliaMarhala,
  type AliaTeacherAnnouncementTag,
  type AliaTeacherModuleType,
} from '../../services/aliaTeacherService';

interface AliaTeacherWorkspacePageProps {
  initialTab?: AliaTeacherTabId;
}

export function AliaTeacherWorkspacePage({
  initialTab = 'overview',
}: AliaTeacherWorkspacePageProps) {
  const { session, profile, logout } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<AliaTeacherTabId>(initialTab);
  const [revision, setRevision] = useState(0);
  const [aiInitialTopic, setAiInitialTopic] = useState<string | null>(null);
  const [aiInitialMarhala, setAiInitialMarhala] = useState<AliaMarhala | null>(null);

  const teacher = useMemo(() => {
    if (!session) return null;
    return aliaTeacherService.resolveAliaTeacherContext(session, profile);
  }, [session, profile]);

  const modules = useMemo(() => {
    void revision;
    if (!teacher) return [];
    return aliaTeacherService.listModules();
  }, [teacher, revision]);

  const roster = useMemo(() => {
    void revision;
    if (!teacher) return [];
    return aliaTeacherService.listStudentRoster();
  }, [teacher, revision]);

  const officialNotices = useMemo(() => {
    void revision;
    if (!teacher) return [];
    return aliaTeacherService.listOfficialNotices();
  }, [teacher, revision]);

  const classAnnouncements = useMemo(() => {
    void revision;
    if (!teacher) return [];
    return aliaTeacherService.listClassAnnouncements();
  }, [teacher, revision]);

  const todaySchedule = useMemo(() => {
    if (!teacher) return [];
    return aliaTeacherService.getTodaySchedule(teacher);
  }, [teacher]);

  if (!teacher) {
    return <Navigate to="/teacher/dashboard" replace />;
  }

  const handleLogout = () => {
    logout();
    navigate('/', { replace: true });
  };

  const handleOpenAiWithTopic = (topic: string, marhala: AliaMarhala) => {
    setAiInitialTopic(topic);
    setAiInitialMarhala(marhala);
    setActiveTab('ai-assistant');
  };

  const handleCreateModule = (input: {
    marhala: AliaMarhala;
    department: AliaDepartment;
    title: string;
    type: AliaTeacherModuleType;
    summary: string;
    published: boolean;
  }) => {
    const res = aliaTeacherService.createModule(teacher, input);
    if (res.ok) {
      setRevision((prev) => prev + 1);
      return { ok: true as const };
    }
    return { ok: false as const, error: res.error };
  };

  const handleTogglePublish = (moduleId: string) => {
    aliaTeacherService.toggleModulePublished(moduleId);
    setRevision((prev) => prev + 1);
  };

  const handleDeleteModule = (moduleId: string) => {
    aliaTeacherService.deleteModule(moduleId);
    setRevision((prev) => prev + 1);
  };

  const handleSaveAssessment = (
    studentId: string,
    patch: {
      marks: number;
      attendanceRate: number;
      attendanceStatus: AliaAttendanceStatus;
      remarks: string;
    }
  ) => {
    const res = aliaTeacherService.updateStudentAssessment(studentId, patch);
    if (res.ok) {
      setRevision((prev) => prev + 1);
    }
    return res;
  };

  const handlePostAnnouncement = (input: {
    marhala: AliaMarhala;
    department: AliaDepartment;
    title: string;
    message: string;
    tag: AliaTeacherAnnouncementTag;
  }) => {
    const res = aliaTeacherService.postClassAnnouncement(teacher, input);
    if (res.ok) {
      setRevision((prev) => prev + 1);
      return { ok: true as const };
    }
    return { ok: false as const, error: res.error };
  };

  const handleDeleteAnnouncement = (announcementId: string) => {
    aliaTeacherService.deleteClassAnnouncement(announcementId);
    setRevision((prev) => prev + 1);
  };

  return (
    <AliaTeacherShell
      teacher={teacher}
      activeTab={activeTab}
      onSelectTab={setActiveTab}
      onLogout={handleLogout}
      noticeCount={officialNotices.length}
    >
      {activeTab === 'overview' && (
        <AliaTeacherOverviewTab
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
        <AliaTeacherClassesTab
          teacher={teacher}
          modules={modules}
          onCreateModule={handleCreateModule}
          onTogglePublish={handleTogglePublish}
          onDeleteModule={handleDeleteModule}
          onDraftQuizForModule={handleOpenAiWithTopic}
        />
      )}

      {activeTab === 'roster' && (
        <AliaTeacherRosterTab
          teacher={teacher}
          roster={roster}
          onSaveAssessment={handleSaveAssessment}
        />
      )}

      {activeTab === 'ai-assistant' && (
        <AliaTeacherAiAssistantTab
          teacher={teacher}
          initialTopic={aiInitialTopic}
          initialMarhala={aiInitialMarhala}
        />
      )}

      {activeTab === 'notices' && (
        <AliaTeacherNoticesTab
          teacher={teacher}
          officialNotices={officialNotices}
          classAnnouncements={classAnnouncements}
          onPostAnnouncement={handlePostAnnouncement}
          onDeleteAnnouncement={handleDeleteAnnouncement}
        />
      )}

      {activeTab === 'profile' && (
        <AliaTeacherProfileTab teacher={teacher} onSignOut={handleLogout} />
      )}
    </AliaTeacherShell>
  );
}
