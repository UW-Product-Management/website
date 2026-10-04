import React from 'react';
import { Link, Navigate } from 'react-router-dom';
import PortalHeader from '../../components/portal/PortalHeader';
import { usePortal } from '../../context/PortalContext';
import { hasSubmitted } from '../../portal/applicationStatus';
import '../../styles/portal/Portal.css';

export default function Confirmation() {
  const { session, profile, application, state } = usePortal();
  const submittedAt = application?.submittedAt || state?.submittedAt;

  if (!submittedAt && !hasSubmitted(application)) {
    return <Navigate to="/portal/apply/register" replace />;
  }

  const fullName = profile?.fullName || state?.account?.fullName || '';
  const email = session?.user?.email || state?.account?.email || '';
  const program = application?.program || state?.application?.program || '';
  const yearOfStudy =
    application?.yearOfStudy || state?.application?.yearOfStudy || '';
  const formattedDate = submittedAt
    ? new Date(submittedAt).toLocaleString()
    : 'Recently';

  return (
    <main className="portal-page portal-confirmation">
      <PortalHeader />
      <section className="portal-confirmation__card">
        <h1>You&apos;re in!</h1>
        <p>Your application has been submitted successfully.</p>

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

        <div className="portal-apply__actions">
          <Link
            to="/portal/dashboard"
            className="portal-button portal-button--primary"
          >
            View my application
          </Link>
          <Link to="/portal" className="portal-button portal-button--outline">
            Back to home
          </Link>
        </div>
        <p>
          <Link to="/portal/apply/confirmation-email">
            View confirmation email (example)
          </Link>
        </p>
      </section>
    </main>
  );
}
