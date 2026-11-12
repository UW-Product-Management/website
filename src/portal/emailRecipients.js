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
  {
    key: 'accepted_unconfirmed',
    label: 'Accepted, not confirmed',
    shortLabel: 'Not confirmed',
    hint: 'Told they were accepted but have not confirmed their spot before the deadline',
    alsoCountedIn: 'accepted',
  },
  {
    key: 'accepted_confirmed',
    label: 'Accepted, confirmed',
    shortLabel: 'Confirmed',
    hint: 'Told they were accepted and have confirmed their spot',
    alsoCountedIn: 'accepted',
  },
  { key: 'waitlisted', label: 'Waitlisted', hint: 'Decision is waitlisted' },
  { key: 'rejected', label: 'Not selected', hint: 'Decision is rejected' },
];

export const GROUP_LABELS = Object.fromEntries(
  RECIPIENT_GROUPS.map((group) => [group.key, group.label]),
);

const GROUP_BADGES = Object.fromEntries(
  RECIPIENT_GROUPS.map((group) => [group.key, group.shortLabel || group.label]),
);

// A person can sit in a decision group and a derived one at the same time, so
// naming only the decision group would label a "not confirmed" list "Accepted".
export const describeGroups = (groups = []) =>
  groups
    .map((group) => GROUP_BADGES[group])
    .filter(Boolean)
    .join(' · ');

const KNOWN_GROUPS = new Set(RECIPIENT_GROUPS.map((group) => group.key));

// Decisions stay private until released, so applications.status still reads
// "submitted" for decided applicants; the decision row is the truth here.
export function getRecipientGroup(application, decision) {
  if (!application) return 'no_application';
  const group = decision || application.status;
  return KNOWN_GROUPS.has(group) ? group : null;
}

// Unlike the groups above, this keys off the applicant-facing status: only a
// released acceptance can be confirmed, so reminding anyone else would point
// them at a form they cannot use. Past the deadline the form is closed too.
function isAwaitingConfirmation(application, confirmBy, now) {
  return (
    application?.status === 'accepted' &&
    application.confirmation === 'pending' &&
    Boolean(confirmBy) &&
    now < new Date(confirmBy)
  );
}

// Only a released acceptance can be confirmed, so this also keys off the
// applicant-facing status. A confirmed spot stays confirmed past the deadline.
const hasConfirmed = (application) =>
  application?.status === 'accepted' &&
  application.confirmation === 'confirmed';

function derivedGroups(application, confirmBy, now) {
  if (isAwaitingConfirmation(application, confirmBy, now)) {
    return ['accepted_unconfirmed'];
  }
  if (hasConfirmed(application)) return ['accepted_confirmed'];
  return [];
}

export function buildAudience(
  profiles,
  applications,
  decisions,
  { confirmBy = null, now = new Date() } = {},
) {
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
      const group = getRecipientGroup(
        application,
        application && decisionByApplication.get(application.id),
      );
      const groups = [group, ...derivedGroups(application, confirmBy, now)];
      return {
        userId: profile.id,
        fullName: profile.full_name || '',
        email: profile.email,
        group,
        groups,
      };
    })
    .filter((person) => person.group)
    .sort((a, b) => a.email.localeCompare(b.email));
}

export const filterAudience = (audience, selectedGroups) =>
  audience.filter((person) =>
    person.groups.some((group) => selectedGroups.includes(group)),
  );

export const countByGroup = (audience) =>
  audience.reduce((counts, person) => {
    const next = { ...counts };
    person.groups.forEach((group) => {
      next[group] = (next[group] || 0) + 1;
    });
    return next;
  }, {});
