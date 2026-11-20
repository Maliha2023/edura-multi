import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ACADEMIC_TRACK_OPTIONS,
  LOWER_SECONDARY_LEVEL,
  formatAcademicDisplay,
  getDemoInternationalAdminPreset,
  getLevelsForPathway,
  getShortLevelLabel,
  internationalAdminService,
  levelRequiresTrack,
  normalizeAcademicTrack,
  resetInternationalAdminStore,
  resolveInternationalPathway,
} from './internationalAdminService';
import { authService } from './authService';
import { resetDatabase } from './storage';

const BASE_TIME = 1_760_000_000_000;

test('strict pathway isolation prevents Cambridge and Edexcel crossover across all modules', () => {
  resetInternationalAdminStore(BASE_TIME);

  assert.equal(resolveInternationalPathway('Cambridge'), 'cambridge');
  assert.equal(resolveInternationalPathway('Edexcel'), 'edexcel');
  assert.equal(resolveInternationalPathway('Bangla Version'), null);
  assert.equal(resolveInternationalPathway('English Version'), null);

  assert.deepEqual(getLevelsForPathway('cambridge'), [
    'Grade 1–8 (Primary / Lower Secondary)',
    'O Level / IGCSE (Grades 9–10)',
    'A Level / IAL (Grades 11–12)',
  ]);
  assert.deepEqual(getLevelsForPathway('edexcel'), [
    'Grade 1–8 (Primary / Lower Secondary)',
    'International GCSE (Grades 9–10)',
    'IAL (Grades 11–12)',
  ]);
  assert.deepEqual(ACADEMIC_TRACK_OPTIONS, [
    'Science',
    'Business',
    'Humanities',
    'Mixed / Custom',
  ]);

  assert.equal(levelRequiresTrack(LOWER_SECONDARY_LEVEL), false);
  assert.equal(levelRequiresTrack('O Level / IGCSE (Grades 9–10)'), true);
  assert.equal(levelRequiresTrack('A Level / IAL (Grades 11–12)'), true);
  assert.equal(levelRequiresTrack('International GCSE (Grades 9–10)'), true);
  assert.equal(levelRequiresTrack('IAL (Grades 11–12)'), true);

  assert.equal(getShortLevelLabel(LOWER_SECONDARY_LEVEL), 'Grade 1–8');
  assert.equal(getShortLevelLabel('O Level / IGCSE (Grades 9–10)'), 'O Level / IGCSE');
  assert.equal(getShortLevelLabel('IAL (Grades 11–12)'), 'IAL');

  const camUsers = internationalAdminService.listDirectory('cambridge', {}, BASE_TIME);
  const edxUsers = internationalAdminService.listDirectory('edexcel', {}, BASE_TIME);
  assert.ok(camUsers.length > 0 && edxUsers.length > 0);
  assert.ok(camUsers.every((u) => u.pathway === 'cambridge'));
  assert.ok(edxUsers.every((u) => u.pathway === 'edexcel'));

  // Cross-pathway mutation must be blocked
  const crossDelete = internationalAdminService.deleteUser(
    'edexcel',
    camUsers[0].id,
    'admin.edexcel@example.com',
    BASE_TIME
  );
  assert.equal(crossDelete.ok, false);

  const crossNotice = internationalAdminService.createNotice(
    'cambridge',
    {
      title: 'Invalid Level Notice',
      description: 'Trying to assign an Edexcel IAL level inside Cambridge must fail.',
      audience: 'student',
      academicLevel: 'IAL (Grades 11–12)',
      academicTrack: 'Science',
      tag: 'Exam',
    },
    'admin.cambridge@example.com',
    BASE_TIME
  );
  assert.equal(crossNotice.ok, false);
});

