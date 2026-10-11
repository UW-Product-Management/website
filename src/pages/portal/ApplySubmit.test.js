import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ApplySubmit from './ApplySubmit';
import { PortalContext } from '../../context/PortalContext';

function renderApplySubmit(contextOverrides = {}) {
  const defaultContext = {
    session: { user: { id: 'usr-1', email: 'alex@example.com' } },
    profile: { id: 'usr-1', fullName: 'Alex Chen' },
    application: {
      id: 'app-1',
      program: 'Computer Science',
      yearOfStudy: '2nd year',
      productIdea: 'Campus grocery delivery',
      greatTeam: 'Curiosity and trust',
      mediaConsent: true,
      dietaryRestrictions: 'Vegetarian',
      status: 'draft',
      submittedAt: null,
    },
    state: {
      account: { fullName: 'Alex Chen', email: 'alex@example.com' },
      application: {
        program: 'Computer Science',
        yearOfStudy: '2nd year',
        answers: {
          productIdea: 'Campus grocery delivery',
          greatTeam: 'Curiosity and trust',
        },
        consent: {
          mediaConsent: true,
          dietaryRestrictions: 'Vegetarian',
        },
      },
      submittedAt: null,
    },
    submitApplication: jest.fn().mockResolvedValue({ data: {}, error: null }),
    ...contextOverrides,
  };

  return {
    ...render(
      <PortalContext.Provider value={defaultContext}>
        <MemoryRouter initialEntries={['/portal/apply/submit']}>
          <Routes>
            <Route path="/portal/apply/submit" element={<ApplySubmit />} />
            <Route
              path="/portal/apply/consent"
              element={<div>Consent Page</div>}
            />
            <Route
              path="/portal/apply/confirmation"
              element={<div>Confirmation Page</div>}
            />
            <Route
              path="/portal/dashboard"
              element={<div>Dashboard Page</div>}
            />
          </Routes>
        </MemoryRouter>
      </PortalContext.Provider>,
    ),
    context: defaultContext,
  };
}

describe('ApplySubmit', () => {
  it('renders application review data', () => {
    renderApplySubmit();

    expect(screen.getByText('Alex Chen')).toBeInTheDocument();
    expect(screen.getByText('alex@example.com')).toBeInTheDocument();
    expect(screen.getByText('Computer Science')).toBeInTheDocument();
    expect(screen.getByText('2nd year')).toBeInTheDocument();
    expect(screen.getByText('Vegetarian')).toBeInTheDocument();
    expect(screen.getByText('Campus grocery delivery')).toBeInTheDocument();
    expect(screen.getByText('Curiosity and trust')).toBeInTheDocument();
  });

  it('keeps submit button disabled until confirmation checkbox is checked', () => {
    renderApplySubmit();

    const submitBtn = screen.getByRole('button', { name: /submit/i });
    expect(submitBtn).toBeDisabled();

    fireEvent.click(
      screen.getByLabelText(/all information provided is accurate/i),
    );
    expect(submitBtn).toBeEnabled();
  });

  it('submits application and navigates to confirmation on success', async () => {
    const { context } = renderApplySubmit();

    fireEvent.click(
      screen.getByLabelText(/all information provided is accurate/i),
    );
    fireEvent.click(screen.getByRole('button', { name: /submit/i }));

    await waitFor(() => {
      expect(context.submitApplication).toHaveBeenCalledTimes(1);
      expect(screen.getByText('Confirmation Page')).toBeInTheDocument();
    });
  });

  it('displays user-friendly copy when submission is rejected', async () => {
    renderApplySubmit({
      submitApplication: jest.fn().mockResolvedValue({
        data: null,
        error: {
          code: 'application_incomplete',
          message: 'Please complete all required fields before submitting.',
        },
      }),
    });

    fireEvent.click(
      screen.getByLabelText(/all information provided is accurate/i),
    );
    fireEvent.click(screen.getByRole('button', { name: /submit/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Please complete all required fields before submitting.',
    );
    expect(screen.queryByText('Confirmation Page')).not.toBeInTheDocument();
  });

  it('navigates back to consent', () => {
    renderApplySubmit();

    fireEvent.click(screen.getByRole('button', { name: /back/i }));
    expect(screen.getByText('Consent Page')).toBeInTheDocument();
  });

  it('redirects to dashboard when application is already submitted', () => {
    renderApplySubmit({
      application: {
        id: 'app-1',
        status: 'submitted',
        submittedAt: '2026-10-01T10:00:00Z',
      },
    });

    expect(screen.getByText('Dashboard Page')).toBeInTheDocument();
  });
});
