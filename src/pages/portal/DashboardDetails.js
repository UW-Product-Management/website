import React from 'react';
import { Navigate } from 'react-router-dom';
import PortalHeader from '../../components/portal/PortalHeader';
import DashboardSidebar from '../../components/portal/DashboardSidebar';
import { usePortal } from '../../context/PortalContext';
import { hasSubmitted } from '../../portal/applicationStatus';
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
  const dietaryRestrictions =
    application?.dietaryRestrictions ||
    application?.dietaryRestriction ||
    application?.consent?.dietaryRestrictions ||
    state?.application?.consent?.dietaryRestrictions ||
    'None';

  const formattedDate = submittedAt
    ? new Date(submittedAt).toLocaleString()
    : 'Recently';

  return (
    <main className="portal-page portal-dashboard">
      <PortalHeader />
      <div className="portal-dashboard__body">
        <DashboardSidebar />
        <section className="portal-dashboard__content">
          <h1>Application Details</h1>
          <p>Submitted on {formattedDate}</p>

          <dl className="portal-apply__review">
            <div>
              <dt>Full name</dt>
              <dd>{fullName || '—'}</dd>
            </div>
            <div>
              <dt>Email address</dt>
              <dd>{email || '—'}</dd>
            </div>
            <div>
              <dt>Program</dt>
              <dd>{program || '—'}</dd>
            </div>
            <div>
              <dt>Year of study</dt>
              <dd>{yearOfStudy || '—'}</dd>
            </div>
          </dl>

          <h2>Questions</h2>
          <dl className="portal-apply__review">
            <div>
              <dt>1. What product or service do you wish existed, and why?</dt>
              <dd>{productIdea || '—'}</dd>
            </div>
            <div>
              <dt>2. What makes a great product team?</dt>
              <dd>{greatTeam || '—'}</dd>
            </div>
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
            className="portal-button portal-button--outline"
            onClick={() => window.print()}
          >
            Download confirmation (PDF)
          </button>
        </section>
      </div>
    </main>
  );
}
