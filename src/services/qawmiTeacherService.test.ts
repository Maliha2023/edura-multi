import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatAssignedQawmiMarhalasSummary,
  formatQawmiTeacherContextBadge,
  getDemoQawmiTeacherCouponHint,
  getDemoQawmiTeacherPreset,
  isQawmiTeacherPathway,
  QAWMI_TEACHER_MARHALA_OPTIONS,
  qawmiTeacherService,
  resolveQawmiTeacherPathway,
} from './qawmiTeacherService';

test('Qawmi teacher pathway resolution is strictly isolated from NCTB, International, and Alia', () => {
  assert.equal(isQawmiTeacherPathway('Qawmi'), true);
  assert.equal(isQawmiTeacherPathway('qawmi madrasa'), true);
  assert.equal(resolveQawmiTeacherPathway('qawmi'), 'qawmi');
  assert.equal(isQawmiTeacherPathway('Alia'), false);
  assert.equal(isQawmiTeacherPathway('Cambridge'), false);
  assert.equal(isQawmiTeacherPathway('bangla_version'), false);
});

test('Qawmi teacher T-XXXXX coupon validation rejects student/Alia/used/expired codes and accepts active T-codes', () => {
  qawmiTeacherService.resetQawmiTeacherMemoryStoresForTest();

  const studentRejected = qawmiTeacherService.validateCoupon('S-85101');
  assert.equal(studentRejected.ok, false);
  assert.match(studentRejected.message, /student coupon/i);

  const aliaRejected = qawmiTeacherService.validateCoupon('T-74310');
  assert.equal(aliaRejected.ok, false);

  const usedRejected = qawmiTeacherService.validateCoupon('T-85090');
  assert.equal(usedRejected.ok, false);

  const expiredRejected = qawmiTeacherService.validateCoupon('T-85011');
  assert.equal(expiredRejected.ok, false);

  const demoCode = getDemoQawmiTeacherCouponHint();
  const valid = qawmiTeacherService.validateCoupon(demoCode);
  assert.equal(valid.ok, true);
  assert.equal(valid.coupon?.pathway, 'qawmi');
  assert.equal(valid.coupon?.role, 'teacher');
});

test('Qawmi teacher registration queues faculty application with 48h expiry and marks coupon used', () => {
  qawmiTeacherService.resetQawmiTeacherMemoryStoresForTest();

  const noMarhala = qawmiTeacherService.submitCouponRegistration({
    couponCode: 'T-85310',
    fullName: 'Mawlana Yusuf Ali',
    email: 'yusuf.ali@qawmi-madrasa.edu.bd',
    password: 'Password@2026',
    assignedMarhalas: [],
    primarySubject: 'Hadith & Tafsir',
  });
  assert.equal(noMarhala.ok, false);

  const now = 1_760_000_000_000;
  const submitted = qawmiTeacherService.submitCouponRegistration(
    {
      couponCode: 'T-85310',
      fullName: 'Mawlana Yusuf Ali',
      email: 'yusuf.ali@qawmi-madrasa.edu.bd',
      password: 'Password@2026',
      assignedMarhalas: [
        'Mutawassitah (Middle Marhala)',
        'Sanawiyyah Ulya (Higher Secondary Marhala)',
      ],
      primarySubject: 'Nahw & Sarf / Arabic Grammar',
      focusBranch: 'Arabic & Adab',
    },
    now
  );
  assert.equal(submitted.ok, true);
  if (submitted.ok) {
    assert.equal(submitted.registration.pathway, 'qawmi');
    assert.equal(submitted.registration.role, 'teacher');
    assert.equal(submitted.registration.couponCode, 'T-85310');
    assert.equal(
      submitted.registration.expiresAt - submitted.registration.submittedAt,
      48 * 60 * 60 * 1000
    );
  }

  // Coupon can no longer be reused
  const reuse = qawmiTeacherService.validateCoupon('T-85310', now + 1000);
  assert.equal(reuse.ok, false);
});

