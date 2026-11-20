import test from 'node:test';
import assert from 'node:assert/strict';
import { resetAdminNoticesStore } from './adminNoticesService';
import { adminUsersService, resetAdminUsersStore } from './adminUsersService';
import { resetDatabase } from './storage';
import {
  formatAssignedClassesSummary,
  formatTeacherContextBadge,
  resetTeacherStores,
  teacherService,
} from './teacherService';

const FIXED_NOW = Date.UTC(2026, 10, 19, 10, 0, 0);

function resetAll() {
  resetDatabase(FIXED_NOW);
  resetAdminUsersStore(FIXED_NOW);
  resetAdminNoticesStore(FIXED_NOW);
  resetTeacherStores(FIXED_NOW);
}

test('teacherService validates T-XXXXX coupons with strict role prefix, expiry, and pathway isolation', () => {
  resetAll();

  const studentAttempt = teacherService.validateTeacherCoupon('S-55821', 'bangla_version', FIXED_NOW);
  assert.equal(studentAttempt.ok, false);
  if (!studentAttempt.ok) assert.equal(studentAttempt.reason, 'student_coupon');

  const wrongPathway = teacherService.validateTeacherCoupon('T-77520', 'bangla_version', FIXED_NOW);
  assert.equal(wrongPathway.ok, false);
  if (!wrongPathway.ok) assert.equal(wrongPathway.reason, 'pathway_mismatch');

  const expiredCoupon = teacherService.validateTeacherCoupon('T-30112', 'bangla_version', FIXED_NOW);
  assert.equal(expiredCoupon.ok, false);
  if (!expiredCoupon.ok) assert.equal(expiredCoupon.reason, 'expired');

  const validBV = teacherService.validateTeacherCoupon('T-44810', 'bangla_version', FIXED_NOW);
  assert.equal(validBV.ok, true);

  const validEV = teacherService.validateTeacherCoupon('T-77520', 'english_version', FIXED_NOW);
  assert.equal(validEV.ok, true);
});

test('teacherService submits teacher coupon registration with 48h countdown and marks coupon used', () => {
  resetAll();

  const res = teacherService.submitTeacherCouponRegistration(
    {
      pathway: 'bangla_version',
      couponCode: 'T-44810',
      fullName: 'Dr. Sabrina Karim',
      email: 'sabrina.bv@school.edu.bd',
      password: 'TeacherPassword@26',
      assignedClasses: [9, 10],
      primarySubject: 'Physics',
      academicGroup: 'Science',
    },
    FIXED_NOW
  );

  assert.equal(res.ok, true);
  if (res.ok) {
    assert.equal(res.registration.role, 'teacher');
    assert.equal(res.registration.pathway, 'bangla_version');
    assert.equal(res.registration.couponCode, 'T-44810');
    assert.equal(res.registration.academicClass, 9);
    assert.equal(res.registration.academicGroup, 'Science');
    assert.equal(res.registration.expiresAt - res.registration.submittedAt, 48 * 60 * 60 * 1000);
  }

  // Coupon cannot be reused
  const reuse = teacherService.validateTeacherCoupon('T-44810', 'bangla_version', FIXED_NOW);
  assert.equal(reuse.ok, false);
  if (!reuse.ok) assert.equal(reuse.reason, 'already_used');
});

