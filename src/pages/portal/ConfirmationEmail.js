import React from 'react';
import { Link, Navigate } from 'react-router-dom';
import { usePortal } from '../../context/PortalContext';
import '../../styles/portal/Portal.css';

export default function ConfirmationEmail() {
  const { session, profile, application, state } = usePortal();
  const submittedAt = application?.submittedAt || state?.submittedAt;

  if (!submittedAt && application?.status !== 'submitted') {
    return <Navigate to="/portal/apply/register" replace />;
  }

  const fullName = profile?.fullName || state?.account?.fullName || '';
  const email = session?.user?.email || state?.account?.email || '';
  const program = application?.program || state?.application?.program || '';
  const yearOfStudy =
    application?.yearOfStudy || state?.application?.yearOfStudy || '';
  const formattedTime = submittedAt
    ? new Date(submittedAt).toLocaleTimeString()
    : '';
  const formattedDate = submittedAt
    ? new Date(submittedAt).toLocaleString()
    : 'Recently';

  return (
    <main className="portal-page portal-email">
      <p>
        <Link to="/portal/apply/confirmation">Back to confirmation</Link>
      </p>
      <article className="portal-email__card">
        <header className="portal-email__header">
          <span>UWPM</span>
          <span>{formattedTime}</span>
        </header>
        <h1>Your application has been received!</h1>
        <p>Hi {fullName},</p>
        <p>
          Thanks for applying to ProdCon! We&apos;ve received your application
          and we&apos;re excited to have you join us.
        </p>

        <h2>Application Summary</h2>
        <dl className="portal-apply__review">
          <div>
            <dt>Name</dt>
            <dd>{fullName}</dd>
          </div>
          <div>
            <dt>Email</dt>
            <dd>{email}</dd>
          </div>
          <div>
            <dt>Program</dt>
            <dd>{program}</dd>
          </div>
          <div>
            <dt>Year</dt>
            <dd>{yearOfStudy}</dd>
          </div>
          <div>
            <dt>Submitted on</dt>
            <dd>{formattedDate}</dd>
          </div>
        </dl>

        <p>We&apos;re excited to have you join us!</p>
        <p>— The UWPM Team</p>
      </article>
    </main>
  );
}
