import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import PortalShell from './PortalShell';
import RequireAuth from './RequireAuth';

const STEP_BY_PATH = {
  '/portal/apply/register': 1,
  '/portal/apply/questions': 2,
  '/portal/apply/consent': 3,
  '/portal/apply/submit': 4,
};

const QUESTIONS_PATH = '/portal/apply/questions';

export default function ApplyLayout() {
  const { pathname } = useLocation();

  return (
    <RequireAuth>
      <PortalShell
        step={STEP_BY_PATH[pathname] || 1}
        scrollContained={pathname === QUESTIONS_PATH}
      >
        <div key={pathname} className="portal-apply__step-content">
          <Outlet />
        </div>
      </PortalShell>
    </RequireAuth>
  );
}
