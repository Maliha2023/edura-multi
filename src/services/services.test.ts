import test from 'node:test';
import assert from 'node:assert/strict';
import { resetDatabase, loadDatabase } from './storage';
import { couponService, COUPON_TTL_MS } from './couponService';
import { registrationService } from './registrationService';
import { authService, DEMO_OTP_CODE, MAX_FAILED_LOGIN_ATTEMPTS } from './authService';

test('seed database has exactly 6 admins with mustChangePassword=true and seeded pending registrations', () => {
  const db = resetDatabase(1_700_000_000_000);
  const admins = db.users.filter((u) => u.role === 'admin');
  assert.equal(admins.length, 6);
  for (let i = 1; i <= 6; i++) {
    const found = admins.find((a) => a.email === `admin${i}@example.com`);
    assert.ok(found, `Missing admin${i}@example.com`);
    assert.equal(found.mustChangePassword, true);
    assert.ok(found.passwordHash.startsWith('mock_hash$'));
  }

  const pending = registrationService.listRegistrations('pending');
  assert.equal(pending.length, 2);
  assert.ok(pending.some((r) => r.role === 'teacher'));
  assert.ok(pending.some((r) => r.role === 'student'));
});

test('coupon generation produces unique 5-digit codes across T- and S- and expires after 48h', () => {
  const t0 = 1_700_000_000_000;
  resetDatabase(t0);

  const generated = [];
  for (let i = 0; i < 20; i++) {
    generated.push(couponService.generateCoupon(i % 2 === 0 ? 'teacher' : 'student', t0));
  }

  const allCoupons = couponService.listCoupons(t0);
  const digitSet = new Set(allCoupons.map((c) => c.digits));
  assert.equal(digitSet.size, allCoupons.length);

  const teacherCoupon = generated[0];
  assert.match(teacherCoupon.code, /^T-\d{5}$/);
  assert.equal(couponService.validateCoupon(teacherCoupon.code, t0).valid, true);

  // Just before 48h -> still valid
  assert.equal(
    couponService.validateCoupon(teacherCoupon.code, t0 + COUPON_TTL_MS - 1000).valid,
    true
  );

  // At 48h -> auto-marked expired
  const expiredCheck = couponService.validateCoupon(teacherCoupon.code, t0 + COUPON_TTL_MS);
  assert.equal(expiredCheck.valid, false);
  if (!expiredCheck.valid) {
    assert.equal(expiredCheck.error, 'expired');
  }
  const refreshed = couponService.listCoupons(t0 + COUPON_TTL_MS).find(
    (c) => c.code === teacherCoupon.code
  );
  assert.equal(refreshed?.status, 'expired');
});

test('student onboarding creates pending registration, marks coupon used, blocks login until approved, and allows login after approval', () => {
  const t0 = 1_700_000_000_000;
  resetDatabase(t0);

  const studentCoupon = couponService.generateCoupon('student', t0);
  const submitRes = registrationService.submitRegistration(
    {
      role: 'student',
      couponCode: studentCoupon.code,
      preferredLanguage: 'bn',
      fullName: 'Mahmudul Hasan',
      phone: '01755667788',
      email: 'mahmudul@school.edu.bd',
      password: 'Password@123',
      studentClass: 11,
      educationStream: 'Bangladesh National Curriculum (NCTB)',
      pathway: 'Science',
    },
    t0 + 1000
  );

  assert.equal(submitRes.ok, true);
  if (!submitRes.ok) return;

  // Coupon is now used
  const reuseCheck = couponService.validateCoupon(studentCoupon.code, t0 + 2000);
  assert.equal(reuseCheck.valid, false);
  if (!reuseCheck.valid) {
    assert.equal(reuseCheck.error, 'already_used');
  }

  // Pending user cannot log in yet; gets waiting for admin approval message
  const pendingLogin = authService.login('mahmudul@school.edu.bd', 'Password@123', t0 + 3000);
  assert.equal(pendingLogin.ok, false);
  if (!pendingLogin.ok) {
    assert.equal(pendingLogin.reason, 'pending_approval');
  }

  // Wrong password on pending user still returns generic invalid_credentials (never leaks existence)
  const pendingWrongPass = authService.login('mahmudul@school.edu.bd', 'WrongPass', t0 + 3500);
  assert.equal(pendingWrongPass.ok, false);
  if (!pendingWrongPass.ok) {
    assert.equal(pendingWrongPass.reason, 'invalid_credentials');
  }

  // Admin edits a field -> editHistory records it
  const editRes = registrationService.updateRegistration(
    submitRes.registration.id,
    { fullName: 'Mahmudul Hasan Chowdhury', pathway: 'Commerce' },
    t0 + 4000
  );
  assert.equal(editRes.ok, true);
  if (editRes.ok) {
    assert.equal(editRes.registration.editHistory.length, 2);
    assert.equal(editRes.registration.fullName, 'Mahmudul Hasan Chowdhury');
  }

  // Admin approves registration -> creates user account
  const approveRes = registrationService.approveRegistration(submitRes.registration.id, t0 + 5000);
  assert.equal(approveRes.ok, true);

  // User can now log in by email OR phone
  const loginByEmail = authService.login('mahmudul@school.edu.bd', 'Password@123', t0 + 6000);
  assert.equal(loginByEmail.ok, true);
  if (loginByEmail.ok) {
    assert.equal(loginByEmail.session.role, 'student');
    assert.equal(loginByEmail.session.fullName, 'Mahmudul Hasan Chowdhury');
  }

  authService.logout(t0 + 7000);
  const loginByPhone = authService.login('01755667788', 'Password@123', t0 + 8000);
  assert.equal(loginByPhone.ok, true);
});

