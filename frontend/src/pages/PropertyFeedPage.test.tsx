import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { PropertyFeedPage } from './PropertyFeedPage';
import { fetchFavoritePropertyIds } from '../services/favoritesService';
import { fetchPropertyById, fetchPropertyFeed, MlsUnavailableError } from '../services/propertyService';
import { searchProperties } from '../services/searchService';
import { Property } from '../types/property';

jest.mock('../services/propertyService');
jest.mock('../services/favoritesService');
jest.mock('../services/searchService');
const mockedSearchProperties = searchProperties as jest.MockedFunction<typeof searchProperties>;
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

  it('shows the property detail view when "View details" is clicked, and returns to the feed on back', async () => {
    mockedFetchPropertyFeed.mockResolvedValueOnce([sampleProperty]);
    (fetchPropertyById as jest.MockedFunction<typeof fetchPropertyById>).mockResolvedValueOnce(sampleProperty);

    render(<PropertyFeedPage />);

    fireEvent.click(await screen.findByRole('button', { name: /view details/i }));

    expect(await screen.findByTestId('property-detail')).toBeInTheDocument();
    expect(fetchPropertyById).toHaveBeenCalledWith('p1');

    fireEvent.click(screen.getByRole('button', { name: /back to results/i }));
    expect(await screen.findByText('Homes for you')).toBeInTheDocument();
  });

  it('carries the match score through to the detail view when reached from a search result', async () => {
    mockedFetchPropertyFeed.mockResolvedValueOnce([sampleProperty]);
    mockedSearchProperties.mockResolvedValueOnce({
      filters: {
        city: 'Testville',
        zipCode: null,
        priceMin: null,
        priceMax: null,
        bedrooms: null,
        bathrooms: null,
        propertyType: null,
        features: [],
        assumptions: [],
        clarificationNeeded: null,
      },
      results: [{ property: sampleProperty, matchedCriteria: ['city'], unmatchedCriteria: ['bedrooms'], overallFit: 'partial-match' }],
    });
    (fetchPropertyById as jest.MockedFunction<typeof fetchPropertyById>).mockResolvedValueOnce(sampleProperty);

    render(<PropertyFeedPage />);

    fireEvent.change(await screen.findByLabelText(/describe the home/i), { target: { value: 'homes in Testville' } });
    fireEvent.click(screen.getByRole('button', { name: /^search$/i }));

    const searchResults = await screen.findByTestId('ai-search-results');
    fireEvent.click(within(searchResults).getByRole('button', { name: /view details/i }));

    expect(await screen.findByTestId('property-detail')).toBeInTheDocument();
    expect(screen.getByText('Partial match')).toBeInTheDocument();
    expect(screen.getByText(/Matches what you're looking for: city/)).toBeInTheDocument();
    expect(screen.getByText(/Doesn't match: bedrooms/)).toBeInTheDocument();
  });
});
