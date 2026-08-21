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

    render(<LoginPage onLoginSuccess={onLoginSuccess} />);

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'buyer@example.com' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'super-secret-1' } });
    fireEvent.click(screen.getByRole('button', { name: /log in/i }));

    await screen.findByRole('button', { name: /^log in$/i });
    expect(mockedLogin).toHaveBeenCalledWith('buyer@example.com', 'super-secret-1');
    expect(onLoginSuccess).toHaveBeenCalled();
  });

  it('shows an error and does not call onLoginSuccess on invalid credentials', async () => {
    mockedLogin.mockRejectedValueOnce(new InvalidCredentialsError());
    const onLoginSuccess = jest.fn();

    render(<LoginPage onLoginSuccess={onLoginSuccess} />);

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'buyer@example.com' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'wrong-password' } });
    fireEvent.click(screen.getByRole('button', { name: /log in/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/incorrect email or password/i);
    expect(onLoginSuccess).not.toHaveBeenCalled();
  });
});
