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

export const CONFIRMATION_LABELS = {
  pending: 'Not confirmed',
  confirmed: 'Confirmed',
  withdrawn: 'Withdrawn',
};

export const isAccepted = (application) => application?.status === 'accepted';

export const getConfirmation = (application) =>
  application?.confirmation || 'pending';

export const hasConfirmedSpot = (application) =>
  getConfirmation(application) === 'confirmed';

export const isConfirmedAttendee = (application) =>
  isAccepted(application) && hasConfirmedSpot(application);

export const isConfirmationOpen = (event) =>
  Boolean(event?.confirm_by) && Date.now() < new Date(event.confirm_by);

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
