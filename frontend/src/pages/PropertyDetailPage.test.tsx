import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { PropertyDetailPage } from './PropertyDetailPage';
import { fetchPropertyById, MlsUnavailableError, PropertyNotFoundError } from '../services/propertyService';
import { Property } from '../types/property';

jest.mock('../services/propertyService');
const mockedFetchPropertyById = fetchPropertyById as jest.MockedFunction<typeof fetchPropertyById>;

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
  features: ['pool', 'garage'],
};

describe('PropertyDetailPage', () => {
  it('shows all the property details once loaded', async () => {
    mockedFetchPropertyById.mockResolvedValueOnce(sampleProperty);

    render(<PropertyDetailPage propertyId="p1" onBack={jest.fn()} />);

    expect(await screen.findByTestId('property-detail')).toBeInTheDocument();
    expect(screen.getByText('$400,000')).toBeInTheDocument();
    expect(screen.getByText('1 Test St')).toBeInTheDocument();
    expect(screen.getByText(/3 bd/)).toBeInTheDocument();
    expect(screen.getByText(/Est\. \$2,500\/mo/)).toBeInTheDocument();
    expect(screen.getByText(/estimates only and are not lending offers/i)).toBeInTheDocument();
    expect(screen.getByText('pool')).toBeInTheDocument();
    expect(mockedFetchPropertyById).toHaveBeenCalledWith('p1');
    // No matchInfo was passed in (this property wasn't reached from a search) —
    // must not fabricate a score, and must explain why none is shown.
    expect(screen.getByText(/search to see how well this matches/i)).toBeInTheDocument();
  });

  it('shows the match score and criteria breakdown when reached from a search result', async () => {
    mockedFetchPropertyById.mockResolvedValueOnce(sampleProperty);

    render(
      <PropertyDetailPage
        propertyId="p1"
        onBack={jest.fn()}
        matchInfo={{
          matchedCriteria: ['city', 'bedrooms'],
          unmatchedCriteria: ['pool'],
          overallFit: 'partial-match',
        }}
      />,
    );

    expect(await screen.findByTestId('property-detail')).toBeInTheDocument();
    expect(screen.getByText('Partial match')).toBeInTheDocument();
    expect(screen.getByText(/Matches what you're looking for: city, bedrooms/)).toBeInTheDocument();
    expect(screen.getByText(/Doesn't match: pool/)).toBeInTheDocument();
    expect(screen.queryByText(/search to see how well this matches/i)).not.toBeInTheDocument();
  });

  it('shows a not-found message for an unknown property, without crashing', async () => {
    mockedFetchPropertyById.mockRejectedValueOnce(new PropertyNotFoundError());

    render(<PropertyDetailPage propertyId="does-not-exist" onBack={jest.fn()} />);

    expect(await screen.findByRole('alert')).toHaveTextContent(/could not be found/i);
  });

  it('shows an MLS-unavailable message instead of crashing when the MLS API is down', async () => {
    mockedFetchPropertyById.mockRejectedValueOnce(new MlsUnavailableError());

    render(<PropertyDetailPage propertyId="p1" onBack={jest.fn()} />);

    expect(await screen.findByRole('alert')).toHaveTextContent(/can't reach the MLS/i);
  });

  it('calls onBack when "Back to results" is clicked', async () => {
    mockedFetchPropertyById.mockResolvedValueOnce(sampleProperty);
    const onBack = jest.fn();

    render(<PropertyDetailPage propertyId="p1" onBack={onBack} />);
    await screen.findByTestId('property-detail');

    fireEvent.click(screen.getByRole('button', { name: /back to results/i }));
    expect(onBack).toHaveBeenCalled();
  });

  it('does not show a "Request a tour" button when no onRequestTour handler is given', async () => {
    mockedFetchPropertyById.mockResolvedValueOnce(sampleProperty);

    render(<PropertyDetailPage propertyId="p1" onBack={jest.fn()} />);
    await screen.findByTestId('property-detail');

    expect(screen.queryByRole('button', { name: /request a tour/i })).not.toBeInTheDocument();
  });

  it('calls onRequestTour with the property id when "Request a tour" is clicked', async () => {
    mockedFetchPropertyById.mockResolvedValueOnce(sampleProperty);
    const onRequestTour = jest.fn();

    render(<PropertyDetailPage propertyId="p1" onBack={jest.fn()} onRequestTour={onRequestTour} />);
    await screen.findByTestId('property-detail');

    fireEvent.click(screen.getByRole('button', { name: /request a tour/i }));
    expect(onRequestTour).toHaveBeenCalledWith('p1');
  });

  it('does not show a "Calculate affordability" button when no onCalculateAffordability handler is given', async () => {
    mockedFetchPropertyById.mockResolvedValueOnce(sampleProperty);

    render(<PropertyDetailPage propertyId="p1" onBack={jest.fn()} />);
    await screen.findByTestId('property-detail');

    expect(screen.queryByRole('button', { name: /calculate affordability/i })).not.toBeInTheDocument();
  });

  it('calls onCalculateAffordability with the property id when "Calculate affordability" is clicked', async () => {
    mockedFetchPropertyById.mockResolvedValueOnce(sampleProperty);
    const onCalculateAffordability = jest.fn();

    render(
      <PropertyDetailPage propertyId="p1" onBack={jest.fn()} onCalculateAffordability={onCalculateAffordability} />,
    );
    await screen.findByTestId('property-detail');

    fireEvent.click(screen.getByRole('button', { name: /calculate affordability/i }));
    expect(onCalculateAffordability).toHaveBeenCalledWith('p1');
  });
});
