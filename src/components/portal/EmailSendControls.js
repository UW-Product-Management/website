import React, { useCallback, useEffect, useState } from 'react';
import {
  abandonCustomEmail,
  createCustomEmail,
  getCustomEmailMode,
  getResumableCustomEmail,
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

// The server sends 20 per batch and caps a campaign at 2000 recipients, so a
// legitimate send can never reach this. It only stops a loop that would
// otherwise spin forever against a server that keeps reporting work left.
const MAX_BATCHES = 200;

const people = (count) => `${count} ${count === 1 ? 'person' : 'people'}`;

// Every recipient is accounted for: sent, failed and unconfirmed together with
// the ones still waiting add up to the campaign's total, so the organizer is
// never left wondering about a missing remainder.
function unfinishedSummary({ subject, total, pending, sent, failed, dropped }) {
  const settled = [`${sent} sent`];
  if (failed > 0) settled.push(`${failed} undeliverable`);
  if (dropped > 0) settled.push(`${dropped} unconfirmed`);

  return (
    `“${subject}” has ${people(pending)} of ${total} left to email ` +
    `(${settled.join(', ')} so far). Resuming continues that email, not what ` +
    `is in the composer.`
  );
}

function sentSummary({ sent, failed, dropped }) {
  const parts = [`Email sent to ${people(sent)}.`];
  if (failed > 0) {
    parts.push(`${failed} couldn't be delivered and won't be retried.`);
  }
  if (dropped > 0) {
    parts.push(
      `${dropped} could not be confirmed as delivered — check with them before resending.`,
    );
  }
  return parts.join(' ');
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
  const [unfinished, setUnfinished] = useState(null);
  const [isDiscarding, setIsDiscarding] = useState(false);

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

  // Read from the server rather than tracked locally, so a send stranded by a
  // closed tab is still offered to whichever organizer opens the page next.
  const loadUnfinished = useCallback(async () => {
    if (!eventId) return null;
    const { data, error } = await getResumableCustomEmail(eventId);
    if (error) return null;
    setUnfinished(data.campaign);
    return data.campaign;
  }, [eventId]);

  useEffect(() => {
    loadUnfinished();
  }, [loadUnfinished]);

  // A typed "SEND <n>" confirms one specific list; two groups can share a
  // count, so the phrase alone cannot tell them apart.
  useEffect(() => {
    setConfirmation('');
  }, [recipients]);

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

  // Only invites a resume once the server confirms the campaign still accepts
  // one, so the message never points at a button that is not there.
  const stopWith = async (reason) => {
    const campaign = await loadUnfinished();
    setErrorMessage(
      campaign?.resumable ? `${reason} Resume to continue.` : reason,
    );
  };

  const sendBatches = async (campaignId, campaignTotal, startTotals) => {
    let { sent, failed, dropped } = startTotals;

    for (let attempt = 0; attempt < MAX_BATCHES; attempt += 1) {
      const { data, error } = await sendCustomEmailBatch(campaignId);
      if (error) {
        setErrorMessage(error.message);
        await loadUnfinished();
        return;
      }

      sent += data.sent;
      failed += data.failed;
      dropped = data.dropped ?? dropped;
      setProgress(`Sent ${sent} of ${campaignTotal}`);

      if (data.remaining === 0) {
        setConfirmation('');
        setUnfinished(null);
        setNotice(sentSummary({ sent, failed, dropped }));
        onSent?.();
        return;
      }

      // Rows another batch claimed count as progress: the campaign is moving,
      // just not through this loop. Pausing on them would report a concurrent
      // resume as a failure.
      if (data.sent + data.failed + (data.skipped ?? 0) === 0) {
        await stopWith(`Sending paused with ${data.remaining} left.`);
        return;
      }
    }

    await stopWith('Sending stopped before it finished.');
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
        if (created.error.code === 'unfinished_campaign') {
          await loadUnfinished();
        }
        return;
      }
      await sendBatches(created.data.campaignId, total, {
        sent: 0,
        failed: 0,
        dropped: 0,
      });
    });

  const handleResume = () =>
    runBusy(() =>
      sendBatches(unfinished.id, unfinished.total, {
        sent: unfinished.sent,
        failed: unfinished.failed,
        dropped: unfinished.dropped,
      }),
    );

  const handleDiscard = () =>
    runBusy(async () => {
      const { error } = await abandonCustomEmail(unfinished.id);
      if (error) {
        setErrorMessage(error.message);
        return;
      }
      setIsDiscarding(false);
      setUnfinished(null);
      setNotice('The unfinished send was discarded. No one else was emailed.');
    });

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

      {unfinished ? (
        <section
          className="portal-messages__unfinished"
          aria-labelledby="unfinished-send-heading"
        >
          <h3 id="unfinished-send-heading">Unfinished send</h3>
          <p>{unfinishedSummary(unfinished)}</p>
          {unfinished.blockedReason && (
            <p className="portal-messages__hint">
              It can no longer be resumed, so the remaining people must be
              emailed as a new, smaller send.
            </p>
          )}
          {isDiscarding ? (
            <>
              <p className="portal-messages__hint">
                {`Discarding closes this send for good. The ${people(
                  unfinished.pending,
                )} who have not been emailed will not be, and it cannot be undone.`}
              </p>
              <div className="portal-messages__row">
                <button
                  type="button"
                  className="portal-button portal-button--primary"
                  disabled={!isReady}
                  onClick={handleDiscard}
                >
                  Yes, discard this send
                </button>
                <button
                  type="button"
                  className="portal-button portal-button--outline"
                  disabled={!isReady}
                  onClick={() => setIsDiscarding(false)}
                >
                  Keep it
                </button>
              </div>
            </>
          ) : (
            <div className="portal-messages__row">
              {unfinished.resumable && (
                <button
                  type="button"
                  className="portal-button portal-button--primary"
                  disabled={!isReady}
                  onClick={handleResume}
                >
                  {`Resume sending (${unfinished.pending} left)`}
                </button>
              )}
              <button
                type="button"
                className="portal-button portal-button--outline"
                disabled={!isReady}
                onClick={() => setIsDiscarding(true)}
              >
                Discard without sending the rest
              </button>
            </div>
          )}
        </section>
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
