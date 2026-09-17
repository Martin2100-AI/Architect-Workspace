import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { AffordabilityCalculatorPage } from './AffordabilityCalculatorPage';
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
  propertyTaxesAnnual: 4800,
  hoaFeeMonthly: 50,
};

describe('AffordabilityCalculatorPage', () => {
  // Acceptance criterion 1: all cost components should be displayed.
  it('displays every cost component once the property loads', async () => {
    mockedFetchPropertyById.mockResolvedValueOnce(sampleProperty);

    render(<AffordabilityCalculatorPage propertyId="p1" onBack={jest.fn()} />);

    expect(await screen.findByText('1 Test St')).toBeInTheDocument();
    expect(screen.getByText('Mortgage amount')).toBeInTheDocument();
    expect(screen.getByText('Principal & interest')).toBeInTheDocument();
    expect(screen.getByText('Property taxes')).toBeInTheDocument();
    expect(screen.getByText('Homeowners insurance')).toBeInTheDocument();
    expect(screen.getByText('HOA fees')).toBeInTheDocument();
    expect(screen.getByText('Total estimated monthly cost')).toBeInTheDocument();
  });

  // Acceptance criterion 1's "mortgage insurance when applicable": pre-filled default down
  // payment is 20% of the listing price, so PMI should not appear until it's genuinely owed.
  it('does not show a mortgage insurance line when the default 20% down payment applies', async () => {
    mockedFetchPropertyById.mockResolvedValueOnce(sampleProperty);

    render(<AffordabilityCalculatorPage propertyId="p1" onBack={jest.fn()} />);
    await screen.findByText('1 Test St');

    expect(screen.queryByText(/mortgage insurance/i)).not.toBeInTheDocument();
  });

  it('shows a mortgage insurance line once the down payment is dropped below 20%', async () => {
    mockedFetchPropertyById.mockResolvedValueOnce(sampleProperty);

    render(<AffordabilityCalculatorPage propertyId="p1" onBack={jest.fn()} />);
    await screen.findByText('1 Test St');

    fireEvent.change(screen.getByLabelText(/down payment/i), { target: { value: '20000' } });

    expect(await screen.findByText('Mortgage insurance (PMI)')).toBeInTheDocument();
  });

  // Acceptance criterion 2: when inputs are changed, results should update.
  it('recalculates the total when an input changes', async () => {
    mockedFetchPropertyById.mockResolvedValueOnce(sampleProperty);

    render(<AffordabilityCalculatorPage propertyId="p1" onBack={jest.fn()} />);
    await screen.findByText('1 Test St');

    const totalBefore = screen.getByText('Total estimated monthly cost').nextSibling?.textContent;

    fireEvent.change(screen.getByLabelText(/interest rate/i), { target: { value: '9' } });

    const totalAfter = screen.getByText('Total estimated monthly cost').nextSibling?.textContent;
    expect(totalAfter).not.toBe(totalBefore);
  });

  it('recalculates the total when the purchase price is edited', async () => {
    mockedFetchPropertyById.mockResolvedValueOnce(sampleProperty);

    render(<AffordabilityCalculatorPage propertyId="p1" onBack={jest.fn()} />);
    await screen.findByText('1 Test St');

    const totalBefore = screen.getByText('Total estimated monthly cost').nextSibling?.textContent;

    fireEvent.change(screen.getByLabelText(/purchase price/i), { target: { value: '900000' } });

    const totalAfter = screen.getByText('Total estimated monthly cost').nextSibling?.textContent;
    expect(totalAfter).not.toBe(totalBefore);
  });

  // Trust criterion: disclaimers are visible (REQ-017).
  it('always shows the affordability disclaimer alongside the results', async () => {
    mockedFetchPropertyById.mockResolvedValueOnce(sampleProperty);

    render(<AffordabilityCalculatorPage propertyId="p1" onBack={jest.fn()} />);
    await screen.findByText('1 Test St');

    expect(screen.getByText(/estimate only/i)).toBeInTheDocument();
    expect(screen.getByText(/not a lending offer or financial advice/i)).toBeInTheDocument();
  });

  it('pre-fills inputs from the property’s real listing data rather than leaving them blank', async () => {
    mockedFetchPropertyById.mockResolvedValueOnce(sampleProperty);

    render(<AffordabilityCalculatorPage propertyId="p1" onBack={jest.fn()} />);
    await screen.findByText('1 Test St');

    expect(screen.getByLabelText(/purchase price/i)).toHaveValue(400000);
    expect(screen.getByLabelText(/property taxes/i)).toHaveValue(4800);
    expect(screen.getByLabelText(/hoa fees/i)).toHaveValue(50);
  });

  it('defaults property taxes and HOA to 0 when the MLS listing has no value, rather than fabricating one', async () => {
    mockedFetchPropertyById.mockResolvedValueOnce({
      ...sampleProperty,
      propertyTaxesAnnual: null,
      hoaFeeMonthly: null,
    });

    render(<AffordabilityCalculatorPage propertyId="p1" onBack={jest.fn()} />);
    await screen.findByText('1 Test St');

    expect(screen.getByLabelText(/property taxes/i)).toHaveValue(0);
    expect(screen.getByLabelText(/hoa fees/i)).toHaveValue(0);
  });

  it('shows a not-found message for an unknown property, without crashing', async () => {
    mockedFetchPropertyById.mockRejectedValueOnce(new PropertyNotFoundError());

    render(<AffordabilityCalculatorPage propertyId="does-not-exist" onBack={jest.fn()} />);

    expect(await screen.findByRole('alert')).toHaveTextContent(/could not be found/i);
  });

  it('shows an MLS-unavailable message instead of crashing when the MLS API is down', async () => {
    mockedFetchPropertyById.mockRejectedValueOnce(new MlsUnavailableError());

    render(<AffordabilityCalculatorPage propertyId="p1" onBack={jest.fn()} />);

    expect(await screen.findByRole('alert')).toHaveTextContent(/can't reach the MLS/i);
  });

  it('calls onBack when "Back to property" is clicked', async () => {
    mockedFetchPropertyById.mockResolvedValueOnce(sampleProperty);
    const onBack = jest.fn();

    render(<AffordabilityCalculatorPage propertyId="p1" onBack={onBack} />);
    await screen.findByText('1 Test St');

    fireEvent.click(screen.getByRole('button', { name: /back to property/i }));
    expect(onBack).toHaveBeenCalled();
  });
});
