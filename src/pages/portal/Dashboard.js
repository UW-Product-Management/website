import React from 'react';
import { Link, Navigate } from 'react-router-dom';
import { usePortal } from '../../context/PortalContext';
import { hasSubmitted, STATUS_LABELS } from '../../portal/applicationStatus';
import PortalShell from '../../components/portal/PortalShell';
import PortalSummary from '../../components/portal/PortalSummary';
import { CheckIcon } from '../../components/portal/PortalIcons';
import { DASHBOARD_MASCOTS } from '../../data/portalContent';
import '../../styles/portal/Portal.css';

const CHECKLIST = [
  { key: 'register', label: 'Register' },
  { key: 'questions', label: 'Complete questions' },
  { key: 'consent', label: 'Consent and logistics' },
  { key: 'submit', label: 'Submit' },
];

const formatCompletedOn = (value) => {
  const date = new Date(value);
  const day = date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const time = date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
  return `${day}, at ${time}`;
};

export default function Dashboard() {
  const { application, state } = usePortal();
  const submittedAt = application?.submittedAt || state?.submittedAt;

  if (!submittedAt && !hasSubmitted(application)) {
    return <Navigate to="/portal/apply/register" replace />;
  }

  const completedOn = submittedAt ? formatCompletedOn(submittedAt) : 'Recently';

  const { grad } = DASHBOARD_MASCOTS;

  return (
    <PortalShell variant="dashboard">
      <h1>My Application</h1>

      <div className="portal-dashboard__card">
        <PortalSummary mascot={grad}>
          <p className="portal-dashboard__headline">Application submitted!</p>
          {application?.status && application.status !== 'submitted' && (
            <p className="portal-dashboard__decision">
              Status: {STATUS_LABELS[application.status]}
            </p>
          )}
          <p>
            You&apos;re all set! We&apos;ll be in touch with next steps via
            email.
          </p>
        </PortalSummary>

        <ol className="portal-dashboard__checklist">
          {CHECKLIST.map((step) => (
            <li key={step.key}>
              <span className="portal-dashboard__check">
                <CheckIcon />
              </span>
              <span className="portal-dashboard__step">{step.label}</span>
              <span className="portal-dashboard__completed">
                Completed on {completedOn}
              </span>
            </li>
          ))}
        </ol>

        <Link
          to="/portal/dashboard/details"
          className="portal-button portal-button--outline-coral"
        >
          View application details
        </Link>
      </div>
    </PortalShell>
  );
}