test('admin rejection requires reason and keeps account uncreated', () => {
  const t0 = 1_700_000_000_000;
  resetDatabase(t0);

  const pendingTeacher = registrationService.listRegistrations('pending').find((r) => r.role === 'teacher');
  assert.ok(pendingTeacher);

  const emptyReject = registrationService.rejectRegistration(pendingTeacher.id, '   ', t0 + 1000);
  assert.equal(emptyReject.ok, false);

  const validReject = registrationService.rejectRegistration(
    pendingTeacher.id,
    'Teacher ID does not match institutional roster.',
    t0 + 2000
  );
  assert.equal(validReject.ok, true);

  const db = loadDatabase(t0 + 2000);
  assert.equal(db.users.some((u) => u.email === pendingTeacher.email), false);
});

test('5 failed login attempts trigger temporary lock and admin first-login password change clears mustChangePassword', () => {
  const t0 = 1_700_000_000_000;
  resetDatabase(t0);

  for (let i = 1; i < MAX_FAILED_LOGIN_ATTEMPTS; i++) {
    const attempt = authService.login('admin1@example.com', 'wrong-pass', t0 + i * 1000);
    assert.equal(attempt.ok, false);
    if (!attempt.ok) {
      assert.equal(attempt.reason, 'invalid_credentials');
    }
  }

  // 5th attempt triggers lock
  const fifth = authService.login('admin1@example.com', 'wrong-pass', t0 + 5000);
  assert.equal(fifth.ok, false);
  if (!fifth.ok) {
    assert.equal(fifth.reason, 'locked');
  }

  // Even correct password is blocked while locked
  const duringLock = authService.login('admin1@example.com', 'Admin@1234', t0 + 10_000);
  assert.equal(duringLock.ok, false);
  if (!duringLock.ok) {
    assert.equal(duringLock.reason, 'locked');
  }

  // After lock expires, login succeeds with mustChangePassword=true
  const afterLock = authService.login('admin1@example.com', 'Admin@1234', t0 + 6 * 60 * 1000);
  assert.equal(afterLock.ok, true);
  if (afterLock.ok) {
    assert.equal(afterLock.session.mustChangePassword, true);
  }

  // Wrong OTP rejected
  const badOtp = authService.verifyOtpAndChangePassword(
    'admin1@example.com',
    '000000',
    'NewStrong@99',
    t0 + 6 * 60 * 1000 + 1000
  );
  assert.equal(badOtp.ok, false);

  // Valid demo OTP 123456 changes password & clears mustChangePassword
  const goodOtp = authService.verifyOtpAndChangePassword(
    'admin1@example.com',
    DEMO_OTP_CODE,
    'NewStrong@99',
    t0 + 6 * 60 * 1000 + 2000
  );
  assert.equal(goodOtp.ok, true);
  if (goodOtp.ok) {
    assert.equal(goodOtp.session?.mustChangePassword, false);
  }

  // Can now log in with new password
  authService.logout();
  const relogin = authService.login('admin1@example.com', 'NewStrong@99', t0 + 6 * 60 * 1000 + 3000);
  assert.equal(relogin.ok, true);
  if (relogin.ok) {
    assert.equal(relogin.session.mustChangePassword, false);

    // Logged-in admin cannot change another admin's password via expectedUserId guard
    const otherAdminAttempt = authService.verifyOtpAndChangePassword(
      'admin2@example.com',
      DEMO_OTP_CODE,
      'Hijack@2026',
      t0 + 6 * 60 * 1000 + 3500,
      relogin.session.userId
    );
    assert.equal(otherAdminAttempt.ok, false);

    // Logged-in admin CAN change their own password using their phone number
    const ownPhoneChange = authService.verifyOtpAndChangePassword(
      '01700000001',
      DEMO_OTP_CODE,
      'Handover@2026',
      t0 + 6 * 60 * 1000 + 4000,
      relogin.session.userId
    );
    assert.equal(ownPhoneChange.ok, true);
  }
});

