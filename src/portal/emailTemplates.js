// Organizers are in Waterloo, and applicants read the deadline as local time.
const formatDeadline = (iso) =>
  new Date(iso).toLocaleString('en-CA', {
    timeZone: 'America/Toronto',
    dateStyle: 'full',
    timeStyle: 'short',
  });

function confirmationReminder({ name, confirm_by: confirmBy } = {}) {
  const eventName = name || 'ProdCon';
  const deadline = confirmBy
    ? `by ${formatDeadline(confirmBy)} (Waterloo time)`
    : 'as soon as possible';

  return {
    subject: `Reminder: confirm your spot at ${eventName}`,
    body: [
      'Hi {{name}},',
      `Congratulations again on being accepted to ${eventName}! We haven't heard back from you yet, so this is a quick reminder to confirm your spot.`,
      `Please log in to the portal and confirm ${deadline}. If you can no longer make it, you can withdraw there instead, which frees your spot for someone on the waitlist.`,
      'We hope to see you there!',
    ].join('\n\n'),
  };
}

const GROUP_TEMPLATES = {
  accepted_unconfirmed: confirmationReminder,
};

export function templateForGroup(group, event) {
  const template = GROUP_TEMPLATES[group];
  return template ? template(event) : null;
}
