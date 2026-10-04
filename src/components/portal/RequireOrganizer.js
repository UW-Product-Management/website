import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { getIsOrganizer } from '../../services/portalApi';
import '../../styles/portal/Portal.css';

export default function RequireOrganizer({ children }) {
  const [isOrganizer, setIsOrganizer] = useState(null);

  useEffect(() => {
    let mounted = true;
    getIsOrganizer().then(({ data }) => {
      if (mounted) setIsOrganizer(data);
    });
    return () => {
      mounted = false;
    };
  }, []);

  if (isOrganizer === null) {
    return (
      <div className="portal-loading" role="status" aria-live="polite">
        <div className="portal-spinner" aria-hidden="true" />
        <span>Loading...</span>
      </div>
    );
  }

  if (!isOrganizer) {
    return <Navigate to="/portal/dashboard" replace />;
  }

  return children;
}
