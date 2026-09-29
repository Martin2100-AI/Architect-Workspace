import React, { useState } from 'react';
import '../styles/authPage.css';
import { login } from '../services/authService';
import { setAuthToken } from '../services/authTokenStore';

interface LoginPageProps {
  onLoginSuccess: () => void;
  onSignupClick: () => void;
  onForgotPasswordClick: () => void;
}

// Minimal inline eye / eye-slash icons -- a single-use toggle glyph isn't worth an
// icon library dependency. `currentColor` so it inherits the button's text color.
function EyeIcon(): JSX.Element {
  return (
    <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" focusable="false">
      <path d="M1.5 12S5 5 12 5s10.5 7 10.5 7-3.5 7-10.5 7S1.5 12 1.5 12Z" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon(): JSX.Element {
  return (
    <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" focusable="false">
      <path
        d="M3 3l18 18M10.6 10.6a3 3 0 0 0 4.24 4.24M9.36 5.36A10.6 10.6 0 0 1 12 5c7 0 10.5 7 10.5 7a13.4 13.4 0 0 1-3.06 3.94M6.6 6.6C3.87 8.24 1.5 12 1.5 12s3.5 7 10.5 7a10.6 10.6 0 0 0 3.4-.56"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function LoginPage({ onLoginSuccess, onSignupClick, onForgotPasswordClick }: LoginPageProps): JSX.Element {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

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
        <div className="auth-page__password-row">
          <input
            id="password"
            type={isPasswordVisible ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button
            type="button"
            className="auth-page__password-toggle"
            onClick={() => setIsPasswordVisible((visible) => !visible)}
            aria-label={isPasswordVisible ? 'Hide password' : 'Show password'}
          >
            {isPasswordVisible ? <EyeOffIcon /> : <EyeIcon />}
          </button>
        </div>
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
  );
}
