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

  it('caps comparison selection at 4 properties, disabling the rest without unselecting anything', async () => {
    const properties: Property[] = Array.from({ length: 5 }, (_, i) => ({
      ...sampleProperty,
      id: `p${i + 1}`,
      address: `${i + 1} Test St`,
    }));
    mockedFetchPropertyFeed.mockResolvedValueOnce(properties);

    render(<PropertyFeedPage />);
    await screen.findByText('1 Test St');

    const checkboxes = screen.getAllByRole('checkbox', { name: /compare/i });
    checkboxes.slice(0, 4).forEach((cb) => fireEvent.click(cb));

    expect(checkboxes.slice(0, 4).every((cb) => (cb as HTMLInputElement).checked)).toBe(true);
    expect(checkboxes[4]).toBeDisabled();
    expect((checkboxes[4] as HTMLInputElement).checked).toBe(false);

    // Unchecking one of the selected 4 frees up a slot for the 5th.
    fireEvent.click(checkboxes[0]);
    expect(checkboxes[4]).not.toBeDisabled();
  });

  it('shares comparison selection state between the plain grid and AI search results for the same property', async () => {
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
      results: [{ property: sampleProperty, matchedCriteria: ['city'], unmatchedCriteria: [], overallFit: 'full-match' }],
    });

    render(<PropertyFeedPage />);
    await screen.findByText('1 Test St');

    fireEvent.change(screen.getByLabelText(/describe the home/i), { target: { value: 'homes in Testville' } });
    fireEvent.click(screen.getByRole('button', { name: /^search$/i }));
    const searchResults = await screen.findByTestId('ai-search-results');

    fireEvent.click(within(searchResults).getByRole('checkbox', { name: /compare/i }));

    const allCompareCheckboxes = screen.getAllByRole('checkbox', { name: /compare/i });
    expect(allCompareCheckboxes.every((cb) => (cb as HTMLInputElement).checked)).toBe(true);
  });

  it('shows the Compare button once something is selected, disabled below the 2-item minimum', async () => {
    const properties: Property[] = [
      { ...sampleProperty, id: 'p1' },
      { ...sampleProperty, id: 'p2', address: '2 Test St' },
    ];
    mockedFetchPropertyFeed.mockResolvedValueOnce(properties);

    render(<PropertyFeedPage />);
    await screen.findByText('1 Test St');

    expect(screen.queryByRole('button', { name: /^compare \(/i })).not.toBeInTheDocument();

    fireEvent.click(screen.getAllByRole('checkbox', { name: /compare/i })[0]);
    expect(screen.getByRole('button', { name: /^compare \(1\)$/i })).toBeDisabled();

    fireEvent.click(screen.getAllByRole('checkbox', { name: /compare/i })[1]);
    expect(screen.getByRole('button', { name: /^compare \(2\)$/i })).not.toBeDisabled();
  });

  it('opens the comparison view with the selected properties, and returns to the feed on back', async () => {
    const properties: Property[] = [
      { ...sampleProperty, id: 'p1' },
      { ...sampleProperty, id: 'p2', address: '2 Test St' },
    ];
    mockedFetchPropertyFeed.mockResolvedValueOnce(properties);
    (fetchPropertyById as jest.MockedFunction<typeof fetchPropertyById>).mockImplementation((id) =>
      Promise.resolve(properties.find((p) => p.id === id) as Property),
    );

    render(<PropertyFeedPage />);
    await screen.findByText('1 Test St');

    const checkboxes = screen.getAllByRole('checkbox', { name: /compare/i });
    fireEvent.click(checkboxes[0]);
    fireEvent.click(checkboxes[1]);
    fireEvent.click(screen.getByRole('button', { name: /^compare \(2\)$/i }));

    expect(await screen.findByText('Compare Homes')).toBeInTheDocument();
    expect(fetchPropertyById).toHaveBeenCalledWith('p1');
    expect(fetchPropertyById).toHaveBeenCalledWith('p2');

    fireEvent.click(screen.getByRole('button', { name: /back to search/i }));
    expect(await screen.findByText('Homes for you')).toBeInTheDocument();
  });

  it('shows the grid by default and switches to the map view and back on toggle', async () => {
    mockedFetchPropertyFeed.mockResolvedValueOnce([sampleProperty]);

    render(<PropertyFeedPage />);
    await screen.findByText('1 Test St');

    expect(screen.queryByTestId('map-container')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /map view/i }));
    expect(await screen.findByTestId('map-container')).toBeInTheDocument();
    expect(screen.queryByText('1 Test St')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /grid view/i }));
    expect(await screen.findByText('1 Test St')).toBeInTheDocument();
    expect(screen.queryByTestId('map-container')).not.toBeInTheDocument();
  });
});
