import React from 'react';
import { Link } from 'react-router-dom';
import PortalHeader from '../../components/portal/PortalHeader';
import HexagonDecor from '../../components/portal/HexagonDecor';
import { ArrowIcon } from '../../components/portal/PortalIcons';
import { LANDING_MASCOTS, PORTAL_MASCOTS } from '../../data/portalContent';
import landingIllustration from '../../images/prodcon/portal-landing.webp';
import '../../styles/portal/Portal.css';
import '../../styles/portal/PortalTheme.css';
import '../../styles/portal/PortalAuth.css';
import '../../styles/portal/PortalLanding.css';

export default function PortalLanding() {
  return (
    <div className="auth-layout portal-landing">
      <HexagonDecor showMascot={false} />
      <PortalHeader
        rightSlot={
          <>
            <span>Already have an account?</span>
            <Link to="/portal/login" className="portal-landing__login">
              Log in
            </Link>
          </>
        }
      />
      <main className="portal-landing__main">
        <section className="portal-landing__hero">
          <h1 className="portal-landing__title">
            <span className="portal-landing__glow" aria-hidden="true" />
            ProdCon
          </h1>
          <p className="portal-landing__description">
            UWPM&apos;s annual product case competition for curious minds &amp;
            problem solvers.
          </p>
          <Link
            to="/portal/signup"
            className="portal-button portal-button--primary portal-landing__cta"
          >
            Get Started
            <ArrowIcon />
          </Link>
        </section>
        <img
          className="portal-landing__illustration"
          src={landingIllustration}
          width={500}
          height={510}
          alt=""
          decoding="async"
        />
      </main>
      <div className="portal-landing__mascots" aria-hidden="true">
        {LANDING_MASCOTS.map((name) => {
          const { src, width, height } = PORTAL_MASCOTS[name];
          return (
            <img
              key={name}
              className={`portal-landing__mascot portal-landing__mascot--${name}`}
              src={src}
              width={width}
              height={height}
              alt=""
              decoding="async"
            />
          );
        })}
      </div>
    </div>
  );
}
