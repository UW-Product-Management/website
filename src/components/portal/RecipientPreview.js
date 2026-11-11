import React from 'react';
import { GROUP_LABELS } from '../../portal/emailRecipients';

export default function RecipientPreview({ recipients = [] }) {
  return (
    <section
      className="portal-messages__preview"
      aria-labelledby="recipient-preview-heading"
    >
      <h3 id="recipient-preview-heading">
        {`${recipients.length} ${
          recipients.length === 1 ? 'recipient' : 'recipients'
        }`}
      </h3>
      {recipients.length === 0 ? (
        <p className="portal-messages__hint">
          Choose a group to see who will get this email.
        </p>
      ) : (
        <div className="portal-messages__table-wrap">
          <table className="portal-messages__table">
            <thead>
              <tr>
                <th scope="col">Name</th>
                <th scope="col">Email</th>
                <th scope="col">Group</th>
              </tr>
            </thead>
            <tbody>
              {recipients.map((person) => (
                <tr key={person.userId}>
                  <td>{person.fullName || '—'}</td>
                  <td>{person.email}</td>
                  <td>{GROUP_LABELS[person.group]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
