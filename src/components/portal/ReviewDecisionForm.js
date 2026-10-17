import React, { useState } from 'react';
import {
  DECISION_ACTIONS,
  REVIEW_DECISIONS,
  STATUS_LABELS,
} from '../../portal/applicationStatus';

const MAX_NOTE_LENGTH = 2000;

export default function ReviewDecisionForm({
  currentStatus,
  isPending = false,
  onDecide,
}) {
  const [note, setNote] = useState('');
  const [confirming, setConfirming] = useState(null);

  const submit = async (decision) => {
    const succeeded = await onDecide(decision, note);
    if (succeeded) setNote('');
    setConfirming(null);
  };

  const handleClick = (decision) => {
    if (decision === 'rejected' && confirming !== 'rejected') {
      setConfirming('rejected');
      return;
    }
    submit(decision);
  };

  return (
    <form
      className="portal-review__decision"
      onSubmit={(event) => event.preventDefault()}
    >
      <label htmlFor="review-note">
        Internal note (optional, never shown to the applicant)
        <textarea
          id="review-note"
          value={note}
          maxLength={MAX_NOTE_LENGTH}
          rows={3}
          onChange={(event) => setNote(event.target.value)}
        />
      </label>
      {confirming === 'rejected' && (
        <p role="alert" className="portal-review__confirm">
          This records the application as {STATUS_LABELS.rejected}. The
          applicant is only told when results are sent. Confirm to continue.
        </p>
      )}
      <div className="portal-review__actions">
        {REVIEW_DECISIONS.map((decision) => (
          <button
            key={decision}
            type="button"
            className={`portal-button ${
              decision === 'accepted'
                ? 'portal-button--primary'
                : 'portal-button--outline'
            }`}
            disabled={isPending || currentStatus === decision}
            onClick={() => handleClick(decision)}
          >
            {confirming === decision
              ? `Confirm ${DECISION_ACTIONS[decision].toLowerCase()}`
              : DECISION_ACTIONS[decision]}
          </button>
        ))}
        {confirming && (
          <button
            type="button"
            className="portal-button portal-button--outline"
            onClick={() => setConfirming(null)}
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
