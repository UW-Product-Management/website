import React from 'react';
import { Link, Navigate } from 'react-router-dom';
import { usePortal } from '../../context/PortalContext';
import {
  getConfirmation,
  hasSubmitted,
  isAccepted,
  isConfirmationOpen,
  STATUS_LABELS,
} from '../../portal/applicationStatus';
import PortalShell from '../../components/portal/PortalShell';
import PortalSummary from '../../components/portal/PortalSummary';
import AcceptedPanel from '../../components/portal/AcceptedPanel';
import DecisionPanel from '../../components/portal/DecisionPanel';
import { CheckIcon } from '../../components/portal/PortalIcons';
import { DASHBOARD_MASCOTS, EVENT_DETAILS } from '../../data/portalContent';
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

function confirmationStep(application) {
  const confirmation = getConfirmation(application);
  const changedOn = application?.confirmationUpdatedAt;

  if (confirmation === 'confirmed') {
    return {
      key: 'confirm',
      label: 'Confirm acceptance',
      detail: changedOn
        ? `Confirmed on ${formatCompletedOn(changedOn)}`
        : 'Confirmed',
      isComplete: true,
    };
  }

  return {
    key: 'confirm',
    label: 'Confirm acceptance',
    detail: `Waiting on you — confirm by ${EVENT_DETAILS.confirmDeadline}`,
    isComplete: false,
  };
}

function buildSteps(application, completedOn) {
  const steps = CHECKLIST.map((step) => ({
    ...step,
    detail: `Completed on ${completedOn}`,
    isComplete: true,
  }));

  const status = application?.status;
  if (!status || status === 'submitted') return steps;

  steps.push({
    key: 'decision',
    label: 'Decision',
    pill: STATUS_LABELS[status],
    detail: application.reviewedAt
      ? `${STATUS_LABELS[status]} on ${formatCompletedOn(
          application.reviewedAt,
        )}`
      : STATUS_LABELS[status],
    isComplete: true,
  });

  if (isAccepted(application)) steps.push(confirmationStep(application));

  return steps;
}

export default function Dashboard() {
  const { application, event, state, setConfirmation } = usePortal();
  const submittedAt = application?.submittedAt || state?.submittedAt;

  if (!submittedAt && !hasSubmitted(application)) {
    return <Navigate to="/portal/apply/register" replace />;
  }

  const completedOn = submittedAt ? formatCompletedOn(submittedAt) : 'Recently';
  const accepted = isAccepted(application);
  const hasDecision = ['waitlisted', 'rejected'].includes(application?.status);
  const steps = buildSteps(application, completedOn);

  return (
    <PortalShell variant="dashboard">
      <h1>My Application</h1>

      <div className="portal-dashboard__card">
        {accepted ? (
          <AcceptedPanel
            confirmation={getConfirmation(application)}
            isWindowOpen={isConfirmationOpen(event)}
            onSetConfirmation={setConfirmation}
          />
        ) : hasDecision ? (
          <DecisionPanel status={application.status} />
        ) : (
          <PortalSummary mascot={DASHBOARD_MASCOTS.grad}>
            <p className="portal-dashboard__headline">Application submitted!</p>
            <p>
              You&apos;re all set! We&apos;ll be in touch with next steps via
              email.
            </p>
          </PortalSummary>
        )}

        <ol className="portal-dashboard__checklist">
          {steps.map((step) => (
            <li key={step.key}>
              <span
                className={
                  step.isComplete
                    ? 'portal-dashboard__check'
                    : 'portal-dashboard__check portal-dashboard__check--pending'
                }
              >
                {step.isComplete && <CheckIcon />}
              </span>
              <span className="portal-dashboard__step">
                {step.label}
                {step.pill && (
                  <span className="portal-dashboard__pill">{step.pill}</span>
                )}
              </span>
              <span className="portal-dashboard__completed">{step.detail}</span>
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
