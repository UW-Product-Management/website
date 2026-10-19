import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import ManageAdminsPanel from './ManageAdminsPanel';
import { PortalContext } from '../../context/PortalContext';
import {
  addOrganizer,
  listOrganizers,
  removeOrganizer,
} from '../../services/portalApi';

jest.mock('../../services/portalApi');

const admins = [
  {
    userId: 'me',
    email: 'me@example.com',
    fullName: 'Olive Organizer',
    createdAt: '2026-10-01T00:00:00Z',
  },
  {
    userId: 'other',
    email: 'sam@example.com',
    fullName: 'Sam Lee',
    createdAt: '2026-10-02T00:00:00Z',
  },
];

const renderPanel = () =>
  render(
    <PortalContext.Provider value={{ user: { id: 'me' } }}>
      <ManageAdminsPanel />
    </PortalContext.Provider>,
  );

describe('ManageAdminsPanel', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    listOrganizers.mockResolvedValue({ data: admins, error: null });
  });

  it('lists admins without a remove button for the current user', async () => {
    renderPanel();

    expect(await screen.findByText('sam@example.com')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Remove sam@example.com' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Remove me@example.com' }),
    ).not.toBeInTheDocument();
  });

  it('adds an admin by email and refreshes the list', async () => {
    addOrganizer.mockResolvedValue({ error: null });
    renderPanel();
    await screen.findByText('sam@example.com');

    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'new@example.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Add admin' }));

    expect(await screen.findByRole('status')).toHaveTextContent(
      'new@example.com is now an admin.',
    );
    expect(addOrganizer).toHaveBeenCalledWith('new@example.com');
    expect(listOrganizers).toHaveBeenCalledTimes(2);
    expect(screen.getByLabelText('Email')).toHaveValue('');
  });

  it('shows the error when the email has no account', async () => {
    addOrganizer.mockResolvedValue({
      error: { message: 'No account uses that email.' },
    });
    renderPanel();
    await screen.findByText('sam@example.com');

    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'ghost@example.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Add admin' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No account uses that email.',
    );
  });

  it('removes another admin', async () => {
    removeOrganizer.mockResolvedValue({ error: null });
    renderPanel();

    fireEvent.click(
      await screen.findByRole('button', { name: 'Remove sam@example.com' }),
    );

    expect(await screen.findByRole('status')).toHaveTextContent(
      'sam@example.com is no longer an admin.',
    );
    expect(removeOrganizer).toHaveBeenCalledWith('other');
  });
});
