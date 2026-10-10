import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import RequireOrganizer from './RequireOrganizer';
import { getIsOrganizer } from '../../services/portalApi';

jest.mock('../../services/portalApi');

function renderGuard() {
  return render(
    <MemoryRouter initialEntries={['/portal/admin']}>
      <Routes>
        <Route
          path="/portal/admin"
          element={
            <RequireOrganizer>
              <h1>Organizer Tools</h1>
            </RequireOrganizer>
          }
        />
        <Route path="/portal/dashboard" element={<h1>Dashboard Page</h1>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('RequireOrganizer', () => {
  it('shows a loading status while the role is being checked', () => {
    getIsOrganizer.mockReturnValue(new Promise(() => {}));
    renderGuard();

    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.queryByText('Organizer Tools')).not.toBeInTheDocument();
  });

  it('renders children for organizers', async () => {
    getIsOrganizer.mockResolvedValue({ data: true, error: null });
    renderGuard();

    expect(
      await screen.findByRole('heading', { name: 'Organizer Tools' }),
    ).toBeInTheDocument();
  });

  it('redirects applicants to their dashboard', async () => {
    getIsOrganizer.mockResolvedValue({ data: false, error: null });
    renderGuard();

    expect(
      await screen.findByRole('heading', { name: 'Dashboard Page' }),
    ).toBeInTheDocument();
  });
});
