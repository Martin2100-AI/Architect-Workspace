import React, { useState } from 'react';
import '../styles/authPage.css';
import { requestPasswordReset } from '../services/authService';

interface ForgotPasswordPageProps {
  onBackToLogin: () => void;
}

type RequestState = 'idle' | 'submitted' | 'error';

export function ForgotPasswordPage({ onBackToLogin }: ForgotPasswordPageProps): JSX.Element {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [state, setState] = useState<RequestState>('idle');

  async function handleSubmit(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      await requestPasswordReset(email);
      setState('submitted');
    } catch {
      setState('error');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="forgot-password-page auth-page">
      <div className="auth-page__card">
        <h1>Reset your password</h1>

        {state === 'submitted' ? (
          <p role="status">If that email is registered, we&apos;ve sent a password reset link.</p>
        ) : (
          <form onSubmit={handleSubmit}>
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <button type="submit" className="btn-primary" disabled={isSubmitting}>
              {isSubmitting ? 'Sending…' : 'Send reset link'}
            </button>
            {state === 'error' && <p role="alert">Something went wrong. Please try again.</p>}
          </form>
        )}

        <div className="auth-page__links">
          <button type="button" className="auth-page__link-button" onClick={onBackToLogin}>
            Back to log in
          </button>
        </div>
      </div>
    </main>
  );
}
