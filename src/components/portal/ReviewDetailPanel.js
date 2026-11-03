import React from 'react';
import { STATUS_LABELS } from '../../portal/applicationStatus';
import { formatDateTime } from '../../portal/formatDateTime';
import ReviewDecisionForm from './ReviewDecisionForm';
import ReviewHistory from './ReviewHistory';

const ANSWERS = [['Favourite product', 'favouriteProduct']];

export default function ReviewDetailPanel({
  application,
  isPending = false,
  onDecide,
  onClose,
}) {
  const name = application.fullName || application.email;

  return (
    <aside className="portal-review__panel" aria-label={`Review ${name}`}>
      <div className="portal-review__panel-header">
        <div>
          <h2>{name}</h2>
          <p className="portal-review__muted">{application.email}</p>
        </div>
        <button
          type="button"
          className="portal-button portal-button--outline"
          onClick={onClose}
        >
          Close
        </button>
      </div>

      <dl className="portal-review__facts">
        <dt>Status</dt>
        <dd>{STATUS_LABELS[application.status] || application.status}</dd>
        <dt>Program</dt>
        <dd>{application.program || '—'}</dd>
        <dt>Year of study</dt>
        <dd>{application.yearOfStudy || '—'}</dd>
        <dt>Submitted</dt>
        <dd>{formatDateTime(application.submittedAt)}</dd>
        <dt>Dietary</dt>
        <dd>
          {[application.dietaryRestriction, application.dietaryDetails]
            .filter(Boolean)
            .join(' — ') || '—'}
        </dd>
        <dt>Media consent</dt>
        <dd>{application.mediaConsent ? 'Yes' : 'No'}</dd>
      </dl>

      {ANSWERS.map(([label, key]) => (
        <section key={key}>
          <h3>{label}</h3>
          <p className="portal-review__answer">{application[key] || '—'}</p>
        </section>
      ))}

      <section>
        <h3>Decision</h3>
        <ReviewDecisionForm
          key={application.id}
          currentStatus={application.status}
          isPending={isPending}
          onDecide={onDecide}
        />
      </section>

      <section>
        <h3>Decision history</h3>
        <ReviewHistory reviews={application.reviews} />
      </section>
    </aside>
  );
}
