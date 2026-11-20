export type Language = 'en' | 'bn';

export type UserRole = 'student' | 'teacher' | 'admin';

export type CouponStatus = 'active' | 'used' | 'expired';

export type EducationStream =
  | 'Bangladesh National Curriculum (NCTB)'
  | 'International Curriculum (English Medium)'
  | 'Bangladesh Madrasa Education';

export type CurriculumSubTrack =
  | 'Bangla Version'
  | 'English Version'
  | 'Cambridge'
  | 'Edexcel'
  | 'Alia'
  | 'Qawmi';

export type StudentClass = 6 | 7 | 8 | 9 | 10 | 11 | 12;

export type RegistrationStatus = 'pending' | 'approved' | 'rejected';

export interface UserAccount {
  id: string;
  role: UserRole;
  fullName: string;
  email: string;
  phone?: string;
  // Stored as a salted hash placeholder only; never plain-text.
  // Production auth will use Supabase Auth.
  passwordHash: string;
  mustChangePassword: boolean;
  preferredLanguage: Language;
  createdAt: number;
  // Teacher-specific metadata
  teacherId?: string;
  // Student-specific metadata
  studentClass?: StudentClass;
  educationStream?: EducationStream;
  pathway?: string;
}

export interface Coupon {
  code: string; // T-12345 or S-12345
  digits: string; // 5 digits, unique across all coupons
  role: 'teacher' | 'student';
  createdAt: number;
  expiresAt: number;
  status: CouponStatus;
  usedAt?: number;
  usedByRegistrationId?: string;
}

export interface EditHistoryEntry {
  id: string;
  field: string;
  oldValue: string;
  newValue: string;
  editedAt: number;
}

export interface PendingRegistration {
  id: string;
  role: 'teacher' | 'student';
  couponCode: string;
  preferredLanguage: Language;
  fullName: string;
  email: string;
  phone?: string;
  // Stored as a salted hash placeholder only; never plain-text or shown to admins.
  passwordHash: string;
  // Teacher fields
  teacherId?: string;
  // Student fields
  studentClass?: StudentClass;
  educationStream?: EducationStream;
  pathway?: string;
  status: RegistrationStatus;
  submittedAt: number;
  reviewedAt?: number;
  rejectionReason?: string;
  editHistory: EditHistoryEntry[];
}

export interface DeviceSession {
  id: string;
  userId: string;
  deviceName: string;
  deviceType: 'desktop' | 'mobile' | 'tablet';
  browser: string;
  location: string;
  lastActiveAt: number;
  isCurrent: boolean;
}

export interface AuthSession {
  userId: string;
  role: UserRole;
  fullName: string;
  email: string;
  phone?: string;
  mustChangePassword: boolean;
  preferredLanguage: Language;
  selectedStream?: EducationStream;
  selectedPathway?: CurriculumSubTrack;
  loggedInAt: number;
}

export interface LoginLockState {
  failedAttempts: number;
  lockedUntil: number | null;
}

export interface AppDatabase {
  users: UserAccount[];
  coupons: Coupon[];
  registrations: PendingRegistration[];
  session: AuthSession | null;
  loginLocks: Record<string, LoginLockState>;
  pathwayOptions: string[];
  deviceSessions?: DeviceSession[];
}
