import React from 'react';

export default function PortalSummary({ mascot, children }) {
  return (
    <div className="portal-dashboard__summary">
      <img
        src={mascot.src}
        width={mascot.width}
        height={mascot.height}
        alt=""
        decoding="async"
      />
      <div>{children}</div>
    </div>
  );
}
