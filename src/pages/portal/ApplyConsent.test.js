import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ApplyConsent from './ApplyConsent';
import { PortalContext } from '../../context/PortalContext';

function renderApplyConsent(contextOverrides = {}) {
  const defaultContext = {
    application: {
      id: 'app-1',
      mediaConsent: false,
      dietaryRestrictions: '',
      specify: '',
      status: 'draft',
      submittedAt: null,
    },
    state: {
      application: {
        consent: { mediaConsent: false, dietaryRestrictions: '', specify: '' },
      },
      submittedAt: null,
    },
    saveDraft: jest.fn().mockResolvedValue({ data: {}, error: null }),
    ...contextOverrides,
  };

  return {
    ...render(
      <PortalContext.Provider value={defaultContext}>
        <MemoryRouter initialEntries={['/portal/apply/consent']}>
          <Routes>
            <Route path="/portal/apply/consent" element={<ApplyConsent />} />
            <Route
              path="/portal/apply/questions"
              element={<div>Questions Page</div>}
            />
            <Route
              path="/portal/apply/submit"
              element={<div>Submit Page</div>}
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

describe('ApplyConsent', () => {
  it('saves consent draft and navigates to submit on next', async () => {
    const { context } = renderApplyConsent();

    fireEvent.click(screen.getByLabelText(/permission to use photos/i));
    fireEvent.change(screen.getByLabelText(/dietary restrictions/i), {
      target: { value: 'Halal' },
    });
    fireEvent.change(screen.getByLabelText(/please specify/i), {
      target: { value: 'Nut allergy' },
    });

    fireEvent.click(screen.getByRole('button', { name: /next/i }));

    await waitFor(() => {
      expect(screen.getByText('Submit Page')).toBeInTheDocument();
    });
    expect(context.saveDraft).toHaveBeenCalledWith({
      mediaConsent: true,
      dietaryRestrictions: 'Halal',
      specify: 'Nut allergy',
    });
  });

  it('navigates back to questions without saving', () => {
    const { context } = renderApplyConsent();

    fireEvent.click(screen.getByRole('button', { name: /back/i }));

    expect(screen.getByText('Questions Page')).toBeInTheDocument();
    expect(context.saveDraft).not.toHaveBeenCalled();
  });

  it('displays inline error when saving consent draft fails', async () => {
    renderApplyConsent({
      saveDraft: jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'Failed to save consent' },
      }),
    });

    fireEvent.click(screen.getByRole('button', { name: /next/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Failed to save consent',
    );
    expect(screen.queryByText('Submit Page')).not.toBeInTheDocument();
  });

  it('redirects to dashboard when application is already submitted', () => {
    renderApplyConsent({
      application: {
        id: 'app-1',
        status: 'submitted',
        submittedAt: '2026-10-01T10:00:00Z',
      },
    });

    expect(screen.getByText('Dashboard Page')).toBeInTheDocument();
  });
});
