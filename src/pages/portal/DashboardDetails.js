import React from 'react';
import { Navigate } from 'react-router-dom';
import { usePortal } from '../../context/PortalContext';
import { hasSubmitted } from '../../portal/applicationStatus';
import PortalShell from '../../components/portal/PortalShell';
import '../../styles/portal/Portal.css';

export default function DashboardDetails() {
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
  const productIdea =
    application?.productIdea ||
    application?.answers?.productIdea ||
    state?.application?.answers?.productIdea ||
    '';
  const greatTeam =
    application?.greatTeam ||
    application?.answers?.greatTeam ||
    state?.application?.answers?.greatTeam ||
    '';
  const productExperience =
    application?.productExperience ||
    application?.answers?.productExperience ||
    state?.application?.answers?.productExperience ||
    '';
  const dietaryRestrictions =
    application?.dietaryRestrictions ||
    application?.dietaryRestriction ||
    application?.consent?.dietaryRestrictions ||
    state?.application?.consent?.dietaryRestrictions ||
    'None';

  const formattedDate = submittedAt
    ? new Date(submittedAt).toLocaleString()
    : 'Recently';

  const detailRows = [
    { label: 'Full name', value: fullName || '—' },
    { label: 'Email address', value: email || '—' },
    { label: 'Program', value: program || '—' },
    { label: 'Year of study', value: yearOfStudy || '—' },
  ];
  const questionRows = [
    {
      label: '1. What product or service do you wish existed, and why?',
      value: productIdea || '—',
    },
    { label: '2. What makes a great product team?', value: greatTeam || '—' },
    {
      label:
        '3. What is one product you’ve worked on or contributed to, and what was your role?',
      value: productExperience || '—',
    },
  ];

  return (
    <PortalShell variant="dashboard">
      <h1>Application Details</h1>
      <p>Submitted on {formattedDate}</p>

      <div className="portal-dashboard__card portal-dashboard__card--details">
        <dl className="portal-apply__review">
          {detailRows.map(({ label, value }) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>

        <h2>Questions</h2>
        <dl className="portal-apply__review portal-apply__review--stacked">
          {questionRows.map(({ label, value }) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>

        <h2>Logistics</h2>
        <dl className="portal-apply__review">
          <div>
            <dt>Dietary restrictions</dt>
            <dd>{dietaryRestrictions}</dd>
          </div>
        </dl>

        <button
          type="button"
          className="portal-button portal-button--outline-coral"
          onClick={() => window.print()}
        >
          Download confirmation (PDF)
        </button>
      </div>
    </PortalShell>
  );
}
