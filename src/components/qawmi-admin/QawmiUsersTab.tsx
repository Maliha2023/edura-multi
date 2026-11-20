import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  Ban,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Download,
  Edit3,
  Eye,
  EyeOff,
  GraduationCap,
  KeyRound,
  MoreVertical,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  UserCheck,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import {
  QAWMI_FOCUS_BRANCHES,
  QAWMI_MARHALAS,
  formatQawmiAcademicDisplay,
  generateTemporaryPassword,
  getDirectoryFilterMarhalaLabel,
  getFocusBranchesForMarhala,
  getQawmiKitabSuggestions,
  getQawmiUserInitials,
  getShortMarhalaLabel,
  qawmiAdminService,
  type QawmiAdminPendingRegistration,
  type QawmiAdminRole,
  type QawmiAdminUserProfile,
  type QawmiFocusBranch,
  type QawmiMarhala,
  type QawmiRegistrationType,
  type QawmiUserStatus,
} from '../../services/qawmiAdminService';
import { useDashboardLanguage } from '../../i18n/useDashboardLanguage';

interface QawmiUsersTabProps {
  adminEmail: string;
  onDataChanged: () => void;
}

type UsersSubTab = 'pending' | 'directory' | 'manual';

export function QawmiUsersTab({ adminEmail, onDataChanged }: QawmiUsersTabProps) {
  const { dt, td, formatDigits, formatDate, formatDateTime, formatCountdown } =
    useDashboardLanguage();
  const panelTitle = dt('Qawmi Madrasa Panel', 'কওমি মাদ্রাসা প্যানেল');
  const defaultMarhala: QawmiMarhala = 'Mutawassitah (Middle Marhala)';
  const defaultFocusBranch: QawmiFocusBranch = 'General / Kitab';

  const [subTab, setSubTab] = useState<UsersSubTab>('pending');
  const [refreshTick, setRefreshTick] = useState(0);
  const [nowTs, setNowTs] = useState(() => Date.now());
  const [banner, setBanner] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Pending Approvals state
  const [pendingRole, setPendingRole] = useState<QawmiAdminRole>('teacher');
  const [pendingMarhalaFilter, setPendingMarhalaFilter] = useState<'all' | QawmiMarhala>('all');
  const [editingPending, setEditingPending] = useState<QawmiAdminPendingRegistration | null>(null);
  const [pendingEditName, setPendingEditName] = useState('');
  const [pendingEditEmail, setPendingEditEmail] = useState('');
  const [pendingEditMarhala, setPendingEditMarhala] = useState<QawmiMarhala>(defaultMarhala);
  const [pendingEditFocus, setPendingEditFocus] = useState<QawmiFocusBranch>(defaultFocusBranch);
  const [pendingEditSubject, setPendingEditSubject] = useState('');
  const [pendingEditError, setPendingEditError] = useState<string | null>(null);
  const [rejectingPending, setRejectingPending] = useState<QawmiAdminPendingRegistration | null>(
    null
  );

  // User Directory state
  const [dirRole, setDirRole] = useState<QawmiAdminRole>('teacher');
  const [dirQuery, setDirQuery] = useState('');
  const [dirMarhala, setDirMarhala] = useState<'all' | QawmiMarhala>('all');
  const [dirFocus, setDirFocus] = useState<'all' | QawmiFocusBranch>('all');
  const [dirStatus, setDirStatus] = useState<'all' | QawmiUserStatus>('all');
  const [dirSource, setDirSource] = useState<'all' | QawmiRegistrationType>('all');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  // Directory overlays: Slide-over Drawer, Edit Academic Modal, Reset Password Modal, Delete Modal
  const [drawerProfile, setDrawerProfile] = useState<QawmiAdminUserProfile | null>(null);
  const [editingProfile, setEditingProfile] = useState<QawmiAdminUserProfile | null>(null);
  const [profileEditName, setProfileEditName] = useState('');
  const [profileEditMarhala, setProfileEditMarhala] = useState<QawmiMarhala>(defaultMarhala);
  const [profileEditFocus, setProfileEditFocus] = useState<QawmiFocusBranch>(defaultFocusBranch);
  const [profileEditSubject, setProfileEditSubject] = useState('');
  const [profileEditError, setProfileEditError] = useState<string | null>(null);

  const [resetTarget, setResetTarget] = useState<QawmiAdminUserProfile | null>(null);
  const [resetPasswordInput, setResetPasswordInput] = useState('');
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetDoneCreds, setResetDoneCreds] = useState<{
    fullName: string;
    email: string;
    password: string;
  } | null>(null);
  const [copiedResetPw, setCopiedResetPw] = useState(false);

  const [deletingProfile, setDeletingProfile] = useState<QawmiAdminUserProfile | null>(null);

  // Manual Registration state
  const [manualRole, setManualRole] = useState<QawmiAdminRole>('student');
  const [manualName, setManualName] = useState('');
  const [manualEmail, setManualEmail] = useState('');
  const [manualTempPassword, setManualTempPassword] = useState('');
  const [showManualPassword, setShowManualPassword] = useState(true);
  const [manualMarhala, setManualMarhala] = useState<QawmiMarhala>(defaultMarhala);
  const [manualFocus, setManualFocus] = useState<QawmiFocusBranch>(defaultFocusBranch);
  const [manualSubject, setManualSubject] = useState('');
  const [manualError, setManualError] = useState<string | null>(null);
  const [createdCredentials, setCreatedCredentials] = useState<{
    profile: QawmiAdminUserProfile;
    temporaryPassword: string;
  } | null>(null);
  const [copiedCreds, setCopiedCreds] = useState(false);

  const menuContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const timer = window.setInterval(() => setNowTs(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const onPointerDown = (e: MouseEvent) => {
      if (menuContainerRef.current && !menuContainerRef.current.contains(e.target as Node)) {
        setOpenMenuId(null);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpenMenuId(null);
        setDrawerProfile(null);
        setEditingPending(null);
        setRejectingPending(null);
        setEditingProfile(null);
        setResetTarget(null);
        setDeletingProfile(null);
      }
    };
    document.addEventListener('mousedown', onPointerDown);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  const bump = () => {
    setRefreshTick((n) => n + 1);
    onDataChanged();
  };

  // Pending Approvals datasets
  const pendingList = useMemo(() => {
    void refreshTick;
    return qawmiAdminService.listPending();
  }, [refreshTick]);

  const pendingTeacherCount = pendingList.filter((p) => p.role === 'teacher').length;
  const pendingStudentCount = pendingList.filter((p) => p.role === 'student').length;

  const visiblePending = useMemo(() => {
    return pendingList
      .filter((p) => p.role === pendingRole)
      .filter((p) => {
        if (pendingRole === 'student' && pendingMarhalaFilter !== 'all') {
          return p.marhala === pendingMarhalaFilter;
        }
        return true;
      });
  }, [pendingList, pendingRole, pendingMarhalaFilter]);

  // Directory datasets
  const allDirectory = useMemo(() => {
    void refreshTick;
    return qawmiAdminService.listDirectory();
  }, [refreshTick]);

  const dirTeacherCount = allDirectory.filter((u) => u.role === 'teacher').length;
  const dirStudentCount = allDirectory.filter((u) => u.role === 'student').length;

  const directoryList = useMemo(() => {
    void refreshTick;
    return qawmiAdminService.listDirectory({
      role: dirRole,
      query: dirQuery,
      marhala: dirMarhala,
      focusBranch: dirFocus,
      status: dirStatus,
      registrationType: dirSource,
    });
  }, [dirRole, dirQuery, dirMarhala, dirFocus, dirStatus, dirSource, refreshTick]);

  const visibleSelectedIds = useMemo(() => {
    const visibleSet = new Set(directoryList.map((u) => u.id));
    return selectedIds.filter((id) => visibleSet.has(id));
  }, [directoryList, selectedIds]);

  const allVisibleSelected =
    directoryList.length > 0 && visibleSelectedIds.length === directoryList.length;

  const hasActiveDirFilters =
    Boolean(dirQuery.trim()) ||
    dirMarhala !== 'all' ||
    dirFocus !== 'all' ||
    dirStatus !== 'all' ||
    dirSource !== 'all';

  const clearAllDirFilters = () => {
    setDirQuery('');
    setDirMarhala('all');
    setDirFocus('all');
    setDirStatus('all');
    setDirSource('all');
  };

  // --- PENDING APPROVAL HANDLERS ---
  const openPendingEdit = (item: QawmiAdminPendingRegistration) => {
    setEditingPending(item);
    setPendingEditName(item.fullName);
    setPendingEditEmail(item.email);
    setPendingEditMarhala(item.marhala);
    setPendingEditFocus(item.focusBranch);
    setPendingEditSubject(item.primarySubject ?? '');
    setPendingEditError(null);
  };

  const handleSavePendingEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPending) return;
    setPendingEditError(null);
    const res = qawmiAdminService.editPending(
      editingPending.id,
      {
        fullName: pendingEditName,
        email: pendingEditEmail,
        marhala: pendingEditMarhala,
        focusBranch: pendingEditFocus,
        primarySubject: editingPending.role === 'teacher' ? pendingEditSubject : undefined,
      },
      adminEmail
    );
    if (!res.ok) {
      setPendingEditError(td(res.error));
      return;
    }
    setEditingPending(null);
    setBanner({
      type: 'success',
      message: dt('Updated pending request for {name}.', '{name}-এর অপেক্ষমাণ আবেদন আপডেট করা হয়েছে।', {
        name: res.item.fullName,
      }),
    });
    bump();
  };

  const handleApprovePending = (item: QawmiAdminPendingRegistration) => {
    const res = qawmiAdminService.approvePending(item.id, adminEmail);
    if (!res.ok) {
      setBanner({ type: 'error', message: td(res.error) });
      return;
    }
    setBanner({
      type: 'success',
      message: dt(
        'Approved {name} — account created as Active (Auto Coupon) and coupon {code} marked used.',
        '{name}-কে অনুমোদন করা হয়েছে — অ্যাকাউন্ট সক্রিয় (অটো কুপন) হিসেবে তৈরি এবং কুপন {code} ব্যবহৃত হিসেবে চিহ্নিত হয়েছে।',
        { name: res.profile.fullName, code: item.couponCode }
      ),
    });
    bump();
  };

  const handleConfirmReject = () => {
    if (!rejectingPending) return;
    const name = rejectingPending.fullName;
    const res = qawmiAdminService.rejectPending(rejectingPending.id, adminEmail);
    setRejectingPending(null);
    if (!res.ok) {
      setBanner({ type: 'error', message: td(res.error) });
      return;
    }
    setBanner({
      type: 'success',
      message: dt(
        'Rejected and removed pending registration for {name}.',
        '{name}-এর অপেক্ষমাণ নিবন্ধন বাতিল ও অপসারণ করা হয়েছে।',
        { name }
      ),
    });
    bump();
  };

  // --- DIRECTORY HANDLERS ---
  const toggleSelectAll = () => {
    if (allVisibleSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(directoryList.map((u) => u.id));
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const openProfileEdit = (user: QawmiAdminUserProfile) => {
    setOpenMenuId(null);
    setEditingProfile(user);
    setProfileEditName(user.fullName);
    setProfileEditMarhala(user.marhala);
    setProfileEditFocus(user.focusBranch);
    setProfileEditSubject(user.primarySubject ?? '');
    setProfileEditError(null);
  };

  const handleSaveProfileEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProfile) return;
    setProfileEditError(null);
    const res = qawmiAdminService.updateUserAcademicInfo(
      editingProfile.id,
      {
        fullName: profileEditName,
        marhala: profileEditMarhala,
        focusBranch: profileEditFocus,
        primarySubject: editingProfile.role === 'teacher' ? profileEditSubject : undefined,
      },
      adminEmail
    );
    if (!res.ok) {
      setProfileEditError(td(res.error));
      return;
    }
    if (drawerProfile?.id === res.profile.id) {
      setDrawerProfile(res.profile);
    }
    setEditingProfile(null);
    setBanner({
      type: 'success',
      message: dt('Updated academic info for {name}.', '{name}-এর একাডেমিক তথ্য আপডেট করা হয়েছে।', {
        name: res.profile.fullName,
      }),
    });
    bump();
  };

  const openResetPasswordModal = (user: QawmiAdminUserProfile) => {
    setOpenMenuId(null);
    setResetTarget(user);
    setResetPasswordInput(generateTemporaryPassword(12));
    setResetError(null);
    setResetDoneCreds(null);
    setCopiedResetPw(false);
  };

  const handleConfirmResetPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetTarget) return;
    setResetError(null);
    const res = qawmiAdminService.resetUserPassword(
      resetTarget.id,
      adminEmail,
      Date.now(),
      resetPasswordInput
    );
    if (!res.ok) {
      setResetError(td(res.error));
      return;
    }
    setResetDoneCreds({
      fullName: resetTarget.fullName,
      email: res.email,
      password: res.temporaryPassword,
    });
    setBanner({
      type: 'success',
      message: dt('Temporary password reset for {name}.', '{name}-এর অস্থায়ী পাসওয়ার্ড রিসেট হয়েছে।', {
        name: resetTarget.fullName,
      }),
    });
    bump();
  };

  const handleCopyResetCreds = async () => {
    if (!resetDoneCreds) return;
    const text = `Email: ${resetDoneCreds.email}\nTemporary Password: ${resetDoneCreds.password}`;
    try {
      await navigator.clipboard?.writeText(text);
    } catch {
      // ignore in restricted environments
    }
    setCopiedResetPw(true);
    window.setTimeout(() => setCopiedResetPw(false), 2000);
  };

  const handleToggleStatus = (user: QawmiAdminUserProfile) => {
    setOpenMenuId(null);
    const res = qawmiAdminService.toggleUserStatus(user.id, adminEmail);
    if (!res.ok) {
      setBanner({ type: 'error', message: td(res.error) });
      return;
    }
    if (drawerProfile?.id === res.profile.id) {
      setDrawerProfile(res.profile);
    }
    setBanner({
      type: 'success',
      message:
        res.profile.status === 'suspended'
          ? dt('Suspended {name}.', '{name}-কে স্থগিত করা হয়েছে।', { name: res.profile.fullName })
          : dt('Reactivated {name}.', '{name}-কে পুনরায় সক্রিয় করা হয়েছে।', {
              name: res.profile.fullName,
            }),
    });
    bump();
  };

  const handleConfirmDeleteProfile = () => {
    if (!deletingProfile) return;
    const targetName = deletingProfile.fullName;
    const targetId = deletingProfile.id;
    const res = qawmiAdminService.deleteUser(targetId, adminEmail);
    setDeletingProfile(null);
    if (!res.ok) {
      setBanner({ type: 'error', message: td(res.error) });
      return;
    }
    if (drawerProfile?.id === targetId) {
      setDrawerProfile(null);
    }
    setSelectedIds((prev) => prev.filter((id) => id !== targetId));
    setBanner({
      type: 'success',
      message: dt(
        'Deleted {name} from Qawmi Madrasa directory.',
        'কওমি মাদ্রাসা ডিরেক্টরি থেকে {name}-কে মুছে ফেলা হয়েছে।',
        { name: targetName }
      ),
    });
    bump();
  };

  const handleBulkStatus = (status: QawmiUserStatus) => {
    if (visibleSelectedIds.length === 0) return;
    const count = qawmiAdminService.bulkUpdateStatus(visibleSelectedIds, status, adminEmail);
    setSelectedIds([]);
    if (count > 0) {
      setBanner({
        type: 'success',
        message: dt(
          'Updated {count} selected account(s) to {status}.',
          'নির্বাচিত {count}টি অ্যাকাউন্ট {status} অবস্থায় আপডেট করা হয়েছে।',
          { count, status: status === 'active' ? td('Active') : td('Suspended') }
        ),
      });
      bump();
    }
  };

  const handleBulkDelete = () => {
    if (visibleSelectedIds.length === 0) return;
    const count = qawmiAdminService.bulkDeleteUsers(visibleSelectedIds, adminEmail);
    setSelectedIds([]);
    if (count > 0) {
      setBanner({
        type: 'success',
        message: dt(
          'Deleted {count} selected account(s) from Qawmi Madrasa directory.',
          'কওমি মাদ্রাসা ডিরেক্টরি থেকে নির্বাচিত {count}টি অ্যাকাউন্ট মুছে ফেলা হয়েছে।',
          { count }
        ),
      });
      bump();
    }
  };

  const handleExportCsv = () => {
    const rowsToExport =
      visibleSelectedIds.length > 0
        ? directoryList.filter((u) => visibleSelectedIds.includes(u.id))
        : directoryList;

    if (rowsToExport.length === 0) {
      setBanner({ type: 'error', message: td('No matching users available to export.') });
      return;
    }
    const csv = qawmiAdminService.exportDirectoryCsv(rowsToExport);
    try {
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `qawmi-madrasa-${dirRole}s-directory.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch {
      // ignore in headless test environments
    }
    setBanner({
      type: 'success',
      message: dt(
        'Exported {count} {role} record(s) to CSV.',
        '{count}টি {role} রেকর্ড CSV হিসেবে রপ্তানি করা হয়েছে।',
        {
          count: rowsToExport.length,
          role: dirRole === 'teacher' ? td('Teacher') : td('Student'),
        }
      ),
    });
  };

  // --- MANUAL REGISTRATION HANDLER ---
  const manualFocusOptions = getFocusBranchesForMarhala(manualMarhala);
  const teacherSubjectSuggestions = getQawmiKitabSuggestions(manualFocus);
  const pendingEditFocusOptions = getFocusBranchesForMarhala(pendingEditMarhala);
  const profileEditFocusOptions = getFocusBranchesForMarhala(profileEditMarhala);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setManualError(null);
    const res = qawmiAdminService.createManualAccount(
      {
        role: manualRole,
        fullName: manualName,
        email: manualEmail,
        temporaryPassword: manualTempPassword,
        marhala: manualMarhala,
        focusBranch: manualFocus,
        primarySubject: manualRole === 'teacher' ? manualSubject : undefined,
      },
      adminEmail
    );
    if (!res.ok) {
      setManualError(td(res.error));
      return;
    }
    setCreatedCredentials({
      profile: res.profile,
      temporaryPassword: res.credentialsSummary.temporaryPassword,
    });
    setCopiedCreds(false);
    setManualName('');
    setManualEmail('');
    setManualTempPassword('');
    setManualSubject('');
    setBanner({
      type: 'success',
      message: dt(
        'Created active {role} account for {name}.',
        '{name}-এর জন্য সক্রিয় {role} অ্যাকাউন্ট তৈরি হয়েছে।',
        {
          role: res.profile.role === 'teacher' ? td('Teacher') : td('Student'),
          name: res.profile.fullName,
        }
      ),
    });
    bump();
  };

  const handleCopyCredentials = async () => {
    if (!createdCredentials) return;
    const lines = [
      'Pathway: Qawmi Madrasa (Bangladesh Madrasa Education)',
      `Role: ${createdCredentials.profile.role === 'teacher' ? 'Teacher' : 'Student'}`,
      `Name: ${createdCredentials.profile.fullName}`,
      `Email: ${createdCredentials.profile.email}`,
      `Marhala: ${createdCredentials.profile.marhala}`,
      `Focus / Branch: ${createdCredentials.profile.focusBranch}`,
    ];
    if (createdCredentials.profile.primarySubject) {
      lines.push(`Primary Subject / Kitab: ${createdCredentials.profile.primarySubject}`);
    }
    lines.push(`Temporary Password: ${createdCredentials.temporaryPassword}`);

    try {
      await navigator.clipboard?.writeText(lines.join('\n'));
    } catch {
      // ignore
    }
    setCopiedCreds(true);
    window.setTimeout(() => setCopiedCreds(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Sub-Tab Header Card */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-5">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              {dt('Qawmi Madrasa Users Management', 'কওমি মাদ্রাসা ব্যবহারকারী ব্যবস্থাপনা')}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {dt(
                'Strictly scoped to {panel} accounts ({marhalas})',
                'শুধুমাত্র {panel} অ্যাকাউন্টের জন্য সীমাবদ্ধ ({marhalas})',
                {
                  panel: panelTitle,
                  marhalas: QAWMI_MARHALAS.map((m) => td(getShortMarhalaLabel(m))).join(' / '),
                }
              )}
            </p>
          </div>

          <div
            role="tablist"
            aria-label={td('Users workspace sub-tabs')}
            className="inline-flex flex-wrap sm:flex-nowrap items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl self-start shrink-0"
          >
            {(
              [
                {
                  id: 'pending' as UsersSubTab,
                  label: `${td('Pending Approvals')} (${formatDigits(pendingList.length)})`,
                },
                { id: 'directory' as UsersSubTab, label: td('User Directory') },
                { id: 'manual' as UsersSubTab, label: td('Manual Registration') },
              ] as const
            ).map((tab) => {
              const active = subTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => {
                    setSubTab(tab.id);
                    setBanner(null);
                  }}
                  className={`px-3.5 py-2 min-h-[38px] text-xs font-semibold rounded-lg transition-colors whitespace-nowrap tabular-nums ${
                    active
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {banner && (
        <div
          role={banner.type === 'error' ? 'alert' : 'status'}
          className={`flex items-center justify-between gap-3 px-4 py-3 rounded-xl border text-sm ${
            banner.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
              : 'bg-red-50 dark:bg-red-950/50 border-red-200 dark:border-red-800 text-red-900 dark:text-red-200'
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            {banner.type === 'success' ? (
              <CheckCircle2
                className="w-4 h-4 text-emerald-700 dark:text-emerald-400 shrink-0"
                aria-hidden="true"
              />
            ) : (
              <AlertCircle
                className="w-4 h-4 text-red-700 dark:text-red-400 shrink-0"
                aria-hidden="true"
              />
            )}
            <span>{banner.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setBanner(null)}
            aria-label={td('Dismiss message')}
            className="p-1 rounded-md opacity-70 hover:opacity-100 shrink-0"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      )}

      {/* ================================================================= */}
      {/* SUB-TAB 1: PENDING APPROVALS                                      */}
      {/* ================================================================= */}
      {subTab === 'pending' && (
        <div className="space-y-5">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div
              role="tablist"
              aria-label={td('Pending role filter')}
              className="inline-flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl self-start"
            >
              <button
                type="button"
                role="tab"
                aria-selected={pendingRole === 'teacher'}
                onClick={() => setPendingRole('teacher')}
                className={`inline-flex items-center gap-2 px-3.5 py-2 min-h-[40px] rounded-lg text-sm font-semibold transition-colors whitespace-nowrap tabular-nums ${
                  pendingRole === 'teacher'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Users className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>
                  {td('Teacher Pending')} ({formatDigits(pendingTeacherCount)})
                </span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={pendingRole === 'student'}
                onClick={() => setPendingRole('student')}
                className={`inline-flex items-center gap-2 px-3.5 py-2 min-h-[40px] rounded-lg text-sm font-semibold transition-colors whitespace-nowrap tabular-nums ${
                  pendingRole === 'student'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <GraduationCap className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>
                  {td('Student Pending')} ({formatDigits(pendingStudentCount)})
                </span>
              </button>
            </div>

            {pendingRole === 'student' && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  {dt('Marhala:', 'মারহালা:')}
                </span>
                <div
                  role="group"
                  aria-label={dt('Student pending marhala filter', 'শিক্ষার্থী অপেক্ষমাণ মারহালা ফিল্টার')}
                  className="inline-flex flex-wrap items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg"
                >
                  {(['all', ...QAWMI_MARHALAS] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setPendingMarhalaFilter(m)}
                      className={`px-3 py-1.5 min-h-[34px] text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                        pendingMarhalaFilter === m
                          ? 'bg-emerald-700 dark:bg-emerald-600 text-white'
                          : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      {m === 'all' ? td('All') : td(getShortMarhalaLabel(m))}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
            {visiblePending.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  {dt(
                    'No pending {role} registrations match the current filter.',
                    'বর্তমান ফিল্টারের সাথে কোনো অপেক্ষমাণ {role} নিবন্ধন মেলেনি।',
                    { role: pendingRole === 'teacher' ? td('Teacher') : td('Student') }
                  )}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {dt(
                    'New Qawmi Madrasa coupon-based sign-ups will appear here automatically.',
                    'নতুন কওমি মাদ্রাসার কুপনভিত্তিক নিবন্ধনসমূহ স্বয়ংক্রিয়ভাবে এখানে দেখা যাবে।'
                  )}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/50 text-xs font-semibold text-slate-600 dark:text-slate-400">
                      <th className="py-3.5 px-5">{td('Applicant')}</th>
                      <th className="py-3.5 px-4 whitespace-nowrap">
                        {pendingRole === 'teacher'
                          ? dt('Marhala & Focus / Kitab', 'মারহালা ও ফোকাস / কিতাব')
                          : dt('Marhala & Focus / Branch', 'মারহালা ও ফোকাস / শাখা')}
                      </th>
                      <th className="py-3.5 px-4 whitespace-nowrap">{td('Coupon Code')}</th>
                      <th className="py-3.5 px-4 whitespace-nowrap">{td('48h Countdown')}</th>
                      <th className="py-3.5 px-5 text-right whitespace-nowrap">{td('Actions')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-sm">
                    {visiblePending.map((item) => {
                      const countdown = formatCountdown(item.expiresAt, nowTs);
                      const urgent = !countdown.expired && item.expiresAt - nowTs < 6 * 60 * 60 * 1000;
                      const academic = formatQawmiAcademicDisplay(item);
                      return (
                        <tr
                          key={item.id}
                          className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                        >
                          <td className="py-3.5 px-5 min-w-[200px] max-w-[260px]">
                            <p className="font-semibold text-slate-900 dark:text-white">
                              {item.fullName}
                            </p>
                            <p
                              title={item.email}
                              className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate"
                            >
                              {item.email}
                            </p>
                          </td>
                          <td className="py-3.5 px-4 max-w-[270px] text-slate-800 dark:text-slate-200">
                            <p className="font-medium leading-snug">{td(academic.marhalaShort)}</p>
                            <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 leading-snug">
                              {td(item.focusBranch)}
                              {item.role === 'teacher' && item.primarySubject?.trim()
                                ? ` · ${item.primarySubject.trim()}`
                                : ''}
                            </p>
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span className="font-mono text-xs font-semibold text-slate-800 dark:text-slate-200 tabular-nums">
                              {item.couponCode}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center gap-1.5 font-mono text-xs font-semibold tabular-nums ${
                                countdown.expired
                                  ? 'text-red-700 dark:text-red-400'
                                  : urgent
                                    ? 'text-amber-700 dark:text-amber-400'
                                    : 'text-emerald-700 dark:text-emerald-400'
                              }`}
                            >
                              <Clock className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                              <span>{countdown.label}</span>
                            </span>
                          </td>
                          <td className="py-3.5 px-5 text-right whitespace-nowrap">
                            <div className="inline-flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => openPendingEdit(item)}
                                aria-label={`${td('Edit')} ${item.fullName}`}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[36px] text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg transition-colors whitespace-nowrap"
                              >
                                <Edit3 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                                <span>{td('Edit')}</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleApprovePending(item)}
                                aria-label={`${td('Approve')} ${item.fullName}`}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[36px] text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 rounded-lg transition-colors whitespace-nowrap"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                                <span>{td('Approve')}</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => setRejectingPending(item)}
                                aria-label={`${td('Reject')} ${item.fullName}`}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[36px] text-xs font-semibold text-red-700 dark:text-red-400 bg-white dark:bg-slate-900 hover:bg-red-50 dark:hover:bg-red-950/50 border border-red-300 dark:border-red-800 rounded-lg transition-colors whitespace-nowrap"
                              >
                                <Trash2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                                <span>{td('Reject')}</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* SUB-TAB 2: USER DIRECTORY                                         */}
      {/* ================================================================= */}
      {subTab === 'directory' && (
        <div className="space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div
              role="tablist"
              aria-label={td('Directory role view')}
              className="inline-flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl self-start"
            >
              <button
                type="button"
                role="tab"
                aria-selected={dirRole === 'teacher'}
                onClick={() => {
                  setDirRole('teacher');
                  setSelectedIds([]);
                }}
                className={`inline-flex items-center gap-2 px-3.5 py-2 min-h-[40px] rounded-lg text-sm font-semibold transition-colors whitespace-nowrap tabular-nums ${
                  dirRole === 'teacher'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Users className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>
                  {td('Teachers Directory')} ({formatDigits(dirTeacherCount)})
                </span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={dirRole === 'student'}
                onClick={() => {
                  setDirRole('student');
                  setSelectedIds([]);
                }}
                className={`inline-flex items-center gap-2 px-3.5 py-2 min-h-[40px] rounded-lg text-sm font-semibold transition-colors whitespace-nowrap tabular-nums ${
                  dirRole === 'student'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <GraduationCap className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>
                  {td('Students Directory')} ({formatDigits(dirStudentCount)})
                </span>
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto">
              {visibleSelectedIds.length > 0 && (
                <div className="inline-flex flex-wrap items-center gap-2">
                  <span className="text-xs font-medium text-slate-600 dark:text-slate-300 tabular-nums">
                    {formatDigits(visibleSelectedIds.length)} {td('selected')}
                    <button
                      type="button"
                      onClick={() => setSelectedIds([])}
                      className="ml-2 text-emerald-700 dark:text-emerald-400 hover:underline font-semibold"
                    >
                      {td('Clear')}
                    </button>
                  </span>
                  <button
                    type="button"
                    onClick={() => handleBulkStatus('active')}
                    className="px-2.5 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-white dark:bg-slate-900 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 rounded-lg transition-colors"
                  >
                    {td('Activate')}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleBulkStatus('suspended')}
                    className="px-2.5 py-1.5 text-xs font-semibold text-amber-700 dark:text-amber-300 bg-white dark:bg-slate-900 hover:bg-amber-50 dark:hover:bg-amber-950/60 border border-amber-200 dark:border-amber-800 rounded-lg transition-colors"
                  >
                    {td('Suspend')}
                  </button>
                  <button
                    type="button"
                    onClick={handleBulkDelete}
                    className="px-2.5 py-1.5 text-xs font-semibold text-red-700 dark:text-red-400 bg-white dark:bg-slate-900 hover:bg-red-50 dark:hover:bg-red-950/60 border border-red-200 dark:border-red-800 rounded-lg transition-colors"
                  >
                    {td('Delete')}
                  </button>
                </div>
              )}
              <button
                type="button"
                onClick={handleExportCsv}
                className="inline-flex items-center gap-2 px-4 py-2 min-h-[40px] text-xs font-semibold text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg transition-colors whitespace-nowrap"
              >
                <Download className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>
                  {visibleSelectedIds.length > 0
                    ? `${td('Export CSV')} (${formatDigits(visibleSelectedIds.length)})`
                    : td('Export CSV')}
                </span>
              </button>
            </div>
          </div>

          {/* Search & Qawmi Madrasa Filters Bar */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
              <div className="md:col-span-4 relative">
                <label htmlFor="qawmi-directory-search" className="sr-only">
                  {dt(
                    'Search directory by name, email, kitab, or User ID',
                    'নাম, ইমেইল, কিতাব বা ইউজার আইডি দিয়ে ডিরেক্টরি খুঁজুন'
                  )}
                </label>
                <Search
                  className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                  aria-hidden="true"
                />
                <input
                  id="qawmi-directory-search"
                  type="text"
                  value={dirQuery}
                  onChange={(e) => setDirQuery(e.target.value)}
                  placeholder={dt(
                    'Search name, email, kitab, or User ID...',
                    'নাম, ইমেইল, কিতাব বা ইউজার আইডি খুঁজুন...'
                  )}
                  className="w-full pl-9 pr-8 py-2 min-h-[40px] bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
                {dirQuery && (
                  <button
                    type="button"
                    onClick={() => setDirQuery('')}
                    aria-label={td('Clear search')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded"
                  >
                    <X className="w-3.5 h-3.5" aria-hidden="true" />
                  </button>
                )}
              </div>

              <div className="md:col-span-2">
                <label htmlFor="qawmi-directory-marhala-filter" className="sr-only">
                  {dt('Filter by Marhala', 'মারহালা অনুযায়ী ফিল্টার করুন')}
                </label>
                <select
                  id="qawmi-directory-marhala-filter"
                  value={dirMarhala}
                  onChange={(e) => setDirMarhala(e.target.value as 'all' | QawmiMarhala)}
                  className="w-full px-3 py-2 min-h-[40px] bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                >
                  <option value="all">{dt('All Marhalas', 'সব মারহালা')}</option>
                  {QAWMI_MARHALAS.map((m) => (
                    <option key={m} value={m}>
                      {td(getDirectoryFilterMarhalaLabel(m))}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2">
                <label htmlFor="qawmi-directory-focus-filter" className="sr-only">
                  {dt('Filter by Focus / Branch', 'ফোকাস / শাখা অনুযায়ী ফিল্টার করুন')}
                </label>
                <select
                  id="qawmi-directory-focus-filter"
                  value={dirFocus}
                  onChange={(e) => setDirFocus(e.target.value as 'all' | QawmiFocusBranch)}
                  className="w-full px-3 py-2 min-h-[40px] bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                >
                  <option value="all">{dt('All Focus / Branches', 'সব ফোকাস / শাখা')}</option>
                  {QAWMI_FOCUS_BRANCHES.map((branch) => (
                    <option key={branch} value={branch}>
                      {td(branch)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2">
                <label htmlFor="qawmi-directory-status-filter" className="sr-only">
                  {td('Filter by status')}
                </label>
                <select
                  id="qawmi-directory-status-filter"
                  value={dirStatus}
                  onChange={(e) => setDirStatus(e.target.value as 'all' | QawmiUserStatus)}
                  className="w-full px-3 py-2 min-h-[40px] bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                >
                  <option value="all">{td('All Status')}</option>
                  <option value="active">{td('Active')}</option>
                  <option value="suspended">{td('Suspended')}</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label htmlFor="qawmi-directory-source-filter" className="sr-only">
                  {td('Filter by entry source')}
                </label>
                <select
                  id="qawmi-directory-source-filter"
                  value={dirSource}
                  onChange={(e) => setDirSource(e.target.value as 'all' | QawmiRegistrationType)}
                  className="w-full px-3 py-2 min-h-[40px] bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                >
                  <option value="all">{td('All Sources')}</option>
                  <option value="coupon_auto">{td('Auto Coupon')}</option>
                  <option value="manual_admin">{td('Manual')}</option>
                </select>
              </div>
            </div>

            {hasActiveDirFilters && (
              <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                <span className="text-slate-500 dark:text-slate-400 tabular-nums">
                  {dt(
                    'Showing {count} matching {role} account(s)',
                    'মিলে যাওয়া {count}টি {role} অ্যাকাউন্ট দেখানো হচ্ছে',
                    {
                      count: directoryList.length,
                      role: dirRole === 'teacher' ? td('Teacher') : td('Student'),
                    }
                  )}
                </span>
                <button
                  type="button"
                  onClick={clearAllDirFilters}
                  className="font-semibold text-emerald-700 dark:text-emerald-400 hover:underline"
                >
                  {td('Reset filters')}
                </button>
              </div>
            )}
          </div>

          {/* Master Directory Table with ⋮ Row Action Menu */}
          <div
            ref={menuContainerRef}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-visible"
          >
            {directoryList.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  {dt(
                    'No Qawmi Madrasa {role} accounts found matching your current search and filters.',
                    'আপনার বর্তমান অনুসন্ধান ও ফিল্টারের সাথে কোনো কওমি মাদ্রাসার {role} অ্যাকাউন্ট পাওয়া যায়নি।',
                    { role: dirRole === 'teacher' ? td('Teacher') : td('Student') }
                  )}
                </p>
                {hasActiveDirFilters && (
                  <button
                    type="button"
                    onClick={clearAllDirFilters}
                    className="mt-3 px-4 py-2 text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 rounded-lg"
                  >
                    {td('Clear All Filters')}
                  </button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto lg:overflow-visible">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/50 text-xs font-semibold text-slate-600 dark:text-slate-400">
                      <th className="py-3.5 pl-4 pr-2 w-10">
                        <input
                          type="checkbox"
                          checked={allVisibleSelected}
                          onChange={toggleSelectAll}
                          aria-label={td('Select all visible users')}
                          className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 accent-emerald-700 cursor-pointer"
                        />
                      </th>
                      <th className="py-3.5 px-3">{td('User Info')}</th>
                      <th className="py-3.5 px-3 whitespace-nowrap">
                        {dirRole === 'teacher'
                          ? dt('Marhala • Focus & Subject', 'মারহালা • ফোকাস ও বিষয়')
                          : dt('Marhala & Focus / Branch', 'মারহালা ও ফোকাস / শাখা')}
                      </th>
                      <th className="py-3.5 px-3 whitespace-nowrap">{td('Entry Source')}</th>
                      <th className="py-3.5 px-3 whitespace-nowrap">{td('Status')}</th>
                      <th className="py-3.5 px-3 whitespace-nowrap">{td('Joined Date')}</th>
                      <th className="py-3.5 pr-4 pl-2 text-right whitespace-nowrap">
                        {td('Actions')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-sm">
                    {directoryList.map((profile, idx) => {
                      const isChecked = visibleSelectedIds.includes(profile.id);
                      const openUpward =
                        idx >= directoryList.length - 2 && directoryList.length > 3;
                      const academic = formatQawmiAcademicDisplay(profile);
                      return (
                        <tr
                          key={profile.id}
                          className={`transition-colors ${
                            isChecked
                              ? 'bg-emerald-50/50 dark:bg-emerald-950/20'
                              : 'hover:bg-slate-50/70 dark:hover:bg-slate-800/40'
                          }`}
                        >
                          <td className="py-3.5 pl-4 pr-2">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => toggleSelectOne(profile.id)}
                              aria-label={`${td('Select')} ${profile.fullName}`}
                              className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 accent-emerald-700 cursor-pointer"
                            />
                          </td>
                          <td className="py-3.5 px-3 max-w-[260px]">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div
                                aria-hidden="true"
                                className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center justify-center shrink-0"
                              >
                                {getQawmiUserInitials(profile.fullName)}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="font-semibold text-slate-900 dark:text-white truncate">
                                  {profile.fullName}
                                </p>
                                <p
                                  title={`${profile.email} · ${profile.id}`}
                                  className="text-xs text-slate-500 dark:text-slate-400 truncate"
                                >
                                  {profile.email} ·{' '}
                                  <span className="font-mono tabular-nums">{profile.id}</span>
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="py-3.5 px-3 max-w-[260px] text-slate-800 dark:text-slate-200 text-xs xl:text-sm">
                            <p className="font-medium leading-snug">{td(academic.marhalaShort)}</p>
                            <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 leading-snug">
                              {td(profile.focusBranch)}
                              {profile.role === 'teacher' && profile.primarySubject?.trim()
                                ? ` · ${profile.primarySubject.trim()}`
                                : ''}
                            </p>
                          </td>
                          <td className="py-3.5 px-3 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold ${
                                profile.registrationType === 'coupon_auto'
                                  ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                              }`}
                            >
                              {profile.registrationType === 'coupon_auto'
                                ? td('Auto Coupon')
                                : td('Manual')}
                            </span>
                          </td>
                          <td className="py-3.5 px-3 whitespace-nowrap">
                            {profile.status === 'active' ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800">
                                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                                <span>{td('Active')}</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800">
                                <Ban className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                                <span>{td('Suspended')}</span>
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-3 whitespace-nowrap text-xs text-slate-600 dark:text-slate-400 tabular-nums">
                            {formatDate(profile.joinedAt)}
                          </td>
                          <td className="py-3.5 pr-4 pl-2 text-right whitespace-nowrap relative">
                            <button
                              type="button"
                              onClick={() =>
                                setOpenMenuId((prev) => (prev === profile.id ? null : profile.id))
                              }
                              aria-label={`${td('Actions')} ${profile.fullName}`}
                              aria-expanded={openMenuId === profile.id}
                              aria-haspopup="menu"
                              className="w-9 h-9 inline-flex items-center justify-center rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition-colors"
                            >
                              <MoreVertical className="w-4 h-4" aria-hidden="true" />
                            </button>

                            {openMenuId === profile.id && (
                              <div
                                role="menu"
                                className={`absolute right-4 ${
                                  openUpward ? 'bottom-12' : 'top-12'
                                } z-30 w-52 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg py-1.5 text-left`}
                              >
                                <button
                                  type="button"
                                  role="menuitem"
                                  onClick={() => {
                                    setOpenMenuId(null);
                                    setDrawerProfile(profile);
                                  }}
                                  className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                                >
                                  <Eye className="w-3.5 h-3.5 text-slate-500" aria-hidden="true" />
                                  <span>{td('View Full Profile')}</span>
                                </button>
                                <button
                                  type="button"
                                  role="menuitem"
                                  onClick={() => openProfileEdit(profile)}
                                  className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                                >
                                  <Edit3
                                    className="w-3.5 h-3.5 text-slate-500"
                                    aria-hidden="true"
                                  />
                                  <span>{td('Edit Academic Info')}</span>
                                </button>
                                <button
                                  type="button"
                                  role="menuitem"
                                  onClick={() => openResetPasswordModal(profile)}
                                  className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                                >
                                  <KeyRound
                                    className="w-3.5 h-3.5 text-slate-500"
                                    aria-hidden="true"
                                  />
                                  <span>{td('Reset Password')}</span>
                                </button>
                                <button
                                  type="button"
                                  role="menuitem"
                                  onClick={() => handleToggleStatus(profile)}
                                  className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                                >
                                  {profile.status === 'active' ? (
                                    <>
                                      <Ban
                                        className="w-3.5 h-3.5 text-amber-600"
                                        aria-hidden="true"
                                      />
                                      <span>{td('Suspend Account')}</span>
                                    </>
                                  ) : (
                                    <>
                                      <UserCheck
                                        className="w-3.5 h-3.5 text-emerald-600"
                                        aria-hidden="true"
                                      />
                                      <span>{td('Activate Account')}</span>
                                    </>
                                  )}
                                </button>
                                <div className="my-1 border-t border-slate-100 dark:border-slate-800" />
                                <button
                                  type="button"
                                  role="menuitem"
                                  onClick={() => {
                                    setOpenMenuId(null);
                                    setDeletingProfile(profile);
                                  }}
                                  className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50"
                                >
                                  <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                                  <span>{td('Delete User')}</span>
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* SUB-TAB 3: MANUAL REGISTRATION                                    */}
      {/* ================================================================= */}
      {subTab === 'manual' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Direct Account Creation Form */}
          <section className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-5 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {dt('Direct Account Creation', 'সরাসরি অ্যাকাউন্ট তৈরি')}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {dt(
                    'Immediately creates an active account (bypasses pending approval queue).',
                    'সরাসরি সক্রিয় অ্যাকাউন্ট তৈরি করে (অপেক্ষমাণ অনুমোদন সারি এড়িয়ে যায়)।'
                  )}
                </p>
              </div>
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 px-3 py-1 rounded-lg">
                <ShieldCheck className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                <span>{panelTitle}</span>
              </span>
            </div>

            <form onSubmit={handleManualSubmit} className="mt-5 space-y-5" noValidate>
              {manualError && (
                <div
                  role="alert"
                  className="flex items-start gap-2.5 p-3.5 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-red-900 dark:text-red-200 text-sm"
                >
                  <AlertCircle
                    className="w-4 h-4 text-red-700 dark:text-red-400 shrink-0 mt-0.5"
                    aria-hidden="true"
                  />
                  <span>{td(manualError)}</span>
                </div>
              )}

              {/* Role Selector Radio Cards */}
              <fieldset>
                <legend className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  {dt('Select Account Role', 'অ্যাকাউন্টের ভূমিকা নির্বাচন করুন')}
                </legend>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label
                    className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-colors ${
                      manualRole === 'teacher'
                        ? 'bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-600 dark:border-emerald-500'
                        : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="qawmi-manual-role"
                      value="teacher"
                      checked={manualRole === 'teacher'}
                      onChange={() => {
                        setManualRole('teacher');
                        setManualSubject('');
                      }}
                      className="mt-1 accent-emerald-700"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 text-sm font-semibold text-slate-900 dark:text-white">
                        <Users
                          className="w-4 h-4 text-emerald-700 dark:text-emerald-400"
                          aria-hidden="true"
                        />
                        <span>{td('Teacher')}</span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {dt(
                          'Assigned directly to Qawmi Madrasa teachers directory',
                          'সরাসরি কওমি মাদ্রাসা শিক্ষক ডিরেক্টরিতে যুক্ত হবে'
                        )}
                      </p>
                    </div>
                  </label>

                  <label
                    className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-colors ${
                      manualRole === 'student'
                        ? 'bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-600 dark:border-emerald-500'
                        : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="qawmi-manual-role"
                      value="student"
                      checked={manualRole === 'student'}
                      onChange={() => {
                        setManualRole('student');
                        setManualSubject('');
                      }}
                      className="mt-1 accent-emerald-700"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 text-sm font-semibold text-slate-900 dark:text-white">
                        <GraduationCap
                          className="w-4 h-4 text-emerald-700 dark:text-emerald-400"
                          aria-hidden="true"
                        />
                        <span>{td('Student')}</span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {dt(
                          'Assigned directly to Qawmi Madrasa students directory',
                          'সরাসরি কওমি মাদ্রাসা শিক্ষার্থী ডিরেক্টরিতে যুক্ত হবে'
                        )}
                      </p>
                    </div>
                  </label>
                </div>
              </fieldset>

              {/* Full Name & Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="qawmi-manual-name"
                    className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
                  >
                    {td('Full Name')} <span className="text-red-600">*</span>
                  </label>
                  <input
                    id="qawmi-manual-name"
                    type="text"
                    required
                    value={manualName}
                    onChange={(e) => setManualName(e.target.value)}
                    placeholder={
                      manualRole === 'teacher'
                        ? dt('e.g. Maulana Khalilur Rahman', 'যেমন: মাওলানা খলিলুর রহমান')
                        : dt('e.g. Muhammad Zubair', 'যেমন: মুহাম্মদ জুবায়ের')
                    }
                    className="w-full px-3.5 py-2.5 min-h-[44px] bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>

                <div>
                  <label
                    htmlFor="qawmi-manual-email"
                    className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
                  >
                    {td('Email Address')} <span className="text-red-600">*</span>
                  </label>
                  <input
                    id="qawmi-manual-email"
                    type="email"
                    required
                    value={manualEmail}
                    onChange={(e) => setManualEmail(e.target.value)}
                    placeholder={
                      manualRole === 'teacher'
                        ? 'name@qawmi-madrasa.edu.bd'
                        : 'name@qawmi-student.edu.bd'
                    }
                    className="w-full px-3.5 py-2.5 min-h-[44px] bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>
              </div>

              {/* Temporary Password with Generator & Show/Hide Toggle */}
              <div>
                <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                  <label
                    htmlFor="qawmi-manual-password"
                    className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
                  >
                    {td('Temporary Password')} <span className="text-red-600">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setManualTempPassword(generateTemporaryPassword(12));
                      setShowManualPassword(true);
                    }}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:underline"
                  >
                    <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>{dt('Generate Random Password', 'এলোমেলো পাসওয়ার্ড তৈরি করুন')}</span>
                  </button>
                </div>
                <div className="relative">
                  <input
                    id="qawmi-manual-password"
                    type={showManualPassword ? 'text' : 'password'}
                    required
                    value={manualTempPassword}
                    onChange={(e) => setManualTempPassword(e.target.value)}
                    placeholder={dt('Minimum 8 characters', 'ন্যূনতম ৮ অক্ষর')}
                    className="w-full pl-3.5 pr-11 py-2.5 min-h-[44px] bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-sm font-mono text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                  <button
                    type="button"
                    onClick={() => setShowManualPassword((prev) => !prev)}
                    aria-label={
                      showManualPassword
                        ? dt('Hide password', 'পাসওয়ার্ড লুকান')
                        : dt('Show password', 'পাসওয়ার্ড দেখান')
                    }
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 rounded-md"
                  >
                    {showManualPassword ? (
                      <EyeOff className="w-4 h-4" aria-hidden="true" />
                    ) : (
                      <Eye className="w-4 h-4" aria-hidden="true" />
                    )}
                  </button>
                </div>
              </div>

              {/* Marhala & Focus / Branch */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="qawmi-manual-marhala"
                    className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
                  >
                    {dt('Marhala / Stage', 'মারহালা / স্তর')}
                  </label>
                  <select
                    id="qawmi-manual-marhala"
                    value={manualMarhala}
                    onChange={(e) => setManualMarhala(e.target.value as QawmiMarhala)}
                    className="w-full px-3.5 py-2.5 min-h-[44px] bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  >
                    {QAWMI_MARHALAS.map((m) => (
                      <option key={m} value={m}>
                        {td(m)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="qawmi-manual-focus"
                    className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
                  >
                    {dt('Focus / Branch', 'শাখা / ফোকাস')} <span className="text-red-600">*</span>
                  </label>
                  <select
                    id="qawmi-manual-focus"
                    value={manualFocus}
                    onChange={(e) => setManualFocus(e.target.value as QawmiFocusBranch)}
                    className="w-full px-3.5 py-2.5 min-h-[44px] bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  >
                    {manualFocusOptions.map((branch) => (
                      <option key={branch} value={branch}>
                        {td(branch)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Primary Subject / Kitab (Shown only for Teachers) */}
              {manualRole === 'teacher' && (
                <div>
                  <label
                    htmlFor="qawmi-manual-subject"
                    className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
                  >
                    {dt('Primary Subject / Kitab', 'মূল বিষয় / কিতাব')}{' '}
                    <span className="text-red-600">*</span>
                  </label>
                  <input
                    id="qawmi-manual-subject"
                    type="text"
                    required
                    list="qawmi-kitab-suggestions"
                    value={manualSubject}
                    onChange={(e) => setManualSubject(e.target.value)}
                    placeholder={dt('e.g. {subject}', 'যেমন: {subject}', {
                      subject: teacherSubjectSuggestions[0],
                    })}
                    className="w-full px-3.5 py-2.5 min-h-[44px] bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                  <datalist id="qawmi-kitab-suggestions">
                    {teacherSubjectSuggestions.map((s) => (
                      <option key={s} value={s} />
                    ))}
                  </datalist>
                </div>
              )}

              <div className="pt-1">
                <button
                  type="submit"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 min-h-[46px] bg-emerald-700 hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white text-sm font-semibold rounded-lg transition-colors whitespace-nowrap"
                >
                  <UserPlus className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span>{dt('Create Account', 'অ্যাকাউন্ট তৈরি করুন')}</span>
                </button>
              </div>
            </form>
          </section>

          {/* Right Column: Credentials Summary Card (on success) or Manual Account Provisioning Rules */}
          <aside className="lg:col-span-5">
            {createdCredentials ? (
              <div
                role="status"
                data-testid="qawmi-credentials-summary"
                className="bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-700 rounded-2xl p-6 space-y-5"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center shrink-0">
                    <CheckCircle2
                      className="w-5 h-5 text-emerald-700 dark:text-emerald-400"
                      aria-hidden="true"
                    />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      {dt('Credentials Summary', 'লগইন তথ্যের সারসংক্ষেপ')}
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                      {dt(
                        'Account created as Active (Qawmi Madrasa · Manual). Share these credentials with the user.',
                        'অ্যাকাউন্টটি সক্রিয় হিসেবে তৈরি হয়েছে (কওমি মাদ্রাসা · ম্যানুয়াল)। এই লগইন তথ্য ব্যবহারকারীর সাথে শেয়ার করুন।'
                      )}
                    </p>
                  </div>
                </div>

                <dl className="divide-y divide-slate-200 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl text-sm">
                  <SummaryRow label={td('Full Name')} value={createdCredentials.profile.fullName} />
                  <SummaryRow
                    label={td('Role')}
                    value={
                      createdCredentials.profile.role === 'teacher'
                        ? td('Teacher')
                        : td('Student')
                    }
                  />
                  <SummaryRow
                    label={td('Marhala')}
                    value={td(createdCredentials.profile.marhala)}
                  />
                  <SummaryRow
                    label={td('Focus Branch')}
                    value={td(createdCredentials.profile.focusBranch)}
                  />
                  {createdCredentials.profile.primarySubject && (
                    <SummaryRow
                      label={dt('Primary Subject / Kitab', 'মূল বিষয় / কিতাব')}
                      value={createdCredentials.profile.primarySubject}
                    />
                  )}
                  <SummaryRow label={td('Email')} value={createdCredentials.profile.email} mono />
                  <SummaryRow
                    label={td('Temporary Password')}
                    value={createdCredentials.temporaryPassword}
                    mono
                  />
                </dl>

                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    type="button"
                    onClick={handleCopyCredentials}
                    className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 min-h-[44px] bg-emerald-700 hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white text-sm font-semibold rounded-lg transition-colors whitespace-nowrap"
                  >
                    {copiedCreds ? (
                      <>
                        <Check className="w-4 h-4" aria-hidden="true" />
                        <span>{dt('Copied Credentials', 'তথ্য কপি হয়েছে')}</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" aria-hidden="true" />
                        <span>{dt('Copy Credentials', 'লগইন তথ্য কপি করুন')}</span>
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDirRole(createdCredentials.profile.role);
                      setSubTab('directory');
                    }}
                    className="px-4 py-2.5 min-h-[44px] bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 text-sm font-semibold rounded-lg transition-colors whitespace-nowrap"
                  >
                    {dt('Open Directory', 'ডিরেক্টরি খুলুন')}
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-4">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  {dt('Manual Account Provisioning Rules', 'ম্যানুয়াল অ্যাকাউন্ট তৈরির নিয়মাবলি')}
                </h3>
                <ul className="space-y-2.5 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  <li>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {dt('Pathway Isolation:', 'পাথওয়ে সীমাবদ্ধতা:')}
                    </span>{' '}
                    {dt(
                      'Accounts created here are automatically locked to {panel} under Bangladesh Madrasa Education.',
                      'এখানে তৈরি অ্যাকাউন্টগুলো বাংলাদেশ মাদ্রাসা শিক্ষার অধীনে স্বয়ংক্রিয়ভাবে {panel}-এর জন্য নির্ধারিত থাকবে।',
                      { panel: panelTitle }
                    )}
                  </li>
                  <li>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {dt('Immediate Activation:', 'তাৎক্ষণিক সক্রিয়তা:')}
                    </span>{' '}
                    {dt(
                      'Entry source is tagged as Manual and status is set to Active immediately without waiting in Pending Approvals.',
                      'উৎস হিসেবে ম্যানুয়াল যুক্ত হয় এবং অপেক্ষমাণ অনুমোদনের সারি ছাড়াই অ্যাকাউন্ট সরাসরি সক্রিয় হয়।'
                    )}
                  </li>
                  <li>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {dt(
                        'Dars-e-Nizami Marhalas & Branches:',
                        'দরসে নিজামী মারহালা ও শাখাসমূহ:'
                      )}
                    </span>{' '}
                    {dt(
                      'Assign learners and Asatizah across Maktab / Hifz, Ibtidaiyyah, Mutawassitah, Sanawiyyah Ulya, Fazilat, and Takmil with specialization in General / Kitab, Hifzul Quran, Tajweed & Qiraat, Hadith & Tafsir, Fiqh & Usul, or Arabic & Adab.',
                      'মক্তব / হিফজ, ইবতিদাইয়্যাহ, মুতাওয়াসসিতাহ, সানাবিয়্যাহ উলইয়া, ফযিলত ও তাকমিল মারহালায় সাধারণ / কিতাব, হিফজুল কুরআন, তাজবিদ ও ক্বিরাত, হাদিস ও তাফসির, ফিকহ ও উসুল কিংবা আরবি ও আদব শাখায় শিক্ষার্থী ও আসাতিযা নির্ধারণ করুন।'
                    )}
                  </li>
                  <li>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {dt('Credential Handover:', 'লগইন তথ্য হস্তান্তর:')}
                    </span>{' '}
                    {dt(
                      'Once created, a one-click Credentials Summary Card will appear right here so you can copy and share login details immediately.',
                      'তৈরির পরপরই এখানে এক-ক্লিকে লগইন তথ্যের কার্ড দেখা যাবে, যা কপি করে দ্রুত হস্তান্তর করা যাবে।'
                    )}
                  </li>
                </ul>
              </div>
            )}
          </aside>
        </div>
      )}

      {/* ================================================================= */}
      {/* MODAL: Edit Pending Applicant                                     */}
      {/* ================================================================= */}
      {editingPending && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-[2px]"
          onClick={(e) => {
            if (e.target === e.currentTarget) setEditingPending(null);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="qawmi-edit-pending-title"
            className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl overflow-hidden"
          >
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
              <div>
                <h3
                  id="qawmi-edit-pending-title"
                  className="text-base font-bold text-slate-900 dark:text-white"
                >
                  {dt('Edit Pending Applicant', 'অপেক্ষমাণ আবেদনকারীর তথ্য সম্পাদনা')}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {editingPending.email} · {editingPending.couponCode}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingPending(null)}
                aria-label={dt('Close modal', 'মোডাল বন্ধ করুন')}
                className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>

            <form onSubmit={handleSavePendingEdit} className="p-6 space-y-4">
              {pendingEditError && (
                <div
                  role="alert"
                  className="flex items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-xs text-red-800 dark:text-red-200"
                >
                  <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span>{td(pendingEditError)}</span>
                </div>
              )}

              <div>
                <label
                  htmlFor="qawmi-pending-edit-name"
                  className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
                >
                  {td('Full Name')}
                </label>
                <input
                  id="qawmi-pending-edit-name"
                  type="text"
                  value={pendingEditName}
                  onChange={(e) => setPendingEditName(e.target.value)}
                  className="w-full px-3.5 py-2.5 min-h-[42px] bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>

              <div>
                <label
                  htmlFor="qawmi-pending-edit-email"
                  className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
                >
                  {td('Email Address')}
                </label>
                <input
                  id="qawmi-pending-edit-email"
                  type="email"
                  value={pendingEditEmail}
                  onChange={(e) => setPendingEditEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 min-h-[42px] bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>

              <div>
                <label
                  htmlFor="qawmi-pending-edit-marhala"
                  className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
                >
                  {dt('Marhala / Stage', 'মারহালা / স্তর')}
                </label>
                <select
                  id="qawmi-pending-edit-marhala"
                  value={pendingEditMarhala}
                  onChange={(e) => setPendingEditMarhala(e.target.value as QawmiMarhala)}
                  className="w-full px-3.5 py-2.5 min-h-[42px] bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                >
                  {QAWMI_MARHALAS.map((m) => (
                    <option key={m} value={m}>
                      {td(m)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="qawmi-pending-edit-focus"
                  className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
                >
                  {dt('Focus / Branch', 'শাখা / ফোকাস')}
                </label>
                <select
                  id="qawmi-pending-edit-focus"
                  value={pendingEditFocus}
                  onChange={(e) => setPendingEditFocus(e.target.value as QawmiFocusBranch)}
                  className="w-full px-3.5 py-2.5 min-h-[42px] bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                >
                  {pendingEditFocusOptions.map((branch) => (
                    <option key={branch} value={branch}>
                      {td(branch)}
                    </option>
                  ))}
                </select>
              </div>

              {editingPending.role === 'teacher' && (
                <div>
                  <label
                    htmlFor="qawmi-pending-edit-subject"
                    className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
                  >
                    {dt('Primary Subject / Kitab', 'মূল বিষয় / কিতাব')}
                  </label>
                  <input
                    id="qawmi-pending-edit-subject"
                    type="text"
                    value={pendingEditSubject}
                    onChange={(e) => setPendingEditSubject(e.target.value)}
                    className="w-full px-3.5 py-2.5 min-h-[42px] bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>
              )}

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingPending(null)}
                  className="px-4 py-2 min-h-[40px] text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg"
                >
                  {td('Cancel')}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 min-h-[40px] text-sm font-semibold text-white bg-emerald-700 hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 rounded-lg"
                >
                  {td('Save Changes')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* MODAL: Reject Pending Confirmation                                */}
      {/* ================================================================= */}
      {rejectingPending && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-[2px]"
          onClick={(e) => {
            if (e.target === e.currentTarget) setRejectingPending(null);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="qawmi-reject-pending-title"
            className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl p-6 space-y-4"
          >
            <div>
              <h3
                id="qawmi-reject-pending-title"
                className="text-base font-bold text-slate-900 dark:text-white"
              >
                {dt('Reject Pending Registration?', 'অপেক্ষমাণ নিবন্ধন বাতিল করবেন?')}
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1.5">
                {dt(
                  'This will permanently remove the pending application for {name} ({email}). No account will be created.',
                  'এটি {name} ({email})-এর অপেক্ষমাণ আবেদন স্থায়ীভাবে মুছে ফেলবে। কোনো অ্যাকাউন্ট তৈরি করা হবে না।',
                  { name: rejectingPending.fullName, email: rejectingPending.email }
                )}
              </p>
            </div>
            <div className="flex items-center justify-end gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setRejectingPending(null)}
                className="px-4 py-2 min-h-[40px] text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg"
              >
                {td('Cancel')}
              </button>
              <button
                type="button"
                onClick={handleConfirmReject}
                className="px-4 py-2 min-h-[40px] text-sm font-semibold text-white bg-red-700 hover:bg-red-800 rounded-lg"
              >
                {dt('Confirm Reject', 'বাতিল নিশ্চিত করুন')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* DRAWER: View Full Profile Slide-Over                              */}
      {/* ================================================================= */}
      {drawerProfile && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-slate-950/50 backdrop-blur-[2px]"
          onClick={(e) => {
            if (e.target === e.currentTarget) setDrawerProfile(null);
          }}
        >
          <aside
            role="dialog"
            aria-modal="true"
            aria-labelledby="qawmi-profile-drawer-title"
            className="w-full max-w-md bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 h-full flex flex-col shadow-2xl"
          >
            <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-11 h-11 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 font-bold text-sm flex items-center justify-center shrink-0">
                  {getQawmiUserInitials(drawerProfile.fullName)}
                </div>
                <div className="min-w-0">
                  <h3
                    id="qawmi-profile-drawer-title"
                    className="text-base font-bold text-slate-900 dark:text-white truncate"
                  >
                    {drawerProfile.fullName}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                    {drawerProfile.email}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDrawerProfile(null)}
                aria-label={dt('Close profile drawer', 'প্রোফাইল ড্রয়ার বন্ধ করুন')}
                className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 shrink-0"
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <dl className="divide-y divide-slate-200 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl text-sm">
                <SummaryRow label={dt('User ID', 'ব্যবহারকারী আইডি')} value={drawerProfile.id} mono />
                <SummaryRow
                  label={td('Role')}
                  value={drawerProfile.role === 'teacher' ? td('Teacher') : td('Student')}
                />
                <SummaryRow
                  label={dt('Pathway', 'পাথওয়ে')}
                  value={dt(
                    'Qawmi Madrasa (Bangladesh Madrasa Education)',
                    'কওমি মাদ্রাসা (বাংলাদেশ মাদ্রাসা শিক্ষা)'
                  )}
                />
                <SummaryRow label={td('Marhala')} value={td(drawerProfile.marhala)} />
                <SummaryRow label={td('Focus Branch')} value={td(drawerProfile.focusBranch)} />
                {drawerProfile.primarySubject && (
                  <SummaryRow
                    label={dt('Primary Subject / Kitab', 'মূল বিষয় / কিতাব')}
                    value={drawerProfile.primarySubject}
                  />
                )}
                <SummaryRow
                  label={dt('Entry Source', 'নিবন্ধনের উৎস')}
                  value={
                    drawerProfile.registrationType === 'coupon_auto'
                      ? dt('Auto Coupon', 'অটো কুপন')
                      : dt('Manual', 'ম্যানুয়াল')
                  }
                />
                {drawerProfile.couponCode && (
                  <SummaryRow
                    label={dt('Coupon Code', 'কুপন কোড')}
                    value={drawerProfile.couponCode}
                    mono
                  />
                )}
                <SummaryRow
                  label={td('Status')}
                  value={drawerProfile.status === 'active' ? td('Active') : td('Suspended')}
                />
                <SummaryRow
                  label={dt('Joined Date', 'যোগদানের তারিখ')}
                  value={formatDateTime(drawerProfile.joinedAt, {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  })}
                />
                <SummaryRow
                  label={dt('Last Updated', 'সর্বশেষ হালনাগাদ')}
                  value={formatDateTime(drawerProfile.updatedAt ?? drawerProfile.joinedAt, {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  })}
                />
              </dl>

              <div className="flex flex-wrap gap-2.5">
                <button
                  type="button"
                  onClick={() => openProfileEdit(drawerProfile)}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 min-h-[42px] text-xs font-semibold text-slate-800 dark:text-slate-100 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg whitespace-nowrap"
                >
                  <Edit3 className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>{dt('Edit Academic Info', 'একাডেমিক তথ্য সম্পাদনা')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => openResetPasswordModal(drawerProfile)}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 min-h-[42px] text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 rounded-lg whitespace-nowrap"
                >
                  <KeyRound className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>{dt('Reset Password', 'পাসওয়ার্ড রিসেট করুন')}</span>
                </button>
              </div>
            </div>
          </aside>
        </div>
      )}

      {/* ================================================================= */}
      {/* MODAL: Edit Academic Info                                         */}
      {/* ================================================================= */}
      {editingProfile && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-[2px]"
          onClick={(e) => {
            if (e.target === e.currentTarget) setEditingProfile(null);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="qawmi-edit-profile-title"
            className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl overflow-hidden"
          >
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
              <div>
                <h3
                  id="qawmi-edit-profile-title"
                  className="text-base font-bold text-slate-900 dark:text-white"
                >
                  {dt('Edit Academic Info', 'একাডেমিক তথ্য সম্পাদনা')}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {editingProfile.email} · {editingProfile.id}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingProfile(null)}
                aria-label={dt('Close modal', 'মোডাল বন্ধ করুন')}
                className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>

            <form onSubmit={handleSaveProfileEdit} className="p-6 space-y-4">
              {profileEditError && (
                <div
                  role="alert"
                  className="flex items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-xs text-red-800 dark:text-red-200"
                >
                  <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span>{td(profileEditError)}</span>
                </div>
              )}

              <div>
                <label
                  htmlFor="qawmi-profile-edit-name"
                  className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
                >
                  {td('Full Name')}
                </label>
                <input
                  id="qawmi-profile-edit-name"
                  type="text"
                  value={profileEditName}
                  onChange={(e) => setProfileEditName(e.target.value)}
                  className="w-full px-3.5 py-2.5 min-h-[42px] bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>

              <div>
                <label
                  htmlFor="qawmi-profile-edit-marhala"
                  className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
                >
                  {dt('Marhala / Stage', 'মারহালা / স্তর')}
                </label>
                <select
                  id="qawmi-profile-edit-marhala"
                  value={profileEditMarhala}
                  onChange={(e) => setProfileEditMarhala(e.target.value as QawmiMarhala)}
                  className="w-full px-3.5 py-2.5 min-h-[42px] bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                >
                  {QAWMI_MARHALAS.map((m) => (
                    <option key={m} value={m}>
                      {td(m)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="qawmi-profile-edit-focus"
                  className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
                >
                  {dt('Focus / Branch', 'শাখা / ফোকাস')}
                </label>
                <select
                  id="qawmi-profile-edit-focus"
                  value={profileEditFocus}
                  onChange={(e) => setProfileEditFocus(e.target.value as QawmiFocusBranch)}
                  className="w-full px-3.5 py-2.5 min-h-[42px] bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                >
                  {profileEditFocusOptions.map((branch) => (
                    <option key={branch} value={branch}>
                      {td(branch)}
                    </option>
                  ))}
                </select>
              </div>

              {editingProfile.role === 'teacher' && (
                <div>
                  <label
                    htmlFor="qawmi-profile-edit-subject"
                    className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
                  >
                    {dt('Primary Subject / Kitab', 'মূল বিষয় / কিতাব')}
                  </label>
                  <input
                    id="qawmi-profile-edit-subject"
                    type="text"
                    value={profileEditSubject}
                    onChange={(e) => setProfileEditSubject(e.target.value)}
                    className="w-full px-3.5 py-2.5 min-h-[42px] bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>
              )}

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingProfile(null)}
                  className="px-4 py-2 min-h-[40px] text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg"
                >
                  {td('Cancel')}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 min-h-[40px] text-sm font-semibold text-white bg-emerald-700 hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 rounded-lg"
                >
                  {td('Save Changes')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* MODAL: Reset Password                                             */}
      {/* ================================================================= */}
      {resetTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-[2px]"
          onClick={(e) => {
            if (e.target === e.currentTarget) setResetTarget(null);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="qawmi-reset-pw-title"
            className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl overflow-hidden"
          >
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
              <div>
                <h3
                  id="qawmi-reset-pw-title"
                  className="text-base font-bold text-slate-900 dark:text-white"
                >
                  {dt('Reset Password', 'পাসওয়ার্ড রিসেট করুন')}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {resetTarget.fullName} · {resetTarget.email}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setResetTarget(null)}
                aria-label={dt('Close modal', 'মোডাল বন্ধ করুন')}
                className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>

            {resetDoneCreds ? (
              <div className="p-6 space-y-4">
                <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-900 dark:text-emerald-200">
                  {dt(
                    'Temporary password updated for {name}. Share these credentials securely.',
                    '{name}-এর অস্থায়ী পাসওয়ার্ড আপডেট হয়েছে। তথ্যগুলো নিরাপদে শেয়ার করুন।',
                    { name: resetDoneCreds.fullName }
                  )}
                </div>
                <dl className="divide-y divide-slate-200 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl text-sm">
                  <SummaryRow label={td('Email')} value={resetDoneCreds.email} mono />
                  <SummaryRow
                    label={td('Temporary Password')}
                    value={resetDoneCreds.password}
                    mono
                  />
                </dl>
                <div className="flex items-center justify-end gap-2.5 pt-1">
                  <button
                    type="button"
                    onClick={handleCopyResetCreds}
                    className="inline-flex items-center gap-1.5 px-4 py-2 min-h-[40px] text-xs font-semibold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-800 rounded-lg"
                  >
                    {copiedResetPw ? (
                      <>
                        <Check className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>{td('Copied')}</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>{dt('Copy Credentials', 'লগইন তথ্য কপি করুন')}</span>
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setResetTarget(null)}
                    className="px-4 py-2 min-h-[40px] text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg"
                  >
                    {dt('Done', 'সম্পন্ন')}
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleConfirmResetPassword} className="p-6 space-y-4">
                {resetError && (
                  <div
                    role="alert"
                    className="flex items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-xs text-red-800 dark:text-red-200"
                  >
                    <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
                    <span>{td(resetError)}</span>
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <label
                      htmlFor="qawmi-reset-pw-input"
                      className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
                    >
                      {dt('New Temporary Password', 'নতুন অস্থায়ী পাসওয়ার্ড')}
                    </label>
                    <button
                      type="button"
                      onClick={() => setResetPasswordInput(generateTemporaryPassword(12))}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:underline"
                    >
                      <RefreshCw className="w-3 h-3" aria-hidden="true" />
                      <span>{dt('Regenerate', 'নতুন তৈরি করুন')}</span>
                    </button>
                  </div>
                  <input
                    id="qawmi-reset-pw-input"
                    type="text"
                    value={resetPasswordInput}
                    onChange={(e) => setResetPasswordInput(e.target.value)}
                    className="w-full px-3.5 py-2.5 min-h-[42px] bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-sm font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setResetTarget(null)}
                    className="px-4 py-2 min-h-[40px] text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg"
                  >
                    {td('Cancel')}
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 min-h-[40px] text-sm font-semibold text-white bg-emerald-700 hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 rounded-lg"
                  >
                    {dt('Confirm Reset', 'রিসেট নিশ্চিত করুন')}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* MODAL: Delete User Confirmation                                   */}
      {/* ================================================================= */}
      {deletingProfile && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-[2px]"
          onClick={(e) => {
            if (e.target === e.currentTarget) setDeletingProfile(null);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="qawmi-delete-user-title"
            className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl p-6 space-y-4"
          >
            <div>
              <h3
                id="qawmi-delete-user-title"
                className="text-base font-bold text-slate-900 dark:text-white"
              >
                {dt('Delete User Account?', 'ব্যবহারকারীর অ্যাকাউন্ট মুছে ফেলবেন?')}
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1.5">
                {dt(
                  'This will permanently remove {name} ({email}) from the {panel} directory. This action cannot be undone.',
                  'এটি {panel} ডিরেক্টরি থেকে {name} ({email})-কে স্থায়ীভাবে মুছে ফেলবে। এই কাজটি আর ফিরিয়ে আনা যাবে না।',
                  {
                    name: deletingProfile.fullName,
                    email: deletingProfile.email,
                    panel: panelTitle,
                  }
                )}
              </p>
            </div>
            <div className="flex items-center justify-end gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setDeletingProfile(null)}
                className="px-4 py-2 min-h-[40px] text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg"
              >
                {td('Cancel')}
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteProfile}
                className="px-4 py-2 min-h-[40px] text-sm font-semibold text-white bg-red-700 hover:bg-red-800 rounded-lg"
              >
                {dt('Delete User', 'ব্যবহারকারী মুছুন')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryRow({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="px-4 py-2.5 flex items-center justify-between gap-4">
      <dt className="text-xs text-slate-500 dark:text-slate-400 shrink-0">{label}</dt>
      <dd
        className={`text-slate-900 dark:text-slate-100 font-semibold text-right break-all ${
          mono ? 'font-mono text-xs' : ''
        }`}
      >
        {value}
      </dd>
    </div>
  );
}
