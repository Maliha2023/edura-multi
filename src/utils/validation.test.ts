import test from 'node:test';
import assert from 'node:assert/strict';
import {
  evaluatePasswordStrength,
  getCouponRoleFromCode,
  getSubTracksForStream,
  isValidCouponFormat,
  isValidSubTrackForStream,
  normalizeCouponCode,
  validateBangladeshPhone,
  validateEmail,
  validateFullName,
  validatePassword,
  validatePasswordConfirmation,
  validateTeacherId,
} from './validation';
import { hashPassword, verifyPassword } from './crypto';

test('coupon code normalization and format validation', () => {
  assert.equal(normalizeCouponCode('  t-12345 '), 'T-12345');
  assert.equal(isValidCouponFormat('T-12345'), true);
  assert.equal(isValidCouponFormat('s-98765'), true);
  assert.equal(isValidCouponFormat('A-12345'), false);
  assert.equal(isValidCouponFormat('T-1234'), false);
  assert.equal(isValidCouponFormat('T-123456'), false);
  assert.equal(getCouponRoleFromCode('t-12345'), 'teacher');
  assert.equal(getCouponRoleFromCode('S-00001'), 'student');
  assert.equal(getCouponRoleFromCode('X-00001'), null);
});

test('Bangladesh phone format validation (01XXXXXXXXX)', () => {
  assert.equal(validateBangladeshPhone('01712345678').valid, true);
  assert.equal(validateBangladeshPhone('018-1234-5678').valid, true);
  assert.equal(validateBangladeshPhone('02712345678').valid, false);
  assert.equal(validateBangladeshPhone('0171234567').valid, false);
  assert.equal(validateBangladeshPhone('017123456789').valid, false);
  assert.equal(validateBangladeshPhone('').valid, false);
});

test('email, name, teacher ID, and password validation', () => {
  assert.equal(validateFullName('A').valid, false);
  assert.equal(validateFullName('Tanvir Ahmed').valid, true);

  assert.equal(validateEmail('bad-email').valid, false);
  assert.equal(validateEmail('user@school.edu.bd').valid, true);

  assert.equal(validateTeacherId(' ').valid, false);
  assert.equal(validateTeacherId('TCH-101').valid, true);

  assert.equal(validatePassword('short7').valid, false);
  assert.equal(validatePassword('longpass8').valid, true);
  assert.equal(validatePasswordConfirmation('pass1234', 'pass1234').valid, true);
  assert.equal(validatePasswordConfirmation('pass1234', 'pass1235').valid, false);
});

test('password strength evaluation and non-plaintext hashing', () => {
  const weak = evaluatePasswordStrength('abc');
  assert.equal(weak.level, 'weak');
  assert.equal(weak.hasMinLength, false);

  const strong = evaluatePasswordStrength('Edura@2026');
  assert.equal(strong.level, 'strong');
  assert.equal(strong.score, 4);

  const hashed = hashPassword('Edura@2026');
  assert.ok(!hashed.includes('Edura@2026'));
  assert.equal(verifyPassword('Edura@2026', hashed), true);
  assert.equal(verifyPassword('WrongPass', hashed), false);
});

test('each educational stream exposes its two valid sub-tracks', () => {
  assert.deepEqual(getSubTracksForStream('Bangladesh National Curriculum (NCTB)'), [
    'Bangla Version',
    'English Version',
  ]);
  assert.deepEqual(getSubTracksForStream('International Curriculum (English Medium)'), [
    'Cambridge',
    'Edexcel',
  ]);
  assert.deepEqual(getSubTracksForStream('Bangladesh Madrasa Education'), ['Alia', 'Qawmi']);

  assert.equal(
    isValidSubTrackForStream('Bangladesh National Curriculum (NCTB)', 'English Version'),
    true
  );
  assert.equal(
    isValidSubTrackForStream('Bangladesh National Curriculum (NCTB)', 'Cambridge'),
    false
  );
  assert.equal(
    isValidSubTrackForStream('International Curriculum (English Medium)', 'Edexcel'),
    true
  );
  assert.equal(isValidSubTrackForStream('Bangladesh Madrasa Education', 'Alia'), true);
});
