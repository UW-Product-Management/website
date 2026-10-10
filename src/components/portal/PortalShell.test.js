import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { PortalContext } from '../../context/PortalContext';
import PortalShell from './PortalShell';

const openEvent = {
  applications_open_at: '2020-01-01T00:00:00Z',
  applications_close_at: '2099-11-03T04:59:00Z',
};

function renderShell(event, step = 2) {
  return render(
    <MemoryRouter>
      <PortalContext.Provider
        value={{ event, logOut: jest.fn(), session: null }}
      >
        <PortalShell step={step}>
          <h1>Step content</h1>
        </PortalShell>
      </PortalContext.Provider>
    </MemoryRouter>,
  );
}

describe('PortalShell', () => {
  it('shows the deadline from the event window in the sidebar tip', () => {
    renderShell(openEvent);
    expect(
      screen.getByText(/application deadline is November 2nd @ 11:59PM/i),
    ).toBeInTheDocument();
  });

  it('warns when applications have closed', () => {
    renderShell({
      applications_open_at: '2020-01-01T00:00:00Z',
      applications_close_at: '2020-02-01T00:00:00Z',
    });
    expect(screen.getByRole('status')).toHaveTextContent(
      /applications closed on/i,
    );
  });

  it('warns when applications have not opened yet', () => {
    renderShell({
      applications_open_at: '2099-01-01T00:00:00Z',
      applications_close_at: '2099-02-01T00:00:00Z',
    });
    expect(screen.getByRole('status')).toHaveTextContent(
      /applications open on/i,
    );
  });

  it('shows no window warning while applications are open', () => {
    renderShell(openEvent);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('falls back to a generic deadline tip before the event loads', () => {
    renderShell(null);
    expect(
      screen.getByText(/keep an eye on the prodcon application deadline/i),
    ).toBeInTheDocument();
  });
});
