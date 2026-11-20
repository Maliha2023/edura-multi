import assert from 'node:assert/strict';
import test from 'node:test';
import {
  adminNoticesService,
  formatNoticeAcademicScope,
  resetAdminNoticesStore,
} from './adminNoticesService';

test('strict pathway isolation prevents cross-pathway notice read, edit, and delete', () => {
  const t0 = 1_700_000_000_000;
  resetAdminNoticesStore(t0);

  const bvNotices = adminNoticesService.listNotices('bangla_version', t0);
  const evNotices = adminNoticesService.listNotices('english_version', t0);

  assert.ok(bvNotices.length > 0);
  assert.ok(evNotices.length > 0);
  assert.equal(bvNotices.every((n) => n.pathway === 'bangla_version'), true);
  assert.equal(evNotices.every((n) => n.pathway === 'english_version'), true);

  // Bangla Version admin cannot edit or delete an English Version notice
  const crossEdit = adminNoticesService.updateNotice(
    'bangla_version',
    evNotices[0].id,
    {
      title: 'Unauthorized Edit',
      description: 'Should be blocked by pathway isolation.',
      targetAudience: 'both',
      targetClass: null,
      targetGroup: null,
      categoryTag: 'Urgent',
    },
    t0 + 1000
  );
  assert.equal(crossEdit.ok, false);

  const crossDelete = adminNoticesService.deleteNotice(
    'bangla_version',
    evNotices[0].id,
    t0 + 1000
  );
  assert.equal(crossDelete.ok, false);
});

test('creating, filtering, editing, and deleting notices enforces audience and class/group scope rules', () => {
  const t0 = 1_700_000_000_000;
  resetAdminNoticesStore(t0);

  // Create a student-targeted Class 12 Arts notice in Bangla Version
  const createStudentRes = adminNoticesService.createNotice(
    'bangla_version',
    {
      title: 'HSC Humanities Seminar Notice',
      description: 'History and Civics revision workshop starts at 11:00 AM in Auditorium B.',
      targetAudience: 'student',
      targetClass: 12,
      targetGroup: 'Arts',
      categoryTag: 'Academic',
    },
    t0 + 1000
  );
  assert.equal(createStudentRes.ok, true);
  if (!createStudentRes.ok) return;
  assert.equal(createStudentRes.notice.pathway, 'bangla_version');
  assert.equal(formatNoticeAcademicScope(createStudentRes.notice), 'Class 12 • Arts');

  // Creating a teacher-only notice strips any accidental class/group fields
  const createTeacherRes = adminNoticesService.createNotice(
    'bangla_version',
    {
      title: 'Invigilation Roster Release',
      description: 'Updated exam invigilation assignments are posted on the faculty board.',
      targetAudience: 'teacher',
      targetClass: 10,
      targetGroup: 'Science',
      categoryTag: 'Urgent',
    },
    t0 + 2000
  );
  assert.equal(createTeacherRes.ok, true);
  if (!createTeacherRes.ok) return;
  assert.equal(createTeacherRes.notice.targetClass, null);
  assert.equal(createTeacherRes.notice.targetGroup, null);
  assert.equal(formatNoticeAcademicScope(createTeacherRes.notice), null);

  // Filtering by audience + group works cleanly
  const allBv = adminNoticesService.listNotices('bangla_version', t0 + 2000);
  const artsStudents = adminNoticesService.filterNotices(allBv, {
    audience: 'student',
    group: 'Arts',
  });
  assert.equal(artsStudents.length, 1);
  assert.equal(artsStudents[0].id, createStudentRes.notice.id);

  // Editing the notice to Class 6 clears group automatically
  const editRes = adminNoticesService.updateNotice(
    'bangla_version',
    createStudentRes.notice.id,
    {
      title: 'Class 6 General Assembly Update',
      description: 'Junior assembly moves to Courtyard 2 starting next Sunday.',
      targetAudience: 'both',
      targetClass: 6,
      targetGroup: 'Arts',
      categoryTag: 'General',
    },
    t0 + 3000
  );
  assert.equal(editRes.ok, true);
  if (!editRes.ok) return;
  assert.equal(editRes.notice.targetClass, 6);
  assert.equal(editRes.notice.targetGroup, null);
  assert.equal(editRes.notice.updatedAt, t0 + 3000);
  assert.equal(formatNoticeAcademicScope(editRes.notice), 'Class 6');

  // Deleting removes it cleanly
  const delRes = adminNoticesService.deleteNotice(
    'bangla_version',
    createStudentRes.notice.id,
    t0 + 4000
  );
  assert.equal(delRes.ok, true);
  assert.equal(
    adminNoticesService
      .listNotices('bangla_version', t0 + 4000)
      .some((n) => n.id === createStudentRes.notice.id),
    false
  );
});
