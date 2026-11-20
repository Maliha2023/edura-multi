import assert from 'node:assert/strict';
import test from 'node:test';
import {
  adminUsersService,
  buildUsersCsv,
  formatAcademicLevel,
  formatCountdownRemaining,
  generateRandomPassword,
  resetAdminUsersStore,
} from './adminUsersService';
import { resetDatabase } from './storage';

test('strict pathway isolation prevents Bangla Version and English Version data crossover', () => {
  const t0 = 1_700_000_000_000;
  resetDatabase(t0);
  resetAdminUsersStore(t0);

  const bvPending = adminUsersService.listPending('bangla_version', t0);
  const evPending = adminUsersService.listPending('english_version', t0);
  assert.ok(bvPending.length > 0);
  assert.ok(evPending.length > 0);
  assert.equal(bvPending.every((p) => p.pathway === 'bangla_version'), true);
  assert.equal(evPending.every((p) => p.pathway === 'english_version'), true);

  // Attempting to edit or approve an English Version pending record from Bangla Version must fail
  const crossEdit = adminUsersService.editPendingRegistration(
    'bangla_version',
    evPending[0].id,
    { fullName: 'Hacked Name', academicClass: 10, academicGroup: 'Science' },
    t0 + 1000
  );
  assert.equal(crossEdit.ok, false);

  const crossApprove = adminUsersService.approvePendingRegistration(
    'bangla_version',
    evPending[0].id,
    t0 + 1000
  );
  assert.equal(crossApprove.ok, false);

  // Directory isolation check
  const bvProfiles = adminUsersService.listProfiles('bangla_version', t0);
  const evProfiles = adminUsersService.listProfiles('english_version', t0);
  assert.equal(bvProfiles.every((p) => p.pathway === 'bangla_version'), true);
  assert.equal(evProfiles.every((p) => p.pathway === 'english_version'), true);

  const crossDelete = adminUsersService.deleteProfile('bangla_version', evProfiles[0].id, t0 + 1000);
  assert.equal(crossDelete.ok, false);
});

test('pending approval edit, approve, and reject flows enforce class/group rules and move approved users to directory', () => {
  const t0 = 1_700_000_000_000;
  resetDatabase(t0);
  resetAdminUsersStore(t0);

  const pendingStudents = adminUsersService.filterPending(
    adminUsersService.listPending('bangla_version', t0),
    { role: 'student' }
  );
  assert.ok(pendingStudents.length >= 2);

  // Group filtering for Student Pending (Science only)
  const scienceOnly = adminUsersService.filterPending(
    adminUsersService.listPending('bangla_version', t0),
    { role: 'student', academicGroup: 'Science' }
  );
  assert.equal(scienceOnly.every((s) => s.academicGroup === 'Science' && s.academicClass >= 9), true);

  // Edit typo before approving (downgrading to Class 5 must automatically clear group to null)
  const target = pendingStudents[0];
  const editRes = adminUsersService.editPendingRegistration(
    'bangla_version',
    target.id,
    { fullName: 'Tanvir Ahmed Corrected', academicClass: 5, academicGroup: 'Science' },
    t0 + 500
  );
  assert.equal(editRes.ok, true);
  if (!editRes.ok) return;
  assert.equal(editRes.record.fullName, 'Tanvir Ahmed Corrected');
  assert.equal(editRes.record.academicClass, 5);
  assert.equal(editRes.record.academicGroup, null);

  // Approve moves record to active profile with registrationType = 'coupon_auto'
  const approveRes = adminUsersService.approvePendingRegistration(
    'bangla_version',
    target.id,
    t0 + 1000
  );
  assert.equal(approveRes.ok, true);
  if (!approveRes.ok) return;
  assert.equal(approveRes.profile.registrationType, 'coupon_auto');
  assert.equal(approveRes.profile.status, 'active');
  assert.equal(approveRes.profile.pathway, 'bangla_version');

  // Record is removed from pending_registrations
  const remainingPending = adminUsersService.listPending('bangla_version', t0 + 1000);
  assert.equal(remainingPending.some((r) => r.id === target.id), false);

  // Reject another pending registration removes it cleanly
  const toReject = pendingStudents[1];
  const rejectRes = adminUsersService.rejectPendingRegistration(
    'bangla_version',
    toReject.id,
    t0 + 1500
  );
  assert.equal(rejectRes.ok, true);
  assert.equal(
    adminUsersService.listPending('bangla_version', t0 + 1500).some((r) => r.id === toReject.id),
    false
  );
});

