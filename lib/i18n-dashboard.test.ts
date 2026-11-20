import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  DASHBOARD_TRANSLATIONS,
  formatDashboardCountdown,
  formatDashboardDigits,
  getLanguageToggleLabel,
  translateDashboardTemplate,
  translateDashboardText,
} from './i18n-dashboard.ts';

describe('lib/i18n-dashboard', () => {
  it('translates core sidebar, status, and action labels when language is bn', () => {
    const requiredKeys = [
      'Dashboard',
      'Overview',
      'My Subjects',
      'My Classes & Modules',
      'Student Roster & Progress',
      'AI Study Tutor',
      'AI Teaching Assistant',
      'Notices',
      'Profile & Settings',
      'Coupons',
      'Users',
      'Settings',
      'Log Out',
      'Save',
      'Cancel',
      'Publish',
      'Delete',
      'Copy',
      'Search',
      'Filter',
      'Active',
      'Pending',
      'Approved',
      'Students',
      'Teachers',
    ];

    for (const key of requiredKeys) {
      assert.ok(DASHBOARD_TRANSLATIONS[key], `Missing translation for key: ${key}`);
      assert.equal(translateDashboardText(key, 'en'), key);
      assert.equal(translateDashboardText(key, 'bn'), DASHBOARD_TRANSLATIONS[key]);
    }
  });

  it('falls back cleanly to original string for untranslated dynamic terms and never returns undefined', () => {
    const dynamicText = 'Cambridge IGCSE Physics Paper 4 (0625/42)';
    assert.equal(translateDashboardText(dynamicText, 'en'), dynamicText);
    assert.equal(translateDashboardText(dynamicText, 'bn'), dynamicText);
    assert.equal(translateDashboardText('', 'bn'), '');
  });

  it('interpolates bilingual templates and converts numbers to Bangla numerals when bn is active', () => {
    const enOut = translateDashboardTemplate(
      'Showing {count} students in {level}',
      '{level}-এ মোট {count} জন শিক্ষার্থী',
      { count: 14, level: 'Alim' },
      'en'
    );
    const bnOut = translateDashboardTemplate(
      'Showing {count} students in {level}',
      '{level}-এ মোট {count} জন শিক্ষার্থী',
      { count: 14, level: 'Alim' },
      'bn'
    );

    assert.equal(enOut, 'Showing 14 students in Alim');
    assert.equal(bnOut, 'Alim-এ মোট ১৪ জন শিক্ষার্থী');
    assert.equal(formatDashboardDigits(2026, 'bn'), '২০২৬');
    assert.equal(formatDashboardDigits(2026, 'en'), '2026');
  });

  it('formats countdown strings and language toggle labels correctly', () => {
    assert.equal(formatDashboardCountdown('47h 59m 10s', 'en'), '47h 59m 10s');
    assert.equal(formatDashboardCountdown('47h 59m 10s', 'bn'), '৪৭ ঘণ্টা ৫৯ মি. ১০ সে.');
    assert.equal(formatDashboardCountdown('Expired', 'bn'), 'মেয়াদোত্তীর্ণ');
    assert.equal(formatDashboardCountdown('Redeemed', 'bn'), 'ব্যবহৃত');

    assert.equal(getLanguageToggleLabel('en'), 'বাংলা');
    assert.equal(getLanguageToggleLabel('bn'), 'English');
  });
});
