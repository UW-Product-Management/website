import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import OrganizerReview from './OrganizerReview';
import { PortalContext } from '../../context/PortalContext';
import {
  listApplicationsForReview,
  listReviewHistory,
  reviewApplication,
} from '../../services/portalApi';

jest.mock('../../services/portalApi');
jest.mock('../../components/portal/ReleaseResultsPanel', () => () => null);
jest.mock('../../components/portal/ManageAdminsPanel', () => () => null);

const applications = [
  {
    id: 'app-1',
    fullName: 'Alex Chen',
    email: 'alex@example.com',
    program: 'Business',
    yearOfStudy: '2nd year',
    productIdea: 'Food waste tracker',
    greatTeam: 'Trust',
    productExperience: 'Ran a club',
    status: 'submitted',
    reviews: [],
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
    reviews: [
      {
        id: 'log-1',
        applicationId: 'app-2',
        reviewerName: 'Olive Organizer',
        reviewerEmail: 'olive@example.com',
        previousStatus: 'submitted',
        newStatus: 'rejected',
        note: 'Outside the program scope',
        createdAt: '2026-10-14T12:00:00Z',
      },
    ],
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

async function openReview(name) {
  await screen.findByText(name);
  fireEvent.click(screen.getByRole('button', { name: `Review ${name}` }));
}

describe('OrganizerReview', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    listApplicationsForReview.mockResolvedValue({
      data: applications,
      error: null,
    });
    listReviewHistory.mockResolvedValue({ data: [], error: null });
  });

  it('lists submitted applications for the event', async () => {
    renderPage();

    expect(await screen.findByText('Alex Chen')).toBeInTheDocument();
    expect(screen.getByText('Blair Ng')).toBeInTheDocument();
    expect(listApplicationsForReview).toHaveBeenCalledWith('evt-1');
  });

  it('shows who last reviewed an application in the table', async () => {
    renderPage();

    expect(await screen.findByText('Olive Organizer')).toBeInTheDocument();
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

  it('shows full answers and decision history in the detail panel', async () => {
    renderPage();
    await openReview('Blair Ng');

    const panel = screen.getByRole('complementary', {
      name: 'Review Blair Ng',
    });
    expect(panel).toHaveTextContent('Study planner');
    expect(panel).toHaveTextContent('Outside the program scope');
    expect(panel).toHaveTextContent('Olive Organizer');
  });

  it('records an acceptance with an internal note and refreshes history', async () => {
    reviewApplication.mockResolvedValue({
      data: {
        status: 'accepted',
        reviewedAt: '2026-10-14T13:00:00Z',
        reviewedBy: 'org-1',
      },
      error: null,
    });
    listReviewHistory.mockResolvedValue({
      data: [
        {
          id: 'log-2',
          applicationId: 'app-1',
          reviewerName: 'Pat Admin',
          previousStatus: 'submitted',
          newStatus: 'accepted',
          note: 'Strong pitch',
          createdAt: '2026-10-14T13:00:00Z',
        },
      ],
      error: null,
    });
    renderPage();
    await openReview('Alex Chen');

    fireEvent.change(screen.getByLabelText(/internal note/i), {
      target: { value: 'Strong pitch' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Accept' }));

    expect(reviewApplication).toHaveBeenCalledWith(
      'app-1',
      'accepted',
      'Strong pitch',
    );
    const panel = await screen.findByRole('complementary');
    await waitFor(() => expect(panel).toHaveTextContent('Pat Admin'));
    expect(panel).toHaveTextContent('Strong pitch');
    expect(screen.getByRole('button', { name: 'Accept' })).toBeDisabled();
    expect(screen.getByLabelText(/internal note/i)).toHaveValue('');
  });

  it('asks for confirmation before declining', async () => {
    reviewApplication.mockResolvedValue({
      data: { status: 'rejected', reviewedAt: '2026-10-14T13:00:00Z' },
      error: null,
    });
    renderPage();
    await openReview('Alex Chen');

    fireEvent.click(screen.getByRole('button', { name: 'Decline' }));

    expect(reviewApplication).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent(
      /applicant is only told/i,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Confirm decline' }));

    await waitFor(() =>
      expect(reviewApplication).toHaveBeenCalledWith('app-1', 'rejected', ''),
    );
  });

  it('can cancel a pending decline', async () => {
    renderPage();
    await openReview('Alex Chen');

    fireEvent.click(screen.getByRole('button', { name: 'Decline' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(reviewApplication).not.toHaveBeenCalled();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows an error and keeps the note when a decision fails', async () => {
    reviewApplication.mockResolvedValue({
      data: null,
      error: { message: 'Only organizers can review applications.' },
    });
    renderPage();
    await openReview('Alex Chen');

    fireEvent.change(screen.getByLabelText(/internal note/i), {
      target: { value: 'Keep me' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Waitlist' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      /only organizers/i,
    );
    expect(screen.getByLabelText(/internal note/i)).toHaveValue('Keep me');
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Waitlist' })).toBeEnabled(),
    );
  });

  it('closes the detail panel', async () => {
    renderPage();
    await openReview('Alex Chen');

    fireEvent.click(screen.getByRole('button', { name: 'Close' }));

    expect(screen.queryByRole('complementary')).not.toBeInTheDocument();
  });
});
