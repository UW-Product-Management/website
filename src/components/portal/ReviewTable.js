import React from 'react';
import {
  EMAIL_STATE_LABELS,
  STATUS_LABELS,
  getEmailState,
} from '../../portal/applicationStatus';
import { formatDateTime } from '../../portal/formatDateTime';
import '../../styles/portal/PortalReview.css';

export default function ReviewTable({
  applications = [],
  selectedId = null,
  onSelect,
}) {
  return (
    <div className="portal-review__table-wrapper">
      <table className="portal-review__table">
        <thead>
          <tr>
            <th scope="col">Applicant</th>
            <th scope="col">Program</th>
            <th scope="col">Status</th>
            <th scope="col">Result email</th>
            <th scope="col">Last reviewed</th>
            <th scope="col">Review</th>
          </tr>
        </thead>
        <tbody>
          {applications.map((application) => {
            const latest = application.reviews?.[0];
            const label = application.fullName || application.email;
            return (
              <tr
                key={application.id}
                className={
                  selectedId === application.id
                    ? 'portal-review__row--selected'
                    : undefined
                }
              >
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
                <td>
                  {STATUS_LABELS[application.status] || application.status}
                </td>
                <td>{EMAIL_STATE_LABELS[getEmailState(application)]}</td>
                <td>
                  {latest ? (
                    <>
                      {latest.reviewerName || latest.reviewerEmail || '—'}
                      <span className="portal-review__email">
                        {formatDateTime(latest.createdAt)}
                      </span>
                    </>
                  ) : (
                    '—'
                  )}
                </td>
                <td>
                  <button
                    type="button"
                    className="portal-button portal-button--outline"
                    aria-label={`Review ${label}`}
                    aria-pressed={selectedId === application.id}
                    onClick={() => onSelect(application.id)}
                  >
                    Review
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
