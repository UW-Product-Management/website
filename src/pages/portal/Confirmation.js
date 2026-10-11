import React from 'react';
import { Link, Navigate } from 'react-router-dom';
import { usePortal } from '../../context/PortalContext';
import { hasSubmitted } from '../../portal/applicationStatus';
import ConfirmationLayout from '../../components/portal/ConfirmationLayout';
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

  const summaryRows = [
    { label: 'Name', value: fullName },
    { label: 'Email', value: email },
    { label: 'Program', value: program },
    { label: 'Year', value: yearOfStudy },
    { label: 'Submitted on', value: formattedDate },
  ];

  return (
    <ConfirmationLayout>
      <p>Your application has been submitted successfully.</p>

      <section className="portal-confirmation__card">
        <h2>Application Summary</h2>
        <dl className="portal-apply__review">
          {summaryRows.map(({ label, value }) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <div className="portal-confirmation__actions">
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
    </ConfirmationLayout>
  );
}