test('conditional track rules auto-assign General for Grade 1-8 and enforce tracks for upper levels', () => {
  resetInternationalAdminStore(BASE_TIME);

  const lowerTrack = normalizeAcademicTrack(LOWER_SECONDARY_LEVEL, 'Science');
  assert.equal(lowerTrack.ok, true);
  if (lowerTrack.ok) {
    assert.equal(lowerTrack.track, 'General');
  }

  const missingUpperTrack = normalizeAcademicTrack('O Level / IGCSE (Grades 9–10)', 'General');
  assert.equal(missingUpperTrack.ok, false);

  const validUpperTrack = normalizeAcademicTrack('International GCSE (Grades 9–10)', 'Business');
  assert.equal(validUpperTrack.ok, true);
  if (validUpperTrack.ok) {
    assert.equal(validUpperTrack.track, 'Business');
  }

  // Grade 1–8 student manual creation succeeds without track and stores General
  const grade7Student = internationalAdminService.createManualAccount(
    'cambridge',
    {
      role: 'student',
      fullName: 'Nafis Kabir',
      email: 'nafis.kabir@cambridge-student.edu.bd',
      temporaryPassword: 'TempPass@2026',
      academicLevel: LOWER_SECONDARY_LEVEL,
    },
    'admin.cambridge@example.com',
    BASE_TIME + 500
  );
  assert.equal(grade7Student.ok, true);
  if (grade7Student.ok) {
    assert.equal(grade7Student.profile.academicTrack, 'General');
    assert.equal(grade7Student.profile.primarySubject, undefined);
    const fmt = formatAcademicDisplay(grade7Student.profile);
    assert.equal(fmt.levelShort, 'Grade 1–8');
    assert.equal(fmt.detail, 'General');
  }

  // Upper-level teacher requires both valid track and primary subject
  const teacherMissingSubject = internationalAdminService.createManualAccount(
    'edexcel',
    {
      role: 'teacher',
      fullName: 'Samira Anwar',
      email: 'samira.anwar@edexcel-faculty.edu.bd',
      temporaryPassword: 'TempPass@2026',
      academicLevel: 'IAL (Grades 11–12)',
      academicTrack: 'Science',
      primarySubject: '',
    },
    'admin.edexcel@example.com',
    BASE_TIME + 1000
  );
  assert.equal(teacherMissingSubject.ok, false);

  const validTeacher = internationalAdminService.createManualAccount(
    'edexcel',
    {
      role: 'teacher',
      fullName: 'Samira Anwar',
      email: 'samira.anwar@edexcel-faculty.edu.bd',
      temporaryPassword: 'TempPass@2026',
      academicLevel: 'IAL (Grades 11–12)',
      academicTrack: 'Science',
      primarySubject: 'Biology (WBI11)',
    },
    'admin.edexcel@example.com',
    BASE_TIME + 1500
  );
  assert.equal(validTeacher.ok, true);
  if (validTeacher.ok) {
    assert.equal(validTeacher.profile.academicTrack, 'Science');
    assert.equal(validTeacher.profile.primarySubject, 'Biology (WBI11)');
    const fmt = formatAcademicDisplay(validTeacher.profile);
    assert.equal(fmt.levelShort, 'IAL');
    assert.equal(fmt.detail, 'Science · Biology (WBI11)');
  }
});

test('coupon generation creates unique 48h T-XXXXX and S-XXXXX codes scoped to pathway', () => {
  resetInternationalAdminStore(BASE_TIME);

  const teacherCoupon = internationalAdminService.generateCoupon(
    'cambridge',
    'teacher',
    'admin.cambridge@example.com',
    BASE_TIME
  );
  const studentCoupon = internationalAdminService.generateCoupon(
    'edexcel',
    'student',
    'admin.edexcel@example.com',
    BASE_TIME
  );

  assert.match(teacherCoupon.code, /^T-\d{5}$/);
  assert.match(studentCoupon.code, /^S-\d{5}$/);
  assert.equal(teacherCoupon.expiresAt - teacherCoupon.createdAt, 48 * 60 * 60 * 1000);

  const camCoupons = internationalAdminService.listCoupons('cambridge', {}, BASE_TIME);
  const edxCoupons = internationalAdminService.listCoupons('edexcel', {}, BASE_TIME);
  assert.ok(camCoupons.some((c) => c.code === teacherCoupon.code));
  assert.ok(!camCoupons.some((c) => c.code === studentCoupon.code));
  assert.ok(edxCoupons.some((c) => c.code === studentCoupon.code));

  // Expire after 48h
  const after49h = BASE_TIME + 49 * 60 * 60 * 1000;
  const expiredCam = internationalAdminService.listCoupons('cambridge', { status: 'expired' }, after49h);
  assert.ok(expiredCam.some((c) => c.code === teacherCoupon.code));
});

test('pending approvals edit, approve, and reject workflows update directory and enforce pathway levels', () => {
  resetInternationalAdminStore(BASE_TIME);

  const pendingCam = internationalAdminService.listPending('cambridge', 'student', BASE_TIME);
  assert.ok(pendingCam.length >= 2);
  const target = pendingCam[0];

  const edited = internationalAdminService.editPending(
    'cambridge',
    target.id,
    {
      fullName: 'Zayan Mahmud Updated',
      email: target.email,
      academicLevel: 'A Level / IAL (Grades 11–12)',
      academicTrack: 'Humanities',
    },
    'admin.cambridge@example.com',
    BASE_TIME + 1000
  );
  assert.equal(edited.ok, true);
  if (edited.ok) {
    assert.equal(edited.item.academicLevel, 'A Level / IAL (Grades 11–12)');
    assert.equal(edited.item.academicTrack, 'Humanities');
  }

  const approved = internationalAdminService.approvePending(
    'cambridge',
    target.id,
    'admin.cambridge@example.com',
    BASE_TIME + 2000
  );
  assert.equal(approved.ok, true);
  if (approved.ok) {
    assert.equal(approved.profile.registrationType, 'coupon_auto');
    assert.equal(approved.profile.status, 'active');
    assert.equal(approved.profile.academicTrack, 'Humanities');
  }

  const remaining = internationalAdminService.listPending('cambridge', 'student', BASE_TIME + 2000);
  assert.ok(!remaining.some((p) => p.id === target.id));

  const rejectTarget = remaining[0];
  const rejected = internationalAdminService.rejectPending(
    'cambridge',
    rejectTarget.id,
    'admin.cambridge@example.com',
    BASE_TIME + 3000
  );
  assert.equal(rejected.ok, true);
});

