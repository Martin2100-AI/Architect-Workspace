import React, { useState } from 'react';
import '../styles/authPage.css';
import { login } from '../services/authService';
import { setAuthToken } from '../services/authTokenStore';

interface LoginPageProps {
  onLoginSuccess: () => void;
  onSignupClick: () => void;
  onForgotPasswordClick: () => void;
}

export function LoginPage({ onLoginSuccess, onSignupClick, onForgotPasswordClick }: LoginPageProps): JSX.Element {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      const token = await login(email, password);
      setAuthToken(token);
      onLoginSuccess();
    } catch {
      setError('Incorrect email or password.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="login-page auth-page">
      <div className="auth-page__card">
        <h1>Log in to Keysy</h1>
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
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button type="submit" className="btn-primary" disabled={isSubmitting}>
            {isSubmitting ? 'Logging in…' : 'Log in'}
          </button>
          {error && (
            <p role="alert" className="login-page__error">
              {error}
            </p>
          )}
        </form>
        <div className="auth-page__links">
          <button type="button" className="auth-page__link-button" onClick={onForgotPasswordClick}>
            Forgot password?
          </button>
          <button type="button" className="auth-page__link-button" onClick={onSignupClick}>
            Sign up
          </button>
        </div>
      </div>
    </main>
  );
}
