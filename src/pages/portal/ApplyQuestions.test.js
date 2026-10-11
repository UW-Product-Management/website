import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ApplyQuestions from './ApplyQuestions';
import { PortalContext } from '../../context/PortalContext';

function renderApplyQuestions(contextOverrides = {}) {
  const defaultContext = {
    application: {
      id: 'app-1',
      productIdea: '',
      greatTeam: '',
      status: 'draft',
      submittedAt: null,
    },
    state: {
      application: {
        answers: { productIdea: '', greatTeam: '' },
      },
      submittedAt: null,
    },
    saveDraft: jest.fn().mockResolvedValue({ data: {}, error: null }),
    ...contextOverrides,
  };

  return {
    ...render(
      <PortalContext.Provider value={defaultContext}>
        <MemoryRouter initialEntries={['/portal/apply/questions']}>
          <Routes>
            <Route
              path="/portal/apply/questions"
              element={<ApplyQuestions />}
            />
            <Route
              path="/portal/apply/register"
              element={<div>Register Page</div>}
            />
            <Route
              path="/portal/apply/consent"
              element={<div>Consent Page</div>}
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

describe('ApplyQuestions', () => {
  it('displays character counts for both questions', () => {
    renderApplyQuestions({
      application: {
        id: 'app-1',
        productIdea: 'Test Idea',
        greatTeam: 'Test Team',
        status: 'draft',
      },
    });

    expect(screen.getAllByText('9/200')).toHaveLength(2);
  });

  it('saves questions draft and navigates to consent on next', async () => {
    const { context } = renderApplyQuestions();

    const q1 = screen.getByLabelText(/what product or service/i);
    const q2 = screen.getByLabelText(/what makes a great product team/i);
    const q3 = screen.getByLabelText(/one product you.ve worked on/i);

    fireEvent.change(q1, { target: { value: 'Autonomous food delivery' } });
    fireEvent.change(q2, { target: { value: 'Cross-functional trust' } });
    fireEvent.change(q3, {
      target: { value: 'Led onboarding for a campus app' },
    });

    fireEvent.click(screen.getByRole('button', { name: /next/i }));

    await waitFor(() => {
      expect(context.saveDraft).toHaveBeenCalledWith({
        productIdea: 'Autonomous food delivery',
        greatTeam: 'Cross-functional trust',
        productExperience: 'Led onboarding for a campus app',
      });
      expect(screen.getByText('Consent Page')).toBeInTheDocument();
    });
  });

  it('navigates back to register without saving', () => {
    const { context } = renderApplyQuestions();

    fireEvent.click(screen.getByRole('button', { name: /back/i }));

    expect(screen.getByText('Register Page')).toBeInTheDocument();
    expect(context.saveDraft).not.toHaveBeenCalled();
  });

  it('displays inline error when saving questions fails', async () => {
    renderApplyQuestions({
      saveDraft: jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'Failed to save question answers' },
      }),
    });

    const q1 = screen.getByLabelText(/what product or service/i);
    const q2 = screen.getByLabelText(/what makes a great product team/i);

    fireEvent.change(q1, { target: { value: 'Product idea' } });
    fireEvent.change(q2, { target: { value: 'Great team' } });

    fireEvent.click(screen.getByRole('button', { name: /next/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Failed to save question answers',
    );
    expect(screen.queryByText('Consent Page')).not.toBeInTheDocument();
  });

  it('redirects to dashboard when application is already submitted', () => {
    renderApplyQuestions({
      application: {
        id: 'app-1',
        status: 'submitted',
        submittedAt: '2026-10-01T10:00:00Z',
      },
    });

    expect(screen.getByText('Dashboard Page')).toBeInTheDocument();
  });
});
