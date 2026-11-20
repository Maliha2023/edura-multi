import { beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';

// Provide a clean in-memory localStorage shim so cross-service persistence with
// edura_international_admin_workspace_v2 is tested authentically in Node.
const storageMap = new Map<string, string>();
const localStorageShim = {
  getItem: (key: string) => storageMap.get(key) ?? null,
  setItem: (key: string, value: string) => {
    storageMap.set(key, String(value));
  },
  removeItem: (key: string) => {
    storageMap.delete(key);
  },
  clear: () => {
    storageMap.clear();
  },
};

(globalThis as unknown as { window?: { localStorage: typeof localStorageShim } }).window = {
  localStorage: localStorageShim,
};

import {
  internationalAdminService,
  LOWER_SECONDARY_LEVEL,
  resetInternationalAdminStore,
} from './internationalAdminService';
import {
  formatIntlStudentContextBadge,
  getDemoIntlStudentPreset,
  getIntlSubjectsForStudent,
  internationalStudentService,
} from './internationalStudentService';
import { authService } from './authService';
import { resetDatabase } from './storage';

const FIXED_NOW = Date.UTC(2026, 4, 15, 10, 0, 0);

describe('internationalStudentService — Cambridge & Edexcel Student Experience', () => {
  beforeEach(() => {
    storageMap.clear();
    resetDatabase();
    resetInternationalAdminStore(FIXED_NOW);
  });

  it('validates S-XXXXX student coupons with strict role, pathway, used, and expiry checks', () => {
    // Valid Cambridge student coupon
    const okCam = internationalStudentService.validateIntlStudentCoupon(
      'S-61488',
      'cambridge',
      FIXED_NOW
    );
    assert.equal(okCam.ok, true);
    assert.equal(okCam.coupon?.code, 'S-61488');

    // Cross-pathway rejection (Edexcel coupon in Cambridge)
    const crossPath = internationalStudentService.validateIntlStudentCoupon(
      'S-82903',
      'cambridge',
      FIXED_NOW
    );
    assert.equal(crossPath.ok, false);
    assert.match(crossPath.message, /belongs to Edexcel, not Cambridge/i);

    // Wrong role rejection (Teacher coupon T-XXXXX)
    const wrongRole = internationalStudentService.validateIntlStudentCoupon(
      'T-61204',
      'cambridge',
      FIXED_NOW
    );
    assert.equal(wrongRole.ok, false);
    assert.match(wrongRole.message, /Teacher coupon/i);

    // Expired coupon rejection
    const expired = internationalStudentService.validateIntlStudentCoupon(
      'S-60912',
      'cambridge',
      FIXED_NOW
    );
    assert.equal(expired.ok, false);
    assert.match(expired.message, /expired/i);

    // Used coupon rejection
    const used = internationalStudentService.validateIntlStudentCoupon(
      'S-82055',
      'edexcel',
      FIXED_NOW
    );
    assert.equal(used.ok, false);
    assert.match(used.message, /already been redeemed/i);
  });

  it('submits Grade 1-8 registration with auto General track and queues into Admin Pending Approvals', () => {
    const res = internationalStudentService.submitIntlStudentCouponRegistration(
      {
        pathway: 'cambridge',
        couponCode: 'S-61488',
        fullName: 'Nadia Chowdhury',
        email: 'nadia.c@cambridge-student.edu.bd',
        password: 'Password@123',
        academicLevel: LOWER_SECONDARY_LEVEL,
        academicTrack: 'Science', // Should auto-normalize to General for Grade 1-8
      },
      FIXED_NOW
    );

    assert.equal(res.ok, true);
    if (res.ok) {
      assert.equal(res.registration.academicTrack, 'General');
      assert.equal(res.registration.couponCode, 'S-61488');
    }

    // Verify immediate visibility in Cambridge Admin pending student queue
    const camPending = internationalAdminService.listPending('cambridge', 'student', FIXED_NOW);
    assert.ok(camPending.some((p) => p.email === 'nadia.c@cambridge-student.edu.bd'));

    // Verify NOT leaked to Edexcel Admin pending queue
    const edxPending = internationalAdminService.listPending('edexcel', 'student', FIXED_NOW);
    assert.equal(edxPending.some((p) => p.email === 'nadia.c@cambridge-student.edu.bd'), false);

    // Verify coupon S-61488 is now marked used
    const recheck = internationalStudentService.validateIntlStudentCoupon(
      'S-61488',
      'cambridge',
      FIXED_NOW
    );
    assert.equal(recheck.ok, false);
    assert.match(recheck.message, /already been redeemed/i);
  });

  it('requires valid upper track for O Level / IGCSE and International GCSE registrations', () => {
    const missingTrack = internationalStudentService.submitIntlStudentCouponRegistration(
      {
        pathway: 'edexcel',
        couponCode: 'S-82903',
        fullName: 'Farhan Kabir',
        email: 'farhan.k@edexcel-student.edu.bd',
        password: 'Password@123',
        academicLevel: 'International GCSE (Grades 9–10)',
        academicTrack: 'General',
      },
      FIXED_NOW
    );
    assert.equal(missingTrack.ok, false);

    const validUpper = internationalStudentService.submitIntlStudentCouponRegistration(
      {
        pathway: 'edexcel',
        couponCode: 'S-82903',
        fullName: 'Farhan Kabir',
        email: 'farhan.k@edexcel-student.edu.bd',
        password: 'Password@123',
        academicLevel: 'International GCSE (Grades 9–10)',
        academicTrack: 'Business',
      },
      FIXED_NOW
    );
    assert.equal(validUpper.ok, true);
    if (validUpper.ok) {
      assert.equal(validUpper.registration.academicTrack, 'Business');
    }
  });

  it('returns strictly pathway, level, and track tailored Cambridge and Edexcel subjects', () => {
    const camScience = getIntlSubjectsForStudent(
      'cambridge',
      'O Level / IGCSE (Grades 9–10)',
      'Science'
    );
    assert.ok(camScience.some((s) => s.code === '0580'));
    assert.ok(camScience.some((s) => s.code === '0625'));
    assert.equal(camScience.some((s) => s.code === '4BS1'), false);

    const edxBusiness = getIntlSubjectsForStudent(
      'edexcel',
      'International GCSE (Grades 9–10)',
      'Business'
    );
    assert.ok(edxBusiness.some((s) => s.code === '4MA1'));
    assert.ok(edxBusiness.some((s) => s.code === '4BS1'));
    assert.equal(edxBusiness.some((s) => s.code === '0625'), false);

    const camLower = getIntlSubjectsForStudent('cambridge', LOWER_SECONDARY_LEVEL, 'General');
    assert.ok(camLower.some((s) => s.name.includes('Lower Secondary')));
  });

  it('strictly isolates notices by pathway, student/both audience, level, and track', () => {
    // Add an Edexcel student-general notice to verify visibility
    internationalAdminService.createNotice(
      'edexcel',
      {
        title: 'Edexcel International GCSE Business Case Workshop',
        description: 'Review Paper 1 case-study exam technique in Seminar Room A.',
        audience: 'student',
        academicLevel: 'International GCSE (Grades 9–10)',
        academicTrack: 'Business',
        tag: 'Exam',
      },
      undefined,
      FIXED_NOW
    );

    const camStudent = {
      userId: 'INTL-USR-CAM-S1',
      fullName: 'Ayaan Siddiqui',
      email: 'ayaan.s@cambridge-student.edu.bd',
      pathway: 'cambridge' as const,
      academicLevel: 'O Level / IGCSE (Grades 9–10)' as const,
      academicTrack: 'Science' as const,
      registrationType: 'coupon_auto' as const,
      joinedAt: FIXED_NOW,
    };

    const camNotices = internationalStudentService.listRelevantNotices(camStudent, {}, FIXED_NOW);
    // Should include Cambridge 'both' / 'all' notice, exclude Cambridge teacher-only & Lower Secondary notice, exclude all Edexcel notices
    assert.ok(camNotices.some((n) => n.id === 'INTL-NTC-CAM-01'));
    assert.equal(camNotices.some((n) => n.audience === 'teacher'), false);
    assert.equal(camNotices.some((n) => n.pathway === 'edexcel'), false);
    assert.equal(camNotices.some((n) => n.id === 'INTL-NTC-CAM-03'), false);

    const edxStudent = {
      userId: 'INTL-USR-EDX-S2',
      fullName: 'Nusrat Jahan',
      email: 'nusrat.j@edexcel-student.edu.bd',
      pathway: 'edexcel' as const,
      academicLevel: 'International GCSE (Grades 9–10)' as const,
      academicTrack: 'Business' as const,
      registrationType: 'admin_manual' as const,
      joinedAt: FIXED_NOW,
    };

    const edxNotices = internationalStudentService.listRelevantNotices(edxStudent, {}, FIXED_NOW);
    assert.ok(edxNotices.some((n) => n.title.includes('Business Case Workshop')));
    assert.equal(edxNotices.some((n) => n.pathway === 'cambridge'), false);
    assert.equal(edxNotices.some((n) => n.audience === 'teacher'), false);
  });

  it('persists lesson completion per student/pathway and supports demo login + password updates', () => {
    const camPreset = getDemoIntlStudentPreset('cambridge');
    internationalStudentService.prepareIntlStudentAccountForLogin(
      camPreset.email,
      camPreset.password,
      'cambridge',
      FIXED_NOW
    );

    const loginRes = authService.login(camPreset.email, camPreset.password, FIXED_NOW, 'student', {
      stream: 'International Curriculum (English Medium)',
      pathway: 'Cambridge',
    });
    assert.equal(loginRes.ok, true);
    if (!loginRes.ok) return;

    const ctx = internationalStudentService.resolveIntlStudentContext(loginRes.session, null, FIXED_NOW);
    assert.ok(ctx);
    assert.equal(
      formatIntlStudentContextBadge(ctx.pathway, ctx.academicLevel, ctx.academicTrack),
      'Cambridge • O Level / IGCSE • Science'
    );

    const afterToggle1 = internationalStudentService.toggleLessonCompleted(
      ctx.userId,
      ctx.pathway,
      'cam-ig-math-L1'
    );
    assert.deepEqual(afterToggle1, ['cam-ig-math-L1']);
    assert.deepEqual(
      internationalStudentService.getCompletedLessonIds(ctx.userId, 'edexcel'),
      []
    );

    const pwRes = internationalStudentService.updateIntlStudentPassword(
      ctx.email,
      ctx.pathway,
      camPreset.password,
      'NewSecure@2026',
      'NewSecure@2026',
      FIXED_NOW
    );
    assert.equal(pwRes.ok, true);
  });
});
