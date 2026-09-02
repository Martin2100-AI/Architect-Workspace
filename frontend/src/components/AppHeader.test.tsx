import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { AppHeader } from './AppHeader';

describe('AppHeader', () => {
  it('calls onLogout when "Log out" is clicked', () => {
    const onLogout = jest.fn();

    render(<AppHeader onLogout={onLogout} />);

    fireEvent.click(screen.getByRole('button', { name: /log out/i }));
    expect(onLogout).toHaveBeenCalled();
  });
});
