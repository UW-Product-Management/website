import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { MapPinIcon, WalletIcon } from './PortalIcons';
import { EVENT_DETAILS } from '../../data/portalContent';

const ACKNOWLEDGEMENT_ID = 'confirm-spot-acknowledgement';

export default function ConfirmSpotDialog({ onConfirm, onClose }) {
  const [acknowledged, setAcknowledged] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!acknowledged || isSaving) return;

    setIsSaving(true);
    setErrorMessage('');
    const message = await onConfirm();
    if (message) {
      setErrorMessage(message);
      setIsSaving(false);
      return;
    }
    onClose();
  };

  const { date, venue } = EVENT_DETAILS;

  return createPortal(
    <div
      className="portal-answer-dialog__backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <form
        className="portal-answer-dialog portal-confirm-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-spot-heading"
        onSubmit={handleSubmit}
      >
        <p className="portal-confirm-dialog__eyebrow">One last thing</p>
        <h2 id="confirm-spot-heading">Before you confirm your spot</h2>
        <p className="portal-confirm-dialog__lead">
          Please make sure you can make it to ProdCon in person.
        </p>

        <ul className="portal-confirm-dialog__facts">
          <li>
            <span className="portal-confirm-dialog__icon">
              <MapPinIcon />
            </span>
            <div>
              <p className="portal-confirm-dialog__fact-title">
                In person at {venue.name}
              </p>
              <p>
                ProdCon is an in-person event — there is no virtual option.{' '}
                {date} ·{' '}
                <a href={venue.href} target="_blank" rel="noreferrer">
                  View on Google Maps
                </a>
              </p>
            </div>
          </li>
          <li>
            <span className="portal-confirm-dialog__icon">
              <WalletIcon />
            </span>
            <div>
              <p className="portal-confirm-dialog__fact-title">
                No travel reimbursements
              </p>
              <p>
                You are responsible for your own travel and accommodation to get
                to the event.
              </p>
            </div>
          </li>
        </ul>

        <label
          className="portal-confirm-dialog__check"
          htmlFor={ACKNOWLEDGEMENT_ID}
        >
          <input
            id={ACKNOWLEDGEMENT_ID}
            type="checkbox"
            checked={acknowledged}
            onChange={(event) => setAcknowledged(event.target.checked)}
          />
          <span>
            I understand ProdCon is in person at {venue.name} and that travel is
            not reimbursed.
          </span>
        </label>

        {errorMessage && (
          <div className="portal-apply__error" role="alert">
            {errorMessage}
          </div>
        )}

        <div className="portal-answer-dialog__actions">
          <button
            type="button"
            className="portal-apply__back"
            onClick={onClose}
          >
            Go back
          </button>
          <button
            type="submit"
            disabled={!acknowledged || isSaving}
            className="portal-button portal-confirm-dialog__confirm"
          >
            {isSaving ? 'Confirming...' : 'Confirm acceptance'}
          </button>
        </div>
      </form>
    </div>,
    document.body,
  );
}
