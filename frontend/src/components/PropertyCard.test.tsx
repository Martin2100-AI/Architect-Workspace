import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { PropertyCard } from './PropertyCard';
import { NotAuthenticatedError, saveFavorite } from '../services/favoritesService';
import { Property } from '../types/property';

jest.mock('../services/favoritesService', () => ({
  ...jest.requireActual('../services/favoritesService'),
  saveFavorite: jest.fn(),
}));
const mockedSaveFavorite = saveFavorite as jest.MockedFunction<typeof saveFavorite>;

const sampleProperty: Property = {
  id: 'p1',
  imageUrl: 'https://example.com/photo.jpg',
  listingPrice: 400000,
  address: '1 Test St',
  bedrooms: 3,
  bathrooms: 2,
  squareFootage: 1500,
  propertyType: 'single-family',
  estimatedMonthlyPayment: 2500,
};

describe('PropertyCard', () => {
  it('saves the property and disables the button once saved', async () => {
    mockedSaveFavorite.mockResolvedValueOnce(undefined);

    render(<PropertyCard property={sampleProperty} initiallyFavorited={false} />);

    fireEvent.click(screen.getByRole('button', { name: /save to favorites/i }));

    const savedButton = await screen.findByRole('button', { name: /saved to favorites/i });
    expect(savedButton).toBeDisabled();
    expect(mockedSaveFavorite).toHaveBeenCalledWith('p1');
  });

  it('shows a login prompt when the user is not authenticated', async () => {
    mockedSaveFavorite.mockRejectedValueOnce(new NotAuthenticatedError());

    render(<PropertyCard property={sampleProperty} initiallyFavorited={false} />);

    fireEvent.click(screen.getByRole('button', { name: /save to favorites/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/log in to save/i);
  });

  it('shows a generic error and leaves the button enabled when saving fails', async () => {
    mockedSaveFavorite.mockRejectedValueOnce(new Error('network down'));

    render(<PropertyCard property={sampleProperty} initiallyFavorited={false} />);

    fireEvent.click(screen.getByRole('button', { name: /save to favorites/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/couldn't save/i);
    await waitFor(() => expect(screen.getByRole('button', { name: /save to favorites/i })).not.toBeDisabled());
  });
});
