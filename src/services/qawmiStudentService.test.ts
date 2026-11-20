import assert from 'node:assert/strict';
import test from 'node:test';
import {
  formatQawmiStudentContextBadge,
  getDemoQawmiStudentCouponHint,
  getDemoQawmiStudentPreset,
  getQawmiSubjectsForStudent,
  getShortQawmiMarhalaLabel,
  isQawmiPathway,
  QAWMI_FOCUS_BRANCH_OPTIONS,
  QAWMI_MARHALA_OPTIONS,
  qawmiStudentService,
  resolveQawmiPathway,
} from './qawmiStudentService';
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
  qawmiStudentService.resetInMemoryStateForTests();
  return store;
}

const FIXED_NOW = Date.parse('2026-07-01T10:00:00.000Z');

test('Qawmi pathway detection is strictly isolated from NCTB, International, and Alia', () => {
  assert.equal(isQawmiPathway('Qawmi'), true);
  assert.equal(isQawmiPathway('qawmi'), true);
  assert.equal(isQawmiPathway('Qawmi Madrasa'), true);
  assert.equal(resolveQawmiPathway('Qawmi'), 'qawmi');

  assert.equal(isQawmiPathway('Alia'), false);
  assert.equal(isQawmiPathway('Bangla Version'), false);
  assert.equal(isQawmiPathway('English Version'), false);
  assert.equal(isQawmiPathway('Cambridge'), false);
  assert.equal(isQawmiPathway('Edexcel'), false);
  assert.equal(resolveQawmiPathway('Alia'), null);
  assert.equal(resolveQawmiPathway(null), null);
});

test('Qawmi Marhala & Focus Branch options match exact specification', () => {
  assert.deepEqual(QAWMI_MARHALA_OPTIONS, [
    'Maktab / Hifz / Nazera',
    'Ibtidaiyyah (Primary Marhala)',
    'Mutawassitah (Middle Marhala)',
    'Sanawiyyah Ulya (Higher Secondary Marhala)',
    'Fazilat (Degree Marhala)',
    'Takmil (Masters / Dawra-e-Hadith Marhala)',
  ]);

  assert.deepEqual(QAWMI_FOCUS_BRANCH_OPTIONS, [
    'General / Kitab',
    'Hifzul Quran',
    'Tajweed & Qiraat',
    'Hadith & Tafsir',
    'Fiqh & Usul',
    'Arabic & Adab',
  ]);

  assert.equal(getShortQawmiMarhalaLabel('Mutawassitah (Middle Marhala)'), 'Mutawassitah');
  assert.equal(
    getShortQawmiMarhalaLabel('Sanawiyyah Ulya (Higher Secondary Marhala)'),
    'Sanawiyyah Ulya'
  );
  assert.equal(
    formatQawmiStudentContextBadge('Mutawassitah (Middle Marhala)', 'General / Kitab'),
    'Qawmi Madrasa • Mutawassitah • General / Kitab'
  );
});

test('Qawmi coupon validation enforces S-XXXXX prefix, expiry, and unused status', () => {
  installMockLocalStorage();

  const emptyRes = qawmiStudentService.validateQawmiStudentCoupon('', FIXED_NOW);
  assert.equal(emptyRes.ok, false);

  const teacherRes = qawmiStudentService.validateQawmiStudentCoupon('T-85310', FIXED_NOW);
  assert.equal(teacherRes.ok, false);
  assert.match(teacherRes.message, /Teacher\/Ustad coupon/i);

  const badFormatRes = qawmiStudentService.validateQawmiStudentCoupon('QAWMI-12', FIXED_NOW);
  assert.equal(badFormatRes.ok, false);

  const usedRes = qawmiStudentService.validateQawmiStudentCoupon('S-85042', FIXED_NOW);
  assert.equal(usedRes.ok, false);
  assert.match(usedRes.message, /already been redeemed/i);

  const expiredRes = qawmiStudentService.validateQawmiStudentCoupon('S-85009', FIXED_NOW);
  assert.equal(expiredRes.ok, false);
  assert.match(expiredRes.message, /expired/i);

  // Must NOT accept Alia student coupons inside Qawmi
  const aliaCouponRes = qawmiStudentService.validateQawmiStudentCoupon('S-74201', FIXED_NOW);
  assert.equal(aliaCouponRes.ok, false);

  const demoHint = getDemoQawmiStudentCouponHint(FIXED_NOW);
  assert.equal(demoHint, 'S-85101');
  const validRes = qawmiStudentService.validateQawmiStudentCoupon(demoHint, FIXED_NOW);
  assert.equal(validRes.ok, true);
  assert.equal(validRes.coupon?.code, 'S-85101');
});

