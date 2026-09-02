import React, { useState } from 'react';
import { EmailAlreadyExistsError, login, signup } from '../services/authService';
import { setAuthToken } from '../services/authTokenStore';

interface SignupPageProps {
  onSignupSuccess: () => void;
  onBackToLogin: () => void;
}

export function SignupPage({ onSignupSuccess, onBackToLogin }: SignupPageProps): JSX.Element {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      await signup(email, password);
    } catch (err) {
      setError(
        err instanceof EmailAlreadyExistsError ? err.message : 'Something went wrong creating your account.'
      );
      setIsSubmitting(false);
      return;
    }

    try {
      const token = await login(email, password);
      setAuthToken(token);
      onSignupSuccess();
    } catch {
      // Account was created but the follow-up login call failed (e.g. a dropped
      // connection) — send the user to the login form instead of leaving them stuck
      // on a signup form for an account that already exists.
      onBackToLogin();
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="signup-page">
      <h1>Create your Keysy account</h1>
      <form onSubmit={handleSubmit}>
        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <label htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Creating account…' : 'Sign up'}
        </button>
        {error && (
          <p role="alert" className="signup-page__error">
            {error}
          </p>
        )}
      </form>
      <button type="button" onClick={onBackToLogin}>
        Already have an account? Log in
      </button>
    </main>
  );
}
