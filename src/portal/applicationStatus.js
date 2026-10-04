export const REVIEW_DECISIONS = ['accepted', 'waitlisted', 'rejected'];

export const STATUS_LABELS = {
  draft: 'Draft',
  submitted: 'Under review',
  accepted: 'Accepted',
  waitlisted: 'Waitlisted',
  rejected: 'Not selected',
};

export const hasSubmitted = (application) =>
  Boolean(application?.status) && application.status !== 'draft';
