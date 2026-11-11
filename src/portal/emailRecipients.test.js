import {
  buildAudience,
  countByGroup,
  describeGroups,
  filterAudience,
} from './emailRecipients';

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

describe('accepted applicants who have not confirmed', () => {
  const people = [
    { id: 'p1', full_name: 'Released', email: 'p1@example.com' },
    { id: 'p2', full_name: 'Confirmed', email: 'p2@example.com' },
    { id: 'p3', full_name: 'Withdrawn', email: 'p3@example.com' },
    { id: 'p4', full_name: 'Unreleased', email: 'p4@example.com' },
  ];
  const accepted = [
    { id: 'b1', user_id: 'p1', status: 'accepted', confirmation: 'pending' },
    { id: 'b2', user_id: 'p2', status: 'accepted', confirmation: 'confirmed' },
    { id: 'b3', user_id: 'p3', status: 'accepted', confirmation: 'withdrawn' },
    { id: 'b4', user_id: 'p4', status: 'submitted', confirmation: 'pending' },
  ];
  const acceptedDecisions = ['b1', 'b2', 'b3', 'b4'].map((id) => ({
    application_id: id,
    decision: 'accepted',
  }));
  const now = new Date('2026-11-10T12:00:00Z');
  const awaitingConfirmation = (confirmBy) =>
    filterAudience(
      buildAudience(people, accepted, acceptedDecisions, { confirmBy, now }),
      ['accepted_unconfirmed'],
    ).map((person) => person.email);

  it('includes released acceptances still pending before the deadline', () => {
    expect(awaitingConfirmation('2026-11-20T04:59:00Z')).toEqual([
      'p1@example.com',
    ]);
  });

  it('includes no one once the confirmation deadline has passed', () => {
    expect(awaitingConfirmation('2026-11-09T04:59:00Z')).toEqual([]);
  });

  it('includes no one when the event has no confirmation deadline', () => {
    expect(awaitingConfirmation(null)).toEqual([]);
  });

  it('keeps them in the accepted group as well', () => {
    const audience = buildAudience(people, accepted, acceptedDecisions, {
      confirmBy: '2026-11-20T04:59:00Z',
      now,
    });

    expect(countByGroup(audience)).toEqual({
      accepted: 4,
      accepted_unconfirmed: 1,
    });
  });
});

describe('describeGroups', () => {
  it('names a single group by its label', () => {
    expect(describeGroups(['waitlisted'])).toBe('Waitlisted');
  });

  it('names a derived group alongside the decision it came from', () => {
    expect(describeGroups(['accepted', 'accepted_unconfirmed'])).toBe(
      'Accepted · Not confirmed',
    );
  });

  it('ignores groups it does not recognise', () => {
    expect(describeGroups(['accepted', 'mystery'])).toBe('Accepted');
  });
});
