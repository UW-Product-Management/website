import React, { useEffect, useState } from 'react';
import {
  createCustomEmail,
  getCustomEmailMode,
  sendCustomEmailBatch,
  sendTestCustomEmail,
} from '../../services/portalApi';

const MODE_NOTICES = {
  local: 'Local mode: emails are captured in Mailpit and reach no one.',
  sandbox:
    'Staging mode: every email is redirected to the sandbox address and tagged [STAGING].',
  live: 'Live mode: emails go to real people and cannot be recalled.',
};

const EMAIL_SERVICE_UNAVAILABLE =
  'The email service is not reachable right now, so nothing can be sent. Refresh to try again.';

export default function EmailSendControls({
  eventId,
  recipients = [],
  subject = '',
  body = '',
  onSent,
}) {
  const [mode, setMode] = useState(null);
  const [confirmation, setConfirmation] = useState('');
  const [isBusy, setIsBusy] = useState(false);
  const [progress, setProgress] = useState('');
  const [notice, setNotice] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    let mounted = true;
    getCustomEmailMode().then(({ data, error }) => {
      if (!mounted) return;
      if (!error) setMode(data.mode);
      else if (error.code === 'send_failed') {
        setErrorMessage(EMAIL_SERVICE_UNAVAILABLE);
      } else setErrorMessage(error.message);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const total = recipients.length;
  const expectedPhrase = `SEND ${total}`;
  const hasContent = subject.trim() !== '' && body.trim() !== '';
  const canSend =
    !isBusy && hasContent && total > 0 && confirmation === expectedPhrase;

  const handleTest = async () => {
    setIsBusy(true);
    setErrorMessage('');
    setNotice('');
    const { data, error } = await sendTestCustomEmail({ subject, body });
    if (error) setErrorMessage(error.message);
    else setNotice(`Test email sent to ${data.to}.`);
    setIsBusy(false);
  };

  const handleSend = async () => {
    setIsBusy(true);
    setErrorMessage('');
    setNotice('');

    const created = await createCustomEmail(eventId, {
      subject,
      body,
      recipientIds: recipients.map((person) => person.userId),
      confirmation,
    });
    if (created.error) {
      setErrorMessage(created.error.message);
      setIsBusy(false);
      return;
    }

    const { campaignId } = created.data;
    let sentSoFar = 0;
    let remaining = total;
    while (remaining > 0) {
      const { data, error } = await sendCustomEmailBatch(campaignId);
      if (error) {
        setErrorMessage(error.message);
        break;
      }
      sentSoFar += data.sent;
      remaining = data.remaining;
      setProgress(`Sent ${sentSoFar} of ${total}`);
      if (data.sent === 0 && remaining > 0) {
        setErrorMessage(
          `${remaining} emails failed to send. Check the function logs before trying again.`,
        );
        break;
      }
    }

    setConfirmation('');
    setIsBusy(false);
    if (remaining === 0) {
      setNotice(`Email sent to ${sentSoFar} people.`);
      onSent?.();
    }
  };

  return (
    <div className="portal-messages__send">
      {mode && (
        <p className="portal-messages__mode" data-mode={mode}>
          {MODE_NOTICES[mode]}
        </p>
      )}

      <div className="portal-messages__row">
        <button
          type="button"
          className="portal-button portal-button--outline"
          disabled={isBusy || !hasContent}
          onClick={handleTest}
        >
          Send test to myself
        </button>
      </div>

      <div className="portal-messages__row">
        <label htmlFor="message-confirmation">
          Type {expectedPhrase} to confirm
          <input
            id="message-confirmation"
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
          {`Send to ${total} ${total === 1 ? 'person' : 'people'}`}
        </button>
      </div>

      {progress && isBusy && <p role="status">{progress}</p>}
      {notice && <p role="status">{notice}</p>}
      {errorMessage && (
        <p role="alert" className="portal-apply__error">
          {errorMessage}
        </p>
      )}
    </div>
  );
}
