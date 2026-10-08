import React from 'react';
import PortalHeader from './PortalHeader';
import PortalSidebar from './PortalSidebar';
import ApplicationStepper from './ApplicationStepper';
import { usePortal } from '../../context/PortalContext';
import { getWindowNotice } from '../../portal/applicationWindow';
import { PORTAL_MASCOTS, getPortalTip } from '../../data/portalContent';
import '../../styles/portal/PortalShell.css';

export default function PortalShell({
  variant = 'application',
  step,
  children,
}) {
  const { event } = usePortal();
  const isApplication = variant === 'application';
  const windowNotice = isApplication ? getWindowNotice(event) : '';
  const mascot = PORTAL_MASCOTS.pink;

  return (
    <div className={`portal-shell portal-shell--${variant}`}>
      <div className="portal-shell__aside">
        <PortalHeader />
        <PortalSidebar
          tip={isApplication ? getPortalTip(step, event) : ''}
          showDecor={!isApplication}
        />
      </div>

      <main className="portal-shell__main">
        {isApplication ? (
          <section className="portal-shell__card portal-apply__content">
            <ApplicationStepper currentStep={step} />
            {windowNotice && (
              <p className="portal-apply__notice" role="status">
                {windowNotice}
              </p>
            )}
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
