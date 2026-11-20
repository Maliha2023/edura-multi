import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  Bell,
  CheckCircle2,
  Eye,
  Megaphone,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import {
  QAWMI_TEACHER_ANNOUNCEMENT_TAGS,
  QAWMI_TEACHER_FOCUS_OPTIONS,
  QAWMI_TEACHER_MARHALA_OPTIONS,
  getShortQawmiTeacherMarhalaLabel,
  type QawmiNoticeTag,
  type QawmiOfficialNotice,
  type QawmiTeacherAnnouncementTag,
  type QawmiTeacherClassAnnouncement,
  type QawmiTeacherContext,
  type QawmiTeacherFocusBranch,
  type QawmiTeacherMarhala,
} from '../../services/qawmiTeacherService';

interface QawmiTeacherNoticesTabProps {
  teacher: QawmiTeacherContext;
  officialNotices: QawmiOfficialNotice[];
  classAnnouncements: QawmiTeacherClassAnnouncement[];
  onPostAnnouncement: (input: {
    marhala: QawmiTeacherMarhala;
    focusBranch: QawmiTeacherFocusBranch;
    title: string;
    message: string;
    tag: QawmiTeacherAnnouncementTag;
  }) => { ok: true } | { ok: false; error: string };
  onDeleteAnnouncement: (announcementId: string) => void;
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function QawmiTeacherNoticesTab({
  teacher,
  officialNotices,
  classAnnouncements,
  onPostAnnouncement,
  onDeleteAnnouncement,
}: QawmiTeacherNoticesTabProps) {
  const defaultMarhala: QawmiTeacherMarhala =
    teacher.assignedMarhalas[0] ?? 'Mutawassitah (Middle Marhala)';

  // Official Notices filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [audienceFilter, setAudienceFilter] = useState<'all' | 'teacher' | 'both'>('all');
  const [tagFilter, setTagFilter] = useState<'all' | QawmiNoticeTag>('all');
  const [readingNotice, setReadingNotice] = useState<QawmiOfficialNotice | null>(null);

  // Class Announcement composer state
  const [marhala, setMarhala] = useState<QawmiTeacherMarhala>(defaultMarhala);
  const [focusBranch, setFocusBranch] = useState<QawmiTeacherFocusBranch>(teacher.focusBranch);
  const [tag, setTag] = useState<QawmiTeacherAnnouncementTag>('Dars Update');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  const filteredOfficialNotices = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return officialNotices.filter((n) => {
      if (audienceFilter !== 'all' && n.audience !== audienceFilter) return false;
      if (tagFilter !== 'all' && n.tag !== tagFilter) return false;
      if (q) {
        const hay = `${n.title} ${n.description} ${n.tag}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [officialNotices, searchQuery, audienceFilter, tagFilter]);

  const handlePostSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    const res = onPostAnnouncement({
      marhala,
      focusBranch,
      title,
      message,
      tag,
    });
    if (!res.ok) {
      setFormError(res.error);
      return;
    }

    setTitle('');
    setMessage('');
    setFormSuccess(
      `Class announcement posted for ${getShortQawmiTeacherMarhalaLabel(marhala)} (${focusBranch}).`
    );
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Official Qawmi Admin Circulars */}
        <section className="lg:col-span-7 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 space-y-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Official Qawmi Admin Notices
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Circulars targeted to Teachers Only or All Qawmi Madrasa Members
              </p>
            </div>
            <Bell className="w-5 h-5 text-teal-600 dark:text-teal-400 shrink-0" aria-hidden="true" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
            <div className="sm:col-span-5 relative">
              <Search
                className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2"
                aria-hidden="true"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search notices..."
                className="w-full pl-9 pr-3 py-2 min-h-[40px] bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-600"
              />
            </div>

            <div className="sm:col-span-4">
              <select
                aria-label="Filter notices by audience"
                value={audienceFilter}
                onChange={(e) =>
                  setAudienceFilter(e.target.value as 'all' | 'teacher' | 'both')
                }
                className="w-full px-3 py-2 min-h-[40px] bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-600"
              >
                <option value="all">All Audiences</option>
                <option value="teacher">Teachers Only</option>
                <option value="both">General (Both)</option>
              </select>
            </div>

            <div className="sm:col-span-3">
              <select
                aria-label="Filter notices by tag"
                value={tagFilter}
                onChange={(e) => setTagFilter(e.target.value as 'all' | QawmiNoticeTag)}
                className="w-full px-3 py-2 min-h-[40px] bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-600"
              >
                <option value="all">All Tags</option>
                <option value="General">General</option>
                <option value="Exam">Exam</option>
                <option value="Urgent">Urgent</option>
              </select>
            </div>
          </div>

          {filteredOfficialNotices.length === 0 ? (
            <div className="py-10 text-center rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                No official notices match your filter
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredOfficialNotices.map((notice) => (
                <article
                  key={notice.id}
                  className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-2"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded font-semibold ${
                          notice.tag === 'Urgent'
                            ? 'bg-rose-100 dark:bg-rose-950/70 text-rose-800 dark:text-rose-300'
                            : notice.tag === 'Exam'
                              ? 'bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300'
                              : 'bg-teal-100 dark:bg-teal-950/70 text-teal-800 dark:text-teal-300'
                        }`}
                      >
                        {notice.tag}
                      </span>
                      <span className="font-semibold text-slate-600 dark:text-slate-300">
                        {notice.audience === 'teacher' ? 'Teachers Only' : 'General (Both)'}
                      </span>
                    </div>
                    <span className="text-slate-500 dark:text-slate-400">
                      {formatDate(notice.createdAt)}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    {notice.title}
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed line-clamp-2">
                    {notice.description}
                  </p>

                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={() => setReadingNotice(notice)}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal-700 dark:text-teal-400 hover:underline underline-offset-4"
                    >
                      <Eye className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Read Full Notice</span>
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        {/* Post Class Announcement + Feed */}
        <div className="lg:col-span-5 space-y-6">
          <section className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-9 h-9 rounded-xl bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800 text-teal-700 dark:text-teal-300 flex items-center justify-center shrink-0">
                <Megaphone className="w-4 h-4" aria-hidden="true" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Post Class Announcement
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Notify your Qawmi Madrasa Jamaat students
                </p>
              </div>
            </div>

            {formError && (
              <div
                role="alert"
                className="mb-4 flex items-start gap-2.5 p-3 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-red-900 dark:text-red-200 text-xs"
              >
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
                <span>{formError}</span>
              </div>
            )}

            {formSuccess && (
              <div
                role="status"
                className="mb-4 flex items-start gap-2.5 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 text-xs"
              >
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
                <span>{formSuccess}</span>
              </div>
            )}

            <form onSubmit={handlePostSubmit} className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="qawmi-ann-marhala"
                    className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
                  >
                    Target Marhala
                  </label>
                  <select
                    id="qawmi-ann-marhala"
                    value={marhala}
                    onChange={(e) => setMarhala(e.target.value as QawmiTeacherMarhala)}
                    className="w-full px-3 py-2 min-h-[40px] bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-600"
                  >
                    {QAWMI_TEACHER_MARHALA_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="qawmi-ann-focus"
                    className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
                  >
                    Focus / Branch
                  </label>
                  <select
                    id="qawmi-ann-focus"
                    value={focusBranch}
                    onChange={(e) => setFocusBranch(e.target.value as QawmiTeacherFocusBranch)}
                    className="w-full px-3 py-2 min-h-[40px] bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-600"
                  >
                    {QAWMI_TEACHER_FOCUS_OPTIONS.map((branch) => (
                      <option key={branch} value={branch}>
                        {branch}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label
                  htmlFor="qawmi-ann-tag"
                  className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
                >
                  Category Tag
                </label>
                <select
                  id="qawmi-ann-tag"
                  value={tag}
                  onChange={(e) => setTag(e.target.value as QawmiTeacherAnnouncementTag)}
                  className="w-full px-3 py-2 min-h-[40px] bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-600"
                >
                  {QAWMI_TEACHER_ANNOUNCEMENT_TAGS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="qawmi-ann-title"
                  className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
                >
                  Announcement Title
                </label>
                <input
                  id="qawmi-ann-title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Maghrib Takrar: Hidayatun Nahw Tarkeeb Review"
                  className="w-full px-3 py-2 min-h-[40px] bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-600"
                />
              </div>

              <div>
                <label
                  htmlFor="qawmi-ann-message"
                  className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
                >
                  Message
                </label>
                <textarea
                  id="qawmi-ann-message"
                  rows={3}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Write clear Dars, Sabak, or Takrar instructions for your Talaba..."
                  className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-600 resize-y"
                />
              </div>

              <button
                type="submit"
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 min-h-[42px] rounded-xl bg-teal-700 hover:bg-teal-800 dark:bg-teal-600 dark:hover:bg-teal-500 text-white text-sm font-semibold transition-colors whitespace-nowrap"
              >
                <Megaphone className="w-4 h-4" aria-hidden="true" />
                <span>Post Class Announcement</span>
              </button>
            </form>
          </section>

          {/* Posted Class Announcements Feed */}
          <section className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Posted Class Announcements ({classAnnouncements.length})
            </h3>
            {classAnnouncements.length === 0 ? (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                No class announcements posted yet.
              </p>
            ) : (
              <div className="space-y-3">
                {classAnnouncements.map((ann) => (
                  <div
                    key={ann.id}
                    className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-1.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                        <span className="px-2 py-0.5 rounded bg-teal-100 dark:bg-teal-950/70 text-teal-800 dark:text-teal-300 font-semibold">
                          {ann.tag}
                        </span>
                        <span className="text-slate-500 dark:text-slate-400 font-medium">
                          {getShortQawmiTeacherMarhalaLabel(ann.marhala)} · {ann.focusBranch}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => onDeleteAnnouncement(ann.id)}
                        aria-label={`Delete announcement ${ann.title}`}
                        className="text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                      </button>
                    </div>
                    <p className="text-xs font-bold text-slate-900 dark:text-white">{ann.title}</p>
                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                      {ann.message}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>

      {/* Full Notice Reader Modal */}
      {readingNotice && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-[2px]"
          onClick={(e) => {
            if (e.target === e.currentTarget) setReadingNotice(null);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="qawmi-notice-reader-title"
            className="w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden"
          >
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 text-xs mb-1">
                  <span className="px-2 py-0.5 rounded bg-teal-100 dark:bg-teal-950/70 text-teal-800 dark:text-teal-300 font-semibold">
                    {readingNotice.tag}
                  </span>
                  <span className="text-slate-500 dark:text-slate-400">
                    {readingNotice.audience === 'teacher' ? 'Teachers Only' : 'General (Both)'} ·{' '}
                    {formatDate(readingNotice.createdAt)}
                  </span>
                </div>
                <h3
                  id="qawmi-notice-reader-title"
                  className="text-base font-bold text-slate-900 dark:text-white"
                >
                  {readingNotice.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setReadingNotice(null)}
                aria-label="Close notice"
                className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                {readingNotice.description}
              </p>
              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span>Pathway: Qawmi Madrasa</span>
                <button
                  type="button"
                  onClick={() => setReadingNotice(null)}
                  className="px-4 py-2 rounded-lg bg-slate-900 dark:bg-slate-700 text-white font-semibold"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