test('directory search, filters, academic update, status toggle, password reset, delete, and CSV export', () => {
  const t0 = 1_700_000_000_000;
  resetDatabase(t0);
  resetAdminUsersStore(t0);

  const profiles = adminUsersService.listProfiles('bangla_version', t0);
  const studentMatches = adminUsersService.filterProfiles(profiles, {
    role: 'student',
    query: 'nafisa',
    academicClass: 9,
    academicGroup: 'Science',
    status: 'active',
    registrationType: 'coupon_auto',
  });
  assert.equal(studentMatches.length, 1);
  const nafisa = studentMatches[0];

  // Update academic info
  const updated = adminUsersService.updateProfileAcademicInfo(
    'bangla_version',
    nafisa.id,
    { fullName: 'Nafisa Tasnim Rahman', academicClass: 10, academicGroup: 'Commerce' },
    t0 + 1000
  );
  assert.equal(updated.ok, true);
  if (!updated.ok) return;
  assert.equal(formatAcademicLevel(updated.profile.academicClass, updated.profile.academicGroup), 'Class 10 • Commerce');

  // Toggle status active -> suspended -> active
  const suspended = adminUsersService.toggleProfileStatus('bangla_version', nafisa.id, t0 + 2000);
  assert.equal(suspended.ok, true);
  if (!suspended.ok) return;
  assert.equal(suspended.profile.status, 'suspended');

  // Reset password
  const tempPass = generateRandomPassword(12);
  assert.ok(tempPass.length >= 12);
  const resetRes = adminUsersService.resetProfilePassword(
    'bangla_version',
    nafisa.id,
    tempPass,
    t0 + 3000
  );
  assert.equal(resetRes.ok, true);

  // CSV export contains header + user row
  const csv = buildUsersCsv([suspended.profile]);
  assert.ok(csv.includes('User ID,Full Name,Email,Role,Pathway,Class,Group,Entry Source,Status,Joined Date'));
  assert.ok(csv.includes('Nafisa Tasnim Rahman'));
  assert.ok(csv.includes('Bangla Version'));

  // Delete user
  const delRes = adminUsersService.deleteProfile('bangla_version', nafisa.id, t0 + 4000);
  assert.equal(delRes.ok, true);
  assert.equal(
    adminUsersService.listProfiles('bangla_version', t0 + 4000).some((p) => p.id === nafisa.id),
    false
  );
});

test('manual registration creates active admin_manual account directly bypassing pending queue', () => {
  const t0 = 1_700_000_000_000;
  resetDatabase(t0);
  resetAdminUsersStore(t0);

  const pendingBefore = adminUsersService.listPending('english_version', t0).length;
  const createRes = adminUsersService.createManualAccount(
    {
      pathway: 'english_version',
      role: 'student',
      fullName: 'Aarav Sen',
      email: 'aarav.ev@student.edu.bd',
      temporaryPassword: 'TempPass@2026',
      academicClass: 11,
      academicGroup: 'Science',
    },
    t0 + 500
  );

  assert.equal(createRes.ok, true);
  if (!createRes.ok) return;
  assert.equal(createRes.profile.pathway, 'english_version');
  assert.equal(createRes.profile.registrationType, 'admin_manual');
  assert.equal(createRes.profile.status, 'active');
  assert.equal(createRes.profile.academicGroup, 'Science');
  assert.equal(adminUsersService.listPending('english_version', t0 + 500).length, pendingBefore);

  // Duplicate email rejected
  const dupRes = adminUsersService.createManualAccount(
    {
      pathway: 'english_version',
      role: 'student',
      fullName: 'Duplicate User',
      email: 'aarav.ev@student.edu.bd',
      temporaryPassword: 'TempPass@2026',
      academicClass: 7,
      academicGroup: null,
    },
    t0 + 600
  );
  assert.equal(dupRes.ok, false);

  // Countdown formatting sanity
  const activeTimer = formatCountdownRemaining(t0 + 10 * 3600 * 1000 + 5 * 60 * 1000 + 9 * 1000, t0);
  assert.equal(activeTimer.text, '10h 05m 09s');
  assert.equal(activeTimer.expired, false);
  assert.equal(activeTimer.urgent, false);

  const expiredTimer = formatCountdownRemaining(t0 - 1000, t0);
  assert.equal(expiredTimer.text, 'Expired');
  assert.equal(expiredTimer.expired, true);
});
