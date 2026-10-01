import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import Confirmation from './Confirmation';
import { PortalContext } from '../../context/PortalContext';

function renderConfirmation(contextOverrides = {}) {
  const defaultContext = {
    session: { user: { id: 'usr-1', email: 'alex@example.com' } },
    profile: { id: 'usr-1', fullName: 'Alex Chen' },
    application: {
      id: 'app-1',
      program: 'Business',
      yearOfStudy: '4th year',
      status: 'submitted',
      submittedAt: '2026-10-01T15:00:00.000Z',
    },
    state: {
      account: { fullName: 'Alex Chen', email: 'alex@example.com' },
      application: { program: 'Business', yearOfStudy: '4th year' },
      submittedAt: '2026-10-01T15:00:00.000Z',
    },
    ...contextOverrides,
  };

  return render(
    <PortalContext.Provider value={defaultContext}>
      <MemoryRouter initialEntries={['/portal/apply/confirmation']}>
        <Routes>
          <Route path="/portal/apply/confirmation" element={<Confirmation />} />
          <Route
            path="/portal/apply/register"
            element={<div>Register Page</div>}
          />
        </Routes>
      </MemoryRouter>
    </PortalContext.Provider>,
  );
}

describe('Confirmation', () => {
  it('renders confirmation card with summary', () => {
    renderConfirmation();

    expect(screen.getByText("You're in!")).toBeInTheDocument();
    expect(screen.getByText('Alex Chen')).toBeInTheDocument();
    expect(screen.getByText('alex@example.com')).toBeInTheDocument();
    expect(screen.getByText('Business')).toBeInTheDocument();
    expect(screen.getByText('4th year')).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /view my application/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /back to home/i }),
    ).toBeInTheDocument();
  });

  it('redirects to register if application is not submitted', () => {
    renderConfirmation({
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
