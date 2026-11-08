export const RECIPIENT_GROUPS = [
  {
    key: 'no_application',
    label: 'Account, no application',
    hint: 'Signed up but never started an application',
  },
  {
    key: 'draft',
    label: 'Draft, not submitted',
    hint: 'Started an application but did not submit it',
  },
  {
    key: 'submitted',
    label: 'Submitted, no decision',
    hint: 'Waiting on a review decision',
  },
  { key: 'accepted', label: 'Accepted', hint: 'Decision is accepted' },
  { key: 'waitlisted', label: 'Waitlisted', hint: 'Decision is waitlisted' },
  { key: 'rejected', label: 'Not selected', hint: 'Decision is rejected' },
];

export const GROUP_LABELS = Object.fromEntries(
  RECIPIENT_GROUPS.map((group) => [group.key, group.label]),
);

const KNOWN_GROUPS = new Set(RECIPIENT_GROUPS.map((group) => group.key));

// Decisions stay private until released, so applications.status still reads
// "submitted" for decided applicants; the decision row is the truth here.
export function getRecipientGroup(application, decision) {
  if (!application) return 'no_application';
  const group = decision || application.status;
  return KNOWN_GROUPS.has(group) ? group : null;
}

export function buildAudience(profiles, applications, decisions) {
  const applicationByUser = new Map(
    applications.map((application) => [application.user_id, application]),
  );
  const decisionByApplication = new Map(
    decisions.map((row) => [row.application_id, row.decision]),
  );

  return profiles
    .filter((profile) => profile.email)
    .map((profile) => {
      const application = applicationByUser.get(profile.id);
      return {
        userId: profile.id,
        fullName: profile.full_name || '',
        email: profile.email,
        group: getRecipientGroup(
          application,
          application && decisionByApplication.get(application.id),
        ),
      };
    })
    .filter((person) => person.group)
    .sort((a, b) => a.email.localeCompare(b.email));
}

export const filterAudience = (audience, selectedGroups) =>
  audience.filter((person) => selectedGroups.includes(person.group));

export const countByGroup = (audience) =>
  audience.reduce(
    (counts, person) => ({
      ...counts,
      [person.group]: (counts[person.group] || 0) + 1,
    }),
    {},
  );
