import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { usePortal } from '../../context/PortalContext';
import {
  DASHBOARD_MASCOTS,
  INSTAGRAM,
  PORTAL_MASCOTS,
  STEP_FIGURES,
} from '../../data/portalContent';
import { EditIcon, InstagramIcon, LogOutIcon, UserIcon } from './PortalIcons';

const APPLICATION_PATHS = ['/portal/apply', '/portal/dashboard'];
const PROFILE_PATH = '/portal/profile';

export default function PortalSidebar({ tip = '', step, showDecor = false }) {
  const figure = STEP_FIGURES[step] || PORTAL_MASCOTS.yellow;
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { logOut } = usePortal();
  const isApplicationActive = APPLICATION_PATHS.some((path) =>
    pathname.startsWith(path),
  );

  const isProfileActive = pathname.startsWith(PROFILE_PATH);

  const handleLogOut = () => {
    logOut();
    navigate('/portal');
  };

  return (
    <div className="portal-sidebar">
      <nav className="dashboard-sidebar" aria-label="Account navigation">
        <Link
          to="/portal/dashboard"
          className={`dashboard-sidebar__link${
            isApplicationActive ? ' dashboard-sidebar__link--active' : ''
          }`}
          aria-current={isApplicationActive ? 'page' : undefined}
        >
          <EditIcon />
          My Application
        </Link>
        <Link
          to={PROFILE_PATH}
          className={`dashboard-sidebar__link${
            isProfileActive ? ' dashboard-sidebar__link--active' : ''
          }`}
          aria-current={isProfileActive ? 'page' : undefined}
        >
          <UserIcon />
          Profile
        </Link>
        <button
          type="button"
          className="dashboard-sidebar__link dashboard-sidebar__logout"
          onClick={handleLogOut}
        >
          <LogOutIcon />
          Log out
        </button>
      </nav>

      {tip && (
        <aside className="portal-sidebar__tip">
          <div className="portal-sidebar__bubble">
            <p>{tip}</p>
            <a href={INSTAGRAM.href} target="_blank" rel="noopener noreferrer">
              <InstagramIcon />
              {INSTAGRAM.handle}
            </a>
          </div>
          <img
            className="portal-sidebar__mascot"
            src={figure.src}
            width={figure.width}
            height={figure.height}
            style={{ '--figure-width': figure.width }}
            alt=""
            decoding="async"
          />
        </aside>
      )}

      {showDecor && (
        <div className="portal-sidebar__decor" aria-hidden="true">
          <img
            className="portal-sidebar__decor-mic"
            src={DASHBOARD_MASCOTS.mic.src}
            width={DASHBOARD_MASCOTS.mic.width}
            height={DASHBOARD_MASCOTS.mic.height}
            alt=""
            decoding="async"
          />
          <img
            className="portal-sidebar__decor-pencil"
            src={DASHBOARD_MASCOTS.pink.src}
            width={DASHBOARD_MASCOTS.pink.width}
            height={DASHBOARD_MASCOTS.pink.height}
            alt=""
            decoding="async"
          />
        </div>
      )}
    </div>
  );
}
