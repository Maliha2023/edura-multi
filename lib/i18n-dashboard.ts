export type DashboardLanguage = 'en' | 'bn';

/**
 * Centralized Bangla translation dictionary for Student, Teacher, and Admin dashboards
 * across all six pathways (bangla_version, english_version, cambridge, edexcel, alia, qawmi).
 *
 * Rules:
 * - Keys are canonical English UI strings.
 * - `translateDashboardText` always falls back cleanly to the original string if no entry exists.
 * - Never mutate canonical filter/enum/service keys (`'all'`, `'Science'`, `'General'`, etc.);
 *   use this dictionary only for display rendering.
 */
export const DASHBOARD_TRANSLATIONS: Record<string, string> = {
  // Brand & Portals
  'Edura Multi': 'এডুরা মাল্টি',
  'Student Portal': 'শিক্ষার্থী পোর্টাল',
  'Teacher Portal': 'শিক্ষক পোর্টাল',
  'Admin Panel': 'অ্যাডমিন প্যানেল',
  'International Curriculum': 'আন্তর্জাতিক শিক্ষাক্রম',
  'International Faculty': 'আন্তর্জাতিক অনুষদ',
  'Cambridge': 'কেমব্রিজ',
  'Edexcel': 'এডেক্সেল',
  'Cambridge Panel': 'কেমব্রিজ প্যানেল',
  'Edexcel Panel': 'এডেক্সেল প্যানেল',
  'Cambridge Student Portal': 'কেমব্রিজ শিক্ষার্থী পোর্টাল',
  'Edexcel Student Portal': 'এডেক্সেল শিক্ষার্থী পোর্টাল',
  'Alia Madrasa': 'আলিয়া মাদ্রাসা',
  'Qawmi Madrasa': 'কওমি মাদ্রাসা',
  'Alia Madrasa Panel': 'আলিয়া মাদ্রাসা প্যানেল',
  'Qawmi Madrasa Panel': 'কওমি মাদ্রাসা প্যানেল',
  'Alia Madrasa Student Portal': 'আলিয়া মাদ্রাসা শিক্ষার্থী পোর্টাল',
  'Qawmi Madrasa Student Portal': 'কওমি মাদ্রাসা শিক্ষার্থী পোর্টাল',
  'Alia Madrasa Student': 'আলিয়া মাদ্রাসা শিক্ষার্থী',
  'Qawmi Madrasa Student': 'কওমি মাদ্রাসা শিক্ষার্থী',
  'Alia Madrasa Faculty': 'আলিয়া মাদ্রাসা অনুষদ',
  'Qawmi Madrasa Faculty': 'কওমি মাদ্রাসা অনুষদ',
  'Bangla Version': 'বাংলা ভার্সন',
  'English Version': 'ইংরেজি ভার্সন',
  'Bangla Version Panel': 'বাংলা ভার্সন প্যানেল',
  'English Version Panel': 'ইংরেজি ভার্সন প্যানেল',
  'Bangladesh National Curriculum (NCTB)': 'বাংলাদেশ জাতীয় শিক্ষাক্রম (এনসিটিবি)',
  'Bangladesh Madrasa Education': 'বাংলাদেশ মাদ্রাসা শিক্ষা',
  'Bangladesh Madrasa Education · BMEB / IAU Curriculum':
    'বাংলাদেশ মাদ্রাসা শিক্ষা · বিএমইবি / আইএইউ পাঠ্যক্রম',
  'Bangladesh Madrasa Education · Wifaqul Madarisil Arabia (Dars-e-Nizami)':
    'বাংলাদেশ মাদ্রাসা শিক্ষা · বেফাকুল মাদারিসিল আরাবিয়া (দরসে নিজামী)',
  'Bangladesh Madrasah Education Board (BMEB) / Islamic Arabic University':
    'বাংলাদেশ মাদ্রাসা শিক্ষা বোর্ড (বিএমইবি) / ইসলামি আরবি বিশ্ববিদ্যালয়',
  'Wifaqul Madarisil Arabia Bangladesh (Dars-e-Nizami)':
    'বেফাকুল মাদারিসিল আরাবিয়া বাংলাদেশ (দরসে নিজামী)',

  // Sidebar & Navigation Chrome
  'Dashboard': 'ড্যাশবোর্ড',
  'Overview': 'সারসংক্ষেপ',
  'My Subjects': 'আমার বিষয়সমূহ',
  'My Classes & Modules': 'আমার ক্লাস ও মডিউল',
  'Student Roster & Progress': 'শিক্ষার্থী তালিকা ও অগ্রগতি',
  'AI Study Tutor': 'এআই স্টাডি টিউটর',
  'AI Teaching Assistant': 'এআই টিচিং অ্যাসিস্ট্যান্ট',
  'Notices': 'নোটিশ',
  'Notices & Announcements': 'নোটিশ ও ঘোষণা',
  'Profile & Settings': 'প্রোফাইল ও সেটিংস',
  'Coupons': 'কুপন',
  'Users': 'ব্যবহারকারী',
  'Users Management': 'ব্যবহারকারী পরিচালনা',
  'Registrations': 'নিবন্ধনসমূহ',
  'Settings': 'সেটিংস',
  'Log Out': 'লগআউট',
  'Confirm Log Out': 'লগআউট নিশ্চিত করুন',
  'Sign Out': 'লগআউট',
  'Open navigation menu': 'নেভিগেশন মেনু খুলুন',
  'Open student navigation menu': 'শিক্ষার্থী নেভিগেশন মেনু খুলুন',
  'Open teacher navigation menu': 'শিক্ষক নেভিগেশন মেনু খুলুন',
  'Open international admin menu': 'আন্তর্জাতিক অ্যাডমিন মেনু খুলুন',
  'Open Alia Madrasa admin menu': 'আলিয়া মাদ্রাসা অ্যাডমিন মেনু খুলুন',
  'Open Qawmi Madrasa admin menu': 'কওমি মাদ্রাসা অ্যাডমিন মেনু খুলুন',
  'Close navigation menu': 'নেভিগেশন মেনু বন্ধ করুন',
  'Close navigation': 'নেভিগেশন বন্ধ করুন',
  'Switch to light mode': 'লাইট মোডে যান',
  'Switch to dark mode': 'ডার্ক মোডে যান',
  'Switch language': 'ভাষা পরিবর্তন করুন',

  // Intl Teacher Header Subtitles
  'Teaching snapshot & schedule': 'শিক্ষাদানের সারসংক্ষেপ ও সময়সূচি',
  'Notes, worksheets & past papers': 'নোট, ওয়ার্কশিট ও পাস্ট পেপার',
  'Levels, tracks, marks & attendance': 'স্তর, বিভাগ, নম্বর ও উপস্থিতি',
  'Lesson plans, past papers & rubrics': 'পাঠ পরিকল্পনা, পাস্ট পেপার ও রুব্রিক',
  'Official alerts & class updates': 'প্রাতিষ্ঠানিক বিজ্ঞপ্তি ও ক্লাস আপডেট',
  'Faculty credentials & security': 'শিক্ষক তথ্য ও নিরাপত্তা',

  // Common Actions & Status Labels
  'Save': 'সংরক্ষণ করুন',
  'Save Changes': 'পরিবর্তন সংরক্ষণ করুন',
  'Saving...': 'সংরক্ষণ করা হচ্ছে...',
  'Cancel': 'বাতিল',
  'Publish': 'প্রকাশ করুন',
  'Publish Notice': 'নোটিশ প্রকাশ করুন',
  'Publishing...': 'প্রকাশ করা হচ্ছে...',
  'Delete': 'মুছুন',
  'Copy': 'কপি',
  'Copied': 'কপি হয়েছে',
  'Copy Code': 'কোড কপি করুন',
  'Copy Response': 'উত্তর কপি করুন',
  'Response copied': 'উত্তর কপি হয়েছে',
  'Copy response': 'উত্তর কপি করুন',
  'Search': 'খুঁজুন',
  'Clear': 'মুছুন',
  'Clear search': 'খোঁজা মুছুন',
  'Clear filters': 'ফিল্টার মুছুন',
  'Filter': 'ফিল্টার',
  'Apply': 'প্রয়োগ করুন',
  'Reset': 'রিসেট',
  'Refresh': 'রিফ্রেশ',
  'Close': 'বন্ধ করুন',
  'Edit': 'সম্পাদনা',
  'Update': 'আপডেট করুন',
  'Submit': 'জমা দিন',
  'Continue': 'এগিয়ে যান',
  'Back': 'পেছনে',
  'View': 'দেখুন',
  'View all': 'সব দেখুন',
  'Manage': 'পরিচালনা',
  'Open': 'খুলুন',
  'Generate': 'তৈরি করুন',
  'Send': 'পাঠান',
  'Ask AI': 'এআই-কে জিজ্ঞাসা করুন',
  'Active': 'সক্রিয়',
  'Pending': 'অপেক্ষমাণ',
  'Pending Approvals': 'অপেক্ষমাণ অনুমোদন',
  'User Directory': 'ব্যবহারকারী ডিরেক্টরি',
  'Manual Registration': 'ম্যানুয়াল নিবন্ধন',
  'Approved': 'অনুমোদিত',
  'Rejected': 'বাতিলকৃত',
  'Suspended': 'স্থগিত',
  'Disabled': 'নিষ্ক্রিয়',
  'Used': 'ব্যবহৃত',
  'Redeemed': 'ব্যবহৃত',
  'Expired': 'মেয়াদোত্তীর্ণ',
  'Students': 'শিক্ষার্থী',
  'Teachers': 'শিক্ষক',
  'Student': 'শিক্ষার্থী',
  'Teacher': 'শিক্ষক',
  'Admin': 'অ্যাডমিন',
  'Administrator': 'অ্যাডমিন',
  'Both': 'উভয়',
  'Teachers & Students': 'শিক্ষক ও শিক্ষার্থী',
  'All': 'সব',
  'All Roles': 'সব ভূমিকা',
  'All Statuses': 'সব অবস্থা',
  'All Levels': 'সব স্তর',
  'All Tracks': 'সব বিভাগ',
  'All Classes': 'সব শ্রেণি',
  'All Marhalas': 'সব মারহালা',
  'All Departments': 'সব বিভাগ',
  'All Focus Branches': 'সব শাখা',
  'All Audiences': 'সব লক্ষ্যবর্গ',
  'All Tags': 'সব ট্যাগ',
  'Loading...': 'লোড হচ্ছে...',
  'Required': 'আবশ্যক',
  'Optional': 'ঐচ্ছিক',
  'Cancel sign out': 'লগআউট বাতিল করুন',

  // Notice Tags & Priority
  'General': 'সাধারণ',
  'Academic': 'একাডেমিক',
  'Exam': 'পরীক্ষা',
  'Urgent': 'জরুরি',
  'Pinned': 'পিন করা',
  'Pin Notice': 'নোটিশ পিন করুন',
  'Unpin': 'আনপিন',
  'Pin': 'পিন',
  'Mark as Read': 'পঠিত হিসেবে চিহ্নিত করুন',
  'Read': 'পঠিত',
  'Unread': 'অপঠিত',

  // Tracks, Streams & Academic Divisions
  'Science': 'বিজ্ঞান',
  'Commerce': 'ব্যবসায় শিক্ষা',
  'Business': 'ব্যবসায় শিক্ষা',
  'Business Studies': 'ব্যবসায় শিক্ষা',
  'Humanities': 'মানবিক',
  'Arts': 'মানবিক',
  'Mixed / Custom': 'মিশ্র / কাস্টম',
  'Muzabbid Mahire Tajweed': 'মুজাব্বিদ মাহিরে তাজবিদ',
  'Hifzul Quran': 'হিফজুল কুরআন',
  'Hadith & Tafsir': 'হাদিস ও তাফসির',
  'Fiqh & Usul': 'ফিকহ ও উসুল',
  'General / Kitab': 'সাধারণ / কিতাব',
  'Tajweed & Qiraat': 'তাজবিদ ও ক্বিরাত',
  'Arabic & Adab': 'আরবি ও আদব',

  // International Levels
  'Primary & Lower Secondary (Grade 1–8)': 'প্রাথমিক ও নিম্ন মাধ্যমিক (গ্রেড ১–৮)',
  'O Level / IGCSE': 'ও লেভেল / আইজিসিএসই',
  'O Level / International GCSE': 'ও লেভেল / ইন্টারন্যাশনাল জিসিএসই',
  'A Level / IAL': 'এ লেভেল / আইএএল',
  'Grade 1–8': 'গ্রেড ১–৮',
  'International GCSE': 'ইন্টারন্যাশনাল জিসিএসই',

  // Alia Marhalas
  'Ebtedayee': 'ইবতেদায়ী',
  'Ebtedayee (Classes 1–5)': 'ইবতেদায়ী (শ্রেণি ১–৫)',
  'Dakhil': 'দাখিল',
  'Dakhil (Classes 6–10)': 'দাখিল (শ্রেণি ৬–১০)',
  'Alim': 'আলিম',
  'Alim (Classes 11–12)': 'আলিম (শ্রেণি ১১–১২)',
  'Fazil': 'ফাজিল',
  'Fazil (Degree / Pass)': 'ফাজিল (ডিগ্রি / পাস)',
  'Kamil': 'কামিল',
  'Kamil (Masters)': 'কামিল (মাস্টার্স)',

  // Qawmi Marhalas
  'Maktab / Hifz / Nazera': 'মক্তব / হিফজ / নাযেরা',
  'Maktab / Hifz': 'মক্তব / হিফজ',
  'Ibtidaiyyah': 'ইবতিদাইয়্যাহ',
  'Ibtidaiyyah (Primary Marhala)': 'ইবতিদাইয়্যাহ (প্রাথমিক মারহালা)',
  'Mutawassitah': 'মুতাওয়াসসিতাহ',
  'Mutawassitah (Middle Marhala)': 'মুতাওয়াসসিতাহ (মধ্যম মারহালা)',
  'Sanawiyyah Ulya': 'সানাবিয়্যাহ উলইয়া',
  'Sanawiyyah Ulya (Higher Secondary Marhala)': 'সানাবিয়্যাহ উলইয়া (উচ্চ মাধ্যমিক মারহালা)',
  'Fazilat': 'ফযিলত',
  'Fazilat (Degree Marhala)': 'ফযিলত (ডিগ্রি মারহালা)',
  'Takmil': 'তাকমিল',
  'Takmil (Masters / Dawra-e-Hadith Marhala)': 'তাকমিল (মাস্টার্স / দাওরায়ে হাদিস মারহালা)',

  // Attendance & Progress Statuses
  'Present': 'উপস্থিত',
  'Late': 'বিলম্বিত',
  'Absent': 'অনুপস্থিত',
  'Completed': 'সম্পন্ন',
  'In Progress': 'চলমান',
  'Not Started': 'শুরু হয়নি',
  'Active Today': 'আজ সক্রিয়',
  'Needs Review': 'পর্যালোচনা প্রয়োজন',

  // Prompt Library & AI Component Chrome
  'Prompt Library': 'প্রম্পট লাইব্রেরি',
  'Category': 'বিভাগ',
  'Curated Prompt Template': 'নির্বাচিত প্রম্পট টেমপ্লেট',
  'Topic / Chapter / Kitab Bab (auto-populates template)':
    'বিষয় / অধ্যায় / কিতাবের বাব (স্বয়ংক্রিয়ভাবে টেমপ্লেটে যুক্ত হবে)',
  'Load Prompt into Editor': 'এডিটরে প্রম্পট লোড করুন',
  'All Categories': 'সব বিভাগ',
  'Send Prompt': 'প্রম্পট পাঠান',
  'Generating...': 'উত্তর তৈরি হচ্ছে...',
  'Clear Conversation': 'কথোপকথন মুছুন',
  'Quick Prompts': 'দ্রুত প্রম্পট',
  'Select Subject': 'বিষয় নির্বাচন করুন',
  'Select Class': 'শ্রেণি নির্বাচন করুন',
  'Select Level': 'স্তর নির্বাচন করুন',
  'Select Marhala': 'মারহালা নির্বাচন করুন',
  'Response Style': 'উত্তরের ধরন',

  // Common Form & Profile Labels
  'Full Name': 'পূর্ণ নাম',
  'Email': 'ইমেইল',
  'Email Address': 'ইমেইল ঠিকানা',
  'Mobile Number': 'মোবাইল নম্বর',
  'Phone': 'ফোন',
  'Phone Number': 'ফোন নম্বর',
  'Role': 'ভূমিকা',
  'Status': 'অবস্থা',
  'Class': 'শ্রেণি',
  'Group / Track': 'বিভাগ / ট্র্যাক',
  'Track': 'বিভাগ',
  'Department': 'বিভাগ',
  'Focus Branch': 'শাখা / ফোকাস',
  'Marhala': 'মারহালা',
  'Academic Level': 'একাডেমিক স্তর',
  'Academic Track': 'একাডেমিক বিভাগ',
  'Primary Subject': 'মূল বিষয়',
  'Teacher ID': 'শিক্ষক আইডি',
  'Student ID': 'শিক্ষার্থী আইডি',
  'Password': 'পাসওয়ার্ড',
  'Temporary Password': 'অস্থায়ী পাসওয়ার্ড',
  'Current Password': 'বর্তমান পাসওয়ার্ড',
  'New Password': 'নতুন পাসওয়ার্ড',
  'Confirm New Password': 'নতুন পাসওয়ার্ড নিশ্চিত করুন',
  'Change Password': 'পাসওয়ার্ড পরিবর্তন',
  'Update Password': 'পাসওয়ার্ড আপডেট করুন',
  'Created': 'তৈরির সময়',
  'Submitted': 'জমার সময়',
  'Published': 'প্রকাশিত',
  'Actions': 'কার্যক্রম',
  'Action': 'কার্যক্রম',
  'Notes': 'নোট',
  'Score': 'নম্বর',
  'Marks': 'নম্বর',
  'Attendance': 'উপস্থিতি',
  'Progress': 'অগ্রগতি',
  'Language': 'ভাষা',
  'Preferred Language': 'পছন্দের ভাষা',
  'Pathway Scope Restriction': 'পাথওয়ে সীমাবদ্ধতা',
};

