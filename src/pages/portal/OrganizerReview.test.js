import React from 'react';
import {
  render,
  screen,
  waitFor,
  within,
  fireEvent,
} from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import OrganizerReview from './OrganizerReview';
import { PortalContext } from '../../context/PortalContext';
import {
  listApplicationsForReview,
  reviewApplication,
} from '../../services/portalApi';

jest.mock('../../services/portalApi');

const applications = [
  {
    id: 'app-1',
    fullName: 'Alex Chen',
    email: 'alex@example.com',
    program: 'Business',
    yearOfStudy: '2nd year',
    productIdea: 'Food waste tracker',
    greatTeam: 'Trust',
    status: 'submitted',
  },
  {
    id: 'app-2',
    fullName: 'Blair Ng',
    email: 'blair@example.com',
    program: 'Engineering',
    yearOfStudy: '3rd year',
    productIdea: 'Study planner',
    greatTeam: 'Curiosity',
    status: 'rejected',
  },
];

function renderPage() {
  return render(
    <PortalContext.Provider
      value={{ event: { id: 'evt-1', slug: 'prodcon-local' } }}
    >
      <MemoryRouter>
        <OrganizerReview />
      </MemoryRouter>
    </PortalContext.Provider>,
  );
}

describe('OrganizerReview', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    listApplicationsForReview.mockResolvedValue({
      data: applications,
      error: null,
    });
  });

  it('lists submitted applications for the event', async () => {
    renderPage();

    expect(await screen.findByText('Alex Chen')).toBeInTheDocument();
    expect(screen.getByText('Blair Ng')).toBeInTheDocument();
    expect(listApplicationsForReview).toHaveBeenCalledWith('evt-1');
  });

  it('filters applications by status', async () => {
    renderPage();
    await screen.findByText('Alex Chen');

    fireEvent.change(screen.getByLabelText(/status/i), {
      target: { value: 'rejected' },
    });

    expect(screen.queryByText('Alex Chen')).not.toBeInTheDocument();
    expect(screen.getByText('Blair Ng')).toBeInTheDocument();
  });

  it('records a decision and shows the new status', async () => {
    reviewApplication.mockResolvedValue({
      data: { status: 'accepted', reviewedAt: '2026-10-03T12:00:00Z' },
      error: null,
    });
    renderPage();
    await screen.findByText('Alex Chen');

    fireEvent.click(
      screen.getByRole('button', { name: 'Accepted: Alex Chen' }),
    );

    expect(reviewApplication).toHaveBeenCalledWith('app-1', 'accepted');
    const row = screen.getByRole('row', { name: /alex chen/i });
    expect(
      await within(row).findByText('Accepted', { selector: 'td' }),
    ).toBeVisible();
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Waitlisted: Alex Chen' }),
      ).toBeEnabled(),
    );
  });

  it('shows an error when a decision fails', async () => {
    reviewApplication.mockResolvedValue({
      data: null,
      error: { message: 'Only organizers can review applications.' },
    });
    renderPage();
    await screen.findByText('Alex Chen');

    fireEvent.click(
      screen.getByRole('button', { name: 'Waitlisted: Alex Chen' }),
    );

    expect(await screen.findByRole('alert')).toHaveTextContent(
      /only organizers/i,
    );
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Waitlisted: Alex Chen' }),
      ).toBeEnabled(),
    );
  });
});
