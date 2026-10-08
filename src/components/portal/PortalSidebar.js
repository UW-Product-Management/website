import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { usePortal } from '../../context/PortalContext';
import { INSTAGRAM, PORTAL_MASCOTS } from '../../data/portalContent';
import { EditIcon, InstagramIcon, LogOutIcon, UserIcon } from './PortalIcons';

const APPLICATION_PATHS = ['/portal/apply', '/portal/dashboard'];

export default function PortalSidebar({ tip = '', showDecor = false }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { logOut } = usePortal();
  const isApplicationActive = APPLICATION_PATHS.some((path) =>
    pathname.startsWith(path),
  );

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
        <span className="dashboard-sidebar__link dashboard-sidebar__link--disabled">
          <UserIcon />
          Profile
        </span>
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
            src={PORTAL_MASCOTS.yellow.src}
            width={PORTAL_MASCOTS.yellow.width}
            height={PORTAL_MASCOTS.yellow.height}
            alt=""
            decoding="async"
          />
        </aside>
      )}

      {showDecor && (
        <div className="portal-sidebar__decor" aria-hidden="true">
          <img
            className="portal-sidebar__decor-mic"
            src={PORTAL_MASCOTS.mic.src}
            width={PORTAL_MASCOTS.mic.width}
            height={PORTAL_MASCOTS.mic.height}
            alt=""
            decoding="async"
          />
          <img
            className="portal-sidebar__decor-pencil"
            src={PORTAL_MASCOTS.pencil.src}
            width={PORTAL_MASCOTS.pencil.width}
            height={PORTAL_MASCOTS.pencil.height}
            alt=""
            decoding="async"
          />
        </div>
      )}
    </div>
  );
}
