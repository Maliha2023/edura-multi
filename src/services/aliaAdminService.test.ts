import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ALIA_ALL_DEPARTMENTS,
  ALIA_MARHALAS,
  aliaAdminService,
  formatAliaAcademicDisplay,
  getAliaPanelName,
  getDemoAliaAdminPreset,
  getDepartmentsForMarhala,
  getShortMarhalaLabel,
  normalizeDepartmentForMarhala,
  resetAliaAdminStore,
  resolveAliaAdminPathway,
} from './aliaAdminService';
import { authService } from './authService';
import { loadDatabase, resetDatabase } from './storage';

const BASE_TIME = 1_760_000_000_000;

test('strict pathway isolation and Alia Madrasa Marhala/Department grouping rules', () => {
  resetAliaAdminStore(BASE_TIME);

  assert.equal(resolveAliaAdminPathway('Alia'), 'alia');
  assert.equal(resolveAliaAdminPathway('alia'), 'alia');
  assert.equal(resolveAliaAdminPathway('Alia Madrasa'), 'alia');
  assert.equal(resolveAliaAdminPathway('Alia Madrasa Panel'), 'alia');
  assert.equal(resolveAliaAdminPathway('Cambridge'), null);
  assert.equal(resolveAliaAdminPathway('Edexcel'), null);
  assert.equal(resolveAliaAdminPathway('Bangla Version'), null);
  assert.equal(resolveAliaAdminPathway('English Version'), null);
  assert.equal(resolveAliaAdminPathway('Qawmi'), null);
  assert.equal(getAliaPanelName(), 'Alia Madrasa Panel');

  assert.deepEqual(ALIA_MARHALAS, [
    'Ebtedayee (Classes 1–5)',
    'Dakhil (Classes 6–10)',
    'Alim (Classes 11–12)',
    'Fazil (Degree / Pass)',
    'Kamil (Masters)',
  ]);

  assert.deepEqual(ALIA_ALL_DEPARTMENTS, [
    'General',
    'Science',
    'Muzabbid Mahire Tajweed',
    'Hifzul Quran',
    'Hadith & Tafsir',
    'Fiqh & Usul',
  ]);

  assert.deepEqual(getDepartmentsForMarhala('Ebtedayee (Classes 1–5)'), [
    'General',
    'Hifzul Quran',
    'Muzabbid Mahire Tajweed',
  ]);
  assert.deepEqual(getDepartmentsForMarhala('Dakhil (Classes 6–10)'), [
    'General',
    'Science',
    'Muzabbid Mahire Tajweed',
  ]);
  assert.deepEqual(getDepartmentsForMarhala('Alim (Classes 11–12)'), [
    'General',
    'Science',
    'Muzabbid Mahire Tajweed',
  ]);
  assert.deepEqual(getDepartmentsForMarhala('Fazil (Degree / Pass)'), [
    'Hadith & Tafsir',
    'Fiqh & Usul',
    'General',
  ]);
  assert.deepEqual(getDepartmentsForMarhala('Kamil (Masters)'), [
    'Hadith & Tafsir',
    'Fiqh & Usul',
    'General',
  ]);

  assert.equal(getShortMarhalaLabel('Ebtedayee (Classes 1–5)'), 'Ebtedayee');
  assert.equal(getShortMarhalaLabel('Dakhil (Classes 6–10)'), 'Dakhil');
  assert.equal(getShortMarhalaLabel('Alim (Classes 11–12)'), 'Alim');
  assert.equal(getShortMarhalaLabel('Fazil (Degree / Pass)'), 'Fazil');
  assert.equal(getShortMarhalaLabel('Kamil (Masters)'), 'Kamil');

  // Dynamic validation rejects mismatched Marhala + Department
  const invalidCombo = normalizeDepartmentForMarhala('Ebtedayee (Classes 1–5)', 'Science');
  assert.equal(invalidCombo.ok, false);

  const invalidHigherCombo = normalizeDepartmentForMarhala('Kamil (Masters)', 'Science');
  assert.equal(invalidHigherCombo.ok, false);

  const validHigherCombo = normalizeDepartmentForMarhala('Kamil (Masters)', 'Hadith & Tafsir');
  assert.equal(validHigherCombo.ok, true);

  const users = aliaAdminService.listDirectory({}, BASE_TIME);
  assert.ok(users.length >= 8);
  assert.ok(users.every((u) => u.pathway === 'alia'));
});

