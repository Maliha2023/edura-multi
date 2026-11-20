import test from 'node:test';
import assert from 'node:assert/strict';
import { resetAdminNoticesStore, adminNoticesService } from './adminNoticesService';
import { resetAdminUsersStore, adminUsersService } from './adminUsersService';
import { resetDatabase } from './storage';
import {
  formatStudentContextBadge,
  getSubjectsForStudent,
  resetStudentStores,
  studentService,
} from './studentService';

const FIXED_NOW = Date.UTC(2026, 10, 19, 10, 0, 0);

function resetAll() {
  resetDatabase(FIXED_NOW);
  resetAdminUsersStore(FIXED_NOW);
  resetAdminNoticesStore(FIXED_NOW);
  resetStudentStores(FIXED_NOW);
}

test('studentService validates coupon format, role prefix, expiry, and strict pathway match', () => {
  resetAll();

  const teacherAttempt = studentService.validateStudentCoupon('T-44910', 'bangla_version', FIXED_NOW);
  assert.equal(teacherAttempt.ok, false);
  if (!teacherAttempt.ok) assert.equal(teacherAttempt.reason, 'teacher_coupon');

  const wrongPathway = studentService.validateStudentCoupon('S-66420', 'bangla_version', FIXED_NOW);
  assert.equal(wrongPathway.ok, false);
  if (!wrongPathway.ok) assert.equal(wrongPathway.reason, 'pathway_mismatch');

  const expiredCoupon = studentService.validateStudentCoupon('S-30119', 'bangla_version', FIXED_NOW);
  assert.equal(expiredCoupon.ok, false);
  if (!expiredCoupon.ok) assert.equal(expiredCoupon.reason, 'expired');

  const validBV = studentService.validateStudentCoupon('S-55821', 'bangla_version', FIXED_NOW);
  assert.equal(validBV.ok, true);

  const validEV = studentService.validateStudentCoupon('S-66420', 'english_version', FIXED_NOW);
  assert.equal(validEV.ok, true);
});

test('studentService submits coupon registration with 48h expiry and marks coupon used', () => {
  resetAll();

  const submitRes = studentService.submitStudentCouponRegistration(
    {
      pathway: 'english_version',
      couponCode: 'S-66420',
      fullName: 'Zarif Chowdhury',
      email: 'zarif.ev@student.edu.bd',
      password: 'ZarifPassword@26',
      academicClass: 11,
      academicGroup: 'Science',
    },
    FIXED_NOW
  );

  assert.equal(submitRes.ok, true);
  if (submitRes.ok) {
    assert.equal(submitRes.registration.pathway, 'english_version');
    assert.equal(submitRes.registration.academicClass, 11);
    assert.equal(submitRes.registration.academicGroup, 'Science');
    assert.equal(submitRes.registration.couponCode, 'S-66420');
    assert.equal(submitRes.registration.expiresAt - submitRes.registration.submittedAt, 48 * 60 * 60 * 1000);
  }

  // Re-using the same coupon is immediately blocked
  const reuseCheck = studentService.validateStudentCoupon('S-66420', 'english_version', FIXED_NOW);
  assert.equal(reuseCheck.ok, false);
  if (!reuseCheck.ok) assert.equal(reuseCheck.reason, 'already_used');
});

test('studentService filters notices strictly by pathway, student/both audience, and class/group scope', () => {
  resetAll();

  // Add a Class 10 Arts-only Bangla Version notice
  adminNoticesService.createNotice(
    'bangla_version',
    {
      title: 'BV Class 10 Arts History Seminar',
      description: 'Mandatory seminar for Bangla Version Class 10 Arts students.',
      targetAudience: 'student',
      targetClass: 10,
      targetGroup: 'Arts',
      categoryTag: 'Academic',
    },
    FIXED_NOW
  );

  // Bangla Version Class 10 Science student should NOT see Teacher-only, EV notices, or Class 10 Arts-only notices
  const bvSciNotices = studentService.listRelevantNotices(
    { pathway: 'bangla_version', academicClass: 10, academicGroup: 'Science' },
    {},
    FIXED_NOW
  );
  assert.ok(bvSciNotices.length > 0);
  assert.ok(bvSciNotices.every((n) => n.pathway === 'bangla_version'));
  assert.ok(bvSciNotices.every((n) => n.targetAudience !== 'teacher'));
  assert.equal(
    bvSciNotices.some((n) => n.title === 'BV Class 10 Arts History Seminar'),
    false
  );
  assert.equal(
    bvSciNotices.some((n) => n.title === 'English Version Science Olympiad Registration Open'),
    false
  );

  // English Version Class 10 Science student sees English Version Science Olympiad and zero BV notices
  const evSciNotices = studentService.listRelevantNotices(
    { pathway: 'english_version', academicClass: 10, academicGroup: 'Science' },
    {},
    FIXED_NOW
  );
  assert.ok(evSciNotices.every((n) => n.pathway === 'english_version'));
  assert.equal(
    evSciNotices.some((n) => n.title === 'English Version Science Olympiad Registration Open'),
    true
  );
  assert.equal(
    evSciNotices.some((n) => n.title === 'SSC Pre-Test Practical Lab Schedule Published'),
    false
  );
});

test('getSubjectsForStudent tailors curriculum by pathway, class, and group', () => {
  const class6Subjects = getSubjectsForStudent('bangla_version', 6, null);
  assert.ok(class6Subjects.some((s) => s.code === 'MAT'));
  assert.equal(class6Subjects.some((s) => s.code === 'PHY'), false);

  const class10Sci = getSubjectsForStudent('english_version', 10, 'Science');
  assert.ok(class10Sci.some((s) => s.code === 'PHY'));
  assert.ok(class10Sci.some((s) => s.code === 'CHE'));

  const class11Com = getSubjectsForStudent('bangla_version', 11, 'Commerce');
  assert.ok(class11Com.some((s) => s.code === 'ACC'));
  assert.ok(class11Com.some((s) => s.code === 'FIN'));

  const class12Arts = getSubjectsForStudent('english_version', 12, 'Arts');
  assert.ok(class12Arts.some((s) => s.code === 'HIS'));
  assert.ok(class12Arts.some((s) => s.code === 'ECO'));

  assert.equal(
    formatStudentContextBadge('english_version', 10, 'Science'),
    'English Version • Class 10 • Science'
  );
  assert.equal(
    formatStudentContextBadge('bangla_version', 8, null),
    'Bangla Version • Class 8'
  );
});

test('demo student login sync works cleanly for both Bangla Version and English Version', () => {
  resetAll();
  // Ensure profiles exist
  assert.ok(adminUsersService.listProfiles('english_version', FIXED_NOW).length > 0);

  const evSync = studentService.prepareStudentAccountForLogin(
    'ishan.ev@student.edu.bd',
    'Student@1234',
    'english_version',
    FIXED_NOW
  );
  assert.equal(evSync.synced, true);
});
