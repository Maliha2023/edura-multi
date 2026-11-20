import assert from 'node:assert/strict';
import test from 'node:test';
import {
  ALIA_MARHALA_OPTIONS,
  aliaStudentService,
  formatAliaStudentContextBadge,
  getAliaSubjectsForStudent,
  getDemoAliaStudentCouponHint,
  getDemoAliaStudentPreset,
  getDepartmentsForMarhala,
  getShortMarhalaLabel,
  isAliaPathway,
  resolveAliaPathway,
} from './aliaStudentService';
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
  aliaStudentService.resetInMemoryStateForTests();
  return store;
}

const FIXED_NOW = Date.parse('2026-06-15T10:00:00.000Z');

test('Alia pathway detection is strictly isolated from NCTB, International, and Qawmi', () => {
  assert.equal(isAliaPathway('Alia'), true);
  assert.equal(isAliaPathway('alia'), true);
  assert.equal(isAliaPathway('Alia Madrasa'), true);
  assert.equal(resolveAliaPathway('Alia'), 'alia');

  assert.equal(isAliaPathway('Qawmi'), false);
  assert.equal(isAliaPathway('Bangla Version'), false);
  assert.equal(isAliaPathway('English Version'), false);
  assert.equal(isAliaPathway('Cambridge'), false);
  assert.equal(isAliaPathway('Edexcel'), false);
  assert.equal(resolveAliaPathway('Qawmi'), null);
  assert.equal(resolveAliaPathway(null), null);
});

test('Dynamic Marhala to Department mapping matches Alia Madrasa curriculum specification', () => {
  assert.equal(ALIA_MARHALA_OPTIONS.length, 5);

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

  assert.equal(getShortMarhalaLabel('Dakhil (Classes 6–10)'), 'Dakhil');
  assert.equal(
    formatAliaStudentContextBadge('Dakhil (Classes 6–10)', 'Science'),
    'Alia Madrasa • Dakhil • Science'
  );
  assert.equal(
    formatAliaStudentContextBadge('Alim (Classes 11–12)', 'General'),
    'Alia Madrasa • Alim • General'
  );
});

test('Coupon validation enforces S-XXXXX student prefix, expiry, and unused status', () => {
  installMockLocalStorage();

  const emptyRes = aliaStudentService.validateAliaStudentCoupon('', FIXED_NOW);
  assert.equal(emptyRes.ok, false);

  const teacherRes = aliaStudentService.validateAliaStudentCoupon('T-74310', FIXED_NOW);
  assert.equal(teacherRes.ok, false);
  assert.match(teacherRes.message, /Teacher coupon/i);

  const badFormatRes = aliaStudentService.validateAliaStudentCoupon('ALIA-99', FIXED_NOW);
  assert.equal(badFormatRes.ok, false);

  const usedRes = aliaStudentService.validateAliaStudentCoupon('S-74105', FIXED_NOW);
  assert.equal(usedRes.ok, false);
  assert.match(usedRes.message, /already been redeemed/i);

  const expiredRes = aliaStudentService.validateAliaStudentCoupon('S-74088', FIXED_NOW);
  assert.equal(expiredRes.ok, false);
  assert.match(expiredRes.message, /expired/i);

  const unknownRes = aliaStudentService.validateAliaStudentCoupon('S-99999', FIXED_NOW);
  assert.equal(unknownRes.ok, false);

  const demoHint = getDemoAliaStudentCouponHint(FIXED_NOW);
  assert.equal(demoHint, 'S-74201');
  const validRes = aliaStudentService.validateAliaStudentCoupon(demoHint, FIXED_NOW);
  assert.equal(validRes.ok, true);
  assert.equal(validRes.coupon?.code, 'S-74201');
});

test('Registration validates Marhala/Department compatibility and submits into Alia pending queue', () => {
  installMockLocalStorage();

  // Reject mismatched Department for Marhala (e.g., Science is not valid for Ebtedayee)
  const invalidDept = aliaStudentService.submitAliaStudentCouponRegistration(
    {
      couponCode: 'S-74201',
      fullName: 'Farhan Sadiq',
      email: 'farhan.sadiq@alia-student.edu.bd',
      password: 'Password@123',
      marhala: 'Ebtedayee (Classes 1–5)',
      department: 'Science',
    },
    FIXED_NOW
  );
  assert.equal(invalidDept.ok, false);

  // Valid submission
  const res = aliaStudentService.submitAliaStudentCouponRegistration(
    {
      couponCode: 'S-74201',
      fullName: 'Farhan Sadiq',
      email: 'farhan.sadiq@alia-student.edu.bd',
      password: 'Password@123',
      marhala: 'Alim (Classes 11–12)',
      department: 'Science',
    },
    FIXED_NOW
  );
  assert.equal(res.ok, true);
  if (res.ok) {
    assert.equal(res.registration.pathway, 'alia');
    assert.equal(res.registration.marhala, 'Alim (Classes 11–12)');
    assert.equal(res.registration.department, 'Science');
    assert.equal(res.registration.couponCode, 'S-74201');
    assert.equal(res.registration.expiresAt - res.registration.submittedAt, 48 * 60 * 60 * 1000);
  }

  // Coupon is immediately marked used so it cannot be reused
  const reuse = aliaStudentService.validateAliaStudentCoupon('S-74201', FIXED_NOW);
  assert.equal(reuse.ok, false);
  assert.match(reuse.message, /already been redeemed/i);

  // Pending queue now contains Farhan
  const pending = aliaStudentService.listPendingRegistrations(FIXED_NOW);
  assert.ok(pending.some((p) => p.email === 'farhan.sadiq@alia-student.edu.bd'));
});

