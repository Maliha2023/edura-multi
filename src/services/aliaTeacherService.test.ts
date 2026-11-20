import assert from 'node:assert/strict';
import test from 'node:test';
import {
  aliaTeacherService,
  formatAliaTeacherContextBadge,
  formatAssignedAliaMarhalasSummary,
  getDemoAliaTeacherCouponHint,
  getDemoAliaTeacherPreset,
  getDepartmentsForAliaMarhala,
  getDepartmentsForAssignedMarhalas,
  isAliaTeacherPathway,
  resolveAliaTeacherPathway,
} from './aliaTeacherService';
import type { AuthSession } from '../types/domain';

function installMockLocalStorage() {
  const store = new Map<string, string>();
  (globalThis as unknown as { window?: unknown }).window = {
    localStorage: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value);
      },
      removeItem: (key: string) => {
        store.delete(key);
      },
      clear: () => {
        store.clear();
      },
    },
  };
  aliaTeacherService.resetInMemoryStateForTests();
  return store;
}

const FIXED_NOW = Date.parse('2026-06-20T09:00:00.000Z');

test('Alia teacher pathway detection is strictly isolated from NCTB, International, and Qawmi', () => {
  assert.equal(isAliaTeacherPathway('Alia'), true);
  assert.equal(isAliaTeacherPathway('alia'), true);
  assert.equal(resolveAliaTeacherPathway('Alia Madrasa'), 'alia');

  assert.equal(isAliaTeacherPathway('Qawmi'), false);
  assert.equal(isAliaTeacherPathway('Bangla Version'), false);
  assert.equal(isAliaTeacherPathway('English Version'), false);
  assert.equal(isAliaTeacherPathway('Cambridge'), false);
  assert.equal(isAliaTeacherPathway('Edexcel'), false);
  assert.equal(resolveAliaTeacherPathway('Qawmi'), null);
});

test('Multi-Marhala department adaptation returns exact conditional departments', () => {
  assert.deepEqual(getDepartmentsForAliaMarhala('Ebtedayee (Classes 1–5)'), [
    'General',
    'Hifzul Quran',
    'Muzabbid Mahire Tajweed',
  ]);
  assert.deepEqual(getDepartmentsForAliaMarhala('Dakhil (Classes 6–10)'), [
    'General',
    'Science',
    'Muzabbid Mahire Tajweed',
  ]);
  assert.deepEqual(getDepartmentsForAliaMarhala('Fazil (Degree / Pass)'), [
    'Hadith & Tafsir',
    'Fiqh & Usul',
    'General',
  ]);

  const combined = getDepartmentsForAssignedMarhalas([
    'Dakhil (Classes 6–10)',
    'Fazil (Degree / Pass)',
  ]);
  assert.ok(combined.includes('Science'));
  assert.ok(combined.includes('Hadith & Tafsir'));
  assert.ok(combined.includes('Fiqh & Usul'));
  assert.equal(combined.includes('Hifzul Quran'), false);

  assert.equal(
    formatAliaTeacherContextBadge('Hadith Sharif'),
    'Alia Madrasa • Hadith Sharif'
  );
  assert.equal(
    formatAssignedAliaMarhalasSummary(['Dakhil (Classes 6–10)', 'Alim (Classes 11–12)']),
    'Dakhil, Alim'
  );
});

test('Teacher coupon validation enforces T-XXXXX prefix, unused, and 48h expiry rules', () => {
  installMockLocalStorage();

  const studentCode = aliaTeacherService.validateCoupon('S-74201', FIXED_NOW);
  assert.equal(studentCode.ok, false);
  assert.match(studentCode.message, /Student coupon/i);

  const usedCode = aliaTeacherService.validateCoupon('T-74190', FIXED_NOW);
  assert.equal(usedCode.ok, false);
  assert.match(usedCode.message, /already been redeemed/i);

  const expiredCode = aliaTeacherService.validateCoupon('T-74077', FIXED_NOW);
  assert.equal(expiredCode.ok, false);
  assert.match(expiredCode.message, /expired/i);

  const unknownCode = aliaTeacherService.validateCoupon('T-99999', FIXED_NOW);
  assert.equal(unknownCode.ok, false);

  const demoHint = getDemoAliaTeacherCouponHint(FIXED_NOW);
  assert.equal(demoHint, 'T-74310');
  const valid = aliaTeacherService.validateCoupon(demoHint, FIXED_NOW);
  assert.equal(valid.ok, true);
  assert.equal(valid.coupon?.code, 'T-74310');
});

test('Teacher coupon registration validates Marhala/Department and submits into Alia pending queue', () => {
  installMockLocalStorage();

  // Reject invalid department for selected Marhala (Science not valid for Fazil alone)
  const badDept = aliaTeacherService.submitCouponRegistration(
    {
      couponCode: 'T-74310',
      fullName: 'Maulana Shafiqul Islam',
      email: 'shafiqul.islam@alia-teacher.edu.bd',
      password: 'Password@123',
      assignedMarhalas: ['Fazil (Degree / Pass)'],
      primarySubject: 'Hadith Sharif',
      department: 'Science',
    },
    FIXED_NOW
  );
  assert.equal(badDept.ok, false);

  // Valid submission
  const res = aliaTeacherService.submitCouponRegistration(
    {
      couponCode: 'T-74310',
      fullName: 'Maulana Shafiqul Islam',
      email: 'shafiqul.islam@alia-teacher.edu.bd',
      password: 'Password@123',
      assignedMarhalas: ['Dakhil (Classes 6–10)', 'Alim (Classes 11–12)'],
      primarySubject: 'Arabic Grammar & Literature',
      department: 'General',
    },
    FIXED_NOW
  );
  assert.equal(res.ok, true);
  if (res.ok) {
    assert.equal(res.registration.role, 'teacher');
    assert.equal(res.registration.pathway, 'alia');
    assert.equal(res.registration.primarySubject, 'Arabic Grammar & Literature');
    assert.equal(res.registration.expiresAt - res.registration.submittedAt, 48 * 60 * 60 * 1000);
  }

  // Coupon is marked used immediately
  const reuse = aliaTeacherService.validateCoupon('T-74310', FIXED_NOW);
  assert.equal(reuse.ok, false);

  const pending = aliaTeacherService.listPendingTeacherApplications(FIXED_NOW);
  assert.ok(pending.some((p) => p.email === 'shafiqul.islam@alia-teacher.edu.bd'));
});

