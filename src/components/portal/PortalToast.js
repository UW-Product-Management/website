import React from 'react';
import mascotSticker from '../../images/portal/toast-mascot-sticker.svg';
import mascotBody from '../../images/portal/toast-mascot-body.svg';
import mascotBodyError from '../../images/portal/toast-mascot-body-error.svg';

const CHECK_PATH = 'm6 12.5 4 4 8-9';
const CROSS_PATH = 'm7 7 10 10m0-10L7 17';

export default function PortalToast({
  variant = 'success',
  title,
  message,
  hint,
  onDone,
}) {
  const isError = variant === 'error';

  return (
    <div
      className={`portal-toast portal-toast--${variant}`}
      role={isError ? 'alert' : 'status'}
      onAnimationEnd={onDone}
    >
      <span className="portal-toast__icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none">
          <path
            d={isError ? CROSS_PATH : CHECK_PATH}
            stroke="currentColor"
            strokeWidth="2.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      <div className="portal-toast__text">
        <p className="portal-toast__headline">
          <strong>{title}</strong>
          {message && <strong>{message}</strong>}
        </p>
        {hint && <p className="portal-toast__hint">{hint}</p>}
      </div>
      <span className="portal-toast__mascot" aria-hidden="true">
        <span className="portal-toast__mascot-layer portal-toast__mascot-layer--sticker">
          <img src={mascotSticker} alt="" />
        </span>
        <span className="portal-toast__mascot-layer portal-toast__mascot-layer--body">
          <img src={isError ? mascotBodyError : mascotBody} alt="" />
        </span>
      </span>
    </div>
  );
}