const BANGLA_DIGITS = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'] as const;

export function formatDashboardDigits(
  value: string | number,
  language: DashboardLanguage
): string {
  const str = String(value);
  if (language !== 'bn') return str;
  return str.replace(/\d/g, (digit) => BANGLA_DIGITS[Number(digit)] ?? digit);
}

/**
 * Translates an English UI label/string into Bangla when language === 'bn'.
 * Falls back cleanly to the original English string if no mapping is registered.
 */
export function translateDashboardText(
  text: string,
  language: DashboardLanguage
): string {
  if (!text || language === 'en') return text;
  if (Object.prototype.hasOwnProperty.call(DASHBOARD_TRANSLATIONS, text)) {
    return DASHBOARD_TRANSLATIONS[text];
  }
  const trimmed = text.trim();
  if (trimmed && Object.prototype.hasOwnProperty.call(DASHBOARD_TRANSLATIONS, trimmed)) {
    return DASHBOARD_TRANSLATIONS[trimmed];
  }
  return text;
}

/**
 * Translates parameterized sentences cleanly without ever returning `undefined`.
 */
export function translateDashboardTemplate(
  enTemplate: string,
  bnTemplate: string,
  vars: Record<string, string | number>,
  language: DashboardLanguage
): string {
  const activeTemplate = language === 'bn' ? bnTemplate : enTemplate;
  return Object.entries(vars).reduce((acc, [key, value]) => {
    const formatted =
      typeof value === 'number' ? formatDashboardDigits(value, language) : String(value);
    return acc.replaceAll(`{${key}}`, formatted);
  }, activeTemplate);
}

