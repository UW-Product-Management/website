import { buildAudience, countByGroup, filterAudience } from './emailRecipients';

const profiles = [
  { id: 'u1', full_name: 'Ada', email: 'ada@example.com' },
  { id: 'u2', full_name: 'Bo', email: 'bo@example.com' },
  { id: 'u3', full_name: 'Cy', email: 'cy@example.com' },
  { id: 'u4', full_name: 'Di', email: 'di@example.com' },
  { id: 'u5', full_name: 'Ed', email: 'ed@example.com' },
  { id: 'u6', full_name: 'No Email', email: '' },
];

const applications = [
  { id: 'a2', user_id: 'u2', status: 'draft' },
  { id: 'a3', user_id: 'u3', status: 'submitted' },
  { id: 'a4', user_id: 'u4', status: 'submitted' },
  { id: 'a5', user_id: 'u5', status: 'deleted' },
];

const decisions = [{ application_id: 'a4', decision: 'accepted' }];

describe('buildAudience', () => {
  const audience = buildAudience(profiles, applications, decisions);
  const groupOf = (userId) =>
    audience.find((person) => person.userId === userId)?.group;

  it('groups each account by its application for the event', () => {
    expect(groupOf('u1')).toBe('no_application');
    expect(groupOf('u2')).toBe('draft');
    expect(groupOf('u3')).toBe('submitted');
  });

  it('uses the unreleased decision over the applicant-facing status', () => {
    expect(groupOf('u4')).toBe('accepted');
  });

  it('leaves out deleted applications and accounts without an email', () => {
    expect(groupOf('u5')).toBeUndefined();
    expect(groupOf('u6')).toBeUndefined();
  });

  it('counts and filters by the selected groups', () => {
    expect(countByGroup(audience)).toEqual({
      no_application: 1,
      draft: 1,
      submitted: 1,
      accepted: 1,
    });
    expect(
      filterAudience(audience, ['draft', 'accepted']).map((p) => p.email),
    ).toEqual(['bo@example.com', 'di@example.com']);
  });
});