test('Module lifecycle, roster marks/attendance, official teacher notices, and class announcements work cleanly', () => {
  installMockLocalStorage();
  const preset = getDemoAliaTeacherPreset();
  aliaTeacherService.prepareAliaTeacherAccountForLogin(preset.email, preset.password, FIXED_NOW);

  const session: AuthSession = {
    userId: 'alia-teacher-demo-01',
    role: 'teacher',
    fullName: preset.fullName,
    email: preset.email,
    mustChangePassword: false,
    preferredLanguage: 'en',
    selectedStream: 'Bangladesh Madrasa Education',
    selectedPathway: 'Alia',
    loggedInAt: FIXED_NOW,
  };

  const teacher = aliaTeacherService.resolveAliaTeacherContext(session, null, FIXED_NOW);
  assert.ok(teacher);
  assert.equal(teacher.primarySubject, 'Hadith Sharif');

  // Strict non-Alia isolation guard
  assert.equal(
    aliaTeacherService.resolveAliaTeacherContext({ ...session, selectedPathway: 'Qawmi' }, null, FIXED_NOW),
    null
  );

  // Module create, toggle publish, delete
  const createdMod = aliaTeacherService.createModule(
    teacher,
    {
      marhala: 'Alim (Classes 11–12)',
      department: 'General',
      title: 'Sahih al-Bukhari Intro Commentary',
      type: 'Kitab / Chapter Guide',
      summary: 'Structured Alim board notes covering revelation chapters and narrator biography.',
      published: false,
    },
    FIXED_NOW
  );
  assert.equal(createdMod.ok, true);
  if (createdMod.ok) {
    const toggled = aliaTeacherService.toggleModulePublished(createdMod.module.id, FIXED_NOW + 10);
    assert.equal(toggled.find((m) => m.id === createdMod.module.id)?.published, true);
    const afterDelete = aliaTeacherService.deleteModule(createdMod.module.id, FIXED_NOW + 20);
    assert.equal(afterDelete.some((m) => m.id === createdMod.module.id), false);
  }

  // Roster marks & attendance update
  const roster = aliaTeacherService.listStudentRoster(FIXED_NOW);
  assert.ok(roster.length >= 5);
  const badMarks = aliaTeacherService.updateStudentAssessment(
    roster[0].id,
    { marks: 120, attendanceRate: 95, attendanceStatus: 'Present', remarks: 'Invalid' },
    FIXED_NOW
  );
  assert.equal(badMarks.ok, false);

  const goodMarks = aliaTeacherService.updateStudentAssessment(
    roster[0].id,
    { marks: 95, attendanceRate: 98, attendanceStatus: 'Present', remarks: 'Outstanding Hadith viva' },
    FIXED_NOW
  );
  assert.equal(goodMarks.ok, true);
  const updatedRoster = aliaTeacherService.listStudentRoster(FIXED_NOW);
  assert.equal(updatedRoster.find((s) => s.id === roster[0].id)?.marks, 95);

  // Official notices strictly hide student-only circulars (ALIA-NTC-02)
  const officialNotices = aliaTeacherService.listOfficialNotices({}, FIXED_NOW);
  assert.ok(officialNotices.length >= 3);
  assert.equal(officialNotices.some((n) => n.audience === 'student'), false);
  assert.equal(officialNotices.some((n) => n.id === 'ALIA-NTC-02'), false);
  assert.equal(officialNotices.some((n) => n.id === 'ALIA-NTC-06'), true);

  // Class announcement post + delete
  const annRes = aliaTeacherService.postClassAnnouncement(
    teacher,
    {
      marhala: 'Dakhil (Classes 6–10)',
      department: 'Science',
      title: 'Dakhil Hadith Revision Session',
      message: 'Bring your Hadith Sharif textbook and CQ notebook for Thursday morning review.',
      tag: 'Exam Prep',
    },
    FIXED_NOW
  );
  assert.equal(annRes.ok, true);
  if (annRes.ok) {
    const afterDel = aliaTeacherService.deleteClassAnnouncement(annRes.announcement.id, FIXED_NOW);
    assert.equal(afterDel.some((a) => a.id === annRes.announcement.id), false);
  }

  // Password update
  const badPw = aliaTeacherService.updateTeacherPassword(
    preset.email,
    'WrongPass',
    'NewTeacher@2026',
    'NewTeacher@2026',
    FIXED_NOW
  );
  assert.equal(badPw.ok, false);

  const goodPw = aliaTeacherService.updateTeacherPassword(
    preset.email,
    preset.password,
    'NewTeacher@2026',
    'NewTeacher@2026',
    FIXED_NOW
  );
  assert.equal(goodPw.ok, true);
});
