import React, { useState } from 'react';
import { confirmPasswordReset, InvalidOrExpiredResetTokenError } from '../services/authService';

interface ResetPasswordPageProps {
  token: string;
  onResetSuccess: () => void;
}

export function ResetPasswordPage({ token, onResetSuccess }: ResetPasswordPageProps): JSX.Element {
  const [newPassword, setNewPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [succeeded, setSucceeded] = useState(false);

  async function handleSubmit(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      await confirmPasswordReset(token, newPassword);
      setSucceeded(true);
    } catch (err) {
      setError(
        err instanceof InvalidOrExpiredResetTokenError ? err.message : 'Something went wrong. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (succeeded) {
    return (
      <main className="reset-password-page">
        <h1>Password updated</h1>
        <p role="status">Your password has been reset. You can now log in.</p>
        <button type="button" onClick={onResetSuccess}>
          Go to log in
        </button>
      </main>
    );
  }

  return (
    <main className="reset-password-page">
      <h1>Choose a new password</h1>
      <form onSubmit={handleSubmit}>
        <label htmlFor="newPassword">New password</label>
        <input
          id="newPassword"
          type="password"
          minLength={8}
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          required
        />
        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving…' : 'Reset password'}
        </button>
        {error && <p role="alert">{error}</p>}
      </form>
    </main>
  );
}
