import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { AiSearchBox } from './AiSearchBox';
import { AiSearchNotConfiguredError, searchProperties } from '../services/searchService';
import { Property } from '../types/property';

jest.mock('../services/searchService', () => ({
  ...jest.requireActual('../services/searchService'),
  searchProperties: jest.fn(),
}));
const mockedSearchProperties = searchProperties as jest.MockedFunction<typeof searchProperties>;

const sampleProperty: Property = {
  id: 'p1',
  imageUrl: 'https://example.com/photo.jpg',
  listingPrice: 425000,
  address: '123 Maple St, Springfield, IL',
  bedrooms: 3,
  bathrooms: 2,
  squareFootage: 1850,
  propertyType: 'single-family',
  estimatedMonthlyPayment: 2650,
  features: ['pool'],
};

function emptyFilters(overrides: Record<string, unknown> = {}) {
  return {
    city: null,
    zipCode: null,
    priceMin: null,
    priceMax: null,
    bedrooms: null,
    bathrooms: null,
    propertyType: null,
    features: [],
    assumptions: [],
    clarificationNeeded: null,
    ...overrides,
  };
}

async function submitSearch(query: string): Promise<void> {
  fireEvent.change(screen.getByLabelText(/describe the home/i), { target: { value: query } });
  fireEvent.click(screen.getByRole('button', { name: /search/i }));
}

describe('AiSearchBox', () => {
  it('renders search results with match info once the search resolves', async () => {
    mockedSearchProperties.mockResolvedValueOnce({
      filters: emptyFilters({ city: 'Springfield', features: ['pool'] }),
      results: [
        {
          property: sampleProperty,
          matchedCriteria: ['city', 'pool'],
          unmatchedCriteria: [],
          overallFit: 'full-match',
        },
      ],
    });

    render(<AiSearchBox favoritedIds={new Set()} onViewDetails={jest.fn()} />);
    await submitSearch('3 bedroom homes in Springfield with a pool');

    expect(await screen.findByText('123 Maple St, Springfield, IL')).toBeInTheDocument();
    expect(screen.getByText('Full match')).toBeInTheDocument();
    expect(screen.getByText(/Matches: city, pool/)).toBeInTheDocument();
  });

  it('shows the clarification message instead of results when location is missing', async () => {
    mockedSearchProperties.mockResolvedValueOnce({
      filters: emptyFilters({ clarificationNeeded: 'Which city, ZIP code, or neighborhood should this search cover?' }),
      results: [],
    });

    render(<AiSearchBox favoritedIds={new Set()} onViewDetails={jest.fn()} />);
    await submitSearch('3 bedroom homes');

    expect(await screen.findByRole('alert')).toHaveTextContent(/which city, zip code/i);
  });

  it('shows a not-configured message when the server has no AI key set up', async () => {
    mockedSearchProperties.mockRejectedValueOnce(new AiSearchNotConfiguredError());

    render(<AiSearchBox favoritedIds={new Set()} onViewDetails={jest.fn()} />);
    await submitSearch('homes in Springfield');

    expect(await screen.findByRole('alert')).toHaveTextContent(/isn't set up/i);
  });

  it('calls onViewDetails with the property id and its match info when "View details" is clicked', async () => {
    mockedSearchProperties.mockResolvedValueOnce({
      filters: emptyFilters({ city: 'Springfield', features: ['pool'] }),
      results: [
        {
          property: sampleProperty,
          matchedCriteria: ['city', 'pool'],
          unmatchedCriteria: ['bedrooms'],
          overallFit: 'partial-match',
        },
      ],
    });
    const onViewDetails = jest.fn();

    render(<AiSearchBox favoritedIds={new Set()} onViewDetails={onViewDetails} />);
    await submitSearch('3 bedroom homes in Springfield with a pool');
    fireEvent.click(await screen.findByRole('button', { name: /view details/i }));

    expect(onViewDetails).toHaveBeenCalledWith('p1', {
      matchedCriteria: ['city', 'pool'],
      unmatchedCriteria: ['bedrooms'],
      overallFit: 'partial-match',
    });
  });

  it('shows an empty-results message when nothing matches', async () => {
    mockedSearchProperties.mockResolvedValueOnce({ filters: emptyFilters({ city: 'Nowhere' }), results: [] });

    render(<AiSearchBox favoritedIds={new Set()} onViewDetails={jest.fn()} />);
    await submitSearch('homes in Nowhere');

    expect(await screen.findByText(/no homes matched/i)).toBeInTheDocument();
  });
});