test('Qawmi teacher modules support creation, publish toggling, and deletion', () => {
  qawmiTeacherService.resetQawmiTeacherMemoryStoresForTest();
  const demo = getDemoQawmiTeacherPreset();
  const context = qawmiTeacherService.resolveQawmiTeacherContext({
    userId: 'qawmi-teacher-demo-01',
    fullName: demo.fullName,
    email: demo.email,
    role: 'teacher',
    mustChangePassword: false,
    preferredLanguage: 'en',
    selectedStream: 'Bangladesh Madrasa Education',
    selectedPathway: 'Qawmi',
    loggedInAt: Date.now(),
  });
  assert.ok(context);
  assert.equal(formatQawmiTeacherContextBadge(context.primarySubject), 'Qawmi Madrasa • Hadith & Tafsir');
  assert.match(formatAssignedQawmiMarhalasSummary(context.assignedMarhalas), /Mutawassitah/);

  const before = qawmiTeacherService.listModules().length;
  const created = qawmiTeacherService.createModule(context, {
    marhala: 'Takmil (Masters / Dawra-e-Hadith Marhala)',
    focusBranch: 'Hadith & Tafsir',
    title: 'Sahih Muslim Muqaddimah: Isnads & Ilal Study Guide',
    type: 'Kitab / Chapter Guide',
    summary: 'Detailed lecture notes on Imam Muslim methodology and Sanad evaluation.',
    published: true,
  });
  assert.equal(created.ok, true);
  if (!created.ok) return;

  assert.equal(qawmiTeacherService.listModules().length, before + 1);
  qawmiTeacherService.toggleModulePublished(created.module.id);
  const toggled = qawmiTeacherService.listModules().find((m) => m.id === created.module.id);
  assert.equal(toggled?.published, false);

  qawmiTeacherService.deleteModule(created.module.id);
  assert.equal(qawmiTeacherService.listModules().length, before);
});

test('Qawmi teacher roster, notices filtering, class announcements, and password update work properly', () => {
  qawmiTeacherService.resetQawmiTeacherMemoryStoresForTest();
  assert.equal(QAWMI_TEACHER_MARHALA_OPTIONS.length, 6);

  const roster = qawmiTeacherService.listStudentRoster();
  assert.ok(roster.length >= 6);
  const firstStudent = roster[0];

  const badMarks = qawmiTeacherService.updateStudentAssessment(firstStudent.id, {
    marks: 105,
    attendanceRate: 90,
    attendanceStatus: 'Present',
    remarks: 'Invalid',
  });
  assert.equal(badMarks.ok, false);

  const savedMarks = qawmiTeacherService.updateStudentAssessment(firstStudent.id, {
    marks: 95,
    attendanceRate: 97,
    attendanceStatus: 'Present',
    remarks: 'Excellent Takrar recall.',
  });
  assert.equal(savedMarks.ok, true);
  if (savedMarks.ok) {
    assert.equal(savedMarks.student.marks, 95);
    assert.equal(savedMarks.student.remarks, 'Excellent Takrar recall.');
  }

  const notices = qawmiTeacherService.listOfficialNotices();
  assert.ok(notices.every((n) => n.audience === 'teacher' || n.audience === 'both'));
  assert.ok(notices.some((n) => n.audience === 'teacher'));

  const demo = getDemoQawmiTeacherPreset();
  const context = qawmiTeacherService.resolveQawmiTeacherContext({
    userId: 'qawmi-teacher-demo-01',
    fullName: demo.fullName,
    email: demo.email,
    role: 'teacher',
    mustChangePassword: false,
    preferredLanguage: 'en',
    selectedStream: 'Bangladesh Madrasa Education',
    selectedPathway: 'Qawmi',
    loggedInAt: Date.now(),
  })!;

  const posted = qawmiTeacherService.postClassAnnouncement(context, {
    marhala: 'Mutawassitah (Middle Marhala)',
    focusBranch: 'General / Kitab',
    title: 'Sabak Oral Check After Asr',
    message: 'Prepare pages 14-18 of Hidayatun Nahw for oral Ibarat check.',
    tag: 'Sabak Reminder',
  });
  assert.equal(posted.ok, true);

  const pwRes = qawmiTeacherService.updateTeacherPassword(
    demo.email,
    demo.password,
    'NewQawmi#2026',
    'NewQawmi#2026'
  );
  assert.equal(pwRes.ok, true);
});
