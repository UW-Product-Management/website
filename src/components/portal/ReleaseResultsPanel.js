import React, { useCallback, useEffect, useState } from 'react';
import {
  REVIEW_DECISIONS,
  STATUS_LABELS,
} from '../../portal/applicationStatus';
import {
  approveDecisionEmails,
  previewDecisionEmails,
  sendDecisionEmailBatch,
  sendTestDecisionEmail,
} from '../../services/portalApi';

const MODE_NOTICES = {
  local: 'Local mode: emails are captured in Mailpit and reach no one.',
  sandbox:
    'Staging mode: every email is redirected to the sandbox address and tagged [STAGING].',
  live: 'Live mode: emails go to real applicants and cannot be recalled.',
};

const sumCounts = (counts) =>
  REVIEW_DECISIONS.reduce((sum, decision) => sum + counts[decision], 0);

export default function ReleaseResultsPanel({ event, onReleased }) {
  const eventId = event?.id;
  const [summary, setSummary] = useState(null);
  const [testDecision, setTestDecision] = useState('accepted');
  const [confirmation, setConfirmation] = useState('');
  const [includeChanged, setIncludeChanged] = useState(false);
  const [acknowledgeUndecided, setAcknowledgeUndecided] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [progress, setProgress] = useState('');
  const [notice, setNotice] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const refresh = useCallback(async () => {
    const { data, error } = await previewDecisionEmails(eventId);
    if (error) setErrorMessage(error.message);
    else setSummary(data);
  }, [eventId]);

  useEffect(() => {
    if (eventId) refresh();
  }, [eventId, refresh]);

  if (!summary) {
    return errorMessage ? (
      <p role="alert" className="portal-apply__error">
        {errorMessage}
      </p>
    ) : null;
  }

  const targetCounts = REVIEW_DECISIONS.reduce(
    (counts, decision) => ({
      ...counts,
      [decision]:
        summary.pending[decision] +
        (includeChanged ? summary.changed[decision] : 0),
    }),
    {},
  );
  const total = sumCounts(targetCounts);
  const expectedPhrase = `SEND ${total}`;
  const needsAcknowledgement = summary.undecided > 0;
  const canSend =
    !isBusy &&
    total > 0 &&
    confirmation === expectedPhrase &&
    (!needsAcknowledgement || acknowledgeUndecided);

  const handleTest = async () => {
    setIsBusy(true);
    setErrorMessage('');
    setNotice('');
    const { data, error } = await sendTestDecisionEmail(eventId, testDecision);
    if (error) setErrorMessage(error.message);
    else setNotice(`Test email sent to ${data.to}.`);
    setIsBusy(false);
  };

  const handleSend = async () => {
    setIsBusy(true);
    setErrorMessage('');
    setNotice('');

    const approval = await approveDecisionEmails(eventId, {
      counts: targetCounts,
      confirmation,
      includeChanged,
      acknowledgeUndecided,
    });
    if (approval.error) {
      setErrorMessage(approval.error.message);
      setIsBusy(false);
      if (approval.error.code === 'counts_changed') refresh();
      return;
    }

    const { runId } = approval.data;
    let sentSoFar = 0;
    let remaining = total;
    while (remaining > 0) {
      const { data, error } = await sendDecisionEmailBatch(eventId, runId);
      if (error) {
        setErrorMessage(error.message);
        break;
      }
      sentSoFar += data.sent;
      remaining = data.remaining;
      setProgress(`Sent ${sentSoFar} of ${total}`);
      if (data.sent === 0 && remaining > 0) {
        setErrorMessage(
          `${remaining} emails failed to send. Check the function logs, then send again.`,
        );
        break;
      }
    }

    if (remaining === 0) setNotice(`Results sent to ${sentSoFar} applicants.`);
    setConfirmation('');
    setAcknowledgeUndecided(false);
    setIsBusy(false);
    await refresh();
    onReleased?.();
  };

  const changedTotal = sumCounts(summary.changed);

  return (
    <section className="portal-release" aria-labelledby="release-heading">
      <h2 id="release-heading">Send results</h2>
      <p className="portal-release__mode" data-mode={summary.mode}>
        {MODE_NOTICES[summary.mode]}
      </p>
      <p className="portal-review__muted">
        Decisions stay hidden from applicants until you send them. Each
        applicant is emailed once and sees their result on the dashboard when it
        goes out.
      </p>

      <table className="portal-release__counts">
        <thead>
          <tr>
            <th scope="col">Decision</th>
            <th scope="col">Waiting to send</th>
          </tr>
        </thead>
        <tbody>
          {REVIEW_DECISIONS.map((decision) => (
            <tr key={decision}>
              <th scope="row">{STATUS_LABELS[decision]}</th>
              <td>{summary.pending[decision]}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="portal-review__muted">
        {summary.sent} already sent · {summary.undecided} without a decision
      </p>

      {changedTotal > 0 && (
        <label className="portal-release__check">
          <input
            type="checkbox"
            checked={includeChanged}
            onChange={(e) => setIncludeChanged(e.target.checked)}
          />
          Also re-send {changedTotal} decisions changed after their email
        </label>
      )}
      {needsAcknowledgement && (
        <label className="portal-release__check">
          <input
            type="checkbox"
            checked={acknowledgeUndecided}
            onChange={(e) => setAcknowledgeUndecided(e.target.checked)}
          />
          {summary.undecided} submitted applications have no decision and will
          not be emailed
        </label>
      )}

      <div className="portal-release__row">
        <label htmlFor="release-test-decision">
          Test email
          <select
            id="release-test-decision"
            value={testDecision}
            onChange={(e) => setTestDecision(e.target.value)}
          >
            {REVIEW_DECISIONS.map((decision) => (
              <option key={decision} value={decision}>
                {STATUS_LABELS[decision]}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          className="portal-button portal-button--outline"
          disabled={isBusy}
          onClick={handleTest}
        >
          Send test to me
        </button>
      </div>

      <div className="portal-release__row">
        <label htmlFor="release-confirmation">
          Type {expectedPhrase} to confirm
          <input
            id="release-confirmation"
            type="text"
            autoComplete="off"
            value={confirmation}
            onChange={(e) => setConfirmation(e.target.value)}
          />
        </label>
        <button
          type="button"
          className="portal-button portal-button--primary"
          disabled={!canSend}
          onClick={handleSend}
        >
          {`Send ${total} ${total === 1 ? 'result' : 'results'}`}
        </button>
      </div>

      {progress && isBusy && <p role="status">{progress}</p>}
      {notice && <p role="status">{notice}</p>}
      {errorMessage && (
        <p role="alert" className="portal-apply__error">
          {errorMessage}
        </p>
      )}
    </section>
  );
}
