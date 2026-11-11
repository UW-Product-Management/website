import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import OrganizerMessages from './OrganizerMessages';
import { PortalContext } from '../../context/PortalContext';
import { listEmailAudience } from '../../services/portalApi';

jest.mock('../../services/portalApi');
jest.mock('../../components/portal/EmailSendControls', () => () => null);

const audience = [
  { userId: 'u1', fullName: 'Ada', email: 'ada@example.com', group: 'draft' },
  {
    userId: 'u2',
    fullName: 'Bo',
    email: 'bo@example.com',
    group: 'submitted',
  },
  {
    userId: 'u3',
    fullName: 'Cy',
    email: 'cy@example.com',
    group: 'no_application',
  },
];

function renderPage() {
  return render(
    <PortalContext.Provider value={{ event: { id: 'evt-1' } }}>
      <MemoryRouter>
        <OrganizerMessages />
      </MemoryRouter>
    </PortalContext.Provider>,
  );
}

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
    expect(
      screen.getByRole('combobox', { name: /who should get this email/i }),
    ).toHaveValue('');
    expect(
      screen.getByRole('heading', { name: '0 recipients' }),
    ).toBeInTheDocument();
    expect(listEmailAudience).toHaveBeenCalledWith('evt-1');
  });

  it('previews the people in the chosen group', async () => {
    renderPage();

    fireEvent.change(
      await screen.findByRole('combobox', {
        name: /who should get this email/i,
      }),
      { target: { value: 'draft' } },
    );

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

    fireEvent.change(await screen.findByLabelText('Subject'), {
      target: { value: 'Reminder' },
    });
    fireEvent.change(screen.getByLabelText('Message'), {
      target: { value: 'Hi {{name}}' },
    });

    expect(screen.getByLabelText('Subject')).toHaveValue('Reminder');
    expect(screen.getByLabelText('Message')).toHaveValue('Hi {{name}}');
  });
});
