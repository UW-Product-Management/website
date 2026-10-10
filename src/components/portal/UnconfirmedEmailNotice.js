import React, { useState } from 'react';
import * as portalApi from '../../services/portalApi';

export default function UnconfirmedEmailNotice({ email }) {
  const [isResending, setIsResending] = useState(false);
  const [resendMessage, setResendMessage] = useState(null);
  const [resendMessageType, setResendMessageType] = useState(null);

  const handleResendConfirmation = async () => {
    const targetEmail = (email || '').trim();
    if (!targetEmail) return;

    setIsResending(true);
    setResendMessage(null);
    setResendMessageType(null);

    try {
      const { error } = await portalApi.resendConfirmation(targetEmail);
      setIsResending(false);

      if (error) {
        if (error.code === 'over_email_send_rate_limit') {
          setResendMessage(
            error.message ||
              'For security purposes, you can only request this after a short wait.',
          );
        } else if (
          error.status === 429 ||
          /rate limit|throttle|too many requests/i.test(error.message)
        ) {
          setResendMessage(
            error.message ||
              'Too many requests. Please wait a moment before trying again.',
          );
        } else {
          setResendMessage(
            error.message || 'Unable to resend confirmation. Please try again.',
          );
        }
        setResendMessageType('error');
      } else {
        setResendMessage('Confirmation email sent! Please check your inbox.');
        setResendMessageType('success');
      }
    } catch (err) {
      setIsResending(false);
      setResendMessage(
        err.message || 'Unable to resend confirmation. Please try again.',
      );
      setResendMessageType('error');
    }
  };

  return (
    <div className="portal-auth__error" role="alert">
      <p>
        Your email address has not been confirmed yet. Please check your inbox
        to confirm your account.
      </p>
      <button
        type="button"
        className="portal-button portal-button--outline portal-button--resend"
        onClick={handleResendConfirmation}
        disabled={isResending}
      >
        {isResending ? 'Resending confirmation...' : 'Resend confirmation'}
      </button>
      {resendMessage && (
        <p
          className={
            resendMessageType === 'error'
              ? 'portal-auth__resend-error'
              : 'portal-auth__resend-success'
          }
        >
          {resendMessage}
        </p>
      )}
    </div>
  );
}
