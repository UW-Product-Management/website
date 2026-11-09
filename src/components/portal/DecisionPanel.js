import React from 'react';
import PortalSummary from './PortalSummary';
import { PORTAL_MASCOTS } from '../../data/portalContent';

// Wording follows the decision emails so the portal and the inbox agree.
const DECISIONS = {
  waitlisted: {
    pill: 'Decision ready',
    mascot: 'pencil',
    heading: "You're on the waitlist",
    body: [
      'We received more strong applications than we have spots, so you have been placed on our waitlist.',
      "If a spot opens up we'll email you right away. You don't need to do anything in the meantime.",
    ],
  },
  rejected: {
    pill: 'Decision ready',
    mascot: 'blue',
    heading: 'Thank you for applying',
    body: [
      "After careful review we're not able to offer you a spot at ProdCon this time.",
      'We received many more applications than we could accept, and we really appreciate the time you put into yours. We hope to see you at a future UWPM event.',
    ],
  },
};

export default function DecisionPanel({ status }) {
  const decision = DECISIONS[status];
  if (!decision) return null;

  return (
    <div className="portal-accepted portal-accepted--quiet">
      <PortalSummary mascot={PORTAL_MASCOTS[decision.mascot]}>
        <p className="portal-accepted__pill">{decision.pill}</p>
        <p className="portal-dashboard__headline">{decision.heading}</p>
        {decision.body.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </PortalSummary>
    </div>
  );
}
