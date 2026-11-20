import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  Clock,
  Edit3,
  Megaphone,
  Trash2,
  X,
} from 'lucide-react';
import {
  adminNoticesService,
  canClassCarryGroupScope,
  canNoticeCarryAcademicScope,
  formatNoticeAcademicScope,
  NOTICE_CLASSES,
  NOTICE_GROUPS,
  NOTICE_TAGS,
  type NoticeAudience,
  type NoticeCategoryTag,
  type NoticeClassLevel,
  type NoticeGroup,
  type NoticePathway,
  type PathwayNotice,
} from '../../services/adminNoticesService';
import { useDashboardLanguage } from '../../i18n/useDashboardLanguage';

interface PublishedNoticesListProps {
  pathway: NoticePathway;
  notices: PathwayNotice[];
  onDataChanged: () => void;
}

export function PublishedNoticesList({
  pathway,
  notices,
  onDataChanged,
}: PublishedNoticesListProps) {
  const { td, dt, formatDigits, formatDateTime } = useDashboardLanguage();
  const [audienceFilter, setAudienceFilter] = useState<NoticeAudience | 'all'>('all');
  const [groupFilter, setGroupFilter] = useState<NoticeGroup | 'all'>('all');
  const [banner, setBanner] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Edit Notice Modal State
  const [editTarget, setEditTarget] = useState<PathwayNotice | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editAudience, setEditAudience] = useState<NoticeAudience>('both');
  const [editClass, setEditClass] = useState<NoticeClassLevel | 'all'>('all');
  const [editGroup, setEditGroup] = useState<NoticeGroup | 'all'>('all');
  const [editTag, setEditTag] = useState<NoticeCategoryTag | 'none'>('General');
  const [editError, setEditError] = useState<string | null>(null);

  // Delete Confirmation Modal State
  const [deleteTarget, setDeleteTarget] = useState<PathwayNotice | null>(null);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setEditTarget(null);
        setDeleteTarget(null);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const counts = useMemo(
    () => ({
      all: notices.length,
      teacher: notices.filter((n) => n.targetAudience === 'teacher').length,
      student: notices.filter((n) => n.targetAudience === 'student').length,
      both: notices.filter((n) => n.targetAudience === 'both').length,
    }),
    [notices]
  );

  const showGroupPills = audienceFilter !== 'teacher';

  const filteredNotices = useMemo(
    () =>
      adminNoticesService.filterNotices(notices, {
        audience: audienceFilter,
        group: showGroupPills ? groupFilter : 'all',
      }),
    [notices, audienceFilter, groupFilter, showGroupPills]
  );

  const openEditModal = (notice: PathwayNotice) => {
    setEditTarget(notice);
    setEditTitle(notice.title);
    setEditDescription(notice.description);
    setEditAudience(notice.targetAudience);
    setEditClass(notice.targetClass ?? 'all');
    setEditGroup(notice.targetGroup ?? 'all');
    setEditTag(notice.categoryTag ?? 'none');
    setEditError(null);
  };

  const handleEditClassChange = (value: string) => {
    const nextClass = value === 'all' ? 'all' : (Number(value) as NoticeClassLevel);
    setEditClass(nextClass);
    if (nextClass !== 'all' && !canClassCarryGroupScope(nextClass)) {
      setEditGroup('all');
    }
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTarget) return;
    setEditError(null);

    const allowAcademic = canNoticeCarryAcademicScope(editAudience);
    const numericEditClass = editClass === 'all' ? null : editClass;
    const allowGroup = allowAcademic && canClassCarryGroupScope(numericEditClass);

    const res = adminNoticesService.updateNotice(pathway, editTarget.id, {
      title: editTitle,
      description: editDescription,
      targetAudience: editAudience,
      targetClass: allowAcademic ? numericEditClass : null,
      targetGroup: allowGroup && editGroup !== 'all' ? editGroup : null,
      categoryTag: editTag === 'none' ? null : editTag,
    });

    if (!res.ok) {
      setEditError(res.error);
      return;
    }

    setEditTarget(null);
    setBanner({
      type: 'success',
      message: dt('Updated notice "{title}".', '"{title}" নোটিশটি আপডেট হয়েছে।', {
        title: res.notice.title,
      }),
    });
    onDataChanged();
  };

  const handleConfirmDelete = () => {
    if (!deleteTarget) return;
    const title = deleteTarget.title;
    const res = adminNoticesService.deleteNotice(pathway, deleteTarget.id);
    setDeleteTarget(null);
    if (!res.ok) {
      setBanner({ type: 'error', message: res.error });
      return;
    }
    setBanner({
      type: 'success',
      message: dt('Deleted notice "{title}".', '"{title}" নোটিশটি মুছে ফেলা হয়েছে।', { title }),
    });
    onDataChanged();
  };

  const audienceTabs: { id: NoticeAudience | 'all'; label: string; count: number }[] = [
    { id: 'all', label: td('All'), count: counts.all },
    { id: 'teacher', label: dt('Teacher Notice', 'শিক্ষক নোটিশ'), count: counts.teacher },
    { id: 'student', label: dt('Student Notice', 'শিক্ষার্থী নোটিশ'), count: counts.student },
    { id: 'both', label: dt('Both Notice', 'সবার জন্য নোটিশ'), count: counts.both },
  ];

  const renderAudienceBadge = (audience: NoticeAudience) => {
    if (audience === 'teacher') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold bg-teal-50 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
          {td('Teacher')}
        </span>
      );
    }
    if (audience === 'student') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
          {td('Student')}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
        {td('Both')}
      </span>
    );
  };

  const renderTagBadge = (tag: NoticeCategoryTag | null) => {
    if (!tag) return null;
    if (tag === 'Urgent') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-red-50 dark:bg-red-950/60 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-800">
          <AlertTriangle className="w-3 h-3 shrink-0" aria-hidden="true" />
          <span>{td('Urgent')}</span>
        </span>
      );
    }
    if (tag === 'Academic') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
          <BookOpen className="w-3 h-3 shrink-0" aria-hidden="true" />
          <span>{td('Academic')}</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
        <Megaphone className="w-3 h-3 shrink-0" aria-hidden="true" />
        <span>{td('General')}</span>
      </span>
    );
  };

  const editAllowAcademic = canNoticeCarryAcademicScope(editAudience);
  const editNumericClass = editClass === 'all' ? null : editClass;
  const editAllowGroup = editAllowAcademic && canClassCarryGroupScope(editNumericClass);

  return (
    <section className="space-y-4">
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

      {/* Filter Bar: Audience Tabs + Quick Student Group Pills */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div
          role="tablist"
          aria-label="Published notices audience filter"
          className="inline-flex flex-wrap items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl self-start"
        >
          {audienceTabs.map((item) => {
            const active = audienceFilter === item.id;
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => {
                  setAudienceFilter(item.id);
                  if (item.id === 'teacher') {
                    setGroupFilter('all');
                  }
                }}
                className={`px-3.5 py-2 min-h-[38px] rounded-lg text-xs font-semibold transition-colors whitespace-nowrap tabular-nums ${
                  active
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {item.label} ({formatDigits(item.count)})
              </button>
            );
          })}
        </div>

        {showGroupPills && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              {dt('Group Filter:', 'বিভাগ ফিল্টার:')}
            </span>
            <div
              role="group"
              aria-label={dt('Student group notice filter', 'শিক্ষার্থী বিভাগ নোটিশ ফিল্টার')}
              className="inline-flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg"
            >
              {(['all', ...NOTICE_GROUPS] as const).map((grp) => (
                <button
                  key={grp}
                  type="button"
                  onClick={() => setGroupFilter(grp)}
                  className={`px-3 py-1.5 min-h-[34px] text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                    groupFilter === grp
                      ? 'bg-emerald-700 dark:bg-emerald-600 text-white'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {grp === 'all' ? td('All') : td(grp)}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Published Notices Cards */}
      {filteredNotices.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl px-6 py-12 text-center">
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
            {dt(
              'No published notices match the selected filters.',
              'নির্বাচিত ফিল্টারের সাথে কোনো প্রকাশিত নোটিশ মেলেনি।'
            )}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {dt(
              'Publish a new notice above or clear your audience and group filters.',
              'উপরে নতুন নোটিশ প্রকাশ করুন অথবা ফিল্টার পরিষ্কার করুন।'
            )}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredNotices.map((notice) => {
            const scopeLabel = formatNoticeAcademicScope(notice);
            const wasEdited = notice.updatedAt > notice.createdAt + 1000;
            return (
              <article
                key={notice.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 transition-colors"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="space-y-2.5 min-w-0 flex-1">
                    <h4 className="text-base font-bold text-slate-900 dark:text-white leading-snug">
                      {notice.title}
                    </h4>

                    <div className="flex flex-wrap items-center gap-2">
                      {renderAudienceBadge(notice.targetAudience)}
                      {scopeLabel && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 tabular-nums">
                          {notice.targetClass
                            ? dt('Class {num}', 'শ্রেণি {num}', { num: notice.targetClass })
                            : ''}
                          {notice.targetClass && notice.targetGroup ? ' · ' : ''}
                          {notice.targetGroup ? td(notice.targetGroup) : ''}
                          {!notice.targetClass && !notice.targetGroup ? scopeLabel : ''}
                        </span>
                      )}
                      {renderTagBadge(notice.categoryTag)}
                    </div>

                    <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                      {notice.description}
                    </p>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-1 text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                      <span className="inline-flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                        <span>
                          {td('Published')}{' '}
                          {formatDateTime(notice.createdAt, {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                          })}
                        </span>
                      </span>
                      {wasEdited && (
                        <span>
                          · {dt('Updated', 'হালনাগাদ')}{' '}
                          {formatDateTime(notice.updatedAt, {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                          })}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Row / Card Actions */}
                  <div className="flex items-center gap-2 shrink-0 self-start">
                    <button
                      type="button"
                      onClick={() => openEditModal(notice)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[36px] text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg transition-colors whitespace-nowrap"
                    >
                      <Edit3 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                      <span>{td('Edit')}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(notice)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[36px] text-xs font-semibold text-red-700 dark:text-red-400 bg-white dark:bg-slate-900 hover:bg-red-50 dark:hover:bg-red-950/50 border border-red-300 dark:border-red-800 rounded-lg transition-colors whitespace-nowrap"
                    >
                      <Trash2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                      <span>{td('Delete')}</span>
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Edit Notice Modal */}
      {editTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-[2px] overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget) setEditTarget(null);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-notice-modal-title"
            className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl overflow-hidden my-auto"
          >
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
              <h3
                id="edit-notice-modal-title"
                className="text-base font-bold text-slate-900 dark:text-white"
              >
                {dt('Edit Notice', 'নোটিশ সম্পাদনা করুন')}
              </h3>
              <button
                type="button"
                onClick={() => setEditTarget(null)}
                aria-label={td('Close')}
                className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-6 space-y-4">
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
                  htmlFor="edit-notice-title"
                  className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
                >
                  {dt('Notice Title', 'নোটিশের শিরোনাম')}
                </label>
                <input
                  id="edit-notice-title"
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 min-h-[42px] bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>

              <div>
                <label
                  htmlFor="edit-notice-description"
                  className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
                >
                  {dt('Description', 'বিবরণ')}
                </label>
                <textarea
                  id="edit-notice-description"
                  rows={4}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-600 leading-relaxed"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label
                    htmlFor="edit-notice-audience"
                    className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
                  >
                    {dt('Target Audience', 'লক্ষ্যবর্গ')}
                  </label>
                  <select
                    id="edit-notice-audience"
                    value={editAudience}
                    onChange={(e) => setEditAudience(e.target.value as NoticeAudience)}
                    className="w-full px-3.5 py-2.5 min-h-[42px] bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  >
                    <option value="teacher">{dt('Teachers Only', 'শুধুমাত্র শিক্ষক')}</option>
                    <option value="student">{dt('Students Only', 'শুধুমাত্র শিক্ষার্থী')}</option>
                    <option value="both">{td('Both')}</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="edit-notice-tag"
                    className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
                  >
                    {dt('Category / Tag', 'বিভাগ / ট্যাগ')}
                  </label>
                  <select
                    id="edit-notice-tag"
                    value={editTag}
                    onChange={(e) => setEditTag(e.target.value as NoticeCategoryTag | 'none')}
                    className="w-full px-3.5 py-2.5 min-h-[42px] bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  >
                    <option value="none">{dt('No Tag', 'ট্যাগ নেই')}</option>
                    {NOTICE_TAGS.map((tag) => (
                      <option key={tag} value={tag}>
                        {td(tag)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {editAllowAcademic && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label
                      htmlFor="edit-notice-class"
                      className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
                    >
                      {dt('Class Scope', 'শ্রেণি পরিসর')}
                    </label>
                    <select
                      id="edit-notice-class"
                      value={editClass}
                      onChange={(e) => handleEditClassChange(e.target.value)}
                      className="w-full px-3.5 py-2.5 min-h-[42px] bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                    >
                      <option value="all">{td('All Classes')}</option>
                      {NOTICE_CLASSES.map((cls) => (
                        <option key={cls} value={cls}>
                          {dt('Class {num}', 'শ্রেণি {num}', { num: cls })}
                        </option>
                      ))}
                    </select>
                  </div>

                  {editAllowGroup && (
                    <div>
                      <label
                        htmlFor="edit-notice-group"
                        className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
                      >
                        {dt('Group (Class 9–12)', 'বিভাগ (শ্রেণি ৯–১২)')}
                      </label>
                      <select
                        id="edit-notice-group"
                        value={editGroup}
                        onChange={(e) => setEditGroup(e.target.value as NoticeGroup | 'all')}
                        className="w-full px-3.5 py-2.5 min-h-[42px] bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                      >
                        <option value="all">{dt('All Groups', 'সব বিভাগ')}</option>
                        {NOTICE_GROUPS.map((grp) => (
                          <option key={grp} value={grp}>
                            {td(grp)}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              )}

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

      {/* Delete Confirmation Dialog */}
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
            aria-labelledby="delete-notice-modal-title"
            className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl p-6 space-y-4"
          >
            <div>
              <h3
                id="delete-notice-modal-title"
                className="text-base font-bold text-slate-900 dark:text-white"
              >
                {dt('Delete Published Notice?', 'প্রকাশিত নোটিশ মুছে ফেলবেন?')}
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1.5">
                {dt(
                  'This will permanently remove "{title}" from your notice board. This action cannot be undone.',
                  'এটি আপনার নোটিশ বোর্ড থেকে "{title}" স্থায়ীভাবে মুছে ফেলবে। এই কাজটি আর ফিরিয়ে আনা যাবে না।',
                  { title: deleteTarget.title }
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
                {dt('Confirm Delete', 'মুছে ফেলা নিশ্চিত করুন')}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
