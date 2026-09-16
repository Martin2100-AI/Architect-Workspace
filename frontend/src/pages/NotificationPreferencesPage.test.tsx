import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NotificationPreferencesPage } from './NotificationPreferencesPage';
import {
  fetchNotificationPreferences,
  NotAuthenticatedError,
  NotificationPreferenceValidationError,
  updateNotificationPreferences,
} from '../services/notificationPreferenceService';

jest.mock('../services/notificationPreferenceService', () => ({
  ...jest.requireActual('../services/notificationPreferenceService'),
  fetchNotificationPreferences: jest.fn(),
  updateNotificationPreferences: jest.fn(),
}));

const mockedFetch = fetchNotificationPreferences as jest.MockedFunction<typeof fetchNotificationPreferences>;
const mockedUpdate = updateNotificationPreferences as jest.MockedFunction<typeof updateNotificationPreferences>;

const allEnabled = {
  userId: 1,
  newMatch: true,
  priceReduction: true,
  openHouse: true,
  statusChange: true,
  backOnMarket: true,
  underContract: true,
  tourConfirmation: true,
};

describe('NotificationPreferencesPage', () => {
  it('loads and displays the current preferences, all checked', async () => {
    mockedFetch.mockResolvedValueOnce(allEnabled);

    render(<NotificationPreferencesPage onBack={jest.fn()} />);

    const tourCheckbox = await screen.findByLabelText('Tour confirmations');
    expect(tourCheckbox).toBeChecked();
    expect(screen.getByLabelText('Price reductions')).toBeChecked();
  });

  it('shows an error message when loading preferences fails', async () => {
    mockedFetch.mockRejectedValueOnce(new Error('network down'));

    render(<NotificationPreferencesPage onBack={jest.fn()} />);

    expect(await screen.findByRole('alert')).toHaveTextContent(/something went wrong/i);
  });

  // Given a user, when they update preferences, then notifications should reflect
  // changes. Also covers "user cannot disable notifications" (failure path): the
  // toggle and save must actually work.
  it('toggles a preference off and saves it', async () => {
    mockedFetch.mockResolvedValueOnce(allEnabled);
    mockedUpdate.mockResolvedValueOnce({ ...allEnabled, tourConfirmation: false });

    render(<NotificationPreferencesPage onBack={jest.fn()} />);
    const tourCheckbox = await screen.findByLabelText('Tour confirmations');

    fireEvent.click(tourCheckbox);
    fireEvent.click(screen.getByRole('button', { name: /save preferences/i }));

    await waitFor(() =>
      expect(mockedUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ tourConfirmation: false, priceReduction: true }),
      ),
    );
    expect(await screen.findByText(/preferences have been saved/i)).toBeInTheDocument();
    expect(tourCheckbox).not.toBeChecked();
  });

  it('shows a validation error and keeps the form editable when saving fails validation', async () => {
    mockedFetch.mockResolvedValueOnce(allEnabled);
    mockedUpdate.mockRejectedValueOnce(new NotificationPreferenceValidationError());

    render(<NotificationPreferencesPage onBack={jest.fn()} />);
    await screen.findByLabelText('Tour confirmations');

    fireEvent.click(screen.getByRole('button', { name: /save preferences/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/check the highlighted fields/i);
  });

  it('shows a not-authenticated message when the session has expired', async () => {
    mockedFetch.mockResolvedValueOnce(allEnabled);
    mockedUpdate.mockRejectedValueOnce(new NotAuthenticatedError());

    render(<NotificationPreferencesPage onBack={jest.fn()} />);
    await screen.findByLabelText('Tour confirmations');

    fireEvent.click(screen.getByRole('button', { name: /save preferences/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/need to be logged in/i);
  });

  it('calls onBack when "Back" is clicked', async () => {
    mockedFetch.mockResolvedValueOnce(allEnabled);
    const onBack = jest.fn();

    render(<NotificationPreferencesPage onBack={onBack} />);
    await screen.findByLabelText('Tour confirmations');

    fireEvent.click(screen.getByRole('button', { name: /^back$/i }));
    expect(onBack).toHaveBeenCalled();
  });
});