test('coupon generation creates unique 48h T-XXXXX and S-XXXXX codes and tracks expiry', () => {
  resetAliaAdminStore(BASE_TIME);

  const teacherCoupon = aliaAdminService.generateCoupon(
    'teacher',
    'admin@alia-madrasa.edu.bd',
    BASE_TIME
  );
  const studentCoupon = aliaAdminService.generateCoupon(
    'student',
    'admin@alia-madrasa.edu.bd',
    BASE_TIME
  );

  assert.match(teacherCoupon.code, /^T-\d{5}$/);
  assert.match(studentCoupon.code, /^S-\d{5}$/);
  assert.equal(teacherCoupon.pathway, 'alia');
  assert.equal(studentCoupon.pathway, 'alia');
  assert.equal(teacherCoupon.expiresAt - teacherCoupon.createdAt, 48 * 60 * 60 * 1000);

  const activeCoupons = aliaAdminService.listCoupons({ status: 'active' }, BASE_TIME);
  assert.ok(activeCoupons.some((c) => c.code === teacherCoupon.code));
  assert.ok(activeCoupons.some((c) => c.code === studentCoupon.code));

  // After 49h, both newly generated coupons expire automatically
  const after49h = BASE_TIME + 49 * 60 * 60 * 1000;
  const expired = aliaAdminService.listCoupons({ status: 'expired' }, after49h);
  assert.ok(expired.some((c) => c.code === teacherCoupon.code));
  assert.ok(expired.some((c) => c.code === studentCoupon.code));
});

test('pending approvals edit, approve, and reject workflows update directory and redeem coupons', () => {
  resetAliaAdminStore(BASE_TIME);

  const pendingStudents = aliaAdminService.listPending('student', BASE_TIME);
  assert.ok(pendingStudents.length >= 2);
  const target = pendingStudents[0];

  const badEdit = aliaAdminService.editPending(
    target.id,
    {
      fullName: target.fullName,
      email: target.email,
      marhala: 'Ebtedayee (Classes 1–5)',
      department: 'Hadith & Tafsir',
    },
    'admin@alia-madrasa.edu.bd',
    BASE_TIME + 1000
  );
  assert.equal(badEdit.ok, false);

  const edited = aliaAdminService.editPending(
    target.id,
    {
      fullName: 'Saiful Islam Updated',
      email: target.email,
      marhala: 'Dakhil (Classes 6–10)',
      department: 'Muzabbid Mahire Tajweed',
    },
    'admin@alia-madrasa.edu.bd',
    BASE_TIME + 1500
  );
  assert.equal(edited.ok, true);
  if (edited.ok) {
    assert.equal(edited.item.marhala, 'Dakhil (Classes 6–10)');
    assert.equal(edited.item.department, 'Muzabbid Mahire Tajweed');
  }

  const approved = aliaAdminService.approvePending(
    target.id,
    'admin@alia-madrasa.edu.bd',
    BASE_TIME + 2000
  );
  assert.equal(approved.ok, true);
  if (approved.ok) {
    assert.equal(approved.profile.registrationType, 'coupon_auto');
    assert.equal(approved.profile.status, 'active');
    assert.equal(approved.profile.department, 'Muzabbid Mahire Tajweed');
  }

  const remaining = aliaAdminService.listPending('student', BASE_TIME + 2000);
  assert.ok(!remaining.some((p) => p.id === target.id));

  const rejected = aliaAdminService.rejectPending(
    remaining[0].id,
    'admin@alia-madrasa.edu.bd',
    BASE_TIME + 3000
  );
  assert.equal(rejected.ok, true);
});