test('BMEB Alia subject catalog adapts accurately across Marhalas and Departments', () => {
  const dakhilScience = getAliaSubjectsForStudent('Dakhil (Classes 6–10)', 'Science');
  const dakhilScienceNames = dakhilScience.map((s) => s.name);
  assert.ok(dakhilScienceNames.includes('Quran Majeed & Tajweed'));
  assert.ok(dakhilScienceNames.includes('Hadith Sharif'));
  assert.ok(dakhilScienceNames.includes('Physics'));
  assert.ok(dakhilScienceNames.includes('Chemistry'));
  assert.ok(dakhilScienceNames.includes('Higher Mathematics'));

  const ebtedayeeHifz = getAliaSubjectsForStudent('Ebtedayee (Classes 1–5)', 'Hifzul Quran');
  assert.ok(ebtedayeeHifz.some((s) => /Hifzul Quran/i.test(s.name)));

  const fazilFiqh = getAliaSubjectsForStudent('Fazil (Degree / Pass)', 'Fiqh & Usul');
  assert.ok(fazilFiqh.some((s) => /Usul al-Fiqh/i.test(s.name)));
  assert.ok(fazilFiqh.some((s) => /Hidayah/i.test(s.name)));

  const kamilHadith = getAliaSubjectsForStudent('Kamil (Masters)', 'Hadith & Tafsir');
  assert.ok(kamilHadith.some((s) => /Bukhari/i.test(s.name)));
});

test('Notice filtering enforces Alia pathway, student/both audience, and Marhala/Department scoping', () => {
  installMockLocalStorage();

  const dakhilScienceStudent = {
    userId: 'alia-student-demo-01',
    fullName: 'Mahmudul Hasan',
    email: 'mahmudul.hasan@alia-student.edu.bd',
    pathway: 'alia' as const,
    marhala: 'Dakhil (Classes 6–10)' as const,
    department: 'Science' as const,
    registrationType: 'coupon_auto' as const,
    joinedAt: FIXED_NOW,
  };

  const notices = aliaStudentService.listRelevantNotices(dakhilScienceStudent, {}, FIXED_NOW);
  assert.ok(notices.length >= 3);
  // Must NOT include teacher-only notice ALIA-NTC-06
  assert.equal(notices.some((n) => n.id === 'ALIA-NTC-06'), false);
  // Must NOT include Fazil-only notice ALIA-NTC-05
  assert.equal(notices.some((n) => n.id === 'ALIA-NTC-05'), false);
  // Must include Dakhil Science notice ALIA-NTC-02
  assert.equal(notices.some((n) => n.id === 'ALIA-NTC-02'), true);

  // Tag filter works
  const urgentOnly = aliaStudentService.listRelevantNotices(
    dakhilScienceStudent,
    { tag: 'Urgent' },
    FIXED_NOW
  );
  assert.equal(urgentOnly.length, 1);
  assert.equal(urgentOnly[0].tag, 'Urgent');
});

test('Demo login sync, strict context resolution, lesson progress, and password updates work cleanly', () => {
  installMockLocalStorage();
  const preset = getDemoAliaStudentPreset();

  aliaStudentService.prepareAliaStudentAccountForLogin(preset.email, preset.password, FIXED_NOW);

  const aliaSession: AuthSession = {
    userId: 'alia-student-demo-01',
    role: 'student',
    fullName: preset.fullName,
    email: preset.email,
    mustChangePassword: false,
    preferredLanguage: 'en',
    selectedStream: 'Bangladesh Madrasa Education',
    selectedPathway: 'Alia',
    loggedInAt: FIXED_NOW,
  };

  const ctx = aliaStudentService.resolveAliaStudentContext(aliaSession, null, FIXED_NOW);
  assert.ok(ctx);
  assert.equal(ctx.marhala, 'Dakhil (Classes 6–10)');
  assert.equal(ctx.department, 'Science');

  // Strict non-Alia isolation guard
  const qawmiSession: AuthSession = { ...aliaSession, selectedPathway: 'Qawmi' };
  assert.equal(aliaStudentService.resolveAliaStudentContext(qawmiSession, null, FIXED_NOW), null);

  const cambridgeSession: AuthSession = { ...aliaSession, selectedPathway: 'Cambridge' };
  assert.equal(
    aliaStudentService.resolveAliaStudentContext(cambridgeSession, null, FIXED_NOW),
    null
  );

  // Lesson completion toggles persist
  assert.deepEqual(aliaStudentService.getCompletedLessonIds(ctx.userId), []);
  const afterToggle = aliaStudentService.toggleLessonCompleted(ctx.userId, 'alia-dak-quran-L1');
  assert.deepEqual(afterToggle, ['alia-dak-quran-L1']);
  const afterUntoggle = aliaStudentService.toggleLessonCompleted(ctx.userId, 'alia-dak-quran-L1');
  assert.deepEqual(afterUntoggle, []);

  // Password update validates current password and updates cleanly
  const badPw = aliaStudentService.updateAliaStudentPassword(
    preset.email,
    'WrongPass123',
    'NewPass@2026',
    'NewPass@2026',
    FIXED_NOW
  );
  assert.equal(badPw.ok, false);

  const goodPw = aliaStudentService.updateAliaStudentPassword(
    preset.email,
    preset.password,
    'NewPass@2026',
    'NewPass@2026',
    FIXED_NOW
  );
  assert.equal(goodPw.ok, true);
});