test('expectedRole login guard blocks cross-role sign-in only after verifying password', () => {
  const t0 = 1_700_000_000_000;
  resetDatabase(t0);

  // Wrong password under mismatched role still returns invalid_credentials (never leaks role)
  const badPass = authService.login('admin1@example.com', 'WrongPass', t0 + 1000, 'student');
  assert.equal(badPass.ok, false);
  if (!badPass.ok) {
    assert.equal(badPass.reason, 'invalid_credentials');
  }

  // Correct password under mismatched role returns role_mismatch with actualRole
  const mismatch = authService.login('admin1@example.com', 'Admin@1234', t0 + 2000, 'student');
  assert.equal(mismatch.ok, false);
  if (!mismatch.ok) {
    assert.equal(mismatch.reason, 'role_mismatch');
    assert.equal(mismatch.actualRole, 'admin');
  }
  assert.equal(authService.getCurrentSession(t0 + 2000), null);

  // Correct password under matching role succeeds
  const matched = authService.login('admin1@example.com', 'Admin@1234', t0 + 3000, 'admin');
  assert.equal(matched.ok, true);
  if (matched.ok) {
    assert.equal(matched.session.role, 'admin');
  }
});

test('password recovery validates email + Bangladesh phone and resets password on valid OTP', () => {
  const t0 = 1_700_000_000_000;
  resetDatabase(t0);

  // Invalid email/phone format rejected
  const badEmail = authService.requestRecoveryOtp('not-an-email', '01812345678', t0 + 100);
  assert.equal(badEmail.ok, false);
  const badPhone = authService.requestRecoveryOtp('nafisa@student.edu.bd', '12345', t0 + 200);
  assert.equal(badPhone.ok, false);

  // Valid format succeeds
  const otpReq = authService.requestRecoveryOtp('nafisa@student.edu.bd', '01812345678', t0 + 300);
  assert.equal(otpReq.ok, true);

  // Mismatched phone for stored account fails
  const wrongPhone = authService.verifyRecoveryOtpAndResetPassword(
    'nafisa@student.edu.bd',
    '01899999999',
    DEMO_OTP_CODE,
    'Recovered@2026',
    'student',
    t0 + 400
  );
  assert.equal(wrongPhone.ok, false);

  // Mismatched role fails
  const wrongRole = authService.verifyRecoveryOtpAndResetPassword(
    'nafisa@student.edu.bd',
    '01812345678',
    DEMO_OTP_CODE,
    'Recovered@2026',
    'admin',
    t0 + 500
  );
  assert.equal(wrongRole.ok, false);

  // Matching email, phone, role, and OTP resets password
  const okReset = authService.verifyRecoveryOtpAndResetPassword(
    'nafisa@student.edu.bd',
    '01812345678',
    DEMO_OTP_CODE,
    'Recovered@2026',
    'student',
    t0 + 600
  );
  assert.equal(okReset.ok, true);

  const loginNew = authService.login('nafisa@student.edu.bd', 'Recovered@2026', t0 + 700, 'student');
  assert.equal(loginNew.ok, true);
});

test('login persists selectedStream and selectedPathway and manages device sessions cleanly', () => {
  const t0 = 1_700_000_000_000;
  resetDatabase(t0);

  const loginRes = authService.login('admin1@example.com', 'Admin@1234', t0 + 1000, 'admin', {
    stream: 'Bangladesh National Curriculum (NCTB)',
    pathway: 'Bangla Version',
  });
  assert.equal(loginRes.ok, true);
  if (!loginRes.ok) return;

  assert.equal(loginRes.session.selectedStream, 'Bangladesh National Curriculum (NCTB)');
  assert.equal(loginRes.session.selectedPathway, 'Bangla Version');

  const devices = authService.listDeviceSessions(loginRes.session.userId, t0 + 1000);
  assert.equal(devices.length, 3);
  assert.equal(devices[0].isCurrent, true);

  const otherDevice = devices.find((d) => !d.isCurrent);
  assert.ok(otherDevice);

  // Attempting to revoke current device leaves it intact
  const afterCurrentAttempt = authService.revokeDeviceSession(
    loginRes.session.userId,
    devices[0].id,
    t0 + 2000
  );
  assert.equal(afterCurrentAttempt.length, 3);

  // Revoking non-current device removes only that device
  const afterRevokeOne = authService.revokeDeviceSession(
    loginRes.session.userId,
    otherDevice.id,
    t0 + 3000
  );
  assert.equal(afterRevokeOne.length, 2);
  assert.equal(afterRevokeOne.some((d) => d.id === otherDevice.id), false);

  // Revoking all other devices leaves only current session
  const afterRevokeAll = authService.revokeOtherDeviceSessions(loginRes.session.userId, t0 + 4000);
  assert.equal(afterRevokeAll.length, 1);
  assert.equal(afterRevokeAll[0].isCurrent, true);
});

