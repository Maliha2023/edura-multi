import test from 'node:test';
import assert from 'node:assert/strict';
import {
  QAWMI_FOCUS_BRANCHES,
  QAWMI_MARHALAS,
  formatQawmiAcademicDisplay,
  getDemoQawmiAdminPreset,
  getDirectoryFilterMarhalaLabel,
  getFocusBranchesForMarhala,
  getQawmiPanelName,
  getShortMarhalaLabel,
  normalizeFocusBranch,
  qawmiAdminService,
  resetQawmiAdminStore,
  resolveQawmiAdminPathway,
} from './qawmiAdminService';
import { authService } from './authService';
import { loadDatabase, resetDatabase } from './storage';

const BASE_TIME = 1_760_000_000_000;

test('strict pathway isolation and Qawmi Madrasa Marhala / Focus Branch structure', () => {
  resetQawmiAdminStore(BASE_TIME);

  assert.equal(resolveQawmiAdminPathway('Qawmi'), 'qawmi');
  assert.equal(resolveQawmiAdminPathway('qawmi'), 'qawmi');
  assert.equal(resolveQawmiAdminPathway('Qawmi Madrasa'), 'qawmi');
  assert.equal(resolveQawmiAdminPathway('Qawmi Madrasa Panel'), 'qawmi');
  assert.equal(resolveQawmiAdminPathway('Alia'), null);
  assert.equal(resolveQawmiAdminPathway('Cambridge'), null);
  assert.equal(resolveQawmiAdminPathway('Edexcel'), null);
  assert.equal(resolveQawmiAdminPathway('Bangla Version'), null);
  assert.equal(resolveQawmiAdminPathway('English Version'), null);
  assert.equal(getQawmiPanelName(), 'Qawmi Madrasa Panel');

  assert.deepEqual(QAWMI_MARHALAS, [
    'Maktab / Hifz / Nazera',
    'Ibtidaiyyah (Primary Marhala)',
    'Mutawassitah (Middle Marhala)',
    'Sanawiyyah Ulya (Higher Secondary Marhala)',
    'Fazilat (Degree Marhala)',
    'Takmil (Masters / Dawra-e-Hadith Marhala)',
  ]);

  assert.deepEqual(QAWMI_FOCUS_BRANCHES, [
    'General / Kitab',
    'Hifzul Quran',
    'Tajweed & Qiraat',
    'Hadith & Tafsir',
    'Fiqh & Usul',
    'Arabic & Adab',
  ]);

  for (const marhala of QAWMI_MARHALAS) {
    assert.deepEqual(getFocusBranchesForMarhala(marhala), QAWMI_FOCUS_BRANCHES);
  }

  assert.equal(getShortMarhalaLabel('Maktab / Hifz / Nazera'), 'Maktab / Hifz');
  assert.equal(getShortMarhalaLabel('Ibtidaiyyah (Primary Marhala)'), 'Ibtidaiyyah');
  assert.equal(getShortMarhalaLabel('Mutawassitah (Middle Marhala)'), 'Mutawassitah');
  assert.equal(getShortMarhalaLabel('Sanawiyyah Ulya (Higher Secondary Marhala)'), 'Sanawiyyah Ulya');
  assert.equal(getShortMarhalaLabel('Fazilat (Degree Marhala)'), 'Fazilat');
  assert.equal(getShortMarhalaLabel('Takmil (Masters / Dawra-e-Hadith Marhala)'), 'Takmil');

  assert.equal(
    getDirectoryFilterMarhalaLabel('Maktab / Hifz / Nazera'),
    'Maktab / Hifz / Nazera'
  );
  assert.equal(getDirectoryFilterMarhalaLabel('Takmil (Masters / Dawra-e-Hadith Marhala)'), 'Takmil');

  assert.equal(normalizeFocusBranch('Invalid').ok, false);
  assert.equal(normalizeFocusBranch('Hadith & Tafsir').ok, true);

  const users = qawmiAdminService.listDirectory({}, BASE_TIME);
  assert.ok(users.length >= 10);
  assert.ok(users.every((u) => u.pathway === 'qawmi'));
});

test('coupon generation creates unique 48h T-XXXXX and S-XXXXX codes and tracks expiry', () => {
  resetQawmiAdminStore(BASE_TIME);

  const teacherCoupon = qawmiAdminService.generateCoupon(
    'teacher',
    'muhtamim@qawmi-madrasa.edu.bd',
    BASE_TIME
  );
  const studentCoupon = qawmiAdminService.generateCoupon(
    'student',
    'muhtamim@qawmi-madrasa.edu.bd',
    BASE_TIME
  );

  assert.match(teacherCoupon.code, /^T-\d{5}$/);
  assert.match(studentCoupon.code, /^S-\d{5}$/);
  assert.equal(teacherCoupon.pathway, 'qawmi');
  assert.equal(studentCoupon.pathway, 'qawmi');
  assert.equal(teacherCoupon.expiresAt - teacherCoupon.createdAt, 48 * 60 * 60 * 1000);

  const activeCoupons = qawmiAdminService.listCoupons({ status: 'active' }, BASE_TIME);
  assert.ok(activeCoupons.some((c) => c.code === teacherCoupon.code));
  assert.ok(activeCoupons.some((c) => c.code === studentCoupon.code));

  const after49h = BASE_TIME + 49 * 60 * 60 * 1000;
  const expired = qawmiAdminService.listCoupons({ status: 'expired' }, after49h);
  assert.ok(expired.some((c) => c.code === teacherCoupon.code));
  assert.ok(expired.some((c) => c.code === studentCoupon.code));
});

