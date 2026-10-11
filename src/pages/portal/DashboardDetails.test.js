import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import DashboardDetails from './DashboardDetails';
import { PortalContext } from '../../context/PortalContext';

function renderDashboardDetails(contextOverrides = {}) {
  const defaultContext = {
    session: { user: { id: 'usr-1', email: 'alex@example.com' } },
    profile: { id: 'usr-1', fullName: 'Alex Chen' },
    application: {
      id: 'app-1',
      program: 'Engineering',
      yearOfStudy: '3rd year',
      productIdea: 'Smart Campus Map',
      greatTeam: 'Deep trust and rapid feedback',
      mediaConsent: true,
      dietaryRestrictions: 'Gluten-free',
      status: 'submitted',
      submittedAt: '2026-10-01T14:30:00.000Z',
    },
    state: {
      account: { fullName: 'Alex Chen', email: 'alex@example.com' },
      application: {
        program: 'Engineering',
        yearOfStudy: '3rd year',
        answers: {
          productIdea: 'Smart Campus Map',
          greatTeam: 'Deep trust and rapid feedback',
        },
        consent: {
          mediaConsent: true,
          dietaryRestrictions: 'Gluten-free',
        },
      },
      submittedAt: '2026-10-01T14:30:00.000Z',
    },
    ...contextOverrides,
  };

  return render(
    <PortalContext.Provider value={defaultContext}>
      <MemoryRouter initialEntries={['/portal/dashboard/details']}>
        <Routes>
          <Route
            path="/portal/dashboard/details"
            element={<DashboardDetails />}
          />
          <Route
            path="/portal/apply/register"
            element={<div>Register Page</div>}
          />
        </Routes>
      </MemoryRouter>
    </PortalContext.Provider>,
  );
}

describe('DashboardDetails', () => {
  it('renders application details for submitted user', () => {
    renderDashboardDetails();

    expect(screen.getByText('Application Details')).toBeInTheDocument();
    expect(screen.getByText('Alex Chen')).toBeInTheDocument();
    expect(screen.getByText('alex@example.com')).toBeInTheDocument();
    expect(screen.getByText('Engineering')).toBeInTheDocument();
    expect(screen.getByText('3rd year')).toBeInTheDocument();
    expect(screen.getByText('Smart Campus Map')).toBeInTheDocument();
    expect(
      screen.getByText('Deep trust and rapid feedback'),
    ).toBeInTheDocument();
    expect(screen.getByText('Gluten-free')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /download confirmation/i }),
    ).toBeInTheDocument();
  });

  it('redirects to register if application is not submitted', () => {
    renderDashboardDetails({
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
});
