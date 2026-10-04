import React from 'react';
import {
  REVIEW_DECISIONS,
  STATUS_LABELS,
} from '../../portal/applicationStatus';
import '../../styles/portal/PortalReview.css';

export default function ReviewTable({
  applications = [],
  pendingId = null,
  onDecide,
}) {
  return (
    <div className="portal-review__table-wrapper">
      <table className="portal-review__table">
        <thead>
          <tr>
            <th scope="col">Applicant</th>
            <th scope="col">Program</th>
            <th scope="col">Status</th>
            <th scope="col">Answers</th>
            <th scope="col">Decision</th>
          </tr>
        </thead>
        <tbody>
          {applications.map((application) => (
            <tr key={application.id}>
              <th scope="row">
                {application.fullName || '—'}
                <span className="portal-review__email">
                  {application.email}
                </span>
              </th>
              <td>
                {application.program}
                <span className="portal-review__email">
                  {application.yearOfStudy}
                </span>
              </td>
              <td>{STATUS_LABELS[application.status] || application.status}</td>
              <td>
                <details>
                  <summary>
                    View answers
                    <span className="portal-review__sr-only">
                      {' '}
                      from {application.fullName || application.email}
                    </span>
                  </summary>
                  <p>{application.productIdea}</p>
                  <p>{application.greatTeam}</p>
                </details>
              </td>
              <td>
                <div className="portal-review__actions">
                  {REVIEW_DECISIONS.map((decision) => (
                    <button
                      key={decision}
                      type="button"
                      className="portal-button portal-button--outline"
                      disabled={
                        pendingId === application.id ||
                        application.status === decision
                      }
                      aria-label={`${STATUS_LABELS[decision]}: ${
                        application.fullName || application.email
                      }`}
                      onClick={() => onDecide(application.id, decision)}
                    >
                      {STATUS_LABELS[decision]}
                    </button>
                  ))}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
