import React, { useMemo, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  IntlTeacherShell,
  type IntlTeacherTabId,
} from '../../components/teacher-intl/IntlTeacherShell';
import { IntlTeacherOverviewTab } from '../../components/teacher-intl/IntlTeacherOverviewTab';
import { IntlTeacherClassesTab } from '../../components/teacher-intl/IntlTeacherClassesTab';
import { IntlTeacherRosterTab } from '../../components/teacher-intl/IntlTeacherRosterTab';
import { IntlTeacherAiAssistantTab } from '../../components/teacher-intl/IntlTeacherAiAssistantTab';
import { IntlTeacherNoticesTab } from '../../components/teacher-intl/IntlTeacherNoticesTab';
import { IntlTeacherProfileTab } from '../../components/teacher-intl/IntlTeacherProfileTab';
import {
  internationalTeacherService,
  type InternationalAcademicLevel,
  type InternationalAcademicTrack,
  type IntlAttendanceStatus,
  type IntlTeacherAnnouncementTag,
  type IntlTeacherModuleType,
} from '../../services/internationalTeacherService';

interface IntlTeacherWorkspacePageProps {
  initialTab?: IntlTeacherTabId;
}

export function IntlTeacherWorkspacePage({
  initialTab = 'overview',
}: IntlTeacherWorkspacePageProps) {
  const { session, logout } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<IntlTeacherTabId>(initialTab);
  const [revision, setRevision] = useState(0);
  const [aiInitialTopic, setAiInitialTopic] = useState<string | null>(null);
  const [aiInitialLevel, setAiInitialLevel] = useState<InternationalAcademicLevel | null>(null);

  const teacher = useMemo(
    () => internationalTeacherService.resolveIntlTeacherContext(session),
    [session]
  );

  const modules = useMemo(() => {
    void revision;
    if (!teacher) return [];
    return internationalTeacherService.listModules(teacher.pathway);
  }, [teacher, revision]);

  const roster = useMemo(() => {
    void revision;
    if (!teacher) return [];
    return internationalTeacherService.listPathwayStudentRoster(teacher.pathway);
  }, [teacher, revision]);

  const officialNotices = useMemo(() => {
    void revision;
    if (!teacher) return [];
    return internationalTeacherService.listOfficialAdminNotices(teacher.pathway);
  }, [teacher, revision]);

  const classAnnouncements = useMemo(() => {
    void revision;
    if (!teacher) return [];
    return internationalTeacherService.listClassAnnouncements(teacher.pathway);
  }, [teacher, revision]);

  const todaySchedule = useMemo(() => {
    if (!teacher) return [];
    return internationalTeacherService.getTodaySchedule(teacher);
  }, [teacher]);

  if (!teacher) {
    return <Navigate to="/teacher/dashboard" replace />;
  }

  const handleLogout = () => {
    logout();
    navigate('/', { replace: true });
  };

  const handleOpenAiWithTopic = (topic: string, academicLevel: InternationalAcademicLevel) => {
    setAiInitialTopic(topic);
    setAiInitialLevel(academicLevel);
    setActiveTab('ai-assistant');
  };

  const handleCreateModule = (input: {
    academicLevel: InternationalAcademicLevel;
    academicTrack: InternationalAcademicTrack;
    title: string;
    type: IntlTeacherModuleType;
    summary: string;
    published: boolean;
  }) => {
    const res = internationalTeacherService.createModuleResource({
      pathway: teacher.pathway,
      subject: teacher.primarySubject,
      teacherName: teacher.fullName,
      ...input,
    });
    if (res.ok) {
      setRevision((prev) => prev + 1);
      return { ok: true as const };
    }
    return { ok: false as const, error: res.error };
  };

  const handleTogglePublish = (moduleId: string) => {
    internationalTeacherService.toggleModulePublished(teacher.pathway, moduleId);
    setRevision((prev) => prev + 1);
  };

  const handleDeleteModule = (moduleId: string) => {
    internationalTeacherService.deleteModuleResource(teacher.pathway, moduleId);
    setRevision((prev) => prev + 1);
  };

  const handleSaveAssessment = (
    studentId: string,
    patch: {
      marks: number;
      attendanceRate: number;
      attendanceStatus: IntlAttendanceStatus;
      remarks: string;
    }
  ) => {
    const res = internationalTeacherService.updateStudentAssessment(
      teacher.pathway,
      studentId,
      patch
    );
    if (res.ok) {
      setRevision((prev) => prev + 1);
    }
    return res;
  };

  const handlePostAnnouncement = (input: {
    academicLevel: InternationalAcademicLevel;
    academicTrack: InternationalAcademicTrack;
    title: string;
    message: string;
    tag: IntlTeacherAnnouncementTag;
  }) => {
    const res = internationalTeacherService.postClassAnnouncement({
      pathway: teacher.pathway,
      subject: teacher.primarySubject,
      teacherName: teacher.fullName,
      ...input,
    });
    if (res.ok) {
      setRevision((prev) => prev + 1);
      return { ok: true as const };
    }
    return { ok: false as const, error: res.error };
  };

  const handleDeleteAnnouncement = (announcementId: string) => {
    internationalTeacherService.deleteClassAnnouncement(teacher.pathway, announcementId);
    setRevision((prev) => prev + 1);
  };

  return (
    <IntlTeacherShell
      teacher={teacher}
      activeTab={activeTab}
      onSelectTab={setActiveTab}
      onLogout={handleLogout}
      noticeCount={officialNotices.length}
    >
      {activeTab === 'overview' && (
        <IntlTeacherOverviewTab
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
        <IntlTeacherClassesTab
          teacher={teacher}
          modules={modules}
          onCreateModule={handleCreateModule}
          onTogglePublish={handleTogglePublish}
          onDeleteModule={handleDeleteModule}
          onDraftQuizForModule={handleOpenAiWithTopic}
        />
      )}

      {activeTab === 'roster' && (
        <IntlTeacherRosterTab
          teacher={teacher}
          roster={roster}
          onSaveAssessment={handleSaveAssessment}
        />
      )}

      {activeTab === 'ai-assistant' && (
        <IntlTeacherAiAssistantTab
          teacher={teacher}
          initialTopic={aiInitialTopic}
          initialLevel={aiInitialLevel}
        />
      )}

      {activeTab === 'notices' && (
        <IntlTeacherNoticesTab
          teacher={teacher}
          officialNotices={officialNotices}
          classAnnouncements={classAnnouncements}
          onPostAnnouncement={handlePostAnnouncement}
          onDeleteAnnouncement={handleDeleteAnnouncement}
        />
      )}

      {activeTab === 'profile' && (
        <IntlTeacherProfileTab teacher={teacher} onSignOut={handleLogout} />
      )}
    </IntlTeacherShell>
  );
}
