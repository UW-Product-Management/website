import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import OrganizerMessages from './OrganizerMessages';
import { PortalContext } from '../../context/PortalContext';
import { listEmailAudience } from '../../services/portalApi';

jest.mock('../../services/portalApi');
jest.mock('../../components/portal/EmailSendControls', () => {
  const React = require('react');
  return function MockEmailSendControls({ onBusyChange }) {
    return React.createElement(
      'button',
      { type: 'button', onClick: () => onBusyChange(true) },
      'Start sending',
    );
  };
});

const event = {
  id: 'evt-1',
  name: 'ProdCon 2026',
  confirm_by: '2026-11-20T04:59:00Z',
};

const person = (userId, fullName, group, groups = [group]) => ({
  userId,
  fullName,
  email: `${fullName.toLowerCase()}@example.com`,
  group,
  groups,
});

const audience = [
  person('u1', 'Ada', 'draft'),
  person('u2', 'Bo', 'submitted'),
  person('u3', 'Cy', 'no_application'),
  person('u4', 'Di', 'accepted', ['accepted', 'accepted_unconfirmed']),
];

function renderPage() {
  return render(
    <PortalContext.Provider value={{ event }}>
      <MemoryRouter>
        <OrganizerMessages />
      </MemoryRouter>
    </PortalContext.Provider>,
  );
}

const groupSelect = () =>
  screen.findByRole('combobox', { name: /who should get this email/i });

describe('OrganizerMessages', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    listEmailAudience.mockResolvedValue({ data: audience, error: null });
  });

  it('shows group counts and no recipients until a group is chosen', async () => {
    renderPage();

    expect(
      await screen.findByRole('option', { name: 'Draft, not submitted (1)' }),
    ).toBeInTheDocument();
    expect(await groupSelect()).toHaveValue('');
    expect(
      screen.getByRole('heading', { name: '0 recipients' }),
    ).toBeInTheDocument();
    expect(listEmailAudience).toHaveBeenCalledWith('evt-1', {
      confirmBy: '2026-11-20T04:59:00Z',
    });
  });

  it('previews the people in the chosen group', async () => {
    renderPage();

    userEvent.selectOptions(await groupSelect(), 'draft');

    expect(
      screen.getByRole('heading', { name: '1 recipient' }),
    ).toBeInTheDocument();
    expect(screen.getByText('ada@example.com')).toBeInTheDocument();
    expect(screen.queryByText('bo@example.com')).not.toBeInTheDocument();
    expect(
      screen.getByText(/started an application but did not submit/i),
    ).toBeInTheDocument();
  });

  it('shows the error when recipients cannot be loaded', async () => {
    listEmailAudience.mockResolvedValue({
      data: [],
      error: { message: 'denied' },
    });
    renderPage();

    expect(await screen.findByRole('alert')).toHaveTextContent('denied');
  });

  it('lets the organizer write a subject and message', async () => {
    renderPage();

    userEvent.type(await screen.findByLabelText('Subject'), 'Reminder');
    userEvent.paste(screen.getByLabelText('Message'), 'Hi {{name}}');

    expect(screen.getByLabelText('Subject')).toHaveValue('Reminder');
    expect(screen.getByLabelText('Message')).toHaveValue('Hi {{name}}');
  });

  it('locks the group and message while emails are sending', async () => {
    renderPage();
    userEvent.selectOptions(await groupSelect(), 'draft');

    userEvent.click(screen.getByRole('button', { name: 'Start sending' }));

    expect(await groupSelect()).toBeDisabled();
    expect(screen.getByLabelText('Subject')).toBeDisabled();
    expect(screen.getByLabelText('Message')).toBeDisabled();
  });

  it('fills in a confirmation reminder for accepted applicants who have not confirmed', async () => {
    renderPage();

    userEvent.selectOptions(await groupSelect(), 'accepted_unconfirmed');

    expect(screen.getByText('di@example.com')).toBeInTheDocument();
    expect(screen.getByLabelText('Subject').value).toMatch(
      /confirm your spot/i,
    );
    expect(screen.getByLabelText('Message').value).toContain('{{name}}');
  });

  it('keeps a message the organizer already started', async () => {
    renderPage();
    userEvent.type(await screen.findByLabelText('Subject'), 'My own subject');

    userEvent.selectOptions(await groupSelect(), 'accepted_unconfirmed');

    expect(screen.getByLabelText('Subject')).toHaveValue('My own subject');
    expect(screen.getByLabelText('Message')).toHaveValue('');
  });
});
