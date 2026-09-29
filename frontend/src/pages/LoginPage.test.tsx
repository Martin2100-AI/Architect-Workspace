import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { LoginPage } from './LoginPage';
import { InvalidCredentialsError, login } from '../services/authService';

jest.mock('../services/authService');
const mockedLogin = login as jest.MockedFunction<typeof login>;

describe('LoginPage', () => {
  it('logs in successfully and calls onLoginSuccess', async () => {
    mockedLogin.mockResolvedValueOnce('a-real-token');
    const onLoginSuccess = jest.fn();

    render(
      <LoginPage
        onLoginSuccess={onLoginSuccess}
        onSignupClick={jest.fn()}
        onForgotPasswordClick={jest.fn()}
      />
    );

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'buyer@example.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'super-secret-1' } });
    fireEvent.click(screen.getByRole('button', { name: /^log in$/i }));

    await screen.findByRole('button', { name: /^log in$/i });
    expect(mockedLogin).toHaveBeenCalledWith('buyer@example.com', 'super-secret-1');
    expect(onLoginSuccess).toHaveBeenCalled();
  });

  it('shows an error and does not call onLoginSuccess on invalid credentials', async () => {
    mockedLogin.mockRejectedValueOnce(new InvalidCredentialsError());
    const onLoginSuccess = jest.fn();

    render(
      <LoginPage
        onLoginSuccess={onLoginSuccess}
        onSignupClick={jest.fn()}
        onForgotPasswordClick={jest.fn()}
      />
    );

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'buyer@example.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'wrong-password' } });
    fireEvent.click(screen.getByRole('button', { name: /^log in$/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/incorrect email or password/i);
    expect(onLoginSuccess).not.toHaveBeenCalled();
  });

  it('calls onSignupClick when "Sign up" is clicked', () => {
    const onSignupClick = jest.fn();

    render(
      <LoginPage onLoginSuccess={jest.fn()} onSignupClick={onSignupClick} onForgotPasswordClick={jest.fn()} />
    );

    fireEvent.click(screen.getByRole('button', { name: /sign up/i }));
    expect(onSignupClick).toHaveBeenCalled();
  });

  it('toggles the password field between hidden and visible', () => {
    render(<LoginPage onLoginSuccess={jest.fn()} onSignupClick={jest.fn()} onForgotPasswordClick={jest.fn()} />);

    const passwordInput = screen.getByLabelText('Password');
    expect(passwordInput).toHaveAttribute('type', 'password');

    fireEvent.click(screen.getByRole('button', { name: /show password/i }));
    expect(passwordInput).toHaveAttribute('type', 'text');

    fireEvent.click(screen.getByRole('button', { name: /hide password/i }));
    expect(passwordInput).toHaveAttribute('type', 'password');
  });

  it('calls onForgotPasswordClick when "Forgot password?" is clicked', () => {
    const onForgotPasswordClick = jest.fn();

    render(
      <LoginPage
        onLoginSuccess={jest.fn()}
        onSignupClick={jest.fn()}
        onForgotPasswordClick={onForgotPasswordClick}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /forgot password/i }));
    expect(onForgotPasswordClick).toHaveBeenCalled();
  });
});
