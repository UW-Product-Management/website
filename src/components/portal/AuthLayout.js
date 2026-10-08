import React from 'react';
import PortalHeader from './PortalHeader';
import HexagonDecor from './HexagonDecor';
import '../../styles/portal/PortalTheme.css';
import '../../styles/portal/PortalAuth.css';

export default function AuthLayout({
  children,
  headerSlot,
  showMascot = true,
}) {
  return (
    <div className="auth-layout">
      <HexagonDecor showMascot={showMascot} />
      <PortalHeader rightSlot={headerSlot} />
      <main className="auth-layout__main portal-auth">
        <section className="portal-auth__card">{children}</section>
      </main>
    </div>
  );
}
