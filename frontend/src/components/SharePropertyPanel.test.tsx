import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { SharePropertyPanel } from './SharePropertyPanel';
import {
  NotAuthenticatedError,
  ShareEmailFailedError,
  sharePropertyByEmail,
  ShareValidationError,
} from '../services/propertyShareService';

jest.mock('../services/propertyShareService', () => ({
  ...jest.requireActual('../services/propertyShareService'),
  sharePropertyByEmail: jest.fn(),
}));

const mockedSharePropertyByEmail = sharePropertyByEmail as jest.MockedFunction<typeof sharePropertyByEmail>;

function openPanel(): void {
  fireEvent.click(screen.getByRole('button', { name: /^share$/i }));
}

describe('SharePropertyPanel', () => {
  beforeEach(() => {
    mockedSharePropertyByEmail.mockReset();
  });

  it('starts collapsed, showing only a Share button', () => {
    render(<SharePropertyPanel propertyId="p1" />);

    expect(screen.getByRole('button', { name: /^share$/i })).toBeInTheDocument();
    expect(screen.queryByLabelText(/shareable link/i)).not.toBeInTheDocument();
  });

  it('shows the shareable link, a text-share link, and an email form once opened', () => {
    render(<SharePropertyPanel propertyId="p1" />);

    openPanel();

    const linkInput = screen.getByLabelText(/shareable link/i) as HTMLInputElement;
    expect(linkInput.value).toBe(`${window.location.origin}/?property=p1`);

    const textLink = screen.getByRole('link', { name: /share via text/i });
    expect(textLink.getAttribute('href')).toContain('sms:');
    expect(textLink.getAttribute('href')).toContain(encodeURIComponent(`${window.location.origin}/?property=p1`));

    expect(screen.getByLabelText(/share via email/i)).toBeInTheDocument();
  });

  it('copies the link to the clipboard and shows confirmation', async () => {
    const writeText = jest.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });

    render(<SharePropertyPanel propertyId="p1" />);
    openPanel();

    fireEvent.click(screen.getByRole('button', { name: /copy link/i }));

    expect(writeText).toHaveBeenCalledWith(`${window.location.origin}/?property=p1`);
    expect(await screen.findByText(/link copied/i)).toBeInTheDocument();
  });

  // Failure path: the link itself must still be usable (shown for manual copying) even
  // when the Clipboard API is unavailable or denied.
  it('shows a manual-copy message when the Clipboard API rejects', async () => {
    const writeText = jest.fn().mockRejectedValue(new Error('denied'));
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });

    render(<SharePropertyPanel propertyId="p1" />);
    openPanel();

    fireEvent.click(screen.getByRole('button', { name: /copy link/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/copy the link above manually/i);
  });

  // Given a property, when shared via email, then the recipient should receive the details.
  it('sends the share email and shows a confirmation', async () => {
    mockedSharePropertyByEmail.mockResolvedValueOnce({
      shared: true,
      shareUrl: `${window.location.origin}/?property=p1`,
    });

    render(<SharePropertyPanel propertyId="p1" />);
    openPanel();

    fireEvent.change(screen.getByLabelText(/share via email/i), { target: { value: 'friend@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: /^send$/i }));

    expect(await screen.findByText(/sent to friend@example.com/i)).toBeInTheDocument();
    expect(mockedSharePropertyByEmail).toHaveBeenCalledWith('p1', 'friend@example.com');
  });

  // Failure path: email does not send.
  it('shows a distinct message when the email fails to send', async () => {
    mockedSharePropertyByEmail.mockRejectedValueOnce(new ShareEmailFailedError());

    render(<SharePropertyPanel propertyId="p1" />);
    openPanel();

    fireEvent.change(screen.getByLabelText(/share via email/i), { target: { value: 'friend@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: /^send$/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/could not send that email/i);
  });

  it('shows a validation message for an invalid recipient email', async () => {
    mockedSharePropertyByEmail.mockRejectedValueOnce(new ShareValidationError());

    render(<SharePropertyPanel propertyId="p1" />);
    openPanel();

    fireEvent.change(screen.getByLabelText(/share via email/i), { target: { value: 'not-an-email' } });
    fireEvent.click(screen.getByRole('button', { name: /^send$/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/valid email address/i);
  });

  it('shows a not-authenticated message without crashing', async () => {
    mockedSharePropertyByEmail.mockRejectedValueOnce(new NotAuthenticatedError());

    render(<SharePropertyPanel propertyId="p1" />);
    openPanel();

    fireEvent.change(screen.getByLabelText(/share via email/i), { target: { value: 'friend@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: /^send$/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/need to be logged in/i);
  });

  it('closes the panel when Close is clicked', () => {
    render(<SharePropertyPanel propertyId="p1" />);
    openPanel();

    fireEvent.click(screen.getByRole('button', { name: /^close$/i }));

    expect(screen.queryByLabelText(/shareable link/i)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^share$/i })).toBeInTheDocument();
  });
});
