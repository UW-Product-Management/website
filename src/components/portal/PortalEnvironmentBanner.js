import React, { useState } from 'react';
import { portalEnvironment } from '../../portal/portalEnvironment.mjs';
import '../../styles/portal/PortalEnvironment.css';

const COPY = {
  local: {
    label: 'Local',
    message:
      'Connected to the Docker Supabase stack. Emails are captured in Mailpit and nothing reaches production or real inboxes.',
  },
  staging: {
    label: 'Staging',
    message:
      'Test data only. This is not the live application portal and applicants should not use it.',
  },
};

export default function PortalEnvironmentBanner({
  environment = portalEnvironment,
}) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const copy = COPY[environment.name];

  if (environment.isProduction || !copy) return null;

  const modifier = `portal-env-banner--${environment.name}`;

  if (isCollapsed) {
    return (
      <button
        type="button"
        className={`portal-env-banner portal-env-banner--pill ${modifier}`}
        aria-label={`${copy.label} environment. Show details`}
        onClick={() => setIsCollapsed(false)}
      >
        {copy.label}
      </button>
    );
  }

  return (
    <aside
      className={`portal-env-banner ${modifier}`}
      role="status"
      aria-label="Environment notice"
    >
      <p className="portal-env-banner__message">
        <strong>{copy.label} environment.</strong> {copy.message}
      </p>
      {environment.isLocal && (
        <p className="portal-env-banner__links">
          <a href={environment.mailpitUrl} target="_blank" rel="noreferrer">
            Open Mailpit
          </a>
          <a href={environment.studioUrl} target="_blank" rel="noreferrer">
            Open Studio
          </a>
        </p>
      )}
      <button
        type="button"
        className="portal-env-banner__dismiss"
        aria-label="Collapse environment notice"
        onClick={() => setIsCollapsed(true)}
      >
        ×
      </button>
    </aside>
  );
}
