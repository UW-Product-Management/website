import React from 'react';
import PortalHeader from './PortalHeader';
import { CONFIRMATION_MASCOTS, PORTAL_MASCOTS } from '../../data/portalContent';
import starBurst from '../../images/deco/stars.svg';
import '../../styles/portal/PortalTheme.css';
import '../../styles/portal/PortalAuth.css';
import '../../styles/portal/PortalConfirmation.css';

export default function ConfirmationLayout({ children }) {
  return (
    <div className="auth-layout portal-confirmation">
      <PortalHeader />
      {['one', 'two', 'three'].map((position) => (
        <img
          key={position}
          className={`portal-confirmation__star portal-confirmation__star--${position}`}
          src={starBurst}
          alt=""
          aria-hidden="true"
        />
      ))}
      <main className="portal-confirmation__main">
        <div className="portal-confirmation__mascots" aria-hidden="true">
          {CONFIRMATION_MASCOTS.map((name) => {
            const { src, width, height } = PORTAL_MASCOTS[name];
            return (
              <img
                key={name}
                src={src}
                width={width}
                height={height}
                alt=""
                decoding="async"
              />
            );
          })}
        </div>
        {children}
      </main>
    </div>
  );
}
