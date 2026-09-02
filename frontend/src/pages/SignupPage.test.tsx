import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { SignupPage } from './SignupPage';
import { EmailAlreadyExistsError, login, signup } from '../services/authService';

// A plain `jest.mock('../services/authService')` automock replaces the exported error
// classes too, which breaks `instanceof` checks in the component (the mocked class
// isn't the same identity as the one this test constructs). Keep the real classes,
// only mock the network-calling functions.
jest.mock('../services/authService', () => ({
  ...jest.requireActual('../services/authService'),
  signup: jest.fn(),
  login: jest.fn(),
}));
const mockedSignup = signup as jest.MockedFunction<typeof signup>;
const mockedLogin = login as jest.MockedFunction<typeof login>;

describe('SignupPage', () => {
  it('signs up, logs in, and calls onSignupSuccess', async () => {
    mockedSignup.mockResolvedValueOnce(undefined);
    mockedLogin.mockResolvedValueOnce('a-real-token');
    const onSignupSuccess = jest.fn();

    render(<SignupPage onSignupSuccess={onSignupSuccess} onBackToLogin={jest.fn()} />);

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'newbuyer@example.com' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'super-secret-1' } });
    fireEvent.click(screen.getByRole('button', { name: /^sign up$/i }));

    await screen.findByRole('button', { name: /^sign up$/i });
    expect(mockedSignup).toHaveBeenCalledWith('newbuyer@example.com', 'super-secret-1');
    expect(mockedLogin).toHaveBeenCalledWith('newbuyer@example.com', 'super-secret-1');
    expect(onSignupSuccess).toHaveBeenCalled();
  });

  it('shows an error and does not call onSignupSuccess when the email is already registered', async () => {
    mockedSignup.mockRejectedValueOnce(new EmailAlreadyExistsError());
    const onSignupSuccess = jest.fn();

    render(<SignupPage onSignupSuccess={onSignupSuccess} onBackToLogin={jest.fn()} />);

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'existing@example.com' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'super-secret-1' } });
    fireEvent.click(screen.getByRole('button', { name: /^sign up$/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/already exists/i);
    expect(mockedLogin).not.toHaveBeenCalled();
    expect(onSignupSuccess).not.toHaveBeenCalled();
  });

  it('sends the user back to login if the follow-up login call fails after a successful signup', async () => {
    mockedSignup.mockResolvedValueOnce(undefined);
    mockedLogin.mockRejectedValueOnce(new Error('network drop'));
    const onSignupSuccess = jest.fn();
    const onBackToLogin = jest.fn();

    render(<SignupPage onSignupSuccess={onSignupSuccess} onBackToLogin={onBackToLogin} />);

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'newbuyer@example.com' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'super-secret-1' } });
    fireEvent.click(screen.getByRole('button', { name: /^sign up$/i }));

    await screen.findByRole('button', { name: /^sign up$/i });
    expect(onBackToLogin).toHaveBeenCalled();
    expect(onSignupSuccess).not.toHaveBeenCalled();
  });

  it('calls onBackToLogin when "Already have an account? Log in" is clicked', () => {
    const onBackToLogin = jest.fn();

    render(<SignupPage onSignupSuccess={jest.fn()} onBackToLogin={onBackToLogin} />);

    fireEvent.click(screen.getByRole('button', { name: /already have an account/i }));
    expect(onBackToLogin).toHaveBeenCalled();
  });
});
