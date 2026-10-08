import React from 'react';
import PortalHeader from './PortalHeader';
import PortalSidebar from './PortalSidebar';
import ApplicationStepper from './ApplicationStepper';
import { PORTAL_MASCOTS, PORTAL_TIPS } from '../../data/portalContent';
import '../../styles/portal/PortalShell.css';

export default function PortalShell({
  variant = 'application',
  step,
  children,
}) {
  const isApplication = variant === 'application';
  const mascot = PORTAL_MASCOTS.pink;

  return (
    <div className={`portal-shell portal-shell--${variant}`}>
      <div className="portal-shell__aside">
        <PortalHeader />
        <PortalSidebar
          tip={isApplication ? PORTAL_TIPS[step] : ''}
          showDecor={!isApplication}
        />
      </div>

      <main className="portal-shell__main">
        {isApplication ? (
          <section className="portal-shell__card portal-apply__content">
            <ApplicationStepper currentStep={step} />
            {children}
          </section>
        ) : (
          <section className="portal-shell__panel portal-dashboard__content">
            <img
              className="portal-shell__badge"
              src={mascot.src}
              width={mascot.width}
              height={mascot.height}
              alt=""
              decoding="async"
            />
            {children}
          </section>
        )}
      </main>
    </div>
  );
}
