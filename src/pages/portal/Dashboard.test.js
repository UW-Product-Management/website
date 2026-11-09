import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import Dashboard from './Dashboard';
import { PortalContext } from '../../context/PortalContext';

const OPEN_EVENT = { id: 'evt-1', confirm_by: '2099-01-01T00:00:00.000Z' };
const CLOSED_EVENT = { id: 'evt-1', confirm_by: '2020-01-01T00:00:00.000Z' };

function renderDashboard(contextOverrides = {}) {
  const defaultContext = {
    session: { user: { id: 'usr-1', email: 'alex@example.com' } },
    profile: { id: 'usr-1', fullName: 'Alex Chen' },
    application: {
      id: 'app-1',
      status: 'submitted',
      submittedAt: '2026-10-01T14:30:00.000Z',
    },
    event: OPEN_EVENT,
    state: {
      submittedAt: '2026-10-01T14:30:00.000Z',
    },
    setConfirmation: jest.fn(),
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

const acceptedApplication = (overrides = {}) => ({
  id: 'app-1',
  status: 'accepted',
  submittedAt: '2026-10-01T14:30:00.000Z',
  reviewedAt: '2026-11-05T18:00:00.000Z',
  confirmation: 'pending',
  ...overrides,
});

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

  it('shows a non-accepted decision as a status line', () => {
    renderDashboard({
      application: {
        id: 'app-1',
        status: 'waitlisted',
        submittedAt: '2026-10-01T14:30:00.000Z',
      },
    });

    expect(screen.getByText('Status: Waitlisted')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /confirm acceptance/i }),
    ).not.toBeInTheDocument();
  });

  it('invites an accepted applicant to confirm their spot', () => {
    renderDashboard({ application: acceptedApplication() });

    expect(
      screen.getByText(/congratulations — you've been accepted/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /confirm acceptance/i }),
    ).toBeEnabled();
    expect(
      screen.getByText(/waiting on you — confirm by/i),
    ).toBeInTheDocument();
  });

  it('adds a decision step to the timeline once accepted', () => {
    renderDashboard({ application: acceptedApplication() });

    expect(screen.getByText('Decision')).toBeInTheDocument();
    expect(screen.getByText(/accepted on/i)).toBeInTheDocument();
  });

  it('offers withdrawal once the spot is confirmed', () => {
    renderDashboard({
      application: acceptedApplication({
        confirmation: 'confirmed',
        confirmationUpdatedAt: '2026-11-06T18:00:00.000Z',
      }),
    });

    expect(screen.getByText(/you're officially in/i)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /withdraw from event/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/confirmed on/i)).toBeInTheDocument();
  });

  it('returns a withdrawn applicant to the acceptance invitation', () => {
    renderDashboard({
      application: acceptedApplication({
        confirmation: 'withdrawn',
        confirmationUpdatedAt: '2026-11-06T18:00:00.000Z',
      }),
    });

    expect(
      screen.getByText(/congratulations — you've been accepted/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /confirm acceptance/i }),
    ).toBeEnabled();
    expect(
      screen.getByText(/waiting on you — confirm by/i),
    ).toBeInTheDocument();
    expect(screen.queryByText(/withdrawn/i)).not.toBeInTheDocument();
  });

  it('disables confirmation once the deadline has passed', () => {
    renderDashboard({
      application: acceptedApplication(),
      event: CLOSED_EVENT,
    });

    expect(
      screen.getByRole('button', { name: /confirm acceptance/i }),
    ).toBeDisabled();
    expect(screen.getByText(/the deadline to confirm/i)).toBeInTheDocument();
  });
});