test('pending approvals edit, approve, and reject workflows update directory and metrics', () => {
  resetQawmiAdminStore(BASE_TIME);

  const beforeMetrics = qawmiAdminService.getOverviewMetrics(BASE_TIME);
  const pendingStudents = qawmiAdminService.listPending('student', BASE_TIME);
  assert.ok(pendingStudents.length >= 2);
  const target = pendingStudents[0];

  const edited = qawmiAdminService.editPending(
    target.id,
    {
      fullName: `${target.fullName} Updated`,
      email: target.email,
      marhala: 'Mutawassitah (Middle Marhala)',
      focusBranch: 'Arabic & Adab',
    },
    'muhtamim@qawmi-madrasa.edu.bd',
    BASE_TIME + 1500
  );
  assert.equal(edited.ok, true);
  if (edited.ok) {
    assert.equal(edited.item.marhala, 'Mutawassitah (Middle Marhala)');
    assert.equal(edited.item.focusBranch, 'Arabic & Adab');
  }

  const approved = qawmiAdminService.approvePending(
    target.id,
    'muhtamim@qawmi-madrasa.edu.bd',
    BASE_TIME + 2000
  );
  assert.equal(approved.ok, true);
  if (approved.ok) {
    assert.equal(approved.profile.registrationType, 'coupon_auto');
    assert.equal(approved.profile.status, 'active');
    assert.equal(approved.profile.focusBranch, 'Arabic & Adab');
  }

  const afterApproveMetrics = qawmiAdminService.getOverviewMetrics(BASE_TIME + 2000);
  assert.equal(afterApproveMetrics.activeStudents, beforeMetrics.activeStudents + 1);
  assert.equal(afterApproveMetrics.pendingApprovals, beforeMetrics.pendingApprovals - 1);

  const remaining = qawmiAdminService.listPending('student', BASE_TIME + 2000);
  assert.ok(!remaining.some((p) => p.id === target.id));

  const rejected = qawmiAdminService.rejectPending(
    remaining[0].id,
    'muhtamim@qawmi-madrasa.edu.bd',
    BASE_TIME + 3000
  );
  assert.equal(rejected.ok, true);
});