test('couponService.filterCoupons searches by code, compact digits, Bengali digits, role, and status', () => {
  const t0 = 1_700_000_000_000;
  resetDatabase(t0);
  const all = couponService.listCoupons(t0);

  // Exact / partial code match (case & hyphen insensitive)
  const byFullCode = couponService.filterCoupons(all, { query: 't-44910' });
  assert.equal(byFullCode.length, 1);
  assert.equal(byFullCode[0].code, 'T-44910');

  const byCompact = couponService.filterCoupons(all, { query: 's55821' });
  assert.equal(byCompact.length, 1);
  assert.equal(byCompact[0].code, 'S-55821');

  // Bengali digits match
  const byBanglaDigits = couponService.filterCoupons(all, { query: '৪৪৯১০' });
  assert.equal(byBanglaDigits.length, 1);
  assert.equal(byBanglaDigits[0].code, 'T-44910');

  // Role + status combined filter
  const activeTeachers = couponService.filterCoupons(all, { status: 'active', query: 'teacher' });
  assert.equal(activeTeachers.length, 1);
  assert.equal(activeTeachers[0].code, 'T-44910');

  // Non-matching query returns empty list
  const none = couponService.filterCoupons(all, { query: '99999' });
  assert.equal(none.length, 0);
});

test('admin manual edit on approved registration updates editHistory and syncs the created user account', () => {
  const t0 = 1_700_000_000_000;
  resetDatabase(t0);

  const pendingStudent = registrationService
    .listRegistrations('pending', t0)
    .find((r) => r.role === 'student');
  assert.ok(pendingStudent);

  const approveRes = registrationService.approveRegistration(pendingStudent.id, t0 + 1000);
  assert.equal(approveRes.ok, true);

  const editApprovedRes = registrationService.updateRegistration(
    pendingStudent.id,
    { fullName: 'Tanvir Ahmed Khan', studentClass: 11 },
    t0 + 2000
  );
  assert.equal(editApprovedRes.ok, true);
  if (!editApprovedRes.ok) return;

  assert.equal(editApprovedRes.registration.fullName, 'Tanvir Ahmed Khan');
  assert.equal(editApprovedRes.registration.studentClass, 11);
  assert.equal(editApprovedRes.registration.editHistory.length, 2);

  const db = loadDatabase(t0 + 2000);
  const syncedUser = db.users.find((u) => u.email === pendingStudent.email);
  assert.ok(syncedUser);
  assert.equal(syncedUser.fullName, 'Tanvir Ahmed Khan');
  assert.equal(syncedUser.studentClass, 11);
});

test('registrationService.filterEditHistory searches by field, localized label, old/new values, multi-word keywords, and Bengali digits', () => {
  const t0 = 1_700_000_000_000;
  const entries = [
    {
      id: 'edit-1',
      field: 'fullName',
      oldValue: 'Tanvir Ahmed',
      newValue: 'Tanvir Ahmed Chowdhury',
      editedAt: t0,
    },
    {
      id: 'edit-2',
      field: 'studentClass',
      oldValue: '10',
      newValue: '11',
      editedAt: t0 + 1000,
    },
    {
      id: 'edit-3',
      field: 'phone',
      oldValue: '01711223344',
      newValue: '01899887766',
      editedAt: t0 + 2000,
    },
  ];

  const labels = {
    fullName: 'Full Name',
    studentClass: 'Class',
    phone: 'মোবাইল নম্বর',
  };

  assert.equal(registrationService.filterEditHistory(entries, '', labels).length, 3);

  const byNewValue = registrationService.filterEditHistory(entries, 'chowdhury', labels);
  assert.equal(byNewValue.length, 1);
  assert.equal(byNewValue[0].id, 'edit-1');

  const byMultiWord = registrationService.filterEditHistory(entries, 'class 11', labels);
  assert.equal(byMultiWord.length, 1);
  assert.equal(byMultiWord[0].id, 'edit-2');

  const byBanglaDigits = registrationService.filterEditHistory(entries, '০১৮৯৯', labels);
  assert.equal(byBanglaDigits.length, 1);
  assert.equal(byBanglaDigits[0].id, 'edit-3');

  const byBanglaLabel = registrationService.filterEditHistory(entries, 'মোবাইল', labels);
  assert.equal(byBanglaLabel.length, 1);
  assert.equal(byBanglaLabel[0].id, 'edit-3');

  assert.equal(registrationService.filterEditHistory(entries, 'nonexistent-keyword', labels).length, 0);
});

