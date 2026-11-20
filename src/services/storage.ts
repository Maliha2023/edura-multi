import type { AppDatabase, Coupon, PendingRegistration, UserAccount } from '../types/domain';
import { hashPassword } from '../utils/crypto';
import { DEFAULT_PATHWAY_OPTIONS, normalizeEducationStream } from '../utils/validation';

const STORAGE_KEY = 'edura_multi_db_v1';

// In-memory fallback for environments without localStorage (e.g. Node unit tests)
let memoryStorage: string | null = null;

function canUseLocalStorage(): boolean {
  try {
    return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
  } catch {
    return false;
  }
}

export function createSeedDatabase(now = Date.now()): AppDatabase {
  const hour = 60 * 60 * 1000;

  // Exactly 6 pre-created admin accounts with placeholder emails/phones and mustChangePassword = true.
  // Production auth will use Supabase Auth; passwords are stored only as hashes.
  const adminPasswordHash = hashPassword('Admin@1234');
  const admins: UserAccount[] = [1, 2, 3, 4, 5, 6].map((idx) => ({
    id: `admin-${idx}`,
    role: 'admin',
    fullName: `System Admin ${idx}`,
    email: `admin${idx}@example.com`,
    phone: `0170000000${idx}`,
    passwordHash: adminPasswordHash,
    mustChangePassword: true,
    preferredLanguage: 'en',
    createdAt: now - 30 * 24 * hour,
  }));

  // Seeded approved demo accounts for immediate dashboard & guard verification
  const demoUsers: UserAccount[] = [
    {
      id: 'student-demo-1',
      role: 'student',
      fullName: 'Nafisa Tasnim',
      email: 'nafisa@student.edu.bd',
      phone: '01812345678',
      passwordHash: hashPassword('Student@1234'),
      mustChangePassword: false,
      preferredLanguage: 'en',
      createdAt: now - 72 * hour,
      studentClass: 9,
      educationStream: 'Bangladesh National Curriculum (NCTB)',
      pathway: 'Science',
    },
    {
      id: 'teacher-demo-1',
      role: 'teacher',
      fullName: 'Kamrul Hasan',
      email: 'kamrul@school.edu.bd',
      phone: '01912345678',
      passwordHash: hashPassword('Teacher@1234'),
      mustChangePassword: false,
      preferredLanguage: 'bn',
      createdAt: now - 72 * hour,
      teacherId: 'TCH-2025-012',
    },
  ];

  // Seeded coupons (Active, Used, Expired) so /admin/coupons is immediately populated
  const coupons: Coupon[] = [
    {
      code: 'T-44910',
      digits: '44910',
      role: 'teacher',
      createdAt: now - 2 * hour,
      expiresAt: now + 46 * hour,
      status: 'active',
    },
    {
      code: 'S-55821',
      digits: '55821',
      role: 'student',
      createdAt: now - 4 * hour,
      expiresAt: now + 44 * hour,
      status: 'active',
    },
    {
      code: 'T-10482',
      digits: '10482',
      role: 'teacher',
      createdAt: now - 10 * hour,
      expiresAt: now + 38 * hour,
      status: 'used',
      usedAt: now - 6 * hour,
      usedByRegistrationId: 'reg-seed-teacher-1',
    },
    {
      code: 'S-20815',
      digits: '20815',
      role: 'student',
      createdAt: now - 8 * hour,
      expiresAt: now + 40 * hour,
      status: 'used',
      usedAt: now - 3 * hour,
      usedByRegistrationId: 'reg-seed-student-1',
    },
    {
      code: 'S-30119',
      digits: '30119',
      role: 'student',
      createdAt: now - 52 * hour,
      expiresAt: now - 4 * hour,
      status: 'expired',
    },
  ];

  // Seeded pending registrations (1 pending teacher, 1 pending student)
  const registrations: PendingRegistration[] = [
    {
      id: 'reg-seed-teacher-1',
      role: 'teacher',
      couponCode: 'T-10482',
      preferredLanguage: 'en',
      fullName: 'Farhana Rahman',
      email: 'farhana.rahman@dhakacollege.edu.bd',
      passwordHash: hashPassword('Farhana@2026'),
      teacherId: 'TCH-2026-041',
      status: 'pending',
      submittedAt: now - 6 * hour,
      editHistory: [],
    },
    {
      id: 'reg-seed-student-1',
      role: 'student',
      couponCode: 'S-20815',
      preferredLanguage: 'bn',
      fullName: 'Tanvir Ahmed',
      email: 'tanvir.ahmed@student.edu.bd',
      phone: '01711223344',
      passwordHash: hashPassword('Tanvir@2026'),
      studentClass: 10,
      educationStream: 'International Curriculum (English Medium)',
      pathway: 'Science',
      status: 'pending',
      submittedAt: now - 3 * hour,
      editHistory: [],
    },
  ];

  return {
    users: [...admins, ...demoUsers],
    coupons,
    registrations,
    session: null,
    loginLocks: {},
    pathwayOptions: [...DEFAULT_PATHWAY_OPTIONS],
    deviceSessions: [],
  };
}

export function loadDatabase(now = Date.now()): AppDatabase {
  let raw: string | null = null;
  if (canUseLocalStorage()) {
    raw = window.localStorage.getItem(STORAGE_KEY);
  } else {
    raw = memoryStorage;
  }

  if (!raw) {
    const seeded = createSeedDatabase(now);
    saveDatabase(seeded);
    return seeded;
  }

  try {
    const parsed = JSON.parse(raw) as AppDatabase;
    if (!parsed || !Array.isArray(parsed.users) || !Array.isArray(parsed.coupons)) {
      const seeded = createSeedDatabase(now);
      saveDatabase(seeded);
      return seeded;
    }
    let migrated = false;
    parsed.users = parsed.users.map((u) => {
      if (!u.educationStream) return u;
      const normalized = normalizeEducationStream(u.educationStream);
      if (normalized && normalized !== u.educationStream) {
        migrated = true;
        return { ...u, educationStream: normalized };
      }
      return u;
    });
    if (Array.isArray(parsed.registrations)) {
      parsed.registrations = parsed.registrations.map((r) => {
        if (!r.educationStream) return r;
        const normalized = normalizeEducationStream(r.educationStream);
        if (normalized && normalized !== r.educationStream) {
          migrated = true;
          return { ...r, educationStream: normalized };
        }
        return r;
      });
    }
    if (!Array.isArray(parsed.deviceSessions)) {
      parsed.deviceSessions = [];
      migrated = true;
    }
    if (migrated) {
      saveDatabase(parsed);
    }
    return parsed;
  } catch {
    const seeded = createSeedDatabase(now);
    saveDatabase(seeded);
    return seeded;
  }
}

export function saveDatabase(db: AppDatabase): void {
  const serialized = JSON.stringify(db);
  if (canUseLocalStorage()) {
    window.localStorage.setItem(STORAGE_KEY, serialized);
  } else {
    memoryStorage = serialized;
  }
}

export function resetDatabase(now = Date.now()): AppDatabase {
  const seeded = createSeedDatabase(now);
  saveDatabase(seeded);
  return seeded;
}
