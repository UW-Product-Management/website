import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { usePortal } from '../../context/PortalContext';
import '../../styles/portal/Portal.css';

export default function RequireAuth({ children }) {
  const { session, status } = usePortal();
  const location = useLocation();

  if (status === 'loading') {
    return (
      <div className="portal-loading" role="status" aria-live="polite">
        <div className="portal-spinner" aria-hidden="true" />
        <span>Loading...</span>
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/portal/login" state={{ from: location }} replace />;
  }

  return children;
}