test('Qawmi student registration defaults optional focusBranch and submits into 48h pending queue', () => {
  installMockLocalStorage();

  const res = qawmiStudentService.submitQawmiStudentCouponRegistration(
    {
      couponCode: 'S-85101',
      fullName: 'Muhammad Bilal Husain',
      email: 'bilal.husain@qawmi-student.edu.bd',
      password: 'Password@123',
      marhala: 'Sanawiyyah Ulya (Higher Secondary Marhala)',
      focusBranch: '',
    },
    FIXED_NOW
  );
  assert.equal(res.ok, true);
  if (res.ok) {
    assert.equal(res.registration.pathway, 'qawmi');
    assert.equal(res.registration.marhala, 'Sanawiyyah Ulya (Higher Secondary Marhala)');
    assert.equal(res.registration.focusBranch, 'General / Kitab');
    assert.equal(res.registration.couponCode, 'S-85101');
    assert.equal(res.registration.expiresAt - res.registration.submittedAt, 48 * 60 * 60 * 1000);
  }

  // Coupon is marked used so it cannot be reused
  const reuse = qawmiStudentService.validateQawmiStudentCoupon('S-85101', FIXED_NOW);
  assert.equal(reuse.ok, false);
  assert.match(reuse.message, /already been redeemed/i);

  // Pending queue now includes Bilal
  const pending = qawmiStudentService.listPendingRegistrations(FIXED_NOW);
  assert.ok(pending.some((p) => p.email === 'bilal.husain@qawmi-student.edu.bd'));
});

test('Qawmi Kitab catalog adapts across Marhalas and Focus Branches', () => {
  const maktabHifz = getQawmiSubjectsForStudent('Maktab / Hifz / Nazera', 'Hifzul Quran');
  assert.ok(maktabHifz.some((s) => /Quran Nazera/i.test(s.name)));
  assert.ok(maktabHifz.some((s) => /Hifzul Quran/i.test(s.name)));

  const mutawassitahKitab = getQawmiSubjectsForStudent(
    'Mutawassitah (Middle Marhala)',
    'General / Kitab'
  );
  assert.ok(mutawassitahKitab.some((s) => /Hidayatun Nahw/i.test(s.name)));
  assert.ok(mutawassitahKitab.some((s) => /Ilmus Sighah/i.test(s.name)));
  assert.ok(mutawassitahKitab.some((s) => /Al-Quduri/i.test(s.name)));

  const takmilHadith = getQawmiSubjectsForStudent(
    'Takmil (Masters / Dawra-e-Hadith Marhala)',
    'Hadith & Tafsir'
  );
  assert.ok(takmilHadith.some((s) => /Sahih al-Bukhari/i.test(s.name)));
  assert.ok(takmilHadith.some((s) => /Sahih Muslim/i.test(s.name)));
  assert.ok(takmilHadith.some((s) => /Usul al-Hadith/i.test(s.name)));
});

