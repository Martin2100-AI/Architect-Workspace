import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import App from './App';
import { logout } from './services/authService';
import { getAuthToken, setAuthToken } from './services/authTokenStore';

jest.mock('./services/authService');
jest.mock('./services/authTokenStore');
jest.mock('./pages/LoginPage', () => ({
  LoginPage: ({ onLoginSuccess, onSignupClick, onForgotPasswordClick }: any) => (
    <div>
      login page
      <button onClick={onLoginSuccess}>fake login success</button>
      <button onClick={onSignupClick}>fake go to signup</button>
      <button onClick={onForgotPasswordClick}>fake go to forgot password</button>
    </div>
  ),
}));
jest.mock('./pages/SignupPage', () => ({
  SignupPage: ({ onSignupSuccess, onBackToLogin }: any) => (
    <div>
      signup page
      <button onClick={onSignupSuccess}>fake signup success</button>
      <button onClick={onBackToLogin}>fake back to login</button>
    </div>
  ),
}));
jest.mock('./pages/ForgotPasswordPage', () => ({
  ForgotPasswordPage: ({ onBackToLogin }: any) => (
    <div>
      forgot password page
      <button onClick={onBackToLogin}>fake back to login</button>
    </div>
  ),
}));
jest.mock('./pages/ResetPasswordPage', () => ({
  ResetPasswordPage: ({ token, onResetSuccess }: any) => (
    <div>
      reset password page for token {token}
      <button onClick={onResetSuccess}>fake reset success</button>
    </div>
  ),
}));
jest.mock('./pages/PropertyFeedPage', () => ({ PropertyFeedPage: () => <div>feed page</div> }));

const mockedGetAuthToken = getAuthToken as jest.MockedFunction<typeof getAuthToken>;
const mockedSetAuthToken = setAuthToken as jest.MockedFunction<typeof setAuthToken>;
const mockedLogout = logout as jest.MockedFunction<typeof logout>;

describe('App', () => {
  afterEach(() => {
    window.history.pushState({}, '', '/');
  });

  it('shows the login page when there is no session token', () => {
    mockedGetAuthToken.mockReturnValue(null);

    render(<App />);

    expect(screen.getByText('login page')).toBeInTheDocument();
  });

  it('shows the property feed and header when a session token is already present', () => {
    mockedGetAuthToken.mockReturnValue('a-real-token');

    render(<App />);

    expect(screen.getByText('feed page')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /log out/i })).toBeInTheDocument();
  });

  it('navigates from login to signup and back', () => {
    mockedGetAuthToken.mockReturnValue(null);

    render(<App />);

    fireEvent.click(screen.getByText('fake go to signup'));
    expect(screen.getByText('signup page')).toBeInTheDocument();

    fireEvent.click(screen.getByText('fake back to login'));
    expect(screen.getByText('login page')).toBeInTheDocument();
  });

  it('navigates from login to forgot-password and back', () => {
    mockedGetAuthToken.mockReturnValue(null);

    render(<App />);

    fireEvent.click(screen.getByText('fake go to forgot password'));
    expect(screen.getByText('forgot password page')).toBeInTheDocument();

    fireEvent.click(screen.getByText('fake back to login'));
    expect(screen.getByText('login page')).toBeInTheDocument();
  });

  it('shows the reset-password page when a reset token is present in the URL, ahead of anything else', () => {
    window.history.pushState({}, '', '/?token=a-real-reset-token');
    mockedGetAuthToken.mockReturnValue(null);

    render(<App />);

    expect(screen.getByText(/reset password page for token a-real-reset-token/i)).toBeInTheDocument();

    fireEvent.click(screen.getByText('fake reset success'));
    expect(screen.getByText('login page')).toBeInTheDocument();
  });

  it('logs out: revokes the session, clears the local token, and returns to login', async () => {
    mockedGetAuthToken.mockReturnValue('a-real-token');
    mockedLogout.mockResolvedValueOnce(undefined);

    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: /log out/i }));

    expect(mockedLogout).toHaveBeenCalled();
    await screen.findByText('login page');
    expect(mockedSetAuthToken).toHaveBeenCalledWith(null);
  });

  it('returns to the login view (not a previously-visited signup/forgot-password view) after logout', async () => {
    // Regression: authView previously wasn't reset on logout, so a user who visited
    // Sign up before logging in would land back on the Signup form after logging out.
    mockedGetAuthToken.mockReturnValue(null);
    mockedLogout.mockResolvedValueOnce(undefined);

    render(<App />);
    fireEvent.click(screen.getByText('fake go to signup'));
    expect(screen.getByText('signup page')).toBeInTheDocument();

    fireEvent.click(screen.getByText('fake signup success'));
    expect(screen.getByText('feed page')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /log out/i }));
    await screen.findByText('login page');
  });

  it('still returns to login if the logout network call fails', async () => {
    mockedGetAuthToken.mockReturnValue('a-real-token');
    mockedLogout.mockRejectedValueOnce(new Error('network drop'));

    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: /log out/i }));

    await screen.findByText('login page');
    expect(mockedSetAuthToken).toHaveBeenCalledWith(null);
  });
});
