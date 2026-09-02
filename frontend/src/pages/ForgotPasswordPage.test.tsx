import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { ForgotPasswordPage } from './ForgotPasswordPage';
import { requestPasswordReset } from '../services/authService';

jest.mock('../services/authService');
const mockedRequestPasswordReset = requestPasswordReset as jest.MockedFunction<typeof requestPasswordReset>;

describe('ForgotPasswordPage', () => {
  it('shows a generic confirmation after a successful request', async () => {
    mockedRequestPasswordReset.mockResolvedValueOnce(undefined);

    render(<ForgotPasswordPage onBackToLogin={jest.fn()} />);

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'buyer@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: /send reset link/i }));

    expect(await screen.findByRole('status')).toHaveTextContent(/if that email is registered/i);
    expect(mockedRequestPasswordReset).toHaveBeenCalledWith('buyer@example.com');
  });

  it('shows the same generic confirmation even for an email that was never registered', async () => {
    // The backend always responds 200 either way (see passwordResetService.ts) so an
    // attacker can't use this form to enumerate registered emails; the frontend must
    // not special-case a "not found" response since the API never sends one.
    mockedRequestPasswordReset.mockResolvedValueOnce(undefined);

    render(<ForgotPasswordPage onBackToLogin={jest.fn()} />);

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'never-signed-up@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: /send reset link/i }));

    expect(await screen.findByRole('status')).toHaveTextContent(/if that email is registered/i);
  });

  it('shows an error when the request itself fails (e.g. network/server error)', async () => {
    mockedRequestPasswordReset.mockRejectedValueOnce(new Error('network drop'));

    render(<ForgotPasswordPage onBackToLogin={jest.fn()} />);

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'buyer@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: /send reset link/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/something went wrong/i);
  });

  it('calls onBackToLogin when "Back to log in" is clicked', () => {
    const onBackToLogin = jest.fn();

    render(<ForgotPasswordPage onBackToLogin={onBackToLogin} />);

    fireEvent.click(screen.getByRole('button', { name: /back to log in/i }));
    expect(onBackToLogin).toHaveBeenCalled();
  });
});
