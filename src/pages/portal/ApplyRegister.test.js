import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ApplyRegister from './ApplyRegister';
import { PortalContext } from '../../context/PortalContext';

function renderApplyRegister(
  contextOverrides = {},
  initialRoute = '/portal/apply/register',
) {
  const defaultContext = {
    session: { user: { id: 'usr-1', email: 'applicant@example.com' } },
    profile: { id: 'usr-1', fullName: 'Alex Chen' },
    application: {
      id: 'app-1',
      program: '',
      yearOfStudy: '',
      status: 'draft',
      submittedAt: null,
    },
    state: {
      account: { fullName: 'Alex Chen', email: 'applicant@example.com' },
      application: { program: '', yearOfStudy: '' },
      submittedAt: null,
    },
    updateProfile: jest.fn().mockResolvedValue({ data: {}, error: null }),
    saveDraft: jest.fn().mockResolvedValue({ data: {}, error: null }),
    ...contextOverrides,
  };

  return {
    ...render(
      <PortalContext.Provider value={defaultContext}>
        <MemoryRouter initialEntries={[initialRoute]}>
          <Routes>
            <Route path="/portal/apply/register" element={<ApplyRegister />} />
            <Route
              path="/portal/apply/questions"
              element={<div>Questions Page</div>}
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

describe('ApplyRegister', () => {
  it('renders email input as read-only and disabled', () => {
    renderApplyRegister();

    const emailInput = screen.getByLabelText(/email address/i);
    expect(emailInput).toHaveValue('applicant@example.com');
    expect(emailInput).toHaveAttribute('readonly');
    expect(emailInput).toBeDisabled();
  });

  it('populates initial full name from profile', () => {
    renderApplyRegister();

    const nameInput = screen.getByLabelText(/full name/i);
    expect(nameInput).toHaveValue('Alex Chen');
  });

  it('saves profile and draft then navigates to questions on submit', async () => {
    const { context } = renderApplyRegister();

    fireEvent.change(screen.getByLabelText(/program/i), {
      target: { value: 'Computer Science' },
    });
    fireEvent.change(screen.getByLabelText(/year of study/i), {
      target: { value: '2nd year' },
    });

    fireEvent.click(screen.getByRole('button', { name: /next/i }));

    await waitFor(() => {
      expect(screen.getByText('Questions Page')).toBeInTheDocument();
    });
    expect(context.updateProfile).toHaveBeenCalledWith({
      fullName: 'Alex Chen',
    });
    expect(context.saveDraft).toHaveBeenCalledWith({
      program: 'Computer Science',
      yearOfStudy: '2nd year',
    });
  });

  it('displays inline error when profile update fails', async () => {
    renderApplyRegister({
      updateProfile: jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'Failed to update profile' },
      }),
    });

    fireEvent.change(screen.getByLabelText(/program/i), {
      target: { value: 'Engineering' },
    });
    fireEvent.change(screen.getByLabelText(/year of study/i), {
      target: { value: '1st year' },
    });

    fireEvent.click(screen.getByRole('button', { name: /next/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Failed to update profile',
    );
    expect(screen.queryByText('Questions Page')).not.toBeInTheDocument();
  });

  it('displays inline error when saving draft fails', async () => {
    renderApplyRegister({
      saveDraft: jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'Database save error' },
      }),
    });

    fireEvent.change(screen.getByLabelText(/program/i), {
      target: { value: 'Mathematics' },
    });
    fireEvent.change(screen.getByLabelText(/year of study/i), {
      target: { value: '3rd year' },
    });

    fireEvent.click(screen.getByRole('button', { name: /next/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Database save error',
    );
    expect(screen.queryByText('Questions Page')).not.toBeInTheDocument();
  });

  it('redirects to dashboard if application is already submitted', () => {
    renderApplyRegister({
      application: {
        id: 'app-1',
        status: 'submitted',
        submittedAt: '2026-10-01T12:00:00Z',
      },
    });

    expect(screen.getByText('Dashboard Page')).toBeInTheDocument();
  });
});
