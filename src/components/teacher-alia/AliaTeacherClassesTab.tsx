import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  BookOpen,
  CheckCircle2,
  Eye,
  EyeOff,
  PlusCircle,
  Search,
  Sparkles,
  Trash2,
} from 'lucide-react';
import {
  ALIA_TEACHER_MARHALA_OPTIONS,
  ALIA_TEACHER_MODULE_TYPES,
  getDepartmentsForAliaMarhala,
  getShortAliaMarhalaLabel,
  type AliaDepartment,
  type AliaMarhala,
  type AliaTeacherContext,
  type AliaTeacherModuleResource,
  type AliaTeacherModuleType,
} from '../../services/aliaTeacherService';

interface AliaTeacherClassesTabProps {
  teacher: AliaTeacherContext;
  modules: AliaTeacherModuleResource[];
  onCreateModule: (input: {
    marhala: AliaMarhala;
    department: AliaDepartment;
    title: string;
    type: AliaTeacherModuleType;
    summary: string;
    published: boolean;
  }) => { ok: true } | { ok: false; error: string };
  onTogglePublish: (moduleId: string) => void;
  onDeleteModule: (moduleId: string) => void;
  onDraftQuizForModule: (topic: string, marhala: AliaMarhala) => void;
}

export function AliaTeacherClassesTab({
  teacher,
  modules,
  onCreateModule,
  onTogglePublish,
  onDeleteModule,
  onDraftQuizForModule,
}: AliaTeacherClassesTabProps) {
  const defaultMarhala: AliaMarhala = teacher.assignedMarhalas[0] ?? 'Dakhil (Classes 6–10)';
  const defaultDepartments = getDepartmentsForAliaMarhala(defaultMarhala);

  const [title, setTitle] = useState('');
  const [marhala, setMarhala] = useState<AliaMarhala>(defaultMarhala);
  const [department, setDepartment] = useState<AliaDepartment>(
    defaultDepartments.includes(teacher.department) ? teacher.department : defaultDepartments[0]
  );
  const [type, setType] = useState<AliaTeacherModuleType>('Lesson Notes');
  const [summary, setSummary] = useState('');
  const [published, setPublished] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [marhalaFilter, setMarhalaFilter] = useState<'all' | AliaMarhala>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft'>('all');

  const departmentOptions = useMemo(() => getDepartmentsForAliaMarhala(marhala), [marhala]);

  const handleMarhalaChange = (nextMarhala: AliaMarhala) => {
    setMarhala(nextMarhala);
    const allowed = getDepartmentsForAliaMarhala(nextMarhala);
    if (!allowed.includes(department)) {
      setDepartment(allowed[0]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    const res = onCreateModule({
      marhala,
      department,
      title,
      type,
      summary,
      published,
    });
    if (!res.ok) {
      setFormError(res.error);
      return;
    }

    setTitle('');
    setSummary('');
    setFormSuccess(
      published
        ? 'Syllabus module published to Alia Madrasa students.'
        : 'Module saved as a draft in your Alia Madrasa library.'
    );
  };

  const filteredModules = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return modules.filter((mod) => {
      if (marhalaFilter !== 'all' && mod.marhala !== marhalaFilter) return false;
      if (statusFilter === 'published' && !mod.published) return false;
      if (statusFilter === 'draft' && mod.published) return false;
      if (q) {
        const hay = `${mod.title} ${mod.summary} ${mod.type} ${mod.marhala} ${mod.department}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [modules, searchQuery, marhalaFilter, statusFilter]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Publish / Create Module Composer */}
        <section className="lg:col-span-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-9 h-9 rounded-xl bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800 text-teal-700 dark:text-teal-300 flex items-center justify-center">
              <PlusCircle className="w-5 h-5" aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Publish Class Module
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Scoped to Alia Madrasa · {teacher.primarySubject}
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

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="alia-module-title"
                className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
              >
                Module / Kitab Guide Title
              </label>
              <input
                id="alia-module-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Sahih Bukhari: Kitab al-Wahy Board CQ Guide"
                className="w-full px-3.5 py-2.5 min-h-[42px] bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-600"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="alia-module-marhala"
                  className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
                >
                  Marhala / Level
                </label>
                <select
                  id="alia-module-marhala"
                  value={marhala}
                  onChange={(e) => handleMarhalaChange(e.target.value as AliaMarhala)}
                  className="w-full px-3 py-2.5 min-h-[42px] bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-600"
                >
                  {ALIA_TEACHER_MARHALA_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="alia-module-department"
                  className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
                >
                  Department / Stream
                </label>
                <select
                  id="alia-module-department"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value as AliaDepartment)}
                  className="w-full px-3 py-2.5 min-h-[42px] bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-600"
                >
                  {departmentOptions.map((dept) => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label
                htmlFor="alia-module-type"
                className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
              >
                Resource Type
              </label>
              <select
                id="alia-module-type"
                value={type}
                onChange={(e) => setType(e.target.value as AliaTeacherModuleType)}
                className="w-full px-3 py-2.5 min-h-[42px] bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-600"
              >
                {ALIA_TEACHER_MODULE_TYPES.map((resourceType) => (
                  <option key={resourceType} value={resourceType}>
                    {resourceType}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="alia-module-summary"
                className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
              >
                BMEB Syllabus Scope &amp; Learning Notes
              </label>
              <textarea
                id="alia-module-summary"
                rows={3}
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder="Summarize covered chapters, Arabic text references, or board exam questions..."
                className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-600 resize-y"
              />
            </div>

            <label className="flex items-center gap-2.5 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={published}
                onChange={(e) => setPublished(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-teal-700 focus:ring-teal-600"
              />
              <span>Publish immediately to Alia Madrasa students</span>
            </label>

            <button
              type="submit"
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 min-h-[44px] rounded-xl bg-teal-700 hover:bg-teal-800 dark:bg-teal-600 dark:hover:bg-teal-500 text-white text-sm font-semibold transition-colors"
            >
              <PlusCircle className="w-4 h-4" aria-hidden="true" />
              <span>{published ? 'Publish Module' : 'Save Draft'}</span>
            </button>
          </form>
        </section>

        {/* Published & Draft Library */}
        <section className="lg:col-span-7 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Alia Madrasa Module Library
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {modules.length} total resources · {modules.filter((m) => m.published).length}{' '}
                published
              </p>
            </div>

            <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-700 p-0.5 bg-slate-50 dark:bg-slate-800/80">
              {(['all', 'published', 'draft'] as const).map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => setStatusFilter(status)}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold capitalize transition-colors ${
                    statusFilter === status
                      ? 'bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-300 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
            <div className="sm:col-span-7 relative">
              <Search
                className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2"
                aria-hidden="true"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search modules, kitabs, or chapters..."
                className="w-full pl-9 pr-3.5 py-2 min-h-[40px] bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-600"
              />
            </div>

            <div className="sm:col-span-5">
              <select
                aria-label="Filter modules by Marhala"
                value={marhalaFilter}
                onChange={(e) => setMarhalaFilter(e.target.value as 'all' | AliaMarhala)}
                className="w-full px-3 py-2 min-h-[40px] bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-600"
              >
                <option value="all">All Marhalas</option>
                {ALIA_TEACHER_MARHALA_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {getShortAliaMarhalaLabel(option)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {filteredModules.length === 0 ? (
            <div className="py-12 text-center rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
              <BookOpen className="w-8 h-8 text-slate-400 mx-auto mb-2" aria-hidden="true" />
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                No Alia Madrasa modules match this filter
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Try clearing filters or publish a new lesson module on the left.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredModules.map((mod) => (
                <article
                  key={mod.id}
                  className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-3"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="space-y-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 text-[11px]">
                        <span
                          className={`px-2 py-0.5 rounded font-semibold ${
                            mod.published
                              ? 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300'
                              : 'bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300'
                          }`}
                        >
                          {mod.published ? 'Published' : 'Draft'}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-teal-100 dark:bg-teal-950/70 text-teal-800 dark:text-teal-300 font-semibold">
                          {getShortAliaMarhalaLabel(mod.marhala)} · {mod.department}
                        </span>
                        <span className="text-slate-500 dark:text-slate-400 font-medium">
                          {mod.type}
                        </span>
                      </div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                        {mod.title}
                      </h3>
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    {mod.summary}
                  </p>

                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => onDraftQuizForModule(mod.title, mod.marhala)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[34px] rounded-lg bg-white dark:bg-slate-900 border border-teal-200 dark:border-teal-800 hover:bg-teal-50 dark:hover:bg-teal-950/60 text-teal-700 dark:text-teal-300 text-xs font-semibold transition-colors"
                    >
                      <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Draft Quiz</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onTogglePublish(mod.id)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[34px] rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-colors"
                    >
                      {mod.published ? (
                        <>
                          <EyeOff className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>Unpublish</span>
                        </>
                      ) : (
                        <>
                          <Eye className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>Publish</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => onDeleteModule(mod.id)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[34px] rounded-lg bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-900/70 hover:bg-rose-50 dark:hover:bg-rose-950/50 text-rose-700 dark:text-rose-300 text-xs font-semibold transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Delete</span>
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
