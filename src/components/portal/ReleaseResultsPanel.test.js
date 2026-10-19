import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import ReleaseResultsPanel from './ReleaseResultsPanel';
import {
  approveDecisionEmails,
  previewDecisionEmails,
  sendDecisionEmailBatch,
  sendTestDecisionEmail,
} from '../../services/portalApi';

jest.mock('../../services/portalApi');

const summary = {
  eventName: 'ProdCon',
  mode: 'local',
  pending: { accepted: 2, waitlisted: 1, rejected: 1 },
  changed: { accepted: 0, waitlisted: 0, rejected: 0 },
  sent: 0,
  undecided: 0,
};

const renderPanel = (props = {}) =>
  render(<ReleaseResultsPanel event={{ id: 'evt-1' }} {...props} />);

describe('ReleaseResultsPanel', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    previewDecisionEmails.mockResolvedValue({ data: summary, error: null });
  });

  it('shows the environment notice and pending counts', async () => {
    renderPanel();

    expect(await screen.findByText(/captured in mailpit/i)).toBeInTheDocument();
    expect(
      screen.getByRole('row', { name: /accepted 2/i }),
    ).toBeInTheDocument();
  });

  it('keeps send disabled until the exact confirmation is typed', async () => {
    renderPanel();
    const send = await screen.findByRole('button', { name: 'Send 4 results' });
    expect(send).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/to confirm/i), {
      target: { value: 'SEND 3' },
    });
    expect(send).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/to confirm/i), {
      target: { value: 'SEND 4' },
    });
    expect(send).toBeEnabled();
  });

  it('requires acknowledging applications without a decision', async () => {
    previewDecisionEmails.mockResolvedValue({
      data: { ...summary, undecided: 2 },
      error: null,
    });
    renderPanel();
    fireEvent.change(await screen.findByLabelText(/to confirm/i), {
      target: { value: 'SEND 4' },
    });
    const send = screen.getByRole('button', { name: 'Send 4 results' });
    expect(send).toBeDisabled();

    fireEvent.click(screen.getByRole('checkbox', { name: /no decision/i }));

    expect(send).toBeEnabled();
  });

  it('sends a test email to the organizer', async () => {
    sendTestDecisionEmail.mockResolvedValue({
      data: { to: 'olive@example.com' },
      error: null,
    });
    renderPanel();

    fireEvent.click(
      await screen.findByRole('button', { name: 'Send test to me' }),
    );

    expect(sendTestDecisionEmail).toHaveBeenCalledWith('evt-1', 'accepted');
    expect(
      await screen.findByText(/sent to olive@example.com/i),
    ).toBeInTheDocument();
  });

  it('approves, then sends batches until none remain', async () => {
    const onReleased = jest.fn();
    approveDecisionEmails.mockResolvedValue({
      data: { runId: 'run-1', total: 4 },
      error: null,
    });
    sendDecisionEmailBatch
      .mockResolvedValueOnce({
        data: { sent: 3, failed: 0, remaining: 1 },
        error: null,
      })
      .mockResolvedValueOnce({
        data: { sent: 1, failed: 0, remaining: 0 },
        error: null,
      });
    renderPanel({ onReleased });
    fireEvent.change(await screen.findByLabelText(/to confirm/i), {
      target: { value: 'SEND 4' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Send 4 results' }));

    expect(approveDecisionEmails).toHaveBeenCalledWith('evt-1', {
      counts: { accepted: 2, waitlisted: 1, rejected: 1 },
      confirmation: 'SEND 4',
      includeChanged: false,
      acknowledgeUndecided: false,
    });
    expect(await screen.findByText(/results sent to 4/i)).toBeInTheDocument();
    expect(sendDecisionEmailBatch).toHaveBeenCalledTimes(2);
    await waitFor(() => expect(onReleased).toHaveBeenCalled());
  });

  it('shows the error and sends nothing when approval is refused', async () => {
    approveDecisionEmails.mockResolvedValue({
      data: null,
      error: { code: 'test_email_required', message: 'Send a test first.' },
    });
    renderPanel();
    fireEvent.change(await screen.findByLabelText(/to confirm/i), {
      target: { value: 'SEND 4' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Send 4 results' }));

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent('Send a test first.'),
    );
    expect(sendDecisionEmailBatch).not.toHaveBeenCalled();
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Send test to me' }),
      ).toBeEnabled(),
    );
  });
});
