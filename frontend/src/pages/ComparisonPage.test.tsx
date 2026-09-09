import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { ComparisonPage } from './ComparisonPage';
import { fetchPropertyById } from '../services/propertyService';
import { Property } from '../types/property';

jest.mock('../services/propertyService');
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
    yearBuilt: 2000,
    lotSize: '50X100',
    hoaFeeMonthly: 100,
    propertyTaxesAnnual: 4000,
    ...overrides,
  };
}

function getRow(label: string): HTMLElement {
  return screen.getByText(label).closest('tr') as HTMLElement;
}

describe('ComparisonPage', () => {
  it('shows a comparison row for each selected property', async () => {
    mockedFetchPropertyById.mockImplementation((id) =>
      Promise.resolve(makeProperty({ id, address: `${id} address` })),
    );

    render(<ComparisonPage propertyIds={['p1', 'p2']} onRemove={jest.fn()} onBack={jest.fn()} />);

    expect(await screen.findByText('p1 address')).toBeInTheDocument();
    expect(screen.getByText('p2 address')).toBeInTheDocument();
    expect(mockedFetchPropertyById).toHaveBeenCalledWith('p1');
    expect(mockedFetchPropertyById).toHaveBeenCalledWith('p2');
  });

  it('highlights a row where values differ across properties, and leaves an identical row unhighlighted', async () => {
    mockedFetchPropertyById.mockImplementation((id) =>
      Promise.resolve(makeProperty({ id, bedrooms: id === 'p1' ? 3 : 5, bathrooms: 2 })),
    );

    render(<ComparisonPage propertyIds={['p1', 'p2']} onRemove={jest.fn()} onBack={jest.fn()} />);
    await screen.findByText('Price');

    expect(getRow('Bedrooms')).toHaveClass('comparison__row--different');
    expect(getRow('Bathrooms')).not.toHaveClass('comparison__row--different');
  });

  it('shows honest "not available" placeholders for missing fields rather than fabricating a value', async () => {
    mockedFetchPropertyById.mockResolvedValueOnce(
      makeProperty({ yearBuilt: null, lotSize: null, hoaFeeMonthly: null, propertyTaxesAnnual: null }),
    );

    render(<ComparisonPage propertyIds={['p1']} onRemove={jest.fn()} onBack={jest.fn()} />);
    await screen.findByText('Price');

    expect(within(getRow('Year built')).getByText('Not available')).toBeInTheDocument();
    expect(within(getRow('Lot size')).getByText('Not available')).toBeInTheDocument();
    expect(within(getRow('HOA')).getByText('No HOA')).toBeInTheDocument();
    expect(within(getRow('Property taxes (annual)')).getByText('Not available')).toBeInTheDocument();
  });

  it('tolerates one property failing to load without losing the rest of the comparison', async () => {
    mockedFetchPropertyById.mockImplementation((id) =>
      id === 'gone' ? Promise.reject(new Error('not found')) : Promise.resolve(makeProperty({ id, address: 'still here' })),
    );

    render(<ComparisonPage propertyIds={['gone', 'p2']} onRemove={jest.fn()} onBack={jest.fn()} />);

    expect(await screen.findByText('still here')).toBeInTheDocument();
    expect(screen.getAllByText(/could not be loaded/i).length).toBeGreaterThan(0);
  });

  it('shows an empty message when no properties are selected', async () => {
    render(<ComparisonPage propertyIds={[]} onRemove={jest.fn()} onBack={jest.fn()} />);

    expect(await screen.findByText(/no properties selected/i)).toBeInTheDocument();
  });

  it('calls onRemove with the property id when its Remove button is clicked', async () => {
    mockedFetchPropertyById.mockResolvedValueOnce(makeProperty({ id: 'p1' }));
    const onRemove = jest.fn();

    render(<ComparisonPage propertyIds={['p1']} onRemove={onRemove} onBack={jest.fn()} />);
    await screen.findByText('Price');

    fireEvent.click(screen.getByRole('button', { name: /remove/i }));
    expect(onRemove).toHaveBeenCalledWith('p1');
  });

  it('calls onBack when "Back to search" is clicked', async () => {
    const onBack = jest.fn();

    render(<ComparisonPage propertyIds={[]} onRemove={jest.fn()} onBack={onBack} />);
    await screen.findByText(/no properties selected/i);

    fireEvent.click(screen.getByRole('button', { name: /back to search/i }));
    expect(onBack).toHaveBeenCalled();
  });
});
