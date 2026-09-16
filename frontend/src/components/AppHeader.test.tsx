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

  it('does not render a "Saved Homes" button when onNavigateSavedHomes is not provided', () => {
    render(<AppHeader onLogout={jest.fn()} />);

    expect(screen.queryByRole('button', { name: /saved homes/i })).not.toBeInTheDocument();
  });

  it('calls onNavigateSavedHomes when "Saved Homes" is clicked', () => {
    const onNavigateSavedHomes = jest.fn();

    render(<AppHeader onLogout={jest.fn()} onNavigateSavedHomes={onNavigateSavedHomes} />);

    fireEvent.click(screen.getByRole('button', { name: /saved homes/i }));
    expect(onNavigateSavedHomes).toHaveBeenCalled();
  });

  it('does not render a "Notifications" button when onNavigateNotificationPreferences is not provided', () => {
    render(<AppHeader onLogout={jest.fn()} />);

    expect(screen.queryByRole('button', { name: /notifications/i })).not.toBeInTheDocument();
  });

  it('calls onNavigateNotificationPreferences when "Notifications" is clicked', () => {
    const onNavigateNotificationPreferences = jest.fn();

    render(
      <AppHeader onLogout={jest.fn()} onNavigateNotificationPreferences={onNavigateNotificationPreferences} />,
    );

    fireEvent.click(screen.getByRole('button', { name: /notifications/i }));
    expect(onNavigateNotificationPreferences).toHaveBeenCalled();
  });
});
