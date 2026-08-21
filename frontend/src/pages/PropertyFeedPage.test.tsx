import React from 'react';
import { render, screen } from '@testing-library/react';
import { PropertyFeedPage } from './PropertyFeedPage';
import { fetchFavoritePropertyIds } from '../services/favoritesService';
import { fetchPropertyFeed, MlsUnavailableError } from '../services/propertyService';
import { Property } from '../types/property';

jest.mock('../services/propertyService');
jest.mock('../services/favoritesService');
const mockedFetchPropertyFeed = fetchPropertyFeed as jest.MockedFunction<typeof fetchPropertyFeed>;
const mockedFetchFavoritePropertyIds = fetchFavoritePropertyIds as jest.MockedFunction<
  typeof fetchFavoritePropertyIds
>;

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

describe('PropertyFeedPage', () => {
  beforeEach(() => {
    mockedFetchFavoritePropertyIds.mockResolvedValue([]);
  });

  it('renders the feed with property details, the disclaimer, and a favorite button per card', async () => {
    mockedFetchPropertyFeed.mockResolvedValueOnce([sampleProperty]);

    render(<PropertyFeedPage />);

    expect(await screen.findByText('1 Test St')).toBeInTheDocument();
    expect(screen.getByText('$400,000')).toBeInTheDocument();
    expect(screen.getByText(/3 bd/)).toBeInTheDocument();
    expect(screen.getByText(/Est\. \$2,500\/mo/)).toBeInTheDocument();
    expect(screen.getByText(/estimates only and are not lending offers/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /save to favorites/i })).toBeInTheDocument();
  });

  it('shows an MLS-unavailable message instead of crashing when the MLS API is down', async () => {
    mockedFetchPropertyFeed.mockRejectedValueOnce(new MlsUnavailableError());

    render(<PropertyFeedPage />);

    expect(await screen.findByRole('alert')).toHaveTextContent(/can't reach the MLS/i);
  });

  it('renders a property already in the user favorites as saved', async () => {
    mockedFetchPropertyFeed.mockResolvedValueOnce([sampleProperty]);
    mockedFetchFavoritePropertyIds.mockResolvedValueOnce(['p1']);

    render(<PropertyFeedPage />);

    const favoriteButton = await screen.findByRole('button', { name: /saved to favorites/i });
    expect(favoriteButton).toBeDisabled();
  });
});
