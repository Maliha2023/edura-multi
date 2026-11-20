import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  Ban,
  Check,
  CheckCircle2,
  Copy,
  Download,
  Edit3,
  Eye,
  GraduationCap,
  KeyRound,
  MoreVertical,
  RefreshCw,
  Search,
  Trash2,
  UserCheck,
  Users,
  X,
} from 'lucide-react';
import {
  ACADEMIC_CLASSES,
  ACADEMIC_GROUPS,
  adminUsersService,
  buildUsersCsv,
  formatAcademicLevel,
  generateRandomPassword,
  getPathwayDisplayName,
  getUserInitials,
  isGroupApplicableForClass,
  type AcademicClassLevel,
  type AcademicGroup,
  type AdminUserPathway,
  type DirectoryRole,
  type DirectoryUserStatus,
  type PathwayUserProfile,
  type RegistrationSourceType,
} from '../../services/adminUsersService';
import { useDashboardLanguage } from '../../i18n/useDashboardLanguage';

interface UserDirectoryTabProps {
  pathway: AdminUserPathway;
  profiles: PathwayUserProfile[];
  onDataChanged: () => void;
}

export function UserDirectoryTab({
  pathway,
  profiles,
  onDataChanged,
}: UserDirectoryTabProps) {
  const { td, dt, formatDigits, formatDate, formatDateTime } = useDashboardLanguage();
  const [roleView, setRoleView] = useState<DirectoryRole>('teacher');
  const [searchQuery, setSearchQuery] = useState('');
  const [classFilter, setClassFilter] = useState<AcademicClassLevel | 'all'>('all');
  const [groupFilter, setGroupFilter] = useState<AcademicGroup | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<DirectoryUserStatus | 'all'>('all');
  const [sourceFilter, setSourceFilter] = useState<RegistrationSourceType | 'all'>('all');

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [banner, setBanner] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Overlays: Profile Drawer, Edit Academic Modal, Reset Password Modal, Delete Confirmation
  const [drawerProfile, setDrawerProfile] = useState<PathwayUserProfile | null>(null);

  const [editTarget, setEditTarget] = useState<PathwayUserProfile | null>(null);
  const [editName, setEditName] = useState('');
  const [editClass, setEditClass] = useState<AcademicClassLevel>(10);
  const [editGroup, setEditGroup] = useState<AcademicGroup>('Science');
  const [editError, setEditError] = useState<string | null>(null);

  const [resetTarget, setResetTarget] = useState<PathwayUserProfile | null>(null);
  const [resetPasswordInput, setResetPasswordInput] = useState('');
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetDoneCreds, setResetDoneCreds] = useState<{ email: string; password: string } | null>(
    null
  );
  const [copiedCreds, setCopiedCreds] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<PathwayUserProfile | null>(null);

  const menuContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onPointerDown = (e: MouseEvent) => {
      if (
        menuContainerRef.current &&
        !menuContainerRef.current.contains(e.target as Node)
      ) {
        setOpenMenuId(null);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpenMenuId(null);
        setDrawerProfile(null);
        setEditTarget(null);
        setResetTarget(null);
        setDeleteTarget(null);
      }
    };
    document.addEventListener('mousedown', onPointerDown);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  const teacherCount = useMemo(
    () => profiles.filter((p) => p.role === 'teacher').length,
    [profiles]
  );
  const studentCount = useMemo(
    () => profiles.filter((p) => p.role === 'student').length,
    [profiles]
  );

  const filteredProfiles = useMemo(
    () =>
      adminUsersService.filterProfiles(profiles, {
        role: roleView,
        query: searchQuery,
        academicClass: classFilter,
        academicGroup: groupFilter,
        status: statusFilter,
        registrationType: sourceFilter,
      }),
    [profiles, roleView, searchQuery, classFilter, groupFilter, statusFilter, sourceFilter]
  );

  const visibleSelectedIds = useMemo(() => {
    const visibleSet = new Set(filteredProfiles.map((p) => p.id));
    return selectedIds.filter((id) => visibleSet.has(id));
  }, [filteredProfiles, selectedIds]);

  const allVisibleSelected =
    filteredProfiles.length > 0 && visibleSelectedIds.length === filteredProfiles.length;

  const hasActiveFilters =
    Boolean(searchQuery.trim()) ||
    classFilter !== 'all' ||
    groupFilter !== 'all' ||
    statusFilter !== 'all' ||
    sourceFilter !== 'all';

  const clearAllFilters = () => {
    setSearchQuery('');
    setClassFilter('all');
    setGroupFilter('all');
    setStatusFilter('all');
    setSourceFilter('all');
  };

  const toggleSelectAll = () => {
    if (allVisibleSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredProfiles.map((p) => p.id));
    }
  };

  const toggleRowSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleExportCsv = () => {
    const rowsToExport =
      visibleSelectedIds.length > 0
        ? filteredProfiles.filter((p) => visibleSelectedIds.includes(p.id))
        : filteredProfiles;

    if (rowsToExport.length === 0) {
      setBanner({
        type: 'error',
        message: dt('No matching users available to export.', 'রপ্তানি করার জন্য কোনো ব্যবহারকারী পাওয়া যায়নি।'),
      });
      return;
    }

    const csv = buildUsersCsv(rowsToExport);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${pathway}-${roleView}s-directory.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setBanner({
      type: 'success',
      message: dt(
        `Exported {count} ${roleView}${rowsToExport.length === 1 ? '' : 's'} to CSV.`,
        `{count} জন ${roleView === 'teacher' ? 'শিক্ষকের' : 'শিক্ষার্থীর'} তথ্য CSV-তে রপ্তানি করা হয়েছে।`,
        { count: rowsToExport.length }
      ),
    });
  };

  const openEditModal = (profile: PathwayUserProfile) => {
    setOpenMenuId(null);
    setEditTarget(profile);
    setEditName(profile.fullName);
    setEditClass(profile.academicClass);
    setEditGroup(profile.academicGroup ?? 'Science');
    setEditError(null);
  };

  const handleSaveAcademicInfo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTarget) return;
    setEditError(null);

    const res = adminUsersService.updateProfileAcademicInfo(pathway, editTarget.id, {
      fullName: editName,
      academicClass: editClass,
      academicGroup: isGroupApplicableForClass(editClass) ? editGroup : null,
    });
    if (!res.ok) {
      setEditError(td(res.error));
      return;
    }

    if (drawerProfile?.id === res.profile.id) {
      setDrawerProfile(res.profile);
    }
    setEditTarget(null);
    setBanner({
      type: 'success',
      message: dt('Updated academic info for {name}.', '{name}-এর একাডেমিক তথ্য আপডেট করা হয়েছে।', {
        name: res.profile.fullName,
      }),
    });
    onDataChanged();
  };

  const openResetPasswordModal = (profile: PathwayUserProfile) => {
    setOpenMenuId(null);
    setResetTarget(profile);
    setResetPasswordInput(generateRandomPassword(12));
    setResetError(null);
    setResetDoneCreds(null);
    setCopiedCreds(false);
  };

  const handleConfirmResetPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetTarget) return;
    setResetError(null);

    const res = adminUsersService.resetProfilePassword(
      pathway,
      resetTarget.id,
      resetPasswordInput
    );
    if (!res.ok) {
      setResetError(td(res.error));
      return;
    }

    setResetDoneCreds({
      email: res.profile.email,
      password: res.temporaryPassword,
    });
    setBanner({
      type: 'success',
      message: dt(
        'Temporary password reset for {name}.',
        '{name}-এর অস্থায়ী পাসওয়ার্ড রিসেট করা হয়েছে।',
        { name: res.profile.fullName }
      ),
    });
    onDataChanged();
  };

  const handleCopyResetCredentials = async () => {
    if (!resetDoneCreds) return;
    const text = `Email: ${resetDoneCreds.email}\nTemporary Password: ${resetDoneCreds.password}`;
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Clipboard API fallback ignored cleanly in non-HTTPS contexts
    }
    setCopiedCreds(true);
    window.setTimeout(() => setCopiedCreds(false), 2000);
  };

  const handleToggleStatus = (profile: PathwayUserProfile) => {
    setOpenMenuId(null);
    const res = adminUsersService.toggleProfileStatus(pathway, profile.id);
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
    onDataChanged();
  };

  const handleConfirmDelete = () => {
    if (!deleteTarget) return;
    const targetName = deleteTarget.fullName;
    const targetId = deleteTarget.id;
    const res = adminUsersService.deleteProfile(pathway, targetId);
    setDeleteTarget(null);
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
        'Deleted {name} from {pathway} directory.',
        '{pathway} ডিরেক্টরি থেকে {name}-কে মুছে ফেলা হয়েছে।',
        { name: targetName, pathway: td(getPathwayDisplayName(pathway)) }
      ),
    });
    onDataChanged();
  };

  return (
    <div className="space-y-5">
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
            aria-label="Dismiss message"
            className="p-1 rounded-md opacity-70 hover:opacity-100 shrink-0"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      )}

      {/* Top Sub-Views + Export CSV */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div
          role="tablist"
          aria-label="Directory role view"
          className="inline-flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl self-start"
        >
          <button
            type="button"
            role="tab"
            aria-selected={roleView === 'teacher'}
            onClick={() => {
              setRoleView('teacher');
              setSelectedIds([]);
            }}
            className={`inline-flex items-center gap-2 px-3.5 py-2 min-h-[40px] rounded-lg text-sm font-semibold transition-colors whitespace-nowrap tabular-nums ${
              roleView === 'teacher'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Users className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>
              {dt('Teachers Directory ({count})', 'শিক্ষক ডিরেক্টরি ({count})', {
                count: teacherCount,
              })}
            </span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={roleView === 'student'}
            onClick={() => {
              setRoleView('student');
              setSelectedIds([]);
            }}
            className={`inline-flex items-center gap-2 px-3.5 py-2 min-h-[40px] rounded-lg text-sm font-semibold transition-colors whitespace-nowrap tabular-nums ${
              roleView === 'student'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <GraduationCap className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>
              {dt('Students Directory ({count})', 'শিক্ষার্থী ডিরেক্টরি ({count})', {
                count: studentCount,
              })}
            </span>
          </button>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          {visibleSelectedIds.length > 0 && (
            <span className="text-xs font-medium text-slate-600 dark:text-slate-300 tabular-nums">
              {dt('{count} selected', '{count} জন নির্বাচিত', { count: visibleSelectedIds.length })}
              <button
                type="button"
                onClick={() => setSelectedIds([])}
                className="ml-2 text-emerald-700 dark:text-emerald-400 hover:underline font-semibold"
              >
                {td('Clear')}
              </button>
            </span>
          )}
          <button
            type="button"
            onClick={handleExportCsv}
            className="inline-flex items-center gap-2 px-4 py-2 min-h-[40px] text-xs font-semibold text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg transition-colors whitespace-nowrap"
          >
            <Download className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>
              {visibleSelectedIds.length > 0
                ? dt('Export CSV ({count})', 'CSV রপ্তানি ({count})', {
                    count: visibleSelectedIds.length,
                  })
                : dt('Export CSV', 'CSV রপ্তানি')}
            </span>
          </button>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          <div className="md:col-span-4 relative">
            <label htmlFor="directory-search-input" className="sr-only">
              {dt(
                'Search directory by name, email, or User ID',
                'নাম, ইমেইল বা ইউজার আইডি দিয়ে ডিরেক্টরিতে খুঁজুন'
              )}
            </label>
            <Search
              className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden="true"
            />
            <input
              id="directory-search-input"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={dt(
                'Search name, email, or User ID...',
                'নাম, ইমেইল বা ইউজার আইডি দিয়ে খুঁজুন...'
              )}
              className="w-full pl-9 pr-8 py-2 min-h-[40px] bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-600"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label={td('Clear search')}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded"
              >
                <X className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            )}
          </div>

          <div className="md:col-span-2">
            <label htmlFor="directory-class-filter" className="sr-only">
              {dt('Filter by class', 'শ্রেণি অনুযায়ী ফিল্টার')}
            </label>
            <select
              id="directory-class-filter"
              value={classFilter}
              onChange={(e) =>
                setClassFilter(
                  e.target.value === 'all'
                    ? 'all'
                    : (Number(e.target.value) as AcademicClassLevel)
                )
              }
              className="w-full px-3 py-2 min-h-[40px] bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-600"
            >
              <option value="all">{td('All Classes')}</option>
              {ACADEMIC_CLASSES.map((cls) => (
                <option key={cls} value={cls}>
                  {dt('Class {cls}', 'শ্রেণি {cls}', { cls })}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2">
            <label htmlFor="directory-group-filter" className="sr-only">
              {dt('Filter by group', 'বিভাগ অনুযায়ী ফিল্টার')}
            </label>
            <select
              id="directory-group-filter"
              value={groupFilter}
              onChange={(e) => setGroupFilter(e.target.value as AcademicGroup | 'all')}
              className="w-full px-3 py-2 min-h-[40px] bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-600"
            >
              <option value="all">{dt('All Groups', 'সব বিভাগ')}</option>
              {ACADEMIC_GROUPS.map((grp) => (
                <option key={grp} value={grp}>
                  {td(grp)}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2">
            <label htmlFor="directory-status-filter" className="sr-only">
              {dt('Filter by status', 'অবস্থা অনুযায়ী ফিল্টার')}
            </label>
            <select
              id="directory-status-filter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as DirectoryUserStatus | 'all')}
              className="w-full px-3 py-2 min-h-[40px] bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-600"
            >
              <option value="all">{dt('All Status', 'সব অবস্থা')}</option>
              <option value="active">{td('Active')}</option>
              <option value="suspended">{td('Suspended')}</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <label htmlFor="directory-source-filter" className="sr-only">
              {dt('Filter by entry source', 'নিবন্ধনের উৎস অনুযায়ী ফিল্টার')}
            </label>
            <select
              id="directory-source-filter"
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value as RegistrationSourceType | 'all')}
              className="w-full px-3 py-2 min-h-[40px] bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-600"
            >
              <option value="all">{dt('All Sources', 'সব উৎস')}</option>
              <option value="coupon_auto">{dt('Auto Coupon', 'অটো কুপন')}</option>
              <option value="admin_manual">{dt('Manual', 'ম্যানুয়াল')}</option>
            </select>
          </div>
        </div>

        {hasActiveFilters && (
          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-500 dark:text-slate-400 tabular-nums">
              {dt(
                `Showing {count} matching ${roleView}${filteredProfiles.length === 1 ? '' : 's'}`,
                `{count} জন মিল থাকা ${roleView === 'teacher' ? 'শিক্ষক' : 'শিক্ষার্থী'} দেখানো হচ্ছে`,
                { count: filteredProfiles.length }
              )}
            </span>
            <button
              type="button"
              onClick={clearAllFilters}
              className="font-semibold text-emerald-700 dark:text-emerald-400 hover:underline"
            >
              {dt('Reset filters', 'ফিল্টার রিসেট')}
            </button>
          </div>
        )}
      </div>

      {/* Master Directory Table */}
      <div
        ref={menuContainerRef}
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-visible"
      >
        {filteredProfiles.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
              {dt(
                `No ${roleView}s found matching your current search and filters.`,
                `বর্তমান অনুসন্ধান ও ফিল্টারের সাথে মিলিয়ে কোনো ${roleView === 'teacher' ? 'শিক্ষক' : 'শিক্ষার্থী'} পাওয়া যায়নি।`
              )}
            </p>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearAllFilters}
                className="mt-3 px-4 py-2 text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 rounded-lg"
              >
                {dt('Clear All Filters', 'সব ফিল্টার মুছুন')}
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/50 text-xs font-semibold text-slate-600 dark:text-slate-400">
                  <th className="py-3.5 pl-5 pr-2 w-10">
                    <input
                      type="checkbox"
                      checked={allVisibleSelected}
                      onChange={toggleSelectAll}
                      aria-label={dt('Select all visible users', 'দৃশ্যমান সব ব্যবহারকারী নির্বাচন করুন')}
                      className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 accent-emerald-700 cursor-pointer"
                    />
                  </th>
                  <th className="py-3.5 px-3">{dt('User Info', 'ব্যবহারকারীর তথ্য')}</th>
                  <th className="py-3.5 px-4 whitespace-nowrap">{td('Academic Level')}</th>
                  <th className="py-3.5 px-4 whitespace-nowrap">{dt('Entry Source', 'নিবন্ধনের উৎস')}</th>
                  <th className="py-3.5 px-4 whitespace-nowrap">{td('Status')}</th>
                  <th className="py-3.5 px-4 whitespace-nowrap">{dt('Joined Date', 'যোগদানের তারিখ')}</th>
                  <th className="py-3.5 pr-5 pl-3 text-right whitespace-nowrap">{td('Actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-sm">
                {filteredProfiles.map((profile, idx) => {
                  const isChecked = visibleSelectedIds.includes(profile.id);
                  const openUpward = idx >= filteredProfiles.length - 2 && filteredProfiles.length > 2;
                  return (
                    <tr
                      key={profile.id}
                      className={`transition-colors ${
                        isChecked
                          ? 'bg-emerald-50/50 dark:bg-emerald-950/20'
                          : 'hover:bg-slate-50/70 dark:hover:bg-slate-800/40'
                      }`}
                    >
                      <td className="py-3.5 pl-5 pr-2">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleRowSelect(profile.id)}
                          aria-label={`Select ${profile.fullName}`}
                          className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 accent-emerald-700 cursor-pointer"
                        />
                      </td>
                      <td className="py-3.5 px-3">
                        <div className="flex items-center gap-3 min-w-[200px]">
                          <div
                            aria-hidden="true"
                            className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center justify-center shrink-0"
                          >
                            {getUserInitials(profile.fullName)}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-slate-900 dark:text-white truncate">
                              {profile.fullName}
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                              {profile.email} ·{' '}
                              <span className="font-mono tabular-nums">{profile.id}</span>
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap text-slate-800 dark:text-slate-200 font-medium tabular-nums">
                        {formatDigits(
                          profile.academicGroup
                            ? `${dt('Class {cls}', 'শ্রেণি {cls}', { cls: profile.academicClass })} • ${td(profile.academicGroup)}`
                            : formatAcademicLevel(profile.academicClass, profile.academicGroup)
                                .replace('Class ', dt('Class ', 'শ্রেণি '))
                        )}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold ${
                            profile.registrationType === 'coupon_auto'
                              ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                          }`}
                        >
                          {profile.registrationType === 'coupon_auto'
                            ? dt('Auto Coupon', 'অটো কুপন')
                            : dt('Manual', 'ম্যানুয়াল')}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
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
                      <td className="py-3.5 px-4 whitespace-nowrap text-xs text-slate-600 dark:text-slate-400 tabular-nums">
                        {formatDate(profile.joinedAt)}
                      </td>
                      <td className="py-3.5 pr-5 pl-3 text-right whitespace-nowrap relative">
                        <button
                          type="button"
                          onClick={() =>
                            setOpenMenuId((prev) => (prev === profile.id ? null : profile.id))
                          }
                          aria-label={`Actions for ${profile.fullName}`}
                          aria-expanded={openMenuId === profile.id}
                          aria-haspopup="menu"
                          className="w-9 h-9 inline-flex items-center justify-center rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition-colors"
                        >
                          <MoreVertical className="w-4 h-4" aria-hidden="true" />
                        </button>

                        {openMenuId === profile.id && (
                          <div
                            role="menu"
                            className={`absolute right-5 ${
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
                              <span>{dt('View Full Profile', 'সম্পূর্ণ প্রোফাইল দেখুন')}</span>
                            </button>
                            <button
                              type="button"
                              role="menuitem"
                              onClick={() => openEditModal(profile)}
                              className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                            >
                              <Edit3 className="w-3.5 h-3.5 text-slate-500" aria-hidden="true" />
                              <span>{dt('Edit Academic Info', 'একাডেমিক তথ্য সম্পাদনা')}</span>
                            </button>
                            <button
                              type="button"
                              role="menuitem"
                              onClick={() => openResetPasswordModal(profile)}
                              className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                            >
                              <KeyRound className="w-3.5 h-3.5 text-slate-500" aria-hidden="true" />
                              <span>{dt('Reset Password', 'পাসওয়ার্ড রিসেট')}</span>
                            </button>
                            <button
                              type="button"
                              role="menuitem"
                              onClick={() => handleToggleStatus(profile)}
                              className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                            >
                              {profile.status === 'active' ? (
                                <>
                                  <Ban className="w-3.5 h-3.5 text-amber-600" aria-hidden="true" />
                                  <span>{dt('Suspend Account', 'অ্যাকাউন্ট স্থগিত করুন')}</span>
                                </>
                              ) : (
                                <>
                                  <UserCheck
                                    className="w-3.5 h-3.5 text-emerald-600"
                                    aria-hidden="true"
                                  />
                                  <span>{dt('Activate Account', 'অ্যাকাউন্ট সক্রিয় করুন')}</span>
                                </>
                              )}
                            </button>
                            <div className="my-1 border-t border-slate-100 dark:border-slate-800" />
                            <button
                              type="button"
                              role="menuitem"
                              onClick={() => {
                                setOpenMenuId(null);
                                setDeleteTarget(profile);
                              }}
                              className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50"
                            >
                              <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                              <span>{dt('Delete User', 'ব্যবহারকারী মুছুন')}</span>
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

      {/* View Full Profile Slide-Over Drawer */}
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
            aria-labelledby="profile-drawer-title"
            className="w-full max-w-md bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 h-full flex flex-col shadow-2xl"
          >
            <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-11 h-11 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 font-bold text-sm flex items-center justify-center shrink-0">
                  {getUserInitials(drawerProfile.fullName)}
                </div>
                <div className="min-w-0">
                  <h3
                    id="profile-drawer-title"
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
                aria-label="Close profile drawer"
                className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 shrink-0"
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <dl className="divide-y divide-slate-200 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl text-sm">
                <DrawerRow label={dt('User ID', 'ইউজার আইডি')} value={drawerProfile.id} mono />
                <DrawerRow
                  label={td('Role')}
                  value={drawerProfile.role === 'teacher' ? td('Teacher') : td('Student')}
                />
                <DrawerRow
                  label={dt('Pathway', 'পাথওয়ে')}
                  value={td(getPathwayDisplayName(drawerProfile.pathway))}
                />
                <DrawerRow
                  label={td('Academic Level')}
                  value={formatDigits(
                    drawerProfile.academicGroup
                      ? `${dt('Class {cls}', 'শ্রেণি {cls}', { cls: drawerProfile.academicClass })} • ${td(drawerProfile.academicGroup)}`
                      : formatAcademicLevel(
                          drawerProfile.academicClass,
                          drawerProfile.academicGroup
                        ).replace('Class ', dt('Class ', 'শ্রেণি '))
                  )}
                />
                <DrawerRow
                  label={dt('Entry Source', 'নিবন্ধনের উৎস')}
                  value={
                    drawerProfile.registrationType === 'coupon_auto'
                      ? dt('Auto Coupon', 'অটো কুপন')
                      : dt('Manual', 'ম্যানুয়াল')
                  }
                />
                {drawerProfile.couponCode && (
                  <DrawerRow
                    label={dt('Coupon Code', 'কুপন কোড')}
                    value={drawerProfile.couponCode}
                    mono
                  />
                )}
                <DrawerRow
                  label={td('Status')}
                  value={drawerProfile.status === 'active' ? td('Active') : td('Suspended')}
                />
                <DrawerRow
                  label={dt('Joined Date', 'যোগদানের তারিখ')}
                  value={formatDateTime(drawerProfile.joinedAt, {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  })}
                />
                <DrawerRow
                  label={dt('Last Updated', 'সর্বশেষ আপডেট')}
                  value={formatDateTime(drawerProfile.updatedAt, {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  })}
                />
              </dl>

              <div className="flex flex-wrap gap-2.5">
                <button
                  type="button"
                  onClick={() => openEditModal(drawerProfile)}
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
                  <span>{dt('Reset Password', 'পাসওয়ার্ড রিসেট')}</span>
                </button>
              </div>
            </div>
          </aside>
        </div>
      )}

      {/* Edit Academic Info Modal */}
      {editTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-[2px]"
          onClick={(e) => {
            if (e.target === e.currentTarget) setEditTarget(null);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-academic-title"
            className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl overflow-hidden"
          >
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
              <div>
                <h3
                  id="edit-academic-title"
                  className="text-base font-bold text-slate-900 dark:text-white"
                >
                  {dt('Edit Academic Info', 'একাডেমিক তথ্য সম্পাদনা')}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {editTarget.email} · {editTarget.id}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditTarget(null)}
                aria-label={td('Close')}
                className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>

            <form onSubmit={handleSaveAcademicInfo} className="p-6 space-y-4">
              {editError && (
                <div
                  role="alert"
                  className="flex items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-xs text-red-800 dark:text-red-200"
                >
                  <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span>{editError}</span>
                </div>
              )}

              <div>
                <label
                  htmlFor="dir-edit-name"
                  className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
                >
                  {td('Full Name')}
                </label>
                <input
                  id="dir-edit-name"
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3.5 py-2.5 min-h-[42px] bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label
                    htmlFor="dir-edit-class"
                    className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
                  >
                    {td('Class')}
                  </label>
                  <select
                    id="dir-edit-class"
                    value={editClass}
                    onChange={(e) => setEditClass(Number(e.target.value) as AcademicClassLevel)}
                    className="w-full px-3.5 py-2.5 min-h-[42px] bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  >
                    {ACADEMIC_CLASSES.map((cls) => (
                      <option key={cls} value={cls}>
                        {dt('Class {cls}', 'শ্রেণি {cls}', { cls })}
                      </option>
                    ))}
                  </select>
                </div>

                {isGroupApplicableForClass(editClass) && (
                  <div>
                    <label
                      htmlFor="dir-edit-group"
                      className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
                    >
                      {dt('Group (Class 9–12)', 'বিভাগ (শ্রেণি ৯–১২)')}
                    </label>
                    <select
                      id="dir-edit-group"
                      value={editGroup}
                      onChange={(e) => setEditGroup(e.target.value as AcademicGroup)}
                      className="w-full px-3.5 py-2.5 min-h-[42px] bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                    >
                      {ACADEMIC_GROUPS.map((grp) => (
                        <option key={grp} value={grp}>
                          {td(grp)}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setEditTarget(null)}
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

      {/* Reset Password Modal */}
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
            aria-labelledby="reset-password-title"
            className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl overflow-hidden"
          >
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
              <div>
                <h3
                  id="reset-password-title"
                  className="text-base font-bold text-slate-900 dark:text-white"
                >
                  {dt('Reset Temporary Password', 'অস্থায়ী পাসওয়ার্ড রিসেট করুন')}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {resetTarget.fullName} · {resetTarget.email}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setResetTarget(null)}
                aria-label={td('Close')}
                className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>

            {resetDoneCreds ? (
              <div className="p-6 space-y-4">
                <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 space-y-2 text-sm">
                  <p className="font-semibold text-emerald-900 dark:text-emerald-200">
                    {dt('Password updated successfully', 'পাসওয়ার্ড সফলভাবে আপডেট হয়েছে')}
                  </p>
                  <div className="text-xs space-y-1 text-slate-700 dark:text-slate-300">
                    <p>
                      {td('Email')}:{' '}
                      <span className="font-mono font-semibold text-slate-900 dark:text-white">
                        {resetDoneCreds.email}
                      </span>
                    </p>
                    <p>
                      {td('Temporary Password')}:{' '}
                      <span className="font-mono font-semibold text-slate-900 dark:text-white">
                        {resetDoneCreds.password}
                      </span>
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={handleCopyResetCredentials}
                    className="inline-flex items-center gap-1.5 px-4 py-2 min-h-[40px] text-sm font-semibold text-white bg-emerald-700 hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 rounded-lg"
                  >
                    {copiedCreds ? (
                      <>
                        <Check className="w-4 h-4" aria-hidden="true" />
                        <span>{td('Copied')}</span>
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
                    onClick={() => setResetTarget(null)}
                    className="px-4 py-2 min-h-[40px] text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg"
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
                    <span>{resetError}</span>
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <label
                      htmlFor="reset-temp-password"
                      className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
                    >
                      {dt('New Temporary Password', 'নতুন অস্থায়ী পাসওয়ার্ড')}
                    </label>
                    <button
                      type="button"
                      onClick={() => setResetPasswordInput(generateRandomPassword(12))}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:underline"
                    >
                      <RefreshCw className="w-3 h-3" aria-hidden="true" />
                      <span>{td('Generate')}</span>
                    </button>
                  </div>
                  <input
                    id="reset-temp-password"
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
                    {dt('Set Temporary Password', 'অস্থায়ী পাসওয়ার্ড সেট করুন')}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Delete User Confirmation Dialog */}
      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-[2px]"
          onClick={(e) => {
            if (e.target === e.currentTarget) setDeleteTarget(null);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-user-title"
            className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl p-6 space-y-4"
          >
            <div>
              <h3
                id="delete-user-title"
                className="text-base font-bold text-slate-900 dark:text-white"
              >
                {dt('Delete User Account?', 'ব্যবহারকারী অ্যাকাউন্ট মুছবেন?')}
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1.5">
                {dt(
                  'You are about to permanently delete {name} ({email}) from the {pathway} directory. This action cannot be undone.',
                  'আপনি {pathway} ডিরেক্টরি থেকে {name} ({email})-কে স্থায়ীভাবে মুছে ফেলতে যাচ্ছেন। এই কাজটি আর ফিরিয়ে আনা যাবে না।',
                  {
                    name: deleteTarget.fullName,
                    email: deleteTarget.email,
                    pathway: td(getPathwayDisplayName(pathway)),
                  }
                )}
              </p>
            </div>
            <div className="flex items-center justify-end gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 min-h-[40px] text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg"
              >
                {td('Cancel')}
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2 min-h-[40px] text-sm font-semibold text-white bg-red-700 hover:bg-red-800 rounded-lg"
              >
                {dt('Confirm Delete', 'মোছা নিশ্চিত করুন')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DrawerRow({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="px-4 py-3 flex items-center justify-between gap-4">
      <dt className="text-xs text-slate-500 dark:text-slate-400 shrink-0">{label}</dt>
      <dd
        className={`text-slate-900 dark:text-slate-100 font-medium text-right break-all ${
          mono ? 'font-mono text-xs tabular-nums' : ''
        }`}
      >
        {value}
      </dd>
    </div>
  );
}