test('teacherService strictly isolates student roster, assessments, and notices between pathways', () => {
  resetAll();

  const bvRoster = teacherService.listPathwayStudentRoster('bangla_version', {}, FIXED_NOW);
  const evRoster = teacherService.listPathwayStudentRoster('english_version', {}, FIXED_NOW);

  assert.ok(bvRoster.length > 0);
  assert.ok(evRoster.length > 0);
  assert.ok(bvRoster.every((s) => s.pathway === 'bangla_version'));
  assert.ok(evRoster.every((s) => s.pathway === 'english_version'));

  // Cross-pathway assessment update is blocked
  const evStudentId = evRoster[0].id;
  const blocked = teacherService.updateStudentAssessment(
    'bangla_version',
    evStudentId,
    { marks: 95, attendanceRate: 98, attendanceStatus: 'Present', remarks: 'Cross-pathway test' },
    FIXED_NOW
  );
  assert.equal(blocked.ok, false);

  // Same-pathway assessment update succeeds
  const bvStudentId = bvRoster[0].id;
  const updated = teacherService.updateStudentAssessment(
    'bangla_version',
    bvStudentId,
    { marks: 93, attendanceRate: 97, attendanceStatus: 'Present', remarks: 'Excellent work' },
    FIXED_NOW
  );
  assert.equal(updated.ok, true);

  // Official notices strictly exclude student-only and opposite-pathway notices
  const bvNotices = teacherService.listOfficialAdminNotices('bangla_version', {}, FIXED_NOW);
  assert.ok(bvNotices.length > 0);
  assert.ok(bvNotices.every((n) => n.pathway === 'bangla_version'));
  assert.ok(bvNotices.every((n) => n.targetAudience === 'teacher' || n.targetAudience === 'both'));
  assert.equal(
    bvNotices.some((n) => n.title.includes('English Version')),
    false
  );

  const evNotices = teacherService.listOfficialAdminNotices('english_version', {}, FIXED_NOW);
  assert.ok(evNotices.length > 0);
  assert.ok(evNotices.every((n) => n.pathway === 'english_version'));
  assert.ok(evNotices.every((n) => n.targetAudience === 'teacher' || n.targetAudience === 'both'));
});

test('teacherService manages modules, class announcements, formatting, and demo login sync', () => {
  resetAll();
  assert.ok(adminUsersService.listProfiles('english_version', FIXED_NOW).length > 0);

  const createdMod = teacherService.createModuleResource(
    { userId: 'USR-BV-T101', pathway: 'bangla_version', primarySubject: 'Physics' },
    {
      academicClass: 10,
      academicGroup: 'Science',
      title: 'Optics & Lens Formula Practice Set',
      resourceType: 'Worksheet',
      chapterTag: 'Ch. 09 · Optics',
      summary: 'Ray diagram exercises and magnification numericals for SSC candidates.',
      isPublished: true,
    },
    FIXED_NOW
  );
  assert.equal(createdMod.ok, true);

  const bvMods = teacherService.listModules('bangla_version', {}, FIXED_NOW);
  const evMods = teacherService.listModules('english_version', {}, FIXED_NOW);
  assert.ok(bvMods.some((m) => m.title === 'Optics & Lens Formula Practice Set'));
  assert.equal(
    evMods.some((m) => m.title === 'Optics & Lens Formula Practice Set'),
    false
  );

  const ann = teacherService.postClassAnnouncement(
    {
      userId: 'USR-EV-T301',
      fullName: 'Rezaul Karim',
      pathway: 'english_version',
      primarySubject: 'Mathematics',
    },
    {
      academicClass: 10,
      academicGroup: 'Science',
      title: 'Geometry Theorem Revision',
      message: 'Please review Circle Theorems 17–20 before Thursday class.',
      tag: 'Study Update',
    },
    FIXED_NOW
  );
  assert.equal(ann.ok, true);
  assert.equal(
    teacherService.listClassAnnouncements('bangla_version', FIXED_NOW).some(
      (a) => a.title === 'Geometry Theorem Revision'
    ),
    false
  );

  const sync = teacherService.prepareTeacherAccountForLogin(
    'rezaul.ev@school.edu.bd',
    'Teacher@1234',
    'english_version',
    FIXED_NOW
  );
  assert.equal(sync.synced, true);
  assert.equal(formatTeacherContextBadge('english_version', 'Mathematics'), 'English Version • Mathematics');
  assert.equal(formatAssignedClassesSummary([10, 9]), 'Classes 9, 10');
});