export function formatDashboardDate(
  isoOrDate: string | number | Date,
  language: DashboardLanguage,
  options: Intl.DateTimeFormatOptions = {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }
): string {
  const parsed = isoOrDate instanceof Date ? isoOrDate : new Date(isoOrDate);
  if (Number.isNaN(parsed.getTime())) return String(isoOrDate);
  return parsed.toLocaleDateString(language === 'bn' ? 'bn-BD' : 'en-US', options);
}

export function formatDashboardDateTime(
  isoOrDate: string | number | Date,
  language: DashboardLanguage,
  options: Intl.DateTimeFormatOptions = {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }
): string {
  const parsed = isoOrDate instanceof Date ? isoOrDate : new Date(isoOrDate);
  if (Number.isNaN(parsed.getTime())) return String(isoOrDate);
  return parsed.toLocaleString(language === 'bn' ? 'bn-BD' : 'en-US', options);
}

export function formatDashboardCountdown(
  countdown: string,
  language: DashboardLanguage
): string {
  if (language !== 'bn') return countdown;
  if (countdown === 'Expired') return 'মেয়াদোত্তীর্ণ';
  if (countdown === 'Redeemed' || countdown === 'Used') return 'ব্যবহৃত';
  const banglaUnits = countdown
    .replace(/(\d+)\s*d/g, '$1 দিন')
    .replace(/(\d+)\s*h/g, '$1 ঘণ্টা')
    .replace(/(\d+)\s*m/g, '$1 মি.')
    .replace(/(\d+)\s*s/g, '$1 সে.');
  return formatDashboardDigits(banglaUnits, 'bn');
}

export function getLanguageToggleLabel(language: DashboardLanguage): string {
  return language === 'en' ? 'বাংলা' : 'English';
}
