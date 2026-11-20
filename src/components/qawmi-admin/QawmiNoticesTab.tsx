import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  Clock,
  Edit3,
  GraduationCap,
  Megaphone,
  Search,
  Send,
  ShieldCheck,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import {
  QAWMI_FOCUS_BRANCHES,
  QAWMI_MARHALAS,
  getShortMarhalaLabel,
  qawmiAdminService,
  type QawmiAdminNotice,
  type QawmiFocusBranch,
  type QawmiMarhala,
  type QawmiNoticeAudience,
  type QawmiNoticeTag,
} from '../../services/qawmiAdminService';
import { useDashboardLanguage } from '../../i18n/useDashboardLanguage';

interface QawmiNoticesTabProps {
  adminEmail: string;
  onDataChanged: () => void;
}

const NOTICE_TAGS: QawmiNoticeTag[] = ['General', 'Exam', 'Urgent'];

export function QawmiNoticesTab({ adminEmail, onDataChanged }: QawmiNoticesTabProps) {
  const { dt, td, formatDigits, formatDateTime } = useDashboardLanguage();
  const panelName = dt('Qawmi Madrasa Panel', 'কওমি মাদ্রাসা প্যানেল');

  const [refreshTick, setRefreshTick] = useState(0);
  const [composerBanner, setComposerBanner] = useState<string | null>(null);
  const [listBanner, setListBanner] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // Composer form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [targetAudience, setTargetAudience] = useState<QawmiNoticeAudience>('both');
  const [targetMarhala, setTargetMarhala] = useState<'all' | QawmiMarhala>('all');
  const [targetFocus, setTargetFocus] = useState<'all' | QawmiFocusBranch>('all');
  const [tag, setTag] = useState<QawmiNoticeTag>('General');
  const [formError, setFormError] = useState<string | null>(null);

  // List filter state
  const [filterAudience, setFilterAudience] = useState<'all' | QawmiNoticeAudience>('all');
  const [filterMarhala, setFilterMarhala] = useState<'all' | QawmiMarhala>('all');
  const [filterFocus, setFilterFocus] = useState<'all' | QawmiFocusBranch>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Edit modal state
  const [editingNotice, setEditingNotice] = useState<QawmiAdminNotice | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editAudience, setEditAudience] = useState<QawmiNoticeAudience>('both');
  const [editMarhala, setEditMarhala] = useState<'all' | QawmiMarhala>('all');
  const [editFocus, setEditFocus] = useState<'all' | QawmiFocusBranch>('all');
  const [editTag, setEditTag] = useState<QawmiNoticeTag>('General');
  const [editError, setEditError] = useState<string | null>(null);

  // Delete confirmation modal
  const [deletingNotice, setDeletingNotice] = useState<QawmiAdminNotice | null>(null);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setEditingNotice(null);
        setDeletingNotice(null);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const allNotices = useMemo(() => {
    void refreshTick;
    return qawmiAdminService.listNotices();
  }, [refreshTick]);

  const counts = useMemo(
    () => ({
      all: allNotices.length,
      teacher: allNotices.filter((n) => n.audience === 'teacher').length,
      student: allNotices.filter((n) => n.audience === 'student').length,
      both: allNotices.filter((n) => n.audience === 'both').length,
    }),
    [allNotices]
  );

  const notices = useMemo(() => {
    void refreshTick;
    return qawmiAdminService.listNotices({
      audience: filterAudience,
      marhala: filterMarhala,
      focusBranch: filterFocus,
      query: searchQuery,
    });
  }, [filterAudience, filterMarhala, filterFocus, searchQuery, refreshTick]);

  const bump = () => {
    setRefreshTick((n) => n + 1);
    onDataChanged();
  };

  const handlePublish = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setComposerBanner(null);

    const res = qawmiAdminService.createNotice(
      {
        title,
        description,
        audience: targetAudience,
        marhala: targetMarhala,
        focusBranch: targetFocus,
        tag,
      },
      adminEmail
    );
    if (!res.ok) {
      setFormError(td(res.error));
      return;
    }

    setTitle('');
    setDescription('');
    setTargetAudience('both');
    setTargetMarhala('all');
    setTargetFocus('all');
    setTag('General');
    setComposerBanner(
      dt('Published "{title}" to Qawmi Madrasa.', 'কওমি মাদ্রাসায় "{title}" প্রকাশিত হয়েছে।', {
        title: res.notice.title,
      })
    );
    bump();
  };

  const openEdit = (notice: QawmiAdminNotice) => {
    setEditingNotice(notice);
    setEditTitle(notice.title);
    setEditDescription(notice.description);
    setEditAudience(notice.audience);
    setEditMarhala(notice.marhala);
    setEditFocus(notice.focusBranch);
    setEditTag(notice.tag);
    setEditError(null);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingNotice) return;
    setEditError(null);

    const res = qawmiAdminService.updateNotice(
      editingNotice.id,
      {
        title: editTitle,
        description: editDescription,
        audience: editAudience,
        marhala: editMarhala,
        focusBranch: editFocus,
        tag: editTag,
      },
      adminEmail
    );
    if (!res.ok) {
      setEditError(td(res.error));
      return;
    }
    setEditingNotice(null);
    setListBanner({
      type: 'success',
      message: dt('Updated notice "{title}".', '"{title}" নোটিশ আপডেট করা হয়েছে।', {
        title: res.notice.title,
      }),
    });
    bump();
  };

  const handleConfirmDelete = () => {
    if (!deletingNotice) return;
    const removedTitle = deletingNotice.title;
    const res = qawmiAdminService.deleteNotice(deletingNotice.id, adminEmail);
    setDeletingNotice(null);
    if (!res.ok) {
      setListBanner({ type: 'error', message: td(res.error) });
      return;
    }
    setListBanner({
      type: 'success',
      message: dt('Deleted notice "{title}".', '"{title}" নোটিশ মুছে ফেলা হয়েছে।', {
        title: removedTitle,
      }),
    });
    bump();
  };

  const audienceOptions: {
    id: QawmiNoticeAudience;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }[] = [
    { id: 'teacher', label: td('Teachers Only'), icon: Users },
    { id: 'student', label: td('Students Only'), icon: GraduationCap },
    { id: 'both', label: td('Both'), icon: Users },
  ];

  const audienceTabs: { id: 'all' | QawmiNoticeAudience; label: string; count: number }[] = [
    { id: 'all', label: td('All'), count: counts.all },
    { id: 'teacher', label: dt('Teacher Notice', 'শিক্ষক নোটিশ'), count: counts.teacher },
    { id: 'student', label: dt('Student Notice', 'শিক্ষার্থী নোটিশ'), count: counts.student },
    { id: 'both', label: dt('Both Notice', 'উভয়ের নোটিশ'), count: counts.both },
  ];

  const renderAudienceBadge = (audience: QawmiNoticeAudience) => {
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

  const renderTagBadge = (itemTag: QawmiNoticeTag) => {
    if (itemTag === 'Urgent') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-red-50 dark:bg-red-950/60 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-800">
          <AlertTriangle className="w-3 h-3 shrink-0" aria-hidden="true" />
          <span>{td('Urgent')}</span>
        </span>
      );
    }
    if (itemTag === 'Exam') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
          <BookOpen className="w-3 h-3 shrink-0" aria-hidden="true" />
          <span>{td('Exam')}</span>
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

  return (
    <div className="space-y-6">
      {/* Notice Composer Form */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 transition-colors">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              {td('Create Notice')}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {dt(
                'Compose an announcement scoped strictly to the {panel}.',
                'শুধুমাত্র {panel}-এর জন্য নির্দিষ্ট একটি ঘোষণা তৈরি করুন।',
                { panel: panelName }
              )}
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 px-3 py-1 rounded-lg">
            <ShieldCheck className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            <span>{td('Qawmi Madrasa')}</span>
          </span>
        </div>

        <form onSubmit={handlePublish} className="mt-5 space-y-5" noValidate>
          {composerBanner && (
            <div
              role="status"
              className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 text-sm"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <CheckCircle2
                  className="w-4 h-4 text-emerald-700 dark:text-emerald-400 shrink-0"
                  aria-hidden="true"
                />
                <span>{composerBanner}</span>
              </div>
              <button
                type="button"
                onClick={() => setComposerBanner(null)}
                aria-label={dt('Dismiss notification', 'বিজ্ঞপ্তি সরান')}
                className="p-1 rounded-md opacity-70 hover:opacity-100 shrink-0"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
          )}

          {formError && (
            <div
              role="alert"
              className="flex items-start gap-2.5 px-4 py-3 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-red-900 dark:text-red-200 text-sm"
            >
              <AlertCircle
                className="w-4 h-4 text-red-700 dark:text-red-400 shrink-0 mt-0.5"
                aria-hidden="true"
              />
              <span>{formError}</span>
            </div>
          )}

          {/* Title & Category Tag */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            <div className="md:col-span-8">
              <label
                htmlFor="qawmi-notice-title"
                className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
              >
                {td('Notice Title')} <span className="text-red-600">*</span>
              </label>
              <input
                id="qawmi-notice-title"
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={dt(
                  'e.g. Befaq Central Markazi Imtihan & Takrar Schedule',
                  'যেমন: বেফাক কেন্দ্রীয় মারকাযী ইমতিহান ও তাকরার সময়সূচি'
                )}
                className="w-full px-3.5 py-2.5 min-h-[44px] bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>

            <div className="md:col-span-4">
              <label
                htmlFor="qawmi-notice-tag"
                className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
              >
                {td('Category / Tag')}
              </label>
              <select
                id="qawmi-notice-tag"
                value={tag}
                onChange={(e) => setTag(e.target.value as QawmiNoticeTag)}
                className="w-full px-3.5 py-2.5 min-h-[44px] bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-600"
              >
                {NOTICE_TAGS.map((t) => (
                  <option key={t} value={t}>
                    {td(t)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label
              htmlFor="qawmi-notice-description"
              className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
            >
              {td('Description')} <span className="text-red-600">*</span>
            </label>
            <textarea
              id="qawmi-notice-description"
              rows={4}
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={dt(
                'Write the full announcement details, kitab revision schedule, timings, or Befaq guidelines...',
                'পূর্ণ ঘোষণার বিবরণ, কিতাব রিভিশন সময়সূচি, সময় বা বেফাক নির্দেশনা লিখুন...'
              )}
              className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-600 leading-relaxed"
            />
          </div>

          {/* Target Audience & Optional Marhala / Focus Scope */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-end">
            <div className="lg:col-span-5">
              <span className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                {td('Target Audience')}
              </span>
              <div
                role="radiogroup"
                aria-label={td('Target Audience')}
                className="inline-flex flex-wrap items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl w-full sm:w-auto"
              >
                {audienceOptions.map((opt) => {
                  const Icon = opt.icon;
                  const active = targetAudience === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      onClick={() => setTargetAudience(opt.id)}
                      className={`inline-flex items-center justify-center gap-1.5 px-3.5 py-2 min-h-[38px] rounded-lg text-xs font-semibold transition-colors whitespace-nowrap flex-1 sm:flex-initial ${
                        active
                          ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                      <span>{opt.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="lg:col-span-4">
              <label
                htmlFor="qawmi-notice-marhala"
                className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
              >
                {dt('Marhala Filter (Optional)', 'মারহালা ফিল্টার (ঐচ্ছিক)')}
              </label>
              <select
                id="qawmi-notice-marhala"
                value={targetMarhala}
                onChange={(e) => setTargetMarhala(e.target.value as 'all' | QawmiMarhala)}
                className="w-full px-3.5 py-2 min-h-[42px] bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-600"
              >
                <option value="all">{dt('All Marhalas', 'সব মারহালা')}</option>
                {QAWMI_MARHALAS.map((m) => (
                  <option key={m} value={m}>
                    {td(m)}
                  </option>
                ))}
              </select>
            </div>

            <div className="lg:col-span-3">
              <label
                htmlFor="qawmi-notice-focus"
                className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
              >
                {dt('Focus / Branch (Optional)', 'ফোকাস / শাখা (ঐচ্ছিক)')}
              </label>
              <select
                id="qawmi-notice-focus"
                value={targetFocus}
                onChange={(e) => setTargetFocus(e.target.value as 'all' | QawmiFocusBranch)}
                className="w-full px-3.5 py-2 min-h-[42px] bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-600"
              >
                <option value="all">{dt('All Focus / Branches', 'সব ফোকাস / শাখা')}</option>
                {QAWMI_FOCUS_BRANCHES.map((branch) => (
                  <option key={branch} value={branch}>
                    {td(branch)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="pt-1 flex items-center justify-end">
            <button
              type="submit"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 min-h-[44px] bg-emerald-700 hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white text-sm font-semibold rounded-lg transition-colors whitespace-nowrap"
            >
              <Send className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>{td('Publish Notice')}</span>
            </button>
          </div>
        </form>
      </section>

      {/* Published Notices List */}
      <section className="space-y-4">
        {listBanner && (
          <div
            role={listBanner.type === 'error' ? 'alert' : 'status'}
            className={`flex items-center justify-between gap-3 px-4 py-3 rounded-xl border text-sm ${
              listBanner.type === 'success'
                ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
                : 'bg-red-50 dark:bg-red-950/50 border-red-200 dark:border-red-800 text-red-900 dark:text-red-200'
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              {listBanner.type === 'success' ? (
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
              <span>{listBanner.message}</span>
            </div>
            <button
              type="button"
              onClick={() => setListBanner(null)}
              aria-label={dt('Dismiss message', 'বার্তা সরান')}
              className="p-1 rounded-md opacity-70 hover:opacity-100 shrink-0"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        )}

        {/* Filter Bar */}
        <div className="flex flex-col gap-3">
          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
            <div
              role="tablist"
              aria-label={dt('Published notices audience filter', 'প্রকাশিত নোটিশের প্রাপক ফিল্টার')}
              className="inline-flex flex-wrap items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl self-start"
            >
              {audienceTabs.map((item) => {
                const active = filterAudience === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => setFilterAudience(item.id)}
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

            <div className="flex flex-wrap items-center gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  {dt('Marhala:', 'মারহালা:')}
                </span>
                <div
                  role="group"
                  aria-label={dt('Marhala notice filter', 'মারহালা নোটিশ ফিল্টার')}
                  className="inline-flex flex-wrap items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg"
                >
                  {(['all', ...QAWMI_MARHALAS] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setFilterMarhala(m)}
                      className={`px-2.5 py-1.5 min-h-[34px] text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                        filterMarhala === m
                          ? 'bg-emerald-700 dark:bg-emerald-600 text-white'
                          : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      {m === 'all' ? td('All') : td(getShortMarhalaLabel(m))}
                    </button>
                  ))}
                </div>
              </div>

              <select
                aria-label={dt('Filter notices by focus branch', 'ফোকাস শাখা অনুযায়ী নোটিশ ফিল্টার করুন')}
                value={filterFocus}
                onChange={(e) => setFilterFocus(e.target.value as 'all' | QawmiFocusBranch)}
                className="px-3 py-1.5 min-h-[38px] bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-600"
              >
                <option value="all">{dt('All Focus / Branches', 'সব ফোকাস / শাখা')}</option>
                {QAWMI_FOCUS_BRANCHES.map((branch) => (
                  <option key={branch} value={branch}>
                    {td(branch)}
                  </option>
                ))}
              </select>

              <div className="relative">
                <Search
                  className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                  aria-hidden="true"
                />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={td('Search notices...')}
                  aria-label={dt('Search published notices', 'প্রকাশিত নোটিশ খুঁজুন')}
                  className="pl-8 pr-3 py-1.5 min-h-[38px] w-44 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Published Notice Cards */}
        {notices.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl px-6 py-12 text-center">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
              {dt(
                'No published Qawmi Madrasa notices match the selected filters.',
                'নির্বাচিত ফিল্টারের সাথে কোনো প্রকাশিত কওমি মাদ্রাসার নোটিশ মেলেনি।'
              )}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {dt(
                'Publish a new notice above or clear your audience and Marhala filters.',
                'উপরে একটি নতুন নোটিশ প্রকাশ করুন অথবা প্রাপক ও মারহালা ফিল্টার মুছুন।'
              )}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {notices.map((notice) => {
              const wasEdited = notice.updatedAt > notice.createdAt + 1000;
              return (
                <article
                  key={notice.id}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 transition-colors"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="space-y-2.5 min-w-0 flex-1">
                      <h3 className="text-base font-bold text-slate-900 dark:text-white leading-snug">
                        {notice.title}
                      </h3>

                      <div className="flex flex-wrap items-center gap-2">
                        {renderAudienceBadge(notice.audience)}
                        {(notice.marhala !== 'all' || notice.focusBranch !== 'all') && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                            {notice.marhala !== 'all'
                              ? td(getShortMarhalaLabel(notice.marhala))
                              : dt('All Marhalas', 'সব মারহালা')}
                            {notice.focusBranch !== 'all' ? ` • ${td(notice.focusBranch)}` : ''}
                          </span>
                        )}
                        {renderTagBadge(notice.tag)}
                      </div>

                      <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                        {notice.description}
                      </p>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-1 text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                        <span className="inline-flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                          <span>
                            {td('Published')} {formatDateTime(notice.createdAt)}
                          </span>
                        </span>
                        {wasEdited && (
                          <span>
                            · {td('Updated')} {formatDateTime(notice.updatedAt)}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-start">
                      <button
                        type="button"
                        onClick={() => openEdit(notice)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[36px] text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg transition-colors whitespace-nowrap"
                      >
                        <Edit3 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                        <span>{td('Edit')}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeletingNotice(notice)}
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
      </section>

      {/* MODAL: Edit Notice */}
      {editingNotice && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-[2px] overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget) setEditingNotice(null);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="qawmi-edit-notice-title"
            className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl overflow-hidden my-auto"
          >
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
              <h3
                id="qawmi-edit-notice-title"
                className="text-base font-bold text-slate-900 dark:text-white"
              >
                {td('Edit Notice')}
              </h3>
              <button
                type="button"
                onClick={() => setEditingNotice(null)}
                aria-label={td('Close modal')}
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
                  htmlFor="qawmi-edit-notice-title-input"
                  className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
                >
                  {td('Notice Title')}
                </label>
                <input
                  id="qawmi-edit-notice-title-input"
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 min-h-[42px] bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>

              <div>
                <label
                  htmlFor="qawmi-edit-notice-desc-input"
                  className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
                >
                  {td('Description')}
                </label>
                <textarea
                  id="qawmi-edit-notice-desc-input"
                  rows={4}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-600 leading-relaxed"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label
                    htmlFor="qawmi-edit-notice-audience"
                    className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
                  >
                    {td('Target Audience')}
                  </label>
                  <select
                    id="qawmi-edit-notice-audience"
                    value={editAudience}
                    onChange={(e) => setEditAudience(e.target.value as QawmiNoticeAudience)}
                    className="w-full px-3.5 py-2.5 min-h-[42px] bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  >
                    <option value="teacher">{td('Teachers Only')}</option>
                    <option value="student">{td('Students Only')}</option>
                    <option value="both">{td('Both')}</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="qawmi-edit-notice-tag"
                    className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
                  >
                    {td('Category / Tag')}
                  </label>
                  <select
                    id="qawmi-edit-notice-tag"
                    value={editTag}
                    onChange={(e) => setEditTag(e.target.value as QawmiNoticeTag)}
                    className="w-full px-3.5 py-2.5 min-h-[42px] bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  >
                    {NOTICE_TAGS.map((t) => (
                      <option key={t} value={t}>
                        {td(t)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label
                    htmlFor="qawmi-edit-notice-marhala"
                    className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
                  >
                    {dt('Marhala Scope', 'মারহালার পরিধি')}
                  </label>
                  <select
                    id="qawmi-edit-notice-marhala"
                    value={editMarhala}
                    onChange={(e) => setEditMarhala(e.target.value as 'all' | QawmiMarhala)}
                    className="w-full px-3.5 py-2.5 min-h-[42px] bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  >
                    <option value="all">{dt('All Marhalas', 'সব মারহালা')}</option>
                    {QAWMI_MARHALAS.map((m) => (
                      <option key={m} value={m}>
                        {td(m)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="qawmi-edit-notice-focus"
                    className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
                  >
                    {dt('Focus / Branch Scope', 'ফোকাস / শাখার পরিধি')}
                  </label>
                  <select
                    id="qawmi-edit-notice-focus"
                    value={editFocus}
                    onChange={(e) => setEditFocus(e.target.value as 'all' | QawmiFocusBranch)}
                    className="w-full px-3.5 py-2.5 min-h-[42px] bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  >
                    <option value="all">{dt('All Focus / Branches', 'সব ফোকাস / শাখা')}</option>
                    {QAWMI_FOCUS_BRANCHES.map((branch) => (
                      <option key={branch} value={branch}>
                        {td(branch)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingNotice(null)}
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

      {/* MODAL: Delete Notice Confirmation */}
      {deletingNotice && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-[2px]"
          onClick={(e) => {
            if (e.target === e.currentTarget) setDeletingNotice(null);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="qawmi-delete-notice-title"
            className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl p-6 space-y-4"
          >
            <div>
              <h3
                id="qawmi-delete-notice-title"
                className="text-base font-bold text-slate-900 dark:text-white"
              >
                {td('Delete Published Notice?')}
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1.5">
                {dt(
                  'This will permanently remove "{title}" from your Qawmi Madrasa notice board. This action cannot be undone.',
                  'এটি আপনার কওমি মাদ্রাসার নোটিশ বোর্ড থেকে "{title}" স্থায়ীভাবে সরিয়ে দেবে। এই কাজটি পূর্বাবস্থায় ফেরানো যাবে না।',
                  { title: deletingNotice.title }
                )}
              </p>
            </div>
            <div className="flex items-center justify-end gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setDeletingNotice(null)}
                className="px-4 py-2 min-h-[40px] text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg"
              >
                {td('Cancel')}
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2 min-h-[40px] text-sm font-semibold text-white bg-red-700 hover:bg-red-800 rounded-lg"
              >
                {td('Confirm Delete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
