import type { Coupon, CouponStatus } from '../types/domain';
import { getCouponRoleFromCode, isValidCouponFormat, normalizeCouponCode } from '../utils/validation';
import { loadDatabase, saveDatabase } from './storage';

const BENGALI_DIGITS = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'] as const;

function toAsciiDigits(input: string): string {
  return input.replace(/[০-৯]/g, (ch) => {
    const idx = BENGALI_DIGITS.indexOf(ch as (typeof BENGALI_DIGITS)[number]);
    return idx >= 0 ? String(idx) : ch;
  });
}

export const COUPON_TTL_MS = 48 * 60 * 60 * 1000; // 48 hours

export type CouponValidationError =
  | 'invalid_format'
  | 'not_found'
  | 'already_used'
  | 'expired';

export type CouponValidationResult =
  | { valid: true; coupon: Coupon; role: 'teacher' | 'student' }
  | { valid: false; error: CouponValidationError };

export interface CouponCountdown {
  expired: boolean;
  totalSeconds: number;
  hours: number;
  minutes: number;
  seconds: number;
  formatted: string;
}

function syncExpiredInList(coupons: Coupon[], now: number): boolean {
  let changed = false;
  for (const coupon of coupons) {
    if (coupon.status === 'active' && now >= coupon.expiresAt) {
      coupon.status = 'expired';
      changed = true;
    }
  }
  return changed;
}

function generateUniqueFiveDigits(existingDigits: Set<string>): string {
  // Deterministic-safe collision avoidance across all T- and S- coupons
  for (let attempt = 0; attempt < 500; attempt++) {
    const num = Math.floor(10000 + Math.random() * 90000);
    const digits = String(num);
    if (!existingDigits.has(digits)) {
      return digits;
    }
  }
  // Fallback sequential scan over 5-digit space if random space is saturated
  for (let n = 10000; n <= 99999; n++) {
    const digits = String(n);
    if (!existingDigits.has(digits)) {
      return digits;
    }
  }
  throw new Error('No unique 5-digit coupon codes available');
}

export const couponService = {
  listCoupons(now = Date.now()): Coupon[] {
    const db = loadDatabase(now);
    const changed = syncExpiredInList(db.coupons, now);
    if (changed) {
      saveDatabase(db);
    }
    return [...db.coupons].sort((a, b) => b.createdAt - a.createdAt);
  },

  filterCoupons(
    coupons: Coupon[],
    options: { status?: 'all' | CouponStatus; query?: string } = {}
  ): Coupon[] {
    const status = options.status ?? 'all';
    const rawQuery = toAsciiDigits(options.query ?? '').trim().toLowerCase();
    const compactQuery = rawQuery.replace(/[\s-]+/g, '');

    return coupons.filter((coupon) => {
      if (status !== 'all' && coupon.status !== status) {
        return false;
      }
      if (!rawQuery) {
        return true;
      }
      const codeLower = coupon.code.toLowerCase();
      const compactCode = codeLower.replace(/-/g, '');
      const roleKeywords =
        coupon.role === 'teacher' ? 'teacher শিক্ষক' : 'student শিক্ষার্থী';
      const statusKeywords =
        coupon.status === 'active'
          ? 'active সক্রিয়'
          : coupon.status === 'used'
            ? 'used redeemed ব্যবহৃত'
            : 'expired মেয়াদোত্তীর্ণ';

      return (
        codeLower.includes(rawQuery) ||
        compactCode.includes(compactQuery) ||
        coupon.digits.includes(compactQuery) ||
        roleKeywords.includes(rawQuery) ||
        statusKeywords.includes(rawQuery)
      );
    });
  },

  generateCoupon(role: 'teacher' | 'student', now = Date.now()): Coupon {
    const db = loadDatabase(now);
    syncExpiredInList(db.coupons, now);
    const existingDigits = new Set(db.coupons.map((c) => c.digits));
    const digits = generateUniqueFiveDigits(existingDigits);
    const prefix = role === 'teacher' ? 'T' : 'S';
    const coupon: Coupon = {
      code: `${prefix}-${digits}`,
      digits,
      role,
      createdAt: now,
      expiresAt: now + COUPON_TTL_MS,
      status: 'active',
    };
    db.coupons.unshift(coupon);
    saveDatabase(db);
    return coupon;
  },

  validateCoupon(rawCode: string, now = Date.now()): CouponValidationResult {
    const code = normalizeCouponCode(rawCode);
    if (!isValidCouponFormat(code)) {
      return { valid: false, error: 'invalid_format' };
    }

    const db = loadDatabase(now);
    const changed = syncExpiredInList(db.coupons, now);
    if (changed) {
      saveDatabase(db);
    }

    const coupon = db.coupons.find((c) => c.code === code);
    if (!coupon) {
      return { valid: false, error: 'not_found' };
    }
    if (coupon.status === 'used') {
      return { valid: false, error: 'already_used' };
    }
    if (coupon.status === 'expired' || now >= coupon.expiresAt) {
      if (coupon.status !== 'expired') {
        coupon.status = 'expired';
        saveDatabase(db);
      }
      return { valid: false, error: 'expired' };
    }

    const role = getCouponRoleFromCode(coupon.code) ?? coupon.role;
    return { valid: true, coupon, role };
  },

  markCouponUsed(rawCode: string, registrationId: string, now = Date.now()): Coupon {
    const code = normalizeCouponCode(rawCode);
    const db = loadDatabase(now);
    const coupon = db.coupons.find((c) => c.code === code);
    if (!coupon) {
      throw new Error('Coupon not found');
    }
    coupon.status = 'used';
    coupon.usedAt = now;
    coupon.usedByRegistrationId = registrationId;
    saveDatabase(db);
    return coupon;
  },

  getCountdown(expiresAt: number, now = Date.now()): CouponCountdown {
    const diffMs = Math.max(0, expiresAt - now);
    const totalSeconds = Math.floor(diffMs / 1000);
    if (totalSeconds <= 0) {
      return {
        expired: true,
        totalSeconds: 0,
        hours: 0,
        minutes: 0,
        seconds: 0,
        formatted: '00:00:00',
      };
    }
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const pad = (n: number) => String(n).padStart(2, '0');
    return {
      expired: false,
      totalSeconds,
      hours,
      minutes,
      seconds,
      formatted: `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`,
    };
  },
};