test('directory filters, manual registration, password reset, CSV export, and notices CRUD work end-to-end', () => {
  resetQawmiAdminStore(BASE_TIME);

  const takmilHadithStudents = qawmiAdminService.listDirectory(
    {
      role: 'student',
      marhala: 'Takmil (Masters / Dawra-e-Hadith Marhala)',
      focusBranch: 'Hadith & Tafsir',
    },
    BASE_TIME
  );
  assert.ok(takmilHadithStudents.length >= 1);
  assert.ok(
    takmilHadithStudents.every(
      (u) =>
        u.marhala === 'Takmil (Masters / Dawra-e-Hadith Marhala)' &&
        u.focusBranch === 'Hadith & Tafsir'
    )
  );

  // Manual teacher account requires Primary Subject / Kitab
  const teacherMissingSubject = qawmiAdminService.createManualAccount(
    {
      role: 'teacher',
      fullName: 'Maulana Tariq Jamil',
      email: 'tariq.jamil@qawmi-madrasa.edu.bd',
      temporaryPassword: 'TempPass@2026',
      marhala: 'Fazilat (Degree Marhala)',
      focusBranch: 'Hadith & Tafsir',
      primarySubject: '',
    },
    'muhtamim@qawmi-madrasa.edu.bd',
    BASE_TIME + 1000
  );
  assert.equal(teacherMissingSubject.ok, false);

  const createdTeacher = qawmiAdminService.createManualAccount(
    {
      role: 'teacher',
      fullName: 'Maulana Tariq Jamil',
      email: 'tariq.jamil@qawmi-madrasa.edu.bd',
      temporaryPassword: 'TempPass@2026',
      marhala: 'Fazilat (Degree Marhala)',
      focusBranch: 'Hadith & Tafsir',
      primarySubject: 'Hadith & Tafsir (Bukhari / Mishkat)',
    },
    'muhtamim@qawmi-madrasa.edu.bd',
    BASE_TIME + 1500
  );
  assert.equal(createdTeacher.ok, true);
  if (createdTeacher.ok) {
    assert.equal(createdTeacher.profile.registrationType, 'manual_admin');
    assert.equal(createdTeacher.credentialsSummary.marhala, 'Fazilat (Degree Marhala)');
    assert.equal(createdTeacher.credentialsSummary.focusBranch, 'Hadith & Tafsir');
    const display = formatQawmiAcademicDisplay(createdTeacher.profile);
    assert.equal(display.marhalaShort, 'Fazilat');
    assert.equal(display.detail, 'Hadith & Tafsir · Hadith & Tafsir (Bukhari / Mishkat)');
  }

  const teachers = qawmiAdminService.listDirectory({ role: 'teacher' }, BASE_TIME + 2000);
  const reset = qawmiAdminService.resetUserPassword(
    teachers[0].id,
    'muhtamim@qawmi-madrasa.edu.bd',
    BASE_TIME + 2500,
    'QawmiReset@2026'
  );
  assert.equal(reset.ok, true);
  if (reset.ok) {
    assert.equal(reset.temporaryPassword, 'QawmiReset@2026');
  }

  const csv = qawmiAdminService.exportDirectoryCsv(teachers);
  assert.ok(csv.includes('Marhala'));
  assert.ok(csv.includes('Focus / Branch'));
  assert.ok(csv.includes('Primary Subject / Kitab'));
  assert.ok(csv.includes('Qawmi Madrasa'));

  const createdNotice = qawmiAdminService.createNotice(
    {
      title: 'Takmil Dawra-e-Hadith Bukhari Imtihan Viva',
      description:
        'All Takmil candidates under Hadith & Tafsir must present their Sabak registers at Darul Hadith.',
      audience: 'student',
      marhala: 'Takmil (Masters / Dawra-e-Hadith Marhala)',
      focusBranch: 'Hadith & Tafsir',
      tag: 'Exam',
    },
    'muhtamim@qawmi-madrasa.edu.bd',
    BASE_TIME + 3500
  );
  assert.equal(createdNotice.ok, true);

  if (createdNotice.ok) {
    const filtered = qawmiAdminService.listNotices(
      {
        marhala: 'Takmil (Masters / Dawra-e-Hadith Marhala)',
        focusBranch: 'Hadith & Tafsir',
        query: 'Bukhari Imtihan Viva',
      },
      BASE_TIME + 3500
    );
    assert.equal(filtered.length, 1);
    assert.equal(filtered[0].id, createdNotice.notice.id);

    const updatedNotice = qawmiAdminService.updateNotice(
      createdNotice.notice.id,
      {
        title: 'Takmil Dawra-e-Hadith Updated Imtihan Viva',
        description:
          'Updated schedule: All Takmil candidates under Hadith & Tafsir appear after Zuhr at Darul Hadith.',
        audience: 'both',
        marhala: 'Takmil (Masters / Dawra-e-Hadith Marhala)',
        focusBranch: 'Hadith & Tafsir',
        tag: 'Urgent',
      },
      'muhtamim@qawmi-madrasa.edu.bd',
      BASE_TIME + 4000
    );
    assert.equal(updatedNotice.ok, true);

    const deletedNotice = qawmiAdminService.deleteNotice(
      createdNotice.notice.id,
      'muhtamim@qawmi-madrasa.edu.bd',
      BASE_TIME + 4500
    );
    assert.equal(deletedNotice.ok, true);
  }
});

test('Qawmi demo admin preset provisions isolated admin.qawmi@example.com for login', () => {
  resetDatabase(BASE_TIME);
  const preset = getDemoQawmiAdminPreset();
  assert.equal(preset.quickAccessTitle, 'Quick Qawmi Panel Access');
  assert.equal(preset.email, 'admin.qawmi@example.com');
  assert.equal(preset.panelName, 'Qawmi Madrasa Panel');
  assert.equal(preset.pathway, 'qawmi');

  qawmiAdminService.prepareQawmiAdminForLogin('admin.alia@example.com', BASE_TIME);
  assert.equal(
    loadDatabase(BASE_TIME).users.some((u) => u.email.toLowerCase() === 'admin.qawmi@example.com'),
    false
  );

  qawmiAdminService.prepareQawmiAdminForLogin(preset.email, BASE_TIME);
  const loginRes = authService.login(preset.email, preset.password, BASE_TIME, 'admin', {
    stream: 'Bangladesh Madrasa Education',
    pathway: preset.pathwayLabel,
  });
  assert.equal(loginRes.ok, true);
  if (loginRes.ok) {
    assert.equal(loginRes.session.role, 'admin');
    assert.equal(loginRes.session.mustChangePassword, false);
    assert.equal(loginRes.session.selectedPathway, 'Qawmi');
    assert.equal(loginRes.session.selectedStream, 'Bangladesh Madrasa Education');
  }
});
