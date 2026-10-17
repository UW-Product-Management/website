import React from 'react';

export default function PortalDetailRows({ rows = [] }) {
  return (
    <dl className="portal-detail-rows">
      {rows.map(({ label, value }) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  );
}
