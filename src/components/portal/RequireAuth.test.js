import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import RequireAuth from './RequireAuth';
import { PortalContext } from '../../context/PortalContext';

function TestProtectedChild() {
  return <h1>Protected Child Content</h1>;
}

function MockLoginPage() {
  const location = useLocation();
  return (
    <div>
      <h1>Login Page</h1>
      <span data-testid="target-pathname">
        {location.state?.from?.pathname}
      </span>
      <span data-testid="target-search">{location.state?.from?.search}</span>
    </div>
  );
}

function renderWithContext(
  contextValue,
  initialEntry = '/portal/apply/register',
) {
  return render(
    <PortalContext.Provider value={contextValue}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route
            path="/portal/apply/register"
            element={
              <RequireAuth>
                <TestProtectedChild />
              </RequireAuth>
            }
          />
          <Route
            path="/portal/dashboard"
            element={
              <RequireAuth>
                <TestProtectedChild />
              </RequireAuth>
            }
          />
          <Route path="/portal/login" element={<MockLoginPage />} />
        </Routes>
      </MemoryRouter>
    </PortalContext.Provider>,
  );
}

describe('RequireAuth route guard', () => {
  it('renders loading spinner and does not render children while status is loading', () => {
    renderWithContext({
      session: null,
      user: null,
      status: 'loading',
    });

    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: /protected child content/i }),
    ).not.toBeInTheDocument();
  });

  it('redirects unauthenticated users to login and preserves the intended target path in location.state.from', () => {
    renderWithContext(
      {
        session: null,
        user: null,
        status: 'ready',
      },
      '/portal/apply/register?step=1',
    );

    expect(
      screen.getByRole('heading', { name: /login page/i }),
    ).toBeInTheDocument();
    expect(screen.getByTestId('target-pathname')).toHaveTextContent(
      '/portal/apply/register',
    );
    expect(screen.getByTestId('target-search')).toHaveTextContent('?step=1');
    expect(
      screen.queryByRole('heading', { name: /protected child content/i }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('renders children when user has an active session and status is ready', () => {
    renderWithContext({
      session: { user: { id: 'usr-123', email: 'test@example.com' } },
      user: { id: 'usr-123', email: 'test@example.com' },
      status: 'ready',
    });

    expect(
      screen.getByRole('heading', { name: /protected child content/i }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: /login page/i }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});
