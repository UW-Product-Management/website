import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import EmailSendControls from './EmailSendControls';
import {
  createCustomEmail,
  getCustomEmailMode,
  sendCustomEmailBatch,
  sendTestCustomEmail,
} from '../../services/portalApi';

jest.mock('../../services/portalApi');

const recipients = [
  { userId: 'u1', email: 'ada@example.com', group: 'draft' },
  { userId: 'u2', email: 'bo@example.com', group: 'draft' },
];

const renderControls = (props = {}) =>
  render(
    <EmailSendControls
      eventId="evt-1"
      recipients={recipients}
      subject="Finish your application"
      body="Hi {{name}}"
      {...props}
    />,
  );

describe('EmailSendControls', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    getCustomEmailMode.mockResolvedValue({
      data: { mode: 'local' },
      error: null,
    });
  });

  it('shows the email environment', async () => {
    renderControls();

    expect(await screen.findByText(/captured in mailpit/i)).toBeInTheDocument();
  });

  it('explains when the email service cannot be reached', async () => {
    getCustomEmailMode.mockResolvedValue({
      data: null,
      error: { code: 'send_failed', message: 'Sending failed.' },
    });
    renderControls();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      /email service is not reachable/i,
    );
  });

  it('keeps send disabled until the exact confirmation is typed', async () => {
    renderControls();
    const send = screen.getByRole('button', { name: 'Send to 2 people' });
    expect(send).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/to confirm/i), {
      target: { value: 'SEND 1' },
    });
    expect(send).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/to confirm/i), {
      target: { value: 'SEND 2' },
    });
    expect(send).toBeEnabled();
    await screen.findByText(/captured in mailpit/i);
  });

  it('disables sending without a subject and message', async () => {
    renderControls({ subject: ' ' });
    fireEvent.change(screen.getByLabelText(/to confirm/i), {
      target: { value: 'SEND 2' },
    });

    expect(
      screen.getByRole('button', { name: 'Send to 2 people' }),
    ).toBeDisabled();
    expect(
      screen.getByRole('button', { name: 'Send test to myself' }),
    ).toBeDisabled();
    await screen.findByText(/captured in mailpit/i);
  });

  it('sends a test email to the organizer', async () => {
    sendTestCustomEmail.mockResolvedValue({
      data: { to: 'olive@example.com' },
      error: null,
    });
    renderControls();

    fireEvent.click(
      screen.getByRole('button', { name: 'Send test to myself' }),
    );

    expect(sendTestCustomEmail).toHaveBeenCalledWith({
      subject: 'Finish your application',
      body: 'Hi {{name}}',
    });
    expect(
      await screen.findByText(/sent to olive@example.com/i),
    ).toBeInTheDocument();
  });

  it('creates the email, then sends batches until none remain', async () => {
    const onSent = jest.fn();
    createCustomEmail.mockResolvedValue({
      data: { campaignId: 'c1', total: 2 },
      error: null,
    });
    sendCustomEmailBatch
      .mockResolvedValueOnce({
        data: { sent: 1, failed: 0, remaining: 1 },
        error: null,
      })
      .mockResolvedValueOnce({
        data: { sent: 1, failed: 0, remaining: 0 },
        error: null,
      });
    renderControls({ onSent });

    fireEvent.change(screen.getByLabelText(/to confirm/i), {
      target: { value: 'SEND 2' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Send to 2 people' }));

    expect(
      await screen.findByText('Email sent to 2 people.'),
    ).toBeInTheDocument();
    expect(createCustomEmail).toHaveBeenCalledWith('evt-1', {
      subject: 'Finish your application',
      body: 'Hi {{name}}',
      recipientIds: ['u1', 'u2'],
      confirmation: 'SEND 2',
    });
    expect(sendCustomEmailBatch).toHaveBeenCalledTimes(2);
    expect(onSent).toHaveBeenCalled();
  });

  it('stops and reports when a batch sends nothing', async () => {
    createCustomEmail.mockResolvedValue({
      data: { campaignId: 'c1', total: 2 },
      error: null,
    });
    sendCustomEmailBatch.mockResolvedValue({
      data: { sent: 0, failed: 2, remaining: 2 },
      error: null,
    });
    renderControls();

    fireEvent.change(screen.getByLabelText(/to confirm/i), {
      target: { value: 'SEND 2' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Send to 2 people' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      /2 emails failed to send/i,
    );
    await waitFor(() => expect(sendCustomEmailBatch).toHaveBeenCalledTimes(1));
  });
});
