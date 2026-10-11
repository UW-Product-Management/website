import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import Profile from './Profile';
import { PortalContext } from '../../context/PortalContext';

function renderProfile(contextOverrides = {}) {
  const context = {
    session: { user: { id: 'usr-1', email: 'alex@example.com' } },
    profile: { id: 'usr-1', fullName: 'Alex Chen' },
    application: {
      id: 'app-1',
      status: 'submitted',
      program: 'Computer Science',
      yearOfStudy: '2nd year',
      submittedAt: '2026-10-01T14:30:00.000Z',
    },
    state: {},
    logOut: jest.fn(),
    updateProfile: jest.fn().mockResolvedValue({ data: {}, error: null }),
    ...contextOverrides,
  };

  render(
    <PortalContext.Provider value={context}>
      <MemoryRouter initialEntries={['/portal/profile']}>
        <Routes>
          <Route path="/portal/profile" element={<Profile />} />
        </Routes>
      </MemoryRouter>
    </PortalContext.Provider>,
  );
  return context;
}

describe('Profile', () => {
  it('shows personal information and the submitted status', () => {
    renderProfile();

    expect(screen.getByRole('heading', { name: 'My Profile' })).toBeVisible();
    expect(
      screen.getByText('alex@example.com', { selector: 'dd' }),
    ).toBeVisible();
    expect(screen.getByText('Computer Science')).toBeVisible();
    expect(screen.getByText('2nd year')).toBeVisible();
    expect(screen.getByText('Application submitted!')).toBeVisible();
    expect(
      screen.getByRole('link', { name: /view application details/i }),
    ).toHaveAttribute('href', '/portal/dashboard/details');
  });

  it('saves an edited name', async () => {
    const { updateProfile } = renderProfile();

    userEvent.click(screen.getByRole('button', { name: /edit profile/i }));
    const input = await screen.findByLabelText(/full name/i);
    userEvent.clear(input);
    userEvent.type(input, 'Sam Lee');
    userEvent.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() =>
      expect(updateProfile).toHaveBeenCalledWith({ fullName: 'Sam Lee' }),
    );
    await waitFor(() =>
      expect(
        screen.queryByRole('button', { name: /save/i }),
      ).not.toBeInTheDocument(),
    );
  });
});
