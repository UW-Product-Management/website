import React from 'react';
import { Link, Navigate } from 'react-router-dom';
import { usePortal } from '../../context/PortalContext';
import { hasSubmitted, STATUS_LABELS } from '../../portal/applicationStatus';
import PortalShell from '../../components/portal/PortalShell';
import { CheckIcon } from '../../components/portal/PortalIcons';
import { PORTAL_MASCOTS } from '../../data/portalContent';
import '../../styles/portal/Portal.css';

const CHECKLIST = [
  { key: 'register', label: 'Register' },
  { key: 'questions', label: 'Questions' },
  { key: 'consent', label: 'Consent & Logistics' },
  { key: 'submit', label: 'Submit' },
];

export default function Dashboard() {
  const { application, state } = usePortal();
  const submittedAt = application?.submittedAt || state?.submittedAt;

  if (!submittedAt && !hasSubmitted(application)) {
    return <Navigate to="/portal/apply/register" replace />;
  }

  const completedOn = submittedAt
    ? new Date(submittedAt).toLocaleDateString()
    : 'Recently';

  const { grad } = PORTAL_MASCOTS;

  return (
    <PortalShell variant="dashboard">
      <h1>My Application</h1>

      <div className="portal-dashboard__card">
        <div className="portal-dashboard__summary">
          <img
            src={grad.src}
            width={grad.width}
            height={grad.height}
            alt=""
            decoding="async"
          />
          <div>
            <p className="portal-dashboard__headline">Application Submitted!</p>
            {application?.status && application.status !== 'submitted' && (
              <p className="portal-dashboard__decision">
                Status: {STATUS_LABELS[application.status]}
              </p>
            )}
            <p>
              You&apos;re all set. We&apos;ll be in touch with next steps via
              email.
            </p>
          </div>
        </div>

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
