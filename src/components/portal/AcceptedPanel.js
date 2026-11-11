import React, { useState } from 'react';
import PortalSummary from './PortalSummary';
import ConfirmSpotDialog from './ConfirmSpotDialog';
import { EVENT_DETAILS, PORTAL_MASCOTS } from '../../data/portalContent';

const CONTACT_EMAIL = 'uwpmwaterloo@gmail.com';

// Withdrawing returns the applicant to the unconfirmed invitation rather than
// a dead end, so they can still take the spot before the deadline.
function headlineFor(confirmation) {
  if (confirmation === 'confirmed') {
    return {
      pill: 'Spot confirmed',
      heading: "You're officially in. Welcome to ProdCon!",
    };
  }
  return {
    pill: 'Decision ready',
    heading: "Congratulations — you've been accepted!",
  };
}

export default function AcceptedPanel({
  confirmation = 'pending',
  isWindowOpen = true,
  onSetConfirmation,
}) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const { pill, heading } = headlineFor(confirmation);
  const { confirmDeadline } = EVENT_DETAILS;
  const isConfirmed = confirmation === 'confirmed';

  const handleConfirm = async () => {
    const result = await onSetConfirmation('confirmed', true);
    if (result?.error) return result.error.message;
    setIsDialogOpen(false);
    return undefined;
  };

  const handleWithdraw = async () => {
    setIsPending(true);
    setErrorMessage('');
    const result = await onSetConfirmation('withdrawn');
    setIsPending(false);
    if (result?.error) {
      setErrorMessage(result.error.message);
      return;
    }
    setIsWithdrawing(false);
  };

  return (
    <div className="portal-accepted">
      <PortalSummary mascot={PORTAL_MASCOTS.grad}>
        <p className="portal-accepted__pill">{pill}</p>
        <p className="portal-dashboard__headline">{heading}</p>

        {isConfirmed ? (
          <p>
            Thanks for confirming. Keep an eye on your inbox — we&apos;ll email
            onboarding details and next steps soon.
          </p>
        ) : isWindowOpen ? (
          <p>
            We loved your application and can&apos;t wait to have you at
            ProdCon. Confirm your spot by <strong>{confirmDeadline}</strong> so
            we can save you a seat.
          </p>
        ) : (
          <p>
            The deadline to confirm ({confirmDeadline}) has passed. Email us at{' '}
            <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> if you can
            still make it.
          </p>
        )}

        {errorMessage && (
          <div className="portal-apply__error" role="alert">
            {errorMessage}
          </div>
        )}

        {isConfirmed ? (
          <div className="portal-accepted__actions">
            {isWithdrawing && (
              <p role="alert" className="portal-accepted__warning">
                This gives up your spot at ProdCon. You can confirm again until{' '}
                {confirmDeadline}.
              </p>
            )}
            <div className="portal-accepted__buttons">
              <button
                type="button"
                className="portal-button portal-button--outline-coral"
                disabled={isPending || !isWindowOpen}
                onClick={() =>
                  isWithdrawing ? handleWithdraw() : setIsWithdrawing(true)
                }
              >
                {isWithdrawing ? 'Confirm withdrawal' : 'Withdraw from event'}
              </button>
              {isWithdrawing && (
                <button
                  type="button"
                  className="portal-apply__back"
                  onClick={() => setIsWithdrawing(false)}
                >
                  Cancel
                </button>
              )}
            </div>
          </div>
        ) : (
          <button
            type="button"
            className="portal-button portal-accepted__confirm"
            disabled={!isWindowOpen}
            onClick={() => setIsDialogOpen(true)}
          >
            Confirm acceptance
          </button>
        )}
      </PortalSummary>

      {isDialogOpen && (
        <ConfirmSpotDialog
          onConfirm={handleConfirm}
          onClose={() => setIsDialogOpen(false)}
        />
      )}
    </div>
  );
}
