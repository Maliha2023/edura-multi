import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, ShieldAlert } from 'lucide-react';
import { TeacherAiAssistantTab } from '../../components/teacher/TeacherAiAssistantTab';
import { TeacherClassesTab } from '../../components/teacher/TeacherClassesTab';
import { TeacherNoticesTab } from '../../components/teacher/TeacherNoticesTab';
import { TeacherOverviewTab } from '../../components/teacher/TeacherOverviewTab';
import { TeacherProfileTab } from '../../components/teacher/TeacherProfileTab';
import { TeacherRosterTab } from '../../components/teacher/TeacherRosterTab';
import { TeacherShell, type TeacherTabId } from '../../components/teacher/TeacherShell';
import { useAuth } from '../../context/AuthContext';
import {
  teacherService,
  type AttendanceStatus,
  type TeacherAnnouncementTag,
  type TeacherClassLevel,
  type TeacherGroup,
  type TeacherResourceType,
} from '../../services/teacherService';

export function TeacherWorkspacePage({
  initialTab = 'overview',
}: {
  initialTab?: TeacherTabId;
}) {
  const { session, profile, logout } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<TeacherTabId>(initialTab);
  const [assistantTopic, setAssistantTopic] = useState<string | null>(null);
  const [assistantClass, setAssistantClass] = useState<TeacherClassLevel | null>(null);
  const [revision, setRevision] = useState(0);

  const teacher = useMemo(() => {
    if (!session) return null;
    return teacherService.resolveTeacherContext(session, profile);
  }, [session, profile]);

  const modules = useMemo(() => {
    if (!teacher) return [];
    void revision;
    return teacherService.listModules(teacher.pathway);
  }, [teacher, revision]);

  const roster = useMemo(() => {
    if (!teacher) return [];
    void revision;
    return teacherService.listPathwayStudentRoster(teacher.pathway);
  }, [teacher, revision]);

  const officialNotices = useMemo(() => {
    if (!teacher) return [];
    void revision;
    return teacherService.listOfficialAdminNotices(teacher.pathway);
  }, [teacher, revision]);

  const classAnnouncements = useMemo(() => {
    if (!teacher) return [];
    void revision;
    return teacherService.listClassAnnouncements(teacher.pathway);
  }, [teacher, revision]);

  const handleSignOut = () => {
    logout();
    window.setTimeout(() => {
      navigate('/', { replace: true });
    }, 0);
  };

  if (!session) return null;

  // Phase 1 strict pathway scope guard (Bangla Version & English Version only)
  if (!teacher) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
        <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 flex items-center justify-center mx-auto">
            <ShieldAlert className="w-6 h-6 text-amber-700 dark:text-amber-400" aria-hidden="true" />
          </div>
          <h1 className="text-lg font-bold">Teacher Portal Scope (Phase 1)</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            The Teacher Dashboard is currently available for{' '}
            <strong className="text-slate-900 dark:text-white">Bangla Version</strong> and{' '}
            <strong className="text-slate-900 dark:text-white">English Version</strong> (NCTB)
            pathways. Please sign out and choose either pathway to continue.
          </p>
          <button
            type="button"
            onClick={handleSignOut}
            className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 min-h-[46px] bg-teal-700 hover:bg-teal-800 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" aria-hidden="true" />
            <span>Return to Stream Selection</span>
          </button>
        </div>
      </div>
    );
  }

  const refreshData = () => setRevision((prev) => prev + 1);

  const handleOpenAssistant = (topic: string, academicClass?: TeacherClassLevel) => {
    setAssistantTopic(topic);
    setAssistantClass(academicClass ?? null);
    setActiveTab('assistant');
  };

  const handleCreateModule = (input: {
    academicClass: TeacherClassLevel;
    academicGroup: TeacherGroup | null;
    title: string;
    resourceType: TeacherResourceType;
    chapterTag: string;
    summary: string;
    isPublished: boolean;
  }) => {
    const res = teacherService.createModuleResource(teacher, input);
    if (res.ok) refreshData();
    return res.ok ? { ok: true as const } : { ok: false as const, error: res.error };
  };

  const handleToggleModulePublished = (moduleId: string) => {
    teacherService.toggleModulePublished(teacher.pathway, moduleId);
    refreshData();
  };

  const handleDeleteModule = (moduleId: string) => {
    teacherService.deleteModuleResource(teacher.pathway, moduleId);
    refreshData();
  };

  const handleSaveAssessment = (
    studentId: string,
    patch: {
      marks: number;
      attendanceRate: number;
      attendanceStatus: AttendanceStatus;
      remarks: string;
    }
  ) => {
    const res = teacherService.updateStudentAssessment(teacher.pathway, studentId, patch);
    if (res.ok) refreshData();
    return res.ok ? { ok: true as const } : { ok: false as const, error: res.error };
  };

  const handlePostAnnouncement = (input: {
    academicClass: TeacherClassLevel;
    academicGroup: TeacherGroup | null;
    title: string;
    message: string;
    tag: TeacherAnnouncementTag;
  }) => {
    const res = teacherService.postClassAnnouncement(teacher, input);
    if (res.ok) refreshData();
    return res.ok ? { ok: true as const } : { ok: false as const, error: res.error };
  };

  const handleDeleteAnnouncement = (announcementId: string) => {
    teacherService.deleteClassAnnouncement(teacher.pathway, announcementId);
    refreshData();
  };

  return (
    <TeacherShell
      teacher={teacher}
      activeTab={activeTab}
      onSelectTab={setActiveTab}
      noticeCount={officialNotices.length}
      onSignOut={handleSignOut}
    >
      {activeTab === 'overview' && (
        <TeacherOverviewTab
          teacher={teacher}
          modules={modules}
          roster={roster}
          notices={officialNotices}
          onNavigateTab={setActiveTab}
          onOpenAssistantForTopic={(topic) => handleOpenAssistant(topic)}
        />
      )}

      {activeTab === 'classes' && (
        <TeacherClassesTab
          teacher={teacher}
          modules={modules}
          onCreateModule={handleCreateModule}
          onTogglePublished={handleToggleModulePublished}
          onDeleteModule={handleDeleteModule}
          onGenerateWithAi={(topic, cls) => handleOpenAssistant(topic, cls)}
        />
      )}

      {activeTab === 'roster' && (
        <TeacherRosterTab
          teacher={teacher}
          roster={roster}
          onSaveAssessment={handleSaveAssessment}
        />
      )}

      {activeTab === 'assistant' && (
        <TeacherAiAssistantTab
          teacher={teacher}
          initialTopic={assistantTopic}
          initialClass={assistantClass}
        />
      )}

      {activeTab === 'notices' && (
        <TeacherNoticesTab
          teacher={teacher}
          officialNotices={officialNotices}
          classAnnouncements={classAnnouncements}
          onPostAnnouncement={handlePostAnnouncement}
          onDeleteAnnouncement={handleDeleteAnnouncement}
        />
      )}

      {activeTab === 'profile' && (
        <TeacherProfileTab teacher={teacher} onSignOut={handleSignOut} />
      )}
    </TeacherShell>
  );
}
