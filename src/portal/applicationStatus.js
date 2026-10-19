export const REVIEW_DECISIONS = ['accepted', 'waitlisted', 'rejected'];

export const DECISION_ACTIONS = {
  accepted: 'Accept',
  waitlisted: 'Waitlist',
  rejected: 'Decline',
};

export const STATUS_LABELS = {
  draft: 'Draft',
  submitted: 'Under review',
  accepted: 'Accepted',
  waitlisted: 'Waitlisted',
  rejected: 'Not selected',
};

export const hasSubmitted = (application) =>
  Boolean(application?.status) && application.status !== 'draft';

export const EMAIL_STATE_LABELS = {
  none: '—',
  notSent: 'Not sent',
  sent: 'Sent',
  changed: 'Changed since email',
};

export function getEmailState(application) {
  if (!application?.emailSentAt) {
    return application?.status === 'submitted' ? 'none' : 'notSent';
  }
  return application.emailedDecision === application.status
    ? 'sent'
    : 'changed';
}
