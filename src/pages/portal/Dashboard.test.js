import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import Dashboard from './Dashboard';
import { PortalContext } from '../../context/PortalContext';

function renderDashboard(contextOverrides = {}) {
  const defaultContext = {
    session: { user: { id: 'usr-1', email: 'alex@example.com' } },
    profile: { id: 'usr-1', fullName: 'Alex Chen' },
    application: {
      id: 'app-1',
      status: 'submitted',
      submittedAt: '2026-10-01T14:30:00.000Z',
    },
    state: {
      submittedAt: '2026-10-01T14:30:00.000Z',
    },
    logOut: jest.fn(),
    ...contextOverrides,
  };

  return render(
    <PortalContext.Provider value={defaultContext}>
      <MemoryRouter initialEntries={['/portal/dashboard']}>
        <Routes>
          <Route path="/portal/dashboard" element={<Dashboard />} />
          <Route
            path="/portal/apply/register"
            element={<div>Register Page</div>}
          />
        </Routes>
      </MemoryRouter>
    </PortalContext.Provider>,
  );
}

describe('Dashboard', () => {
  it('renders submitted checklist and details link', () => {
    renderDashboard();

    expect(
      screen.getByRole('heading', { name: /my application/i }),
    ).toBeInTheDocument();
    expect(screen.getByText('Application submitted!')).toBeInTheDocument();
    expect(screen.getByText('Register')).toBeInTheDocument();
    expect(screen.getByText('Complete questions')).toBeInTheDocument();
    expect(screen.getByText('Consent and logistics')).toBeInTheDocument();
    expect(screen.getByText('Submit')).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /view application details/i }),
    ).toBeInTheDocument();
  });

  it('redirects to register if application is not submitted', () => {
    renderDashboard({
      application: {
        id: 'app-1',
        status: 'draft',
        submittedAt: null,
      },
      state: {
        submittedAt: null,
      },
    });

    expect(screen.getByText('Register Page')).toBeInTheDocument();
  });

  it('shows the organizer decision once one is recorded', () => {
    renderDashboard({
      application: {
        id: 'app-1',
        status: 'accepted',
        submittedAt: '2026-10-01T14:30:00.000Z',
      },
    });

    expect(screen.getByText('Status: Accepted')).toBeInTheDocument();
  });
});
