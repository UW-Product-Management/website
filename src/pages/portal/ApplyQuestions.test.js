import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ApplyQuestions from './ApplyQuestions';
import { PortalContext } from '../../context/PortalContext';

function renderApplyQuestions(contextOverrides = {}) {
  const defaultContext = {
    application: {
      id: 'app-1',
      favouriteProduct: '',
      status: 'draft',
      submittedAt: null,
    },
    state: {
      application: {
        answers: { favouriteProduct: '' },
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
  it('asks only for a favourite product', () => {
    renderApplyQuestions();

    expect(screen.getAllByRole('textbox')).toHaveLength(1);
    expect(
      screen.getByLabelText(/what is your favourite product/i),
    ).toBeInTheDocument();
  });

  it('limits the answer to 200 characters', () => {
    renderApplyQuestions();

    expect(
      screen.getByLabelText(/what is your favourite product/i),
    ).toHaveAttribute('maxLength', '200');
  });

  it('displays the character count for the saved answer', () => {
    renderApplyQuestions({
      application: {
        id: 'app-1',
        favouriteProduct: 'Notion',
        status: 'draft',
      },
    });

    expect(screen.getByText('6/200 characters')).toBeInTheDocument();
  });

  it('saves questions draft and navigates to consent on next', async () => {
    const { context } = renderApplyQuestions();

    fireEvent.change(screen.getByLabelText(/what is your favourite product/i), {
      target: { value: 'Notion' },
    });

    fireEvent.click(screen.getByRole('button', { name: /next/i }));

    await waitFor(() => {
      expect(context.saveDraft).toHaveBeenCalledWith({
        favouriteProduct: 'Notion',
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

    fireEvent.change(screen.getByLabelText(/what is your favourite product/i), {
      target: { value: 'Notion' },
    });

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
