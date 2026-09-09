import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { SavedHomesPage } from './SavedHomesPage';
import { fetchFavorites, removeFavorite } from '../services/favoritesService';
import { fetchPropertyById, PropertyNotFoundError } from '../services/propertyService';
import { Property } from '../types/property';

jest.mock('../services/favoritesService', () => ({
  ...jest.requireActual('../services/favoritesService'),
  fetchFavorites: jest.fn(),
  removeFavorite: jest.fn(),
}));
jest.mock('../services/propertyService');

const mockedFetchFavorites = fetchFavorites as jest.MockedFunction<typeof fetchFavorites>;
const mockedRemoveFavorite = removeFavorite as jest.MockedFunction<typeof removeFavorite>;
const mockedFetchPropertyById = fetchPropertyById as jest.MockedFunction<typeof fetchPropertyById>;

function makeProperty(overrides: Partial<Property>): Property {
  return {
    id: 'p1',
    imageUrl: 'https://example.com/photo.jpg',
    listingPrice: 400000,
    address: '1 Test St',
    bedrooms: 3,
    bathrooms: 2,
    squareFootage: 1500,
    propertyType: 'single-family',
    estimatedMonthlyPayment: 2500,
    ...overrides,
  };
}

describe('SavedHomesPage', () => {
  it('shows saved properties grouped under their category, and "no properties" for empty categories', async () => {
    mockedFetchFavorites.mockResolvedValueOnce([
      { propertyId: 'p1', category: 'favorites' },
      { propertyId: 'p2', category: 'maybe' },
    ]);
    mockedFetchPropertyById.mockImplementation((id) =>
      Promise.resolve(makeProperty({ id, address: `${id} address`, listingPrice: id === 'p1' ? 400000 : 300000 })),
    );

    render(<SavedHomesPage onBack={jest.fn()} />);

    const favoritesSection = await screen.findByRole('region', { name: 'Favorites' });
    expect(within(favoritesSection).getByText('p1 address')).toBeInTheDocument();

    const maybeSection = screen.getByRole('region', { name: 'Maybe' });
    expect(within(maybeSection).getByText('p2 address')).toBeInTheDocument();

    const wantToTourSection = screen.getByRole('region', { name: 'Want to Tour' });
    expect(within(wantToTourSection).getByText(/no properties saved here yet/i)).toBeInTheDocument();
  });

  it('shows an unavailable message for a saved property that no longer exists, without losing the rest of the list', async () => {
    mockedFetchFavorites.mockResolvedValueOnce([
      { propertyId: 'gone', category: 'favorites' },
      { propertyId: 'p2', category: 'favorites' },
    ]);
    mockedFetchPropertyById.mockImplementation((id) =>
      id === 'gone' ? Promise.reject(new PropertyNotFoundError()) : Promise.resolve(makeProperty({ id, address: 'still here' })),
    );

    render(<SavedHomesPage onBack={jest.fn()} />);

    expect(await screen.findByText(/no longer available/i)).toBeInTheDocument();
    expect(screen.getByText('still here')).toBeInTheDocument();
  });

  it('shows an error message when the favorites list itself fails to load', async () => {
    mockedFetchFavorites.mockRejectedValueOnce(new Error('network down'));

    render(<SavedHomesPage onBack={jest.fn()} />);

    expect(await screen.findByRole('alert')).toHaveTextContent(/something went wrong/i);
  });

  it('removes a saved property, and it no longer appears', async () => {
    mockedFetchFavorites.mockResolvedValueOnce([{ propertyId: 'p1', category: 'favorites' }]);
    mockedFetchPropertyById.mockResolvedValueOnce(makeProperty({ address: 'remove me' }));
    mockedRemoveFavorite.mockResolvedValueOnce(undefined);

    render(<SavedHomesPage onBack={jest.fn()} />);
    await screen.findByText('remove me');

    fireEvent.click(screen.getByRole('button', { name: /remove/i }));

    await waitFor(() => expect(screen.queryByText('remove me')).not.toBeInTheDocument());
    expect(mockedRemoveFavorite).toHaveBeenCalledWith('p1', 'favorites');
    expect(screen.getAllByText(/no properties saved here yet/i).length).toBeGreaterThan(0);
  });

  it('shows an error and keeps the entry if removing fails', async () => {
    mockedFetchFavorites.mockResolvedValueOnce([{ propertyId: 'p1', category: 'favorites' }]);
    mockedFetchPropertyById.mockResolvedValueOnce(makeProperty({ address: 'stubborn listing' }));
    mockedRemoveFavorite.mockRejectedValueOnce(new Error('network down'));

    render(<SavedHomesPage onBack={jest.fn()} />);
    await screen.findByText('stubborn listing');

    fireEvent.click(screen.getByRole('button', { name: /remove/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/couldn't remove/i);
    expect(screen.getByText('stubborn listing')).toBeInTheDocument();
  });

  it('calls onBack when "Back to search" is clicked', async () => {
    mockedFetchFavorites.mockResolvedValueOnce([]);
    const onBack = jest.fn();

    render(<SavedHomesPage onBack={onBack} />);
    await screen.findAllByText(/no properties saved here yet/i);

    fireEvent.click(screen.getByRole('button', { name: /back to search/i }));
    expect(onBack).toHaveBeenCalled();
  });
});