test('directory filtering by level & track, password reset, notices conditional track, CSV export, and demo login work end-to-end', () => {
  resetInternationalAdminStore(BASE_TIME);
  resetDatabase(BASE_TIME);

  // Filter Edexcel students by Business track
  const businessStudents = internationalAdminService.listDirectory(
    'edexcel',
    { role: 'student', academicTrack: 'Business' },
    BASE_TIME
  );
  assert.ok(businessStudents.length >= 1);
  assert.ok(businessStudents.every((u) => u.academicTrack === 'Business'));

  // Filter Cambridge teachers by Grade 1–8
  const lowerTeachers = internationalAdminService.listDirectory(
    'cambridge',
    { role: 'teacher', academicLevel: LOWER_SECONDARY_LEVEL },
    BASE_TIME
  );
  assert.ok(lowerTeachers.length >= 1);
  assert.ok(lowerTeachers.every((u) => u.academicTrack === 'General'));

  // Custom password reset
  const customReset = internationalAdminService.resetUserPassword(
    'cambridge',
    lowerTeachers[0].id,
    'admin.cambridge@example.com',
    BASE_TIME + 2000,
    'CustomReset@2026'
  );
  assert.equal(customReset.ok, true);
  if (customReset.ok) {
    assert.equal(customReset.temporaryPassword, 'CustomReset@2026');
  }

  // CSV export includes Academic Track / Stream and Primary Subject columns
  const csv = internationalAdminService.exportDirectoryCsv(lowerTeachers);
  assert.ok(csv.includes('Academic Track / Stream'));
  assert.ok(csv.includes('Primary Subject'));
  assert.ok(csv.includes(lowerTeachers[0].email));

  // Notices conditional track: Grade 1–8 forces academicTrack='all'; IAL preserves 'Business'
  const lowerNotice = internationalAdminService.createNotice(
    'edexcel',
    {
      title: 'Edexcel Primary Orientation',
      description: 'All Grade 1–8 students should assemble in the main hall at 9:00 AM.',
      audience: 'student',
      academicLevel: LOWER_SECONDARY_LEVEL,
      academicTrack: 'Science',
      tag: 'General',
    },
    'admin.edexcel@example.com',
    BASE_TIME + 3000
  );
  assert.equal(lowerNotice.ok, true);
  if (lowerNotice.ok) {
    assert.equal(lowerNotice.notice.academicTrack, 'all');
  }

  const ialNotice = internationalAdminService.createNotice(
    'edexcel',
    {
      title: 'IAL Business Case Study Workshop',
      description: 'Mandatory Pearson IAL Business seminar on Friday afternoon in Hall C.',
      audience: 'student',
      academicLevel: 'IAL (Grades 11–12)',
      academicTrack: 'Business',
      tag: 'Exam',
    },
    'admin.edexcel@example.com',
    BASE_TIME + 4000
  );
  assert.equal(ialNotice.ok, true);
  if (ialNotice.ok) {
    assert.equal(ialNotice.notice.academicTrack, 'Business');
    const filteredNotices = internationalAdminService.listNotices(
      'edexcel',
      { academicLevel: 'IAL (Grades 11–12)', academicTrack: 'Business' },
      BASE_TIME + 4000
    );
    assert.equal(filteredNotices.length, 1);
    assert.equal(filteredNotices[0].id, ialNotice.notice.id);
  }

  // Demo international admin login integration
  const camPreset = getDemoInternationalAdminPreset('cambridge');
  internationalAdminService.prepareInternationalAdminForLogin(
    camPreset.email,
    'cambridge',
    BASE_TIME + 5000
  );
  const loginRes = authService.login(
    camPreset.email,
    camPreset.password,
    BASE_TIME + 5000,
    'admin',
    {
      stream: 'International Curriculum (English Medium)',
      pathway: 'Cambridge',
    }
  );
  assert.equal(loginRes.ok, true);
  if (loginRes.ok) {
    assert.equal(loginRes.session.role, 'admin');
    assert.equal(loginRes.session.selectedPathway, 'Cambridge');
  }
});
