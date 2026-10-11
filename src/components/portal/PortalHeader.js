import React from 'react';
import Header from '../Header';

export default function PortalHeader({ rightSlot }) {
  return (
    <Header hideNav className="portal-header" ariaLabel="UW PM ProdCon portal">
      {rightSlot}
    </Header>
  );
}
