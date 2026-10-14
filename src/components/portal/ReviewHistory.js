import React from 'react';
import { STATUS_LABELS } from '../../portal/applicationStatus';
import { formatDateTime } from '../../portal/formatDateTime';

export default function ReviewHistory({ reviews = [] }) {
  if (reviews.length === 0) {
    return <p className="portal-review__muted">No decisions recorded yet.</p>;
  }

  return (
    <ol className="portal-review__history">
      {reviews.map((review) => (
        <li key={review.id} className="portal-review__history-item">
          <p>
            <strong>
              {STATUS_LABELS[review.previousStatus] || 'No prior decision'}
              {' → '}
              {STATUS_LABELS[review.newStatus] || review.newStatus}
            </strong>
          </p>
          <p className="portal-review__muted">
            {review.reviewerName || review.reviewerEmail || 'Unknown reviewer'}
            {' · '}
            <time dateTime={review.createdAt}>
              {formatDateTime(review.createdAt)}
            </time>
          </p>
          {review.note && <p className="portal-review__note">{review.note}</p>}
        </li>
      ))}
    </ol>
  );
}
