import React from 'react';
import { ArrowIcon } from './PortalIcons';

export default function ApplyActions({
  onBack,
  isBusy = false,
  disabled = false,
  nextLabel = 'Next',
  busyLabel = 'Saving...',
}) {
  return (
    <div className="portal-apply__actions">
      {onBack ? (
        <button type="button" className="portal-apply__back" onClick={onBack}>
          <ArrowIcon direction="left" />
          Back
        </button>
      ) : (
        <span />
      )}
      <button
        type="submit"
        disabled={disabled || isBusy}
        className="portal-button portal-button--primary portal-button--next"
      >
        {isBusy ? busyLabel : nextLabel}
        {!isBusy && <ArrowIcon />}
      </button>
    </div>
  );
}