test('directory filters, manual registration, password reset, CSV export, and notices CRUD work end-to-end', () => {
  resetAliaAdminStore(BASE_TIME);

  // Filter by Marhala & Department
  const fazilHadithStudents = aliaAdminService.listDirectory(
    {
      role: 'student',
      marhala: 'Fazil (Degree / Pass)',
      department: 'Hadith & Tafsir',
    },
    BASE_TIME
  );
  assert.ok(fazilHadithStudents.length >= 1);
  assert.ok(
    fazilHadithStudents.every(
      (u) => u.marhala === 'Fazil (Degree / Pass)' && u.department === 'Hadith & Tafsir'
    )
  );

  // Manual teacher account fails without primary subject
  const teacherMissingSubject = aliaAdminService.createManualAccount(
    {
      role: 'teacher',
      fullName: 'Maulana Zubayer Hossain',
      email: 'zubayer@alia-teacher.edu.bd',
      temporaryPassword: 'TempPass@2026',
      marhala: 'Alim (Classes 11–12)',
      department: 'Science',
      primarySubject: '',
    },
    'admin@alia-madrasa.edu.bd',
    BASE_TIME + 1000
  );
  assert.equal(teacherMissingSubject.ok, false);

  // Valid manual teacher account creation
  const createdTeacher = aliaAdminService.createManualAccount(
    {
      role: 'teacher',
      fullName: 'Maulana Zubayer Hossain',
      email: 'zubayer@alia-teacher.edu.bd',
      temporaryPassword: 'TempPass@2026',
      marhala: 'Alim (Classes 11–12)',
      department: 'Science',
      primarySubject: 'Chemistry',
    },
    'admin@alia-madrasa.edu.bd',
    BASE_TIME + 1500
  );
  assert.equal(createdTeacher.ok, true);
  if (createdTeacher.ok) {
    assert.equal(createdTeacher.profile.registrationType, 'manual_admin');
    assert.equal(createdTeacher.credentialsSummary.marhala, 'Alim (Classes 11–12)');
    assert.equal(createdTeacher.credentialsSummary.department, 'Science');
    const display = formatAliaAcademicDisplay(createdTeacher.profile);
    assert.equal(display.marhalaShort, 'Alim');
    assert.equal(display.detail, 'Science · Chemistry');
  }

  // Password reset & CSV export
  const teachers = aliaAdminService.listDirectory({ role: 'teacher' }, BASE_TIME + 2000);
  const reset = aliaAdminService.resetUserPassword(
    teachers[0].id,
    'admin@alia-madrasa.edu.bd',
    BASE_TIME + 2500,
    'AliaReset@2026'
  );
  assert.equal(reset.ok, true);
  if (reset.ok) {
    assert.equal(reset.temporaryPassword, 'AliaReset@2026');
  }

  const csv = aliaAdminService.exportDirectoryCsv(teachers);
  assert.ok(csv.includes('Marhala'));
  assert.ok(csv.includes('Department / Stream'));
  assert.ok(csv.includes('Alia Madrasa'));

  // Notices validation & CRUD
  const badNotice = aliaAdminService.createNotice(
    {
      title: 'Invalid Dept Notice',
      description: 'Trying to target Science under Fazil must fail cleanly.',
      audience: 'student',
      marhala: 'Fazil (Degree / Pass)',
      department: 'Science',
      tag: 'Exam',
    },
    'admin@alia-madrasa.edu.bd',
    BASE_TIME + 3000
  );
  assert.equal(badNotice.ok, false);

  const createdNotice = aliaAdminService.createNotice(
    {
      title: 'Kamil Fiqh & Usul Viva Voce Schedule',
      description: 'All Kamil Fiqh & Usul candidates must appear at 10:00 AM in Darul Ifta Hall.',
      audience: 'student',
      marhala: 'Kamil (Masters)',
      department: 'Fiqh & Usul',
      tag: 'Exam',
    },
    'admin@alia-madrasa.edu.bd',
    BASE_TIME + 3500
  );
  assert.equal(createdNotice.ok, true);

  if (createdNotice.ok) {
    const filtered = aliaAdminService.listNotices(
      { marhala: 'Kamil (Masters)', department: 'Fiqh & Usul' },
      BASE_TIME + 3500
    );
    assert.equal(filtered.length, 1);
    assert.equal(filtered[0].id, createdNotice.notice.id);

    const updatedNotice = aliaAdminService.updateNotice(
      createdNotice.notice.id,
      {
        title: 'Kamil Fiqh & Usul Updated Viva Schedule',
        description:
          'Updated schedule: All Kamil Fiqh & Usul candidates appear at 11:00 AM in Darul Ifta Hall.',
        audience: 'both',
        marhala: 'Kamil (Masters)',
        department: 'Fiqh & Usul',
        tag: 'Urgent',
      },
      'admin@alia-madrasa.edu.bd',
      BASE_TIME + 4000
    );
    assert.equal(updatedNotice.ok, true);

    const deletedNotice = aliaAdminService.deleteNotice(
      createdNotice.notice.id,
      'admin@alia-madrasa.edu.bd',
      BASE_TIME + 4500
    );
    assert.equal(deletedNotice.ok, true);
  }
});

test('Alia demo admin preset provisions isolated admin.alia@example.com for 1-click login', () => {
  resetDatabase(BASE_TIME);
  const preset = getDemoAliaAdminPreset();
  assert.equal(preset.quickAccessTitle, 'Quick Alia Panel Access');
  assert.equal(preset.email, 'admin.alia@example.com');
  assert.equal(preset.panelName, 'Alia Madrasa Panel');
  assert.equal(preset.pathway, 'alia');

  // Non-matching emails should never create an admin record
  aliaAdminService.prepareAliaAdminForLogin('admin.cambridge@example.com', BASE_TIME);
  assert.equal(
    loadDatabase(BASE_TIME).users.some((u) => u.email.toLowerCase() === 'admin.alia@example.com'),
    false
  );

  // Matching email provisions the isolated Alia admin without touching other pathways
  aliaAdminService.prepareAliaAdminForLogin(preset.email, BASE_TIME);
  const loginRes = authService.login(
    preset.email,
    preset.password,
    BASE_TIME,
    'admin',
    { stream: 'Bangladesh Madrasa Education', pathway: preset.pathwayLabel }
  );
  assert.equal(loginRes.ok, true);
  if (loginRes.ok) {
    assert.equal(loginRes.session.role, 'admin');
    assert.equal(loginRes.session.mustChangePassword, false);
    assert.equal(loginRes.session.selectedPathway, 'Alia');
    assert.equal(loginRes.session.selectedStream, 'Bangladesh Madrasa Education');
  }
});

