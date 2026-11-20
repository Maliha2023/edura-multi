import type { CurriculumSubTrack } from '../types/domain';

export type NoticePathway = 'bangla_version' | 'english_version';
export type NoticeAudience = 'teacher' | 'student' | 'both';
export type NoticeClassLevel = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;
export type NoticeGroup = 'Science' | 'Arts' | 'Commerce';
export type NoticeCategoryTag = 'General' | 'Academic' | 'Urgent';

export const NOTICE_CLASSES: NoticeClassLevel[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
export const NOTICE_GROUPS: NoticeGroup[] = ['Science', 'Arts', 'Commerce'];
export const NOTICE_TAGS: NoticeCategoryTag[] = ['General', 'Academic', 'Urgent'];

export interface PathwayNotice {
  id: string;
  pathway: NoticePathway;
  title: string;
  description: string;
  targetAudience: NoticeAudience;
  targetClass: NoticeClassLevel | null; // null => All Classes (when student/both) or N/A (when teacher)
  targetGroup: NoticeGroup | null; // null => All Groups (or N/A)
  categoryTag: NoticeCategoryTag | null;
  createdAt: number;
  updatedAt: number;
}

export interface NoticeMutationInput {
  title: string;
  description: string;
  targetAudience: NoticeAudience;
  targetClass: NoticeClassLevel | null;
  targetGroup: NoticeGroup | null;
  categoryTag: NoticeCategoryTag | null;
}

export interface NoticeFilterCriteria {
  audience?: NoticeAudience | 'all';
  group?: NoticeGroup | 'all';
}

const NOTICES_STORAGE_KEY = 'edura_admin_notices_workspace_v1';
let memoryNoticesStore: string | null = null;

function canUseLocalStorage(): boolean {
  try {
    return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
  } catch {
    return false;
  }
}

export function resolveNoticePathway(
  selectedPathway?: CurriculumSubTrack
): NoticePathway | null {
  if (!selectedPathway || selectedPathway === 'Bangla Version') {
    return 'bangla_version';
  }
  if (selectedPathway === 'English Version') {
    return 'english_version';
  }
  return null;
}

export function getNoticePathwayLabel(pathway: NoticePathway): string {
  return pathway === 'bangla_version' ? 'Bangla Version' : 'English Version';
}

export function canNoticeCarryAcademicScope(audience: NoticeAudience): boolean {
  return audience === 'student' || audience === 'both';
}

export function canClassCarryGroupScope(targetClass: NoticeClassLevel | null): boolean {
  // All Classes (null) may filter by senior group; specific classes 9-12 may carry a group.
  return targetClass === null || (targetClass >= 9 && targetClass <= 12);
}

export function normalizeNoticeAcademicScope(
  audience: NoticeAudience,
  targetClass: NoticeClassLevel | null,
  targetGroup: NoticeGroup | null
): { targetClass: NoticeClassLevel | null; targetGroup: NoticeGroup | null } {
  if (!canNoticeCarryAcademicScope(audience)) {
    return { targetClass: null, targetGroup: null };
  }
  const normalizedClass =
    targetClass !== null && targetClass >= 1 && targetClass <= 12 ? targetClass : null;
  const normalizedGroup =
    canClassCarryGroupScope(normalizedClass) &&
    (targetGroup === 'Science' || targetGroup === 'Arts' || targetGroup === 'Commerce')
      ? targetGroup
      : null;
  return {
    targetClass: normalizedClass,
    targetGroup: normalizedGroup,
  };
}

export function formatNoticeAcademicScope(notice: PathwayNotice): string | null {
  if (!canNoticeCarryAcademicScope(notice.targetAudience)) {
    return null;
  }
  const classPart = notice.targetClass !== null ? `Class ${notice.targetClass}` : 'All Classes';
  if (notice.targetGroup) {
    return `${classPart} • ${notice.targetGroup}`;
  }
  return classPart;
}

function createSeedNotices(now = Date.now()): PathwayNotice[] {
  const hour = 60 * 60 * 1000;
  const day = 24 * hour;

  return [
    // Bangla Version Notices
    {
      id: 'ntc-bv-1',
      pathway: 'bangla_version',
      title: 'SSC Pre-Test Practical Lab Schedule Published',
      description:
        'Physics, Chemistry, and Biology practical examinations for Class 10 Science students will begin next Sunday at 9:30 AM. Bring signed lab notebooks and admit cards.',
      targetAudience: 'student',
      targetClass: 10,
      targetGroup: 'Science',
      categoryTag: 'Academic',
      createdAt: now - 3 * hour,
      updatedAt: now - 3 * hour,
    },
    {
      id: 'ntc-bv-2',
      pathway: 'bangla_version',
      title: 'Term-End Question Paper Moderation Meeting',
      description:
        'All Bangla Version subject teachers are requested to attend the question moderation briefing in the Academic Conference Room on Thursday at 2:00 PM.',
      targetAudience: 'teacher',
      targetClass: null,
      targetGroup: null,
      categoryTag: 'Urgent',
      createdAt: now - 11 * hour,
      updatedAt: now - 8 * hour,
    },
    {
      id: 'ntc-bv-3',
      pathway: 'bangla_version',
      title: 'Updated Campus Timing During Winter Schedule',
      description:
        'Effective from the first week of December, morning assembly starts at 8:15 AM and regular classes run until 1:45 PM for all Bangla Version classes.',
      targetAudience: 'both',
      targetClass: null,
      targetGroup: null,
      categoryTag: 'General',
      createdAt: now - 2 * day,
      updatedAt: now - 2 * day,
    },
    {
      id: 'ntc-bv-4',
      pathway: 'bangla_version',
      title: 'Accounting & Finance Case Workshop for HSC Batch',
      description:
        'Class 11 Commerce students will participate in a guided ledger and financial statement clinic this Tuesday during periods 5 and 6.',
      targetAudience: 'student',
      targetClass: 11,
      targetGroup: 'Commerce',
      categoryTag: 'Academic',
      createdAt: now - 4 * day,
      updatedAt: now - 4 * day,
    },

    // English Version Notices
    {
      id: 'ntc-ev-1',
      pathway: 'english_version',
      title: 'English Version Science Olympiad Registration Open',
      description:
        'Class 9 and Class 10 Science students under the English Version panel can register for the regional Science Olympiad through their homeroom mentors by Friday.',
      targetAudience: 'student',
      targetClass: 10,
      targetGroup: 'Science',
      categoryTag: 'Academic',
      createdAt: now - 4 * hour,
      updatedAt: now - 4 * hour,
    },
    {
      id: 'ntc-ev-2',
      pathway: 'english_version',
      title: 'English Version Faculty Rubric Alignment Workshop',
      description:
        'All English Version faculty members should submit draft continuous assessment rubrics before Monday 4:00 PM for quality review.',
      targetAudience: 'teacher',
      targetClass: null,
      targetGroup: null,
      categoryTag: 'Urgent',
      createdAt: now - 1 * day,
      updatedAt: now - 1 * day,
    },
    {
      id: 'ntc-ev-3',
      pathway: 'english_version',
      title: 'Parent–Teacher Progress Review Day (English Version)',
      description:
        'Mid-term progress reports will be shared with parents and guardians this Saturday between 10:00 AM and 2:00 PM across all English Version classrooms.',
      targetAudience: 'both',
      targetClass: null,
      targetGroup: null,
      categoryTag: 'General',
      createdAt: now - 3 * day,
      updatedAt: now - 3 * day,
    },
  ];
}

function loadNoticesStore(now = Date.now()): PathwayNotice[] {
  const raw = canUseLocalStorage()
    ? window.localStorage.getItem(NOTICES_STORAGE_KEY)
    : memoryNoticesStore;

  if (!raw) {
    const seeded = createSeedNotices(now);
    saveNoticesStore(seeded);
    return seeded;
  }

  try {
    const parsed = JSON.parse(raw) as PathwayNotice[];
    if (!Array.isArray(parsed)) {
      const seeded = createSeedNotices(now);
      saveNoticesStore(seeded);
      return seeded;
    }
    return parsed;
  } catch {
    const seeded = createSeedNotices(now);
    saveNoticesStore(seeded);
    return seeded;
  }
}

function saveNoticesStore(notices: PathwayNotice[]): void {
  const serialized = JSON.stringify(notices);
  if (canUseLocalStorage()) {
    window.localStorage.setItem(NOTICES_STORAGE_KEY, serialized);
  } else {
    memoryNoticesStore = serialized;
  }
}

export function resetAdminNoticesStore(now = Date.now()): PathwayNotice[] {
  const seeded = createSeedNotices(now);
  saveNoticesStore(seeded);
  return seeded;
}

function validateNoticeInput(input: NoticeMutationInput): string | null {
  if (input.title.trim().length < 2) {
    return 'Please enter a notice title (at least 2 characters).';
  }
  if (input.description.trim().length < 5) {
    return 'Please enter a notice description (at least 5 characters).';
  }
  return null;
}

function generateNoticeId(pathway: NoticePathway): string {
  const code = pathway === 'bangla_version' ? 'bv' : 'ev';
  return `ntc-${code}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

export const adminNoticesService = {
  listNotices(pathway: NoticePathway, now = Date.now()): PathwayNotice[] {
    const all = loadNoticesStore(now);
    return all
      .filter((n) => n.pathway === pathway)
      .sort((a, b) => b.createdAt - a.createdAt);
  },

  filterNotices(
    notices: PathwayNotice[],
    criteria: NoticeFilterCriteria
  ): PathwayNotice[] {
    return notices.filter((notice) => {
      if (criteria.audience && criteria.audience !== 'all') {
        if (notice.targetAudience !== criteria.audience) return false;
      }
      if (criteria.group && criteria.group !== 'all') {
        if (!canNoticeCarryAcademicScope(notice.targetAudience)) return false;
        if (notice.targetGroup !== criteria.group) return false;
      }
      return true;
    });
  },

  createNotice(
    pathway: NoticePathway,
    input: NoticeMutationInput,
    now = Date.now()
  ): { ok: true; notice: PathwayNotice } | { ok: false; error: string } {
    const err = validateNoticeInput(input);
    if (err) return { ok: false, error: err };

    const scope = normalizeNoticeAcademicScope(
      input.targetAudience,
      input.targetClass,
      input.targetGroup
    );

    const notice: PathwayNotice = {
      id: generateNoticeId(pathway),
      pathway,
      title: input.title.trim(),
      description: input.description.trim(),
      targetAudience: input.targetAudience,
      targetClass: scope.targetClass,
      targetGroup: scope.targetGroup,
      categoryTag: input.categoryTag ?? null,
      createdAt: now,
      updatedAt: now,
    };

    const all = loadNoticesStore(now);
    all.unshift(notice);
    saveNoticesStore(all);

    return { ok: true, notice };
  },

  updateNotice(
    pathway: NoticePathway,
    id: string,
    input: NoticeMutationInput,
    now = Date.now()
  ): { ok: true; notice: PathwayNotice } | { ok: false; error: string } {
    const err = validateNoticeInput(input);
    if (err) return { ok: false, error: err };

    const all = loadNoticesStore(now);
    const target = all.find((n) => n.id === id && n.pathway === pathway);
    if (!target) {
      return { ok: false, error: 'Notice not found in your active pathway.' };
    }

    const scope = normalizeNoticeAcademicScope(
      input.targetAudience,
      input.targetClass,
      input.targetGroup
    );

    target.title = input.title.trim();
    target.description = input.description.trim();
    target.targetAudience = input.targetAudience;
    target.targetClass = scope.targetClass;
    target.targetGroup = scope.targetGroup;
    target.categoryTag = input.categoryTag ?? null;
    target.updatedAt = now;

    saveNoticesStore(all);
    return { ok: true, notice: { ...target } };
  },

  deleteNotice(
    pathway: NoticePathway,
    id: string,
    now = Date.now()
  ): { ok: true } | { ok: false; error: string } {
    const all = loadNoticesStore(now);
    const idx = all.findIndex((n) => n.id === id && n.pathway === pathway);
    if (idx === -1) {
      return { ok: false, error: 'Notice not found in your active pathway.' };
    }
    all.splice(idx, 1);
    saveNoticesStore(all);
    return { ok: true };
  },
};