test('Qawmi notices filter out teacher-only and mismatched Marhala notices', () => {
  installMockLocalStorage();

  const mutawassitahStudent = {
    userId: 'qawmi-student-demo-01',
    fullName: 'Tariqul Islam',
    email: 'tariqul.islam@qawmi-student.edu.bd',
    pathway: 'qawmi' as const,
    marhala: 'Mutawassitah (Middle Marhala)' as const,
    focusBranch: 'General / Kitab' as const,
    registrationType: 'coupon_auto' as const,
    joinedAt: FIXED_NOW,
  };

  const notices = qawmiStudentService.listRelevantNotices(mutawassitahStudent, {}, FIXED_NOW);
  assert.ok(notices.length >= 3);
  // Must NOT include teacher-only notice QAWMI-NTC-06
  assert.equal(notices.some((n) => n.id === 'QAWMI-NTC-06'), false);
  // Must NOT include Takmil-only notice QAWMI-NTC-05
  assert.equal(notices.some((n) => n.id === 'QAWMI-NTC-05'), false);
  // Must include Mutawassitah workshop QAWMI-NTC-02
  assert.equal(notices.some((n) => n.id === 'QAWMI-NTC-02'), true);

  const urgentOnly = qawmiStudentService.listRelevantNotices(
    mutawassitahStudent,
    { tag: 'Urgent' },
    FIXED_NOW
  );
  assert.equal(urgentOnly.length, 1);
  assert.equal(urgentOnly[0].tag, 'Urgent');
});

test('Qawmi demo login prep, context resolution, progress tracking, and password updates work cleanly', () => {
  installMockLocalStorage();
  const preset = getDemoQawmiStudentPreset();

  qawmiStudentService.prepareQawmiStudentAccountForLogin(
    preset.email,
    preset.password,
    FIXED_NOW
  );

  const qawmiSession: AuthSession = {
    userId: 'qawmi-student-demo-01',
    role: 'student',
    fullName: preset.fullName,
    email: preset.email,
    mustChangePassword: false,
    preferredLanguage: 'en',
    selectedStream: 'Bangladesh Madrasa Education',
    selectedPathway: 'Qawmi',
    loggedInAt: FIXED_NOW,
  };

  const ctx = qawmiStudentService.resolveQawmiStudentContext(qawmiSession, null, FIXED_NOW);
  assert.ok(ctx);
  assert.equal(ctx.marhala, 'Mutawassitah (Middle Marhala)');
  assert.equal(ctx.focusBranch, 'General / Kitab');

  // Strict non-Qawmi isolation guard
  const aliaSession: AuthSession = { ...qawmiSession, selectedPathway: 'Alia' };
  assert.equal(qawmiStudentService.resolveQawmiStudentContext(aliaSession, null, FIXED_NOW), null);

  const cambridgeSession: AuthSession = { ...qawmiSession, selectedPathway: 'Cambridge' };
  assert.equal(
    qawmiStudentService.resolveQawmiStudentContext(cambridgeSession, null, FIXED_NOW),
    null
  );

  // Lesson completion toggles persist
  assert.deepEqual(qawmiStudentService.getCompletedLessonIds(ctx.userId), []);
  const afterToggle = qawmiStudentService.toggleLessonCompleted(ctx.userId, 'qawmi-mut-nahw-L1');
  assert.deepEqual(afterToggle, ['qawmi-mut-nahw-L1']);
  const afterUntoggle = qawmiStudentService.toggleLessonCompleted(ctx.userId, 'qawmi-mut-nahw-L1');
  assert.deepEqual(afterUntoggle, []);

  // Password update validates current password
  const badPw = qawmiStudentService.updateQawmiStudentPassword(
    preset.email,
    'WrongPass123',
    'NewPass@2026',
    'NewPass@2026',
    FIXED_NOW
  );
  assert.equal(badPw.ok, false);

  const goodPw = qawmiStudentService.updateQawmiStudentPassword(
    preset.email,
    preset.password,
    'NewPass@2026',
    'NewPass@2026',
    FIXED_NOW
  );
  assert.equal(goodPw.ok, true);
});
