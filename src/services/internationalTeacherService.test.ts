import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';
import { internationalAdminService } from './internationalAdminService';
import {
  formatAssignedLevelsSummary,
  formatIntlTeacherContextBadge,
  getDemoIntlTeacherCouponHint,
  getDemoIntlTeacherPreset,
  hasUpperAcademicLevel,
  internationalTeacherService,
  LOWER_SECONDARY_LEVEL,
} from './internationalTeacherService';
import type { AuthSession } from '../types/domain';

class MemoryLocalStorage {
  private map = new Map<string, string>();
  get length(): number {
    return this.map.size;
  }
  clear(): void {
    this.map.clear();
  }
  getItem(key: string): string | null {
    return this.map.has(key) ? this.map.get(key)! : null;
  }
  key(index: number): string | null {
    return Array.from(this.map.keys())[index] ?? null;
  }
  removeItem(key: string): void {
    this.map.delete(key);
  }
  setItem(key: string, value: string): void {
    this.map.set(key, String(value));
  }
}

beforeEach(() => {
  const storage = new MemoryLocalStorage();
  (globalThis as unknown as { window: { localStorage: MemoryLocalStorage } }).window = {
    localStorage: storage,
  };
});

describe('internationalTeacherService — coupon validation & onboarding', () => {
  it('validates active Cambridge T-XXXXX coupon and rejects student, cross-pathway, used, and expired coupons', () => {
    const camHint = getDemoIntlTeacherCouponHint('cambridge');
    const edxHint = getDemoIntlTeacherCouponHint('edexcel');

    assert.equal(camHint, 'T-61204');
    assert.equal(edxHint, 'T-82419');

    // Valid Cambridge teacher coupon
    const validCam = internationalTeacherService.validateCoupon(camHint, 'cambridge');
    assert.equal(validCam.ok, true);

    // Rejects Student coupon S-XXXXX
    const studentRejected = internationalTeacherService.validateCoupon('S-61488', 'cambridge');
    assert.equal(studentRejected.ok, false);
    assert.match(studentRejected.message, /Student coupon/i);

    // Rejects cross-pathway Edexcel teacher coupon in Cambridge
    const crossRejected = internationalTeacherService.validateCoupon(edxHint, 'cambridge');
    assert.equal(crossRejected.ok, false);
    assert.match(crossRejected.message, /Edexcel/i);

    // Rejects already-used Cambridge teacher coupon T-61029
    const usedRejected = internationalTeacherService.validateCoupon('T-61029', 'cambridge');
    assert.equal(usedRejected.ok, false);
    assert.match(usedRejected.message, /already been used/i);

    // Rejects expired Edexcel teacher coupon T-81770
    const expiredRejected = internationalTeacherService.validateCoupon('T-81770', 'edexcel');
    assert.equal(expiredRejected.ok, false);
    assert.match(expiredRejected.message, /expired/i);
  });

  it('auto-sets General track when ONLY Grade 1-8 is assigned and requires track for upper levels', () => {
    assert.equal(hasUpperAcademicLevel([LOWER_SECONDARY_LEVEL]), false);
    assert.equal(
      hasUpperAcademicLevel([LOWER_SECONDARY_LEVEL, 'O Level / IGCSE (Grades 9–10)']),
      true
    );

    // Fails if upper level selected without a valid upper track
    const missingTrack = internationalTeacherService.submitCouponRegistration({
      pathway: 'cambridge',
      couponCode: 'T-61204',
      fullName: 'Dr. Farhana Rahman',
      email: 'farhana.rahman@cambridge-faculty.edu.bd',
      password: 'Password@2026',
      assignedLevels: ['O Level / IGCSE (Grades 9–10)'],
      primarySubject: 'Physics',
      academicTrack: 'General',
    });
    assert.equal(missingTrack.ok, false);

    // Succeeds for Grade 1-8 only and auto-normalizes track to General
    const lowerOnly = internationalTeacherService.submitCouponRegistration({
      pathway: 'edexcel',
      couponCode: 'T-82419',
      fullName: 'Ms. Tahmina Haque',
      email: 'tahmina.haque@edexcel-faculty.edu.bd',
      password: 'Password@2026',
      assignedLevels: [LOWER_SECONDARY_LEVEL],
      primarySubject: 'English Language',
      academicTrack: 'Science',
    });
    assert.equal(lowerOnly.ok, true);
    if (lowerOnly.ok) {
      assert.equal(lowerOnly.registration.academicTrack, 'General');
      assert.equal(lowerOnly.registration.academicLevel, LOWER_SECONDARY_LEVEL);
      assert.equal(lowerOnly.registration.pathway, 'edexcel');
    }

    // Appears immediately in Edexcel Admin Pending Queue and marks T-82419 used
    const pendingEdexcel = internationalAdminService.listPending('edexcel', 'teacher');
    assert.equal(
      pendingEdexcel.some((p) => p.email === 'tahmina.haque@edexcel-faculty.edu.bd'),
      true
    );
    const reuseCheck = internationalTeacherService.validateCoupon('T-82419', 'edexcel');
    assert.equal(reuseCheck.ok, false);
    assert.match(reuseCheck.message, /already been used/i);
  });

  it('submits multi-level Cambridge teacher registration into Cambridge Admin pending queue only', () => {
    const res = internationalTeacherService.submitCouponRegistration({
      pathway: 'cambridge',
      couponCode: 'T-61204',
      fullName: 'Dr. Farhana Rahman',
      email: 'farhana.r@cambridge-faculty.edu.bd',
      password: 'Password@2026',
      assignedLevels: [
        'O Level / IGCSE (Grades 9–10)',
        'A Level / IAL (Grades 11–12)',
      ],
      primarySubject: 'Physics',
      academicTrack: 'Science',
    });
    assert.equal(res.ok, true);
    if (res.ok) {
      assert.equal(res.registration.academicLevel, 'A Level / IAL (Grades 11–12)');
      assert.equal(res.registration.academicTrack, 'Science');
      assert.equal(res.registration.primarySubject, 'Physics');
    }

    const camPending = internationalAdminService.listPending('cambridge', 'teacher');
    const edxPending = internationalAdminService.listPending('edexcel', 'teacher');
    assert.equal(
      camPending.some((p) => p.email === 'farhana.r@cambridge-faculty.edu.bd'),
      true
    );
    assert.equal(
      edxPending.some((p) => p.email === 'farhana.r@cambridge-faculty.edu.bd'),
      false
    );
  });
});

