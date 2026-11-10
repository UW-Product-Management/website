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

// The server refuses to continue these campaigns, so offering Resume would
// only repeat the same error.
const UNRESUMABLE_ERRORS = new Set([
  'run_expired',
  'run_finished',
  'run_not_found',
  'mode_changed',
]);

const people = (count) => `${count} ${count === 1 ? 'person' : 'people'}`;

function sentSummary(sent, failed) {
  const summary = `Email sent to ${people(sent)}.`;
  if (failed === 0) return summary;
  return `${summary} ${failed} couldn't be delivered and won't be retried.`;
}

export default function EmailSendControls({
  eventId,
  recipients = [],
  subject = '',
  body = '',
  onSent,
  onBusyChange,
}) {
  const [mode, setMode] = useState(null);
  const [confirmation, setConfirmation] = useState('');
  const [isBusy, setIsBusy] = useState(false);
  const [progress, setProgress] = useState('');
  const [notice, setNotice] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [pausedCampaign, setPausedCampaign] = useState(null);

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

  // A typed "SEND <n>" confirms one specific list; two groups can share a
  // count, so the phrase alone cannot tell them apart.
  useEffect(() => {
    setConfirmation('');
  }, [recipients]);

  // Resuming continues the stored campaign, so it is only safe while the
  // organizer is still looking at the exact email and list it was created for.
  useEffect(() => {
    setPausedCampaign(null);
  }, [recipients, subject, body]);

  const total = recipients.length;
  const expectedPhrase = `SEND ${total}`;
  const hasContent = subject.trim() !== '' && body.trim() !== '';
  const isReady = !isBusy && mode !== null;
  const canSend =
    isReady && hasContent && total > 0 && confirmation === expectedPhrase;

  const runBusy = async (work) => {
    setIsBusy(true);
    onBusyChange?.(true);
    setErrorMessage('');
    setNotice('');
    try {
      await work();
    } finally {
      setIsBusy(false);
      onBusyChange?.(false);
    }
  };

  const sendBatches = async (campaign) => {
    let { sent, failed } = campaign;
    setPausedCampaign(null);

    for (;;) {
      const { data, error } = await sendCustomEmailBatch(campaign.id);
      if (error) {
        if (!UNRESUMABLE_ERRORS.has(error.code)) {
          setPausedCampaign({ id: campaign.id, sent, failed });
        }
        setErrorMessage(error.message);
        return;
      }

      sent += data.sent;
      failed += data.failed;
      setProgress(`Sent ${sent} of ${total}`);
      if (data.remaining === 0) break;

      if (data.sent + data.failed === 0) {
        setPausedCampaign({ id: campaign.id, sent, failed });
        setErrorMessage(
          `Sending paused with ${data.remaining} left. Resume to continue.`,
        );
        return;
      }
    }

    setConfirmation('');
    setNotice(sentSummary(sent, failed));
    onSent?.();
  };

  const handleTest = () =>
    runBusy(async () => {
      const { data, error } = await sendTestCustomEmail({ subject, body });
      if (error) setErrorMessage(error.message);
      else setNotice(`Test email sent to ${data.to}.`);
    });

  const handleSend = () =>
    runBusy(async () => {
      const created = await createCustomEmail(eventId, {
        subject,
        body,
        recipientIds: recipients.map((person) => person.userId),
        confirmation,
      });
      if (created.error) {
        setErrorMessage(created.error.message);
        return;
      }
      await sendBatches({ id: created.data.campaignId, sent: 0, failed: 0 });
    });

  const handleResume = () => runBusy(() => sendBatches(pausedCampaign));

  const pausedRemaining = pausedCampaign
    ? total - pausedCampaign.sent - pausedCampaign.failed
    : 0;

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
          disabled={!isReady || !hasContent}
          onClick={handleTest}
        >
          Send test to myself
        </button>
      </div>

      {pausedCampaign ? (
        <div className="portal-messages__row">
          <button
            type="button"
            className="portal-button portal-button--primary"
            disabled={!isReady}
            onClick={handleResume}
          >
            {`Resume sending (${pausedRemaining} left)`}
          </button>
        </div>
      ) : (
        <div className="portal-messages__row">
          <label htmlFor="message-confirmation">
            Type {expectedPhrase} to confirm
            <input
              id="message-confirmation"
              type="text"
              autoComplete="off"
              value={confirmation}
              disabled={isBusy}
              onChange={(e) => setConfirmation(e.target.value)}
            />
          </label>
          <button
            type="button"
            className="portal-button portal-button--primary"
            disabled={!canSend}
            onClick={handleSend}
          >
            {`Send to ${people(total)}`}
          </button>
        </div>
      )}

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
