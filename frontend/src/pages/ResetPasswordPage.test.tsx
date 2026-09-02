import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { ResetPasswordPage } from './ResetPasswordPage';
import { confirmPasswordReset, InvalidOrExpiredResetTokenError } from '../services/authService';

// See SignupPage.test.tsx for why this can't be a plain automock: the component's
// `instanceof InvalidOrExpiredResetTokenError` check needs the real class identity.
jest.mock('../services/authService', () => ({
  ...jest.requireActual('../services/authService'),
  confirmPasswordReset: jest.fn(),
}));
const mockedConfirmPasswordReset = confirmPasswordReset as jest.MockedFunction<typeof confirmPasswordReset>;

describe('ResetPasswordPage', () => {
  it('shows a success message after a valid token and new password', async () => {
    mockedConfirmPasswordReset.mockResolvedValueOnce(undefined);
    const onResetSuccess = jest.fn();

    render(<ResetPasswordPage token="a-real-reset-token" onResetSuccess={onResetSuccess} />);

    fireEvent.change(screen.getByLabelText(/new password/i), { target: { value: 'brand-new-secret' } });
    fireEvent.click(screen.getByRole('button', { name: /reset password/i }));

    expect(await screen.findByRole('status')).toHaveTextContent(/password has been reset/i);
    expect(mockedConfirmPasswordReset).toHaveBeenCalledWith('a-real-reset-token', 'brand-new-secret');

    fireEvent.click(screen.getByRole('button', { name: /go to log in/i }));
    expect(onResetSuccess).toHaveBeenCalled();
  });

  it('shows an error for an invalid or expired token', async () => {
    mockedConfirmPasswordReset.mockRejectedValueOnce(new InvalidOrExpiredResetTokenError());

    render(<ResetPasswordPage token="an-expired-token" onResetSuccess={jest.fn()} />);

    fireEvent.change(screen.getByLabelText(/new password/i), { target: { value: 'brand-new-secret' } });
    fireEvent.click(screen.getByRole('button', { name: /reset password/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/invalid or has expired/i);
  });

  it('shows a generic error for an unexpected failure', async () => {
    mockedConfirmPasswordReset.mockRejectedValueOnce(new Error('network drop'));

    render(<ResetPasswordPage token="a-real-reset-token" onResetSuccess={jest.fn()} />);

    fireEvent.change(screen.getByLabelText(/new password/i), { target: { value: 'brand-new-secret' } });
    fireEvent.click(screen.getByRole('button', { name: /reset password/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/something went wrong/i);
  });
});