describe('internationalTeacherService — strict pathway isolation & workspace operations', () => {
  it('resolves Cambridge and Edexcel demo teacher contexts and badges cleanly', () => {
    const camPreset = getDemoIntlTeacherPreset('cambridge');
    const edxPreset = getDemoIntlTeacherPreset('edexcel');

    assert.equal(
      formatIntlTeacherContextBadge('cambridge', camPreset.primarySubject),
      'Cambridge • Mathematics (9709)'
    );
    assert.equal(
      formatIntlTeacherContextBadge('edexcel', edxPreset.primarySubject),
      'Edexcel • Physics (WPH11)'
    );
    assert.equal(
      formatAssignedLevelsSummary(camPreset.assignedLevels),
      'O Level / IGCSE, A Level / IAL'
    );

    const camSession: AuthSession = {
      userId: 'INTL-TCH-CAM-01',
      role: 'teacher',
      fullName: camPreset.fullName,
      email: camPreset.email,
      mustChangePassword: false,
      preferredLanguage: 'en',
      selectedPathway: 'Cambridge',
      loggedInAt: Date.now(),
    };
    const camCtx = internationalTeacherService.resolveIntlTeacherContext(camSession);
    assert.ok(camCtx);
    assert.equal(camCtx?.pathway, 'cambridge');
    assert.equal(camCtx?.assignedLevels.length, 2);

    // Rejects NCTB pathway session
    const nctbSession: AuthSession = {
      userId: 'nctb-tch-1',
      role: 'teacher',
      fullName: 'NCTB Teacher',
      email: 'nctb@school.edu.bd',
      mustChangePassword: false,
      preferredLanguage: 'en',
      selectedPathway: 'Bangla Version',
      loggedInAt: Date.now(),
    };
    assert.equal(internationalTeacherService.resolveIntlTeacherContext(nctbSession), null);
  });

  it('strictly isolates modules, roster assessments, official notices, and class announcements between Cambridge and Edexcel', () => {
    const camModulesBefore = internationalTeacherService.listModules('cambridge');
    const edxModulesBefore = internationalTeacherService.listModules('edexcel');
    assert.ok(camModulesBefore.length >= 2);
    assert.ok(edxModulesBefore.length >= 2);
    assert.equal(
      camModulesBefore.every((m) => m.pathway === 'cambridge'),
      true
    );
    assert.equal(
      edxModulesBefore.every((m) => m.pathway === 'edexcel'),
      true
    );

    const created = internationalTeacherService.createModuleResource({
      pathway: 'cambridge',
      academicLevel: 'O Level / IGCSE (Grades 9–10)',
      academicTrack: 'Science',
      subject: 'Mathematics (9709)',
      title: 'IGCSE Paper 2 Vectors Quick Drill',
      type: 'Past-Paper Set',
      summary: 'Short 15-minute vector proofs and position vector warm-up.',
      published: true,
      teacherName: 'Prof. Farzad Karim',
    });
    assert.equal(created.ok, true);
    assert.equal(
      internationalTeacherService.listModules('cambridge').length,
      camModulesBefore.length + 1
    );
    assert.equal(
      internationalTeacherService.listModules('edexcel').length,
      edxModulesBefore.length
    );

    if (created.ok) {
      const toggled = internationalTeacherService.toggleModulePublished(
        'cambridge',
        created.module.id
      );
      assert.equal(toggled.ok, true);
      if (toggled.ok) assert.equal(toggled.published, false);

      // Edexcel cannot delete Cambridge module
      assert.equal(
        internationalTeacherService.deleteModuleResource('edexcel', created.module.id),
        false
      );
      assert.equal(
        internationalTeacherService.deleteModuleResource('cambridge', created.module.id),
        true
      );
    }

    // Roster strict isolation + marks/attendance update
    const camRoster = internationalTeacherService.listPathwayStudentRoster('cambridge');
    const edxRoster = internationalTeacherService.listPathwayStudentRoster('edexcel');
    assert.ok(camRoster.length >= 3);
    assert.ok(edxRoster.length >= 3);
    assert.equal(
      camRoster.every((s) => s.pathway === 'cambridge'),
      true
    );
    assert.equal(
      edxRoster.every((s) => s.pathway === 'edexcel'),
      true
    );

    // Cross-pathway update blocked
    const crossUpdate = internationalTeacherService.updateStudentAssessment(
      'cambridge',
      edxRoster[0].id,
      { marks: 95, attendanceRate: 98, attendanceStatus: 'Present', remarks: 'Great' }
    );
    assert.equal(crossUpdate.ok, false);

    // Same-pathway update succeeds
    const validUpdate = internationalTeacherService.updateStudentAssessment(
      'cambridge',
      camRoster[0].id,
      { marks: 97, attendanceRate: 99, attendanceStatus: 'Present', remarks: 'Outstanding CAIE mock' }
    );
    assert.equal(validUpdate.ok, true);
    const updatedStudent = internationalTeacherService
      .listPathwayStudentRoster('cambridge')
      .find((s) => s.id === camRoster[0].id);
    assert.equal(updatedStudent?.marks, 97);
    assert.equal(updatedStudent?.attendanceRate, 99);

    // Official notices & class announcements isolation
    const camNotices = internationalTeacherService.listOfficialAdminNotices('cambridge');
    const edxNotices = internationalTeacherService.listOfficialAdminNotices('edexcel');
    assert.ok(camNotices.length >= 1);
    assert.ok(edxNotices.length >= 1);
    assert.equal(
      camNotices.every((n) => n.pathway === 'cambridge' && (n.audience === 'teacher' || n.audience === 'both')),
      true
    );
    assert.equal(
      edxNotices.every((n) => n.pathway === 'edexcel' && (n.audience === 'teacher' || n.audience === 'both')),
      true
    );

    const annRes = internationalTeacherService.postClassAnnouncement({
      pathway: 'edexcel',
      academicLevel: 'IAL (Grades 11–12)',
      academicTrack: 'Science',
      subject: 'Physics (WPH11)',
      title: 'WPH11 Past-Paper Seminar Tomorrow',
      message: 'Bring the Jan 2024 Unit 1 Mechanics paper for worked mark-scheme review.',
      tag: 'Exam Prep',
      teacherName: 'Dr. Mahbub Alam',
    });
    assert.equal(annRes.ok, true);
    assert.equal(
      internationalTeacherService
        .listClassAnnouncements('edexcel')
        .some((a) => a.title === 'WPH11 Past-Paper Seminar Tomorrow'),
      true
    );
    assert.equal(
      internationalTeacherService
        .listClassAnnouncements('cambridge')
        .some((a) => a.title === 'WPH11 Past-Paper Seminar Tomorrow'),
      false
    );
  });

  it('syncs demo teacher login account and supports password updates', () => {
    const camPreset = getDemoIntlTeacherPreset('cambridge');
    internationalTeacherService.prepareIntlTeacherAccountForLogin(
      camPreset.email,
      camPreset.password,
      'cambridge'
    );

    const badCurrent = internationalTeacherService.updateTeacherPassword(
      'INTL-TCH-CAM-01',
      camPreset.email,
      'cambridge',
      'WrongPass123',
      'NewPass@2026',
      'NewPass@2026'
    );
    assert.equal(badCurrent.ok, false);

    const goodUpdate = internationalTeacherService.updateTeacherPassword(
      'INTL-TCH-CAM-01',
      camPreset.email,
      'cambridge',
      camPreset.password,
      'NewPass@2026',
      'NewPass@2026'
    );
    assert.equal(goodUpdate.ok, true);
  });
});
